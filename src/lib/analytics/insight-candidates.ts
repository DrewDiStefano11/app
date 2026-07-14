import type { InsightEvidenceBundle } from "./insight-evidence";
import type { RollingTrendWindow } from "./rolling-trends";

export const FITCORE_INSIGHT_CANDIDATE_POLICY = "fitcore_insight_candidate_v1";

export type InsightCandidateStatus = "suppressed" | "eligible" | "selected";
export type InsightObservationType =
  | "meaningful_increase"
  | "meaningful_decrease"
  | "mixed_direction"
  | "outside_expected_range"
  | "far_outside_expected_range"
  | "stable_pattern"
  | "baseline_established";
export type InsightDirection = "none" | "increasing" | "decreasing" | "mixed";
export type InsightEvidenceStrength = "unavailable" | "limited" | "supported" | "well_supported";
/** Evidence-ordering priority only; it does not express urgency or health severity. */
export type InsightReviewPriority = "none" | "low" | "medium" | "high";
export type InsightCandidateReasonCode =
  | "candidate_selected"
  | "candidate_eligible"
  | "candidate_suppressed"
  | "unsupported_metric"
  | "metric_unresolved"
  | "evidence_unavailable"
  | "evidence_partial"
  | "trust_below_threshold"
  | "freshness_not_usable"
  | "insight_readiness_blocked"
  | "no_supported_observation"
  | "meaningful_change_supported"
  | "anomaly_supported"
  | "stable_pattern_supported"
  | "baseline_established"
  | "multiple_evidence_layers"
  | "single_evidence_layer"
  | "duplicate_candidate_not_selected"
  | "candidate_limit_not_selected"
  | "well_supported_evidence"
  | "limited_evidence";

export interface InsightCandidateReason {
  code: InsightCandidateReasonCode;
  message: string;
}

export interface InsightCandidate {
  policy: typeof FITCORE_INSIGHT_CANDIDATE_POLICY;
  candidateId: string;
  nodeId: string;
  status: InsightCandidateStatus;
  observationType: InsightObservationType | null;
  titleKey: string | null;
  summaryKey: string | null;
  direction: InsightDirection;
  primaryWindow: RollingTrendWindow | null;
  evidenceStrength: InsightEvidenceStrength;
  reviewPriority: InsightReviewPriority;
  sourceNodeIds: string[];
  supportingLayerCount: number;
  evidence: InsightEvidenceBundle;
  reasons: InsightCandidateReason[];
}

const messages: Record<InsightCandidateReasonCode, string> = {
  candidate_selected:
    "The candidate remains after deduplication, ranking, and the selection limit.",
  candidate_eligible: "The node qualifies for deterministic candidate selection.",
  candidate_suppressed: "The node does not satisfy candidate construction gates.",
  unsupported_metric: "The node has no supported historical-series evidence.",
  metric_unresolved: "The node is unresolved in cumulative analytics evidence.",
  evidence_unavailable: "Structured evidence is unavailable.",
  evidence_partial: "Structured evidence is partial.",
  trust_below_threshold: "Trust does not satisfy the candidate threshold.",
  freshness_not_usable: "Freshness does not permit candidate selection.",
  insight_readiness_blocked: "Existing insight readiness does not permit candidate selection.",
  no_supported_observation: "No supported neutral observation applies.",
  meaningful_change_supported: "Task 14 meaningful-change evidence supports the observation.",
  anomaly_supported: "Task 14 anomaly evidence supports the observation.",
  stable_pattern_supported: "A ready baseline and stable change evidence support the pattern.",
  baseline_established: "A ready baseline supports future analytical comparison.",
  multiple_evidence_layers: "Multiple analytical layers support the same observation.",
  single_evidence_layer: "One analytical layer supports the observation.",
  duplicate_candidate_not_selected: "A stronger analytically equivalent candidate was retained.",
  candidate_limit_not_selected: "The candidate remains eligible beyond the selection limit.",
  well_supported_evidence: "The evidence satisfies all well-supported requirements.",
  limited_evidence: "The evidence is usable but narrow or conservatively limited.",
};

export function getInsightCandidateReasons(
  codes: Iterable<InsightCandidateReasonCode>,
): InsightCandidateReason[] {
  return [...new Set(codes)]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, message: messages[code] }));
}

