import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_SELECTED_CANDIDATE_LIMIT,
  METRIC_DEPENDENCY_GRAPH,
  getFitCoreAnalytics,
  getFitCoreAnalyticsInsights,
  type FitCoreAnalyticsResult,
  type FitCoreInsightReadinessItem,
  type InsightObservationType,
  type RollingTrendWindow,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);
const timestamp = (daysAgo: number) => NOW - daysAgo * 86_400_000;

function historicalState(): AppState {
  const days = Array.from({ length: 70 }, (_, index) => index + 1);
  return {
    ...defaultState,
    activeWorkout: null,
    goals: [],
    customExercises: [],
    sleepEntries: [],
    recoverySignals: [],
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
  };
}

interface NodeConfig {
  observation?: "meaningful_increase" | "meaningful_decrease";
  window?: RollingTrendWindow;
  score?: number;
  level?: "medium" | "high";
  traceability?: number;
}

function completeAnalytics(
  overrides: Readonly<Record<string, NodeConfig>> = {},
): FitCoreAnalyticsResult {
  const analytics = getFitCoreAnalytics(historicalState(), { now: NOW });
  const supportedIds = analytics.trends.records
    .filter((record) => record.supported)
    .map((record) => record.nodeId);
  const configById = new Map(
    supportedIds.map((id, index) => {
      let observation: NodeConfig["observation"] =
        index % 2 ? "meaningful_decrease" : "meaningful_increase";
      if (id === "progress.bodyweight.series") observation = "meaningful_decrease";
      if (id === "recovery.detail.readiness.trend") observation = "meaningful_increase";
      if (id === "recovery.detail.soreness.trend") observation = "meaningful_decrease";
      return [
        id,
        {
          observation,
          window: index % 2 ? ("days_28" as const) : ("days_7" as const),
          score: 0.85,
          level: "high" as const,
          traceability: 0.9,
          ...overrides[id],
        },
      ] as const;
    }),
  );
  const trends = {
    ...analytics.trends,
    records: analytics.trends.records.map((record) => {
      const config = configById.get(record.nodeId);
      if (!config) return record;
      const direction = config.observation === "meaningful_decrease" ? "decreasing" : "increasing";
      return {
        ...record,
        usable: true,
        trust: {
          ...record.trust,
          trustScore: config.score!,
          trustLevel: config.level!,
          freshnessState: "fresh" as const,
          traceability: config.traceability!,
          provenanceType: "manual" as const,
        },
        rollingWindows: record.rollingWindows.map((window) =>
          window.window === config.window
            ? {
                ...window,
                status: "ready" as const,
                direction,
                currentSampleCount: 10,
                previousSampleCount: 10,
                currentValue: direction === "increasing" ? 110 : 90,
                previousValue: 100,
                absoluteChange: direction === "increasing" ? 10 : -10,
                relativeChange: direction === "increasing" ? 0.1 : -0.1,
                slopePerDay: direction === "increasing" ? 1 : -1,
                threshold: 3,
              }
            : window,
        ),
      };
    }),
  };
  const signals = {
    ...analytics.signals,
    records: analytics.signals.records.map((record) => {
      const config = configById.get(record.nodeId);
      if (!config) return record;
      const direction = config.observation === "meaningful_decrease" ? -1 : 1;
      return {
        ...record,
        usable: true,
        trustScore: config.score!,
        trustLevel: config.level!,
        freshnessState: "fresh" as const,
        traceability: config.traceability!,
        meaningfulChange: {
          ...record.meaningfulChange,
          status: "ready" as const,
          classification: config.observation!,
          primaryWindow: config.window!,
          supportingWindows: [
            config.window === "days_7" ? ("days_28" as const) : ("days_7" as const),
          ],
          currentValue: direction > 0 ? 110 : 90,
          previousValue: 100,
          absoluteChange: direction * 10,
          relativeChange: direction * 0.1,
          slopePerDay: direction,
        },
      };
    }),
  };
  const readinessItems: FitCoreInsightReadinessItem[] = supportedIds.map((nodeId, index) => ({
    ...analytics.insightReadiness.items[index % analytics.insightReadiness.items.length],
    id: `task15.${nodeId}`,
    status: "ready",
    source: {
      ...analytics.insightReadiness.items[index % analytics.insightReadiness.items.length].source,
      sourceMetricIds: [nodeId],
      missingDataNotes: [],
    },
  }));
  return {
    ...analytics,
    provenance: {
      ...analytics.provenance,
      sourceType: "manual",
      sourceIds: ["source"],
      derivation: "observed",
      traceabilityScore: 0.9,
      reasonCodes: [],
    },
    trends,
    signals,
    insightReadiness: {
      ...analytics.insightReadiness,
      items: readinessItems,
      readyCount: readinessItems.length,
      needsMoreDataCount: 0,
      unavailableCount: 0,
    },
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

test("Task 15 integration covers all graph nodes in canonical order", () => {
  const report = getFitCoreAnalyticsInsights(completeAnalytics());
  assert.equal(report.nodeCount, 85);
  assert.equal(report.evaluations.length, 85);
  assert.equal(new Set(report.evaluations.map((evaluation) => evaluation.nodeId)).size, 85);
  assert.deepEqual(
    report.evaluations.map((evaluation) => evaluation.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
  assert.equal(report.summary.supportedNodes, 11);
});

test("Task 15 unsupported nodes remain explicit and suppressed", () => {
  const report = getFitCoreAnalyticsInsights(completeAnalytics());
  const unsupported = report.evaluations.find(
    (evaluation) => evaluation.nodeId === "aggregate.fitcore.confidence",
  )!;
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.evidence.status, "unavailable");
  assert.equal(unsupported.candidate.status, "suppressed");
  assert.equal(unsupported.candidate.observationType, null);
  assert.equal(unsupported.selected, false);
});

test("Task 15 selects at most ten and keeps overflow candidates explicitly eligible", () => {
  const report = getFitCoreAnalyticsInsights(completeAnalytics());
  assert.equal(report.selectedCandidateLimit, FITCORE_SELECTED_CANDIDATE_LIMIT);
  assert.equal(report.selectedCandidates.length, 10);
  const overflow = report.evaluations.filter((evaluation) =>
    evaluation.candidate.reasons.some((reason) => reason.code === "candidate_limit_not_selected"),
  );
  assert.equal(overflow.length, 1);
  assert.equal(overflow[0].candidate.status, "eligible");
});

test("Task 15 selected ordering is deterministic by review, evidence, observation, trust, traceability, and graph", () => {
  const report = getFitCoreAnalyticsInsights(completeAnalytics());
  assert.ok(report.selectedCandidates.every((candidate) => candidate.reviewPriority === "high"));
  assert.ok(
    report.selectedCandidates.every((candidate) => candidate.evidenceStrength === "well_supported"),
  );
  assert.deepEqual(
    report.selectedCandidates.map((candidate) => candidate.candidateId),
    [
      "nutrition.calories.consistency:meaningful_increase",
      "nutrition.fat.consistency:meaningful_increase",
      "recovery.detail.motivation.trend:meaningful_increase",
      "recovery.detail.readiness.trend:meaningful_increase",
      "training.volume.7d:meaningful_increase",
      "nutrition.carbs.consistency:meaningful_decrease",
      "nutrition.protein.consistency:meaningful_decrease",
      "progress.bodyweight.series:meaningful_decrease",
      "recovery.detail.energy.trend:meaningful_decrease",
      "recovery.detail.soreness.trend:meaningful_decrease",
    ],
  );
  assert.deepEqual(report, getFitCoreAnalyticsInsights(completeAnalytics()));
});

test("Task 15 deduplication retains stronger evidence and keeps the duplicate eligible", () => {
  const analytics = completeAnalytics({
    "nutrition.calories.consistency": {
      observation: "meaningful_increase",
      window: "days_7",
      score: 0.9,
      level: "high",
      traceability: 0.95,
    },
    "progress.bodyweight.series": {
      observation: "meaningful_increase",
      window: "days_7",
      score: 0.6,
      level: "medium",
      traceability: 0.6,
    },
  });
  const report = getFitCoreAnalyticsInsights(analytics);
  const calories = report.evaluations.find(
    (evaluation) => evaluation.nodeId === "nutrition.calories.consistency",
  )!;
  const bodyweight = report.evaluations.find(
    (evaluation) => evaluation.nodeId === "progress.bodyweight.series",
  )!;
  assert.equal(calories.selected, true);
  assert.equal(bodyweight.selected, false);
  assert.equal(bodyweight.candidate.status, "eligible");
  assert.ok(
    bodyweight.candidate.reasons.some(
      (reason) => reason.code === "duplicate_candidate_not_selected",
    ),
  );
});

test("Task 15 propagates trust, trends, signals, and evidence source types without recalculation", () => {
  const analytics = completeAnalytics();
  const report = getFitCoreAnalyticsInsights(analytics);
  const evaluation = report.evaluations.find(
    (item) => item.nodeId === "nutrition.calories.consistency",
  )!;
  const signal = analytics.signals.records.find((item) => item.nodeId === evaluation.nodeId)!;
  assert.equal(evaluation.evidence.trustScore, signal.trustScore);
  assert.equal(evaluation.evidence.changeClassification, signal.meaningfulChange.classification);
  assert.equal(evaluation.candidate.observationType, signal.meaningfulChange.classification);
  for (const source of [
    "rolling_trend",
    "meaningful_change",
    "trust",
    "provenance",
    "insight_readiness",
    "dependency_context",
  ])
    assert.ok(evaluation.evidence.sourceTypes.includes(source as never));
});

test("Task 15 existing insight readiness blocks candidate construction", () => {
  const analytics = completeAnalytics();
  const nodeId = "nutrition.calories.consistency";
  const blocked = {
    ...analytics,
    insightReadiness: {
      ...analytics.insightReadiness,
      items: analytics.insightReadiness.items.map((item) =>
        item.source.sourceMetricIds.includes(nodeId)
          ? { ...item, status: "needs_more_data" as const }
          : item,
      ),
    },
  };
  const evaluation = getFitCoreAnalyticsInsights(blocked).evaluations.find(
    (item) => item.nodeId === nodeId,
  )!;
  assert.equal(evaluation.evidence.status, "partial");
  assert.equal(evaluation.candidate.status, "suppressed");
  assert.ok(
    evaluation.candidate.reasons.some((reason) => reason.code === "insight_readiness_blocked"),
  );
});

test("Task 15 empty and partial states remain safe, explicit, and conservative", () => {
  const empty = getFitCoreAnalytics(defaultState, { now: NOW }).insights;
  assert.equal(empty.evaluations.length, 85);
  assert.equal(empty.selectedCandidates.length, 0);
  assert.ok(empty.evaluations.every((evaluation) => evaluation.candidate.status === "suppressed"));
  const partialState = { ...defaultState, mealEntries: historicalState().mealEntries };
  const partial = getFitCoreAnalytics(partialState, { now: NOW }).insights;
  assert.equal(partial.evaluations.length, 85);
  assert.ok(
    partial.evaluations
      .filter((evaluation) => !evaluation.nodeId.startsWith("nutrition."))
      .every((evaluation) => evaluation.candidate.status === "suppressed"),
  );
});

test("Task 15 is deterministic, serializable, immutable, and backward compatible", () => {
  const analytics = deepFreeze(completeAnalytics());
  const before = JSON.stringify(analytics);
  const first = getFitCoreAnalyticsInsights(analytics);
  const second = getFitCoreAnalyticsInsights(analytics);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(analytics), before);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const cumulativeA = getFitCoreAnalytics(historicalState(), { now: NOW });
  const cumulativeB = getFitCoreAnalytics(historicalState(), { now: NOW });
  const { insights: insightsA, ...existingA } = cumulativeA;
  const { insights: insightsB, ...existingB } = cumulativeB;
  assert.deepEqual(existingA, existingB);
  assert.deepEqual(insightsA, insightsB);
});

test("Task 15 summary values reconcile with evaluations and selected candidates", () => {
  const report = getFitCoreAnalyticsInsights(completeAnalytics());
  assert.equal(report.summary.supportedNodes + report.summary.unsupportedNodes, 85);
  assert.equal(
    report.summary.completeEvidence +
      report.summary.partialEvidence +
      report.summary.unavailableEvidence,
    85,
  );
  assert.equal(
    report.summary.eligibleCandidates +
      report.summary.selectedCandidates +
      report.summary.suppressedCandidates,
    85,
  );
  assert.equal(report.summary.selectedCandidates, report.selectedCandidates.length);
  Object.values(report.summary).forEach((count) => assert.ok(count >= 0));
});
