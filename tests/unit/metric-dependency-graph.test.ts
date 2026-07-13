import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  METRIC_DEPENDENCY_GRAPH,
  METRIC_DEPENDENCY_NODE_CATEGORIES,
  assertValidMetricDependencyGraph,
  getDirectMetricDependencies,
  getDirectMetricDependents,
  getMetricDependencyGraph,
  getMetricDependencyNode,
  getMetricDependencyTopologicalOrder,
  getTransitiveMetricDependencies,
  validateMetricDependencyGraph,
  type MetricDependencyNode,
} from "../../src/lib/analytics.ts";

test("Task 11 dependency graph is unique, resolved, acyclic, deterministic, and serializable", () => {
  const validation = validateMetricDependencyGraph();
  const ids = METRIC_DEPENDENCY_GRAPH.map((item) => item.id);
  assert.deepEqual(validation, { valid: true, errors: [] });
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [...ids].sort());
  assert.doesNotThrow(() => assertValidMetricDependencyGraph());
  assert.doesNotThrow(() => JSON.stringify(METRIC_DEPENDENCY_GRAPH));
  for (const item of METRIC_DEPENDENCY_GRAPH) {
    assert.equal(new Set(item.dependencies).size, item.dependencies.length);
    assert.equal(item.dependencies.includes(item.id), false);
    assert.deepEqual(item.dependencies, [...item.dependencies].sort());
    item.dependencies.forEach((dependency) => assert.equal(ids.includes(dependency), true));
  }
});

test("Task 11 graph lookup and dependency traversal are safe and deterministic", () => {
  const correlationId = "correlation.calories.bodyweight";
  assert.deepEqual(getMetricDependencyNode(correlationId), {
    id: correlationId,
    category: "correlation",
    dependencies: ["nutrition.calories.consistency", "progress.bodyweight.series"],
    domain: "cross_domain",
  });
  assert.deepEqual(getDirectMetricDependencies(correlationId), [
    "nutrition.calories.consistency",
    "progress.bodyweight.series",
  ]);
  assert.deepEqual(getTransitiveMetricDependencies(correlationId), [
    "nutrition.calories.consistency",
    "nutrition.detail.source",
    "progress.bodyweight.series",
    "source.state.bodyweightEntries",
    "source.state.mealEntries",
  ]);
  assert.ok(getDirectMetricDependents(correlationId).includes("insight.calories.bodyweight_trend"));
  assert.equal(getMetricDependencyNode("unknown.metric"), null);
  assert.deepEqual(getDirectMetricDependencies("unknown.metric"), []);
  assert.deepEqual(getTransitiveMetricDependencies("unknown.metric"), []);
  assert.deepEqual(getDirectMetricDependents("unknown.metric"), []);
});

test("Task 11 topological ordering places every dependency before its consumer", () => {
  const first = getMetricDependencyTopologicalOrder();
  const repeated = getMetricDependencyTopologicalOrder();
  assert.deepEqual(first, repeated);
  assert.equal(first.length, METRIC_DEPENDENCY_GRAPH.length);
  assert.equal(new Set(first).size, first.length);
  for (const item of METRIC_DEPENDENCY_GRAPH) {
    item.dependencies.forEach((dependency) => {
      assert.ok(first.indexOf(dependency) < first.indexOf(item.id));
    });
  }
});

test("Task 11 graph covers real Phase 1 layers and representative IDs", () => {
  assert.deepEqual(
    [...new Set(METRIC_DEPENDENCY_GRAPH.map((item) => item.category))].sort(),
    [...METRIC_DEPENDENCY_NODE_CATEGORIES].sort(),
  );
  for (const id of [
    "source.state.workouts",
    "training.detail.source",
    "nutrition.protein.per_bodyweight",
    "recovery.detail.readiness.trend",
    "progress.goals.detail.source",
    "aggregate.fitcore.confidence",
    "correlation.training_volume.recovery_readiness",
    "presentation.nutrition.meals.count_today",
    "insight.goal.deadline_risk",
  ]) {
    assert.notEqual(getMetricDependencyNode(id), null, id);
  }
});

test("Task 11 graph copies protect shared metadata and invalid authored graphs report exact errors", () => {
  const copy = getMetricDependencyGraph();
  copy[0].dependencies.push("mutation");
  assert.equal(METRIC_DEPENDENCY_GRAPH[0].dependencies.includes("mutation"), false);

  const invalid: MetricDependencyNode[] = [
    { id: "a", category: "detail", dependencies: ["b", "b"] },
    { id: "b", category: "detail", dependencies: ["missing"] },
    { id: "b", category: "detail", dependencies: ["a"] },
  ];
  const validation = validateMetricDependencyGraph(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("duplicate_node:b"));
  assert.ok(validation.errors.includes("duplicate_dependency:a"));
  assert.ok(validation.errors.includes("unresolved_dependency:b:missing"));
  assert.ok(validation.errors.some((error) => error.startsWith("cycle:")));
  assert.deepEqual(getMetricDependencyTopologicalOrder(invalid), []);
  assert.throws(() => assertValidMetricDependencyGraph(invalid), /Invalid metric dependency graph/);
});
