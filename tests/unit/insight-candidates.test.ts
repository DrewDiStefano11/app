import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_INSIGHT_CANDIDATE_POLICY,
  evaluateInsightCandidate,
  type InsightEvidenceBundle,
} from "../../src/lib/analytics.ts";

function evidence(patch: Partial<InsightEvidenceBundle> = {}): InsightEvidenceBundle {
  return {
    policy: "fitcore_insight_evidence_v1",
    nodeId: "nutrition.calories.consistency",
    status: "complete",
    metricValue: 2100,
    unit: "kcal",
    baselineStatus: "ready",
    baselineCenter: 2000,
    trendStatus: "ready",
    trendDirection: "increasing",
    trendWindow: "days_7",
    trendSupportingWindowCount: 1,
    anomalyStatus: "unavailable",
    anomalyClassification: "unavailable",
    changeStatus: "ready",
    changeClassification: "meaningful_increase",
    trustScore: 0.8,
    trustLevel: "high",
    freshnessState: "fresh",
    traceability: 0.9,
    provenanceTypes: ["manual"],
    insightReadiness: "ready",
    dependencyNodeIds: ["nutrition.detail.source"],
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
    ...patch,
  };
}

test("Task 15 candidate policy and public value families are exact", () => {
  assert.equal(FITCORE_INSIGHT_CANDIDATE_POLICY, "fitcore_insight_candidate_v1");
  const eligible = evaluateInsightCandidate(evidence());
  const suppressed = evaluateInsightCandidate(evidence({ status: "partial" }));
  assert.equal(eligible.status, "eligible");
  assert.equal(suppressed.status, "suppressed");
  assert.ok(["limited", "supported", "well_supported"].includes(eligible.evidenceStrength));
  assert.equal(suppressed.evidenceStrength, "unavailable");
  assert.equal(suppressed.reviewPriority, "none");
});

test("Task 15 observation precedence selects far outside before all other observations", () => {
  const result = evaluateInsightCandidate(
    evidence({
      anomalyStatus: "ready",
      anomalyClassification: "far_outside_expected_range",
      changeClassification: "mixed_direction",
    }),
  );
  assert.equal(result.observationType, "far_outside_expected_range");
  assert.equal(result.candidateId, "nutrition.calories.consistency:far_outside_expected_range");
  assert.equal(result.direction, "none");
});

test("Task 15 meaningful increase, decrease, and mixed direction remain neutral and eligible", () => {
  const increase = evaluateInsightCandidate(evidence());
  const decrease = evaluateInsightCandidate(
    evidence({ changeClassification: "meaningful_decrease", trendDirection: "decreasing" }),
  );
  const mixed = evaluateInsightCandidate(
    evidence({ changeClassification: "mixed_direction", trendDirection: "stable" }),
  );
  assert.equal(increase.observationType, "meaningful_increase");
  assert.equal(increase.direction, "increasing");
  assert.equal(decrease.observationType, "meaningful_decrease");
  assert.equal(decrease.direction, "decreasing");
  assert.equal(mixed.observationType, "mixed_direction");
  assert.equal(mixed.direction, "mixed");
});

test("Task 15 outside-range observations are eligible without health interpretation", () => {
  const outside = evaluateInsightCandidate(
    evidence({ anomalyStatus: "ready", anomalyClassification: "outside_expected_range" }),
  );
  const far = evaluateInsightCandidate(
    evidence({ anomalyStatus: "ready", anomalyClassification: "far_outside_expected_range" }),
  );
  assert.equal(outside.observationType, "outside_expected_range");
  assert.equal(far.observationType, "far_outside_expected_range");
  assert.equal(far.reviewPriority, "high");
  assert.doesNotMatch(
    JSON.stringify([outside, far]),
    /health|medical|warning|danger|urgent|critical/i,
  );
});

test("Task 15 stable pattern and baseline established use conservative gates", () => {
  const stable = evaluateInsightCandidate(
    evidence({ changeClassification: "no_meaningful_change", trendDirection: "stable" }),
  );
  const established = evaluateInsightCandidate(
    evidence({ changeStatus: "unavailable", changeClassification: "unavailable" }),
  );
  assert.equal(stable.observationType, "stable_pattern");
  assert.equal(stable.reviewPriority, "low");
  assert.equal(established.observationType, "baseline_established");
  assert.equal(established.reviewPriority, "low");
  const mediumTrust = evaluateInsightCandidate(
    evidence({
      changeClassification: "no_meaningful_change",
      trustLevel: "medium",
      trustScore: 0.6,
    }),
  );
  assert.equal(mediumTrust.status, "suppressed");
});

test("Task 15 suppression covers unavailable, partial, low-trust, stale, blocked, and empty observations", () => {
  const cases = [
    evidence({ status: "unavailable" }),
    evidence({ status: "partial" }),
    evidence({ status: "complete", trustScore: 0.49, trustLevel: "low" }),
    evidence({ status: "complete", freshnessState: "stale" }),
    evidence({ status: "complete", insightReadiness: "needs_more_data" }),
    evidence({
      status: "complete",
      baselineStatus: "unavailable",
      changeStatus: "unavailable",
      changeClassification: "unavailable",
    }),
  ];
  for (const input of cases) assert.equal(evaluateInsightCandidate(input).status, "suppressed");
});

test("Task 15 evidence strength and review priority are conservative and exact", () => {
  const unavailable = evaluateInsightCandidate(evidence({ status: "partial" }));
  const limited = evaluateInsightCandidate(
    evidence({
      trustLevel: "medium",
      trustScore: 0.6,
      traceability: 0.6,
      trendSupportingWindowCount: 0,
    }),
  );
  const supported = evaluateInsightCandidate(evidence({ trustScore: 0.7 }));
  const wellSupported = evaluateInsightCandidate(evidence());
  assert.equal(unavailable.evidenceStrength, "unavailable");
  assert.equal(limited.evidenceStrength, "limited");
  assert.equal(limited.reviewPriority, "low");
  assert.equal(supported.evidenceStrength, "supported");
  assert.equal(wellSupported.evidenceStrength, "well_supported");
  assert.equal(wellSupported.reviewPriority, "high");
});

test("Task 15 candidate output is deterministic, detached, serializable, and contains no recommendations", () => {
  const input = Object.freeze(evidence());
  const first = evaluateInsightCandidate(input);
  const second = evaluateInsightCandidate(input);
  assert.deepEqual(first, second);
  assert.notEqual(first.evidence, input);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.doesNotMatch(
    JSON.stringify(first),
    /increase calories|reduce calories|train more|train less|sleep more|doctor|recommend|coaching/i,
  );
});
