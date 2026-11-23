import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";

test("the production runtime role can sync and delete but cannot change schemas or read unrelated data", async () => {
  const database = new PGlite();
  try {
    for (const file of [
      "001-credentials.sql",
      "002-sync.sql",
      "003-webhooks.sql",
      "004-cache.sql",
      "005-jarvis-read.sql",
    ]) {
      await database.exec(
        await readFile(new URL("../../db/whoop/" + file, import.meta.url), "utf8"),
      );
    }
    await database.exec(
      "create schema unrelated; create table unrelated.private_data (id integer)",
    );
    await database.exec(
      await readFile(
        new URL("../../db/whoop/operations/runtime-role.sql", import.meta.url),
        "utf8",
      ),
    );
    await database.exec("set role fitcore_whoop_runtime");
    const store = createWhoopStore(async (statement, parameters) => {
      return (await database.query(statement, parameters)).rows;
    });
    const session = await store.createSession("synthetic-owner", "synthetic-digest", 60);
    const other = await store.createSession("other-owner", "other-digest", 60);
    const expired = await store.createSession("expired-owner", "expired-digest", -1);
    assert.equal(await store.beginAttempt(session, "proof", 60), true);
    assert.equal(await store.claimAttempt(other, "proof"), null);
    const attempt = (await store.claimAttempt(session, "proof"))!;
    assert.equal(await store.saveConnection(session, attempt, "encrypted-synthetic", 3600), true);
    const claim = (await store.claimSync(session))!;
    // saveSync reads webhook_events even during the live-only first release.
    assert.ok(await store.saveSync(session, claim.id, claim.syncId, [], 0, claim.eventRevision, 0));
    assert.equal(await store.getSnapshot(session), null);
    const cachedClaim = (await store.claimSync(session))!;
    assert.ok(
      await store.saveSync(
        session,
        cachedClaim.id,
        cachedClaim.syncId,
        [],
        0,
        cachedClaim.eventRevision,
        Date.now() + 120000,
      ),
    );
    const authorizedSnapshot = (await store.getSnapshot(session))!;
    assert.equal(authorizedSnapshot.version, `${cachedClaim.id}:${cachedClaim.eventRevision}`);
    assert.ok(Date.parse(authorizedSnapshot.accessExpiresAt) <= Date.now() + 61000);
    assert.equal(await store.getSnapshot(other), null);
    assert.equal(await store.claimSync({ ...other, ownerId: session.ownerId }), null);
    assert.equal(await store.getSession("expired-digest"), null);
    assert.equal(await store.beginAttempt(expired, "expired-proof", 60), false);
    for (const statement of [
      "create schema forbidden",
      "create table fitcore_whoop.forbidden (id integer)",
      "create table public.forbidden (id integer)",
      "create temporary table forbidden (id integer)",
      "alter table fitcore_whoop.sessions add column forbidden integer",
      "drop table fitcore_whoop.webhook_events",
      "select * from unrelated.private_data",
      "update fitcore_whoop.sessions set expires_at = now()",
      "update fitcore_whoop.webhook_events set trace_id = 'changed'",
      "insert into fitcore_whoop.webhook_events default values",
    ]) {
      await assert.rejects(database.exec(statement), { code: "42501" });
    }
    const pending = (await store.claimDisconnect(session))!;
    assert.equal(
      await store.finishDisconnect(session.ownerId, pending.id, pending.disconnectId),
      true,
    );
    assert.equal(await store.getConnection(session.ownerId), null);
    await store.deleteSession(session.id);
    assert.equal(await store.getSession("synthetic-digest"), null);
  } finally {
    await database.close();
  }
});

