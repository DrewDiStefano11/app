import { expect, test } from "bun:test";
import { defaultState } from "../../src/lib/types";
import { calculatePersonalScores, readinessHistory } from "../../src/lib/analytics/personal-scores";
import { selectSleepEvidence } from "../../src/lib/whoop/evidence";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import { momentumScore } from "../../src/lib/analytics";

const now = Date.parse("2026-11-19T15:00:00Z");
const at = "2026-11-19T12:00:00Z";
const snapshot: WhoopSnapshot = {
  lastSyncedAt: new Date(now).toISOString(),
  accessExpiresAt: new Date(now + 120000).toISOString(),
  records: [
    {
      kind: "recovery",
      source: "whoop",
      id: "11",
      cycle_id: "11",
      user_id: "7",
      created_at: at,
      updated_at: at,
      score_state: "SCORED",
      calibrating: false,
      score: { recovery_score: 80, hrv_rmssd_milli: 56.45, resting_heart_rate: 51 },
    },
  ],
};
const checked = {
  ...defaultState,
  recoveryCheckIns: [
    { id: "manual", energy: 7, motivation: 7, soreness: 3, stress: 3, createdAt: now - 60000 },
  ],
  sleepEntries: [{ id: "sleep", hours: 1, quality: 1, createdAt: now - 30000 }],
};

test("native recovery uses the original measurement and readiness combines independent subjective evidence without double counting sleep", () => {
  const scores = calculatePersonalScores(checked, now, snapshot);
  expect(scores.recovery.value).toBe(80);
  expect(scores.recovery.measurement?.source).toBe("whoop");
  expect(scores.readiness.value).toBe(79); // check-in=75, .7*80+.3*75=78.5 -> 79
  expect(scores.readiness.evidence.map((row) => row.label)).toEqual([
    "WHOOP Recovery",
    "Recovery check-ins",
  ]);
  const changedSleep = {
    ...checked,
    sleepEntries: [{ ...checked.sleepEntries[0], hours: 10, quality: 10 }],
  };
  expect(calculatePersonalScores(changedSleep, now, snapshot).readiness).toEqual(scores.readiness);
  expect(scores.fitcore.value).toBeNull(); // no invented training/nutrition/progress
  expect(calculatePersonalScores(defaultState, now, snapshot).readiness.value).toBeNull();
});

test("pending, calibrating, missing, future and expired WHOOP evidence never becomes a measured score", () => {
  for (const record of [
    { ...snapshot.records[0], score_state: "PENDING_SCORE" },
    { ...snapshot.records[0], calibrating: true },
    { ...snapshot.records[0], score: null },
  ]) {
    const scores = calculatePersonalScores(checked, now, { ...snapshot, records: [record] });
    expect(scores.recovery.value).toBeNull();
    expect(scores.readiness.value).toBeNull();
  }
  const expired = { ...snapshot, accessExpiresAt: new Date(now).toISOString() };
  expect(calculatePersonalScores(checked, now, expired)).toEqual(
    calculatePersonalScores(checked, now),
  );
  const future = { ...snapshot, lastSyncedAt: new Date(now + 1).toISOString() };
  expect(calculatePersonalScores(checked, now, future)).toEqual(
    calculatePersonalScores(checked, now),
  );
});

test("one eligible sleep per local wake-night selects corrected WHOOP duration, excludes naps, and preserves manual fallback", () => {
  const sleep = {
    kind: "sleep" as const,
    source: "whoop" as const,
    id: "main",
    user_id: "7",
    created_at: at,
    updated_at: at,
    start: "2026-11-19T03:00:00Z",
    end: at,
    timezone_offset: "-05:00",
    nap: false,
    score_state: "SCORED",
    calibrating: false,
    score: {
      sleep_performance_percentage: 91,
      stage_summary: {
        total_light_sleep_time_milli: 4 * 3600000,
        total_slow_wave_sleep_time_milli: 3600000,
        total_rem_sleep_time_milli: 2 * 3600000,
        total_awake_time_milli: 600000,
        total_no_data_time_milli: 0,
      },
    },
  };
  const manual = {
    ...checked,
    sleepEntries: [
      ...checked.sleepEntries,
      { id: "previous", hours: 9, quality: 8, createdAt: now - 86400000 },
    ],
  };
  const records = [
    sleep,
    {
      ...sleep,
      score: {
        ...sleep.score,
        stage_summary: { ...sleep.score.stage_summary, total_light_sleep_time_milli: 3 * 3600000 },
      },
      updated_at: "2026-11-19T12:05:00Z",
    },
    { ...sleep, id: "nap", nap: true },
  ];
  const result = selectSleepEvidence(manual, { ...snapshot, records }, now);
  expect(result.nights).toHaveLength(2);
  expect(result.last?.source).toBe("whoop");
  expect(result.last?.hours).toBe(6);
  expect(result.last?.quality).toBeNull();
  expect(result.averageHours).toBe(7.5);
  expect(result.manualQuality).toBe(4.5);
  expect(manual.sleepEntries).toHaveLength(2);
  const unfinished = selectSleepEvidence(
    manual,
    { ...snapshot, records: [{ ...sleep, end: null }] },
    now,
  );
  expect(unfinished.last?.source).toBe("manual");
  const expired = selectSleepEvidence(
    manual,
    { ...snapshot, records, accessExpiresAt: new Date(now).toISOString() },
    now,
  );
  expect(expired.last?.source).toBe("manual");
});

