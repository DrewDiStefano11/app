import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  METRIC_DEPENDENCY_GRAPH,
  buildFitCoreAnalyticsTrust,
  getFitCoreAnalytics,
  getFitCoreAnalyticsTrends,
  normalizeMetricProvenance,
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
function historicalState(startDay = 1, endDay = 70): AppState {
  const days = Array.from({ length: endDay - startDay + 1 }, (_, index) => startDay + index);
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
function assertSafe(value: unknown): void {
  assert.notEqual(typeof value, "function");
  assert.notEqual(typeof value, "symbol");
  assert.notEqual(typeof value, "undefined");
  if (typeof value === "number") assert.equal(Number.isFinite(value), true);
  if (Array.isArray(value)) return value.forEach(assertSafe);
  if (value && typeof value === "object") Object.values(value).forEach(assertSafe);
}
function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

test("Task 13 report covers all 85 graph nodes in canonical order", () => {
  const result = getFitCoreAnalytics(historicalState(), { now: NOW });
  assert.equal(result.trends.records.length, 85);
  assert.equal(new Set(result.trends.records.map((record) => record.nodeId)).size, 85);
  assert.deepEqual(
    result.trends.records.map((record) => record.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
  assert.equal(result.trends.supportedNodeCount, 11);
});

test("Task 13 unsupported snapshot, aggregate, presentation, correlation, and insight nodes stay explicit", () => {
  const records = getFitCoreAnalytics(historicalState(), { now: NOW }).trends.records;
  for (const id of [
    "nutrition.meals.count_today",
    "aggregate.fitcore.confidence",
    "presentation.nutrition.meals.count_today",
    "correlation.calories.bodyweight",
    "insight.calories.bodyweight_trend",
  ]) {
    const record = records.find((item) => item.nodeId === id)!;
    assert.equal(record.supported, false);
    assert.equal(record.usable, false);
    assert.equal(record.baseline.status, "unavailable");
    assert.ok(
      record.rollingWindows.every(
        (window) => window.status === "unavailable" && window.direction === "unavailable",
      ),
    );
    assert.ok(record.reasons.some((reason) => reason.code === "no_series_adapter"));
  }
});

test("Task 13 supported adapters use actual training, nutrition, recovery, and bodyweight history", () => {
  const records = getFitCoreAnalytics(historicalState(), { now: NOW }).trends.records;
  for (const id of [
    "training.volume.7d",
    "nutrition.calories.consistency",
    "recovery.detail.readiness.trend",
    "progress.bodyweight.series",
  ]) {
    const record = records.find((item) => item.nodeId === id)!;
    assert.equal(record.supported, true, id);
    assert.equal(record.baseline.status, "ready", id);
    assert.equal(
      record.rollingWindows.find((window) => window.window === "days_7")?.status,
      "ready",
      id,
    );
  }
});

test("Task 13 carries Task 12 trust exactly and low trust remains unusable", () => {
  const result = getFitCoreAnalytics(historicalState(), { now: NOW });
  const trend = result.trends.records.find(
    (record) => record.nodeId === "nutrition.calories.consistency",
  )!;
  const trust = result.trust.nodes.find((node) => node.metricId === trend.nodeId)!;
  assert.deepEqual(trend.trust, {
    trustScore: trust.score,
    trustLevel: trust.level,
    freshnessState: trust.freshness.state,
    traceability: trust.provenance?.traceability ?? null,
    provenanceType: trust.provenance?.type ?? null,
  });
  assert.deepEqual(trend.dependencyIds, ["nutrition.detail.source"]);
  assert.equal(trend.usable, false);
  assert.ok(trend.reasons.some((reason) => reason.code === "low_trust"));
});

test("Task 13 known provenance can make sufficiently trusted fresh history usable without exceeding trust", () => {
  const input = historicalState();
  const analytics = getFitCoreAnalytics(input, { now: NOW });
  const known = normalizeMetricProvenance({ sourceType: "manual", sourceIds: ["source"] });
  const trust = buildFitCoreAnalyticsTrust(analytics, NOW, { defaultProvenance: known });
  const report = getFitCoreAnalyticsTrends(input, { ...analytics, trust }, NOW);
  const record = report.records.find((item) => item.nodeId === "nutrition.calories.consistency")!;
  assert.equal(
    record.trust.trustScore,
    trust.nodes.find((item) => item.metricId === record.nodeId)?.score ?? null,
  );
  if (
    record.trust.trustScore !== null &&
    record.trust.trustScore >= 0.5 &&
    ["fresh", "aging"].includes(record.trust.freshnessState)
  )
    assert.equal(record.usable, true);
});

test("Task 13 stale history preserves baseline math but is unusable", () => {
  const input = historicalState(8, 70);
  const analytics = getFitCoreAnalytics(input, { now: NOW });
  const staleTrust = {
    ...analytics.trust,
    nodes: analytics.trust.nodes.map((node) =>
      node.metricId === "nutrition.calories.consistency"
        ? {
            ...node,
            score: 0.49,
            level: "low" as const,
            freshness: { ...node.freshness, state: "stale" as const, score: 0.25 },
          }
        : node,
    ),
  };
  const report = getFitCoreAnalyticsTrends(input, { ...analytics, trust: staleTrust }, NOW);
  const record = report.records.find((item) => item.nodeId === "nutrition.calories.consistency")!;
  assert.equal(record.baseline.status, "ready");
  assert.equal(record.trust.freshnessState, "stale");
  assert.equal(record.usable, false);
  assert.ok(record.reasons.some((reason) => reason.code === "stale_freshness"));
});

test("Task 13 null trust and invalid or unknown freshness preserve math but remain unusable", () => {
  const input = historicalState();
  const analytics = getFitCoreAnalytics(input, { now: NOW });
  const variants = [
    {
      score: null,
      level: "unavailable" as const,
      freshness: "fresh" as const,
      reason: "low_trust",
    },
    {
      score: 0.8,
      level: "high" as const,
      freshness: "invalid" as const,
      reason: "invalid_freshness",
    },
    {
      score: 0.8,
      level: "high" as const,
      freshness: "unknown" as const,
      reason: "unknown_freshness",
    },
  ];
  for (const variant of variants) {
    const trust = {
      ...analytics.trust,
      nodes: analytics.trust.nodes.map((node) =>
        node.metricId === "nutrition.calories.consistency"
          ? {
              ...node,
              score: variant.score,
              level: variant.level,
              freshness: { ...node.freshness, state: variant.freshness },
            }
          : node,
      ),
    };
    const record = getFitCoreAnalyticsTrends(input, { ...analytics, trust }, NOW).records.find(
      (item) => item.nodeId === "nutrition.calories.consistency",
    )!;
    assert.equal(record.baseline.status, "ready");
    assert.equal(record.usable, false);
    assert.ok(record.reasons.some((reason) => reason.code === variant.reason));
  }
});

test("Task 13 empty and partial states remain explicit, safe, and serializable", () => {
  const empty = getFitCoreAnalytics(state(), { now: NOW }).trends;
  assert.equal(empty.records.length, 85);
  assert.ok(
    empty.records.every((record) =>
      record.rollingWindows.every((window) => window.direction === "unavailable"),
    ),
  );
  const partial = getFitCoreAnalytics(state({ mealEntries: historicalState().mealEntries }), {
    now: NOW,
  }).trends;
  assert.equal(
    partial.records.find((record) => record.nodeId === "nutrition.calories.consistency")?.baseline
      .status,
    "ready",
  );
  assert.equal(
    partial.records.find((record) => record.nodeId === "progress.bodyweight.series")?.baseline
      .status,
    "unavailable",
  );
  assertSafe(partial);
  assert.deepEqual(JSON.parse(JSON.stringify(partial)), partial);
});

test("Task 13 summary counts reconcile without double-counting", () => {
  const report = getFitCoreAnalytics(historicalState(), { now: NOW }).trends;
  assert.equal(report.summary.supported + report.summary.unsupported, 85);
  assert.equal(report.summary.supported, report.supportedNodeCount);
  assert.equal(
    report.summary.unavailable +
      report.summary.insufficientData +
      report.summary.increasing +
      report.summary.decreasing +
      report.summary.stable,
    85,
  );
  Object.values(report.summary).forEach((count) => assert.ok(count >= 0));
});

test("Task 13 is deterministic, excludes future/malformed evidence, and does not mutate state or trust", () => {
  const mutable = historicalState();
  mutable.mealEntries.push({
    id: "future",
    name: "Future",
    type: "meal",
    createdAt: timestamp(-1),
    calories: 9999,
    protein: 999,
    carbs: 999,
    fat: 999,
  });
  mutable.bodyweightEntries.push({
    id: "bad",
    createdAt: Number.NaN,
    weightLb: Number.POSITIVE_INFINITY,
  });
  const input = deepFreeze(mutable);
  const before = JSON.stringify(input);
  const first = getFitCoreAnalytics(input, { now: NOW });
  const repeated = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(first, repeated);
  assert.equal(JSON.stringify(input), before);
  assertSafe(first.trends);
  const calories = first.trends.records.find(
    (record) => record.nodeId === "nutrition.calories.consistency",
  )!;
  assert.ok(
    calories.rollingWindows.some((window) =>
      window.reasons.some((reason) => reason.code === "future_point_excluded"),
    ),
  );
  assert.ok(calories.rollingWindows.every((window) => window.currentValue !== 9999));
});

test("Task 13 integration is additive and preserves versions, domains, provenance, trust, correlations, and readiness", () => {
  const input = historicalState();
  const result = getFitCoreAnalytics(input, { now: NOW });
  const rebuiltTrust = buildFitCoreAnalyticsTrust(result, NOW, {
    defaultProvenance: result.provenance,
  });
  assert.equal(result.schemaVersion, "1.1.0");
  assert.equal(result.analyticsVersion.engineVersion, "2.0.0");
  assert.equal(result.analyticsVersion.phase, 2);
  assert.equal(result.analyticsVersion.generatedBy, "fitcore-analytics");
  assert.deepEqual(result.trust, rebuiltTrust);
  const repeated = getFitCoreAnalytics(input, { now: NOW });
  for (const key of [
    "domains",
    "correlations",
    "insightReadiness",
    "provenance",
    "dependencyGraph",
    "trust",
  ] as const)
    assert.deepEqual(result[key], repeated[key]);
});
