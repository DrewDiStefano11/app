import type {
  AnalyticsConfidence,
  AnalyticsStatus,
  ConfidenceEvidence,
  MetricReason,
} from "./domain-metrics";
import type { MetricProvenance } from "./data-provenance";
import type { MetricFreshnessAssessment } from "./metric-freshness";
import type { MetricQualityAssessment } from "./metric-quality";

export const FITCORE_METRIC_TRUST_POLICY_VERSION = "fitcore_metric_trust_v1";
export const METRIC_TRUST_THRESHOLDS = Object.freeze({ medium: 0.5, high: 0.8 });

export type MetricTrustLevel = "unavailable" | "low" | "medium" | "high";
export type MetricTrustStatus = "assessed" | "unavailable" | "unresolved";
export type MetricTrustReasonCode =
  | "no_source_data"
  | "low_confidence"
  | "low_quality"
  | "aging_data"
  | "stale_data"
  | "invalid_timestamp"
  | "unknown_freshness"
  | "unknown_provenance"
  | "low_traceability"
  | "needs_more_data"
  | "dependency_limited"
  | "dependency_unavailable"
  | "unsupported_data"
  | "unresolved_metric";

export interface MetricTrustReason {
  code: MetricTrustReasonCode;
  message: string;
}

export interface MetricDependencyTrustInput {
  id: string;
  status: MetricTrustStatus;
  score: number | null;
}

export interface MetricTrustInput {
  metricId: string;
  metricStatus: AnalyticsStatus;
  hasValue: boolean;
  confidence: {
    level: AnalyticsConfidence;
    score: number | null;
    reasons?: readonly MetricReason[];
    evidence?: ConfidenceEvidence | null;
  };
  quality: MetricQualityAssessment;
  freshness: MetricFreshnessAssessment;
  provenance: MetricProvenance | null;
  dependencies?: readonly MetricDependencyTrustInput[];
  unresolved?: boolean;
}

export interface MetricTrustAssessment {
  metricId: string;
  status: MetricTrustStatus;
  level: MetricTrustLevel;
  score: number | null;
  policyVersion: typeof FITCORE_METRIC_TRUST_POLICY_VERSION;
  confidence: {
    level: AnalyticsConfidence;
    score: number | null;
    originalScore: number | null;
    reasons: MetricReason[];
    evidence: ConfidenceEvidence | null;
  };
  quality: MetricQualityAssessment;
  freshness: MetricFreshnessAssessment;
  provenance: {
    type: MetricProvenance["sourceType"];
    traceability: number | null;
  } | null;
  dependencyLimit: {
    score: number | null;
    limitingDependencyIds: string[];
  };
  reasons: MetricTrustReason[];
  limitingFactors: MetricTrustReasonCode[];
}

