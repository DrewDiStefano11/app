import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createWhoopOAuthClient, handleWhoopCallback } from "./oauth.server";
import type { createWhoopStore, WhoopSyncActor } from "./postgres.server";
import { syncWhoop, type WhoopSyncStore } from "./sync.server";
import { createWhoopTokenVault } from "./token-vault.server";
import { verifyWhoopWebhook } from "./webhook.server";

const sessionCookie = "__Host-fitcore-whoop-session";
const flowCookie = "__Host-fitcore-whoop-flow";
const sessionTtl = 60 * 60 * 24 * 30;
const flowTtl = 60 * 10;
const owner = "fitcore-owner";
const keyPattern = /^[A-Za-z0-9_-]{43}$/;
const privateHeaders = {
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
};

type WhoopIntegrationConfig = {
  origin: string;
  ownerKeyDigest: string;
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
  jarvisSharingEnabled?: boolean;
  snapshotCacheEnabled?: boolean;
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  background?: {
    store: Pick<
      ReturnType<typeof createWhoopStore>,
      "registerWebhook" | "getBackgroundConnection" | "pruneWebhookEvents" | "pruneSnapshots"
    >;
    cronSecret?: string;
  };
  store: Pick<
    ReturnType<typeof createWhoopStore>,
    | "createSession"
    | "getSession"
    | "deleteSession"
    | "beginAttempt"
    | "claimAttempt"
    | "discardAttempt"
    | "saveConnection"
    | "getConnection"
    | "getSnapshot"
    | "cancelPendingAttempt"
    | "claimDisconnect"
    | "claimDisconnectRefresh"
    | "saveDisconnectRefresh"
    | "finishDisconnect"
  > &
    WhoopSyncStore;
};

function reply(status: number, headers: HeadersInit = privateHeaders) {
  return new Response(null, { status, headers });
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request: Request, name: string) {
  const prefix = name + "=";
  const matches = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(prefix));

  if (matches.length !== 1) return null;
  const candidate = matches[0].slice(prefix.length);
  return keyPattern.test(candidate) ? candidate : null;
}

function flowProof(nonce: string, state: string) {
  return createHash("sha256").update(nonce).update(":").update(state).digest("hex");
}

