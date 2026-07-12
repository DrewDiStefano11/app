import assert from "node:assert/strict";
import test from "node:test";

import {
  FITCORE_METRIC_IDS,
  calculateConfidence,
  calculateTrendQuality,
  completedWorkoutCountInRange,
  getCoreDomainAnalytics,
  getNutritionAnalytics,
  getProgressAnalytics,
  getRecoveryAnalytics,
  getTrainingAnalytics,
  last7DaysWindow,
  readinessScore,
  todayMealTotals,
  workoutVolume,
  type AnalyticsMetric,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState, type MealEntry, type Workout } from "../../src/lib/types.ts";

const localTime = (year: number, month: number, date: number, hours = 12): number =>
  new Date(year, month, date, hours).getTime();

const NOW = localTime(2026, 0, 15, 15);

function makeState(overrides: Partial<AppState> = {}): AppState {
  const base = structuredClone(defaultState);
  return {
    ...base,
    workouts: [],
    mealEntries: [],
    recoveryCheckIns: [],
    bodyweightEntries: [],
    goals: [],
    ...overrides,
  };
}

function workout(id: string, startedAt: number, weight: number, reps: number): Workout {
  return {
    id,
    name: id,
    startedAt,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "bench",
        completed: true,
        sets: [{ id: `${id}-set`, weight, reps, completed: true }],
      },
    ],
  };
}

function meal(id: string, createdAt: number, values: Partial<MealEntry> = {}): MealEntry {
  return {
    id,
    name: id,
    type: "meal",
    calories: 500,
    protein: 40,
    carbs: 60,
    fat: 15,
    createdAt,
    ...values,
  };
}

function collectMetrics(value: unknown): AnalyticsMetric<unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (
    "id" in value &&
    "status" in value &&
    "source" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return [value as AnalyticsMetric<unknown>];
  }
  return Object.values(value).flatMap(collectMetrics);
}

function assertNoInvalidNumbers(value: unknown): void {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoInvalidNumbers(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertNoInvalidNumbers(item);
  }
}

test("empty state returns honest, structured domain availability", () => {
  const analytics = getCoreDomainAnalytics(makeState(), NOW);

  assert.equal(analytics.training.availability.status, "needs_more_data");
  assert.equal(analytics.training.volume7d.value, 0);
  assert.equal(analytics.training.dailyVolumeSeries7d.value?.length, 7);

  assert.equal(analytics.nutrition.availability.status, "needs_more_data");
  assert.equal(analytics.nutrition.caloriesToday.value, 0);
  assert.equal(analytics.nutrition.caloriesToday.status, "needs_more_data");

  assert.equal(analytics.recovery.availability.status, "needs_more_data");
  assert.equal(analytics.recovery.latestCheckIn.value, null);
  assert.equal(analytics.recovery.readiness7dAverage.value, null);
  assert.equal(analytics.recovery.readiness7dAverage.status, "needs_more_data");
  assert.equal(analytics.recovery.recoveryScore.value, null);

  assert.equal(analytics.progress.availability.status, "needs_more_data");
  assert.equal(analytics.progress.latestBodyweight.value, null);
  assert.deepEqual(analytics.progress.bodyweightSeries.value, []);
  assertNoInvalidNumbers(analytics);
});

test("training analytics calculate current and previous calendar windows", () => {
  const state = makeState({
    profile: { ...defaultState.profile, daysPerWeek: 4 },
    workouts: [
      workout("current-start", localTime(2026, 0, 9), 100, 5),
      workout("today", localTime(2026, 0, 15), 100, 6),
      workout("previous", localTime(2026, 0, 8), 100, 4),
      workout("outside", localTime(2026, 0, 1), 100, 10),
    ],
  });
  const analytics = getTrainingAnalytics(state, NOW);

  assert.equal(analytics.volume7d.value, 1100);
  assert.equal(analytics.previousVolume7d.value, 400);
  assert.equal(analytics.volumeChange7d.value, 175);
  assert.equal(analytics.volumeChange7d.status, "ready");
  assert.equal(analytics.completedWorkouts7d.value, 2);
  assert.equal(analytics.consistencyScore.value, 50);
  assert.equal(analytics.dailyVolumeSeries7d.value?.length, 7);
  assert.equal(analytics.dailyVolumeSeries7d.value?.filter((point) => point.volume > 0).length, 2);

  const range = last7DaysWindow(NOW);
  assert.equal(completedWorkoutCountInRange(state, range), 2);
  assert.equal(completedWorkoutCountInRange(makeState(), range), 0);
  assertNoInvalidNumbers(analytics);
});

