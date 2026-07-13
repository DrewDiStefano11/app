import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  FITCORE_METRIC_TRUST_POLICY_VERSION,
  METRIC_DEPENDENCY_GRAPH,
  buildFitCoreAnalyticsTrust,
  getFitCoreAnalytics,
  getGoalDetailAnalytics,
  getNutritionDetailAnalytics,
  getRecoveryDetailAnalytics,
  getExerciseAndMuscleAnalytics,
  normalizeMetricProvenance,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);

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

function timestamp(daysAgo: number): number {
  return NOW - daysAgo * 24 * 60 * 60 * 1000;
}

function richState(): AppState {
  const days = [0, 1, 2, 3, 4];
  return state({
    mealEntries: days.map((day) => ({
      id: `meal-${day}`,
      name: `Meal ${day}`,
      createdAt: timestamp(day),
      calories: 500 + day * 20,
      protein: 40 + day,
      carbs: 50,
      fat: 15,
    })),
    recoveryCheckIns: days.map((day) => ({
      id: `recovery-${day}`,
      createdAt: timestamp(day),
      energy: 5 + day,
      soreness: 7 - day,
      stress: 6 - day,
      motivation: 5 + day,
    })),
    bodyweightEntries: days.map((day) => ({
      id: `weight-${day}`,
      createdAt: timestamp(day),
      weightLb: 180 + day,
    })),
    goals: [{ id: "goal", type: "bodyweight", label: "Bodyweight", current: 184, target: 185 }],
  });
}