export function createWhoopIntegration(config: WhoopIntegrationConfig) {
  const { origin, store } = config;
  if (!/^[0-9a-f]{64}$/.test(config.ownerKeyDigest)) {
    throw new Error("Invalid WHOOP owner access configuration");
  }

  const ownerKeyDigest = Buffer.from(config.ownerKeyDigest, "hex");
  const client = createWhoopOAuthClient(config);
  const vault = createWhoopTokenVault(config.encryptionKey);

  const sessionDigest = (value: string) =>
    createHmac("sha256", ownerKeyDigest)
      .update("fitcore-whoop-session:")
      .update(value)
      .digest("hex");

  const getSession = async (request: Request) => {
    const token = readCookie(request, sessionCookie);
    return token ? store.getSession(sessionDigest(token)) : null;
  };

  function isSameOriginMutation(request: Request) {
    return new URL(request.url).origin === origin && request.headers.get("Origin") === origin;
  }

  const runSync = (actor: WhoopSyncActor) =>
    syncWhoop(actor, {
      store,
      vault,
      refresh: client.refresh,
      durableCacheEnabled:
        config.snapshotCacheEnabled === true &&
        /^[A-Za-z0-9_-]{32,128}$/.test(config.background?.cronSecret ?? ""),
      fetch: config.fetch ? (url, init) => config.fetch!(url.href, init) : undefined,
    });

  function syncReply(outcome: Awaited<ReturnType<typeof syncWhoop>>) {
    const headers = outcome.retryAfterSeconds
      ? { ...privateHeaders, "Retry-After": String(outcome.retryAfterSeconds) }
      : privateHeaders;
    if (outcome.live) return Response.json(outcome.live, { headers });
    return reply(outcome.status === 200 ? 204 : outcome.status, headers);
  }

  return {
    async session(request: Request) {
      if (!isSameOriginMutation(request)) return reply(403);
      if (request.method === "DELETE") {
        const existing = await getSession(request);
        if (existing) await store.deleteSession(existing.id);
        return reply(204, { ...privateHeaders, "Set-Cookie": cookie(sessionCookie, "", 0) });
      }

      if (request.method !== "POST") return reply(405);
      const contentType = request.headers.get("Content-Type")?.split(";")[0];
      if (contentType !== "application/x-www-form-urlencoded") return reply(415);
      const body = await request.text();
      if (body.length > 80) return reply(400);
      const values = new URLSearchParams(body).getAll("access_key");
      if (values.length !== 1 || !keyPattern.test(values[0])) return reply(401);

      const candidate = createHash("sha256").update(values[0]).digest();
      if (!timingSafeEqual(ownerKeyDigest, candidate)) return reply(401);

      const existing = await getSession(request);
      if (existing) await store.deleteSession(existing.id);
      const token = randomBytes(32).toString("base64url");
      await store.createSession(owner, sessionDigest(token), sessionTtl);
      return reply(204, {
        ...privateHeaders,
        "Set-Cookie": cookie(sessionCookie, token, sessionTtl),
      });
    },

    async connect(request: Request) {
      if (request.method !== "POST") return reply(405);
      if (!isSameOriginMutation(request)) return reply(403);
      const session = await getSession(request);
      if (!session) return reply(401);

      const state = randomBytes(6).toString("base64url");
      const nonce = randomBytes(32).toString("base64url");
      const started = await store.beginAttempt(session, flowProof(nonce, state), flowTtl);
      if (!started) return reply(409);

      return reply(303, {
        ...privateHeaders,
        Location: client.authorize(state).href,
        "Set-Cookie": cookie(flowCookie, nonce, flowTtl),
      });
    },

    async callback(request: Request) {
      const response = await handleWhoopCallback(request, {
        origin,
        getSession,
        claimAttempt: async (session, state) => {
          const nonce = readCookie(request, flowCookie);
          return nonce ? store.claimAttempt(session, flowProof(nonce, state)) : null;
        },
        discardAttempt: store.discardAttempt,
        exchangeCode: client.exchangeCode,
        saveConnection: async (session, attempt, pair) =>
          store.saveConnection(
            session,
            attempt,
            vault.seal(session.ownerId, attempt, pair),
            pair.expiresIn,
          ),
      });

      if (response.status === 303) response.headers.set("Set-Cookie", cookie(flowCookie, "", 0));
      return response;
    },

    async disconnect(request: Request) {
      if (request.method !== "DELETE") return reply(405);
      if (!isSameOriginMutation(request)) return reply(403);
      const session = await getSession(request);
      if (!session) return reply(401);

      const pending = await store.claimDisconnect(session);
      if (!pending) {
        const cancelled = await store.cancelPendingAttempt(session.ownerId);
        if (!cancelled) return reply(409);
        return Response.json({ revoked: null }, { headers: privateHeaders });
      }

      let revoked = false;
      if (pending.envelope) {
        try {
          const pair = vault.open(session.ownerId, pending.id, pending.envelope);
          const first = await client.revoke(pair.accessToken);
          revoked = first === 204;
          if (
            first === 401 &&
            (await store.claimDisconnectRefresh(session.ownerId, pending.id, pending.disconnectId))
          ) {
            const renewed = await client.refresh(pair.refreshToken);
            const saved = await store.saveDisconnectRefresh(
              session.ownerId,
              pending.id,
              pending.disconnectId,
              vault.seal(session.ownerId, pending.id, renewed),
              renewed.expiresIn,
            );
            if (saved) revoked = (await client.revoke(renewed.accessToken)) === 204;
          }
        } catch {
          revoked = false;
        }
      }
      if (!(await store.finishDisconnect(session.ownerId, pending.id, pending.disconnectId))) {
        return reply(409);
      }
      return Response.json({ revoked }, { headers: privateHeaders });
    },

    async status(request: Request) {
      if (request.method !== "GET" || new URL(request.url).origin !== origin) return reply(400);
      const session = await getSession(request);
      if (!session) return reply(401);
      const connection = await store.getConnection(session.ownerId);
      return Response.json(
        {
          status: connection?.status ?? "disconnected",
          lastSyncedAt: connection?.lastSyncedAt ?? null,
          version:
            connection?.status === "connected"
              ? connection.id + ":" + connection.eventRevision
              : null,
          jarvisSharingAvailable:
            config.jarvisSharingEnabled === true && connection?.status === "connected",
        },
        { headers: privateHeaders },
      );
    },

    async sync(request: Request) {
      if (request.method !== "POST") return reply(405);
      if (!isSameOriginMutation(request)) return reply(403);
      const session = await getSession(request);
      if (!session) return reply(401);
      return syncReply(await runSync(session));
    },

    async webhook(request: Request) {
      if (request.method !== "POST") return reply(405);
      if (!config.background || new URL(request.url).origin !== origin) return reply(503);
      const event = await verifyWhoopWebhook(request, config.clientSecret);
      if (!event) return reply(401);
      const connection = await config.background.store.registerWebhook(event);
      const runtimeRequest = request as Request & { waitUntil?(task: Promise<unknown>): void };
      if (connection && runtimeRequest.waitUntil) {
        runtimeRequest.waitUntil(runSync(connection).catch(() => {}));
      }
      return reply(204);
    },

    async reconcile(request: Request) {
      if (request.method !== "GET") return reply(405);
      const cron = config.background;
      if (!cron) return reply(204);
      const received = request.headers.get("Authorization") ?? "";
      if (
        new URL(request.url).origin !== origin ||
        !cron.cronSecret ||
        !/^[A-Za-z0-9_-]{32,128}$/.test(cron.cronSecret) ||
        !timingSafeEqual(
          createHash("sha256").update(received).digest(),
          createHash("sha256")
            .update("Bearer " + cron.cronSecret)
            .digest(),
        )
      )
        return reply(401);
      await Promise.all([cron.store.pruneWebhookEvents(), cron.store.pruneSnapshots()]);
      const connection = await cron.store.getBackgroundConnection(owner);
      if (!connection) return reply(204);
      const result = await runSync(connection);
      return result.status === 409 ? reply(204) : syncReply(result);
    },

    async records(request: Request) {
      if (request.method !== "GET" || new URL(request.url).origin !== origin) return reply(400);
      const session = await getSession(request);
      if (!session) return reply(401);
      return Response.json(await store.getSnapshot(session), { headers: privateHeaders });
    },

    async jarvisSnapshot(request: Request) {
      if (
        config.jarvisSharingEnabled !== true ||
        request.method !== "POST" ||
        !isSameOriginMutation(request)
      )
        return null;
      const session = await getSession(request);
      return session ? store.getSnapshot(session) : null;
    },
  };
}
