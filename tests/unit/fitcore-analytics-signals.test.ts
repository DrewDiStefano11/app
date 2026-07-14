import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  METRIC_DEPENDENCY_GRAPH,
  getFitCoreAnalytics,
  getFitCoreAnalyticsSignals,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);
const timestamp = (daysAgo: number) => NOW - daysAgo * 86_400_000;

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

function historicalState(): AppState {
  const days = Array.from({ length: 70 }, (_, index) => index + 1);
  return state({
    workouts: days.map((day) => ({
      id: `workout-${day}`,
      name: "Workout",
      startedAt: timestamp(day) - 3_600_000,
      endedAt: timestamp(day),
      exercises: [
        {
          id: `exercise-${day}`,
          exerciseId: "bench-press",
          completed: true,
          sets: [{ id: `set-${day}`, completed: true, weight: 100 + day, reps: 5 }],
        },
      ],
    })),
    mealEntries: days.map((day) => ({
      id: `meal-${day}`,
      name: "Meal",
      type: "dinner",
      createdAt: timestamp(day),
      calories: 1800 + day * 5,
      protein: 120 + day,
      carbs: 200 + day,
      fat: 60 + day / 2,
    })),
    recoveryCheckIns: days.map((day) => ({
      id: `recovery-${day}`,
      createdAt: timestamp(day),
      soreness: 3 + (day % 3),
      energy: 6 + (day % 2),
      stress: 4 + (day % 2),
      motivation: 7 - (day % 2),
    })),
    bodyweightEntries: days.map((day) => ({
      id: `weight-${day}`,
      createdAt: timestamp(day),
      weightLb: 180 + day / 10,
    })),
  });
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function assertSafe(value: unknown): void {
  assert.notEqual(typeof value, "function");
  assert.notEqual(typeof value, "symbol");
  assert.notEqual(typeof value, "undefined");
  if (typeof value === "number") assert.equal(Number.isFinite(value), true);
  if (Array.isArray(value)) return value.forEach(assertSafe);
  if (value && typeof value === "object") Object.values(value).forEach(assertSafe);
}

test("Task 14 signal report covers all 85 graph nodes in canonical order", () => {
  const report = getFitCoreAnalytics(historicalState(), { now: NOW }).signals;
  assert.equal(report.nodeCount, 85);
  assert.equal(report.records.length, 85);
  assert.equal(new Set(report.records.map((record) => record.nodeId)).size, 85);
  assert.deepEqual(
    report.records.map((record) => record.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
  assert.equal(report.supportedNodeCount, 11);
  assert.equal(report.summary.unsupported, 74);
});

test("Task 14 unsupported nodes remain explicit in both signal families", () => {
  const records = getFitCoreAnalytics(historicalState(), { now: NOW }).signals.records;
  for (const id of [
    "nutrition.meals.count_today",
    "aggregate.fitcore.confidence",
    "correlation.calories.bodyweight",
    "presentation.nutrition.meals.count_today",
    "insight.calories.bodyweight_trend",
  ]) {
    const record = records.find((item) => item.nodeId === id)!;
    assert.equal(record.supported, false);
    assert.equal(record.usable, false);
    assert.equal(record.anomaly.status, "unavailable");
    assert.equal(record.meaningfulChange.status, "unavailable");
    assert.ok(record.reasons.some((reason) => reason.code === "unsupported_metric"));
  }
});

test("Task 14 consumes Task 13 evidence for representative supported domains", () => {
  const result = getFitCoreAnalytics(historicalState(), { now: NOW });
  for (const id of [
    "training.volume.7d",
    "nutrition.calories.consistency",
    "recovery.detail.readiness.trend",
    "progress.bodyweight.series",
  ]) {
    const trend = result.trends.records.find((record) => record.nodeId === id)!;
    const signal = result.signals.records.find((record) => record.nodeId === id)!;
    assert.equal(signal.supported, true, id);
    assert.equal(trend.baseline.status, "ready", id);
    assert.equal(signal.meaningfulChange.status, "ready", id);
    assert.notEqual(signal.meaningfulChange.primaryWindow, null, id);
    assert.equal(
      signal.meaningfulChange.currentValue,
      trend.rollingWindows.find((window) => window.window === signal.meaningfulChange.primaryWindow)
        ?.currentValue,
      id,
    );
  }
});

test("Task 14 does not fabricate latest observations for integrated anomaly detection", () => {
  const records = getFitCoreAnalytics(historicalState(), { now: NOW }).signals.records.filter(
    (record) => record.supported,
  );
  assert.equal(records.length, 11);
  assert.ok(records.every((record) => record.anomaly.status === "unavailable"));
  assert.ok(records.every((record) => record.anomaly.value === null));
  assert.ok(
    records.every((record) =>
      record.anomaly.reasons.some((reason) => reason.code === "current_value_unavailable"),
    ),
  );
});

test("Task 14 propagates Task 12 trust exactly", () => {
  const result = getFitCoreAnalytics(historicalState(), { now: NOW });
  for (const signal of result.signals.records) {
    const trend = result.trends.records.find((record) => record.nodeId === signal.nodeId)!;
    assert.equal(signal.trustScore, trend.trust.trustScore);
    assert.equal(signal.trustLevel, trend.trust.trustLevel);
    assert.equal(signal.freshnessState, trend.trust.freshnessState);
    assert.equal(signal.traceability, trend.trust.traceability);
  }
});

test("Task 14 trust and freshness gates preserve math while controlling usability", () => {
  const result = getFitCoreAnalytics(historicalState(), { now: NOW });
  const nodeId = "nutrition.calories.consistency";
  const variants = [
    { score: 0.8, level: "high" as const, freshness: "fresh" as const, usable: true },
    { score: 0.8, level: "high" as const, freshness: "aging" as const, usable: true },
    { score: null, level: "unavailable" as const, freshness: "fresh" as const, usable: false },
    { score: 0.49, level: "low" as const, freshness: "fresh" as const, usable: false },
    { score: 0.8, level: "high" as const, freshness: "unknown" as const, usable: false },
    { score: 0.8, level: "high" as const, freshness: "stale" as const, usable: false },
    { score: 0.8, level: "high" as const, freshness: "invalid" as const, usable: false },
  ];
  let expectedClassification: string | null = null;
  for (const variant of variants) {
    const trends = {
      ...result.trends,
      records: result.trends.records.map((record) =>
        record.nodeId === nodeId
          ? {
              ...record,
              usable: variant.usable,
              trust: {
                ...record.trust,
                trustScore: variant.score,
                trustLevel: variant.level,
                freshnessState: variant.freshness,
              },
            }
          : record,
      ),
    };
    const signal = getFitCoreAnalyticsSignals({ trends }).records.find(
      (record) => record.nodeId === nodeId,
    )!;
    expectedClassification ??= signal.meaningfulChange.classification;
    assert.equal(signal.meaningfulChange.classification, expectedClassification);
    assert.equal(signal.usable, variant.usable);
  }
});

test("Task 14 empty and partial states stay explicit without fake zeros", () => {
  const empty = getFitCoreAnalytics(state(), { now: NOW }).signals;
  assert.equal(empty.records.length, 85);
  assert.ok(empty.records.every((record) => !record.usable));
  assert.ok(empty.records.every((record) => record.anomaly.classification === "unavailable"));
  assert.ok(
    empty.records.every((record) => record.meaningfulChange.classification === "unavailable"),
  );
  const partial = getFitCoreAnalytics(state({ mealEntries: historicalState().mealEntries }), {
    now: NOW,
  }).signals;
  assert.equal(
    partial.records.find((record) => record.nodeId === "nutrition.calories.consistency")
      ?.meaningfulChange.status,
    "ready",
  );
  assert.notEqual(
    partial.records.find((record) => record.nodeId === "training.volume.7d")?.meaningfulChange
      .status,
    "ready",
  );
});

test("Task 14 is deterministic, serializable, and does not mutate state or Task 13", () => {
  const input = deepFreeze(historicalState());
  const first = getFitCoreAnalytics(input, { now: NOW });
  const beforeTrends = JSON.stringify(first.trends);
  const rebuilt = getFitCoreAnalyticsSignals({ trends: deepFreeze(first.trends) });
  const repeated = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(first, repeated);
  assert.deepEqual(rebuilt, first.signals);
  assert.equal(JSON.stringify(first.trends), beforeTrends);
  assertSafe(first.signals);
  assert.deepEqual(JSON.parse(JSON.stringify(first.signals)), first.signals);
});

test("Task 14 is additive and leaves every pre-Task-14 analytics property stable", () => {
  const first = getFitCoreAnalytics(historicalState(), { now: NOW });
  const second = getFitCoreAnalytics(historicalState(), { now: NOW });
  const { signals: firstSignals, ...firstExisting } = first;
  const { signals: secondSignals, ...secondExisting } = second;
  assert.deepEqual(firstExisting, secondExisting);
  assert.deepEqual(firstSignals, secondSignals);
  assert.equal(first.schemaVersion, "1.1.0");
  assert.equal(first.analyticsVersion.engineVersion, "2.0.0");
  assert.equal(first.analyticsVersion.phase, 2);
  assert.equal(first.analyticsVersion.generatedBy, "fitcore-analytics");
});

test("Task 14 summary counts are derived, non-negative, and reconcile", () => {
  const report = getFitCoreAnalytics(historicalState(), { now: NOW }).signals;
  assert.equal(report.summary.supported + report.summary.unsupported, 85);
  assert.equal(report.summary.usable + report.summary.unusable, 85);
  const ready = report.records.filter(
    (record) => record.anomaly.status === "ready" || record.meaningfulChange.status === "ready",
  ).length;
  assert.equal(report.summary.unavailable + report.summary.insufficientData + ready, 85);
  assert.equal(
    report.summary.noMeaningfulChange +
      report.summary.meaningfulIncrease +
      report.summary.meaningfulDecrease +
      report.summary.mixedDirection,
    report.records.filter((record) => record.meaningfulChange.status === "ready").length,
  );
  Object.values(report.summary).forEach((count) => assert.ok(count >= 0));
});
