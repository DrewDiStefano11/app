// Test-only HTTPS host for the actual Vercel artifact. No production API routes are stubbed.
// Neon HTTP transport executes the artifact's SQL against a disk-backed PostgreSQL engine.
import { createServer } from "node:https";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const directory = await mkdtemp(join(tmpdir(), "fitcore-whoop-acceptance-"));
const openssl =
  process.platform === "win32" ? "C:/Program Files/Git/usr/bin/openssl.exe" : "openssl";
execFileSync(
  openssl,
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    join(directory, "key.pem"),
    "-out",
    join(directory, "cert.pem"),
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost",
    "-days",
    "1",
  ],
  { stdio: "ignore" },
);
const databasePath = join(directory, "database");
let database = new PGlite(databasePath);
for (const migration of [
  "001-credentials.sql",
  "002-sync.sql",
  "003-webhooks.sql",
  "004-cache.sql",
  "005-jarvis-read.sql",
  "006-owner-archive.sql",
  "007-history-import.sql",
])
  await database.exec(await readFile(join("db/whoop", migration), "utf8"));
await database.exec(await readFile("db/whoop/operations/runtime-role.sql", "utf8"));
await database.exec(await readFile("db/whoop/operations/archive-runtime-role.sql", "utf8"));
const encryptionKey = Buffer.alloc(32, 19);
const accessKey = Buffer.alloc(32, 20).toString("base64url");
const connectionId = "11111111-1111-4111-8111-111111111111";
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
cipher.setAAD(
  Buffer.from(JSON.stringify(["fitcore", "whoop", "v1", "fitcore-owner", connectionId])),
);
const ciphertext = Buffer.concat([
  cipher.update(
    JSON.stringify({
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      expiresIn: 3600,
      scopes: ["read:recovery", "read:sleep", "read:cycles", "read:workout"],
    }),
  ),
  cipher.final(),
]);
const envelope = [
  "v1",
  iv.toString("base64url"),
  ciphertext.toString("base64url"),
  cipher.getAuthTag().toString("base64url"),
].join(".");
await database.query(
  "insert into fitcore_whoop.connections (owner_id, id, token_envelope, expires_at, provider_user_id) values ('fitcore-owner', $1, $2, now() + interval '1 hour', '123')",
  [connectionId, envelope],
);
await database.exec("set role fitcore_whoop_runtime");

const control = { mode: "success", score: 80, providerRequests: 0, pending: [] };
function providerResponse(url, history = false, nextToken = null) {
  const at = new Date(Date.now() - 3600000).toISOString();
  const base = {
    user_id: 123,
    created_at: at,
    updated_at: new Date().toISOString(),
    score_state: "SCORED",
  };
  const sleepId = "22222222-2222-4222-8222-222222222222";
  const records = url.endsWith("/recovery")
    ? [
        {
          ...base,
          cycle_id: 456,
          sleep_id: sleepId,
          score: { recovery_score: control.score, hrv_rmssd_milli: 56.45, resting_heart_rate: 51 },
        },
      ]
    : url.endsWith("/activity/sleep")
      ? [
          {
            ...base,
            id: sleepId,
            cycle_id: 456,
            nap: false,
            start: new Date(Date.now() - 8 * 3600000).toISOString(),
            end: at,
            score: {
              sleep_performance_percentage: 91,
              stage_summary: {
                total_light_sleep_time_milli: 14400000,
                total_slow_wave_sleep_time_milli: 3600000,
                total_rem_sleep_time_milli: 7200000,
                total_awake_time_milli: 600000,
                total_no_data_time_milli: 0,
              },
            },
          },
        ]
      : url.endsWith("/cycle")
        ? [{ ...base, id: 456, start: at, step_count: 8234, score: { strain: 11.3 } }]
        : [
            {
              ...base,
              id: "33333333-3333-4333-8333-333333333333",
              start: at,
              end: at,
              sport_name: "Synthetic cycling",
              score: { strain: 8.4 },
            },
          ];
  if (history) {
    const historicalAt = "2018-02-03T08:00:00.000Z";
    for (const record of records) {
      record.created_at = historicalAt;
      record.updated_at = nextToken ? "2018-02-04T08:00:00.000Z" : historicalAt;
      if ("start" in record) record.start = "2018-02-03T00:00:00.000Z";
      if ("end" in record) record.end = historicalAt;
      if ("cycle_id" in record) record.cycle_id = 1999;
      if ("sleep_id" in record) record.sleep_id = "44444444-4444-4444-8444-444444444444";
      if ("id" in record)
        record.id =
          typeof record.id === "number"
            ? 1999
            : url.endsWith("/activity/sleep")
              ? "44444444-4444-4444-8444-444444444444"
              : "55555555-5555-4555-8555-555555555555";
      if (url.endsWith("/recovery")) record.score.recovery_score = nextToken ? 75 : 70;
    }
  }
  return control.mode === "failure"
    ? new Response(null, { status: 503 })
    : Response.json(
        {
          records,
          next_token:
            history && url.endsWith("/recovery") && !nextToken ? "history-page-two" : null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.hostname.endsWith("neon.tech")) {
    try {
      const input = JSON.parse(init.body);
      const result = await database.query(input.query, input.params);
      return Response.json({
        fields: result.fields,
        rows: result.rows.map((row) =>
          result.fields.map((field) => {
            const value = row[field.name];
            if (value === null || value === undefined) return null;
            if (field.dataTypeID === 114 || field.dataTypeID === 3802) return JSON.stringify(value);
            if (typeof value === "boolean") return value ? "t" : "f";
            return String(value);
          }),
        ),
        rowCount: result.affectedRows ?? result.rows.length,
        command: "SELECT",
      });
    } catch (error) {
      return Response.json(
        { message: "Synthetic database request failed", code: error.code },
        { status: 400 },
      );
    }
  }
  if (url.hostname === "api.prod.whoop.com") {
    control.providerRequests++;
    if (control.mode === "hold")
      await new Promise((done, reject) => {
        control.pending.push(done);
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("Synthetic provider request aborted")),
          { once: true },
        );
      });
    return providerResponse(
      url.pathname,
      !url.searchParams.has("start"),
      url.searchParams.get("nextToken"),
    );
  }
  return originalFetch(input, init);
};