test("training change needs more data when the previous window is a zero baseline", () => {
  const analytics = getTrainingAnalytics(
    makeState({ workouts: [workout("today", localTime(2026, 0, 15), 100, 5)] }),
    NOW,
  );

  assert.equal(analytics.volume7d.value, 500);
  assert.equal(analytics.previousVolume7d.value, 0);
  assert.equal(analytics.volumeChange7d.value, null);
  assert.equal(analytics.volumeChange7d.status, "needs_more_data");
  assert.match(analytics.volumeChange7d.reason ?? "", /zero/i);
});

test("nutrition analytics use real logged-day totals and averages", () => {
  const state = makeState({
    nutritionTargets: { calories: 2000, protein: 160, carbs: 240, fat: 70 },
    mealEntries: [
      meal("breakfast", localTime(2026, 0, 15, 8), {
        calories: 600,
        protein: 50,
        carbs: 70,
        fat: 20,
      }),
      meal("dinner", localTime(2026, 0, 15, 19), {
        calories: 900,
        protein: 70,
        carbs: 100,
        fat: 30,
      }),
      meal("older-day", localTime(2026, 0, 10), {
        calories: 1800,
        protein: 140,
        carbs: 210,
        fat: 60,
      }),
    ],
  });
  const analytics = getNutritionAnalytics(state, NOW);

  assert.equal(analytics.caloriesToday.value, 1500);
  assert.equal(analytics.proteinToday.value, 120);
  assert.equal(analytics.carbsToday.value, 170);
  assert.equal(analytics.fatToday.value, 50);
  assert.equal(analytics.targetCompletion.calories.value, 75);
  assert.equal(analytics.targetCompletion.protein.value, 75);
  assert.equal(analytics.caloriesRemaining.value, 500);
  assert.equal(analytics.proteinRemaining.value, 40);
  assert.equal(analytics.calories7dAverage.value, 1650);
  assert.equal(analytics.protein7dAverage.value, 130);
  assert.equal(analytics.calories7dAverage.sampleSize, 2);
  assert.equal(analytics.adherenceScore.status, "ready");
  assert.ok((analytics.adherenceScore.value ?? -1) >= 0);
  assert.ok((analytics.adherenceScore.value ?? 101) <= 100);
  assertNoInvalidNumbers(analytics);
});

test("zero nutrition targets remain unavailable without division by zero", () => {
  const analytics = getNutritionAnalytics(
    makeState({
      nutritionTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      mealEntries: [meal("meal", localTime(2026, 0, 15))],
    }),
    NOW,
  );

  for (const target of [
    analytics.targetCompletion.calories,
    analytics.targetCompletion.protein,
    analytics.targetCompletion.carbs,
    analytics.targetCompletion.fat,
    analytics.targetCompletion.overall,
  ]) {
    assert.equal(target.status, "unavailable");
    assert.equal(target.value, null);
  }
  assert.equal(analytics.caloriesRemaining.value, null);
  assert.equal(analytics.proteinRemaining.value, null);
  assert.equal(analytics.adherenceScore.value, null);
  assert.equal(analytics.adherenceScore.status, "unavailable");
  assertNoInvalidNumbers(analytics);
});

