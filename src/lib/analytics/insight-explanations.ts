import type { EvidenceAttributionRecord } from "./evidence-attribution";
import type { FitCoreMetricSignalRecord } from "./fitcore-analytics-signals";
import type { FitCoreMetricTrendRecord } from "./fitcore-analytics-trends";
import type {
  InsightCandidate,
  InsightDirection,
  InsightObservationType,
} from "./insight-candidates";
import type { RollingTrendWindow } from "./rolling-trends";

export const FITCORE_INSIGHT_EXPLANATION_POLICY = "fitcore_insight_explanation_v1";
export const INSIGHT_EXPLANATION_STATUSES = Object.freeze([
  "unavailable",
  "partial",
  "complete",
] as const);
export const INSIGHT_EXPLANATION_FACT_KINDS = Object.freeze([
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
] as const);

export type InsightExplanationStatus = (typeof INSIGHT_EXPLANATION_STATUSES)[number];
export type InsightExplanationFactKind = (typeof INSIGHT_EXPLANATION_FACT_KINDS)[number];
export type InsightExplanationLimitationCode =
  | "partial_attribution"
  | "unknown_provenance"
  | "traceability_unavailable"
  | "stale_evidence"
  | "aging_evidence"
  | "unknown_freshness"
  | "invalid_freshness"
  | "single_window_support"
  | "mixed_window_directions"
  | "baseline_unavailable"
  | "baseline_insufficient"
  | "anomaly_unavailable"
  | "current_observation_unavailable"
  | "dependency_unresolved"
  | "insight_readiness_limited"
  | "candidate_not_selected"
  | "unsupported_metric";
export type InsightExplanationReasonCode =
  | "explanation_complete"
  | "explanation_partial"
  | "explanation_unavailable"
  | "candidate_selected"
  | "candidate_not_selected"
  | "candidate_suppressed"
  | "unsupported_metric"
  | "metric_unresolved"
  | "evidence_unavailable"
  | "evidence_partial"
  | "attribution_unavailable"
  | "attribution_partial"
  | "trust_below_threshold"
  | "freshness_not_usable"
  | "traceability_unavailable"
  | "insight_readiness_blocked"
  | "no_supported_facts"
  | "non_finite_fact_excluded"
  | "limitation_disclosed"
  | "safe_to_present"
  | "not_safe_to_present";

export interface InsightExplanationReason {
  code: InsightExplanationReasonCode;
  messageKey: `explanation.reason.${InsightExplanationReasonCode}`;
}

export interface InsightExplanationFact {
  factId: string;
  kind: InsightExplanationFactKind;
  labelKey: string;
  value: number | string | boolean | null;
  comparisonValue: number | null;
  unit: string | null;
  direction: InsightDirection;
  window: RollingTrendWindow | null;
  sourceNodeIds: string[];
}

export interface InsightExplanationLimitation {
  code: InsightExplanationLimitationCode;
  messageKey: `limitation.${InsightExplanationLimitationCode}`;
  sourceNodeIds: string[];
}

export interface InsightExplanationPacket {
  policy: typeof FITCORE_INSIGHT_EXPLANATION_POLICY;
  explanationId: string;
  candidateId: string;
  nodeId: string;
  status: InsightExplanationStatus;
  observationType: InsightObservationType | null;
  claimKey: string | null;
  summaryKey: string | null;
  whyShownKey: string | null;
  direction: InsightDirection;
  primaryWindow: RollingTrendWindow | null;
  facts: InsightExplanationFact[];
  attribution: EvidenceAttributionRecord;
  limitations: InsightExplanationLimitation[];
  safeToPresent: boolean;
  reasons: InsightExplanationReason[];
}

export interface InsightExplanationInput {
  candidate: InsightCandidate;
  attribution: EvidenceAttributionRecord;
  trend?: FitCoreMetricTrendRecord | null;
  signal?: FitCoreMetricSignalRecord | null;
}

