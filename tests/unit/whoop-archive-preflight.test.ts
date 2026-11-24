import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";

test("operator preflight safely reports missing archive schema then verifies actual restricted-role deployment", async () => {
  const database = new PGlite();
  const sql = (name: string) =>
    readFile(new URL("../../db/whoop/" + name, import.meta.url), "utf8");
  try {
    for (const file of [
      "001-credentials.sql",
      "002-sync.sql",
      "003-webhooks.sql",
      "004-cache.sql",
      "005-jarvis-read.sql",
      "operations/runtime-role.sql",
    ])
      await database.exec(await sql(file));
    const preflight = await sql("operations/archive-preflight.sql");
    const before = await database.exec(preflight);
    assert.equal(before[1].rows.length, 4);
    assert.ok(
      before[1].rows.every((row) => row.present === false && row.runtime_can_read === false),
    );
    assert.equal(before[2].rows[0].invalidation_column_present, false);
    assert.ok(before[3].rows.every((row) => row.enabled === false));
    assert.ok(before[7].rows.every((row) => row.present === false));
    assert.equal(before[8].rows[0].history_window_unbounded, false);
    await database.exec(await sql("006-owner-archive.sql"));
    await database.exec(await sql("007-history-import.sql"));
    await database.exec(await sql("operations/archive-runtime-role.sql"));
    const after = await database.exec(preflight);
    assert.ok(
      after[1].rows.every((row) => row.present && row.runtime_can_read && !row.runtime_can_delete),
    );
    for (const row of after[1].rows) {
      const writable = row.archive_table !== "archive_deletions";
      assert.equal(row.runtime_can_insert, writable);
      assert.equal(row.runtime_can_update, writable);
    }
    assert.equal(after[2].rows[0].invalidation_column_present, true);
    assert.ok(after[3].rows.every((row) => row.enabled === true));
    assert.equal(before[6].rows[0].runtime_can_receive_deletions, false);
    assert.equal(after[6].rows[0].runtime_can_receive_deletions, true);
    assert.ok(after[7].rows.every((row) => row.present === true));
    assert.equal(after[8].rows[0].history_window_unbounded, true);
    const metadata = await database.exec(await sql("operations/archive-persistence-metadata.sql"));
    assert.equal(metadata[1].rows[0].active_consents, 0);
    assert.equal(metadata[2].rows.length, 0);
    assert.equal(metadata[3].rows[0].duplicate_groups, 0);
    const role = after[4].rows[0];
    assert.equal(role.rolcanlogin, true);
    for (const flag of ["rolsuper", "rolcreatedb", "rolcreaterole", "rolbypassrls"])
      assert.equal(role[flag], false);
    // Inspection neither grants consent nor writes provider data.
    assert.equal(
      (await database.query("select count(*)::int as count from fitcore_whoop.archive_consents"))
        .rows[0].count,
      0,
    );
    assert.equal(
      (await database.query("select count(*)::int as count from fitcore_whoop.archive_records"))
        .rows[0].count,
      0,
    );
  } finally {
    await database.close();
  }
});
