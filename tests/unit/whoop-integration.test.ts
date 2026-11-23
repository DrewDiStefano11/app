import { createHash } from "node:crypto";
import { expect, test } from "bun:test";
import { createWhoopIntegration } from "../../src/lib/whoop/integration.server";

const origin = "https://fitcore.test";
const ownerKey = Buffer.alloc(32, 42).toString("base64url");
const ownerKeyDigest = createHash("sha256").update(ownerKey).digest("hex");

function harness(jarvisSharingEnabled = true) {
  let sessions = 0;
  let attemptProof: string | undefined;
  let tokenRequests = 0;
  let jarvisClaims = 0;
  const sessionByDigest = new Map<string, { id: string; ownerId: string }>();
  const integration = createWhoopIntegration({
    origin,
    jarvisSharingEnabled,
    ownerKeyDigest,
    clientId: "synthetic-id",
    clientSecret: "synthetic-secret",
    encryptionKey: Buffer.alloc(32, 30).toString("base64url"),
    store: {
      async createSession(ownerId, digest) {
        const session = { ownerId, id: "session-" + ++sessions };
        sessionByDigest.set(digest, session);
        return session;
      },
      async getSession(digest) {
        return sessionByDigest.get(digest) ?? null;
      },
      async deleteSession(id) {
        for (const [digest, session] of sessionByDigest) {
          if (id === session.id) sessionByDigest.delete(digest);
        }
      },
      async beginAttempt(session, proof) {
        attemptProof = session.id + proof;
        return true;
      },
      async claimAttempt(session, proof) {
        if (attemptProof !== session.id + proof) return null;
        attemptProof = undefined;
        return "attempt";
      },
      async discardAttempt() {},
      async saveConnection(_, __, envelope) {
        expect(envelope).not.toContain("synthetic-access");
        expect(envelope).not.toContain("synthetic-refresh");
        return true;
      },
      async cancelPendingAttempt() {
        return true;
      },
      async claimDisconnect() {
        return null;
      },
      async claimDisconnectRefresh() {
        return false;
      },
      async saveDisconnectRefresh() {
        return false;
      },
      async finishDisconnect() {
        return true;
      },
      async getConnection() {
        return null;
      },
      async getSnapshot() {
        return null;
      },
      async isLiveVersionCurrent() {
        return false;
      },
      async claimSync(_, purpose) {
        if (purpose === "jarvis") jarvisClaims++;
        return null;
      },
      async getSyncRetryAfter() {
        return null;
      },
      async expireAbandonedRefresh() {},
      async claimRefresh() {
        return null;
      },
      async saveRefresh() {
        return false;
      },
      async failRefresh() {},
      async releaseRefresh() {},
      async saveSync() {
        return null;
      },
      async releaseSync() {},
      async rejectSyncAuthorization() {},
    },
    fetch: async () => {
      tokenRequests++;
      return Response.json({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        expires_in: 120,
      });
    },
  });

  return {
    integration,
    get tokenRequests() {
      return tokenRequests;
    },
    get jarvisClaims() {
      return jarvisClaims;
    },
  };
}

const post = (path: string, cookie?: string, body?: URLSearchParams, from = origin) =>
  new Request(origin + path, {
    method: "POST",
    headers: { Origin: from, ...(cookie ? { Cookie: cookie } : {}) },
    body,
  });

const cookie = (response: Response) => response.headers.get("set-cookie")!.split(";")[0];

test("Jarvis can only load WHOOP metrics for an active owner session and same-origin POST", async () => {
  const h = harness();
  const loggedIn = await h.integration.session(
    post("/api/whoop/session", undefined, new URLSearchParams({ access_key: ownerKey })),
  );
  const session = cookie(loggedIn);
  await h.integration.jarvisSnapshot(post("/_serverFn/example"));
  await h.integration.jarvisSnapshot(
    post("/_serverFn/example", session, undefined, "https://other.test"),
  );
  await h.integration.jarvisSnapshot(
    new Request(origin + "/_serverFn/example", {
      headers: { Cookie: session, Origin: origin },
    }),
  );
  expect(h.jarvisClaims).toBe(0);
  await h.integration.jarvisSnapshot(post("/_serverFn/example", session));
  expect(h.jarvisClaims).toBe(1);
  await h.integration.session(
    new Request(origin + "/api/whoop/session", {
      method: "DELETE",
      headers: { Cookie: session, Origin: origin },
    }),
  );
  await h.integration.jarvisSnapshot(post("/_serverFn/example", session));
  expect(h.jarvisClaims).toBe(1);
});

