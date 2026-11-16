import { describe, expect, test } from "bun:test";
import { handleWhoopCallback } from "../../src/lib/whoop/oauth.server";

const origin = "https://fitcore.test";
const state = "AbcDeF01";
const session = { id: "synthetic-session", ownerId: "synthetic-owner" };

function harness() {
  let exchanges = 0;
  let saved = 0;
  let consumed = false;
  const dependencies: Parameters<typeof handleWhoopCallback>[1] = {
    origin,
    getSession: async (request) =>
      request.headers.get("Cookie") === "session=synthetic" ? session : null,
    claimAttempt: async (requestSession, candidate) => {
      if (consumed || requestSession.id !== session.id || candidate !== state) return null;
      consumed = true;
      return "synthetic-attempt";
    },
    exchangeCode: async (code) => {
      exchanges++;
      if (code !== "synthetic-code") throw new Error("Unexpected code");
      return {
        accessToken: "synthetic-access",
        refreshToken: "synthetic-refresh",
        expiresIn: 3600,
      };
    },
    saveConnection: async (requestSession, attempt, pair) => {
      expect(requestSession).toEqual(session);
      expect(attempt).toBe("synthetic-attempt");
      expect(pair.refreshToken).toBe("synthetic-refresh");
      saved++;
      return true;
    },
  };

  return {
    dependencies,
    get exchanges() {
      return exchanges;
    },
    get saved() {
      return saved;
    },
  };
}

const callback = (params: string, cookie = "session=synthetic") =>
  new Request(origin + "/api/whoop/callback?" + params, { headers: { Cookie: cookie } });

describe("WHOOP callback", () => {
  test("checks the initiating session and state before exchanging a code", async () => {
    const h = harness();
    for (const request of [
      callback("code=synthetic-code&state=" + state, "session=other"),
      callback("code=synthetic-code&state=invalid1"),
    ]) {
      const restart = await handleWhoopCallback(request, h.dependencies);
      expect(restart.status).toBe(303);
      expect(restart.headers.get("location")).toBe("/integrations/whoop?whoop=restart");
    }
    for (const request of [
      callback("code=synthetic-code&state=" + state + "&state=" + state),
      callback("code=synthetic-code&code=duplicate&state=" + state),
    ]) {
      expect((await handleWhoopCallback(request, h.dependencies)).status).toBe(400);
    }
    expect(h.exchanges).toBe(0);
    expect(h.saved).toBe(0);
  });

  test("consumes valid state on cancellation without exchanging an authorization code", async () => {
    const h = harness();
    const response = await handleWhoopCallback(
      callback("error=access_denied&state=" + state),
      h.dependencies,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/integrations/whoop?whoop=cancelled");
    expect(
      (
        await handleWhoopCallback(callback("code=synthetic-code&state=" + state), h.dependencies)
      ).headers.get("location"),
    ).toBe("/integrations/whoop?whoop=restart");
    expect(h.exchanges).toBe(0);
  });

  test("handles replays and redirects without returning token values or callback parameters", async () => {
    const h = harness();
    const responses = await Promise.all([
      handleWhoopCallback(callback("code=synthetic-code&state=" + state), h.dependencies),
      handleWhoopCallback(callback("code=synthetic-code&state=" + state), h.dependencies),
    ]);
    expect(responses.map((response) => response.headers.get("location")).sort()).toEqual([
      "/integrations/whoop?whoop=connected",
      "/integrations/whoop?whoop=restart",
    ]);
    expect(h.exchanges).toBe(1);
    expect(h.saved).toBe(1);
    const success = responses.find((response) =>
      response.headers.get("location")?.endsWith("=connected"),
    )!;
    expect(success.headers.get("location")).toBe("/integrations/whoop?whoop=connected");
    expect(success.headers.get("cache-control")).toBe("no-store");
    expect(success.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await success.text()).toBe("");
  });

  test("returns a generic failure if the exchange fails or the session ends", async () => {
    const h = harness();
    h.dependencies.exchangeCode = async () => {
      throw new Error("sensitive-provider-response");
    };
    const failed = await handleWhoopCallback(
      callback("code=synthetic-code&state=" + state),
      h.dependencies,
    );
    expect(failed.headers.get("location")).toBe("/integrations/whoop?whoop=failed");
    expect(await failed.text()).toBe("");
    expect(h.saved).toBe(0);

    const stale = harness();
    stale.dependencies.saveConnection = async () => false;
    const ended = await handleWhoopCallback(
      callback("code=synthetic-code&state=" + state),
      stale.dependencies,
    );
    expect(ended.headers.get("location")).toBe("/integrations/whoop?whoop=failed");
  });
});

test("uses WHOOP authorization-code OAuth and requests only feature scopes plus offline", async () => {
  const { createWhoopOAuthClient } = await import("../../src/lib/whoop/oauth.server");
  const client = createWhoopOAuthClient({
    origin,
    clientId: "synthetic-id",
    clientSecret: "synthetic-secret",
    fetch: async (input, init) => {
      expect(input).toBe("https://api.prod.whoop.com/oauth/oauth2/token");
      expect(init.method).toBe("POST");
      expect(init.redirect).toBe("error");
      expect(init.body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
        grant_type: "authorization_code",
        code: "synthetic-code",
        client_id: "synthetic-id",
        client_secret: "synthetic-secret",
        redirect_uri: origin + "/api/whoop/callback",
      });
      return Response.json({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        expires_in: 3600,
        token_type: "bearer",
      });
    },
  });
  const authorization = client.authorize(state);
  expect(authorization.origin + authorization.pathname).toBe(
    "https://api.prod.whoop.com/oauth/oauth2/auth",
  );
  expect(authorization.searchParams.get("scope")).toBe(
    "read:recovery read:cycles read:sleep read:workout offline",
  );
  expect(authorization.searchParams.get("response_type")).toBe("code");
  expect(authorization.searchParams.get("state")).toBe(state);
  expect(authorization.searchParams.get("redirect_uri")).toBe(origin + "/api/whoop/callback");
  expect(authorization.href).not.toContain("synthetic-secret");
  expect(await client.exchangeCode("synthetic-code")).toEqual({
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresIn: 3600,
  });
});

test("rejects a successful WHOOP exchange that omits the refresh token", async () => {
  const { createWhoopOAuthClient } = await import("../../src/lib/whoop/oauth.server");
  const client = createWhoopOAuthClient({
    origin,
    clientId: "synthetic-id",
    clientSecret: "synthetic-secret",
    fetch: async () => Response.json({ access_token: "synthetic-access", expires_in: 3600 }),
  });
  await expect(client.exchangeCode("synthetic-code")).rejects.toThrow(
    "Invalid WHOOP token response",
  );
});