test("recovery analytics use valid check-ins and never invent readiness", () => {
  const empty = getRecoveryAnalytics(makeState(), NOW);
  assert.equal(empty.readiness7dAverage.value, null);
  assert.equal(empty.recoveryScore.value, null);
  assert.equal(empty.readiness7dAverage.status, "needs_more_data");

  const analytics = getRecoveryAnalytics(
    makeState({
      recoveryCheckIns: [
        {
          id: "new",
          createdAt: localTime(2026, 0, 15),
          energy: 5,
          soreness: 1,
          stress: 1,
          motivation: 5,
        },
        {
          id: "old",
          createdAt: localTime(2026, 0, 13),
          energy: 3,
          soreness: 3,
          stress: 3,
          motivation: 3,
        },
      ],
    }),
    NOW,
  );

  assert.equal(analytics.latestCheckIn.value?.id, "new");
  assert.equal(analytics.readiness7dAverage.value, 80);
  assert.equal(analytics.soreness7dAverage.value, 2);
  assert.equal(analytics.stress7dAverage.value, 2);
  assert.equal(analytics.energy7dAverage.value, 4);
  assert.equal(analytics.motivation7dAverage.value, 4);
  assert.equal(analytics.recoveryScore.value, 80);
  assertNoInvalidNumbers(analytics);
});

test("one bodyweight entry is chart-safe but does not claim a trend", () => {
  const analytics = getProgressAnalytics(
    makeState({
      bodyweightEntries: [{ id: "only", weightLb: 181, createdAt: localTime(2026, 0, 15) }],
      goals: [{ id: "goal", type: "bodyweight", label: "Reach 185", current: 181, target: 185 }],
    }),
    NOW,
  );

  assert.equal(analytics.latestBodyweight.value, 181);
  assert.equal(analytics.bodyweightSeries.value?.length, 1);
  assert.equal(analytics.bodyweight7dDelta.value, null);
  assert.equal(analytics.bodyweight30dDelta.value, null);
  assert.equal(analytics.bodyweightTrend.value, "unknown");
  assert.equal(analytics.bodyweightTrend.status, "needs_more_data");
  assert.equal(analytics.goalProgressPercent.status, "ready");
  assertNoInvalidNumbers(analytics);
});

test("multiple bodyweight entries produce safe deltas and direction", () => {
  const analytics = getProgressAnalytics(
    makeState({
      bodyweightEntries: [
        { id: "month", weightLb: 178, createdAt: localTime(2025, 11, 20) },
        { id: "week", weightLb: 180, createdAt: localTime(2026, 0, 9) },
        { id: "latest", weightLb: 182, createdAt: localTime(2026, 0, 15) },
      ],
      goals: [{ id: "goal", type: "bodyweight", label: "Reach 185", current: 182, target: 185 }],
    }),
    NOW,
  );

  assert.equal(analytics.bodyweight7dDelta.value, 2);
  assert.equal(analytics.bodyweight30dDelta.value, 4);
  assert.equal(analytics.bodyweightTrend.value, "up");
  assert.equal(analytics.bodyweightTrend.status, "ready");
  assert.equal(analytics.bodyweightSeries.value?.length, 3);
  assertNoInvalidNumbers(analytics);
});

test("metric IDs are unique and every ready score stays in range", () => {
  const analytics = getCoreDomainAnalytics(
    makeState({
      profile: { ...defaultState.profile, daysPerWeek: 4 },
      workouts: [workout("workout", localTime(2026, 0, 15), 100, 5)],
      mealEntries: [meal("meal", localTime(2026, 0, 15))],
      recoveryCheckIns: [
        {
          id: "check",
          createdAt: localTime(2026, 0, 15),
          energy: 4,
          soreness: 2,
          stress: 2,
          motivation: 4,
        },
      ],
      bodyweightEntries: [{ id: "weight", weightLb: 181, createdAt: localTime(2026, 0, 15) }],
    }),
    NOW,
  );
  const metrics = collectMetrics(analytics);
  const ids = metrics.map((item) => item.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(FITCORE_METRIC_IDS.training.volume7d));
  assert.ok(ids.includes(FITCORE_METRIC_IDS.nutrition.caloriesToday));
  assert.ok(ids.includes(FITCORE_METRIC_IDS.recovery.readiness7dAverage));
  assert.ok(ids.includes(FITCORE_METRIC_IDS.progress.latestBodyweight));

  for (const item of metrics.filter(
    (metric) => metric.unit === "score_0_100" && metric.value !== null,
  )) {
    assert.ok((item.value as number) >= 0);
    assert.ok((item.value as number) <= 100);
  }
  assertNoInvalidNumbers(analytics);
});

