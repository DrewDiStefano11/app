import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  FITCORE_ANALYTICS_PRESENTATION_CATALOG,
  FITCORE_ANALYTICS_PRESENTATION_SURFACES,
  FITCORE_ANALYTICS_PRESENTATION_VERSION,
  FITCORE_PRESENTATION_STATE_PRECEDENCE,
  buildFitCoreAnalyticsPresentation,
  getFitCoreAnalytics,
  getFitCoreAnalyticsPresentation,
  type AnalyticsPresentationMetricDefinition,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0).getTime();

function timestamp(daysAgo: number): number {
  const date = new Date(2026, 2, 7, 12, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
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
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${path} must be finite`);
  if (Array.isArray(value))
    return value.forEach((item, index) => assertSafe(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => assertSafe(item, `${path}.${key}`));
}

function richState(): AppState {
  return state({
    mealEntries: [
      {
        id: "meal-b",
        name: "Meal B",
        createdAt: timestamp(0),
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
      },
      {
        id: "meal-a",
        name: "Meal A",
        createdAt: timestamp(1),
        calories: 600,
        protein: 45,
        carbs: 60,
        fat: 20,
      },
      {
        id: "meal-c",
        name: "Meal C",
        createdAt: timestamp(2),
        calories: 550,
        protein: 42,
        carbs: 55,
        fat: 18,
      },
    ],
    recoveryCheckIns: [
      {
        id: "recovery-b",
        createdAt: timestamp(0),
        energy: 7,
        soreness: 3,
        stress: 4,
        motivation: 8,
      },
      {
        id: "recovery-a",
        createdAt: timestamp(1),
        energy: 6,
        soreness: 4,
        stress: 5,
        motivation: 7,
      },
      {
        id: "recovery-c",
        createdAt: timestamp(2),
        energy: 8,
        soreness: 2,
        stress: 3,
        motivation: 8,
      },
    ],
    goals: [{ id: "goal", type: "bodyweight", label: "Goal", current: 180, target: 175 }],
  });
}

test("Task 9 requirements 1-8: both APIs return equivalent versioned envelopes", () => {
  const aggregate = getFitCoreAnalytics(richState(), { now: NOW });
  const built = buildFitCoreAnalyticsPresentation(aggregate);
  const selected = getFitCoreAnalyticsPresentation(richState(), { now: NOW });
  assert.deepEqual(selected, built);
  assert.equal(selected.presentationVersion, FITCORE_ANALYTICS_PRESENTATION_VERSION);
  assert.equal(selected.analyticsSchemaVersion, aggregate.schemaVersion);
  assert.equal(selected.generatedAt, aggregate.generatedAt);
  assert.deepEqual(selected.range, aggregate.range);
});

test("Task 9 requirements 9-10, 83-85: state, options, aggregate, and catalog stay immutable", () => {
  const input = deepFreeze(richState());
  const options = deepFreeze({ now: NOW, nutrition: { days: 7 } });
  const aggregate = deepFreeze(getFitCoreAnalytics(input, options));
  const stateBefore = JSON.stringify(input);
  const optionsBefore = JSON.stringify(options);
  const aggregateBefore = JSON.stringify(aggregate);
  buildFitCoreAnalyticsPresentation(aggregate);
  getFitCoreAnalyticsPresentation(input, options);
  assert.equal(JSON.stringify(input), stateBefore);
  assert.equal(JSON.stringify(options), optionsBefore);
  assert.equal(JSON.stringify(aggregate), aggregateBefore);
  assert.ok(Object.isFrozen(FITCORE_ANALYTICS_PRESENTATION_CATALOG));
});

test("Task 9 requirements 11-20: explicit catalog is stable, unique, and resolves", () => {
  const result = getFitCoreAnalyticsPresentation(richState(), { now: NOW });
  const ids = FITCORE_ANALYTICS_PRESENTATION_CATALOG.map((entry) => entry.presentationId);
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(result.metricOrder, ids);
  for (const definition of FITCORE_ANALYTICS_PRESENTATION_CATALOG) {
    assert.ok(["training", "nutrition", "recovery", "goals"].includes(definition.domain));
    assert.equal(
      result.metrics[definition.presentationId]?.sourceMetricId,
      definition.sourceMetricId,
    );
    assert.notEqual(
      result.metrics[definition.presentationId]?.reasonCodes.includes(
        "catalog_source_metric_missing",
      ),
      true,
    );
  }
});

test("Task 9 requirements 21-36: metrics preserve values, states, confidence, sources, and algorithms", () => {
  const aggregate = getFitCoreAnalytics(richState(), { now: NOW });
  const result = buildFitCoreAnalyticsPresentation(aggregate);
  const today = result.metrics["nutrition.meals.count_today"];
  assert.equal(today.value, aggregate.domains.nutrition.mealCounts.today.value);
  assert.equal(today.confidence, aggregate.domains.nutrition.mealCounts.today.confidence);
  assert.deepEqual(today.sourceIds, aggregate.domains.nutrition.mealCounts.today.source.entryIds);
  assert.equal(
    today.exclusionCount,
    aggregate.domains.nutrition.mealCounts.today.source.excludedRecordCount,
  );
  assert.ok(
    today.algorithmVersion?.includes(
      aggregate.domains.nutrition.mealCounts.today.source.calculationId,
    ),
  );
  assertSafe(result);
  assert.equal(JSON.stringify(result).includes("NaN"), false);
  assert.equal(JSON.stringify(result).includes("Infinity"), false);
});

test("Task 9 requirements 23-27: unsupported, stale, needs-more-data, and unavailable remain distinct", () => {
  const result = getFitCoreAnalyticsPresentation(state(), { now: NOW });
  assert.equal(result.metrics["recovery.detail.soreness.trend"].state, "unavailable");
  assert.equal(result.metrics["nutrition.calories.consistency"].state, "needs_more_data");
  assert.deepEqual(FITCORE_PRESENTATION_STATE_PRECEDENCE, [
    "unsupported",
    "unavailable",
    "stale",
    "needs_more_data",
    "partial",
    "ready",
  ]);
  assert.notEqual(result.metrics["nutrition.protein.per_bodyweight"].value, 0);
});

test("Task 9 requirements 37-52: all ten surfaces are explicit analytics-only bundles", () => {
  const result = getFitCoreAnalyticsPresentation(richState(), { now: NOW });
  assert.equal(FITCORE_ANALYTICS_PRESENTATION_SURFACES.length, 10);
  assert.deepEqual(result.surfaceOrder, [...FITCORE_ANALYTICS_PRESENTATION_SURFACES]);
  for (const surface of FITCORE_ANALYTICS_PRESENTATION_SURFACES) {
    const bundle = result.surfaces[surface];
    assert.equal(bundle.id, surface);
    assert.equal(bundle.sections.length, 1);
    for (const id of bundle.metricIds) assert.ok(result.metrics[id]);
  }
  const serialized = JSON.stringify(result.surfaces);
  for (const forbidden of [
    "healthScore",
    "recommendation",
    "correlation",
    "causal",
    "weightedTotal",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("Task 9 requirements 41-48: surface metrics retain approved domain provenance", () => {
  const result = getFitCoreAnalyticsPresentation(richState(), { now: NOW });
  for (const id of result.surfaces["training.deepDive"].metricIds)
    assert.equal(result.metrics[id].domain, "training");
  for (const id of result.surfaces["nutrition.deepDive"].metricIds)
    assert.equal(result.metrics[id].domain, "nutrition");
  for (const id of result.surfaces["recovery.deepDive"].metricIds)
    assert.equal(result.metrics[id].domain, "recovery");
  assert.ok(
    new Set(result.surfaces["stats.deepDive"].metricIds.map((id) => result.metrics[id].domain))
      .size > 1,
  );
});

test("Task 9 requirements 53-60: domain summaries contain exact metric-state counts", () => {
  const result = getFitCoreAnalyticsPresentation(richState(), { now: NOW });
  for (const domain of ["training", "nutrition", "recovery", "goals"] as const) {
    const metrics = Object.values(result.metrics).filter((metric) => metric.domain === domain);
    const summary = result.domains[domain];
    assert.equal(
      summary.readyMetricCount,
      metrics.filter((metric) => metric.state === "ready").length,
    );
    assert.equal(
      summary.partialMetricCount,
      metrics.filter((metric) => metric.state === "partial").length,
    );
    assert.equal(
      summary.unsupportedMetricCount,
      metrics.filter((metric) => metric.state === "unsupported").length,
    );
    assert.equal(
      summary.staleMetricCount,
      metrics.filter((metric) => metric.state === "stale").length,
    );
  }
});

test("Task 9 requirements 61-68: aggregate summary preserves Task 8 metadata without a score", () => {
  const aggregate = getFitCoreAnalytics(richState(), { now: NOW });
  const summary = buildFitCoreAnalyticsPresentation(aggregate).aggregate;
  assert.equal(summary.usableDomainCount, aggregate.completeness.usableDomainCount);
  assert.equal(summary.partialDomainCount, aggregate.completeness.partialDomainCount);
  assert.equal(summary.unavailableDomainCount, aggregate.completeness.unavailableDomainCount);
  assert.equal(summary.minimumConfidence, aggregate.confidence.level);
  assert.equal(
    summary.sufficientMultiDomainEvidence,
    aggregate.confidence.sufficientMultiDomainEvidence,
  );
  assert.equal("score" in summary, false);
  assert.equal("recommendation" in summary, false);
});

test("Task 9 requirements 69-72: missing catalog source is structured contract drift", () => {
  const aggregate = getFitCoreAnalytics(richState(), { now: NOW });
  const catalog = FITCORE_ANALYTICS_PRESENTATION_CATALOG.map((entry) => ({ ...entry }));
  const first = catalog[0];
  catalog[0] = { ...first, sourceMetricId: "training.missing.contract" };
  const result = buildFitCoreAnalyticsPresentation(aggregate, { catalog });
  const metric = result.metrics[first.presentationId];
  assert.equal(metric.state, "unavailable");
  assert.equal(metric.value, null);
  assert.deepEqual(metric.reasonCodes, ["catalog_source_metric_missing"]);
});

test("Task 9 requirement 73: catalog collisions fail deterministically", () => {
  const duplicate = {
    ...FITCORE_ANALYTICS_PRESENTATION_CATALOG[0],
  } as AnalyticsPresentationMetricDefinition;
  const catalog = [...FITCORE_ANALYTICS_PRESENTATION_CATALOG, duplicate];
  assert.throws(
    () =>
      buildFitCoreAnalyticsPresentation(getFitCoreAnalytics(state(), { now: NOW }), { catalog }),
    new Error(`catalog_collision:${duplicate.presentationId}`),
  );
});

test("Task 9 requirements 74-82: empty, single-domain, mixed invalid, and unsupported states are safe", () => {
  const variants = [
    state(),
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
    state({
      recoveryCheckIns: [
        {
          id: "recovery",
          createdAt: timestamp(0),
          energy: 7,
          soreness: 3,
          stress: 4,
          motivation: 8,
        },
      ],
    }),
    state({
      goals: [{ id: "goal", type: "bodyweight", label: "Goal", current: 180, target: 175 }],
    }),
    state({
      mealEntries: [
        {
          id: "bad",
          name: "Bad",
          createdAt: Number.NaN,
          calories: Number.POSITIVE_INFINITY,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      ],
    }),
  ];
  for (const input of variants) assertSafe(getFitCoreAnalyticsPresentation(input, { now: NOW }));
});

test("Task 9 requirements 86-87: repeated and reversed equivalent inputs are byte-stable", () => {
  const input = richState();
  const repeatedA = getFitCoreAnalyticsPresentation(input, { now: NOW });
  const repeatedB = getFitCoreAnalyticsPresentation(input, { now: NOW });
  const reversed = getFitCoreAnalyticsPresentation(
    {
      ...input,
      mealEntries: [...input.mealEntries].reverse(),
      recoveryCheckIns: [...input.recoveryCheckIns].reverse(),
    },
    { now: NOW },
  );
  assert.equal(JSON.stringify(repeatedA), JSON.stringify(repeatedB));
  assert.deepEqual(repeatedA, reversed);
});

test("Task 9 requirements 97-98: Task 8 shape and stable IDs remain unchanged", () => {
  const aggregate = getFitCoreAnalytics(richState(), { now: NOW });
  const before = JSON.stringify(aggregate);
  const result = buildFitCoreAnalyticsPresentation(aggregate);
  assert.equal(JSON.stringify(aggregate), before);
  for (const entry of FITCORE_ANALYTICS_PRESENTATION_CATALOG) {
    assert.equal(result.metrics[entry.presentationId].sourceMetricId, entry.sourceMetricId);
  }
});
