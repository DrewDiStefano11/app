import type {
  AnalyticsTimeSeriesPoint,
  PersonalBaselineResult,
  TimeSeriesAggregation,
} from "./personal-baselines";

export const FITCORE_ROLLING_TREND_POLICY = "fitcore_rolling_trend_v1";
const DAY_MS = 86_400_000;
export const ROLLING_TREND_WINDOWS = Object.freeze({
  days_7: Object.freeze({ days: 7, minimumSamples: 3 }),
  days_28: Object.freeze({ days: 28, minimumSamples: 7 }),
  days_90: Object.freeze({ days: 90, minimumSamples: 14 }),
});
export type RollingTrendWindow = keyof typeof ROLLING_TREND_WINDOWS;
export type RollingTrendStatus = "unavailable" | "insufficient_data" | "ready";
export type RollingTrendDirection = "unavailable" | "stable" | "increasing" | "decreasing";
export type RollingTrendReasonCode =
  | "trend_ready"
  | "no_valid_points"
  | "insufficient_current_samples"
  | "insufficient_previous_samples"
  | "invalid_timestamp_excluded"
  | "future_point_excluded"
  | "non_finite_value_excluded"
  | "duplicate_timestamp_aggregated"
  | "previous_value_zero"
  | "baseline_threshold_used"
  | "fallback_threshold_used"
  | "invalid_calculation"
  | "no_series_adapter";
export interface RollingTrendReason {
  code: RollingTrendReasonCode;
  message: string;
}
export interface RollingTrendOptions {
  evaluationAt: string;
  absoluteEpsilon: number;
  baseline?: PersonalBaselineResult | null;
  aggregation?: TimeSeriesAggregation;
}
export interface RollingTrendWindowResult {
  window: RollingTrendWindow;
  status: RollingTrendStatus;
  direction: RollingTrendDirection;
  currentSampleCount: number;
  previousSampleCount: number;
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  relativeChange: number | null;
  slopePerDay: number | null;
  threshold: number | null;
  currentStartAt: string;
  currentEndAt: string;
  previousStartAt: string;
  previousEndAt: string;
  reasons: RollingTrendReason[];
}
export interface RollingTrendResult {
  policy: typeof FITCORE_ROLLING_TREND_POLICY;
  evaluationAt: string;
  windows: RollingTrendWindowResult[];
}

