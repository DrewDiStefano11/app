import type { AnalyticsMetricKind, AnalyticsStatus, TrendQualityResult } from "./domain-metrics";

export const METRIC_QUALITY_THRESHOLDS = Object.freeze({ medium: 0.5, high: 0.8 });

export type MetricQualityLevel = "unavailable" | "low" | "medium" | "high";
export type MetricQualityReasonCode =
  | "no_evidence"
  | "invalid_evidence"
  | "insufficient_samples"
  | "sparse_coverage"
  | "partial_period"
  | "excluded_records"
  | "missing_target"
  | "invalid_comparison_period"
  | "unsupported_data"
  | "uneven_spacing"
  | "high_variability"
  | "outliers_present"
  | "complete_evidence";

export interface MetricQualityReason {
  code: MetricQualityReasonCode;
  message: string;
}

export interface MetricQualityEvidence {
  status: AnalyticsStatus;
  hasValue: boolean;
  validRecordCount: number;
  minimumSampleSize: number;
  includedRecordCount: number;
  excludedRecordCount: number;
  exclusionRatio: number | null;
  coverageDayCount: number;
  expectedDayCount: number | null;
  coverageRatio: number | null;
  missingDataRatio: number | null;
  partialPeriod: boolean;
  comparisonPeriodValid: boolean | null;
  targetRequired: boolean;
  targetValid: boolean | null;
  unsupported: boolean;
  invalid: boolean;
  metricKind: AnalyticsMetricKind;
  trendQuality: TrendQualityResult | null;
}

export interface MetricQualityInput {
  status: AnalyticsStatus;
  hasValue: boolean;
  validRecordCount?: number;
  minimumSampleSize?: number;
  includedRecordCount?: number;
  excludedRecordCount?: number;
  coverageDayCount?: number;
  expectedDayCount?: number | null;
  missingDataRatio?: number | null;
  partialPeriod?: boolean;
  comparisonPeriodValid?: boolean | null;
  targetRequired?: boolean;
  targetValid?: boolean | null;
  unsupported?: boolean;
  invalid?: boolean;
  metricKind?: AnalyticsMetricKind;
  trendQuality?: TrendQualityResult | null;
}

export interface MetricQualityAssessment {
  level: MetricQualityLevel;
  score: number | null;
  reasons: MetricQualityReason[];
  limitingFactors: MetricQualityReasonCode[];
  evidence: MetricQualityEvidence;
}

const messageByCode: Record<MetricQualityReasonCode, string> = {
  no_evidence: "No assessable metric evidence is available.",
  invalid_evidence: "The available evidence is explicitly invalid or unusable.",
  insufficient_samples: "Valid samples do not meet the metric minimum.",
  sparse_coverage: "Observed days cover only a sparse part of the expected period.",
  partial_period: "The requested evidence period is incomplete.",
  excluded_records: "One or more source records were excluded.",
  missing_target: "A required valid target is unavailable.",
  invalid_comparison_period: "A required comparison period is invalid.",
  unsupported_data: "Required data is unsupported rather than measured as zero.",
  uneven_spacing: "Trend observations are unevenly spaced.",
  high_variability: "Trend evidence has high variability.",
  outliers_present: "Trend evidence contains outliers.",
  complete_evidence: "Available evidence meets the quality policy.",
};