const messages: Record<MetricTrustReasonCode, string> = {
  no_source_data: "No assessable source evidence is available.",
  low_confidence: "Existing analytics confidence limits trust.",
  low_quality: "Evidence quality limits trust.",
  aging_data: "Source evidence is aging.",
  stale_data: "Source evidence is stale.",
  invalid_timestamp: "Source recency cannot be trusted because its timestamp is invalid.",
  unknown_freshness: "Source freshness is unknown.",
  unknown_provenance: "Source provenance or traceability is unavailable.",
  low_traceability: "Provenance traceability limits trust.",
  needs_more_data: "The metric requires more data.",
  dependency_limited: "A required dependency limits trust.",
  dependency_unavailable: "A required dependency is unavailable or unresolved.",
  unsupported_data: "Required data is unsupported.",
  unresolved_metric: "The graph node cannot be resolved to current runtime evidence.",
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function levelFor(score: number | null): MetricTrustLevel {
  if (score === null) return "unavailable";
  if (score >= METRIC_TRUST_THRESHOLDS.high) return "high";
  if (score >= METRIC_TRUST_THRESHOLDS.medium) return "medium";
  return "low";
}

function normalizedConfidence(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  return clamp(score > 1 ? score / 100 : score);
}

export function evaluateMetricTrust(input: MetricTrustInput): MetricTrustAssessment {
  const confidenceScore = normalizedConfidence(input.confidence.score);
  const dependencyScores = (input.dependencies ?? [])
    .filter((dependency) => dependency.score !== null)
    .map((dependency) => dependency.score as number);
  const dependencyScore = dependencyScores.length ? Math.min(...dependencyScores) : null;
  const unavailableDependencies = (input.dependencies ?? []).filter(
    (dependency) => dependency.score === null || dependency.status !== "assessed",
  );
  const limitingDependencyIds = (input.dependencies ?? [])
    .filter(
      (dependency) =>
        dependency.score === null ||
        dependency.status !== "assessed" ||
        (dependencyScore !== null && dependency.score === dependencyScore),
    )
    .map((dependency) => dependency.id)
    .sort();
  const base: Omit<
    MetricTrustAssessment,
    "status" | "level" | "score" | "reasons" | "limitingFactors"
  > = {
    metricId: input.metricId,
    policyVersion: FITCORE_METRIC_TRUST_POLICY_VERSION,
    confidence: {
      level: input.confidence.level,
      score: confidenceScore,
      originalScore: input.confidence.score,
      reasons: [...(input.confidence.reasons ?? [])],
      evidence: input.confidence.evidence ?? null,
    },
    quality: input.quality,
    freshness: input.freshness,
    provenance: input.provenance
      ? { type: input.provenance.sourceType, traceability: input.provenance.traceabilityScore }
      : null,
    dependencyLimit: { score: dependencyScore, limitingDependencyIds },
  };
  if (input.unresolved) {
    return {
      ...base,
      status: "unresolved",
      level: "unavailable",
      score: null,
      reasons: [{ code: "unresolved_metric", message: messages.unresolved_metric }],
      limitingFactors: ["unresolved_metric"],
    };
  }
  const noEvidence = !input.hasValue && input.quality.score === null;
  if (noEvidence) {
    return {
      ...base,
      status: "unavailable",
      level: "unavailable",
      score: null,
      reasons: [{ code: "no_source_data", message: messages.no_source_data }],
      limitingFactors: ["no_source_data"],
    };
  }

  const componentScores = [
    confidenceScore,
    input.quality.score,
    input.freshness.score,
    input.provenance?.traceabilityScore ?? null,
  ]
    .filter((score): score is number => score !== null)
    .map(clamp);
  const applicable = [
    ...componentScores,
    ...(dependencyScore === null ? [] : [clamp(dependencyScore)]),
  ];
  let score = applicable.length ? Math.min(...applicable) : 0;
  const codes: MetricTrustReasonCode[] = [];
  if (confidenceScore === null || confidenceScore < 0.5) codes.push("low_confidence");
  if (input.quality.score !== null && input.quality.score < 0.5) codes.push("low_quality");
  if (input.quality.limitingFactors.includes("unsupported_data")) codes.push("unsupported_data");
  if (input.freshness.state === "aging") codes.push("aging_data");
  if (input.freshness.state === "stale") {
    score = Math.min(score, 0.49);
    codes.push("stale_data");
  }
  if (input.freshness.state === "invalid") {
    score = 0;
    codes.push("invalid_timestamp");
  }
  if (input.freshness.state === "unknown") {
    score = Math.min(score, 0.49);
    codes.push("unknown_freshness");
  }
  if (!input.provenance || input.provenance.traceabilityScore === null) {
    score = Math.min(score, 0.49);
    codes.push("unknown_provenance");
  } else if (input.provenance.traceabilityScore < 0.5) {
    codes.push("low_traceability");
  }
  if (input.metricStatus === "needs_more_data") {
    score = Math.min(score, 0.49);
    codes.push("needs_more_data");
  }
  if (unavailableDependencies.length > 0) {
    score = Math.min(score, 0.49);
    codes.push("dependency_unavailable");
  }
  if (
    dependencyScore !== null &&
    (componentScores.length === 0 || dependencyScore <= Math.min(...componentScores))
  ) {
    codes.push("dependency_limited");
  }
  const uniqueCodes = [...new Set(codes)].sort();
  const finalScore = clamp(score);
  return {
    ...base,
    status: "assessed",
    level: levelFor(finalScore),
    score: finalScore,
    reasons: uniqueCodes.map((code) => ({ code, message: messages[code] })),
    limitingFactors: uniqueCodes,
  };
}
