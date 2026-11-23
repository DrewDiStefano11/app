import { expect, test } from "bun:test";
import { recordedCorrelation } from "../../src/lib/analytics/recorded-correlation";
import { defaultState, type AppState } from "../../src/lib/types";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import { addCalendarDays } from "../../src/lib/analytics/date-time";

const now = new Date(2026, 10, 23, 12).getTime();
const timestamp = (ago: number) => addCalendarDays(now, -ago) + 9 * 3600000;
function paired(count = 6, offset = 0): AppState {
  return {
    ...structuredClone(defaultState),
    mealEntries: Array.from({ length: count }, (_, i) => ({
      id: `meal-${i}`,
      name: "Recorded meal",
      type: "lunch",
      createdAt: timestamp(i + offset),
      calories: 1000 + 100 * i,
      protein: 40 + 5 * i,
      carbs: 100,
      fat: 30,
    })),
    bodyweightEntries: Array.from({ length: count }, (_, i) => ({
      id: `weight-${i}`,
      createdAt: timestamp(i + offset),
      weightLb: 150 + i,
    })),
  };
}

test("recorded correlation reuses Pearson with exact paired days and honors 14/30/90-day windows", () => {
  const state = paired(6, 20);
  const before = JSON.stringify(state);
  expect(recordedCorrelation(state, "calories", "weight", 14, null, now).result.sampleSize).toBe(0);
  const result = recordedCorrelation(state, "calories", "weight", 30, null, now);
  expect(result.result).toMatchObject({
    status: "ready",
    coefficient: 1,
    direction: "positive",
    strength: "strong",
    sampleSize: 6,
    minimumSampleSize: 5,
  });
  expect(result.pairs).toHaveLength(6);
  expect(recordedCorrelation(state, "calories", "weight", 90, null, now).result.coefficient).toBe(
    1,
  );
  expect(JSON.stringify(state)).toBe(before);
});

test("only actual overlapping days count, including recorded zero; constant data is unavailable", () => {
  const state = paired();
  state.mealEntries[0].calories = 0;
  state.bodyweightEntries = state.bodyweightEntries.slice(0, 2);
  const sparse = recordedCorrelation(state, "calories", "weight", 30, null, now);
  expect(sparse.result).toMatchObject({
    status: "needs_more_data",
    sampleSize: 2,
    coefficient: null,
  });
  expect(sparse.pairs.some((pair) => pair.x === 0)).toBe(true);
  const constant = paired();
  constant.bodyweightEntries.forEach((entry) => {
    entry.weightLb = 180;
  });
  expect(recordedCorrelation(constant, "calories", "weight", 30, null, now).result).toMatchObject({
    status: "unavailable",
    coefficient: null,
    sampleSize: 6,
  });
});

test("daily meals sum, last same-day weigh-in wins, future and unconfirmed values are excluded", () => {
  const state = paired();
  state.mealEntries.push({ ...state.mealEntries[0], id: "extra", calories: 500 });
  state.bodyweightEntries.push({
    ...state.bodyweightEntries[0],
    id: "later",
    createdAt: timestamp(0) + 3600000,
    weightLb: 160,
  });
  state.bodyweightEntries.push({ id: "future", createdAt: now + 1, weightLb: 999 });
  state.mealEntries.push({
    ...state.mealEntries[0],
    id: "unconfirmed",
    calories: 90000,
    provenance: { source: "manual", confirmation: "unconfirmed" },
  });
  const today = recordedCorrelation(state, "calories", "weight", 30, null, now).pairs.at(-1)!;
  expect(today.x).toBe(1500);
  expect(today.y).toBe(160);
  expect(
    recordedCorrelation({ ...state, bodyweightEntries: [] }, "calories", "weight", 30, null, now)
      .result.sampleSize,
  ).toBe(0);
});

