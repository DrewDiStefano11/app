// Run only in a trusted environment with the existing WHOOP server variables.
// Never print credentials, provider IDs, response bodies, or database errors.
import { neon } from "@neondatabase/serverless";
import { createWhoopTokenVault } from "../src/lib/whoop/token-vault.server";

async function inspectHeaders() {
  const { WHOOP_DATABASE_URL, WHOOP_TOKEN_ENCRYPTION_KEY } = process.env;
  if (!WHOOP_DATABASE_URL || !WHOOP_TOKEN_ENCRYPTION_KEY) {
    throw new Error("configuration");
  }
  const sql = neon(WHOOP_DATABASE_URL);
  const [connection] = await sql.query(
    `select id, token_envelope as envelope, expires_at > now() + interval '30 seconds' as usable
     from fitcore_whoop.connections where owner_id = $1 and status = 'connected'`,
    ["fitcore-owner"],
    { fetchOptions: { signal: AbortSignal.timeout(5000) } },
  );
  if (!connection?.usable || !connection.envelope) throw new Error("connection");
  const pair = createWhoopTokenVault(WHOOP_TOKEN_ENCRYPTION_KEY).open(
    "fitcore-owner",
    connection.id,
    connection.envelope,
  );
  for (const path of ["recovery", "activity/sleep", "cycle", "activity/workout"]) {
    const response = await fetch("https://api.prod.whoop.com/developer/v2/" + path + "?limit=1", {
      headers: { Authorization: "Bearer " + pair.accessToken },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    console.log(
      JSON.stringify({
        collection: path,
        status: response.status,
        cacheControl: response.headers.get("Cache-Control"),
        age: response.headers.get("Age"),
        date: response.headers.get("Date"),
      }),
    );
    await response.body?.cancel();
    // Respect any rejection; do not rotate tokens or retry a rate limit.
    if (!response.ok) break;
  }
}

try {
  await inspectHeaders();
} catch {
  console.error(
    "Header inspection unavailable. Check trusted configuration and an active connection; no credentials were refreshed or modified.",
  );
  process.exitCode = 1;
}
