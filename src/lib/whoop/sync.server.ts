import type { WhoopTokenPair } from "./oauth.server";
import { WhoopTokenRateLimit } from "./oauth.server";
import type { createWhoopStore, WhoopDeletion, WhoopSyncActor } from "./postgres.server";
import type { WhoopSnapshot } from "./dashboard";
import type { createWhoopTokenVault } from "./token-vault.server";
import { readWhoopCollectionWithCache, WhoopReadError, type WhoopV2Record } from "./v2.server";

const collections = ["recovery", "sleep", "cycle", "workout"] as const;
const dayMs = 24 * 60 * 60 * 1000;
const syncCooldownSeconds = 120;
// Allow 25 hours for the daily cleanup, six for Neon restore and one for drift.
const cleanupReserveMs = (32 / 24) * dayMs;

function deletedByWebhook(record: WhoopV2Record, event: WhoopDeletion) {
  if (Date.parse(record.updated_at) > event.receivedAtMs) return false;
  if (record.kind === "recovery") {
    return (
      (event.type === "recovery.deleted" || event.type === "sleep.deleted") &&
      "sleep_id" in record &&
      record.sleep_id?.toLowerCase() === event.recordId
    );
  }
  return event.type === record.kind + ".deleted" && record.id.toLowerCase() === event.recordId;
}

export type WhoopSyncStore = Pick<
  ReturnType<typeof createWhoopStore>,
  | "claimSync"
  | "expireAbandonedRefresh"
  | "claimRefresh"
  | "saveRefresh"
  | "failRefresh"
  | "releaseRefresh"
  | "saveSync"
  | "releaseSync"
  | "rejectSyncAuthorization"
>;

type SyncOptions = {
  store: WhoopSyncStore;
  vault: ReturnType<typeof createWhoopTokenVault>;
  refresh(token: string): Promise<WhoopTokenPair>;
  durableCacheEnabled?: boolean;
  fetch?: (url: URL, init: RequestInit) => Promise<Response>;
};

type SyncOutcome = {
  status: number;
  retryAfterSeconds?: number;
  live?: WhoopSnapshot & { version: string };
};

export async function syncWhoop(actor: WhoopSyncActor, options: SyncOptions): Promise<SyncOutcome> {
  const { store, vault } = options;
  const { ownerId } = actor;
  await store.expireAbandonedRefresh(actor);
  const claim = await store.claimSync(actor);
  if (!claim) return { status: 409 };

  const { id, syncId } = claim;
  let cooldownSeconds = 30;
  let finished = false;
  try {
    let pair: WhoopTokenPair;
    try {
      pair = vault.open(ownerId, id, claim.envelope);
    } catch {
      throw new WhoopReadError("unauthorized");
    }
    let refreshed = false;
    const rotate = async () => {
      const refreshId = await store.claimRefresh(ownerId, id, claim.revision, syncId);
      if (!refreshId) throw new WhoopReadError("unavailable");
      try {
        const next = await options.refresh(pair.refreshToken);
        const saved = await store.saveRefresh(
          ownerId,
          id,
          refreshId,
          vault.seal(ownerId, id, next),
          next.expiresIn,
        );
        if (!saved) throw new WhoopReadError("unavailable");
        refreshed = true;
        pair = next;
      } catch (error) {
        if (error instanceof WhoopTokenRateLimit) {
          await store.releaseRefresh(ownerId, id, refreshId);
          throw new WhoopReadError("rate_limited", error.retryAfterSeconds);
        }
        // The old rotating token may already have been spent upstream.
        await store.failRefresh(ownerId, id, refreshId);
        throw new WhoopReadError("unauthorized");
      }
    };

    if (claim.expiresAtMs <= Date.now() + 30_000) await rotate();
    const now = Date.now();
    const window = {
      start: new Date(now - 30 * dayMs).toISOString(),
      end: new Date(now).toISOString(),
    };
    const signal = AbortSignal.timeout(20_000);
    const collect = async () => {
      const result = await Promise.allSettled(
        collections.map((kind) =>
          readWhoopCollectionWithCache(kind, pair.accessToken, window, {
            fetch: options.fetch,
            signal,
          }),
        ),
      );
      const failures = result.filter((part) => part.status === "rejected");
      if (failures.length) {
        const rateLimits = failures.flatMap(({ reason }) =>
          reason instanceof WhoopReadError && reason.code === "rate_limited"
            ? [reason.retryAfterSeconds ?? 60]
            : [],
        );
        if (rateLimits.length) throw new WhoopReadError("rate_limited", Math.max(...rateLimits));
        if (
          failures.some(
            ({ reason }) => reason instanceof WhoopReadError && reason.code === "unauthorized",
          )
        )
          throw new WhoopReadError("unauthorized");
        throw failures[0].reason;
      }
      return result.flatMap((part) => (part.status === "fulfilled" ? [part.value] : []));
    };

    let pages;
    try {
      pages = await collect();
    } catch (error) {
      if (refreshed || !(error instanceof WhoopReadError) || error.code !== "unauthorized")
        throw error;
      await rotate();
      pages = await collect();
    }
    const records = pages.flatMap((page) => page.records);
    if (new Set(records.map((record) => record.user_id)).size > 1) {
      throw new WhoopReadError("invalid_data");
    }
    const cacheExpiresAtMs = options.durableCacheEnabled
      ? Math.min(Date.now() + dayMs, ...pages.map((page) => page.expiresAt - cleanupReserveMs))
      : 0;
    const saved = await store.saveSync(
      actor,
      id,
      syncId,
      records,
      syncCooldownSeconds,
      claim.eventRevision,
      cacheExpiresAtMs,
    );
    if (!saved) return { status: 409 };
    finished = true;
    if (!saved.accessExpiresAt) return { status: 200 };
    const displayExpiresAt = Math.min(
      Date.parse(saved.accessExpiresAt),
      Date.now() + syncCooldownSeconds * 1000,
      ...pages.map((page) => page.earliestFreshness),
    );
    return {
      status: 200,
      live: {
        lastSyncedAt: saved.lastSyncedAt,
        accessExpiresAt: new Date(displayExpiresAt).toISOString(),
        records: records.filter(
          (record) => !saved.deletions.some((event) => deletedByWebhook(record, event)),
        ),
        version: id + ":" + claim.eventRevision,
      },
    };
  } catch (error) {
    if (error instanceof WhoopReadError && error.code === "rate_limited") {
      cooldownSeconds = Math.max(1, error.retryAfterSeconds ?? 60);
      return { status: 429, retryAfterSeconds: cooldownSeconds };
    }
    if (error instanceof WhoopReadError && error.code === "unauthorized") {
      await store.rejectSyncAuthorization(ownerId, id, syncId);
      return { status: 403 };
    }
    return { status: 502 };
  } finally {
    // A successful save already relinquished this claim. A failed cleanup expires with the lease.
    if (!finished) await store.releaseSync(ownerId, id, syncId, cooldownSeconds).catch(() => {});
  }
}