test("a day with unreported macros is omitted for protein without discarding known calories", () => {
  const state = paired(5);
  state.mealEntries.push({
    id: "unknown",
    name: "Unknown protein",
    type: "snack",
    createdAt: timestamp(0),
    calories: 100,
    macroStatus: "unreported",
  });
  expect(recordedCorrelation(state, "protein", "weight", 30, null, now).result.sampleSize).toBe(4);
  expect(recordedCorrelation(state, "calories", "weight", 30, null, now).result.sampleSize).toBe(5);
});

test("sleep correlations use the full selected history beyond seven days, without inventing missing nights", () => {
  const state = paired(6, 20);
  state.sleepEntries = state.bodyweightEntries.map((entry, i) => ({
    id: `sleep-${i}`,
    createdAt: entry.createdAt,
    hours: 9 - i / 2,
    quality: 0,
  }));
  const result = recordedCorrelation(state, "sleep", "weight", 90, null, now);
  expect(result.result).toMatchObject({
    status: "ready",
    coefficient: -1,
    direction: "negative",
    sampleSize: 6,
  });
  state.sleepEntries.pop();
  expect(recordedCorrelation(state, "sleep", "weight", 90, null, now).result.sampleSize).toBe(5);
});

test("HRV uses only authorized scored WHOOP observations and never writes them to AppState", () => {
  const state = paired();
  const records = state.bodyweightEntries.map((entry, i) => ({
    id: `recovery-${i}`,
    cycle_id: `cycle-${i}`,
    kind: "recovery" as const,
    source: "whoop" as const,
    user_id: "1",
    created_at: new Date(entry.createdAt).toISOString(),
    updated_at: new Date(entry.createdAt).toISOString(),
    score_state: "SCORED",
    calibrating: false,
    score: { hrv_rmssd_milli: 40 + i, recovery_score: 70 },
  }));
  const snapshot: WhoopSnapshot = {
    records,
    lastSyncedAt: new Date(now).toISOString(),
    accessExpiresAt: new Date(now + 1000).toISOString(),
  };
  const before = JSON.stringify(state);
  expect(recordedCorrelation(state, "hrv", "weight", 30, snapshot, now).result.sampleSize).toBe(6);
  expect(
    recordedCorrelation(state, "hrv", "weight", 30, snapshot, now + 1000).result.sampleSize,
  ).toBe(0);
  expect(
    recordedCorrelation({ ...state, demoMode: true }, "hrv", "weight", 30, snapshot, now).result
      .sampleSize,
  ).toBe(0);
  expect(JSON.stringify(state)).toBe(before);
});

test("comparing a metric with itself cannot present a tautological perfect association", () => {
  const result = recordedCorrelation(paired(), "volume", "volume", 30, null, now);
  expect(result.result.status).toBe("unavailable");
  expect(result.result.coefficient).toBeNull();
  expect(result.result.reason).toContain("different metrics");
});

test("readiness and training-volume choices derive from their recorded inputs rather than placeholder performance scores", () => {
  const state = paired();
  state.recoveryCheckIns = state.bodyweightEntries.map((entry, i) => ({
    id: `check-${i}`,
    createdAt: entry.createdAt,
    energy: 3 + i,
    motivation: 6,
    stress: 3,
    soreness: 8 - i,
  }));
  state.workouts = state.bodyweightEntries.map((entry, i) => ({
    id: `workout-${i}`,
    name: "Recorded",
    startedAt: entry.createdAt - 3600000,
    endedAt: entry.createdAt,
    exercises: [
      {
        id: `exercise-${i}`,
        exerciseId: "bench-press",
        completed: true,
        sets: [{ id: `set-${i}`, completed: true, weight: 100 + 10 * i, reps: 5 }],
      },
    ],
  }));
  expect(recordedCorrelation(state, "protein", "readiness", 30, null, now).result).toMatchObject({
    status: "ready",
    coefficient: 1,
    sampleSize: 6,
  });
  expect(recordedCorrelation(state, "soreness", "volume", 30, null, now).result).toMatchObject({
    status: "ready",
    coefficient: -1,
    sampleSize: 6,
  });
});