test("malformed numeric inputs cannot leak NaN, Infinity, or out-of-range scores", () => {
  const analytics = getCoreDomainAnalytics(
    makeState({
      profile: { ...defaultState.profile, daysPerWeek: Number.POSITIVE_INFINITY },
      nutritionTargets: {
        calories: Number.POSITIVE_INFINITY,
        protein: Number.NaN,
        carbs: 0,
        fat: -10,
      },
      workouts: [workout("invalid-volume", localTime(2026, 0, 15), Number.POSITIVE_INFINITY, 5)],
      mealEntries: [
        meal("invalid-meal", localTime(2026, 0, 15), {
          calories: Number.POSITIVE_INFINITY,
          protein: Number.NaN,
        }),
      ],
      recoveryCheckIns: [
        {
          id: "out-of-range",
          createdAt: localTime(2026, 0, 15),
          energy: 100,
          soreness: -100,
          stress: 100,
          motivation: -100,
        },
      ],
      bodyweightEntries: [
        { id: "invalid-weight", weightLb: Number.POSITIVE_INFINITY, createdAt: NOW },
      ],
    }),
    NOW,
  );

  assert.equal(analytics.training.consistencyScore.status, "unavailable");
  assert.equal(analytics.nutrition.caloriesRemaining.value, null);
  assert.equal(analytics.nutrition.proteinRemaining.value, null);
  assert.ok((analytics.recovery.readiness7dAverage.value ?? -1) >= 0);
  assert.ok((analytics.recovery.readiness7dAverage.value ?? 101) <= 100);
  assert.ok((analytics.recovery.energy7dAverage.value ?? -1) <= 5);
  assert.ok((analytics.recovery.soreness7dAverage.value ?? -1) >= 0);
  assert.equal(analytics.progress.latestBodyweight.value, null);
  assertNoInvalidNumbers(analytics);
});

test("legacy analytics exports share the new safe calculation primitives", () => {
  const invalidWorkout = workout("invalid", localTime(2026, 0, 15), Number.POSITIVE_INFINITY, 5);
  const state = makeState({
    mealEntries: [
      meal("invalid", localTime(2026, 0, 15), {
        calories: Number.POSITIVE_INFINITY,
        protein: Number.NaN,
      }),
    ],
    recoveryCheckIns: [
      {
        id: "check",
        createdAt: localTime(2026, 0, 15),
        energy: 5,
        soreness: 1,
        stress: 1,
        motivation: 5,
      },
    ],
  });

  assert.equal(workoutVolume(invalidWorkout), 0);
  assert.deepEqual(todayMealTotals(state, NOW), {
    calories: 0,
    protein: 0,
    carbs: 60,
    fat: 15,
  });
  assert.equal(readinessScore(makeState()), 70);
  assert.equal(readinessScore(state), 85);
  assertNoInvalidNumbers([
    workoutVolume(invalidWorkout),
    todayMealTotals(state, NOW),
    readinessScore(state),
  ]);
});

test("confidence evidence produces none, low, medium, and high deterministically", () => {
  const confidence = (records: number, covered: number, expected: number) =>
    calculateConfidence({
      levelHint: records >= 4 ? "high" : records >= 2 ? "medium" : records === 1 ? "low" : "none",
      validRecordCount: records,
      minimumSampleSize: 1,
      coverageDayCount: covered,
      expectedDayCount: expected,
      comparisonPeriodValid: null,
      targetValid: null,
      partialPeriod: false,
      stale: false,
      excludedRecordCount: 0,
    });

  assert.equal(confidence(7, 7, 7).level, "high");
  assert.equal(confidence(4, 4, 7).level, "medium");
  assert.equal(confidence(1, 1, 7).level, "low");
  assert.equal(confidence(0, 0, 7).level, "none");
  assert.ok(confidence(7, 7, 7).reasons.some((reason) => reason.code === "dense_coverage"));
  assert.ok(confidence(0, 0, 7).reasons.some((reason) => reason.code === "no_source_data"));
});

