import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  METRIC_DEPENDENCY_GRAPH,
  buildFitCoreInsightVisualizations,
  getFitCoreAnalytics,
  type FitCoreAnalyticsExplanationReport,
  type FitCoreAnalyticsInsightReport,
  type InsightCandidate,
  type InsightExplanationPacket,
  type InsightVisualizationDerivedData,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);
const SELECTED_IDS = [
  "nutrition.protein.consistency",
  "training.volume.7d",
  "recovery.detail.energy.trend",
] as const;

function candidate(nodeId: string, index: number): InsightCandidate {
  const observation = index === 2 ? "meaningful_decrease" : "meaningful_increase";
  const direction = index === 2 ? "decreasing" : "increasing";
  const dependencyNodeIds = METRIC_DEPENDENCY_GRAPH.find(
    (node) => node.id === nodeId,
  )!.dependencies;
  return {
    policy: "fitcore_insight_candidate_v1",
    candidateId: `${nodeId}:${observation}`,
    nodeId,
    status: "selected",
    observationType: observation,
    titleKey: `insight.${observation}.title`,
    summaryKey: `insight.${observation}.summary`,
    direction,
    primaryWindow: "days_7",
    evidenceStrength: "well_supported",
    reviewPriority: "high",
    sourceNodeIds: [nodeId, ...dependencyNodeIds],
    supportingLayerCount: 2,
    evidence: {
      policy: "fitcore_insight_evidence_v1",
      nodeId,
      status: "complete",
      metricValue: index === 2 ? 90 : 110,
      unit: index === 0 ? "grams" : index === 1 ? "load" : "score_1_10",
      baselineStatus: "ready",
      baselineCenter: 100,
      trendStatus: "ready",
      trendDirection: direction,
      trendWindow: "days_7",
      trendSupportingWindowCount: 1,
      anomalyStatus: "unavailable",
      anomalyClassification: "unavailable",
      changeStatus: "ready",
      changeClassification: observation,
      trustScore: 0.85,
      trustLevel: "high",
      freshnessState: "fresh",
      traceability: 0.9,
      provenanceTypes: ["manual"],
      insightReadiness: "ready",
      dependencyNodeIds: [...dependencyNodeIds],
      sourceTypes: [
        "metric_value",
        "rolling_trend",
        "meaningful_change",
        "trust",
        "provenance",
        "insight_readiness",
        "dependency_context",
      ],
      reasons: [{ code: "evidence_complete", message: "complete" }],
    },
    reasons: [{ code: "candidate_selected", message: "selected" }],
  };
}

function explanation(item: InsightCandidate, index: number): InsightExplanationPacket {
  const safe = index !== 2;
  const unit = item.evidence.unit!;
  return {
    policy: "fitcore_insight_explanation_v1",
    explanationId: `${item.candidateId}:explanation`,
    candidateId: item.candidateId,
    nodeId: item.nodeId,
    status: safe ? "complete" : "partial",
    observationType: item.observationType,
    claimKey: `explanation.${item.observationType}.claim`,
    summaryKey: `explanation.${item.observationType}.summary`,
    whyShownKey: `explanation.${item.observationType}.why_shown`,
    direction: item.direction,
    primaryWindow: item.primaryWindow,
    facts: [
      {
        factId: `${item.candidateId}:current`,
        kind: "rolling_change",
        labelKey: "fact.trend.current_value",
        value: index === 2 ? 90 : 110,
        comparisonValue: null,
        unit,
        direction: item.direction,
        window: "days_7",
        sourceNodeIds: [item.nodeId],
      },
      {
        factId: `${item.candidateId}:previous`,
        kind: "rolling_change",
        labelKey: "fact.trend.previous_value",
        value: 100,
        comparisonValue: null,
        unit,
        direction: item.direction,
        window: "days_7",
        sourceNodeIds: [item.nodeId],
      },
    ],
    attribution: {
      policy: "fitcore_evidence_attribution_v1",
      attributionId: `${item.nodeId}:attribution`,
      nodeId: item.nodeId,
      role: "aggregate",
      sourceTypes: ["manual"],
      dependencyNodeIds: [...item.evidence.dependencyNodeIds],
      trustScore: 0.85,
      trustLevel: "high",
      freshnessState: "fresh",
      traceability: 0.9,
      status: "complete",
      reasons: [
        { code: "attribution_complete", messageKey: "attribution.reason.attribution_complete" },
      ],
    },
    limitations: safe
      ? []
      : [
          {
            code: "partial_attribution",
            messageKey: "limitation.partial_attribution",
            sourceNodeIds: [item.nodeId],
          },
        ],
    safeToPresent: safe,
    reasons: [],
  };
}

