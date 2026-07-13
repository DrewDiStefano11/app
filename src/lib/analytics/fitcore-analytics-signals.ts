import {
  FITCORE_ANOMALY_DETECTION_POLICY,
  evaluateAnomaly,
  getAnomalyDetectionReasons,
  type AnomalyDetectionReasonCode,
  type AnomalyDetectionResult,
} from "./anomaly-detection";
import type { MetricFreshnessState } from "./metric-freshness";
import type { MetricTrustLevel } from "./metric-trust";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";
import {
  FITCORE_MEANINGFUL_CHANGE_POLICY,
  evaluateMeaningfulChange,
  getMeaningfulChangeReasons,
  type MeaningfulChangeReasonCode,
  type MeaningfulChangeResult,
} from "./meaningful-change";
import type {
  FitCoreAnalyticsTrendReport,
  FitCoreMetricTrendRecord,
} from "./fitcore-analytics-trends";

export type FitCoreMetricSignalReasonCode =
  | "signal_ready"
  | "unsupported_metric"
  | "metric_unresolved"
  | "anomaly_unavailable"
  | "change_unavailable"
  | "task13_unusable"
  | "trust_unavailable"
  | "trust_below_interpretation_threshold"
  | "freshness_unknown"
  | "freshness_stale"
  | "freshness_invalid";

export interface FitCoreMetricSignalReason {
  code: FitCoreMetricSignalReasonCode;
  message: string;
}

export interface FitCoreMetricSignalRecord {
  nodeId: string;
  supported: boolean;
  anomaly: AnomalyDetectionResult;
  meaningfulChange: MeaningfulChangeResult;
  trustScore: number | null;
  trustLevel: MetricTrustLevel;
  freshnessState: MetricFreshnessState;
  traceability: number | null;
  usable: boolean;
  reasons: FitCoreMetricSignalReason[];
}

export interface FitCoreAnalyticsSignalSummary {
  supported: number;
  unsupported: number;
  usable: number;
  unusable: number;
  withinExpectedRange: number;
  outsideExpectedRange: number;
  farOutsideExpectedRange: number;
  noMeaningfulChange: number;
  meaningfulIncrease: number;
  meaningfulDecrease: number;
  mixedDirection: number;
  unavailable: number;
  insufficientData: number;
}

export interface FitCoreAnalyticsSignalReport {
  anomalyPolicy: typeof FITCORE_ANOMALY_DETECTION_POLICY;
  meaningfulChangePolicy: typeof FITCORE_MEANINGFUL_CHANGE_POLICY;
  evaluationAt: string;
  nodeCount: number;
  supportedNodeCount: number;
  records: FitCoreMetricSignalRecord[];
  summary: FitCoreAnalyticsSignalSummary;
}

const ABSOLUTE_EPSILON_BY_NODE: Readonly<Record<string, number>> = Object.freeze({
  "training.volume.7d": 1,
  "nutrition.calories.consistency": 10,
  "nutrition.protein.consistency": 1,
  "nutrition.carbs.consistency": 1,
  "nutrition.fat.consistency": 1,
  "recovery.detail.soreness.trend": 0.25,
  "recovery.detail.energy.trend": 0.25,
  "recovery.detail.motivation.trend": 0.25,
  "recovery.detail.stress.trend": 0.25,
  "recovery.detail.readiness.trend": 1,
  "progress.bodyweight.series": 0.1,
});

const reasonMessages: Record<FitCoreMetricSignalReasonCode, string> = {
  signal_ready: "At least one Task 14 calculation is ready and passes interpretation gates.",
  unsupported_metric: "The graph node has no Task 13 historical-series adapter.",
  metric_unresolved: "The graph node has no corresponding Task 13 record.",
  anomaly_unavailable: "A latest individual observation is not exposed by Task 13 evidence.",
  change_unavailable: "Meaningful change is unavailable from Task 13 windows.",
  task13_unusable: "The Task 13 record is not usable for interpretation.",
  trust_unavailable: "Task 12 trust is unavailable.",
  trust_below_interpretation_threshold: "Task 12 trust is below the interpretation threshold.",
  freshness_unknown: "Task 12 freshness is unknown.",
  freshness_stale: "Task 12 freshness is stale.",
  freshness_invalid: "Task 12 freshness is invalid.",
};