test("trend quality keeps direction separate from evidence quality", () => {
  const at = (day: number) => localTime(2026, 0, day);
  const insufficient = calculateTrendQuality({ values: [{ timestamp: at(1), value: 10 }] });
  const sparse = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 10 },
      { timestamp: at(2), value: 12 },
    ],
    expectedDayCount: 30,
  });
  const partial = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 10 },
      { timestamp: at(2), value: 12 },
    ],
    expectedDayCount: 4,
  });
  const stable = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 10 },
      { timestamp: at(2), value: 10 },
      { timestamp: at(3), value: 10 },
    ],
    expectedDayCount: 3,
    stableThreshold: 0,
  });
  const volatile = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 10 },
      { timestamp: at(2), value: 10 },
      { timestamp: at(3), value: 10 },
      { timestamp: at(4), value: 100 },
    ],
    expectedDayCount: 4,
  });
  const improving = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 1 },
      { timestamp: at(2), value: 2 },
      { timestamp: at(3), value: 3 },
    ],
    expectedDayCount: 3,
    higherIsBetter: true,
  });
  const declining = calculateTrendQuality({
    values: [
      { timestamp: at(1), value: 3 },
      { timestamp: at(2), value: 2 },
      { timestamp: at(3), value: 1 },
    ],
    expectedDayCount: 3,
    higherIsBetter: true,
  });

  assert.equal(insufficient.direction, "unknown");
  assert.ok(insufficient.codes.includes("insufficient_data"));
  assert.ok(sparse.codes.includes("sparse_data"));
  assert.ok(partial.codes.includes("partial_coverage"));
  assert.equal(stable.direction, "stable");
  assert.ok(stable.codes.includes("stable_trend"));
  assert.ok(stable.codes.includes("flat_or_unchanged"));
  assert.ok(volatile.codes.includes("volatile_trend"));
  assert.ok(volatile.codes.includes("indeterminate"));
  assert.ok(volatile.reasons.some((reason) => reason.code === "outliers_detected"));
  assert.equal(improving.direction, "up");
  assert.ok(improving.codes.includes("improving"));
  assert.equal(declining.direction, "down");
  assert.ok(declining.codes.includes("declining"));
});

test("dense training history has strong prior-window evidence and valid comparison metadata", () => {
  const workouts = Array.from({ length: 14 }, (_, index) =>
    workout(`workout-${index}`, localTime(2026, 0, 15 - index), 100, 5),
  );
  const analytics = getTrainingAnalytics(
    makeState({ profile: { ...defaultState.profile, daysPerWeek: 7 }, workouts }),
    NOW,
  );

  assert.equal(analytics.previousVolume7d.confidence, "high");
  assert.equal(analytics.previousVolume7d.source.coverageDayCount, 7);
  assert.equal(analytics.previousVolume7d.source.expectedDayCount, 7);
  assert.equal(analytics.volumeChange7d.source.comparisonEntryIds.length, 7);
  assert.equal(analytics.volumeChange7d.confidenceDetails.evidence.comparisonPeriodValid, true);
  assert.ok(
    analytics.volumeChange7d.confidenceDetails.reasons.some(
      (reason) => reason.code === "valid_comparison_period",
    ),
  );
});

test("training zero baseline and missing comparison periods have no confidence", () => {
  const analytics = getTrainingAnalytics(
    makeState({ workouts: [workout("current", localTime(2026, 0, 15), 100, 5)] }),
    NOW,
  );

  assert.equal(analytics.volumeChange7d.confidence, "none");
  assert.equal(analytics.volumeChange7d.trendQuality?.zeroBaseline, true);
  assert.equal(analytics.volumeChange7d.trendQuality?.comparisonComplete, false);
  assert.ok(
    analytics.volumeChange7d.reasons.some((reason) => reason.code === "zero_comparison_baseline"),
  );
  assert.ok(
    analytics.volumeChange7d.reasons.some((reason) => reason.code === "missing_comparison_period"),
  );
});

