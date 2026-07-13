import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_INSIGHT_EXPLANATION_POLICY,
  INSIGHT_EXPLANATION_FACT_KINDS,
  INSIGHT_EXPLANATION_STATUSES,
  buildInsightExplanation,
  type EvidenceAttributionRecord,
  type FitCoreMetricSignalRecord,
  type FitCoreMetricTrendRecord,
  type InsightCandidate,
  type InsightObservationType,
} from "../../src/lib/analytics.ts";

const NODE = "nutrition.protein.consistency";

function candidate(observation: InsightObservationType = "meaningful_increase"): InsightCandidate {
  const direction =
    observation === "meaningful_increase"
      ? "increasing"
      : observation === "meaningful_decrease"
        ? "decreasing"
        : observation === "mixed_direction"
          ? "mixed"
          : "none";
  return {
    policy: "fitcore_insight_candidate_v1",
    candidateId: `${NODE}:${observation}`,
    nodeId: NODE,
    status: "selected",
    observationType: observation,
    titleKey: `insight.${observation}.title`,
    summaryKey: `insight.${observation}.summary`,
    direction,
    primaryWindow: "days_7",
    evidenceStrength: "well_supported",
    reviewPriority: "high",
    sourceNodeIds: [NODE, "nutrition.meals.source"],
    supportingLayerCount: 2,
    evidence: {
      policy: "fitcore_insight_evidence_v1",
      nodeId: NODE,
      status: "complete",
      metricValue: 110,
      unit: "grams",
      baselineStatus: "ready",
      baselineCenter: 95,
      trendStatus: "ready",
      trendDirection:
        direction === "mixed" ? "increasing" : direction === "none" ? "stable" : direction,
      trendWindow: "days_7",
      trendSupportingWindowCount: observation === "mixed_direction" ? 2 : 1,
      anomalyStatus: "ready",
      anomalyClassification: observation.includes("outside_expected_range")
        ? observation
        : "within_expected_range",
      changeStatus: "ready",
      changeClassification:
        observation === "stable_pattern" || observation === "baseline_established"
          ? "no_meaningful_change"
          : observation,
      trustScore: 0.85,
      trustLevel: "high",
      freshnessState: "fresh",
      traceability: 0.9,
      provenanceTypes: ["manual"],
      insightReadiness: "ready",
      dependencyNodeIds: ["nutrition.meals.source"],
      sourceTypes: [
        "metric_value",
        "personal_baseline",
        "rolling_trend",
        "anomaly_signal",
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

function attribution(
  overrides: Partial<EvidenceAttributionRecord> = {},
): EvidenceAttributionRecord {
  return {
    policy: "fitcore_evidence_attribution_v1",
    attributionId: `${NODE}:attribution`,
    nodeId: NODE,
    role: "aggregate",
    sourceTypes: ["manual"],
    dependencyNodeIds: ["nutrition.meals.source"],
    trustScore: 0.85,
    trustLevel: "high",
    freshnessState: "fresh",
    traceability: 0.9,
    status: "complete",
    reasons: [
      { code: "attribution_complete", messageKey: "attribution.reason.attribution_complete" },
    ],
    ...overrides,
  };
}

function trend(): FitCoreMetricTrendRecord {
  return {
    nodeId: NODE,
    baseline: {
      status: "ready",
      center: 95,
      sampleCount: 40,
      distinctDayCount: 40,
      lookbackDays: 56,
      exclusionDays: 7,
    },
  } as unknown as FitCoreMetricTrendRecord;
}

function signal(
  observation: InsightObservationType = "meaningful_increase",
): FitCoreMetricSignalRecord {
  const sign = observation === "meaningful_decrease" ? -1 : 1;
  return {
    nodeId: NODE,
    meaningfulChange: {
      status: "ready",
      classification: observation,
      primaryWindow: "days_7",
      supportingWindows: ["days_28"],
      conflictingWindows: observation === "mixed_direction" ? ["days_28"] : [],
      currentValue: sign > 0 ? 110 : 90,
      previousValue: 100,
      absoluteChange: sign * 10,
      relativeChange: sign * 0.1,
      slopePerDay: sign,
    },
    anomaly: {
      status: "ready",
      classification: observation.includes("outside_expected_range")
        ? observation
        : "within_expected_range",
      value: observation.includes("outside_expected_range") ? null : 110,
      robustDeviationScore: observation.includes("outside_expected_range") ? 4 : 1,
      lowerExpectedBound: 80,
      upperExpectedBound: 120,
      reasons: observation.includes("outside_expected_range")
        ? [{ code: "current_value_unavailable" }]
        : [],
    },
  } as unknown as FitCoreMetricSignalRecord;
}

function packet(observation: InsightObservationType = "meaningful_increase", attr = attribution()) {
  return buildInsightExplanation({
    candidate: candidate(observation),
    attribution: attr,
    trend: trend(),
    signal: signal(observation),
  });
}

test("Task 16 explanations expose stable policy, statuses, facts, IDs, and localization keys", () => {
  const result = packet();
  assert.equal(FITCORE_INSIGHT_EXPLANATION_POLICY, "fitcore_insight_explanation_v1");
  assert.equal(result.policy, FITCORE_INSIGHT_EXPLANATION_POLICY);
  assert.deepEqual(INSIGHT_EXPLANATION_STATUSES, ["unavailable", "partial", "complete"]);
  assert.deepEqual(INSIGHT_EXPLANATION_FACT_KINDS, [
    "observation",
    "rolling_change",
    "baseline_comparison",
    "anomaly_distance",
    "trend_window",
    "trust",
    "freshness",
    "traceability",
    "provenance",
    "dependency",
    "limitation",
  ]);
  assert.equal(result.explanationId, `${candidate().candidateId}:explanation`);
  assert.equal(result.claimKey, "explanation.meaningful_increase.claim");
});

test("Task 16 meaningful increase and decrease packets use supported aggregate facts", () => {
  const increase = packet("meaningful_increase");
  const decrease = packet("meaningful_decrease");
  assert.equal(increase.status, "complete");
  assert.equal(increase.safeToPresent, true);
  assert.equal(decrease.direction, "decreasing");
  for (const key of [
    "fact.trend.current_value",
    "fact.trend.previous_value",
    "fact.trend.absolute_change",
    "fact.trust.score",
    "fact.freshness.state",
    "fact.provenance.source",
  ])
    assert.ok(increase.facts.some((fact) => fact.labelKey === key));
});

test("Task 16 mixed direction discloses conflicts without forcing a direction", () => {
  const result = packet("mixed_direction");
  assert.equal(result.direction, "mixed");
  assert.ok(result.facts.some((fact) => fact.labelKey === "fact.trend.conflicting_window"));
  assert.ok(result.limitations.some((limitation) => limitation.code === "mixed_window_directions"));
});

test("Task 16 outside-range explanations do not invent unavailable observations", () => {
  const result = packet("outside_expected_range");
  assert.ok(result.facts.some((fact) => fact.labelKey === "fact.anomaly.deviation_score"));
  assert.ok(!result.facts.some((fact) => fact.labelKey === "fact.anomaly.current_value"));
  assert.ok(
    result.limitations.some((limitation) => limitation.code === "current_observation_unavailable"),
  );
});

test("Task 16 stable and baseline packets remain conservative", () => {
  const stable = packet("stable_pattern");
  const baseline = packet("baseline_established");
  assert.ok(stable.facts.some((fact) => fact.kind === "baseline_comparison"));
  for (const key of ["fact.baseline.sample_count", "fact.baseline.lookback_days"])
    assert.ok(baseline.facts.some((fact) => fact.labelKey === key));
});

test("Task 16 excludes non-finite facts and marks the packet partial", () => {
  const malformed = signal();
  malformed.meaningfulChange.currentValue = Number.POSITIVE_INFINITY;
  const result = buildInsightExplanation({
    candidate: candidate(),
    attribution: attribution(),
    trend: trend(),
    signal: malformed,
  });
  assert.equal(result.status, "partial");
  assert.equal(result.safeToPresent, false);
  assert.ok(result.reasons.some((reason) => reason.code === "non_finite_fact_excluded"));
  assert.ok(!JSON.stringify(result).includes("Infinity"));
});

test("Task 16 partial attribution remains partial and not safe", () => {
  const result = packet("meaningful_increase", attribution({ status: "partial" }));
  assert.equal(result.status, "partial");
  assert.equal(result.safeToPresent, false);
  assert.ok(result.limitations.some((limitation) => limitation.code === "partial_attribution"));
});

test("Task 16 applies trust, freshness, and traceability presentation gates", () => {
  for (const score of [null, 0.49, 0.5, 0.75] as const) {
    const result = packet(
      "meaningful_increase",
      attribution({
        trustScore: score,
        trustLevel: score !== null && score >= 0.5 ? "medium" : "low",
      }),
    );
    assert.equal(result.safeToPresent, score !== null && score >= 0.5);
  }
  for (const state of ["fresh", "aging", "unknown", "stale", "invalid"] as const) {
    const result = packet("meaningful_increase", attribution({ freshnessState: state }));
    assert.equal(result.safeToPresent, state === "fresh" || state === "aging");
  }
  assert.equal(
    packet("meaningful_increase", attribution({ traceability: null })).safeToPresent,
    false,
  );
  assert.equal(
    packet("meaningful_increase", attribution({ traceability: 0.1 })).safeToPresent,
    true,
  );
});

test("Task 16 non-selected candidates produce unavailable packets", () => {
  const notSelected = candidate();
  notSelected.status = "eligible";
  const result = buildInsightExplanation({
    candidate: notSelected,
    attribution: attribution(),
    trend: trend(),
    signal: signal(),
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.safeToPresent, false);
  assert.equal(result.facts.length, 0);
  assert.ok(result.reasons.some((reason) => reason.code === "candidate_not_selected"));
});

test("Task 16 explanations are immutable, serializable, and contain no prohibited prose", () => {
  const inputs = {
    candidate: candidate(),
    attribution: attribution(),
    trend: trend(),
    signal: signal(),
  };
  const before = JSON.stringify(inputs);
  Object.freeze(inputs.candidate);
  Object.freeze(inputs.attribution);
  const result = buildInsightExplanation(inputs);
  assert.equal(JSON.stringify(inputs), before);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.doesNotMatch(
    JSON.stringify(result),
    /recommend|coaching|medical|diagnos|urgent|danger|should/i,
  );
});
