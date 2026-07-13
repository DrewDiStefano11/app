import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_SELECTED_CANDIDATE_LIMIT,
  METRIC_DEPENDENCY_GRAPH,
  getFitCoreAnalytics,
  getFitCoreAnalyticsExplanations,
  getFitCoreAnalyticsInsights,
  type FitCoreAnalyticsResult,
  type FitCoreInsightReadinessItem,
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
      id: `private-workout-${day}`,
      name: "PRIVATE WORKOUT",
      startedAt: timestamp(day) - 3_600_000,
      endedAt: timestamp(day),
      exercises: [
        {
          id: `private-exercise-${day}`,
          exerciseId: "bench-press",
          completed: true,
          sets: [{ id: `private-set-${day}`, completed: true, weight: 100 + day, reps: 5 }],
        },
      ],
    })),
    mealEntries: days.map((day) => ({
      id: `private-meal-${day}`,
      name: "PRIVATE MEAL",
      notes: "PRIVATE NOTE",
      type: "dinner",
      createdAt: timestamp(day),
      calories: 1800 + day * 5,
      protein: 120 + day,
      carbs: 200 + day,
      fat: 60 + day / 2,
    })),
    recoveryCheckIns: days.map((day) => ({
      id: `private-recovery-${day}`,
      createdAt: timestamp(day),
      soreness: 3 + (day % 3),
      energy: 6 + (day % 2),
      stress: 4 + (day % 2),
      motivation: 7 - (day % 2),
      notes: "PRIVATE RECOVERY NOTE",
    })),
    bodyweightEntries: days.map((day) => ({
      id: `private-weight-${day}`,
      createdAt: timestamp(day),
      weightLb: 180 + day / 10,
    })),
  };
}

