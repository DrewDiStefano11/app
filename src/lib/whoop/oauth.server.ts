import { z } from "zod";
import { whoopRetryAfter } from "./v2.server";

const CALLBACK_PATH = "/api/whoop/callback";
const CONNECTION_PATH = "/integrations/whoop";

export type WhoopSession = {
  id: string;
  ownerId: string;
};

export type WhoopTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type CallbackDependencies = {
  origin: string;
  getSession(request: Request): Promise<WhoopSession | null>;
  // Atomically consume a matching, unexpired attempt for this session and browser nonce.
  claimAttempt(session: WhoopSession, state: string, request: Request): Promise<string | null>;
  discardAttempt?(session: WhoopSession, attempt: string): Promise<void>;
  exchangeCode(code: string): Promise<WhoopTokenPair>;
  // Persist encrypted credentials only if the claimed attempt and session are still current.
  saveConnection(session: WhoopSession, attempt: string, pair: WhoopTokenPair): Promise<boolean>;
};

const responseHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function redirect(result: "connected" | "cancelled" | "failed" | "restart") {
  return new Response(null, {
    status: 303,
    headers: { ...responseHeaders, Location: CONNECTION_PATH + "?whoop=" + result },
  });
}

export async function handleWhoopCallback(request: Request, dependencies: CallbackDependencies) {
  const url = new URL(request.url);
  const reject = () => new Response(null, { status: 400, headers: responseHeaders });

  if (
    request.method !== "GET" ||
    url.origin !== dependencies.origin ||
    url.pathname !== CALLBACK_PATH
  ) {
    return reject();
  }

  const states = url.searchParams.getAll("state");
  const codes = url.searchParams.getAll("code");
  const errors = url.searchParams.getAll("error");
  const [state] = states;
  const [code] = codes;
  const [error] = errors;
  const isAuthorization =
    codes.length === 1 && code.length > 0 && code.length <= 2048 && !errors.length;
  const isProviderError = errors.length === 1 && error.length > 0 && !codes.length;
  if (
    states.length !== 1 ||
    !/^[A-Za-z0-9_-]{8}$/.test(state) ||
    !(isAuthorization || isProviderError)
  ) {
    return reject();
  }

  // Keep provider errors and callback parameters out of application logs and HTML.
  try {
    const session = await dependencies.getSession(request);
    if (!session) return redirect("restart");

    const attempt = await dependencies.claimAttempt(session, state, request);
    if (!attempt) return redirect("restart");
    try {
      if (isProviderError) return redirect(error === "access_denied" ? "cancelled" : "failed");

      const pair = await dependencies.exchangeCode(code);
      const saved = await dependencies.saveConnection(session, attempt, pair);
      return redirect(saved ? "connected" : "failed");
    } finally {
      await dependencies.discardAttempt?.(session, attempt).catch(() => {});
    }
  } catch {
    return redirect("failed");
  }
}

const oauthBase = "https://api.prod.whoop.com/oauth/oauth2";
const scopes = "read:recovery read:cycles read:sleep read:workout offline";

type OAuthClientConfig = {
  origin: string;
  clientId: string;
  clientSecret: string;
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
};

export class WhoopTokenRateLimit extends Error {
  constructor(public readonly retryAfterSeconds?: number) {
    super("WHOOP token request was rate limited");
  }
}

export class WhoopTokenRejected extends Error {
  constructor() {
    super("WHOOP authorization is no longer valid");
  }
}

export function createWhoopOAuthClient(config: OAuthClientConfig) {
  const redirectUri = new URL(CALLBACK_PATH, config.origin).href;
  const send = config.fetch ?? fetch;

  async function requestToken(grant: Record<string, string>): Promise<WhoopTokenPair> {
    let result: unknown;
    try {
      const response = await send(oauthBase + "/token", {
        method: "POST",
        redirect: "error",
        body: new URLSearchParams({
          ...grant,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 429) throw new WhoopTokenRateLimit(whoopRetryAfter(response.headers));
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          // Only a documented terminal grant rejection establishes owner authorization loss.
          const body = await response.text();
          if (body.length <= 4096) {
            try {
              if (JSON.parse(body).error === "invalid_grant") throw new WhoopTokenRejected();
            } catch (error) {
              if (error instanceof WhoopTokenRejected) throw error;
            }
          }
        }
        throw new Error();
      }
      result = await response.json();
    } catch (error) {
      if (error instanceof WhoopTokenRateLimit || error instanceof WhoopTokenRejected) throw error;
      throw new Error("WHOOP token request failed");
    }

    const pair = z
      .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1),
        expires_in: z.number().int().positive().max(2_147_483_647),
        token_type: z.string().toLowerCase().pipe(z.literal("bearer")).optional(),
      })
      .safeParse(result);
    if (!pair.success) throw new Error("Invalid WHOOP token response");

    return {
      accessToken: pair.data.access_token,
      refreshToken: pair.data.refresh_token,
      expiresIn: pair.data.expires_in,
    };
  }

  return {
    authorize(state: string) {
      const url = new URL(oauthBase + "/auth");
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: scopes,
        state,
      }).toString();
      return url;
    },
    refresh(refreshToken: string) {
      return requestToken({
        grant_type: "refresh_token",
        scope: "offline",
        refresh_token: refreshToken,
      });
    },
    async revoke(accessToken: string) {
      const response = await send("https://api.prod.whoop.com/developer/v2/user/access", {
        method: "DELETE",
        redirect: "error",
        headers: { Authorization: "Bearer " + accessToken },
        signal: AbortSignal.timeout(10_000),
      });
      return response.status;
    },
    exchangeCode(code: string) {
      return requestToken({ grant_type: "authorization_code", redirect_uri: redirectUri, code });
    },
  };
}