function assertSafe(value: unknown, path = "root"): void {
  assert.notEqual(typeof value, "function", path);
  assert.notEqual(typeof value, "symbol", path);
  assert.notEqual(typeof value, "undefined", path);
  if (typeof value === "number") assert.equal(Number.isFinite(value), true, path);
  if (Array.isArray(value))
    return value.forEach((item, index) => assertSafe(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => assertSafe(item, `${path}.${key}`));
}

test("Task 12 empty, partial, mixed, and rich states produce safe additive trust reports", () => {
  const inputs = [
    state(),
    state({
      mealEntries: [
        {
          id: "meal",
          name: "Meal",
          createdAt: NOW,
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 15,
        },
      ],
    }),
    state({ mealEntries: richState().mealEntries, recoveryCheckIns: richState().recoveryCheckIns }),
    richState(),
  ];
  for (const input of inputs) {
    const result = getFitCoreAnalytics(input, { now: NOW });
    assert.equal(result.trust.policyVersion, FITCORE_METRIC_TRUST_POLICY_VERSION);
    assert.equal(result.trust.nodes.length, 85);
    assertSafe(result.trust);
  }
});

test("Task 12 report contains every graph node exactly once in stable graph order", () => {
  const report = getFitCoreAnalytics(richState(), { now: NOW }).trust;
  const ids = report.nodes.map((item) => item.metricId);
  assert.deepEqual(
    ids,
    METRIC_DEPENDENCY_GRAPH.map((item) => item.id),
  );
  assert.equal(new Set(ids).size, 85);
  assert.equal(report.graphValid, true);
  METRIC_DEPENDENCY_GRAPH.forEach((node) => {
    node.dependencies.forEach((dependency) => assert.ok(ids.includes(dependency)));
  });
});

test("Task 12 summary counts reconcile and unresolved nodes remain explicit", () => {
  const summary = getFitCoreAnalytics(state(), { now: NOW }).trust.summary;
  assert.equal(summary.totalNodeCount, 85);
  assert.equal(
    summary.assessedNodeCount + summary.unresolvedNodeCount + summary.unavailableNodeCount,
    85,
  );
  assert.equal(
    summary.lowTrustNodeCount + summary.mediumTrustNodeCount + summary.highTrustNodeCount,
    summary.assessedNodeCount,
  );
  assert.ok(summary.unresolvedNodeCount > 0);
});

test("Task 12 derived presentation, correlation, and insight trust never exceeds resolved dependencies", () => {
  const report = getFitCoreAnalytics(richState(), { now: NOW }).trust;
  const byId = new Map(report.nodes.map((item) => [item.metricId, item]));
  for (const node of METRIC_DEPENDENCY_GRAPH.filter((item) =>
    ["presentation", "correlation", "insight_readiness"].includes(item.category),
  )) {
    const assessment = byId.get(node.id);
    if (assessment?.score === null) continue;
    for (const dependencyId of node.dependencies) {
      const dependency = byId.get(dependencyId);
      if (dependency?.score !== null && dependency?.score !== undefined) {
        assert.ok(
          assessment.score <= dependency.score,
          `${node.id} must not exceed ${dependencyId}`,
        );
      }
    }
  }
});

test("Task 12 invalid exclusions and stale recovery evidence remain visible", () => {
  const invalid = getFitCoreAnalytics(
    state({
      mealEntries: [
        {
          id: "bad",
          name: "Bad",
          createdAt: NOW,
          calories: Number.NaN,
          protein: 20,
          carbs: 30,
          fat: 10,
        },
      ],
      recoveryCheckIns: [
        { id: "old", createdAt: timestamp(5), energy: 6, soreness: 5, stress: 4, motivation: 6 },
      ],
    }),
    { now: NOW },
  );
  const mealSource = invalid.trust.nodes.find(
    (item) => item.metricId === "nutrition.detail.source",
  );
  const recoverySource = invalid.trust.nodes.find(
    (item) => item.metricId === "recovery.detail.source",
  );
  assert.ok(mealSource?.quality.evidence.excludedRecordCount);
  assert.equal(recoverySource?.freshness.state, "stale");
});

test("Task 12 stale bodyweight evidence limits the dependent protein metric", () => {
  const result = getFitCoreAnalytics(
    state({
      mealEntries: [
        {
          id: "meal",
          name: "Meal",
          createdAt: NOW,
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 15,
        },
      ],
      bodyweightEntries: [{ id: "old-weight", createdAt: timestamp(40), weightLb: 180 }],
    }),
    { now: NOW },
  );
  const assessment = result.trust.nodes.find(
    (item) => item.metricId === "nutrition.protein.per_bodyweight",
  );
  assert.equal(assessment?.freshness.state, "stale");
  assert.ok((assessment?.score ?? 1) <= 0.49);
});

test("Task 12 missing, mixed, and derived provenance are consumed without mutation", () => {
  const analytics = getFitCoreAnalytics(richState(), { now: NOW });
  const mixed = normalizeMetricProvenance({
    sourceType: "mixed",
    sourceIds: ["a", "b"],
    derivation: "mixed",
  });
  const derived = normalizeMetricProvenance({
    sourceType: "derived",
    sourceIds: ["nutrition.detail.source"],
    derivation: "derived",
  });
  const before = JSON.stringify({ mixed, derived });
  const missingReport = buildFitCoreAnalyticsTrust(analytics, NOW, { defaultProvenance: null });
  const report = buildFitCoreAnalyticsTrust(analytics, NOW, {
    defaultProvenance: mixed,
    provenanceByNodeId: { "presentation.nutrition.meals.count_today": derived },
  });
  assert.ok(
    missingReport.nodes.some((item) => item.limitingFactors.includes("unknown_provenance")),
  );
  assert.equal(
    report.nodes.find((item) => item.metricId === "nutrition.detail.source")?.provenance?.type,
    "mixed",
  );
  assert.equal(
    report.nodes.find((item) => item.metricId === "presentation.nutrition.meals.count_today")
      ?.provenance?.type,
    "derived",
  );
  assert.equal(JSON.stringify({ mixed, derived }), before);
});

test("Task 12 output is deterministic, serializable, and state immutable", () => {
  const input = richState();
  const before = JSON.stringify(input);
  const first = getFitCoreAnalytics(input, { now: NOW });
  const repeated = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(first, repeated);
  assert.deepEqual(JSON.parse(JSON.stringify(first.trust)), first.trust);
  assertSafe(first.trust);
  assert.equal(JSON.stringify(input), before);
});

test("Task 12 evaluation time changes freshness without mutating existing analytics values", () => {
  const analytics = getFitCoreAnalytics(richState(), { now: NOW });
  const fresh = buildFitCoreAnalyticsTrust(analytics, NOW, {
    defaultProvenance: analytics.provenance,
  });
  const later = buildFitCoreAnalyticsTrust(analytics, NOW + 20 * 24 * 60 * 60 * 1000, {
    defaultProvenance: analytics.provenance,
  });
  assert.notDeepEqual(fresh, later);
  assert.deepEqual(analytics.domains, getFitCoreAnalytics(richState(), { now: NOW }).domains);
});

test("Task 12 leaves Phase 1 domains, correlations, and insight readiness unchanged", () => {
  const input = richState();
  const result = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(result.domains.training, getExerciseAndMuscleAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.nutrition, getNutritionDetailAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.recovery, getRecoveryDetailAnalytics(input, { now: NOW }));
  assert.deepEqual(result.domains.goals, getGoalDetailAnalytics(input, { now: NOW }));
  const repeated = getFitCoreAnalytics(input, { now: NOW });
  assert.deepEqual(result.correlations, repeated.correlations);
  assert.deepEqual(result.insightReadiness, repeated.insightReadiness);
});