function completeAnalytics(): FitCoreAnalyticsResult {
  const analytics = getFitCoreAnalytics(historicalState(), { now: NOW });
  const supportedIds = analytics.trends.records
    .filter((record) => record.supported)
    .map((record) => record.nodeId);
  const config = new Map(
    supportedIds.map((id, index) => {
      let observation: "meaningful_increase" | "meaningful_decrease" =
        index % 2 ? "meaningful_decrease" : "meaningful_increase";
      if (id === "progress.bodyweight.series" || id === "recovery.detail.soreness.trend")
        observation = "meaningful_decrease";
      if (id === "recovery.detail.readiness.trend") observation = "meaningful_increase";
      return [
        id,
        { observation, window: index % 2 ? ("days_28" as const) : ("days_7" as const) },
      ] as const;
    }),
  );
  const trends = {
    ...analytics.trends,
    records: analytics.trends.records.map((record) => {
      const item = config.get(record.nodeId);
      if (!item) return record;
      const direction =
        item.observation === "meaningful_decrease"
          ? ("decreasing" as const)
          : ("increasing" as const);
      return {
        ...record,
        usable: true,
        trust: {
          ...record.trust,
          trustScore: 0.85,
          trustLevel: "high" as const,
          freshnessState: "fresh" as const,
          traceability: 0.9,
          provenanceType: "manual" as const,
        },
        rollingWindows: record.rollingWindows.map((window) =>
          window.window === item.window
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
      const item = config.get(record.nodeId);
      if (!item) return record;
      const sign = item.observation === "meaningful_decrease" ? -1 : 1;
      return {
        ...record,
        usable: true,
        trustScore: 0.85,
        trustLevel: "high" as const,
        freshnessState: "fresh" as const,
        traceability: 0.9,
        meaningfulChange: {
          ...record.meaningfulChange,
          status: "ready" as const,
          classification: item.observation,
          primaryWindow: item.window,
          supportingWindows: [
            item.window === "days_7" ? ("days_28" as const) : ("days_7" as const),
          ],
          conflictingWindows: [],
          currentValue: sign > 0 ? 110 : 90,
          previousValue: 100,
          absoluteChange: sign * 10,
          relativeChange: sign * 0.1,
          slopePerDay: sign,
        },
      };
    }),
  };
  const readinessItems: FitCoreInsightReadinessItem[] = supportedIds.map((nodeId, index) => ({
    ...analytics.insightReadiness.items[index % analytics.insightReadiness.items.length],
    id: `task16.${nodeId}`,
    status: "ready",
    source: {
      ...analytics.insightReadiness.items[index % analytics.insightReadiness.items.length].source,
      sourceMetricIds: [nodeId],
      missingDataNotes: [],
    },
  }));
  const trust = {
    ...analytics.trust,
    nodes: analytics.trust.nodes.map((node) => ({
      ...node,
      status: "assessed" as const,
      level: "high" as const,
      score: 0.85,
      freshness: { ...node.freshness, state: "fresh" as const },
      provenance: { type: "manual" as const, traceability: 0.9 },
    })),
  };
  const cumulative = {
    ...analytics,
    provenance: {
      sourceType: "manual" as const,
      sourceIds: ["private-source"],
      derivation: "observed" as const,
      traceabilityScore: 0.9,
      reasonCodes: [],
    },
    trust,
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
  const insights = getFitCoreAnalyticsInsights(cumulative);
  return { ...cumulative, insights };
}

function report(analytics = completeAnalytics()) {
  return getFitCoreAnalyticsExplanations(analytics);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

test("Task 16 integration covers all graph nodes in canonical order", () => {
  const result = report();
  assert.equal(result.nodeCount, 85);
  assert.equal(result.evaluations.length, 85);
  assert.equal(new Set(result.evaluations.map((item) => item.nodeId)).size, 85);
  assert.deepEqual(
    result.evaluations.map((item) => item.nodeId),
    METRIC_DEPENDENCY_GRAPH.map((node) => node.id),
  );
});

test("Task 16 packet count and order exactly preserve Task 15 selection", () => {
  const analytics = completeAnalytics();
  const result = report(analytics);
  assert.equal(result.packets.length, analytics.insights.selectedCandidates.length);
  assert.equal(result.selectedCandidateCount, analytics.insights.selectedCandidates.length);
  assert.ok(result.packets.length <= FITCORE_SELECTED_CANDIDATE_LIMIT);
  assert.deepEqual(
    result.packets.map((packet) => packet.candidateId),
    analytics.insights.selectedCandidates.map((candidate) => candidate.candidateId),
  );
});

test("Task 16 representative fixture has ten complete safe packets and explicit overflow", () => {
  const result = report();
  assert.equal(result.packets.length, 10);
  assert.ok(result.packets.every((packet) => packet.status === "complete" && packet.safeToPresent));
  const overflow = result.evaluations.find(
    (item) => item.candidateId === "recovery.detail.stress.trend:meaningful_decrease",
  )!;
  assert.equal(overflow.selected, false);
  assert.equal(overflow.explanation.status, "unavailable");
  assert.ok(overflow.reasons.some((reason) => reason.code === "candidate_not_selected"));
});

test("Task 16 keeps unsupported nodes explicit and unavailable", () => {
  const item = report().evaluations.find(
    (evaluation) => evaluation.nodeId === "aggregate.fitcore.confidence",
  )!;
  assert.equal(item.selected, false);
  assert.equal(item.candidateId, null);
  assert.equal(item.attribution.status, "unavailable");
  assert.equal(item.explanation.status, "unavailable");
  assert.equal(item.explanation.safeToPresent, false);
});

test("Task 16 attribution propagates Task 11 graph and Task 12 trust metadata", () => {
  const analytics = completeAnalytics();
  const result = report(analytics);
  const item = result.evaluations.find(
    (evaluation) => evaluation.nodeId === "nutrition.calories.consistency",
  )!;
  const node = METRIC_DEPENDENCY_GRAPH.find((value) => value.id === item.nodeId)!;
  const trust = analytics.trust.nodes.find((value) => value.metricId === item.nodeId)!;
  assert.deepEqual(item.attribution.sourceTypes, ["manual"]);
  assert.deepEqual(item.attribution.dependencyNodeIds, [...node.dependencies].sort());
  assert.equal(item.attribution.trustScore, trust.score);
  assert.equal(item.attribution.trustLevel, trust.level);
  assert.equal(item.attribution.freshnessState, trust.freshness.state);
  assert.equal(item.attribution.traceability, trust.provenance?.traceability);
});

test("Task 16 performs no candidate recalculation, replacement, or reranking", () => {
  const analytics = completeAnalytics();
  const before = analytics.insights.selectedCandidates.map((candidate) => ({
    id: candidate.candidateId,
    observation: candidate.observationType,
    status: candidate.status,
  }));
  const result = report(analytics);
  assert.deepEqual(
    result.packets.map((packet) => ({
      id: packet.candidateId,
      observation: packet.observationType,
      status: "selected",
    })),
    before,
  );
});

test("Task 16 safe-to-present gating makes incomplete Task 12 attribution partial", () => {
  const analytics = completeAnalytics();
  const selectedId = analytics.insights.selectedCandidates[0].nodeId;
  const partial = {
    ...analytics,
    trust: {
      ...analytics.trust,
      nodes: analytics.trust.nodes.map((node) =>
        node.metricId === selectedId
          ? { ...node, freshness: { ...node.freshness, state: "unknown" as const } }
          : node,
      ),
    },
  };
  const packet = report(partial).packets[0];
  assert.equal(packet.attribution.status, "partial");
  assert.equal(packet.status, "partial");
  assert.equal(packet.safeToPresent, false);
});

test("Task 16 empty and partial states are graph-complete and conservative", () => {
  const empty = getFitCoreAnalytics(defaultState, { now: NOW }).explanations;
  assert.equal(empty.evaluations.length, 85);
  assert.equal(empty.packets.length, 0);
  assert.ok(
    empty.evaluations.every(
      (item) => item.explanation.status === "unavailable" && !item.explanation.safeToPresent,
    ),
  );
  const partialState = { ...defaultState, mealEntries: historicalState().mealEntries };
  const partial = getFitCoreAnalytics(partialState, { now: NOW }).explanations;
  assert.equal(partial.evaluations.length, 85);
  assert.ok(
    partial.evaluations
      .filter((item) => !item.nodeId.startsWith("nutrition."))
      .every((item) => item.explanation.status === "unavailable"),
  );
});

test("Task 16 is deterministic, serializable, non-mutating, and privacy-safe", () => {
  const analytics = deepFreeze(completeAnalytics());
  const before = JSON.stringify(analytics);
  const first = report(analytics);
  const second = report(analytics);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(analytics), before);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.doesNotMatch(
    JSON.stringify(first),
    /PRIVATE|private-(workout|meal|set|weight|source)|audit|provider|api[_-]?key/i,
  );
});

test("Task 16 is additive and leaves every pre-Task-16 top-level result unchanged", () => {
  const first = getFitCoreAnalytics(historicalState(), { now: NOW });
  const second = getFitCoreAnalytics(historicalState(), { now: NOW });
  const { explanations: explanationA, ...existingA } = first;
  const { explanations: explanationB, ...existingB } = second;
  assert.deepEqual(existingA, existingB);
  assert.deepEqual(explanationA, explanationB);
  for (const key of [
    "schemaVersion",
    "analyticsVersion",
    "dependencyGraph",
    "domains",
    "correlations",
    "provenance",
    "trust",
    "trends",
    "signals",
    "insights",
    "insightReadiness",
  ])
    assert.deepEqual(
      existingA[key as keyof typeof existingA],
      existingB[key as keyof typeof existingB],
    );
});

test("Task 16 summary counts reconcile with evaluations and packets", () => {
  const result = report();
  const summary = result.summary;
  assert.equal(
    summary.completeAttribution + summary.partialAttribution + summary.unavailableAttribution,
    85,
  );
  assert.equal(
    summary.completeExplanations + summary.partialExplanations + summary.unavailableExplanations,
    85,
  );
  assert.equal(summary.safeToPresent + summary.notSafeToPresent, 85);
  assert.equal(summary.selectedCandidates, result.selectedCandidateCount);
  assert.equal(summary.packets, result.packets.length);
  assert.equal(
    summary.limitations,
    result.packets.reduce((sum, packet) => sum + packet.limitations.length, 0),
  );
});
