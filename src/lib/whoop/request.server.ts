import process from "node:process";
import { neon } from "@neondatabase/serverless";
import { createWhoopIntegration } from "./integration.server";
import { createWhoopStore } from "./postgres.server";

function reply(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

function getIntegration() {
  const {
    WHOOP_INTEGRATION_ENABLED,
    WHOOP_ORIGIN,
    WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET,
    WHOOP_DATABASE_URL,
    WHOOP_OWNER_KEY_SHA256,
    WHOOP_TOKEN_ENCRYPTION_KEY,
  } = process.env;

  if (
    WHOOP_INTEGRATION_ENABLED !== "true" ||
    !WHOOP_ORIGIN ||
    !WHOOP_CLIENT_ID ||
    !WHOOP_CLIENT_SECRET ||
    !WHOOP_DATABASE_URL ||
    !WHOOP_OWNER_KEY_SHA256 ||
    !WHOOP_TOKEN_ENCRYPTION_KEY
  ) {
    return null;
  }

  const url = new URL(WHOOP_ORIGIN);
  if (url.protocol !== "https:" || url.origin !== WHOOP_ORIGIN) return null;

  const sql = neon(WHOOP_DATABASE_URL);
  return createWhoopIntegration({
    origin: WHOOP_ORIGIN,
    clientId: WHOOP_CLIENT_ID,
    clientSecret: WHOOP_CLIENT_SECRET,
    ownerKeyDigest: WHOOP_OWNER_KEY_SHA256,
    encryptionKey: WHOOP_TOKEN_ENCRYPTION_KEY,
    store: createWhoopStore(
      async <Row extends Record<string, unknown>>(
        statement: string,
        parameters: (string | number)[],
      ) =>
        (await sql.query(statement, parameters, {
          fetchOptions: { signal: AbortSignal.timeout(5000) },
        })) as Row[],
    ),
  });
}

export async function handleWhoopRequest(request: Request, action: string) {
  if (
    !["session", "connect", "callback", "disconnect", "status", "sync", "records"].includes(action)
  )
    return reply(404);

  // Keep request bodies, callback query parameters, and provider or database errors out of logs.
  try {
    const integration = getIntegration();
    if (!integration) return reply(503);

    switch (action) {
      case "session":
        return await integration.session(request);
      case "connect":
        return await integration.connect(request);
      case "callback":
        return await integration.callback(request);
      case "disconnect":
        return await integration.disconnect(request);
      case "status":
        return await integration.status(request);
      case "sync":
        return await integration.sync(request);
      case "records":
        return await integration.records(request);
      default:
        return reply(404);
    }
  } catch {
    return reply(503);
  }
}
