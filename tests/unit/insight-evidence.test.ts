import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_INSIGHT_EVIDENCE_POLICY,
  INSIGHT_EVIDENCE_SOURCE_TYPES,
  buildInsightEvidence,
  getFitCoreAnalytics,
  type InsightEvidenceInput,
} from "../../src/lib/analytics.ts";
import { defaultState } from "../../src/lib/types.ts";

const NOW = Date.UTC(2026, 6, 13, 16);
const NODE_ID = "nutrition.calories.consistency";

function completeInput(): InsightEvidenceInput {
  const analytics = getFitCoreAnalytics(defaultState, { now: NOW });
  const originalTrend = analytics.trends.records.find((record) => record.nodeId === NODE_ID)!;
  const originalSignal = analytics.signals.records.find((record) => record.nodeId === NODE_ID)!;
  const trend = {
    ...originalTrend,
    usable: true,
    baseline: {
      ...originalTrend.baseline,
      status: "ready" as const,
      sampleCount: 20,
      distinctDayCount: 20,
      center: 2000,
      mean: 2000,
      minimum: 1800,
      maximum: 2200,
      percentile25: 1950,
      percentile75: 2050,
      medianAbsoluteDeviation: 40,
      robustStandardDeviation: 59.304,
      latestIncludedAt: "2026-07-05T16:00:00.000Z",
    },
    rollingWindows: originalTrend.rollingWindows.map((window) =>
      window.window === "days_7"
        ? {
            ...window,
            status: "ready" as const,
            direction: "increasing" as const,
            currentSampleCount: 7,
            previousSampleCount: 7,
            currentValue: 2100,
            previousValue: 1900,
            absoluteChange: 200,
            relativeChange: 200 / 1900,
            slopePerDay: 5,
            threshold: 100,
          }
        : window,
    ),
    trust: {
      ...originalTrend.trust,
      trustScore: 0.8,
      trustLevel: "high" as const,
      freshnessState: "fresh" as const,
      traceability: 0.9,
      provenanceType: "manual" as const,
    },
  };
  const signal = {
    ...originalSignal,
    usable: true,
    trustScore: 0.8,
    trustLevel: "high" as const,
    freshnessState: "fresh" as const,
    traceability: 0.9,
    meaningfulChange: {
      ...originalSignal.meaningfulChange,
      status: "ready" as const,
      classification: "meaningful_increase" as const,
      primaryWindow: "days_7" as const,
      supportingWindows: ["days_28" as const],
      currentValue: 2100,
      previousValue: 1900,
      absoluteChange: 200,
      relativeChange: 200 / 1900,
      slopePerDay: 5,
    },
  };
  return {
    nodeId: NODE_ID,
    resolved: true,
    supported: true,
    metricValue: 2100,
    unit: "kcal",
    trend,
    signal,
    provenanceTypes: ["manual"],
    insightReadiness: "ready",
    dependencyNodeIds: ["nutrition.detail.source"],
  };
}

test("Task 15 evidence policy, statuses, and source IDs are exact", () => {
  assert.equal(FITCORE_INSIGHT_EVIDENCE_POLICY, "fitcore_insight_evidence_v1");
  assert.deepEqual(INSIGHT_EVIDENCE_SOURCE_TYPES, [
    "metric_value",
    "personal_baseline",
    "rolling_trend",
    "anomaly_signal",
    "meaningful_change",
    "trust",
    "provenance",
    "insight_readiness",
    "dependency_context",
  ]);
  const result = buildInsightEvidence(completeInput());
  assert.equal(result.status, "complete");
  assert.doesNotMatch(JSON.stringify(result), /meal-|workout-|recovery-|bodyweight-/i);
});

test("Task 15 complete evidence requires all cumulative usability gates", () => {
  const result = buildInsightEvidence(completeInput());
  assert.equal(result.status, "complete");
  assert.equal(result.trustScore, 0.8);
  assert.equal(result.trendDirection, "increasing");
  assert.equal(result.changeClassification, "meaningful_increase");
  assert.ok(result.reasons.some((reason) => reason.code === "evidence_complete"));
});

test("Task 15 partial evidence preserves present layers without approving presentation", () => {
  const input = completeInput();
  const missingSignal = buildInsightEvidence({ ...input, signal: null });
  assert.equal(missingSignal.status, "partial");
  assert.ok(missingSignal.reasons.some((reason) => reason.code === "signal_unavailable"));
  const blocked = buildInsightEvidence({ ...input, insightReadiness: "needs_more_data" });
  assert.equal(blocked.status, "partial");
  assert.ok(blocked.reasons.some((reason) => reason.code === "insight_readiness_blocked"));
});

test("Task 15 unsupported and unresolved evidence remains unavailable", () => {
  const input = completeInput();
  const unsupported = buildInsightEvidence({
    ...input,
    supported: false,
    trend: null,
    signal: null,
  });
  const unresolved = buildInsightEvidence({ ...input, resolved: false, trend: null, signal: null });
  assert.equal(unsupported.status, "unavailable");
  assert.equal(unresolved.status, "unavailable");
  assert.ok(unsupported.reasons.some((reason) => reason.code === "unsupported_metric"));
  assert.ok(unresolved.reasons.some((reason) => reason.code === "metric_unresolved"));
});

test("Task 15 evidence honors exact trust thresholds", () => {
  for (const [score, expected] of [
    [null, "partial"],
    [0.49, "partial"],
    [0.5, "complete"],
    [0.75, "complete"],
  ] as const) {
    const input = completeInput();
    const trend = { ...input.trend!, trust: { ...input.trend!.trust, trustScore: score } };
    const signal = { ...input.signal!, trustScore: score };
    assert.equal(buildInsightEvidence({ ...input, trend, signal }).status, expected);
  }
});

test("Task 15 fresh and aging evidence qualify while unknown, stale, and invalid do not", () => {
  for (const [freshness, expected] of [
    ["fresh", "complete"],
    ["aging", "complete"],
    ["unknown", "partial"],
    ["stale", "partial"],
    ["invalid", "partial"],
  ] as const) {
    const input = completeInput();
    const trend = { ...input.trend!, trust: { ...input.trend!.trust, freshnessState: freshness } };
    const signal = { ...input.signal!, freshnessState: freshness };
    assert.equal(buildInsightEvidence({ ...input, trend, signal }).status, expected);
  }
});

test("Task 15 provenance and dependency arrays are deterministic and deduplicated", () => {
  const input = completeInput();
  const result = buildInsightEvidence({
    ...input,
    provenanceTypes: ["wearable", "manual", "wearable", ""],
    dependencyNodeIds: ["z", "a", "z"],
  });
  assert.deepEqual(result.provenanceTypes, ["manual", "wearable"]);
  assert.deepEqual(result.dependencyNodeIds, ["a", "z"]);
});

test("Task 15 evidence is deterministic, immutable, finite, and serializable", () => {
  const input = Object.freeze(completeInput());
  const first = buildInsightEvidence(input);
  const second = buildInsightEvidence(input);
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  Object.values(first).forEach((value) => {
    if (typeof value === "number") assert.equal(Number.isFinite(value), true);
  });
});