test("nutrition confidence is based on logged days and marks the active day partial", () => {
  const stateForDays = (days: number) =>
    makeState({
      mealEntries: Array.from({ length: days }, (_, index) =>
        meal(`meal-${index}`, localTime(2026, 0, 15 - index)),
      ),
    });
  const dense = getNutritionAnalytics(stateForDays(7), NOW);
  const partial = getNutritionAnalytics(stateForDays(3), NOW);
  const sparse = getNutritionAnalytics(stateForDays(1), NOW);
  const missing = getNutritionAnalytics(makeState(), NOW);

  assert.equal(dense.calories7dAverage.sampleSize, 7);
  assert.equal(dense.calories7dAverage.source.coverageDayCount, 7);
  assert.equal(dense.calories7dAverage.confidence, "medium");
  assert.equal(dense.calories7dAverage.confidenceDetails.evidence.partialPeriod, true);
  assert.equal(partial.calories7dAverage.confidence, "medium");
  assert.equal(sparse.calories7dAverage.confidence, "low");
  assert.equal(missing.calories7dAverage.confidence, "none");
  assert.equal(dense.caloriesToday.sampleSize, 1);
  assert.equal(dense.caloriesToday.source.includedRecordCount, 1);
  assert.ok(dense.caloriesToday.reasons.some((reason) => reason.code === "partial_period"));
});

test("source metadata excludes invalid records and orders duplicate-free IDs deterministically", () => {
  const state = makeState({
    workouts: [
      workout("z-id", localTime(2026, 0, 15), 100, 5),
      workout("a-id", localTime(2026, 0, 14), 100, 5),
      workout("z-id", localTime(2026, 0, 13), Number.POSITIVE_INFINITY, 5),
      workout("invalid", Number.NaN, 100, 5),
    ],
  });
  const forward = getTrainingAnalytics(state, NOW);
  const reversed = getTrainingAnalytics(
    makeState({ workouts: [...state.workouts].reverse() }),
    NOW,
  );
  const source = forward.volume7d.source;

  assert.deepEqual(source.entryIds, ["a-id", "z-id"]);
  assert.equal(source.includedRecordCount, 3);
  assert.equal(source.excludedRecordCount, 1);
  assert.ok(
    source.exclusions.some((item) => item.code === "invalid_timestamp" && item.count === 1),
  );
  assert.ok(forward.volume7d.reasons.some((reason) => reason.code === "invalid_values_excluded"));
  assert.deepEqual(forward, reversed);
});

test("source metadata distinguishes requested range from effective range and coverage", () => {
  const loggedAt = localTime(2026, 0, 15, 9);
  const analytics = getTrainingAnalytics(
    makeState({ workouts: [workout("one", loggedAt, 100, 5)] }),
    NOW,
  );
  const source = analytics.volume7d.source;

  assert.deepEqual(source.requestedDateRange, last7DaysWindow(NOW));
  assert.deepEqual(source.effectiveDateRange, { start: loggedAt, end: loggedAt + 1 });
  assert.equal(source.earliestIncludedAt, loggedAt);
  assert.equal(source.latestIncludedAt, loggedAt);
  assert.equal(source.coverageDayCount, 1);
  assert.equal(source.expectedDayCount, 7);
  assert.equal(source.calculationVersion, 1);
  assert.equal(source.calculationId, `${FITCORE_METRIC_IDS.training.volume7d}.v1`);
  assert.equal(analytics.volume7d.kind, "aggregate");
  assert.equal(analytics.dailyVolumeSeries7d.kind, "time_series");
});

