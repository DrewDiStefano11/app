import type { FitCoreMetricSignalRecord } from "./fitcore-analytics-signals";
import type { FitCoreMetricTrendRecord } from "./fitcore-analytics-trends";
import type { FitCoreInsightReadinessStatus } from "./fitcore-insight-readiness";
import type { MetricFreshnessState } from "./metric-freshness";
import type { MetricTrustLevel } from "./metric-trust";
import type {
  RollingTrendDirection,
  RollingTrendStatus,
  RollingTrendWindow,
} from "./rolling-trends";

export const FITCORE_INSIGHT_EVIDENCE_POLICY = "fitcore_insight_evidence_v1";
export const INSIGHT_EVIDENCE_SOURCE_TYPES = Object.freeze([
  "metric_value",
  "personal_baseline",
  "rolling_trend",
  "anomaly_signal",
  "meaningful_change",
  "trust",
  "provenance",
  "insight_readiness",
  "dependency_context",
] as const);

export type InsightEvidenceStatus = "unavailable" | "partial" | "complete";
export type InsightEvidenceSourceType = (typeof INSIGHT_EVIDENCE_SOURCE_TYPES)[number];
export type InsightEvidenceReasonCode =
  | "evidence_complete"
  | "unsupported_metric"
  | "metric_unresolved"
  | "trust_unavailable"
  | "trust_below_threshold"
  | "trust_level_low"
  | "freshness_unknown"
  | "freshness_stale"
  | "freshness_invalid"
  | "traceability_unavailable"
  | "provenance_unknown"
  | "trend_unavailable"
  | "trend_insufficient"
  | "trend_unusable"
  | "signal_unavailable"
  | "signal_insufficient"
  | "signal_unusable"
  | "insight_readiness_unavailable"
  | "insight_readiness_blocked"
  | "dependency_context_unavailable"
  | "no_presentable_evidence";

export interface InsightEvidenceReason {
  code: InsightEvidenceReasonCode;
  message: string;
}

export interface InsightEvidenceBundle {
  policy: typeof FITCORE_INSIGHT_EVIDENCE_POLICY;
  nodeId: string;
  status: InsightEvidenceStatus;
  metricValue: number | null;
  unit: string | null;
  baselineStatus: "unavailable" | "insufficient_data" | "ready" | null;
  baselineCenter: number | null;
  trendStatus: RollingTrendStatus | null;
  trendDirection: RollingTrendDirection | null;
  trendWindow: RollingTrendWindow | null;
  trendSupportingWindowCount: number;
  anomalyStatus: "unavailable" | "insufficient_data" | "ready" | null;
  anomalyClassification:
    | "unavailable"
    | "within_expected_range"
    | "outside_expected_range"
    | "far_outside_expected_range"
    | null;
  changeStatus: "unavailable" | "insufficient_data" | "ready" | null;
  changeClassification:
    | "unavailable"
    | "no_meaningful_change"
    | "meaningful_increase"
    | "meaningful_decrease"
    | "mixed_direction"
    | null;
  trustScore: number | null;
  trustLevel: MetricTrustLevel;
  freshnessState: MetricFreshnessState;
  traceability: number | null;
  provenanceTypes: string[];
  insightReadiness: FitCoreInsightReadinessStatus | null;
  dependencyNodeIds: string[];
  sourceTypes: InsightEvidenceSourceType[];
  reasons: InsightEvidenceReason[];
}

export interface InsightEvidenceInput {
  nodeId: string;
  resolved: boolean;
  supported: boolean;
  metricValue?: unknown;
  unit?: string | null;
  trend?: FitCoreMetricTrendRecord | null;
  signal?: FitCoreMetricSignalRecord | null;
  provenanceTypes?: readonly unknown[];
  insightReadiness?: FitCoreInsightReadinessStatus | null;
  dependencyNodeIds?: readonly string[];
}

