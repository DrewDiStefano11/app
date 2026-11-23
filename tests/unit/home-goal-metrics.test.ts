import { expect, test } from "bun:test";
import { homeGoalMetrics, withVolumeGoal } from "../../src/lib/home-goal-metrics";
import { defaultState, type Workout } from "../../src/lib/types";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import { last7DaysWindow, addCalendarDays, startOfDay } from "../../src/lib/analytics/date-time";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";
import { inspectFitCoreImport } from "../../src/lib/data-import-inspection";
import {
  createFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
  readCanonicalFitCoreBackupEnvelope,
} from "../../src/lib/data-backup";

const now = new Date(2026, 10, 23, 12).getTime();
const at = new Date(now - 3600000).toISOString();
const cycle = (steps: number | null, timestamp = at): WhoopSnapshot => ({
  lastSyncedAt: new Date(now).toISOString(),
  accessExpiresAt: new Date(now + 120000).toISOString(),
  records: [
    {
      id: "cycle",
      kind: "cycle",
      source: "whoop",
      user_id: "1",
      start: timestamp,
      created_at: timestamp,
      updated_at: at,
      score_state: "SCORED",
      calibrating: false,
      step_count: steps,
      score: { strain: 5 },
    },
  ],
});

test("Goals use authorized steps for today and distinguish missing measurements from recorded zero", () => {
  expect(homeGoalMetrics(defaultState, null, now).steps).toBeNull();
  expect(homeGoalMetrics(defaultState, cycle(null), now).steps).toBeNull();
  expect(homeGoalMetrics(defaultState, cycle(8234), now).steps).toBe(8234);
  expect(homeGoalMetrics(defaultState, cycle(0), now).steps).toBe(0);
  expect(
    homeGoalMetrics(
      defaultState,
      cycle(9000, new Date(addCalendarDays(now, -1)).toISOString()),
      now,
    ).steps,
  ).toBeNull();
  expect(
    homeGoalMetrics(defaultState, cycle(9000, new Date(now + 1).toISOString()), now).steps,
  ).toBeNull();
  expect(homeGoalMetrics(defaultState, cycle(8234), now + 120000).steps).toBeNull();
  expect(homeGoalMetrics({ ...defaultState, demoMode: true }, cycle(8234), now).steps).toBeNull();
});

test("corrected provider cycles use the latest revision and never write WHOOP into state", () => {
  const snapshot = cycle(1000);
  snapshot.records.push({
    ...snapshot.records[0],
    step_count: 5000,
    updated_at: new Date(now).toISOString(),
  });
  const state = structuredClone(defaultState);
  const before = JSON.stringify(state);
  expect(homeGoalMetrics(state, snapshot, now).steps).toBe(5000);
  expect(JSON.stringify(state)).toBe(before);
  expect(JSON.stringify(state)).not.toContain("step_count");
});

const workout = (id: string, startedAt: number): Workout => ({
  id,
  name: "Recorded session",
  startedAt,
  exercises: [
    {
      id: id + "-exercise",
      exerciseId: "bench-press",
      completed: true,
      sets: [
        { id: id + "-done", weight: 100, reps: 10, completed: true },
        { id: id + "-planned", weight: 999, reps: 99, completed: false },
      ],
    },
  ],
});

test("training volume counts completed sets in the local seven-day window with no invented target", () => {
  const start = last7DaysWindow(now).start;
  const state = {
    ...defaultState,
    workouts: [
      workout("boundary", start),
      workout("today", now),
      workout("old", start - 1),
      workout("future", now + 1),
    ],
  };
  const metrics = homeGoalMetrics(state, null, now);
  expect(metrics.weeklyWorkouts).toBe(2);
  expect(metrics.volumeLb).toBe(2000);
  expect(metrics.volumeTargetLb).toBeNull();
  expect(homeGoalMetrics(withVolumeGoal(state, 4000), null, now).volumeTargetLb).toBe(4000);
});

test("user volume targets validate, survive backup inspection and can be cleared without changing other records", () => {
  const state = structuredClone(defaultState);
  const saved = withVolumeGoal(state, 4000);
  expect(saved.profile.weeklyVolumeGoalLb).toBe(4000);
  expect(state.profile.weeklyVolumeGoalLb).toBeUndefined();
  expect(validateFitCoreDataIntegrity(saved).status).toBe("valid");
  const restored = JSON.parse(JSON.stringify(saved));
  expect(validateFitCoreDataIntegrity(restored).status).toBe("valid");
  expect(inspectFitCoreImport(JSON.stringify(saved)).status).toBe("eligible");
  const backup = createFitCoreBackupEnvelope(saved, { exportedAt: new Date(now).toISOString() });
  expect(backup.safeToExport).toBe(true);
  const serialized = serializeFitCoreBackupEnvelope(backup.envelope);
  expect(serialized.status).toBe("serialized");
  const backupRead = readCanonicalFitCoreBackupEnvelope(serialized.json!);
  expect(backupRead.status).toBe("valid");
  expect((backupRead.envelope!.payload.profile as Record<string, unknown>).weeklyVolumeGoalLb).toBe(
    4000,
  );
  const cleared = withVolumeGoal(saved, null);
  expect(Object.hasOwn(cleared.profile, "weeklyVolumeGoalLb")).toBe(false);
  expect(cleared.workouts).toBe(saved.workouts);
  expect(validateFitCoreDataIntegrity(cleared).status).toBe("valid");
  for (const invalid of [-1, 0, NaN, Infinity]) {
    expect(withVolumeGoal(state, invalid)).toBe(state);
    expect(
      validateFitCoreDataIntegrity({
        ...state,
        profile: { ...state.profile, weeklyVolumeGoalLb: invalid },
      }).status,
    ).toBe("invalid");
  }
});

test("missing and stale sleep are unavailable, while a recorded zero remains a measurement", () => {
  expect(homeGoalMetrics(defaultState, null, now).sleepHours).toBeNull();
  const stale = {
    ...defaultState,
    sleepEntries: [{ id: "stale", createdAt: now - 49 * 3600000, hours: 8, quality: 0 }],
  };
  expect(homeGoalMetrics(stale, null, now).sleepHours).toBeNull();
  const measuredZero = {
    ...defaultState,
    sleepEntries: [{ id: "zero", createdAt: startOfDay(now), hours: 0, quality: 0 }],
  };
  expect(homeGoalMetrics(measuredZero, null, now).sleepHours).toBe(0);
});

test("protein goals do not treat calorie-only meals as zero protein", () => {
  const state = {
    ...defaultState,
    mealEntries: [
      {
        id: "meal",
        createdAt: now,
        name: "Calorie-only meal",
        type: "meal" as const,
        calories: 500,
        macroStatus: "unreported" as const,
      },
    ],
  };
  expect(homeGoalMetrics(state, null, now).protein).toBeNull();
  expect(homeGoalMetrics(state, null, now).calories).toBe(500);
});