function copyEvidence(evidence: InsightEvidenceBundle): InsightEvidenceBundle {
  return {
    ...evidence,
    provenanceTypes: [...evidence.provenanceTypes],
    dependencyNodeIds: [...evidence.dependencyNodeIds],
    sourceTypes: [...evidence.sourceTypes],
    reasons: evidence.reasons.map((reason) => ({ ...reason })),
  };
}

function observationFor(evidence: InsightEvidenceBundle): InsightObservationType | null {
  if (
    evidence.anomalyStatus === "ready" &&
    evidence.anomalyClassification === "far_outside_expected_range"
  )
    return "far_outside_expected_range";
  if (
    evidence.anomalyStatus === "ready" &&
    evidence.anomalyClassification === "outside_expected_range"
  )
    return "outside_expected_range";
  if (evidence.changeStatus === "ready" && evidence.changeClassification === "mixed_direction")
    return "mixed_direction";
  if (evidence.changeStatus === "ready" && evidence.changeClassification === "meaningful_increase")
    return "meaningful_increase";
  if (evidence.changeStatus === "ready" && evidence.changeClassification === "meaningful_decrease")
    return "meaningful_decrease";
  const stableGates =
    evidence.baselineStatus === "ready" &&
    evidence.changeStatus === "ready" &&
    evidence.changeClassification === "no_meaningful_change" &&
    evidence.trustLevel === "high" &&
    evidence.freshnessState === "fresh" &&
    evidence.traceability !== null &&
    evidence.traceability >= 0.75;
  if (stableGates) return "stable_pattern";
  const baselineGates =
    evidence.baselineStatus === "ready" &&
    evidence.trustLevel === "high" &&
    evidence.freshnessState === "fresh" &&
    evidence.traceability !== null &&
    evidence.traceability >= 0.75;
  return baselineGates ? "baseline_established" : null;
}

function supportingLayers(
  evidence: InsightEvidenceBundle,
  observation: InsightObservationType,
): number {
  if (observation === "outside_expected_range" || observation === "far_outside_expected_range")
    return Number(evidence.anomalyStatus === "ready") + Number(evidence.baselineStatus === "ready");
  if (
    observation === "meaningful_increase" ||
    observation === "meaningful_decrease" ||
    observation === "mixed_direction"
  )
    return Number(evidence.changeStatus === "ready") + Number(evidence.trendStatus === "ready");
  if (observation === "stable_pattern")
    return (
      Number(evidence.changeStatus === "ready") +
      Number(evidence.trendStatus === "ready") +
      Number(evidence.baselineStatus === "ready")
    );
  return Number(evidence.baselineStatus === "ready");
}

function directionFor(observation: InsightObservationType): InsightDirection {
  if (observation === "meaningful_increase") return "increasing";
  if (observation === "meaningful_decrease") return "decreasing";
  if (observation === "mixed_direction") return "mixed";
  return "none";
}

function suppressionReasons(evidence: InsightEvidenceBundle): InsightCandidateReasonCode[] {
  const codes: InsightCandidateReasonCode[] = ["candidate_suppressed"];
  if (evidence.status === "unavailable") codes.push("evidence_unavailable");
  if (evidence.status === "partial") codes.push("evidence_partial");
  if (evidence.reasons.some((reason) => reason.code === "unsupported_metric"))
    codes.push("unsupported_metric");
  if (evidence.reasons.some((reason) => reason.code === "metric_unresolved"))
    codes.push("metric_unresolved");
  if (
    evidence.trustScore === null ||
    evidence.trustScore < 0.5 ||
    evidence.trustLevel === "unavailable" ||
    evidence.trustLevel === "low"
  )
    codes.push("trust_below_threshold");
  if (
    evidence.freshnessState === "unknown" ||
    evidence.freshnessState === "stale" ||
    evidence.freshnessState === "invalid"
  )
    codes.push("freshness_not_usable");
  if (evidence.insightReadiness !== "ready") codes.push("insight_readiness_blocked");
  return codes;
}