function representativeReports(): {
  insights: FitCoreAnalyticsInsightReport;
  explanations: FitCoreAnalyticsExplanationReport;
  derivedDataByCandidateId: Record<string, InsightVisualizationDerivedData>;
} {
  const base = getFitCoreAnalytics(defaultState, { now: NOW });
  const selected = SELECTED_IDS.map(candidate);
  const selectedByNode = new Map(selected.map((item) => [item.nodeId, item]));
  const insights: FitCoreAnalyticsInsightReport = {
    ...base.insights,
    evaluations: base.insights.evaluations.map((evaluation) => {
      const item = selectedByNode.get(evaluation.nodeId);
      return item
        ? {
            ...evaluation,
            supported: true,
            evidence: item.evidence,
            candidate: item,
            selected: true,
            reasons: item.reasons,
          }
        : evaluation;
    }),
    selectedCandidates: selected,
    summary: {
      ...base.insights.summary,
      selectedCandidates: selected.length,
      suppressedCandidates: 82,
    },
  };
  const packets = selected.map(explanation);
  const explanations: FitCoreAnalyticsExplanationReport = {
    ...base.explanations,
    selectedCandidateCount: selected.length,
    packets,
    summary: {
      ...base.explanations.summary,
      selectedCandidates: selected.length,
      packets: packets.length,
    },
  };
  return {
    insights,
    explanations,
    derivedDataByCandidateId: {
      [selected[1].candidateId]: {
        mode: "scalar",
        metricId: selected[1].nodeId,
        value: 0,
        unit: "load",
        minimum: null,
        maximum: null,
        window: "days_7",
      },
      [selected[2].candidateId]: {
        mode: "series",
        windows: ["days_7", "days_28"],
        series: [
          {
            seriesId: "primary",
            metricId: selected[2].nodeId,
            unit: "score_1_10",
            points: [
              { xKey: "period.1", value: 5 },
              { xKey: "period.2", value: null },
              { xKey: "period.3", value: 4 },
            ],
          },
        ],
      },
    },
  };
}

function report() {
  return buildFitCoreInsightVisualizations(representativeReports());
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function largeState(): AppState {
  const days = Array.from({ length: 160 }, (_, index) => index + 1);
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
    bodyweightEntries: days.map((day) => ({
      id: `SENSITIVE_WEIGHT_${day}`,
      createdAt: NOW - day * 86_400_000,
      weightLb: 180,
    })),
  };
}