function signalReasons(
  codes: Iterable<FitCoreMetricSignalReasonCode>,
): FitCoreMetricSignalReason[] {
  return [...new Set(codes)]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, message: reasonMessages[code] }));
}

function trustReasonCodes(record: FitCoreMetricTrendRecord): FitCoreMetricSignalReasonCode[] {
  const codes: FitCoreMetricSignalReasonCode[] = [];
  if (record.trust.trustScore === null || record.trust.trustLevel === "unavailable")
    codes.push("trust_unavailable");
  else if (
    !Number.isFinite(record.trust.trustScore) ||
    record.trust.trustScore < 0.5 ||
    record.trust.trustLevel === "low"
  )
    codes.push("trust_below_interpretation_threshold");
  if (record.trust.freshnessState === "unknown") codes.push("freshness_unknown");
  if (record.trust.freshnessState === "stale") codes.push("freshness_stale");
  if (record.trust.freshnessState === "invalid") codes.push("freshness_invalid");
  return codes;
}

function unavailableAnomaly(
  code: "unsupported_metric" | "metric_unresolved",
): AnomalyDetectionResult {
  return {
    policy: FITCORE_ANOMALY_DETECTION_POLICY,
    status: "unavailable",
    classification: "unavailable",
    value: null,
    baselineCenter: null,
    absoluteDeviation: null,
    signedDeviation: null,
    robustScale: null,
    robustDeviationScore: null,
    lowerExpectedBound: null,
    upperExpectedBound: null,
    evaluatedAt: null,
    reasons: getAnomalyDetectionReasons([code]),
  };
}

function unavailableChange(
  code: "unsupported_metric" | "metric_unresolved",
): MeaningfulChangeResult {
  return {
    policy: FITCORE_MEANINGFUL_CHANGE_POLICY,
    status: "unavailable",
    classification: "unavailable",
    primaryWindow: null,
    supportingWindows: [],
    conflictingWindows: [],
    currentValue: null,
    previousValue: null,
    absoluteChange: null,
    relativeChange: null,
    slopePerDay: null,
    reasons: getMeaningfulChangeReasons([code]),
  };
}

function appendTrustReasons(
  anomaly: AnomalyDetectionResult,
  change: MeaningfulChangeResult,
  codes: readonly FitCoreMetricSignalReasonCode[],
): { anomaly: AnomalyDetectionResult; change: MeaningfulChangeResult } {
  const anomalyCodes: AnomalyDetectionReasonCode[] = [];
  const changeCodes: MeaningfulChangeReasonCode[] = [];
  for (const code of codes) {
    if (
      code === "trust_unavailable" ||
      code === "trust_below_interpretation_threshold" ||
      code === "freshness_unknown" ||
      code === "freshness_stale" ||
      code === "freshness_invalid"
    ) {
      anomalyCodes.push(code);
      changeCodes.push(code);
    }
  }
  return {
    anomaly: {
      ...anomaly,
      reasons: getAnomalyDetectionReasons([
        ...anomaly.reasons.map((reason) => reason.code),
        ...anomalyCodes,
      ]),
    },
    change: {
      ...change,
      reasons: getMeaningfulChangeReasons([
        ...change.reasons.map((reason) => reason.code),
        ...changeCodes,
      ]),
    },
  };
}

function unresolvedRecord(nodeId: string): FitCoreMetricSignalRecord {
  return {
    nodeId,
    supported: false,
    anomaly: unavailableAnomaly("metric_unresolved"),
    meaningfulChange: unavailableChange("metric_unresolved"),
    trustScore: null,
    trustLevel: "unavailable",
    freshnessState: "unknown",
    traceability: null,
    usable: false,
    reasons: signalReasons(["metric_unresolved", "trust_unavailable", "freshness_unknown"]),
  };
}