const messages: Record<RollingTrendReasonCode, string> = {
  trend_ready: "Both equal-duration periods meet the evidence minimum.",
  no_valid_points: "No valid time-series points are available.",
  insufficient_current_samples: "The current period has too few distinct samples.",
  insufficient_previous_samples: "The previous period has too few distinct samples.",
  invalid_timestamp_excluded: "A point with an invalid timestamp was excluded.",
  future_point_excluded: "A future-dated point was excluded.",
  non_finite_value_excluded: "A point with a non-finite value was excluded.",
  duplicate_timestamp_aggregated: "Duplicate timestamps were aggregated deterministically.",
  previous_value_zero: "Relative change is unavailable because the previous median is zero.",
  baseline_threshold_used: "Direction uses the ready personal-baseline threshold.",
  fallback_threshold_used: "Direction uses the previous-period fallback threshold.",
  invalid_calculation: "A rolling statistic could not be calculated safely.",
  no_series_adapter: "No legitimate historical-series adapter is available.",
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function aggregate(values: readonly number[], mode: TimeSeriesAggregation): number {
  if (mode === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (mode === "minimum") return Math.min(...values);
  if (mode === "maximum") return Math.max(...values);
  if (mode === "last") return values.at(-1) ?? 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function reasons(codes: Iterable<RollingTrendReasonCode>): RollingTrendReason[] {
  return [...new Set(codes)].sort().map((code) => ({ code, message: messages[code] }));
}
function slope(points: readonly { timestamp: number; value: number }[]): number | null {
  if (points.length < 2 || new Set(points.map((point) => point.timestamp)).size < 2) return null;
  const first = points[0].timestamp;
  const xs = points.map((point) => (point.timestamp - first) / DAY_MS);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / points.length;
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (denominator === 0) return null;
  const result =
    points.reduce((sum, point, index) => sum + (xs[index] - meanX) * (point.value - meanY), 0) /
    denominator;
  return Number.isFinite(result) ? result : null;
}

/** Current and previous windows use adjacent UTC millisecond intervals [start, end). */
export function calculateRollingTrend(
  points: readonly unknown[],
  options: RollingTrendOptions,
): RollingTrendResult {
  const parsedEvaluation = Date.parse(options.evaluationAt);
  const evaluation = Number.isFinite(parsedEvaluation) ? parsedEvaluation : 0;
  const epsilon = Number.isFinite(options.absoluteEpsilon)
    ? Math.max(0, options.absoluteEpsilon)
    : 0;
  const sharedCodes: RollingTrendReasonCode[] = [];
  const valid: Array<{ timestamp: number; value: number; sourceId: string }> = [];
  if (Number.isFinite(parsedEvaluation)) {
    for (const point of points) {
      if (
        !isRecord(point) ||
        typeof point.timestamp !== "string" ||
        !Number.isFinite(Date.parse(point.timestamp))
      ) {
        sharedCodes.push("invalid_timestamp_excluded");
        continue;
      }
      if (typeof point.value !== "number" || !Number.isFinite(point.value)) {
        sharedCodes.push("non_finite_value_excluded");
        continue;
      }
      const timestamp = Date.parse(point.timestamp);
      if (timestamp > evaluation) {
        sharedCodes.push("future_point_excluded");
        continue;
      }
      valid.push({
        timestamp,
        value: point.value,
        sourceId: typeof point.sourceId === "string" ? point.sourceId : "",
      });
    }
  } else sharedCodes.push("invalid_timestamp_excluded");
  valid.sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : a.value - b.value),
  );
  const grouped = new Map<number, number[]>();
  valid.forEach((point) =>
    grouped.set(point.timestamp, [...(grouped.get(point.timestamp) ?? []), point.value]),
  );
  if ([...grouped.values()].some((values) => values.length > 1))
    sharedCodes.push("duplicate_timestamp_aggregated");
  const normalized = [...grouped.entries()].map(([timestamp, values]) => ({
    timestamp,
    value: aggregate(values, options.aggregation ?? "mean"),
  }));
  const windows = (Object.keys(ROLLING_TREND_WINDOWS) as RollingTrendWindow[]).map(
    (window): RollingTrendWindowResult => {
      const config = ROLLING_TREND_WINDOWS[window];
      const currentEnd = evaluation;
      const currentStart = evaluation - config.days * DAY_MS;
      const previousEnd = currentStart;
      const previousStart = previousEnd - config.days * DAY_MS;
      const boundary = {
        currentStartAt: new Date(currentStart).toISOString(),
        currentEndAt: new Date(currentEnd).toISOString(),
        previousStartAt: new Date(previousStart).toISOString(),
        previousEndAt: new Date(previousEnd).toISOString(),
      };
      const current = normalized.filter(
        (point) => point.timestamp >= currentStart && point.timestamp < currentEnd,
      );
      const previous = normalized.filter(
        (point) => point.timestamp >= previousStart && point.timestamp < previousEnd,
      );
      const codes = [...sharedCodes];
      if (!normalized.length) codes.push("no_valid_points");
      if (current.length < config.minimumSamples) codes.push("insufficient_current_samples");
      if (previous.length < config.minimumSamples) codes.push("insufficient_previous_samples");
      if (current.length < config.minimumSamples || previous.length < config.minimumSamples) {
        return {
          window,
          status: normalized.length ? "insufficient_data" : "unavailable",
          direction: "unavailable",
          currentSampleCount: current.length,
          previousSampleCount: previous.length,
          currentValue: null,
          previousValue: null,
          absoluteChange: null,
          relativeChange: null,
          slopePerDay: null,
          threshold: null,
          ...boundary,
          reasons: reasons(codes),
        };
      }
      const currentValue = median(current.map((point) => point.value));
      const previousValue = median(previous.map((point) => point.value));
      const absoluteChange = currentValue - previousValue;
      const baselineReady =
        options.baseline?.status === "ready" &&
        options.baseline.center !== null &&
        options.baseline.robustStandardDeviation !== null;
      const threshold = baselineReady
        ? Math.max(
            epsilon,
            Math.abs(options.baseline!.center!) * 0.03,
            options.baseline!.robustStandardDeviation! * 0.5,
          )
        : Math.max(epsilon, Math.abs(previousValue) * 0.05);
      codes.push(
        baselineReady ? "baseline_threshold_used" : "fallback_threshold_used",
        "trend_ready",
      );
      const relativeChange = previousValue === 0 ? null : absoluteChange / Math.abs(previousValue);
      if (previousValue === 0) codes.push("previous_value_zero");
      const slopePerDay = slope(current);
      if (![currentValue, previousValue, absoluteChange, threshold].every(Number.isFinite))
        codes.push("invalid_calculation");
      const direction: RollingTrendDirection =
        absoluteChange > threshold
          ? "increasing"
          : absoluteChange < -threshold
            ? "decreasing"
            : "stable";
      return {
        window,
        status: "ready",
        direction,
        currentSampleCount: current.length,
        previousSampleCount: previous.length,
        currentValue,
        previousValue,
        absoluteChange,
        relativeChange,
        slopePerDay,
        threshold,
        ...boundary,
        reasons: reasons(codes),
      };
    },
  );
  return {
    policy: FITCORE_ROLLING_TREND_POLICY,
    evaluationAt: Number.isFinite(parsedEvaluation)
      ? options.evaluationAt
      : new Date(evaluation).toISOString(),
    windows,
  };
}