let artifact;
const server = createServer(
  {
    key: await readFile(join(directory, "key.pem")),
    cert: await readFile(join(directory, "cert.pem")),
  },
  async (incoming, outgoing) => {
    try {
      const origin = process.env.WHOOP_ORIGIN;
      const url = new URL(incoming.url, origin);
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      let response;
      if (url.pathname === "/__test/control") {
        let deletionStatus;
        if (incoming.headers["x-synthetic-control"] !== "test-only") {
          outgoing.writeHead(403).end();
          return;
        }
        if (body.length) {
          const change = JSON.parse(body.toString());
          if (change.deleteSleep) {
            const timestamp = String(Date.now());
            const event = JSON.stringify({
              user_id: 123,
              id: "22222222-2222-4222-8222-222222222222",
              type: "sleep.deleted",
              trace_id: "artifact-archive-deletion",
            });
            const result = await artifact.fetch(
              new Request(origin + "/api/whoop/webhook", {
                method: "POST",
                body: event,
                headers: {
                  "X-WHOOP-Signature-Timestamp": timestamp,
                  "X-WHOOP-Signature": createHmac("sha256", "synthetic-secret")
                    .update(timestamp)
                    .update(event)
                    .digest("base64"),
                },
              }),
            );
            deletionStatus = result.status;
          }
          if (change.reopenDatabase) {
            await database.close();
            database = new PGlite(databasePath);
            await database.exec("set role fitcore_whoop_runtime");
          }
          if (change.resetCooldown)
            await database.query(
              "update fitcore_whoop.connections set sync_after = null where id = $1",
              [connectionId],
            );
          if (change.score) control.score = change.score;
          if (change.mode) {
            control.mode = change.mode;
            if (change.mode !== "hold") for (const done of control.pending.splice(0)) done();
          }
        }
        const [{ count }] = (
          await database.query(
            "select count(*)::integer as count from fitcore_whoop.archive_records",
          )
        ).rows;
        response = Response.json({
          count,
          providerRequests: control.providerRequests,
          archiveEnabled: process.env.WHOOP_OWNER_ARCHIVE_ENABLED === "true",
          deletionStatus,
          temporaryCacheEnabled: false,
        });
      } else {
        const staticPath = resolve(".vercel/output/static", "." + url.pathname);
        if (
          staticPath.startsWith(resolve(".vercel/output/static") + sep) &&
          existsSync(staticPath) &&
          !url.pathname.endsWith("/")
        ) {
          const type = url.pathname.endsWith(".js")
            ? "text/javascript"
            : url.pathname.endsWith(".css")
              ? "text/css"
              : url.pathname.endsWith(".svg")
                ? "image/svg+xml"
                : "application/octet-stream";
          response = new Response(await readFile(staticPath), {
            headers: { "Content-Type": type },
          });
        } else
          response = await artifact.fetch(
            new Request(url, {
              method: incoming.method,
              headers: incoming.headers,
              ...(body.length ? { body } : {}),
            }),
          );
      }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.writeHead(500).end();
    }
  },
);
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `https://localhost:${server.address().port}`;
Object.assign(process.env, {
  WHOOP_INTEGRATION_ENABLED: "true",
  WHOOP_ORIGIN: origin,
  WHOOP_CLIENT_ID: "synthetic-client",
  WHOOP_CLIENT_SECRET: "synthetic-secret",
  WHOOP_DATABASE_URL:
    "postgresql://fitcore_whoop_runtime:synthetic@ep-synthetic.neon.tech/neondb?sslmode=require",
  WHOOP_OWNER_KEY_SHA256: createHash("sha256").update(accessKey).digest("hex"),
  WHOOP_TOKEN_ENCRYPTION_KEY: encryptionKey.toString("base64url"),
  WHOOP_OWNER_ARCHIVE_ENABLED: "true",
  WHOOP_HISTORY_IMPORT_ENABLED: "true",
  WHOOP_ARCHIVE_DELETION_POLICY: "no-recovery-copies-v1",
  WHOOP_SNAPSHOT_CACHE_ENABLED: "false",
  WHOOP_BACKGROUND_ENABLED: "false",
  WHOOP_JARVIS_SHARING_ENABLED: "false",
});
artifact = (await import("../../../.vercel/output/functions/__server.func/index.mjs")).default;
console.log("ARCHIVE_TEST_READY " + JSON.stringify({ origin, accessKey }));
async function close() {
  for (const done of control.pending.splice(0)) done();
  server.closeAllConnections();
  server.close();
  await database.close();
  const target = resolve(directory);
  if (
    target.startsWith(resolve(tmpdir()) + sep) &&
    target.split(sep).at(-1).startsWith("fitcore-whoop-acceptance-")
  )
    await rm(target, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
