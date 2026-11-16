import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";

test("Postgres isolates sessions, claims state once and atomically rotates token pairs", async () => {
  const database = new PGlite();
  try {
    for (const file of ["001-credentials.sql", "002-sync.sql", "003-webhooks.sql"]) {
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