test("Task 17 report covers exactly 85 unique canonical graph nodes", () => {
  const result = report();
  assert.equal(result.nodeCount, 85);
  assert.equal(result.evaluations.length, 85);
  assert.equal(new Set(result.evaluations.map((item) => item.nodeId)).size, 85);
  assert.deepEqual(
    result.evaluations.map((item) => item.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
});

test("Task 17 packets are selected-only, unique, bounded, and preserve Task 15 order", () => {
  const source = representativeReports();
  const result = buildFitCoreInsightVisualizations(source);
  assert.equal(result.packets.length, source.insights.selectedCandidates.length);
  assert.ok(result.packets.length <= 10);
  assert.equal(
    new Set(result.packets.map((packet) => packet.candidateId)).size,
    result.packets.length,
  );
  assert.deepEqual(
    result.packets.map((packet) => packet.candidateId),
    source.insights.selectedCandidates.map((item) => item.candidateId),
  );
  assert.ok(
    result.packets.every((packet) =>
      source.insights.selectedCandidates.some((item) => item.candidateId === packet.candidateId),
    ),
  );
});

test("Task 17 representative fixture stays conservative across readiness levels", () => {
  const result = report();
  assert.deepEqual(result.summary, {
    evaluationCount: 85,
    selectedCandidateCount: 3,
    packetCount: 3,
    readyCount: 2,
    partialCount: 1,
    unavailableCount: 82,
    safeToRenderCount: 2,
    summaryMetricCount: 1,
    trendLineCount: 1,
    comparisonBarsCount: 1,
    progressRingCount: 0,
    heatmapCount: 0,
    noneCount: 82,
    inspectValueCount: 3,
    switchWindowCount: 1,
    comparePeriodsCount: 1,
    toggleSeriesCount: 0,
    selectRegionCount: 0,
    openDetailCount: 3,
  });
  assert.equal(result.packets[2].status, "partial");
  assert.equal(result.packets[2].safeToRender, false);
});

test("Task 17 never reorders candidates based on visualization readiness", () => {
  const source = representativeReports();
  const result = buildFitCoreInsightVisualizations(source);
  assert.deepEqual(
    result.packets.map((packet) => packet.candidateId),
    source.insights.selectedCandidates.map((item) => item.candidateId),
  );
  assert.deepEqual(
    result.packets.map((packet) => packet.status),
    ["ready", "ready", "partial"],
  );
});

test("Task 17 aggregate empty and partial states remain explicit and additive", () => {
  const empty = getFitCoreAnalytics(defaultState, { now: NOW });
  assert.equal(empty.visualizations.evaluations.length, 85);
  assert.equal(empty.visualizations.packets.length, 0);
  assert.equal(empty.visualizations.summary.safeToRenderCount, 0);
  const partial = getFitCoreAnalytics(
    { ...defaultState, mealEntries: largeState().mealEntries.slice(0, 10) },
    { now: NOW },
  );
  assert.equal(partial.visualizations.evaluations.length, 85);
  assert.ok(partial.visualizations.evaluations.every((item) => !item.safeToRender));
});

test("Task 17 preserves Task 15 and Task 16 reports without mutation", () => {
  const source = deepFreeze(representativeReports());
  const insightsBefore = JSON.stringify(source.insights);
  const explanationsBefore = JSON.stringify(source.explanations);
  buildFitCoreInsightVisualizations(source);
  assert.equal(JSON.stringify(source.insights), insightsBefore);
  assert.equal(JSON.stringify(source.explanations), explanationsBefore);
});

test("Task 17 output is deterministic, serializable, and deeply frozen", () => {
  const source = representativeReports();
  const first = buildFitCoreInsightVisualizations(source);
  const second = buildFitCoreInsightVisualizations({
    derivedDataByCandidateId: Object.fromEntries(
      Object.entries(source.derivedDataByCandidateId).reverse(),
    ),
    explanations: source.explanations,
    insights: source.insights,
  });
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.ok(
    Object.isFrozen(first) &&
      Object.isFrozen(first.packets) &&
      Object.isFrozen(first.packets[0].data),
  );
  assert.throws(() => (first.packets as unknown[]).push({}));
});

test("Task 17 excludes privacy sentinels and ignores unknown upstream fields", () => {
  const source = representativeReports() as ReturnType<typeof representativeReports> & {
    unknown?: unknown;
  };
  source.unknown = {
    workoutName: "SENSITIVE_WORKOUT_NAME",
    exerciseName: "SENSITIVE_EXERCISE_NAME",
    mealName: "SENSITIVE_MEAL_NAME",
    mealNote: "SENSITIVE_MEAL_NOTE",
    aiMessage: "SENSITIVE_AI_MESSAGE",
    supplement: "SENSITIVE_SUPPLEMENT",
    recoveryNote: "SENSITIVE_RECOVERY_NOTE",
    goal: "SENSITIVE_GOAL_DESCRIPTION",
    photo: "SENSITIVE_PHOTO_METADATA",
  };
  const serialized = JSON.stringify(buildFitCoreInsightVisualizations(source));
  assert.doesNotMatch(serialized, /SENSITIVE_/);
});

test("Task 17 summary counts reconcile with evaluations, packets, kinds, and interactions", () => {
  const result = report();
  const summary = result.summary;
  assert.equal(summary.readyCount + summary.partialCount + summary.unavailableCount, 85);
  assert.equal(
    summary.summaryMetricCount +
      summary.trendLineCount +
      summary.comparisonBarsCount +
      summary.progressRingCount +
      summary.heatmapCount +
      summary.noneCount,
    85,
  );
  assert.equal(summary.packetCount, result.packets.length);
  assert.equal(summary.selectedCandidateCount, result.packets.length);
  assert.equal(
    summary.safeToRenderCount,
    result.evaluations.filter((item) => item.safeToRender).length,
  );
});

test("Task 17 stable IDs and metadata are canonical and duplicate-free", () => {
  const result = report();
  assert.equal(new Set(result.evaluations.map((item) => item.evaluationId)).size, 85);
  assert.equal(new Set(result.packets.map((item) => item.packetId)).size, result.packets.length);
  for (const packet of result.packets) {
    assert.equal(new Set(packet.interactions).size, packet.interactions.length);
    assert.equal(new Set(packet.availableWindows).size, packet.availableWindows.length);
    assert.equal(new Set(packet.dependencyNodeIds).size, packet.dependencyNodeIds.length);
    if (packet.defaultWindow !== null)
      assert.ok(packet.availableWindows.includes(packet.defaultWindow));
  }
});

test("Task 17 large aggregate fixture completes deterministically without raw output", () => {
  const state = deepFreeze(largeState());
  const before = JSON.stringify(state);
  const first = getFitCoreAnalytics(state, { now: NOW }).visualizations;
  const second = getFitCoreAnalytics(state, { now: NOW }).visualizations;
  assert.equal(first.evaluations.length, 85);
  assert.ok(first.packets.length <= 10);
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(JSON.stringify(state), before);
  assert.doesNotMatch(JSON.stringify(first), /SENSITIVE_/);
});

test("Task 17 aggregate adds only visualizations and leaves earlier output deterministic", () => {
  const first = getFitCoreAnalytics(defaultState, { now: NOW });
  const second = getFitCoreAnalytics(defaultState, { now: NOW });
  const { visualizations: visualizationsA, ...existingA } = first;
  const { visualizations: visualizationsB, ...existingB } = second;
  assert.deepEqual(existingA, existingB);
  assert.deepEqual(visualizationsA, visualizationsB);
  assert.deepEqual(existingA.insights.selectedCandidates, existingB.insights.selectedCandidates);
  assert.deepEqual(existingA.explanations.packets, existingB.explanations.packets);
});
