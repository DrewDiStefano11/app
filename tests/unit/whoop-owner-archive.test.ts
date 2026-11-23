import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";
import { createWhoopArchiveStore } from "../../src/lib/whoop/archive-store.server";
import { createWhoopArchiveVault } from "../../src/lib/whoop/archive-vault.server";
import { normalizeWhoopRecord } from "../../src/lib/whoop/v2.server";

const key = Buffer.alloc(32, 7).toString("base64url");
const sleepId = "11111111-1111-4111-8111-111111111111";
const record = (updatedAt = "2026-11-23T09:00:00Z", score = 80) =>
  normalizeWhoopRecord("recovery", {
    user_id: 123,
    cycle_id: 456,
    sleep_id: sleepId,
    created_at: "2026-11-23T08:00:00Z",
    updated_at: updatedAt,
    score_state: "SCORED",
    score: { recovery_score: score, hrv_rmssd_milli: 55, resting_heart_rate: 60 },
  });

async function fixture() {
  const database = new PGlite();
  for (const file of [
    "001-credentials.sql",
    "002-sync.sql",
    "003-webhooks.sql",
    "004-cache.sql",
    "005-jarvis-read.sql",
    "006-owner-archive.sql",
  ])
    await database.exec(await readFile(new URL("../../db/whoop/" + file, import.meta.url), "utf8"));
  await database.exec(
    await readFile(new URL("../../db/whoop/operations/runtime-role.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(
      new URL("../../db/whoop/operations/archive-runtime-role.sql", import.meta.url),
      "utf8",
    ),
  );
  const query = async <Row extends Record<string, unknown>>(
    statement: string,
    parameters: (string | number)[],
  ) => (await database.query<Row>(statement, parameters)).rows;
  const store = createWhoopStore(query);
  const archive = createWhoopArchiveStore(query, createWhoopArchiveVault(key));
  const session = await store.createSession("synthetic-owner", "digest", 3600);
  const other = await store.createSession("other-owner", "other-digest", 3600);
  await store.beginAttempt(session, "proof", 60);
  const id = (await store.claimAttempt(session, "proof"))!;
  await store.saveConnection(session, id, "synthetic-token-envelope", 3600);
  await database.query(
    "update fitcore_whoop.connections set provider_user_id = '123' where id = $1",
    [id],
  );
  await database.exec("set role fitcore_whoop_runtime");
  const grant = async () => {
    assert.ok(await archive.grantConsent(session, "settings"));
    return (await archive.getConsent(session))!;
  };
  const save = async (records = [record()]) => {
    const consent = (await archive.getConsent(session))!;
    const claim = (await store.claimSync(session))!;
    assert.ok(claim);
    return archive.saveSync(session, consent, claim.syncId, claim.eventRevision, records, 0);
  };
  return { database, store, archive, session, other, id, grant, save };
}

test("archive ciphertext binds owner/account/type/ID/revision and strips unrelated provider fields", () => {
  const vault = createWhoopArchiveVault(key);
  const input = record();
  const identity = {
    ownerId: "owner",
    connectionId: "connection",
    providerUserId: "123",
    kind: input.kind,
    recordId: input.id,
    updatedAt: new Date(input.updated_at).toISOString(),
  };
  const envelope = vault.seal(identity, { ...input, unrelated: "discard" } as typeof input);
  assert.ok(!envelope.includes("recovery_score"));
  assert.deepEqual(vault.open(identity, envelope), input);
  for (const change of [
    { ownerId: "other" },
    { connectionId: "other" },
    { providerUserId: "456" },
    { kind: "sleep" as const },
    { recordId: "different" },
    { updatedAt: "2026-11-22T09:00:00Z" },
  ])
    assert.throws(
      () => vault.open({ ...identity, ...change }, envelope),
      /Invalid WHOOP archive envelope/,
    );
  assert.throws(
    () => vault.open(identity, envelope.slice(0, -3)),
    /Invalid WHOOP archive envelope/,
  );
  assert.throws(() => createWhoopArchiveVault("bad"), /Invalid WHOOP encryption key/);
  const calibrating = { ...input, calibrating: true, score: null };
  assert.deepEqual(vault.open(identity, vault.seal(identity, calibrating)), calibrating);
});

test("SQL archive requires explicit account consent and restores encrypted deduplicated records in a new store", async () => {
  const f = await fixture();
  try {
    assert.equal(await f.archive.getConsent(f.session), null);
    assert.equal(await f.archive.getSnapshot(f.session), null);
    const consent = await f.grant();
    assert.equal(consent.providerUserId, "123");
    assert.deepEqual(consent.purposes, ["personal-display", "history", "fitness-analysis"]);
    assert.ok(await f.archive.grantConsent(f.session, "settings"));
    assert.equal((await f.archive.getConsent(f.session))!.id, consent.id);
    assert.equal(await f.archive.getConsent({ ...f.other, ownerId: f.session.ownerId }), null);
    assert.ok(await f.save([record(), record()]));
    assert.ok(await f.save([record("2026-11-23T10:00:00Z", 90)]));
    assert.ok(await f.save([record()])); // older revision must not replace corrected measurements
    const restored = createWhoopArchiveStore(
      async (sql, values) => (await f.database.query(sql, values)).rows,
      createWhoopArchiveVault(key),
    );
    const snapshot = (await restored.getSnapshot(f.session))!;
    assert.equal(snapshot.records.length, 1);
    assert.equal(snapshot.records[0].score!.recovery_score, 90);
    assert.ok(snapshot.lastSyncedAt);
    assert.ok(Date.parse(snapshot.accessExpiresAt) > Date.now());
    assert.equal(await restored.getSnapshot(f.other), null);
    const rows = await f.database.query<{ envelope: string }>(
      "select envelope from fitcore_whoop.archive_records",
    );
    assert.ok(!JSON.stringify(rows.rows).includes("recovery_score"));
    await assert.rejects(f.database.exec("create table fitcore_whoop.forbidden(id integer)"), {
      code: "42501",
    });
    await assert.rejects(f.database.exec("delete from fitcore_whoop.archive_deletions"), {
      code: "42501",
    });
  } finally {
    await f.database.close();
  }
});

test("withdrawal fences an in-flight batch, purges history and permits a fresh consent without old records", async () => {
  const f = await fixture();
  try {
    const consent = await f.grant();
    assert.ok(await f.save());
    const claim = (await f.store.claimSync(f.session))!;
    assert.ok(await f.archive.revokeConsent(f.session));
    assert.equal(
      await f.archive.saveSync(f.session, consent, claim.syncId, claim.eventRevision, [record()]),
      false,
    );
    assert.equal(await f.archive.getSnapshot(f.session), null);
    assert.equal(
      (await f.database.query("select * from fitcore_whoop.archive_records")).rows.length,
      0,
    );
    const renewed = await f.grant();
    assert.notEqual(renewed.id, consent.id);
    assert.equal(await f.archive.getSnapshot(f.session), null);
    assert.ok(
      (await f.store.getConnection(f.session.ownerId))!.eventRevision > claim.eventRevision,
    );
  } finally {
    await f.database.close();
  }
});

test("webhook deletion removes dependent recovery and durable tombstones fence later backfill", async () => {
  const f = await fixture();
  try {
    await f.grant();
    assert.ok(await f.save());
    await f.database.exec("reset role");
    await f.store.registerWebhook({
      userId: "123",
      traceId: "synthetic-deletion",
      type: "sleep.deleted",
      recordId: sleepId,
    });
    await f.database.exec("set role fitcore_whoop_runtime");
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 0);
    assert.ok(await f.save());
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 0);
    assert.equal(
      (await f.database.query("select * from fitcore_whoop.archive_deletions")).rows.length,
      1,
    );
  } finally {
    await f.database.close();
  }
});