test("overall FitCore Score uses the same WHOOP recovery driver without filling missing domains", () => {
  const state = structuredClone(checked);
  state.profile = { ...state.profile, daysPerWeek: 3 };
  state.workouts = [1, 4, 6].map((days, index) => ({
    id: String(days),
    name: "Synthetic lift",
    startedAt: now - days * 86400000 - 3600000,
    endedAt: now - days * 86400000,
    exercises: [
      {
        id: String(days),
        exerciseId: "squat",
        completed: true,
        sets: [{ id: String(days), completed: true, weight: index === 0 ? 105 : 100, reps: 5 }],
      },
    ],
  }));
  state.nutritionTargets = { calories: 3000, protein: 180, carbs: 0, fat: 0 };
  state.mealEntries = [1, 2, 3].flatMap((days) =>
    ["breakfast", "lunch", "dinner"].map((type) => ({
      id: String(days) + type,
      name: type,
      type,
      createdAt: now - days * 86400000,
      calories: 1000,
      protein: 60,
      carbs: 0,
      fat: 0,
    })),
  );
  const scores = calculatePersonalScores(state, now, snapshot);
  expect([
    scores.training.value,
    scores.nutrition.value,
    scores.recovery.value,
    scores.progress.value,
  ]).toEqual([100, 100, 80, 70]);
  expect(scores.fitcore.value).toBe(91);
  expect(
    momentumScore(state, now, snapshot).factors.find((row) => row.id === "recovery")?.score,
  ).toBe(80);
  expect(scores.fitcore.evidence.some((row) => row.label === "WHOOP Recovery")).toBe(true);
  state.mealEntries = [];
  expect(calculatePersonalScores(state, now, snapshot).fitcore.value).toBeNull();
});

test("a recorded zero sleep duration remains an observation rather than a missing night", () => {
  const zero = { ...checked, sleepEntries: [{ ...checked.sleepEntries[0], hours: 0 }] };
  expect(selectSleepEvidence(zero, null, now).last?.hours).toBe(0);
});

test("last sleep retains older dated records while the weekly average excludes them", () => {
  const state = {
    ...checked,
    sleepEntries: [{ ...checked.sleepEntries[0], createdAt: now - 8 * 86400000, hours: 8 }],
  };
  const result = selectSleepEvidence(state, null, now);
  expect(result.last?.hours).toBe(8);
  expect(result.averageHours).toBeNull();
  expect(result.nights).toHaveLength(0);
});

test("WHOOP never combines with fabricated demo records", () => {
  const demo = { ...checked, demoMode: true };
  expect(calculatePersonalScores(demo, now, snapshot)).toEqual(calculatePersonalScores(demo, now));
});

test("the current Readiness history endpoint shares the headline's 48-hour evidence window", () => {
  const state = {
    ...checked,
    recoveryCheckIns: [
      { ...checked.recoveryCheckIns[0], createdAt: new Date(2026, 10, 18, 22).getTime() },
    ],
  };
  const scores = calculatePersonalScores(state, now, snapshot);
  expect(readinessHistory(state, now, snapshot).at(-1)?.value).toBe(scores.readiness.value);
  const yesterday = {
    ...snapshot,
    records: snapshot.records.map((row) => ({
      ...row,
      created_at: new Date(now - 24 * 3600000).toISOString(),
      updated_at: new Date(now - 24 * 3600000).toISOString(),
    })),
  };
  expect(readinessHistory(checked, now, yesterday).at(-1)?.value).toBe(
    calculatePersonalScores(checked, now, yesterday).readiness.value,
  );
});

test("weekly sleep uses local calendar nights, excludes future/unconfirmed entries, and deduplicates manual IDs", () => {
  const localNow = new Date(2026, 10, 8, 12).getTime();
  const entry = (id: string, at: number, hours: number) => ({
    id,
    createdAt: at,
    hours,
    quality: 8,
  });
  const state = {
    ...checked,
    sleepEntries: [
      entry("outside", new Date(2026, 10, 1, 23, 59).getTime(), 1),
      entry("inside", new Date(2026, 10, 2, 6).getTime(), 7),
      entry("inside", new Date(2026, 10, 2, 7).getTime(), 8),
      entry("future", localNow + 1, 4),
      {
        ...entry("unconfirmed", localNow - 1, 5),
        provenance: {
          source: "manual" as const,
          confidence: "high" as const,
          confirmation: "unconfirmed" as const,
        },
      },
    ],
  };
  const result = selectSleepEvidence(state, null, localNow);
  expect(result.history[0].date).toBe("2026-11-02");
  expect(result.nights.map((row) => row.hours)).toEqual([8]);
  expect(result.averageHours).toBe(8);
  expect(state.sleepEntries).toHaveLength(5);
});
