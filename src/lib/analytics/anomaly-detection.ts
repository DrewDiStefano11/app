import type { PersonalBaselineResult } from "./personal-baselines";

export const FITCORE_ANOMALY_DETECTION_POLICY = "fitcore_anomaly_detection_v1";

export type AnomalyDetectionStatus = "unavailable" | "insufficient_data" | "ready";
export type AnomalyClassification =
  | "unavailable"
  | "within_expected_range"
  | "outside_expected_range"
  | "far_outside_expected_range";
export type AnomalyDetectionReasonCode =
  | "anomaly_ready"
  | "baseline_unavailable"
  | "baseline_insufficient"
  | "current_value_unavailable"
  | "non_finite_current_value"
  | "baseline_center_unavailable"
  | "robust_scale_from_mad"
  | "robust_scale_from_iqr"
  | "robust_scale_from_epsilon"
  | "invalid_robust_scale"
  | "within_expected_range"
  | "outside_expected_range"
  | "far_outside_expected_range"
  | "unsupported_metric"
  | "metric_unresolved"
  | "trust_unavailable"
  | "trust_below_interpretation_threshold"
  | "freshness_unknown"
  | "freshness_stale"
  | "freshness_invalid";

export interface AnomalyDetectionReason {
  code: AnomalyDetectionReasonCode;
  message: string;
}

export interface AnomalyDetectionOptions {
  absoluteEpsilon: number;
  evaluatedAt?: string | null;
}

export interface AnomalyDetectionResult {
  policy: typeof FITCORE_ANOMALY_DETECTION_POLICY;
  status: AnomalyDetectionStatus;
  classification: AnomalyClassification;
  value: number | null;
  baselineCenter: number | null;
  absoluteDeviation: number | null;
  signedDeviation: number | null;
  robustScale: number | null;
  robustDeviationScore: number | null;
  lowerExpectedBound: number | null;
  upperExpectedBound: number | null;
  evaluatedAt: string | null;
  reasons: AnomalyDetectionReason[];
}

const reasonMessages: Record<AnomalyDetectionReasonCode, string> = {
  anomaly_ready: "The value was evaluated against a ready robust personal baseline.",
  baseline_unavailable: "A personal baseline is unavailable.",
  baseline_insufficient: "The personal baseline has insufficient historical evidence.",
  current_value_unavailable: "A latest individual observation is unavailable.",
  non_finite_current_value: "The current value is not finite.",
  baseline_center_unavailable: "The baseline center is unavailable or invalid.",
  robust_scale_from_mad: "Robust scale uses the baseline MAD-derived standard deviation.",
  robust_scale_from_iqr: "Robust scale uses the baseline interquartile range.",
  robust_scale_from_epsilon: "Robust scale uses the metric absolute epsilon.",
  invalid_robust_scale: "A finite positive robust denominator could not be formed.",
  within_expected_range: "The value is less than three robust scale units from baseline.",
  outside_expected_range:
    "The value is at least three but less than five robust scale units from baseline.",
  far_outside_expected_range: "The value is at least five robust scale units from baseline.",
  unsupported_metric: "The metric has no supported historical-series adapter.",
  metric_unresolved: "The metric could not be resolved to Task 13 evidence.",
  trust_unavailable: "Task 12 trust is unavailable.",
  trust_below_interpretation_threshold: "Task 12 trust is below the interpretation threshold.",
  freshness_unknown: "Task 12 freshness is unknown.",
  freshness_stale: "Task 12 freshness is stale.",
  freshness_invalid: "Task 12 freshness is invalid.",
};

export function getAnomalyDetectionReasons(
  codes: Iterable<AnomalyDetectionReasonCode>,
): AnomalyDetectionReason[] {
  return [...new Set(codes)]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, message: reasonMessages[code] }));
}

