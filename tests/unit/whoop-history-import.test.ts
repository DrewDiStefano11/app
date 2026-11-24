import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";
import { createWhoopArchiveStore } from "../../src/lib/whoop/archive-store.server";
import { createWhoopArchiveVault } from "../../src/lib/whoop/archive-vault.server";
import { createWhoopTokenVault } from "../../src/lib/whoop/token-vault.server";
import { createWhoopIntegration } from "../../src/lib/whoop/integration.server";

const key = Buffer.alloc(32, 33).toString("base64url");
const scopeList = ["read:recovery", "read:sleep", "read:cycles", "read:workout"];
const sleepId = "11111111-1111-4111-8111-111111111111";
const at = "2018-02-03T08:00:00.000Z";
const recovery = (score = 70, user = 123) => ({
  user_id: user,
  cycle_id: 12,
  sleep_id: sleepId,
  created_at: at,
  updated_at: score === 90 ? "2018-02-04T08:00:00.000Z" : at,
  score_state: "SCORED",
  score: { recovery_score: score, hrv_rmssd_milli: 55, resting_heart_rate: 60 },
});

async function fixture(scopes: string[] | undefined = scopeList) {
  const db = new PGlite();
  for (const file of [
    "001-credentials.sql",
    "002-sync.sql",
    "003-webhooks.sql",
    "004-cache.sql",
    "005-jarvis-read.sql",
    "006-owner-archive.sql",
    "007-history-import.sql",
    "operations/runtime-role.sql",
    "operations/archive-runtime-role.sql",
  ])
    await db.exec(await readFile(new URL("../../db/whoop/" + file, import.meta.url), "utf8"));
  const query = async <Row extends Record<string, unknown>>(
    sql: string,
    params: (string | number)[],
  ) => (await db.query<Row>(sql, params)).rows;
  const store = createWhoopStore(query);
  const archive = createWhoopArchiveStore(query, createWhoopArchiveVault(key));
  const digest = "a".repeat(64),
    token = Buffer.alloc(32, 34).toString("base64url");
  const session = await store.createSession(
    "synthetic-owner",
    createHmac("sha256", Buffer.from(digest, "hex"))
      .update("fitcore-whoop-session:")
      .update(token)
      .digest("hex"),
    3600,
  );
  await store.beginAttempt(session, "proof", 60);
  const id = (await store.claimAttempt(session, "proof"))!;
  await store.saveConnection(
    session,
    id,
    createWhoopTokenVault(key).seal(session.ownerId, id, {
      accessToken: "synthetic",
      refreshToken: "synthetic-refresh",
      expiresIn: 3600,
      scopes,
    }),
    3600,
  );
  await db.query("update fitcore_whoop.connections set provider_user_id = '123' where id = $1", [
    id,
  ]);
  await db.exec("set role fitcore_whoop_runtime");
  await archive.grantConsent(session, "settings");
  const controls = {
    mode: "success",
    calls: [] as URL[],
    hold: null as null | (() => Promise<void>),
    score: 90,
    user: 123,
  };
  const makeIntegration = () =>
    createWhoopIntegration({
      origin: "https://fitcore.test",
      clientId: "synthetic",
      clientSecret: "synthetic-secret",
      ownerKeyDigest: digest,
      encryptionKey: key,
      store,
      archive,
      historyImportEnabled: true,
      webhooks: store,
      fetch: async (url) => {
        const parsed = new URL(url);
        controls.calls.push(parsed);
        if (url.includes("/oauth/oauth2/token"))
          return Response.json({
            access_token: "next",
            refresh_token: "next-refresh",
            expires_in: 3600,
          });
        if (controls.hold) await controls.hold();
        if (controls.mode === "rate")
          return new Response(null, { status: 429, headers: { "Retry-After": "600" } });
        if (controls.mode === "failure") return new Response(null, { status: 503 });
        const second = parsed.searchParams.has("nextToken");
        return Response.json({
          records: parsed.pathname.endsWith("/recovery")
            ? [recovery(second ? controls.score : 70, controls.user)]
            : [],
          next_token:
            parsed.pathname.endsWith("/recovery") && (!second || controls.mode === "loop")
              ? "second-page"
              : null,
        });
      },
    });
  const request = (method = "POST", authenticated = true, origin = "https://fitcore.test") =>
    new Request("https://fitcore.test/api/whoop/archive-import", {
      method,
      headers: {
        Origin: origin,
        ...(authenticated ? { Cookie: "__Host-fitcore-whoop-session=" + token } : {}),
      },
    });
  const ready = () =>
    db.query(
      "update fitcore_whoop.connections set jarvis_after = null, sync_after = null where id = $1",
      [id],
    );
  return { db, store, archive, session, id, controls, makeIntegration, request, ready };
}

