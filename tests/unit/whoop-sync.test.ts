import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";
import { createWhoopTokenVault } from "../../src/lib/whoop/token-vault.server";
import { syncWhoop } from "../../src/lib/whoop/sync.server";

test("rotates credentials once and atomically reconciles corrections and deletions", async () => {
  const db = new PGlite();
  try {
    for (const migration of ["001-credentials.sql", "002-sync.sql"]) {
      await db.exec(
        await readFile(new URL("../../db/whoop/" + migration, import.meta.url), "utf8"),
      );
    }
    const store = createWhoopStore(async (sql, params) => (await db.query(sql, params)).rows);
    const owner = "synthetic-owner";
    const session = await store.createSession(owner, "synthetic-digest", 600);
    const other = await store.createSession("other-owner", "other-digest", 600);
    await store.beginAttempt(session, "synthetic-proof", 600);
    const connection = (await store.claimAttempt(session, "synthetic-proof"))!;
    const vault = createWhoopTokenVault(Buffer.alloc(32, 5).toString("base64url"));
    await store.saveConnection(
      session,
      connection,
      vault.seal(owner, connection, { accessToken: "old", refreshToken: "once", expiresIn: 1 }),
      0,
    );
    let rotations = 0;
    let mode: "initial" | "interrupted" | "corrected" = "initial";
    const options = {
      store,
      vault,
      refresh: async (token: string) => {
        expect(token).toBe("once");
        rotations++;
        return { accessToken: "new", refreshToken: "next", expiresIn: 300 };
      },
      fetch: async (url: URL, options: RequestInit) => {
        expect(new Headers(options.headers).get("Authorization")).toBe("Bearer new");
        if (mode === "interrupted" && url.pathname.endsWith("/workout")) {
          return new Response(null, { status: 429, headers: { "Retry-After": "120" } });
        }
        const recovery = {
          user_id: 7,
          cycle_id: 11,
          created_at: "2026-11-16T06:00:00Z",
          updated_at: "2026-11-16T06:00:00Z",
          score_state: "SCORED",
          score: { recovery_score: mode === "corrected" ? 80 : 72 },
        };
        const records = url.pathname.endsWith("/recovery")
          ? mode === "corrected"
            ? [recovery]
            : [recovery, { ...recovery, cycle_id: 12 }]
          : [];
        return Response.json({ records });
      },
    };
    const first = await Promise.all([syncWhoop(session, options), syncWhoop(session, options)]);
    expect(first.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(rotations).toBe(1);
    const persisted = (await store.getConnection(owner))!;
    expect(vault.open(owner, connection, persisted.envelope!).refreshToken).toBe("next");
    expect(await store.getSnapshot(other)).toBeNull();
    const firstSnapshot = await store.getSnapshot(session);
    expect(firstSnapshot?.records).toHaveLength(2);

    const clearCooldown = () => db.exec("update fitcore_whoop.connections set sync_after = null");
    await clearCooldown();
    mode = "interrupted";
    expect(await syncWhoop(session, options)).toEqual({ status: 429, retryAfterSeconds: 120 });
    expect(await store.getSnapshot(session)).toEqual(firstSnapshot);
    expect((await syncWhoop(session, options)).status).toBe(409);

    await clearCooldown();
    mode = "corrected";
    expect((await syncWhoop(session, options)).status).toBe(200);
    expect((await store.getSnapshot(session))?.records).toMatchObject([
      { id: "11", score: { recovery_score: 80 } },
    ]);
    const started = await store.claimSync(session);
    expect(started).toBeNull();
    await clearCooldown();
    const late = (await store.claimSync(session))!;
    expect(await store.claimRefresh(owner, late.id, late.revision, late.syncId)).toBeTruthy();
    await db.exec(
      "update fitcore_whoop.connections set refresh_started_at = now() - interval '46 seconds'",
    );
    const removing = (await store.claimDisconnect(session))!;
    expect(await store.claimDisconnectRefresh(owner, removing.id, removing.disconnectId)).toBe(
      false,
    );
    expect(await store.getSnapshot(session)).toBeNull();
    expect(await store.saveSync(session, late.id, late.syncId, [], 60)).toBe(false);
    await store.finishDisconnect(owner, removing.id, removing.disconnectId);
    expect(await store.getSnapshot(session)).toBeNull();

    await store.beginAttempt(session, "replacement-proof", 600);
    const replacement = (await store.claimAttempt(session, "replacement-proof"))!;
    await store.saveConnection(session, replacement, "undecodable-envelope", 300);
    expect((await syncWhoop(session, options)).status).toBe(403);
    expect((await store.getConnection(owner))?.status).toBe("reconnect_required");
  } finally {
    await db.close();
  }
});