test("representative metrics in every domain expose stable calculation kinds", () => {
  const analytics = getCoreDomainAnalytics(
    makeState({
      workouts: [workout("workout", localTime(2026, 0, 15), 100, 5)],
      mealEntries: [meal("meal", localTime(2026, 0, 15))],
      recoveryCheckIns: [
        {
          id: "check",
          createdAt: localTime(2026, 0, 15),
          energy: 4,
          soreness: 2,
          stress: 2,
          motivation: 4,
        },
      ],
      bodyweightEntries: [
        { id: "weight-a", weightLb: 180, createdAt: localTime(2026, 0, 9) },
        { id: "weight-b", weightLb: 181, createdAt: localTime(2026, 0, 15) },
      ],
    }),
    NOW,
  );

  assert.equal(analytics.training.completedWorkouts7d.kind, "aggregate");
  assert.equal(analytics.training.volumeChange7d.kind, "comparison");
  assert.equal(analytics.training.dailyVolumeSeries7d.kind, "time_series");
  assert.equal(analytics.nutrition.caloriesToday.kind, "point_in_time");
  assert.equal(analytics.nutrition.calories7dAverage.kind, "aggregate");
  assert.equal(analytics.recovery.latestCheckIn.kind, "point_in_time");
  assert.equal(analytics.recovery.readiness7dAverage.kind, "aggregate");
  assert.equal(analytics.progress.latestBodyweight.kind, "point_in_time");
  assert.equal(analytics.progress.bodyweight7dDelta.kind, "comparison");
  assert.equal(analytics.progress.bodyweightSeries.kind, "time_series");
});

test("recovery single-check-in and no-data confidence stay conservative", () => {
  const single = getRecoveryAnalytics(
    makeState({
      recoveryCheckIns: [
        {
          id: "check",
          createdAt: localTime(2026, 0, 15),
          energy: 4,
          soreness: 2,
          stress: 2,
          motivation: 4,
        },
      ],
    }),
    NOW,
  );
  const empty = getRecoveryAnalytics(makeState(), NOW);

  assert.equal(single.latestCheckIn.confidence, "low");
  assert.equal(single.readiness7dAverage.confidence, "low");
  assert.ok(single.latestCheckIn.reasons.some((reason) => reason.code === "point_in_time"));
  assert.ok(single.readiness7dAverage.trendQuality?.codes.includes("insufficient_data"));
  assert.equal(empty.latestCheckIn.confidence, "none");
  assert.equal(empty.recoveryScore.confidence, "none");
  assert.equal(empty.recoveryScore.value, null);
});

test("progress trend reports uneven spacing and stale evidence", () => {
  const uneven = getProgressAnalytics(
    makeState({
      bodyweightEntries: [
        { id: "a", weightLb: 180, createdAt: localTime(2025, 11, 18) },
        { id: "b", weightLb: 180.5, createdAt: localTime(2025, 11, 19) },
        { id: "c", weightLb: 181, createdAt: localTime(2025, 11, 20) },
        { id: "d", weightLb: 182, createdAt: localTime(2026, 0, 15) },
      ],
    }),
    NOW,
  );
  const stale = getProgressAnalytics(
    makeState({
      bodyweightEntries: [
        { id: "old-a", weightLb: 180, createdAt: localTime(2025, 11, 18) },
        { id: "old-b", weightLb: 181, createdAt: localTime(2025, 11, 19) },
      ],
    }),
    NOW,
  );

  assert.ok(uneven.bodyweightTrend.trendQuality?.codes.includes("uneven_spacing"));
  assert.ok(
    uneven.bodyweightTrend.trendQuality?.reasons.some((reason) => reason.code === "uneven_spacing"),
  );
  assert.equal(stale.bodyweight30dDelta.confidence, "low");
  assert.ok(
    stale.bodyweightTrend.trendQuality?.reasons.some((reason) => reason.code === "stale_data"),
  );
  assert.ok(stale.bodyweightTrend.reasons.some((reason) => reason.code === "stale_data"));
});

test("identical input produces byte-stable structured analytics output", () => {
  const state = makeState({
    workouts: [workout("workout", localTime(2026, 0, 15), 100, 5)],
    mealEntries: [meal("meal", localTime(2026, 0, 15))],
    recoveryCheckIns: [
      {
        id: "check",
        createdAt: localTime(2026, 0, 15),
        energy: 4,
        soreness: 2,
        stress: 2,
        motivation: 4,
      },
    ],
    bodyweightEntries: [{ id: "weight", weightLb: 181, createdAt: localTime(2026, 0, 15) }],
  });

  const first = getCoreDomainAnalytics(state, NOW);
  const second = getCoreDomainAnalytics(structuredClone(state), NOW);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first, second);
});