test("Jarvis cannot load WHOOP metrics when deployment sharing is disabled", async () => {
  const h = harness(false);
  const login = await h.integration.session(
    post("/api/whoop/session", undefined, new URLSearchParams({ access_key: ownerKey })),
  );
  expect(await h.integration.jarvisSnapshot(post("/_serverFn/example", cookie(login)))).toBeNull();
  expect(h.jarvisClaims).toBe(0);
});

test("sync and health records require an owner session, and sync rejects cross-origin requests", async () => {
  const h = harness();
  expect((await h.integration.sync(post("/api/whoop/sync"))).status).toBe(401);
  const unlocked = await h.integration.session(
    post("/api/whoop/session", undefined, new URLSearchParams({ access_key: ownerKey })),
  );
  const session = cookie(unlocked);
  expect(
    (await h.integration.sync(post("/api/whoop/sync", session, undefined, "https://other.test")))
      .status,
  ).toBe(403);
  expect((await h.integration.records(new Request(origin + "/api/whoop/records"))).status).toBe(
    401,
  );
  const ownRecords = await h.integration.records(
    new Request(origin + "/api/whoop/records", {
      headers: { Cookie: session },
    }),
  );
  expect(ownRecords.headers.get("cache-control")).toBe("no-store");
  expect(await ownRecords.json()).toBeNull();
  expect(h.tokenRequests).toBe(0);
});

test("requires owner access and exact origin before issuing an integration session", async () => {
  const { integration } = harness();
  const login = "/api/whoop/session";
  const good = new URLSearchParams({ access_key: ownerKey });
  expect(
    (await integration.session(post(login, undefined, good, "https://foreign.test"))).status,
  ).toBe(403);
  expect(
    (
      await integration.session(
        post(login, undefined, new URLSearchParams({ access_key: "wrong" })),
      )
    ).status,
  ).toBe(401);
  const result = await integration.session(post(login, undefined, good));
  expect(result.status).toBe(204);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(result.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Lax");
  expect(result.headers.get("set-cookie")).not.toContain(ownerKey);
});

test("requires both the initiating session and browser proof for WHOOP OAuth", async () => {
  const h = harness();
  const connect = "/api/whoop/connect";
  expect((await h.integration.connect(post(connect))).status).toBe(401);
  const signIn = () =>
    h.integration.session(
      post("/api/whoop/session", undefined, new URLSearchParams({ access_key: ownerKey })),
    );
  const session = cookie(await signIn());
  const otherSession = cookie(await signIn());
  const start = await h.integration.connect(post(connect, session));
  expect(start.status).toBe(303);
  const flow = cookie(start);
  const authorize = new URL(start.headers.get("location")!);
  const state = authorize.searchParams.get("state");
  expect(state).toMatch(/^[a-zA-Z0-9_-]{8}$/);

  const callback = (cookies: string) =>
    new Request(origin + "/api/whoop/callback?state=" + state + "&code=synthetic", {
      headers: { Cookie: cookies },
    });
  const missingNonce = await h.integration.callback(callback(session));
  expect(missingNonce.status).toBe(303);
  expect(missingNonce.headers.get("cache-control")).toBe("no-store");
  expect(missingNonce.headers.get("referrer-policy")).toBe("no-referrer");
  expect(missingNonce.headers.get("location")).toBe("/integrations/whoop?whoop=restart");
  expect(missingNonce.headers.has("set-cookie")).toBe(false);
  expect(await missingNonce.text()).toBe("");
  const wrongSession = await h.integration.callback(callback(otherSession + "; " + flow));
  expect(wrongSession.headers.get("location")).toBe("/integrations/whoop?whoop=restart");
  expect(wrongSession.headers.has("set-cookie")).toBe(false);
  const valid = await h.integration.callback(callback(session + "; " + flow));
  expect(valid.headers.get("location")).toBe("/integrations/whoop?whoop=connected");
  expect(valid.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(
    (await h.integration.callback(callback(session + "; " + flow))).headers.get("location"),
  ).toBe("/integrations/whoop?whoop=restart");
  expect(h.tokenRequests).toBe(1);
});