/** Builds Task 14 exclusively from existing graph-ordered Task 13 evidence. */
export function getFitCoreAnalyticsSignals(analytics: {
  trends: FitCoreAnalyticsTrendReport;
}): FitCoreAnalyticsSignalReport {
  const trendById = new Map(analytics.trends.records.map((record) => [record.nodeId, record]));
  const records = METRIC_DEPENDENCY_GRAPH.map((node): FitCoreMetricSignalRecord => {
    const trend = trendById.get(node.id);
    if (!trend) return unresolvedRecord(node.id);
    if (!trend.supported) {
      return {
        nodeId: node.id,
        supported: false,
        anomaly: unavailableAnomaly("unsupported_metric"),
        meaningfulChange: unavailableChange("unsupported_metric"),
        trustScore: trend.trust.trustScore,
        trustLevel: trend.trust.trustLevel,
        freshnessState: trend.trust.freshnessState,
        traceability: trend.trust.traceability,
        usable: false,
        reasons: signalReasons(["unsupported_metric"]),
      };
    }

    const epsilon = ABSOLUTE_EPSILON_BY_NODE[node.id];
    const baseAnomaly = evaluateAnomaly(null, trend.baseline, {
      absoluteEpsilon: epsilon,
      evaluatedAt: analytics.trends.evaluationAt,
    });
    const baseChange = evaluateMeaningfulChange(trend.rollingWindows);
    const trustCodes = trustReasonCodes(trend);
    const { anomaly, change } = appendTrustReasons(baseAnomaly, baseChange, trustCodes);
    const trustOkay =
      trend.trust.trustScore !== null &&
      Number.isFinite(trend.trust.trustScore) &&
      trend.trust.trustScore >= 0.5 &&
      (trend.trust.trustLevel === "medium" || trend.trust.trustLevel === "high");
    const freshnessOkay =
      trend.trust.freshnessState === "fresh" || trend.trust.freshnessState === "aging";
    const calculationReady = anomaly.status === "ready" || change.status === "ready";
    const usable = trend.usable && trustOkay && freshnessOkay && calculationReady;
    const codes: FitCoreMetricSignalReasonCode[] = [...trustCodes];
    if (anomaly.status !== "ready") codes.push("anomaly_unavailable");
    if (change.status !== "ready") codes.push("change_unavailable");
    if (!trend.usable) codes.push("task13_unusable");
    if (usable) codes.push("signal_ready");
    return {
      nodeId: node.id,
      supported: true,
      anomaly,
      meaningfulChange: change,
      trustScore: trend.trust.trustScore,
      trustLevel: trend.trust.trustLevel,
      freshnessState: trend.trust.freshnessState,
      traceability: trend.trust.traceability,
      usable,
      reasons: signalReasons(codes),
    };
  });

  const aggregateStatus = (record: FitCoreMetricSignalRecord) => {
    if (record.anomaly.status === "ready" || record.meaningfulChange.status === "ready")
      return "ready";
    if (
      record.anomaly.status === "insufficient_data" ||
      record.meaningfulChange.status === "insufficient_data"
    )
      return "insufficient_data";
    return "unavailable";
  };
  const summary: FitCoreAnalyticsSignalSummary = {
    supported: records.filter((record) => record.supported).length,
    unsupported: records.filter((record) => !record.supported).length,
    usable: records.filter((record) => record.usable).length,
    unusable: records.filter((record) => !record.usable).length,
    withinExpectedRange: records.filter(
      (record) => record.anomaly.classification === "within_expected_range",
    ).length,
    outsideExpectedRange: records.filter(
      (record) => record.anomaly.classification === "outside_expected_range",
    ).length,
    farOutsideExpectedRange: records.filter(
      (record) => record.anomaly.classification === "far_outside_expected_range",
    ).length,
    noMeaningfulChange: records.filter(
      (record) => record.meaningfulChange.classification === "no_meaningful_change",
    ).length,
    meaningfulIncrease: records.filter(
      (record) => record.meaningfulChange.classification === "meaningful_increase",
    ).length,
    meaningfulDecrease: records.filter(
      (record) => record.meaningfulChange.classification === "meaningful_decrease",
    ).length,
    mixedDirection: records.filter(
      (record) => record.meaningfulChange.classification === "mixed_direction",
    ).length,
    unavailable: records.filter((record) => aggregateStatus(record) === "unavailable").length,
    insufficientData: records.filter((record) => aggregateStatus(record) === "insufficient_data")
      .length,
  };
  return {
    anomalyPolicy: FITCORE_ANOMALY_DETECTION_POLICY,
    meaningfulChangePolicy: FITCORE_MEANINGFUL_CHANGE_POLICY,
    evaluationAt: analytics.trends.evaluationAt,
    nodeCount: records.length,
    supportedNodeCount: summary.supported,
    records,
    summary,
  };
}