function safeEvaluatedAt(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function emptyResult(
  status: Exclude<AnomalyDetectionStatus, "ready">,
  baselineCenter: number | null,
  value: number | null,
  evaluatedAt: string | null,
  codes: readonly AnomalyDetectionReasonCode[],
): AnomalyDetectionResult {
  return {
    policy: FITCORE_ANOMALY_DETECTION_POLICY,
    status,
    classification: "unavailable",
    value,
    baselineCenter,
    absoluteDeviation: null,
    signedDeviation: null,
    robustScale: null,
    robustDeviationScore: null,
    lowerExpectedBound: null,
    upperExpectedBound: null,
    evaluatedAt,
    reasons: getAnomalyDetectionReasons(codes),
  };
}

/** Evaluates one individual finite observation against an existing Task 13 personal baseline. */
export function evaluateAnomaly(
  currentValue: unknown,
  baseline: PersonalBaselineResult | null | undefined,
  options: AnomalyDetectionOptions,
): AnomalyDetectionResult {
  const evaluatedAt = safeEvaluatedAt(options.evaluatedAt);
  const finiteCenter =
    typeof baseline?.center === "number" && Number.isFinite(baseline.center)
      ? baseline.center
      : null;
  const finiteValue =
    typeof currentValue === "number" && Number.isFinite(currentValue) ? currentValue : null;

  if (!baseline || baseline.status === "unavailable")
    return emptyResult("unavailable", finiteCenter, finiteValue, evaluatedAt, [
      "baseline_unavailable",
    ]);
  if (baseline.status === "insufficient_data")
    return emptyResult("insufficient_data", finiteCenter, finiteValue, evaluatedAt, [
      "baseline_insufficient",
    ]);
  if (currentValue === null || currentValue === undefined)
    return emptyResult("unavailable", finiteCenter, null, evaluatedAt, [
      "current_value_unavailable",
    ]);
  if (finiteValue === null)
    return emptyResult("unavailable", finiteCenter, null, evaluatedAt, [
      "non_finite_current_value",
    ]);
  if (finiteCenter === null)
    return emptyResult("unavailable", null, finiteValue, evaluatedAt, [
      "baseline_center_unavailable",
    ]);

  const epsilon =
    Number.isFinite(options.absoluteEpsilon) && options.absoluteEpsilon > 0
      ? options.absoluteEpsilon
      : null;
  const madScale =
    typeof baseline.robustStandardDeviation === "number" &&
    Number.isFinite(baseline.robustStandardDeviation) &&
    baseline.robustStandardDeviation > 0
      ? baseline.robustStandardDeviation
      : null;
  const iqr =
    typeof baseline.percentile25 === "number" &&
    Number.isFinite(baseline.percentile25) &&
    typeof baseline.percentile75 === "number" &&
    Number.isFinite(baseline.percentile75)
      ? baseline.percentile75 - baseline.percentile25
      : null;
  const iqrScale = iqr !== null && Number.isFinite(iqr) && iqr > 0 ? iqr / 1.349 : null;
  const robustScale = madScale ?? iqrScale ?? epsilon;
  if (robustScale === null || !Number.isFinite(robustScale) || robustScale <= 0)
    return emptyResult("unavailable", finiteCenter, finiteValue, evaluatedAt, [
      "invalid_robust_scale",
    ]);

  const denominator = Math.max(robustScale, epsilon ?? 0);
  const signedDeviation = finiteValue - finiteCenter;
  const absoluteDeviation = Math.abs(signedDeviation);
  const robustDeviationScore = absoluteDeviation / denominator;
  const lowerExpectedBound = finiteCenter - 3 * denominator;
  const upperExpectedBound = finiteCenter + 3 * denominator;
  if (
    ![
      denominator,
      signedDeviation,
      absoluteDeviation,
      robustDeviationScore,
      lowerExpectedBound,
      upperExpectedBound,
    ].every(Number.isFinite)
  )
    return emptyResult("unavailable", finiteCenter, finiteValue, evaluatedAt, [
      "invalid_robust_scale",
    ]);

  const classification: Exclude<AnomalyClassification, "unavailable"> =
    robustDeviationScore >= 5
      ? "far_outside_expected_range"
      : robustDeviationScore >= 3
        ? "outside_expected_range"
        : "within_expected_range";
  const scaleReason: AnomalyDetectionReasonCode = madScale
    ? "robust_scale_from_mad"
    : iqrScale
      ? "robust_scale_from_iqr"
      : "robust_scale_from_epsilon";
  return {
    policy: FITCORE_ANOMALY_DETECTION_POLICY,
    status: "ready",
    classification,
    value: finiteValue,
    baselineCenter: finiteCenter,
    absoluteDeviation,
    signedDeviation,
    robustScale,
    robustDeviationScore,
    lowerExpectedBound,
    upperExpectedBound,
    evaluatedAt,
    reasons: getAnomalyDetectionReasons(["anomaly_ready", scaleReason, classification]),
  };
}
