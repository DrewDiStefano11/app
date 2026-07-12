import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  FITCORE_AGGREGATE_CONFIDENCE_VERSION,
  FITCORE_ANALYTICS_SCHEMA_VERSION,
  getExerciseAndMuscleAnalytics,
  getFitCoreAnalytics,
  getGoalDetailAnalytics,
  getNutritionDetailAnalytics,
  getRecoveryDetailAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0, 0).getTime();

function timestamp(daysAgo: number): number {
  const value = new Date(2026, 2, 7, 12, 0, 0, 0);
  value.setDate(value.getDate() - daysAgo);
  return value.getTime();
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    recoveryCheckIns: [],
    recoverySignals: [],
    bodyweightEntries: [],
    goals: [],
    customExercises: [],
    sleepEntries: [],
    ...patch,
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function assertSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    return;
  }
  if (typeof value === "string" && path.endsWith("generatedAt")) {
    assert.notEqual(new Date(value).toString(), "Invalid Date");
  }
  if (Array.isArray(value))
    return value.forEach((item, index) => assertSafe(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => assertSafe(item, `${path}.${key}`));
}

test("Task 8 requirements 1-3: empty state has a versioned safe envelope and injected time", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  assert.equal(result.schemaVersion, FITCORE_ANALYTICS_SCHEMA_VERSION);
  assert.equal(result.generatedAt, new Date(NOW).toISOString());
  assert.equal(result.availability.status, "unavailable");
  assert.equal(result.availability.domains.length, 4);
  assertSafe(result);
});

test("Task 8 requirements 4, 11-14, 19-21: aggregate domains equal direct APIs", () => {
  const input = state();
  const options = {
    now: NOW,
    training: { historyDays: 30, comparisonDays: 7 },
    nutrition: { days: 14 },
    recovery: { days: 14 },
  };
  const result = getFitCoreAnalytics(input, options);
  assert.deepEqual(
    result.domains.training,
    getExerciseAndMuscleAnalytics(input, { ...options.training, now: NOW }),
  );
  assert.deepEqual(
    result.domains.nutrition,
    getNutritionDetailAnalytics(input, { ...options.nutrition, now: NOW }),
  );
  assert.deepEqual(
    result.domains.recovery,
    getRecoveryDetailAnalytics(input, { ...options.recovery, now: NOW }),
  );
  assert.deepEqual(result.domains.goals, getGoalDetailAnalytics(input, { now: NOW }));
});

test("Task 8 requirements 5-6, 48, 50-54: output and source ordering are deterministic", () => {
  const meals = [
    { id: "z", name: "Z", createdAt: timestamp(0), calories: 300, protein: 20, carbs: 30, fat: 10 },
    { id: "a", name: "A", createdAt: timestamp(1), calories: 400, protein: 30, carbs: 40, fat: 12 },
  ];
  const first = getFitCoreAnalytics(state({ mealEntries: meals }), { now: NOW });
  const repeated = getFitCoreAnalytics(state({ mealEntries: meals }), { now: NOW });
  const reversed = getFitCoreAnalytics(state({ mealEntries: [...meals].reverse() }), { now: NOW });
  assert.equal(JSON.stringify(first), JSON.stringify(repeated));
  assert.deepEqual(first, reversed);
  assert.deepEqual(first.sources.entryIds, [...first.sources.entryIds].sort());
  assert.equal(new Set(first.sources.entryIds).size, first.sources.entryIds.length);
});

test("Task 8 requirements 7-8, 61, 83-84: frozen state and options stay immutable", () => {
  const input = deepFreeze(
    state({
      mealEntries: [
        {
          id: "meal",
          name: "Meal",
          createdAt: timestamp(0),
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 15,
        },
      ],
    }),
  );
  const options = deepFreeze({ now: NOW, nutrition: { days: 7 } });
  const beforeState = JSON.stringify(input);
  const beforeOptions = JSON.stringify(options);
  getFitCoreAnalytics(input, options);
  assert.equal(JSON.stringify(input), beforeState);
  assert.equal(JSON.stringify(options), beforeOptions);
});

test("Task 8 requirements 9-10, 59: output contains no unsafe numbers or dates", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  assertSafe(result);
  assert.ok(result.range === null || result.range.start <= result.range.end);
});

test("Task 8 requirements 15, 25-30: one usable domain does not alter unavailable domains", () => {
  const input = state({
    mealEntries: [
      {
        id: "meal",
        name: "Meal",
        createdAt: timestamp(0),
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
      },
    ],
  });
  const result = getFitCoreAnalytics(input, { now: NOW });
  const nutrition = result.availability.domains.find((item) => item.domain === "nutrition");
  const recovery = result.availability.domains.find((item) => item.domain === "recovery");
  assert.ok(nutrition?.status === "partially_available" || nutrition?.status === "available");
  assert.equal(recovery?.status, "unavailable");
  assert.equal(result.availability.status, "partially_available");
});

