import { expect, test } from "bun:test";
import { resolveWhoopJarvisContext } from "../../src/lib/whoop/jarvis-context.server";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";

const now = Date.parse("2026-11-16T10:00:00Z");
const at = "2026-11-16T08:00:00Z";
const row = {
  source: "whoop" as const,
  user_id: "123456789987",
  created_at: at,
  updated_at: at,
  score_state: "SCORED",
  calibrating: false,
};

const snapshot: WhoopSnapshot = {
  lastSyncedAt: at,
  accessExpiresAt: "2026-11-17T10:00:00Z",
  records: [
    {
      ...row,
      kind: "recovery",
      id: "7",
      cycle_id: "7",
      sleep_id: "private-sleep-id",
      score: {
        recovery_score: 0,
        hrv_rmssd_milli: 54,
        resting_heart_rate: null,
      },
    },
    {
      ...row,
      kind: "sleep",
      id: "private-sleep-id",
      cycle_id: "7",
      nap: false,
      start: at,
      end: at,
      score: {
        sleep_performance_percentage: 88,
        stage_summary: {
          total_light_sleep_time_milli: 14400000,
          total_slow_wave_sleep_time_milli: 3600000,
          total_rem_sleep_time_milli: 7200000,
        },
      },
    },
    { ...row, kind: "cycle", id: "7", start: at, score: { strain: 11.3 } },
  ],
};

test("never loads WHOOP data without explicit consent", async () => {
  let reads = 0;
  const read = async () => {
    reads++;
    return snapshot;
  };
  expect(await resolveWhoopJarvisContext(undefined, read, now)).toBeNull();
  expect(await resolveWhoopJarvisContext(false, read, now)).toBeNull();
  expect(reads).toBe(0);
});

test("consent shares only dated, observed metrics while the session is active", async () => {
  const shared = await resolveWhoopJarvisContext(true, async () => snapshot, now);
  const text = shared?.text;
  expect(text).toContain("WHOOP Recovery 0%");
  expect(text).toContain("HRV 54 ms");
  expect(text).toContain("Sleep performance 88%");
  expect(text).toContain("Time asleep 420 min");
  expect(text).toContain("Daily Strain 11.3");
  expect(text).toContain("2026-11-16 UTC");
  expect(text).not.toContain("08:00");
  expect(shared?.expiresAt).toBe(snapshot.accessExpiresAt);
  expect(text).not.toContain("123456789987");
  expect(text).not.toContain("private-sleep-id");
  expect(text).not.toContain("Resting heart rate");
});

test("expired sessions, stale snapshots and pending or calibrating records supply no metrics", async () => {
  expect(await resolveWhoopJarvisContext(true, async () => null, now)).toBeNull();
  expect(
    await resolveWhoopJarvisContext(
      true,
      async () => ({
        ...snapshot,
        accessExpiresAt: at,
      }),
      now,
    ),
  ).toBeNull();
  expect(
    await resolveWhoopJarvisContext(
      true,
      async () => ({
        ...snapshot,
        lastSyncedAt: "2026-11-10T08:00:00Z",
      }),
      now,
    ),
  ).toBeNull();
  expect(
    await resolveWhoopJarvisContext(
      true,
      async () => ({
        ...snapshot,
        records: snapshot.records.map((record) => ({
          ...record,
          calibrating: true,
          score_state: "PENDING_SCORE",
        })),
      }),
      now,
    ),
  ).toBeNull();
});