test("disconnect database guard purges archive before upstream token revocation completes", async () => {
  const f = await fixture();
  try {
    await f.grant();
    assert.ok(await f.save());
    assert.ok(await f.store.claimDisconnect(f.session));
    assert.equal(await f.archive.getSnapshot(f.session), null);
    assert.equal(
      (await f.database.query("select * from fitcore_whoop.archive_records")).rows.length,
      0,
    );
    assert.equal(
      (
        await f.database.query(
          "select * from fitcore_whoop.archive_consents where revoked_at is null",
        )
      ).rows.length,
      0,
    );
  } finally {
    await f.database.close();
  }
});

test("invalid mixed-owner batches and failed syncs leave the previous authorized snapshot intact", async () => {
  const f = await fixture();
  try {
    await f.grant();
    assert.ok(await f.save());
    const before = (await f.archive.getSnapshot(f.session))!;
    await assert.rejects(
      f.save([record(), { ...record(), user_id: "999" }]),
      /Invalid WHOOP archive identity/,
    );
    const after = (await f.archive.getSnapshot(f.session))!;
    assert.deepEqual(after, before);
    await f.store.deleteSession(f.session.id);
    assert.equal(await f.archive.getSnapshot(f.session), null);
  } finally {
    await f.database.close();
  }
});