function finiteNonNegative(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function levelFor(score: number | null): MetricQualityLevel {
  if (score === null) return "unavailable";
  if (score >= METRIC_QUALITY_THRESHOLDS.high) return "high";
  if (score >= METRIC_QUALITY_THRESHOLDS.medium) return "medium";
  return "low";
}

export function evaluateMetricQuality(input: MetricQualityInput): MetricQualityAssessment {
  const validRecordCount = finiteNonNegative(input.validRecordCount);
  const minimumSampleSize = Math.max(1, finiteNonNegative(input.minimumSampleSize) || 1);
  const includedRecordCount = finiteNonNegative(input.includedRecordCount ?? validRecordCount);
  const excludedRecordCount = finiteNonNegative(input.excludedRecordCount);
  const coverageDayCount = finiteNonNegative(input.coverageDayCount);
  const expectedDayCount =
    typeof input.expectedDayCount === "number" && Number.isFinite(input.expectedDayCount)
      ? Math.max(0, input.expectedDayCount)
      : null;
  const totalRecords = includedRecordCount + excludedRecordCount;
  const exclusionRatio = totalRecords > 0 ? clamp(excludedRecordCount / totalRecords) : null;
  const coverageRatio =
    expectedDayCount !== null && expectedDayCount > 0
      ? clamp(coverageDayCount / expectedDayCount)
      : null;
  const missingDataRatio =
    typeof input.missingDataRatio === "number" && Number.isFinite(input.missingDataRatio)
      ? clamp(input.missingDataRatio)
      : coverageRatio === null
        ? null
        : clamp(1 - coverageRatio);
  const evidence: MetricQualityEvidence = {
    status: input.status,
    hasValue: input.hasValue,
    validRecordCount,
    minimumSampleSize,
    includedRecordCount,
    excludedRecordCount,
    exclusionRatio,
    coverageDayCount,
    expectedDayCount,
    coverageRatio,
    missingDataRatio,
    partialPeriod: input.partialPeriod ?? false,
    comparisonPeriodValid: input.comparisonPeriodValid ?? null,
    targetRequired: input.targetRequired ?? false,
    targetValid: input.targetValid ?? null,
    unsupported: input.unsupported ?? false,
    invalid: input.invalid ?? false,
    metricKind: input.metricKind ?? "aggregate",
    trendQuality: input.trendQuality ?? null,
  };
  const noEvidence = !evidence.hasValue && validRecordCount === 0 && includedRecordCount === 0;
  if (noEvidence && !evidence.invalid && !evidence.unsupported) {
    return {
      level: "unavailable",
      score: null,
      reasons: [{ code: "no_evidence", message: messageByCode.no_evidence }],
      limitingFactors: ["no_evidence"],
      evidence,
    };
  }

  let score = evidence.invalid || evidence.unsupported ? 0 : 1;
  const codes: MetricQualityReasonCode[] = [];
  if (evidence.invalid) codes.push("invalid_evidence");
  if (evidence.unsupported) codes.push("unsupported_data");
  if (validRecordCount < minimumSampleSize) {
    score = Math.min(score, 0.49);
    codes.push("insufficient_samples");
  }
  if (coverageRatio !== null) {
    score *= coverageRatio;
    if (coverageRatio < 0.5) codes.push("sparse_coverage");
  }
  if (evidence.partialPeriod) {
    score = Math.min(score, 0.79);
    codes.push("partial_period");
  }
  if (exclusionRatio !== null && exclusionRatio > 0) {
    score *= 1 - exclusionRatio;
    codes.push("excluded_records");
  }
  if (evidence.targetRequired && evidence.targetValid !== true) {
    score = Math.min(score, 0.49);
    codes.push("missing_target");
  }
  if (evidence.metricKind === "comparison" && evidence.comparisonPeriodValid !== true) {
    score = Math.min(score, 0.49);
    codes.push("invalid_comparison_period");
  }
  if (
    evidence.trendQuality &&
    (evidence.metricKind === "time_series" || evidence.metricKind === "comparison")
  ) {
    if (evidence.trendQuality.codes.includes("uneven_spacing")) {
      score *= 0.9;
      codes.push("uneven_spacing");
    }
    if (evidence.trendQuality.codes.includes("volatile_trend")) {
      score *= 0.85;
      codes.push("high_variability");
    }
    if (evidence.trendQuality.outlierCount > 0) {
      score *= 0.9;
      codes.push("outliers_present");
    }
  }
  if (evidence.status === "needs_more_data") score = Math.min(score, 0.49);
  if (evidence.status === "unavailable") score = Math.min(score, 0.49);
  const uniqueCodes = [...new Set(codes)].sort();
  if (uniqueCodes.length === 0) uniqueCodes.push("complete_evidence");
  const finalScore = clamp(score);
  return {
    level: levelFor(finalScore),
    score: finalScore,
    reasons: uniqueCodes.map((code) => ({ code, message: messageByCode[code] })),
    limitingFactors: uniqueCodes.filter((code) => code !== "complete_evidence"),
    evidence,
  };
}