test("history import resumes across runtime reopening, requests unbounded pages and atomically saves corrected deduplicated data", async () => {
  const f = await fixture();
  try {
    let api = f.makeIntegration();
    assert.equal((await api.archiveImport(f.request("POST", false))).status, 401);
    assert.equal(
      (await api.archiveImport(f.request("POST", true, "https://foreign.test"))).status,
      403,
    );
    assert.equal((await api.archiveImport(f.request())).status, 200);
    const first = await f.archive.getSnapshot(f.session);
    assert.equal(first!.records[0].created_at, at);
    assert.equal((await api.archiveImport(f.request())).status, 409); // saved cooldown, no duplicate page
    assert.equal(f.controls.calls.length, 1);
    api = f.makeIntegration(); // application/runtime restart, same persistent database
    // Hosted PostgreSQL timestamps can have finer precision than JS/provider URLs.
    await f.db.query(
      "update fitcore_whoop.archive_imports set window_end = window_end + interval '1 microsecond'",
      [],
    );
    for (let i = 0; i < 4; i++) {
      await f.ready();
      assert.equal((await api.archiveImport(f.request())).status, 200);
    }
    const progress = await (await api.archiveImport(f.request("GET"))).json();
    assert.equal(progress.progress.length, 4);
    assert.ok(progress.progress.every((row: { completedAt: string }) => row.completedAt));
    const imported = (await f.archive.getSnapshot(f.session))!;
    assert.equal(imported.records.length, 1);
    assert.equal(imported.records[0].score!.recovery_score, 90);
    assert.equal(imported.records[0].updated_at, "2018-02-04T08:00:00.000Z");
    assert.equal(f.controls.calls.length, 5);
    assert.ok(
      f.controls.calls.every(
        (url) => !url.searchParams.has("start") && url.searchParams.get("limit") === "25",
      ),
    );
    assert.equal(
      new Set(f.controls.calls.slice(0, 2).map((url) => url.searchParams.get("end"))).size,
      1,
    );
    assert.equal(f.controls.calls[1].searchParams.get("nextToken"), "second-page");
    await f.ready();
    assert.equal((await api.archiveImport(f.request())).status, 200);
    assert.equal(f.controls.calls.length, 5); // completed imports do not refetch old pages
    assert.equal((await f.store.getConnection(f.session.ownerId))!.lastSyncedAt, null); // import does not pretend to be a current dashboard sync
  } finally {
    await f.db.close();
  }
});

test("rate limits, looping pagination and invalid account data preserve committed history and its checkpoint", async () => {
  const f = await fixture();
  try {
    const api = f.makeIntegration();
    assert.equal((await api.archiveImport(f.request())).status, 200);
    const saved = await f.archive.getSnapshot(f.session);
    for (const mode of ["rate", "loop", "wrong-owner"]) {
      await f.ready();
      f.controls.mode = mode;
      f.controls.user = mode === "wrong-owner" ? 999 : 123;
      const result = await api.archiveImport(f.request());
      assert.equal(result.status, mode === "rate" ? 429 : 502);
      if (mode === "rate") assert.equal(result.headers.get("Retry-After"), "600");
      assert.deepEqual(await f.archive.getSnapshot(f.session), saved);
      const progress = await f.archive.importProgress(f.session);
      assert.equal(progress.find((row) => row.kind === "recovery")!.pages, 1);
    }
    await f.ready();
    f.controls.mode = "success";
    f.controls.user = 123;
    assert.equal((await api.archiveImport(f.request())).status, 200);
  } finally {
    await f.db.close();
  }
});