test("stale event revisions and stolen leases cannot commit; empty success retains measurements", async () => {
  const f = await fixture();
  try {
    const consent = await f.grant();
    assert.ok(await f.save());
    assert.ok(await f.save([]));
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 1);
    const claim = (await f.store.claimSync(f.session))!;
    assert.equal(
      await f.archive.saveSync(f.session, consent, claim.syncId, claim.eventRevision + 1, [
        record(),
      ]),
      false,
    );
    assert.equal(
      await f.archive.saveSync(
        f.session,
        consent,
        "22222222-2222-4222-8222-222222222222",
        claim.eventRevision,
        [record()],
      ),
      false,
    );
    assert.equal(
      await f.archive.saveSync(
        { ...f.other, ownerId: f.session.ownerId },
        consent,
        claim.syncId,
        claim.eventRevision,
        [record()],
      ),
      false,
    );
    assert.equal((await f.archive.getSnapshot(f.session))!.records.length, 1);
  } finally {
    await f.database.close();
  }
});

test("a database failure rolls back the entire batch and successful-sync timestamp", async () => {
  const f = await fixture();
  try {
    await f.grant();
    assert.ok(await f.save());
    const before = (await f.archive.getSnapshot(f.session))!;
    await f.database.exec("reset role");
    await f.database.exec(
      "alter table fitcore_whoop.archive_records add constraint synthetic_rejection check (kind <> 'sleep')",
    );
    await f.database.exec("set role fitcore_whoop_runtime");
    const sleep = normalizeWhoopRecord("sleep", {
      user_id: 123,
      id: sleepId,
      created_at: "2026-11-23T08:00:00Z",
      updated_at: "2026-11-23T09:00:00Z",
      start: "2026-11-22T23:00:00Z",
      end: "2026-11-23T08:00:00Z",
      score_state: "SCORED",
      score: null,
    });
    await assert.rejects(f.save([record("2026-11-23T10:00:00Z", 95), sleep]), { code: "23514" });
    assert.deepEqual(await f.archive.getSnapshot(f.session), before);
  } finally {
    await f.database.close();
  }
});

test("expired sessions cannot read history and one corrupt ciphertext rejects the snapshot", async () => {
  const f = await fixture();
  try {
    await f.grant();
    assert.ok(await f.save());
    await f.database.exec("reset role");
    await f.database.exec("update fitcore_whoop.archive_records set envelope = 'v1.corrupt'");
    await f.database.exec("set role fitcore_whoop_runtime");
    await assert.rejects(f.archive.getSnapshot(f.session), /Invalid WHOOP archive envelope/);
    await f.database.exec("reset role");
    await f.database.query(
      "update fitcore_whoop.sessions set expires_at = now() - interval '1 second' where id = $1",
      [f.session.id],
    );
    await f.database.exec("set role fitcore_whoop_runtime");
    assert.equal(await f.archive.getSnapshot(f.session), null);
    assert.equal(await f.archive.revokeConsent(f.session), false);
  } finally {
    await f.database.close();
  }
});
