import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  METRIC_DEPENDENCY_GRAPH,
  buildFitCoreInsightInteractions,
  getFitCoreAnalytics,
  resolveFitCoreInsightInteraction,
  type FitCoreInsightVisualizationReport,
  type InsightVisualizationPacket,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);
const NODES = [
  "nutrition.protein.consistency",
  "training.volume.7d",
  "recovery.detail.energy.trend",
] as const;

function packet(
  nodeId: string,
  kind: "comparison" | "scalar" | "series",
): InsightVisualizationPacket {
  const base = {
    policy: "fitcore_insight_visualization_v1" as const,
    evidencePolicy: "fitcore_insight_evidence_v1" as const,
    candidatePolicy: "fitcore_insight_candidate_v1" as const,
    explanationPolicy: "fitcore_insight_explanation_v1" as const,
    candidateId: `${nodeId}:meaningful_increase`,
    explanationId: `${nodeId}:meaningful_increase:explanation`,
    nodeId,
    dependencyNodeIds: [
      ...METRIC_DEPENDENCY_GRAPH.find((node) => node.id === nodeId)!.dependencies,
    ],
    metricIds: [nodeId],
    defaultWindow: "days_7" as const,
    limitationKeys: [],
    accessibilityLabelKey: "analytics.visualization.accessibility.summary",
    emptyStateKey: "analytics.visualization.empty.no_supported_values" as const,
  };
  if (kind === "comparison")
    return {
      ...base,
      packetId: `${base.candidateId}:visualization:comparison_bars`,
      status: "ready",
      visualizationKind: "comparison_bars",
      dataMode: "comparison",
      data: {
        mode: "comparison",
        items: [
          { metricId: nodeId, role: "current", value: 0, unit: "grams" },
          { metricId: nodeId, role: "previous", value: 10, unit: "grams" },
        ],
        window: "days_7",
      },
      units: ["grams"],
      availableWindows: ["days_7"],
      interactions: ["inspect_value", "compare_periods", "open_detail"],
      reasonKey: "analytics.visualization.reason.comparison_available",
      safeToRender: true,
    };
  if (kind === "scalar")
    return {
      ...base,
      packetId: `${base.candidateId}:visualization:summary_metric`,
      status: "ready",
      visualizationKind: "summary_metric",
      dataMode: "scalar",
      data: {
        mode: "scalar",
        metricId: nodeId,
        value: 0,
        unit: "load",
        minimum: null,
        maximum: null,
        window: "days_7",
      },
      units: ["load"],
      availableWindows: ["days_7"],
      interactions: ["inspect_value", "open_detail"],
      reasonKey: "analytics.visualization.reason.scalar_only",
      safeToRender: true,
    };
  return {
    ...base,
    packetId: `${base.candidateId}:visualization:trend_line`,
    status: "partial",
    visualizationKind: "trend_line",
    dataMode: "series",
    data: {
      mode: "series",
      windows: ["days_7", "days_28"],
      series: [
        {
          seriesId: "primary",
          metricId: nodeId,
          unit: "score_1_10",
          points: [
            { xKey: "point.a", value: 1 },
            { xKey: "point.gap", value: null },
            { xKey: "point.c", value: 3 },
          ],
        },
        {
          seriesId: "secondary",
          metricId: `${nodeId}.secondary`,
          unit: "score_1_10",
          points: [
            { xKey: "point.a", value: 2 },
            { xKey: "point.c", value: 4 },
          ],
        },
      ],
    },
    metricIds: [nodeId, `${nodeId}.secondary`],
    units: ["score_1_10"],
    availableWindows: ["days_7", "days_28"],
    interactions: ["inspect_value", "switch_window", "toggle_series", "open_detail"],
    reasonKey: "analytics.visualization.reason.series_available",
    safeToRender: false,
  };
}

function visualizationReport(): FitCoreInsightVisualizationReport {
  const base = getFitCoreAnalytics(defaultState, { now: NOW }).visualizations;
  const packets = [
    packet(NODES[0], "comparison"),
    packet(NODES[1], "scalar"),
    packet(NODES[2], "series"),
  ];
  const byNode = new Map(packets.map((item) => [item.nodeId, item]));
  return {
    ...base,
    evaluations: base.evaluations.map((evaluation) => {
      const item = byNode.get(evaluation.nodeId);
      return item
        ? {
            ...evaluation,
            candidateId: item.candidateId,
            explanationId: item.explanationId,
            packetId: item.packetId,
            selected: true,
            status: item.status,
            visualizationKind: item.visualizationKind,
            dataMode: item.dataMode,
            safeToRender: item.safeToRender,
            reasonKey: item.reasonKey,
            limitationKeys: item.limitationKeys,
          }
        : evaluation;
    }),
    packets,
    summary: { ...base.summary, selectedCandidateCount: 3, packetCount: 3 },
  };
}