test("Task 8 requirements 16-18, 34, 47, 52: exclusions and provenance remain inspectable", () => {
  const input = state({
    mealEntries: [
      {
        id: "same",
        name: "Meal",
        createdAt: timestamp(0),
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
      },
      {
        id: "same",
        name: "Duplicate",
        createdAt: timestamp(0),
        calories: 600,
        protein: 45,
        carbs: 55,
        fat: 20,
      },
    ],
  });
  const result = getFitCoreAnalytics(input, { now: NOW });
  assert.equal(result.completeness.hasExclusions, true);
  assert.ok(result.exclusions.excludedRecordCount > 0);
  assert.ok(result.reasons.some((reason) => reason.code === "domain_has_exclusions"));
  assert.deepEqual(
    result.sources.entryIds.filter((id) => id === "same"),
    ["same"],
  );
  assert.deepEqual(result.domains.nutrition.sourceMetadata.entryIds, ["same"]);
});

test("Task 8 requirements 22-24, 35: unsupported fields and metric contracts are preserved", () => {
  const input = state();
  const direct = getRecoveryDetailAnalytics(input, { now: NOW });
  const result = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(result.domains.recovery.wearableOnly, direct.wearableOnly);
  assert.equal(result.completeness.hasUnsupportedFields, true);
  assert.ok(result.reasons.some((reason) => reason.code === "unsupported_domain_fields"));
});

test("Task 8 requirements 31-38: completeness uses counts and preserves domain detail", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  assert.equal(result.completeness.domains.length, 4);
  assert.equal("percentage" in result.completeness, false);
  assert.deepEqual(
    result.domains.nutrition.completeness,
    getNutritionDetailAnalytics(state(), { now: NOW }).completeness,
  );
  assert.equal(
    result.completeness.usableDomainCount + result.completeness.unavailableDomainCount,
    4,
  );
});

test("Task 8 requirements 39-46: confidence is conservative and separate", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  assert.equal(result.confidence.level, "none");
  assert.equal(result.confidence.algorithm, FITCORE_AGGREGATE_CONFIDENCE_VERSION);
  assert.equal(result.confidence.sufficientMultiDomainEvidence, false);
  assert.notStrictEqual(result.confidence, result.availability);
  assert.notStrictEqual(result.confidence, result.completeness);
  assert.ok(result.confidence.excludedDomains.length >= 3);
});

test("Task 8 requirements 55-57, 60: options forward without conflicting defaults", () => {
  const input = state();
  const result = getFitCoreAnalytics(input, {
    now: NOW,
    training: { historyDays: 11, comparisonDays: 5, staleAfterDays: 9 },
    nutrition: { days: 11, timeZone: "local" },
    recovery: { days: 11 },
  });
  assert.deepEqual(
    result.domains.training,
    getExerciseAndMuscleAnalytics(input, {
      now: NOW,
      historyDays: 11,
      comparisonDays: 5,
      staleAfterDays: 9,
    }),
  );
  assert.deepEqual(
    result.domains.nutrition,
    getNutritionDetailAnalytics(input, { now: NOW, days: 11, timeZone: "local" }),
  );
  assert.deepEqual(
    result.domains.recovery,
    getRecoveryDetailAnalytics(input, { now: NOW, days: 11 }),
  );
});

test("Task 8 requirements 58-59: invalid option values normalize through domain conventions", () => {
  const result = getFitCoreAnalytics(state(), {
    now: NOW,
    training: { historyDays: -5, comparisonDays: Number.NaN },
    nutrition: { days: -10 },
    recovery: { days: Number.POSITIVE_INFINITY },
  });
  assertSafe(result);
  assert.ok(
    result.domains.nutrition.requestedDateRange.start <=
      result.domains.nutrition.requestedDateRange.end,
  );
});

test("Task 8 requirements 76-81: mixed invalid, future, and missing data remains domain-scoped", () => {
  const input = state({
    mealEntries: [
      {
        id: "future",
        name: "Future",
        createdAt: timestamp(-2),
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
      },
    ],
    recoveryCheckIns: [
      { id: "bad", createdAt: Number.NaN, energy: 5, soreness: 5, stress: 5, motivation: 5 },
    ],
    goals: [{ id: "goal", type: "bodyweight", label: "Goal", current: 180, target: 175 }],
  });
  const result = getFitCoreAnalytics(input, { now: NOW });
  assertSafe(result);
  assert.equal(result.domains.nutrition.sourceMetadata.includedRecordCount, 0);
  assert.equal(result.domains.recovery.sourceMetadata.includedRecordCount, 0);
  assert.equal(result.domains.goals.goals[0]?.completeness.hasDeadline, false);
  assert.equal(result.domains.nutrition.proteinPerBodyweight.bodyweightSource, "profile");
});

test("Task 8 requirement 82: aggregate exposes no invented score or conclusion", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW }) as unknown as Record<string, unknown>;
  for (const forbidden of [
    "score",
    "healthScore",
    "readinessScore",
    "recommendation",
    "diagnosis",
    "medicalConclusion",
  ]) {
    assert.equal(Object.hasOwn(result, forbidden), false);
  }
});
