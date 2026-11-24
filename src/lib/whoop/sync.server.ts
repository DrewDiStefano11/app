import type { WhoopTokenPair } from "./oauth.server";
import { createHash } from "node:crypto";
import { WhoopTokenRateLimit, WhoopTokenRejected } from "./oauth.server";
import type {
  createWhoopStore,
  WhoopDeletion,
  WhoopSyncActor,
  WhoopSyncPurpose,
} from "./postgres.server";
import type { WhoopSnapshot } from "./dashboard";
import { whoopJarvisLookbackMs } from "./jarvis-context.server";
import type { createWhoopTokenVault } from "./token-vault.server";
import type { createWhoopArchiveStore } from "./archive-store.server";
import {
  readWhoopCollectionWithCache,
  readWhoopHistoryPage,
  WhoopReadError,
  type WhoopV2Record,
  type WhoopCachePolicy,
} from "./v2.server";

const jarvisCollections = ["recovery", "sleep", "cycle"] as const;
const dashboardCollections = [...jarvisCollections, "workout"] as const;
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
  | "getSyncRetryAfter"
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
  purpose?: WhoopSyncPurpose;
  fetch?: (url: URL, init: RequestInit) => Promise<Response>;
  onCachePolicy?: (policy: WhoopCachePolicy) => void;
  archive?: Pick<
    ReturnType<typeof createWhoopArchiveStore>,
    "getConsent" | "saveSync" | "eraseRejectedAuthorization" | "prepareImport"
  >;
};

type SyncOutcome = {
  status: number;
  retryAfterSeconds?: number;
  live?: WhoopSnapshot & { version: string };
  reason?: "scope_verification_required" | "archive_consent_required";
};