test("withdrawal during an in-flight historical page purges checkpoints and fences late provider data", async () => {
  const f = await fixture();
  try {
    const api = f.makeIntegration();
    await api.archiveImport(f.request());
    await f.ready();
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => (started = resolve));
    const held = new Promise<void>((resolve) => (release = resolve));
    f.controls.hold = async () => {
      started();
      await held;
    };
    const pending = api.archiveImport(f.request());
    await entered;
    assert.equal(await f.archive.revokeConsent(f.session), true);
    release();
    assert.equal((await pending).status, 409);
    assert.equal(await f.archive.getSnapshot(f.session), null);
    assert.deepEqual(await f.archive.importProgress(f.session), []);
    assert.equal(
      (await f.db.query("select count(*)::int as count from fitcore_whoop.archive_records")).rows[0]
        .count,
      0,
    );
  } finally {
    await f.db.close();
  }
});

test("durable deletion tombstones prevent historical pagination from resurrecting a deleted provider revision", async () => {
  const f = await fixture();
  try {
    const api = f.makeIntegration();
    await api.archiveImport(f.request());
    await f.store.registerWebhook({
      userId: "123",
      traceId: "history-deletion",
      type: "sleep.deleted",
      recordId: sleepId,
    });
    await f.ready();
    f.controls.score = 70;
    assert.equal((await api.archiveImport(f.request())).status, 200);
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 0);
    assert.equal(
      (await f.archive.importProgress(f.session)).find((row) => row.kind === "recovery")!.pages,
      2,
    );
  } finally {
    await f.db.close();
  }
});

test("historical reads require verified granted scope and preserve legacy credentials and stored measurements when verification is unavailable", async () => {
  for (const scopes of [[], undefined]) {
    const f = await fixture(scopes === undefined ? [] : scopes);
    try {
      if (scopes === undefined) {
        await f.db.query("update fitcore_whoop.connections set token_envelope = $1 where id = $2", [
          createWhoopTokenVault(key).seal(f.session.ownerId, f.id, {
            accessToken: "legacy",
            refreshToken: "legacy-refresh",
            expiresIn: 3600,
          }),
          f.id,
        ]);
      }
      const result = await f.makeIntegration().archiveImport(f.request());
      assert.equal(result.status, 409);
      assert.equal((await result.json()).reason, "scope_verification_required");
      assert.equal(
        f.controls.calls.filter((url) => url.pathname.includes("/developer/")).length,
        0,
      );
      assert.equal((await f.store.getConnection(f.session.ownerId))!.status, "connected");
    } finally {
      await f.db.close();
    }
  }
});

test("a failed checkpoint write rolls back measurements and timestamps with the page, then resumes safely", async () => {
  const f = await fixture();
  try {
    const api = f.makeIntegration();
    await api.archiveImport(f.request());
    await f.ready();
    const saved = await f.archive.getSnapshot(f.session);
    await f.db.exec(
      "reset role; create function fitcore_whoop.synthetic_checkpoint_failure() returns trigger language plpgsql as $$ begin raise exception 'Synthetic checkpoint rejection'; end $$; create trigger synthetic_checkpoint_failure before update on fitcore_whoop.archive_imports for each row execute function fitcore_whoop.synthetic_checkpoint_failure(); set role fitcore_whoop_runtime",
    );
    assert.equal((await api.archiveImport(f.request())).status, 502);
    assert.deepEqual(await f.archive.getSnapshot(f.session), saved);
    assert.equal(
      (await f.archive.importProgress(f.session)).find((row) => row.kind === "recovery")!.pages,
      1,
    );
    await f.db.exec(
      "reset role; drop trigger synthetic_checkpoint_failure on fitcore_whoop.archive_imports; set role fitcore_whoop_runtime",
    );
    await f.ready();
    assert.equal((await api.archiveImport(f.request())).status, 200);
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 1);
    assert.equal((await f.archive.getSnapshot(f.session))!.records[0].score!.recovery_score, 90);
  } finally {
    await f.db.close();
  }
});

test("token rotation preserves previously verified scopes if the provider omits them in its refresh response", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "update fitcore_whoop.connections set expires_at = now() - interval '1 second' where id = $1",
      [f.id],
    );
    assert.equal((await f.makeIntegration().archiveImport(f.request())).status, 200);
    assert.equal(f.controls.calls.filter((url) => url.pathname.includes("/oauth/")).length, 1);
    const connection = (await f.store.getConnection(f.session.ownerId))!;
    assert.deepEqual(
      createWhoopTokenVault(key).open(f.session.ownerId, f.id, connection.envelope!).scopes,
      scopeList,
    );
  } finally {
    await f.db.close();
  }
});