const messages: Record<InsightEvidenceReasonCode, string> = {
  evidence_complete: "All required analytical evidence layers are present and usable.",
  unsupported_metric: "The graph node has no supported Task 13 historical-series adapter.",
  metric_unresolved: "The graph node could not be resolved to cumulative analytics evidence.",
  trust_unavailable: "Task 12 trust is unavailable.",
  trust_below_threshold: "Task 12 trust is below the candidate threshold.",
  trust_level_low: "Task 12 trust level is unavailable or low.",
  freshness_unknown: "Task 12 freshness is unknown.",
  freshness_stale: "Task 12 freshness is stale.",
  freshness_invalid: "Task 12 freshness is invalid.",
  traceability_unavailable: "Provenance traceability is unavailable.",
  provenance_unknown: "Provenance is absent or unknown.",
  trend_unavailable: "Task 13 rolling evidence is unavailable.",
  trend_insufficient: "Task 13 rolling evidence is insufficient.",
  trend_unusable: "The Task 13 record is not usable for interpretation.",
  signal_unavailable: "Task 14 signal evidence is unavailable.",
  signal_insufficient: "Task 14 signal evidence is insufficient.",
  signal_unusable: "The Task 14 record is not usable for interpretation.",
  insight_readiness_unavailable: "No existing insight-readiness mapping is available.",
  insight_readiness_blocked: "Existing insight readiness does not permit candidate construction.",
  dependency_context_unavailable: "Direct dependency context is unavailable.",
  no_presentable_evidence: "The evidence bundle does not satisfy presentation gates.",
};