function report() {
  return buildFitCoreInsightInteractions(visualizationReport());
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function representativeResolutions() {
  const result = report();
  const comparison = result.contracts[0];
  const series = result.contracts[2];
  return [
    resolveFitCoreInsightInteraction(result, {
      kind: "inspect_value",
      contractId: comparison.contractId,
      targetType: "comparison_value",
      targetId: comparison.inspectableTargets[0].targetId,
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "inspect_value",
      contractId: series.contractId,
      targetType: "series_point",
      targetId: series.missingInspectTargetIds[0],
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "switch_window",
      contractId: series.contractId,
      window: "days_28",
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "compare_periods",
      contractId: comparison.contractId,
      comparisonId: comparison.comparisonTargets[0].targetId,
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "toggle_series",
      contractId: series.contractId,
      seriesId: "primary",
      selected: false,
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "select_region",
      contractId: comparison.contractId,
      regionId: "region.a",
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "open_detail",
      contractId: comparison.contractId,
      nodeId: comparison.detailTargets[0].nodeId,
    }),
    resolveFitCoreInsightInteraction(result, {
      kind: "inspect_value",
      contractId: comparison.contractId,
      targetType: "comparison_value",
      targetId: "SENSITIVE_FABRICATED_TARGET",
    }),
  ];
}

function largeState(): AppState {
  const days = Array.from({ length: 140 }, (_, index) => index + 1);
  return {
    ...defaultState,
    workouts: days.map((day) => ({
      id: `SENSITIVE_WORKOUT_${day}`,
      name: "SENSITIVE_WORKOUT_NAME",
      startedAt: NOW - day * 86_400_000,
      endedAt: NOW - day * 86_400_000 + 3_600_000,
      exercises: [],
    })),
    mealEntries: days.map((day) => ({
      id: `SENSITIVE_MEAL_${day}`,
      name: "SENSITIVE_MEAL_NAME",
      notes: "SENSITIVE_MEAL_NOTE",
      type: "dinner",
      createdAt: NOW - day * 86_400_000,
      calories: 2000,
      protein: 140,
      carbs: 220,
      fat: 70,
    })),
    recoveryCheckIns: days.map((day) => ({
      id: `SENSITIVE_RECOVERY_${day}`,
      createdAt: NOW - day * 86_400_000,
      soreness: 4,
      energy: 6,
      stress: 4,
      motivation: 7,
      notes: "SENSITIVE_RECOVERY_NOTE",
    })),
  };
}

test("Task 18 report covers 85 unique nodes in canonical order", () => {
  const result = report();
  assert.equal(result.evaluations.length, 85);
  assert.equal(new Set(result.evaluations.map((item) => item.nodeId)).size, 85);
  assert.deepEqual(
    result.evaluations.map((item) => item.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
});

test("Task 18 creates one ordered contract per Task 17 packet only", () => {
  const visualizations = visualizationReport();
  const result = buildFitCoreInsightInteractions(visualizations);
  assert.equal(result.contracts.length, visualizations.packets.length);
  assert.equal(
    new Set(result.contracts.map((contract) => contract.contractId)).size,
    result.contracts.length,
  );
  assert.deepEqual(
    result.contracts.map((contract) => contract.visualizationPacketId),
    visualizations.packets.map((item) => item.packetId),
  );
  assert.ok(
    result.evaluations
      .filter((item) => item.contractId !== null)
      .every((item) => NODES.includes(item.nodeId as never)),
  );
});

test("Task 18 representative summary reconciles all contracts, capabilities, and targets", () => {
  assert.deepEqual(report().summary, {
    evaluationCount: 85,
    contractCount: 3,
    readyContractCount: 2,
    limitedContractCount: 1,
    unavailableContractCount: 0,
    safeToInteractCount: 2,
    inspectValueContractCount: 3,
    switchWindowContractCount: 1,
    comparePeriodsContractCount: 1,
    toggleSeriesContractCount: 1,
    selectRegionContractCount: 0,
    openDetailContractCount: 3,
    inspectableTargetCount: 7,
    windowTargetCount: 4,
    comparisonTargetCount: 1,
    seriesTargetCount: 2,
    regionTargetCount: 0,
    detailTargetCount: 3,
  });
});

test("Task 18 representative resolutions yield five accepted, two rejected, and one unavailable", () => {
  const resolutions = representativeResolutions();
  assert.equal(resolutions.filter((item) => item.status === "accepted").length, 5);
  assert.equal(resolutions.filter((item) => item.status === "rejected").length, 2);
  assert.equal(resolutions.filter((item) => item.status === "unavailable").length, 1);
  assert.doesNotMatch(JSON.stringify(resolutions), /SENSITIVE_/);
});

test("Task 18 empty and partial aggregates remain honest", () => {
  const empty = getFitCoreAnalytics(defaultState, { now: NOW }).interactions;
  assert.equal(empty.evaluations.length, 85);
  assert.equal(empty.contracts.length, 0);
  assert.equal(empty.summary.safeToInteractCount, 0);
  const partial = getFitCoreAnalytics(
    { ...defaultState, mealEntries: largeState().mealEntries.slice(0, 10) },
    { now: NOW },
  ).interactions;
  assert.equal(partial.evaluations.length, 85);
  assert.ok(partial.contracts.every((contract) => !contract.safeToInteract));
});

test("Task 18 accepts frozen Task 17 reports without mutation", () => {
  const visualizations = deepFreeze(visualizationReport());
  const before = JSON.stringify(visualizations);
  buildFitCoreInsightInteractions(visualizations);
  assert.equal(JSON.stringify(visualizations), before);
});

test("Task 18 reports and resolutions are deterministic, serializable, and deeply frozen", () => {
  const first = report();
  const second = report();
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const resolutionsA = representativeResolutions();
  const resolutionsB = representativeResolutions();
  assert.deepEqual(resolutionsA, resolutionsB);
  assert.ok(
    Object.isFrozen(first) && Object.isFrozen(first.contracts) && Object.isFrozen(resolutionsA[0]),
  );
  assert.throws(() => (first.contracts as unknown[]).push({}));
});

test("Task 18 privacy sentinels and malformed request text never enter output", () => {
  const visualizations = visualizationReport() as FitCoreInsightVisualizationReport & {
    unknown?: unknown;
  };
  visualizations.unknown = {
    workout: "SENSITIVE_WORKOUT_NAME",
    exercise: "SENSITIVE_EXERCISE_NAME",
    meal: "SENSITIVE_MEAL_NAME",
    mealNote: "SENSITIVE_MEAL_NOTE",
    recovery: "SENSITIVE_RECOVERY_NOTE",
    sleep: "SENSITIVE_SLEEP_NOTE",
    ai: "SENSITIVE_AI_MESSAGE",
    supplement: "SENSITIVE_SUPPLEMENT",
    goal: "SENSITIVE_GOAL",
    photo: "SENSITIVE_PHOTO",
  };
  const result = buildFitCoreInsightInteractions(visualizations);
  assert.doesNotMatch(JSON.stringify(result), /SENSITIVE_/);
  const malformed = resolveFitCoreInsightInteraction(result, {
    kind: "SENSITIVE_KIND",
    contractId: "SENSITIVE_CONTRACT",
    targetId: "SENSITIVE_TARGET",
  });
  assert.doesNotMatch(JSON.stringify(malformed), /SENSITIVE_/);
});

test("Task 18 aggregate is additive and leaves Tasks 15 through 17 unchanged", () => {
  const first = getFitCoreAnalytics(defaultState, { now: NOW });
  const second = getFitCoreAnalytics(defaultState, { now: NOW });
  const { interactions: interactionsA, ...existingA } = first;
  const { interactions: interactionsB, ...existingB } = second;
  assert.deepEqual(existingA, existingB);
  assert.deepEqual(interactionsA, interactionsB);
  assert.deepEqual(existingA.insights, existingB.insights);
  assert.deepEqual(existingA.explanations, existingB.explanations);
  assert.deepEqual(existingA.visualizations, existingB.visualizations);
});

test("Task 18 large fixture completes deterministically and remains privacy-safe", () => {
  const state = deepFreeze(largeState());
  const before = JSON.stringify(state);
  const first = getFitCoreAnalytics(state, { now: NOW }).interactions;
  const second = getFitCoreAnalytics(state, { now: NOW }).interactions;
  assert.equal(first.evaluations.length, 85);
  assert.ok(first.contracts.length <= 10);
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(JSON.stringify(state), before);
  assert.doesNotMatch(JSON.stringify(first), /SENSITIVE_/);
});

test("Task 18 aggregate summary values independently reconcile", () => {
  const result = report();
  const summary = result.summary;
  assert.equal(summary.evaluationCount, result.evaluations.length);
  assert.equal(summary.contractCount, result.contracts.length);
  assert.equal(
    summary.readyContractCount + summary.limitedContractCount + summary.unavailableContractCount,
    result.contracts.length,
  );
  assert.equal(
    summary.safeToInteractCount,
    result.contracts.filter((contract) => contract.safeToInteract).length,
  );
  assert.equal(
    summary.inspectableTargetCount,
    result.contracts.reduce((sum, contract) => sum + contract.inspectableTargets.length, 0),
  );
});
