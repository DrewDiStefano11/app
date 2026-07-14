import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  ANALYTICS_ENGINE_VERSION,
  ANALYTICS_GENERATED_BY,
  ANALYTICS_PHASE,
  ANALYTICS_SCHEMA_VERSION,
  FITCORE_ANALYTICS_SCHEMA_VERSION,
  getAnalyticsVersionMetadata,
  getExerciseAndMuscleAnalytics,
  getFitCoreAnalytics,
  getGoalDetailAnalytics,
  getNutritionDetailAnalytics,
  getRecoveryDetailAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0, 0).getTime();

function emptyState(): AppState {
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
  };
}

function assertPlainSerializable(value: unknown): void {
  if (!value || typeof value !== "object") return;
  assert.equal(value instanceof Map, false);
  assert.equal(value instanceof Set, false);
  assert.equal(Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value), true);
  for (const item of Object.values(value)) {
    assert.notEqual(typeof item, "function");
    if (typeof item === "number") assert.equal(Number.isFinite(item), true);
    assertPlainSerializable(item);
  }
}

test("Task 11 analytics version metadata is exact, stable, fresh, and serializable", () => {
  const expected = {
    schemaVersion: "1.1.0",
    engineVersion: "2.0.0",
    phase: 2,
    generatedBy: "fitcore-analytics",
  };
  const first = getAnalyticsVersionMetadata();
  const second = getAnalyticsVersionMetadata();
  assert.deepEqual(first, expected);
  assert.deepEqual(second, expected);
  assert.notStrictEqual(first, second);
  first.schemaVersion = ANALYTICS_SCHEMA_VERSION;
  assert.deepEqual(second, expected);
  assert.equal(JSON.stringify(first), JSON.stringify(expected));
  assert.deepEqual(Object.keys(first).sort(), [
    "engineVersion",
    "generatedBy",
    "phase",
    "schemaVersion",
  ]);
  assert.equal(ANALYTICS_SCHEMA_VERSION, FITCORE_ANALYTICS_SCHEMA_VERSION);
  assert.equal(ANALYTICS_ENGINE_VERSION, expected.engineVersion);
  assert.equal(ANALYTICS_PHASE, expected.phase);
  assert.equal(ANALYTICS_GENERATED_BY, expected.generatedBy);
});

test("Task 11 metadata is additive and Phase 1 domain metric values are unchanged", () => {
  const input = emptyState();
  const result = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(result.analyticsVersion, getAnalyticsVersionMetadata());
  assert.equal(result.schemaVersion, result.analyticsVersion.schemaVersion);
  assert.equal(result.dependencyGraph.graphId, "fitcore-analytics-dependencies-v1");
  assert.ok(result.dependencyGraph.nodeCount > 0);
  assert.equal(result.provenance.sourceType, "unknown");
  assert.equal(result.provenance.traceabilityScore, null);
  assert.deepEqual(result.domains.training, getExerciseAndMuscleAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.nutrition, getNutritionDetailAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.recovery, getRecoveryDetailAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.goals, getGoalDetailAnalytics(input, { now: NOW }));
  for (const key of [
    "generatedAt",
    "range",
    "domains",
    "availability",
    "completeness",
    "confidence",
    "sources",
    "exclusions",
    "reasons",
    "correlations",
    "insightReadiness",
  ]) {
    assert.equal(Object.hasOwn(result, key), true);
  }
});

test("Task 11 metadata is safe for empty state and contains only plain JSON values", () => {
  const result = getFitCoreAnalytics(emptyState(), { now: NOW });
  const metadata = {
    analyticsVersion: result.analyticsVersion,
    dependencyGraph: result.dependencyGraph,
    provenance: result.provenance,
  };
  assert.doesNotThrow(() => JSON.stringify(metadata));
  assertPlainSerializable(metadata);
  assert.equal(JSON.stringify(metadata).includes("NaN"), false);
  assert.equal(JSON.stringify(metadata).includes("Infinity"), false);
});

test("Task 11 metadata remains stable for a partially populated state", () => {
  const input = emptyState();
  input.mealEntries = [
    {
      id: "meal-1",
      name: "Meal",
      createdAt: NOW,
      calories: 500,
      protein: 40,
      carbs: 50,
      fat: 15,
    },
  ];
  const result = getFitCoreAnalytics(input, { now: NOW });
  assert.equal(result.availability.status, "partially_available");
  assert.deepEqual(result.analyticsVersion, getAnalyticsVersionMetadata());
  assert.deepEqual(result.provenance.reasonCodes, ["missing_source", "source_type_not_recorded"]);
  assertPlainSerializable(result.analyticsVersion);
  assertPlainSerializable(result.dependencyGraph);
  assertPlainSerializable(result.provenance);
});