export function getInsightEvidenceReasons(
  codes: Iterable<InsightEvidenceReasonCode>,
): InsightEvidenceReason[] {
  return [...new Set(codes)]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, message: messages[code] }));
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueStrings(values: readonly unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function primaryTrend(
  trend: FitCoreMetricTrendRecord | null | undefined,
  signal: FitCoreMetricSignalRecord | null | undefined,
) {
  const requested = signal?.meaningfulChange.primaryWindow;
  if (requested) return trend?.rollingWindows.find((window) => window.window === requested) ?? null;
  return (
    trend?.rollingWindows.find((window) => window.status === "ready") ??
    trend?.rollingWindows[0] ??
    null
  );
}

/** Builds a detached evidence bundle exclusively from cumulative analytics records. */
export function buildInsightEvidence(input: InsightEvidenceInput): InsightEvidenceBundle {
  const trend = input.trend ?? null;
  const signal = input.signal ?? null;
  const primary = primaryTrend(trend, signal);
  const metricValue = finiteOrNull(input.metricValue);
  const baselineCenter = finiteOrNull(trend?.baseline.center);
  const trustScore = finiteOrNull(signal?.trustScore ?? trend?.trust.trustScore);
  const trustLevel = signal?.trustLevel ?? trend?.trust.trustLevel ?? "unavailable";
  const freshnessState = signal?.freshnessState ?? trend?.trust.freshnessState ?? "unknown";
  const traceability = finiteOrNull(signal?.traceability ?? trend?.trust.traceability);
  const provenanceTypes = uniqueStrings(input.provenanceTypes ?? []);
  const dependencyNodeIds = uniqueStrings(input.dependencyNodeIds ?? []);
  const signalReady =
    signal !== null &&
    (signal.anomaly.status === "ready" || signal.meaningfulChange.status === "ready");
  const signalInsufficient =
    signal !== null &&
    !signalReady &&
    (signal.anomaly.status === "insufficient_data" ||
      signal.meaningfulChange.status === "insufficient_data");
  const trustOkay =
    trustScore !== null && trustScore >= 0.5 && (trustLevel === "medium" || trustLevel === "high");
  const freshnessOkay = freshnessState === "fresh" || freshnessState === "aging";
  const provenanceOkay =
    traceability !== null &&
    provenanceTypes.length > 0 &&
    provenanceTypes.some((type) => type !== "unknown");
  const readinessOkay = input.insightReadiness === "ready";
  const dependencyOkay = dependencyNodeIds.length > 0;
  const complete =
    input.resolved &&
    input.supported &&
    trustOkay &&
    freshnessOkay &&
    trend !== null &&
    trend.usable &&
    signal !== null &&
    signal.usable &&
    signalReady &&
    provenanceOkay &&
    readinessOkay &&
    dependencyOkay;

  const codes: InsightEvidenceReasonCode[] = [];
  if (!input.supported) codes.push("unsupported_metric");
  if (!input.resolved) codes.push("metric_unresolved");
  if (trustScore === null) codes.push("trust_unavailable");
  else if (trustScore < 0.5) codes.push("trust_below_threshold");
  if (trustLevel === "unavailable" || trustLevel === "low") codes.push("trust_level_low");
  if (freshnessState === "unknown") codes.push("freshness_unknown");
  if (freshnessState === "stale") codes.push("freshness_stale");
  if (freshnessState === "invalid") codes.push("freshness_invalid");
  if (traceability === null) codes.push("traceability_unavailable");
  if (!provenanceTypes.length || provenanceTypes.every((type) => type === "unknown"))
    codes.push("provenance_unknown");
  if (!trend || !primary || primary.status === "unavailable") codes.push("trend_unavailable");
  else if (primary.status === "insufficient_data") codes.push("trend_insufficient");
  if (trend && !trend.usable) codes.push("trend_unusable");
  if (!signal || (!signalReady && !signalInsufficient)) codes.push("signal_unavailable");
  if (signalInsufficient) codes.push("signal_insufficient");
  if (signal && !signal.usable) codes.push("signal_unusable");
  if (input.insightReadiness === null || input.insightReadiness === undefined)
    codes.push("insight_readiness_unavailable");
  else if (!readinessOkay) codes.push("insight_readiness_blocked");
  if (!dependencyOkay) codes.push("dependency_context_unavailable");
  if (complete) codes.push("evidence_complete");
  else codes.push("no_presentable_evidence");

  const sourceSet = new Set<InsightEvidenceSourceType>();
  if (metricValue !== null) sourceSet.add("metric_value");
  if (trend) {
    sourceSet.add("personal_baseline");
    sourceSet.add("rolling_trend");
    sourceSet.add("trust");
  }
  if (signal) {
    sourceSet.add("anomaly_signal");
    sourceSet.add("meaningful_change");
    sourceSet.add("trust");
  }
  if (provenanceTypes.length) sourceSet.add("provenance");
  if (input.insightReadiness !== null && input.insightReadiness !== undefined)
    sourceSet.add("insight_readiness");
  if (dependencyOkay) sourceSet.add("dependency_context");
  const sourceTypes = INSIGHT_EVIDENCE_SOURCE_TYPES.filter((type) => sourceSet.has(type));
  const hasStructuredEvidence = input.supported && (trend !== null || signal !== null);
  return {
    policy: FITCORE_INSIGHT_EVIDENCE_POLICY,
    nodeId: input.nodeId,
    status: complete ? "complete" : hasStructuredEvidence ? "partial" : "unavailable",
    metricValue,
    unit: typeof input.unit === "string" && input.unit.trim() ? input.unit.trim() : null,
    baselineStatus: trend?.baseline.status ?? null,
    baselineCenter,
    trendStatus: primary?.status ?? null,
    trendDirection: primary?.direction ?? null,
    trendWindow: primary?.window ?? null,
    trendSupportingWindowCount: signal?.meaningfulChange.supportingWindows.length ?? 0,
    anomalyStatus: signal?.anomaly.status ?? null,
    anomalyClassification: signal?.anomaly.classification ?? null,
    changeStatus: signal?.meaningfulChange.status ?? null,
    changeClassification: signal?.meaningfulChange.classification ?? null,
    trustScore,
    trustLevel,
    freshnessState,
    traceability,
    provenanceTypes,
    insightReadiness: input.insightReadiness ?? null,
    dependencyNodeIds,
    sourceTypes,
    reasons: getInsightEvidenceReasons(codes),
  };
}
