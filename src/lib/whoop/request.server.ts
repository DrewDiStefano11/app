import process from "node:process";
import { neon } from "@neondatabase/serverless";
import { createWhoopIntegration } from "./integration.server";
import { createWhoopStore } from "./postgres.server";
import { createWhoopArchiveStore } from "./archive-store.server";
import { createWhoopArchiveVault } from "./archive-vault.server";

const privateHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function reply(status: number) {
  return new Response(null, { status, headers: privateHeaders });
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
    WHOOP_BACKGROUND_ENABLED,
    WHOOP_SNAPSHOT_CACHE_ENABLED,
    WHOOP_JARVIS_SHARING_ENABLED,
    CRON_SECRET,
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
  const query = async <Row extends Record<string, unknown>>(
    statement: string,
    parameters: (string | number)[],
  ) =>
    (await sql.query(statement, parameters, {
      fetchOptions: { signal: AbortSignal.timeout(5000) },
    })) as Row[];
  const store = createWhoopStore(query);
  const archiveEnabled =
    process.env.WHOOP_OWNER_ARCHIVE_ENABLED === "true" &&
    process.env.WHOOP_ARCHIVE_DELETION_POLICY === "no-recovery-copies-v1";
  return createWhoopIntegration({
    origin: WHOOP_ORIGIN,
    clientId: WHOOP_CLIENT_ID,
    clientSecret: WHOOP_CLIENT_SECRET,
    ownerKeyDigest: WHOOP_OWNER_KEY_SHA256,
    encryptionKey: WHOOP_TOKEN_ENCRYPTION_KEY,
    jarvisSharingEnabled: WHOOP_JARVIS_SHARING_ENABLED === "true",
    snapshotCacheEnabled: WHOOP_SNAPSHOT_CACHE_ENABLED === "true",
    archive: archiveEnabled
      ? createWhoopArchiveStore(query, createWhoopArchiveVault(WHOOP_TOKEN_ENCRYPTION_KEY))
      : undefined,
    webhooks: archiveEnabled ? store : undefined,
    onCachePolicy:
      process.env.VERCEL_ENV === "production"
        ? (policy) => console.info("WHOOP_CACHE_POLICY", JSON.stringify(policy))
        : undefined,
    store,
    background:
      WHOOP_BACKGROUND_ENABLED === "true" ? { store, cronSecret: CRON_SECRET } : undefined,
  });
}

export async function readWhoopJarvisSnapshot(request: Request) {
  return (await getIntegration()?.jarvisSnapshot(request)) ?? null;
}

export async function handleWhoopRequest(request: Request, action: string) {
  if (
    ![
      "session",
      "connect",
      "callback",
      "disconnect",
      "status",
      "sync",
      "records",
      "webhook",
      "reconcile",
      "archive-consent",
      "archive-export",
    ].includes(action)
  )
    return reply(404);

  // Keep request bodies, callback query parameters, and provider or database errors out of logs.
  try {
    if (action === "reconcile" && process.env.WHOOP_BACKGROUND_ENABLED !== "true")
      return reply(request.method === "GET" ? 204 : 405);
    const integration = getIntegration();
    if (!integration) {
      if (request.method === "GET" && action === "records") {
        return Response.json(null, { headers: privateHeaders });
      }
      if (request.method === "GET" && action === "status") {
        return Response.json(
          { status: "unavailable", lastSyncedAt: null, jarvisSharingAvailable: false },
          { headers: privateHeaders },
        );
      }
      if (
        request.method === "POST" &&
        action === "sync" &&
        request.headers.get("X-FitCore-Whoop-Sync") === "automatic"
      ) {
        return reply(204);
      }
      return reply(503);
    }

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
      case "archive-consent":
        return await integration.archiveConsent(request);
      case "archive-export":
        return await integration.archiveExport(request);
      case "webhook":
        return await integration.webhook(request);
      case "reconcile":
        return await integration.reconcile(request);
      default:
        return reply(404);
    }
  } catch {
    return reply(503);
  }
}