test("Postgres isolates sessions, claims state once and atomically rotates token pairs", async () => {
  const database = new PGlite();
  try {
    for (const file of [
      "001-credentials.sql",
      "002-sync.sql",
      "003-webhooks.sql",
      "004-cache.sql",
      "005-jarvis-read.sql",
    ]) {
      const migration = new URL("../../db/whoop/" + file, import.meta.url);
      await database.exec(await readFile(migration, "utf8"));
    }
    const store = createWhoopStore(async (statement, parameters) => {
      const result = await database.query(statement, parameters);
      return result.rows;
    });
    const owner = "synthetic-owner";
    const session = await store.createSession(owner, "digest-a", 60);
    const other = await store.createSession("other-owner", "digest-b", 60);
    assert.deepEqual(await store.getSession("digest-a"), session);
    assert.equal(await store.getSession("no-session"), null);

    assert.equal(await store.beginAttempt(session, "synthetic-proof", 60), true);
    assert.equal(await store.claimAttempt(other, "synthetic-proof"), null);
    assert.equal(await store.claimAttempt(session, "wrong-proof"), null);
    const claims = await Promise.all([
      store.claimAttempt(session, "synthetic-proof"),
      store.claimAttempt(session, "synthetic-proof"),
    ]);
    const successful = claims.filter(Boolean);
    assert.equal(successful.length, 1);
    const attemptId = successful[0]!;
    assert.equal(await store.cancelPendingAttempt(owner), false);
    assert.equal(await store.saveConnection(other, attemptId, "synthetic-encrypted", 3600), false);
    assert.equal(await store.saveConnection(session, attemptId, "synthetic-encrypted", 3600), true);
    assert.equal(await store.saveConnection(session, attemptId, "duplicate", 3600), false);
    assert.equal(await store.beginAttempt(session, "replacement", 60), false);
    assert.equal(await store.getConnection("other-owner"), null);

    const connection = await store.getConnection(owner);
    assert.equal(connection?.envelope, "synthetic-encrypted");
    const refreshes = await Promise.all([
      store.claimRefresh(owner, connection!.id, connection!.revision),
      store.claimRefresh(owner, connection!.id, connection!.revision),
    ]);
    const refresh = refreshes.filter(Boolean);
    assert.equal(refresh.length, 1);
    assert.equal(
      await store.saveRefresh(owner, connection!.id, refresh[0]!, "rotated-encrypted", 3600),
      true,
    );
    assert.equal(
      await store.saveRefresh(owner, connection!.id, refresh[0]!, "stale-encrypted", 3600),
      false,
    );
    assert.equal((await store.getConnection(owner))?.envelope, "rotated-encrypted");
    assert.equal(await store.claimRefresh(owner, connection!.id, connection!.revision), null);
    assert.equal(await store.beginAttempt(other, "other-proof", 60), true);
    await store.deleteSession(other.id);
    assert.equal(await store.getSession("digest-b"), null);
    assert.equal(await store.claimAttempt(other, "other-proof"), null);
    const pending = await store.claimDisconnect(session);
    assert.ok(pending);
    assert.equal(await store.claimDisconnect(session), null);
    assert.equal(await store.claimDisconnectRefresh(owner, pending.id, pending.disconnectId), true);
    assert.equal(
      await store.claimDisconnectRefresh(owner, pending.id, pending.disconnectId),
      false,
    );
    assert.equal(
      await store.saveDisconnectRefresh(
        owner,
        pending.id,
        pending.disconnectId,
        "revoke-encrypted",
        3600,
      ),
      true,
    );
    assert.equal((await store.getConnection(owner))?.envelope, "revoke-encrypted");
    assert.equal(await store.beginAttempt(session, "while-disconnecting", 60), false);
    assert.equal(await store.finishDisconnect(owner, pending.id, crypto.randomUUID()), false);
    assert.equal(await store.finishDisconnect(owner, pending.id, pending.disconnectId), true);
    assert.equal(await store.getConnection(owner), null);
    assert.equal(await store.beginAttempt(session, "new-connection", 60), true);
    const newAttempt = await store.claimAttempt(session, "new-connection");
    assert.ok(newAttempt);
    await store.discardAttempt(session, newAttempt);
    assert.equal(await store.beginAttempt(session, "replacement-after-failure", 60), true);
    assert.equal(await store.cancelPendingAttempt(owner), true);
    assert.equal(await store.claimAttempt(session, "replacement-after-failure"), null);
  } finally {
    await database.close();
  }
});