export async function syncWhoop(actor: WhoopSyncActor, options: SyncOptions): Promise<SyncOutcome> {
  const { store, vault, purpose = "dashboard" } = options;
  const { ownerId } = actor;
  const historyConsent = purpose === "history" ? await options.archive?.getConsent(actor) : null;
  if (purpose === "history" && (!historyConsent || historyConsent.revokedAt))
    return { status: 409, reason: "archive_consent_required" };
  await store.expireAbandonedRefresh(actor);
  const claim = await store.claimSync(actor, purpose);
  if (!claim) {
    const retryAfterSeconds = await store.getSyncRetryAfter(actor, purpose);
    return retryAfterSeconds === null ? { status: 409 } : { status: 409, retryAfterSeconds };
  }

  const { id, syncId } = claim;
  let cooldownSeconds = 30;
  let cooldownScope: WhoopSyncPurpose | "all" = purpose;
  let finished = false;
  let confirmedProviderRejection = false;
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
        const response = await options.refresh(pair.refreshToken);
        const next = { ...response, scopes: response.scopes ?? pair.scopes };
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
        if (error instanceof WhoopTokenRejected)
          await options.archive?.eraseRejectedAuthorization(actor, id, syncId);
        await store.failRefresh(ownerId, id, refreshId);
        throw new WhoopReadError("unauthorized");
      }
    };

    if (claim.expiresAtMs <= Date.now() + 30_000) await rotate();
    const history =
      purpose === "history"
        ? await options.archive!.prepareImport(actor, historyConsent!, syncId, claim.eventRevision)
        : null;
    if (history && !history.valid) return { status: 409 };
    if (history && !history.page) {
      await store.releaseSync(ownerId, id, syncId, 2, "history");
      finished = true;
      return { status: 200 };
    }
    if (history?.page) {
      // Legacy token envelopes did not retain granted scopes. Refresh once to learn
      // them, then require explicit reauthorization if the provider still omits them.
      if (!pair.scopes && !refreshed) await rotate();
      const requiredScope = {
        recovery: "read:recovery",
        cycle: "read:cycles",
        sleep: "read:sleep",
        workout: "read:workout",
      }[history.page.kind];
      if (!pair.scopes?.includes(requiredScope))
        return { status: 409, reason: "scope_verification_required" };
    }
    let followingToken: string | null = null;
    const tokenHash = (token: string | null) =>
      createHash("sha256").update(JSON.stringify(token)).digest("hex");
    const now = Date.now();
    const collections = purpose === "jarvis" ? jarvisCollections : dashboardCollections;
    const lookbackMs = purpose === "jarvis" ? whoopJarvisLookbackMs : 30 * dayMs;
    const window = {
      start: new Date(now - lookbackMs).toISOString(),
      end: new Date(now).toISOString(),
    };
    const signal = AbortSignal.timeout(20_000);
    const collect = async () => {
      if (history?.page) {
        const page = await readWhoopHistoryPage(
          history.page.kind,
          pair.accessToken,
          { end: history.page.end, nextToken: history.page.nextToken },
          { fetch: options.fetch, signal },
        );
        if (
          page.nextToken &&
          (page.nextToken === history.page.nextToken ||
            history.page.seenTokens.includes(tokenHash(page.nextToken)))
        )
          throw new WhoopReadError("pagination");
        followingToken = page.nextToken;
        return [{ records: page.records, expiresAt: 0, earliestFreshness: 0 }];
      }
      const attempt = new AbortController();
      const readSignal = AbortSignal.any([signal, attempt.signal]);
      const result = await Promise.allSettled(
        collections.map((kind) =>
          readWhoopCollectionWithCache(kind, pair.accessToken, window, {
            fetch: options.fetch,
            signal: readSignal,
            onCachePolicy: options.onCachePolicy,
          }).catch((error: unknown) => {
            if (error instanceof WhoopReadError && error.code === "rate_limited") attempt.abort();
            throw error;
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
      if (refreshed || !(error instanceof WhoopReadError) || error.code !== "unauthorized") {
        confirmedProviderRejection =
          refreshed && error instanceof WhoopReadError && error.code === "unauthorized";
        throw error;
      }
      await rotate();
      try {
        pages = await collect();
      } catch (retryError) {
        confirmedProviderRejection =
          retryError instanceof WhoopReadError && retryError.code === "unauthorized";
        throw retryError;
      }
    }
    const records = pages.flatMap((page) => page.records);
    if (new Set(records.map((record) => record.user_id)).size > 1) {
      throw new WhoopReadError("invalid_data");
    }
    const consent =
      purpose === "history"
        ? historyConsent
        : purpose === "dashboard"
          ? await options.archive?.getConsent(actor)
          : null;
    if (consent && !consent.revokedAt) {
      const saved = await options.archive!.saveSync(
        actor,
        consent,
        syncId,
        claim.eventRevision,
        records,
        purpose === "history" ? 2 : syncCooldownSeconds,
        history?.page
          ? { ...history.page, followingToken, tokenHash: tokenHash(history.page.nextToken) }
          : undefined,
      );
      if (!saved) return { status: 409 };
      finished = true;
      // The client reads the authoritative archive, including historical records, after this 204.
      return { status: 200 };
    }
    const cacheExpiresAtMs =
      purpose === "dashboard" && options.durableCacheEnabled
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
      purpose,
    );
    if (!saved) return { status: 409 };
    finished = true;
    if (!saved.accessExpiresAt) return { status: 200 };
    const reusableUntil = Math.min(...pages.map((page) => page.expiresAt));
    const displayExpiresAt = Math.min(
      Date.parse(saved.accessExpiresAt),
      // A cache-permitted in-memory view can outlive the sync cooldown, leaving
      // time to renew. No-cache/no-store pages retain the existing live bound.
      reusableUntil > Date.now()
        ? Math.min(reusableUntil, Date.now() + 300_000)
        : Date.now() + syncCooldownSeconds * 1000,
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
      cooldownScope = "all";
      return { status: 429, retryAfterSeconds: cooldownSeconds };
    }
    if (error instanceof WhoopReadError && error.code === "unauthorized") {
      if (confirmedProviderRejection)
        await options.archive?.eraseRejectedAuthorization(actor, id, syncId);
      await store.rejectSyncAuthorization(ownerId, id, syncId);
      return { status: 403 };
    }
    return { status: 502 };
  } finally {
    // A successful save already relinquished this claim. A failed cleanup expires with the lease.
    if (!finished)
      await store.releaseSync(ownerId, id, syncId, cooldownSeconds, cooldownScope).catch(() => {});
  }
}