/** Evaluates one detached evidence bundle without store or graph knowledge. */
export function evaluateInsightCandidate(evidence: InsightEvidenceBundle): InsightCandidate {
  const detachedEvidence = copyEvidence(evidence);
  const candidateGates =
    evidence.status === "complete" &&
    evidence.trustScore !== null &&
    evidence.trustScore >= 0.5 &&
    (evidence.trustLevel === "medium" || evidence.trustLevel === "high") &&
    (evidence.freshnessState === "fresh" || evidence.freshnessState === "aging") &&
    evidence.insightReadiness === "ready";
  const observation = candidateGates ? observationFor(evidence) : null;
  if (!observation) {
    const codes = suppressionReasons(evidence);
    if (evidence.status === "complete") codes.push("no_supported_observation");
    return {
      policy: FITCORE_INSIGHT_CANDIDATE_POLICY,
      candidateId: `${evidence.nodeId}:suppressed`,
      nodeId: evidence.nodeId,
      status: "suppressed",
      observationType: null,
      titleKey: null,
      summaryKey: null,
      direction: "none",
      primaryWindow: null,
      evidenceStrength: "unavailable",
      reviewPriority: "none",
      sourceNodeIds: [evidence.nodeId, ...evidence.dependencyNodeIds].filter(
        (id, index, values) => values.indexOf(id) === index,
      ),
      supportingLayerCount: 0,
      evidence: detachedEvidence,
      reasons: getInsightCandidateReasons(codes),
    };
  }

  const layerCount = supportingLayers(evidence, observation);
  const wellSupported =
    evidence.trustLevel === "high" &&
    evidence.trustScore !== null &&
    evidence.trustScore >= 0.75 &&
    evidence.freshnessState === "fresh" &&
    evidence.traceability !== null &&
    evidence.traceability >= 0.75 &&
    layerCount >= 2 &&
    evidence.insightReadiness === "ready";
  const narrowDirectional =
    (observation === "meaningful_increase" || observation === "meaningful_decrease") &&
    evidence.trendSupportingWindowCount === 0;
  const limited =
    evidence.trustLevel === "medium" ||
    evidence.traceability === null ||
    evidence.traceability < 0.75 ||
    narrowDirectional;
  const evidenceStrength: InsightEvidenceStrength = wellSupported
    ? "well_supported"
    : limited
      ? "limited"
      : "supported";
  const highPriorityObservation =
    observation === "far_outside_expected_range" ||
    observation === "outside_expected_range" ||
    ((observation === "meaningful_increase" || observation === "meaningful_decrease") &&
      evidence.trendSupportingWindowCount > 0);
  const reviewPriority: InsightReviewPriority =
    observation === "stable_pattern" ||
    observation === "baseline_established" ||
    evidenceStrength === "limited"
      ? "low"
      : evidenceStrength === "well_supported" && highPriorityObservation
        ? "high"
        : "medium";
  const codes: InsightCandidateReasonCode[] = ["candidate_eligible"];
  if (
    observation === "meaningful_increase" ||
    observation === "meaningful_decrease" ||
    observation === "mixed_direction"
  )
    codes.push("meaningful_change_supported");
  if (observation === "outside_expected_range" || observation === "far_outside_expected_range")
    codes.push("anomaly_supported");
  if (observation === "stable_pattern") codes.push("stable_pattern_supported");
  if (observation === "baseline_established") codes.push("baseline_established");
  codes.push(layerCount >= 2 ? "multiple_evidence_layers" : "single_evidence_layer");
  if (wellSupported) codes.push("well_supported_evidence");
  if (limited) codes.push("limited_evidence");
  return {
    policy: FITCORE_INSIGHT_CANDIDATE_POLICY,
    candidateId: `${evidence.nodeId}:${observation}`,
    nodeId: evidence.nodeId,
    status: "eligible",
    observationType: observation,
    titleKey: `insight.${observation}.title`,
    summaryKey: `insight.${observation}.summary`,
    direction: directionFor(observation),
    primaryWindow: evidence.trendWindow,
    evidenceStrength,
    reviewPriority,
    sourceNodeIds: [evidence.nodeId, ...evidence.dependencyNodeIds].filter(
      (id, index, values) => values.indexOf(id) === index,
    ),
    supportingLayerCount: layerCount,
    evidence: detachedEvidence,
    reasons: getInsightCandidateReasons(codes),
  };
}
