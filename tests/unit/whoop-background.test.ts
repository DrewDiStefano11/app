import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import { createWhoopIntegration } from "../../src/lib/whoop/integration.server";
import { resolveWhoopJarvisContext } from "../../src/lib/whoop/jarvis-context.server";
import { createWhoopStore } from "../../src/lib/whoop/postgres.server";
import { createWhoopTokenVault } from "../../src/lib/whoop/token-vault.server";

test("background routes authenticate, fence concurrent writes, and reconcile WHOOP v2 deletions", async () => {
  const db = new PGlite();
  try {
    for (const migration of [
      "001-credentials.sql",
      "002-sync.sql",
      "003-webhooks.sql",
      "004-cache.sql",
      "005-jarvis-read.sql",
    ]) {
      await db.exec(
        await readFile(new URL("../../db/whoop/" + migration, import.meta.url), "utf8"),
      );
    }
    const store = createWhoopStore(async (sql, params) => (await db.query(sql, params)).rows);
    const origin = "https://fitcore.test";
    const owner = "fitcore-owner";
    const clientSecret = "synthetic-webhook-secret";
    const cronSecret = "synthetic-secret-for-cron-only-012345";
    const encryptionKey = Buffer.alloc(32, 1).toString("base64url");
    const ownerKeyDigest = "a".repeat(64);
    const sessionToken = Buffer.alloc(32, 2).toString("base64url");
    const sessionDigest = createHmac("sha256", Buffer.from(ownerKeyDigest, "hex"))
      .update("fitcore-whoop-session:")
      .update(sessionToken)
      .digest("hex");
    const session = await store.createSession(owner, sessionDigest, 600);
    await store.beginAttempt(session, "proof", 600);
    const id = (await store.claimAttempt(session, "proof"))!;
    const pair = {
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      expiresIn: 600,
    };
    const vault = createWhoopTokenVault(encryptionKey);
    await store.saveConnection(session, id, vault.seal(owner, id, pair), pair.expiresIn);
    const at = new Date().toISOString();
    const sleepId = "123e4567-e89b-12d3-a456-426614174000";
    const workoutId = "a3b23c82-6c2c-40a4-9eed-095432b29999";
    const base = { user_id: "73", created_at: at, updated_at: at, score_state: "SCORED" };
    const recovery = { ...base, cycle_id: "12", sleep_id: sleepId, score: { recovery_score: 74 } };
    const sleep = {
      ...base,
      id: sleepId,
      start: at,
      end: at,
      nap: false,
      score: { sleep_performance_percentage: 98 },
    };
    const workout = { ...base, id: workoutId, start: at, end: at, score: { strain: 9 } };
    const normalized: WhoopSnapshot["records"] = [
      { ...recovery, id: "12", kind: "recovery", source: "whoop", calibrating: false },
      { ...sleep, kind: "sleep", source: "whoop", calibrating: false },
      { ...workout, kind: "workout", source: "whoop", calibrating: false },
    ];
    const first = (await store.claimSync(session))!;
    const earlyDeletedId = "d23e4567-e89b-12d3-a456-426614174000";
    expect(
      await store.registerWebhook({
        userId: "73",
        recordId: earlyDeletedId,
        type: "workout.deleted",
        traceId: "before-first-sync",
      }),
    ).toBeNull();
    expect(
      await store.saveSync(
        session,
        id,
        first.syncId,
        normalized,
        0,
        first.eventRevision,
        Date.now() + 60_000,
      ),
    ).toBeNull();
    await store.releaseSync(owner, id, first.syncId, 0);
    const retry = (await store.claimSync(session))!;
    const withDeleted = [...normalized, { ...normalized[2], id: earlyDeletedId }];
    expect(
      await store.saveSync(
        session,
        id,
        retry.syncId,
        withDeleted,
        0,
        retry.eventRevision,
        Date.now() + 60_000,
      ),
    ).toBeTruthy();
    expect(
      (await store.getSnapshot(session))?.records.find((row) => row.id === earlyDeletedId),
    ).toBeUndefined();
    const stale = (await store.claimSync(session))!;
    let fetched = 0;
    let regenerated = false;
    let restricted = false;
    let jarvisRead = false;
    const integration = createWhoopIntegration({
      store,
      origin,
      clientSecret,
      encryptionKey,
      ownerKeyDigest,
      clientId: "synthetic-client",
      snapshotCacheEnabled: true,
      jarvisSharingEnabled: true,
      background: { store, cronSecret },
      fetch: async (url, init) => {
        expect(new Headers(init.headers).get("Authorization")).toBe("Bearer synthetic-access");
        fetched++;
        const pathname = new URL(url).pathname;
        if (jarvisRead) {
          expect(pathname.endsWith("/workout")).toBe(false);
          expect(Date.parse(new URL(url).searchParams.get("start")!)).toBeGreaterThan(
            Date.now() - 49 * 3600000,
          );
        }
        const records = pathname.endsWith("/recovery")
          ? [recovery]
          : pathname.endsWith("/sleep")
            ? [sleep]
            : pathname.endsWith("/workout")
              ? [workout]
              : jarvisRead
                ? [{ ...base, id: 12, start: at, score: { strain: 8 } }]
                : [];
        return Response.json(
          {
            records: regenerated
              ? records.map((row) => ({
                  ...row,
                  updated_at: new Date(Date.now() + 60_000).toISOString(),
                }))
              : records,
          },
          { headers: { "Cache-Control": restricted ? "no-store" : "private, max-age=259200" } },
        );
      },
    });
    const cron = (secret: string) =>
      new Request(origin + "/api/whoop/reconcile", {
        headers: { Authorization: "Bearer " + secret },
      });
    const hook = (
      trace: string,
      type: string,
      recordId = sleepId,
      key = clientSecret,
      userId = 73,
    ) => {
      const timestamp = String(Date.now());
      const body = JSON.stringify({ user_id: userId, id: recordId, type, trace_id: trace });
      return new Request(origin + "/api/whoop/webhook", {
        method: "POST",
        body,
        headers: {
          "X-WHOOP-Signature-Timestamp": timestamp,
          "X-WHOOP-Signature": createHmac("sha256", key)
            .update(timestamp)
            .update(body)
            .digest("base64"),
        },
      });
    };
    expect((await integration.reconcile(cron("wrong-secret"))).status).toBe(401);
    expect(
      (await integration.webhook(hook("forged", "sleep.deleted", sleepId, "wrong"))).status,
    ).toBe(401);
    expect(
      (await integration.webhook(hook("unknown", "sleep.deleted", sleepId, clientSecret, 99)))
        .status,
    ).toBe(204);
    expect((await store.getSnapshot(session))?.records).toHaveLength(3);
    expect(fetched).toBe(0);

    const removeRecovery = () => hook("recovery-1", "recovery.deleted");
    expect((await integration.webhook(removeRecovery())).status).toBe(204);
    expect((await integration.webhook(removeRecovery())).status).toBe(204);
    expect((await store.getSnapshot(session))?.records.map((row) => row.kind)).toEqual([
      "sleep",
      "workout",
    ]);
    expect(
      await store.saveSync(
        session,
        id,
        stale.syncId,
        normalized,
        0,
        stale.eventRevision,
        Date.now() + 60_000,
      ),
    ).toBeNull();
    await store.releaseSync(owner, id, stale.syncId, 0);

    const waiting: Promise<unknown>[] = [];
    const removeSleep = Object.assign(hook("sleep-1", "sleep.deleted"), {
      waitUntil: (task: Promise<unknown>) => {
        waiting.push(task);
      },
    });
    expect((await integration.webhook(removeSleep)).status).toBe(204);
    expect(waiting).toHaveLength(1);
    await Promise.all(waiting);
    expect(fetched).toBe(4);
    expect((await store.getSnapshot(session))?.records.map((row) => row.kind)).toEqual(["workout"]);
    expect(
      (await db.query("select trace_id from fitcore_whoop.webhook_events order by trace_id")).rows,
    ).toEqual([
      { trace_id: "before-first-sync" },
      { trace_id: "recovery-1" },
      { trace_id: "sleep-1" },
    ]);

    await db.exec("update fitcore_whoop.connections set sync_after = null");
    await db.exec(
      "update fitcore_whoop.connections set snapshot_expires_at = now() - interval '1 second'",
    );
    expect(await store.getSnapshot(session)).toBeNull();
    await store.pruneSnapshots();
    expect((await db.query("select snapshot from fitcore_whoop.connections")).rows).toEqual([
      { snapshot: null },
    ]);
    const browser = { Origin: origin, Cookie: "__Host-fitcore-whoop-session=" + sessionToken };
    restricted = true;
    const live = await integration.sync(
      new Request(origin + "/api/whoop/sync", { method: "POST", headers: browser }),
    );
    expect(live.status).toBe(200);
    expect(live.headers.get("Cache-Control")).toBe("no-store");
    const payload = (await live.json()) as WhoopSnapshot;
    expect(payload.records.map((record) => record.kind)).toEqual(["workout"]);
    const persisted = await integration.records(
      new Request(origin + "/api/whoop/records", { headers: browser }),
    );
    expect(await persisted.json()).toBeNull();

    const jarvisRequest = () =>
      new Request(origin + "/_serverFn/jarvis", { method: "POST", headers: browser });
    const beforeJarvis = await store.getConnection(owner);
    jarvisRead = true;
    const access = await integration.jarvisSnapshot(jarvisRequest());
    const shared = await resolveWhoopJarvisContext(true, async () => access?.snapshot ?? null);
    expect(shared?.text).toContain("Daily Strain 8");
    expect(shared?.text).not.toContain("WHOOP Recovery 74%");
    expect(shared?.text).not.toContain("Sleep performance 98%");
    expect(await integration.jarvisSnapshot(jarvisRequest())).toBeNull();
    expect(await store.getSnapshot(session)).toBeNull();
    expect((await store.getConnection(owner))?.lastSyncedAt).toBe(beforeJarvis?.lastSyncedAt);
    expect(await access?.isCurrent()).toBe(true);
    expect(
      (await integration.webhook(hook("new-event", "workout.updated", workoutId))).status,
    ).toBe(204);
    expect(await access?.isCurrent()).toBe(false);
    jarvisRead = false;

    await db.exec("update fitcore_whoop.connections set sync_after = null");
    await store.deleteSession(session.id);
    restricted = false;
    const daily = await integration.reconcile(cron(cronSecret));
    expect(daily.status).toBe(204);
    expect(await daily.text()).toBe("");
    expect(fetched).toBe(15);

    const replacementSession = await store.createSession(owner, "logout-proof", 600);
    expect((await store.getSnapshot(replacementSession))?.records.map((row) => row.kind)).toEqual([
      "workout",
    ]);
    regenerated = true;
    await db.exec("update fitcore_whoop.connections set sync_after = null");
    expect((await integration.reconcile(cron(cronSecret))).status).toBe(204);
    expect((await store.getSnapshot(replacementSession))?.records.map((row) => row.kind)).toEqual([
      "recovery",
      "sleep",
      "workout",
    ]);
    const disconnected = (await store.claimDisconnect(replacementSession))!;
    expect((await db.query("select trace_id from fitcore_whoop.webhook_events")).rows).toEqual([]);
    await store.finishDisconnect(owner, id, disconnected.disconnectId);
    expect((await db.query("select trace_id from fitcore_whoop.webhook_events")).rows).toEqual([]);
    await integration.webhook(hook("late-replay", "workout.updated", workoutId));
    expect(fetched).toBe(19);
  } finally {
    await db.close();
  }
});