const limitationOrder: readonly InsightExplanationLimitationCode[] = [
  "partial_attribution",
  "unknown_provenance",
  "traceability_unavailable",
  "stale_evidence",
  "aging_evidence",
  "unknown_freshness",
  "invalid_freshness",
  "single_window_support",
  "mixed_window_directions",
  "baseline_unavailable",
  "baseline_insufficient",
  "anomaly_unavailable",
  "current_observation_unavailable",
  "dependency_unresolved",
  "insight_readiness_limited",
  "candidate_not_selected",
  "unsupported_metric",
];
const reasonOrder: readonly InsightExplanationReasonCode[] = [
  "candidate_selected",
  "candidate_not_selected",
  "candidate_suppressed",
  "unsupported_metric",
  "metric_unresolved",
  "evidence_unavailable",
  "evidence_partial",
  "attribution_unavailable",
  "attribution_partial",
  "trust_below_threshold",
  "freshness_not_usable",
  "traceability_unavailable",
  "insight_readiness_blocked",
  "no_supported_facts",
  "non_finite_fact_excluded",
  "limitation_disclosed",
  "explanation_unavailable",
  "explanation_partial",
  "explanation_complete",
  "not_safe_to_present",
  "safe_to_present",
];

function canonicalIds(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function explanationReasons(codes: readonly InsightExplanationReasonCode[]) {
  const set = new Set(codes);
  return reasonOrder
    .filter((code) => set.has(code))
    .map((code) => ({ code, messageKey: `explanation.reason.${code}` }) as const);
}

function explanationLimitations(
  codes: readonly InsightExplanationLimitationCode[],
  nodeIds: readonly string[],
): InsightExplanationLimitation[] {
  const set = new Set(codes);
  const sourceNodeIds = canonicalIds(nodeIds);
  return limitationOrder
    .filter((code) => set.has(code))
    .map((code) => ({ code, messageKey: `limitation.${code}`, sourceNodeIds: [...sourceNodeIds] }));
}

/** Converts a selected candidate into localization keys and approved aggregate facts only. */
export function buildInsightExplanation(input: InsightExplanationInput): InsightExplanationPacket {
  const { candidate, attribution } = input;
  const signal = input.signal ?? null;
  const trend = input.trend ?? null;
  const sourceNodeIds = canonicalIds([candidate.nodeId, ...candidate.evidence.dependencyNodeIds]);
  const factDrafts: Omit<InsightExplanationFact, "factId">[] = [];
  let nonFiniteExcluded = false;
  const addFact = (
    kind: InsightExplanationFactKind,
    labelKey: string,
    value: number | string | boolean | null,
    comparisonValue: number | null = null,
    unit: string | null = null,
    direction: InsightDirection = candidate.direction,
    window: RollingTrendWindow | null = candidate.primaryWindow,
    ids: readonly string[] = sourceNodeIds,
  ) => {
    if (
      (typeof value === "number" && !Number.isFinite(value)) ||
      (comparisonValue !== null && !Number.isFinite(comparisonValue))
    ) {
      nonFiniteExcluded = true;
      return;
    }
    factDrafts.push({
      kind,
      labelKey,
      value,
      comparisonValue,
      unit,
      direction,
      window,
      sourceNodeIds: canonicalIds(ids),
    });
  };

  if (candidate.status === "selected" && candidate.observationType) {
    addFact(
      "observation",
      "fact.observation.type",
      candidate.observationType,
      null,
      null,
      candidate.direction,
      null,
    );
    if (candidate.primaryWindow)
      addFact("trend_window", "fact.trend.primary_window", candidate.primaryWindow);
    const change = signal?.meaningfulChange;
    if (change) {
      if (change.currentValue !== null)
        addFact(
          "rolling_change",
          "fact.trend.current_value",
          change.currentValue,
          null,
          candidate.evidence.unit,
        );
      if (change.previousValue !== null)
        addFact(
          "rolling_change",
          "fact.trend.previous_value",
          change.previousValue,
          null,
          candidate.evidence.unit,
        );
      if (change.absoluteChange !== null)
        addFact(
          "rolling_change",
          "fact.trend.absolute_change",
          change.absoluteChange,
          change.previousValue,
          candidate.evidence.unit,
        );
      if (change.relativeChange !== null)
        addFact("rolling_change", "fact.trend.relative_change", change.relativeChange);
      if (change.slopePerDay !== null)
        addFact(
          "rolling_change",
          "fact.trend.slope_per_day",
          change.slopePerDay,
          null,
          candidate.evidence.unit,
        );
      change.supportingWindows.forEach((window) =>
        addFact(
          "trend_window",
          "fact.trend.supporting_window",
          window,
          null,
          null,
          candidate.direction,
          window,
        ),
      );
      change.conflictingWindows.forEach((window) =>
        addFact(
          "trend_window",
          "fact.trend.conflicting_window",
          window,
          null,
          null,
          "mixed",
          window,
        ),
      );
    }
    const baseline = trend?.baseline;
    if (baseline?.center !== null && baseline?.center !== undefined)
      addFact(
        "baseline_comparison",
        "fact.baseline.center",
        baseline.center,
        null,
        candidate.evidence.unit,
      );
    if (candidate.observationType === "baseline_established" && baseline) {
      addFact("baseline_comparison", "fact.baseline.sample_count", baseline.sampleCount);
      addFact("baseline_comparison", "fact.baseline.distinct_day_count", baseline.distinctDayCount);
      addFact("baseline_comparison", "fact.baseline.lookback_days", baseline.lookbackDays);
      addFact("baseline_comparison", "fact.baseline.exclusion_days", baseline.exclusionDays);
    }
    const anomaly = signal?.anomaly;
    if (anomaly?.status === "ready") {
      addFact(
        "anomaly_distance",
        "fact.anomaly.classification",
        anomaly.classification,
        null,
        candidate.evidence.unit,
      );
      if (anomaly.value !== null)
        addFact(
          "anomaly_distance",
          "fact.anomaly.current_value",
          anomaly.value,
          null,
          candidate.evidence.unit,
        );
      if (anomaly.robustDeviationScore !== null)
        addFact("anomaly_distance", "fact.anomaly.deviation_score", anomaly.robustDeviationScore);
      if (anomaly.lowerExpectedBound !== null)
        addFact(
          "anomaly_distance",
          "fact.anomaly.lower_expected_bound",
          anomaly.lowerExpectedBound,
          null,
          candidate.evidence.unit,
        );
      if (anomaly.upperExpectedBound !== null)
        addFact(
          "anomaly_distance",
          "fact.anomaly.upper_expected_bound",
          anomaly.upperExpectedBound,
          null,
          candidate.evidence.unit,
        );
    }
    if (attribution.trustScore !== null)
      addFact("trust", "fact.trust.score", attribution.trustScore, null, null, "none", null);
    addFact(
      "freshness",
      "fact.freshness.state",
      attribution.freshnessState,
      null,
      null,
      "none",
      null,
    );
    if (attribution.traceability !== null)
      addFact(
        "traceability",
        "fact.traceability.score",
        attribution.traceability,
        null,
        null,
        "none",
        null,
      );
    attribution.sourceTypes.forEach((source) =>
      addFact("provenance", "fact.provenance.source", source, null, null, "none", null),
    );
    attribution.dependencyNodeIds.forEach((dependencyId) =>
      addFact("dependency", "fact.dependency.node", dependencyId, null, null, "none", null, [
        dependencyId,
      ]),
    );
  }

  const limitations: InsightExplanationLimitationCode[] = [];
  if (attribution.status !== "complete") limitations.push("partial_attribution");
  if (
    !attribution.sourceTypes.length ||
    attribution.sourceTypes.every((source) => source === "unknown")
  )
    limitations.push("unknown_provenance");
  if (attribution.traceability === null) limitations.push("traceability_unavailable");
  if (attribution.freshnessState === "stale") limitations.push("stale_evidence");
  if (attribution.freshnessState === "aging") limitations.push("aging_evidence");
  if (attribution.freshnessState === "unknown") limitations.push("unknown_freshness");
  if (attribution.freshnessState === "invalid") limitations.push("invalid_freshness");
  if (candidate.evidence.trendSupportingWindowCount === 0)
    limitations.push("single_window_support");
  if (candidate.observationType === "mixed_direction") limitations.push("mixed_window_directions");
  if (!trend || trend.baseline.status === "unavailable") limitations.push("baseline_unavailable");
  if (trend?.baseline.status === "insufficient_data") limitations.push("baseline_insufficient");
  if (!signal || signal.anomaly.status === "unavailable") limitations.push("anomaly_unavailable");
  if (signal?.anomaly.reasons.some((reason) => reason.code === "current_value_unavailable"))
    limitations.push("current_observation_unavailable");
  if (attribution.reasons.some((reason) => reason.code === "dependency_unresolved"))
    limitations.push("dependency_unresolved");
  if (candidate.evidence.insightReadiness !== "ready")
    limitations.push("insight_readiness_limited");
  if (candidate.status !== "selected") limitations.push("candidate_not_selected");
  if (candidate.evidence.reasons.some((reason) => reason.code === "unsupported_metric"))
    limitations.push("unsupported_metric");

  const evidenceStrengthUsable =
    candidate.evidenceStrength === "supported" || candidate.evidenceStrength === "well_supported";
  const trustUsable =
    attribution.trustScore !== null &&
    attribution.trustScore >= 0.5 &&
    (attribution.trustLevel === "medium" || attribution.trustLevel === "high");
  const freshnessUsable =
    attribution.freshnessState === "fresh" || attribution.freshnessState === "aging";
  const complete =
    candidate.status === "selected" &&
    candidate.evidence.status === "complete" &&
    evidenceStrengthUsable &&
    attribution.status === "complete" &&
    trustUsable &&
    freshnessUsable &&
    attribution.traceability !== null &&
    candidate.evidence.insightReadiness === "ready" &&
    factDrafts.length > 0 &&
    !nonFiniteExcluded;
  const status: InsightExplanationStatus = complete
    ? "complete"
    : candidate.status === "selected" && factDrafts.length > 0
      ? "partial"
      : "unavailable";
  const safeToPresent = complete && status === "complete";
  const codes: InsightExplanationReasonCode[] = [];
  if (candidate.status === "selected") codes.push("candidate_selected");
  else if (candidate.status === "suppressed") codes.push("candidate_suppressed");
  else codes.push("candidate_not_selected");
  if (candidate.evidence.status === "unavailable") codes.push("evidence_unavailable");
  if (candidate.evidence.status === "partial") codes.push("evidence_partial");
  if (candidate.evidence.reasons.some((reason) => reason.code === "unsupported_metric"))
    codes.push("unsupported_metric");
  if (candidate.evidence.reasons.some((reason) => reason.code === "metric_unresolved"))
    codes.push("metric_unresolved");
  if (attribution.status === "unavailable") codes.push("attribution_unavailable");
  if (attribution.status === "partial") codes.push("attribution_partial");
  if (!trustUsable) codes.push("trust_below_threshold");
  if (!freshnessUsable) codes.push("freshness_not_usable");
  if (attribution.traceability === null) codes.push("traceability_unavailable");
  if (candidate.evidence.insightReadiness !== "ready") codes.push("insight_readiness_blocked");
  if (!factDrafts.length) codes.push("no_supported_facts");
  if (nonFiniteExcluded) codes.push("non_finite_fact_excluded");
  if (limitations.length) codes.push("limitation_disclosed");
  codes.push(
    status === "complete"
      ? "explanation_complete"
      : status === "partial"
        ? "explanation_partial"
        : "explanation_unavailable",
  );
  codes.push(safeToPresent ? "safe_to_present" : "not_safe_to_present");
  const observation = candidate.observationType;
  return {
    policy: FITCORE_INSIGHT_EXPLANATION_POLICY,
    explanationId: `${candidate.candidateId}:explanation`,
    candidateId: candidate.candidateId,
    nodeId: candidate.nodeId,
    status,
    observationType: observation,
    claimKey: observation ? `explanation.${observation}.claim` : null,
    summaryKey: observation ? `explanation.${observation}.summary` : null,
    whyShownKey: observation ? `explanation.${observation}.why_shown` : null,
    direction: candidate.direction,
    primaryWindow: candidate.primaryWindow,
    facts: factDrafts.map((fact, index) => ({
      factId: `${candidate.candidateId}:${fact.kind}:${index + 1}`,
      ...fact,
      sourceNodeIds: [...fact.sourceNodeIds],
    })),
    attribution: {
      ...attribution,
      sourceTypes: [...attribution.sourceTypes],
      dependencyNodeIds: [...attribution.dependencyNodeIds],
      reasons: attribution.reasons.map((reason) => ({ ...reason })),
    },
    limitations: explanationLimitations(limitations, sourceNodeIds),
    safeToPresent,
    reasons: explanationReasons(codes),
  };
}
