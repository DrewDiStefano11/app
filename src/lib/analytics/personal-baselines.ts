export const FITCORE_PERSONAL_BASELINE_POLICY = "fitcore_personal_baseline_v1";

const DAY_MS = 86_400_000;

export const PERSONAL_BASELINE_POLICIES = Object.freeze({
  daily: Object.freeze({ lookbackDays: 56, exclusionDays: 7, minimumDistinctDays: 7 }),
  sparse_event: Object.freeze({ lookbackDays: 112, exclusionDays: 7, minimumDistinctDays: 5 }),
});

export type PersonalBaselineCadence = keyof typeof PERSONAL_BASELINE_POLICIES;
export type TimeSeriesAggregation = "sum" | "mean" | "last" | "minimum" | "maximum";
export interface AnalyticsTimeSeriesPoint {
  timestamp: string;
  value: number;
  sourceId?: string;
}
export type PersonalBaselineStatus = "unavailable" | "insufficient_data" | "ready";
export type PersonalBaselineReasonCode =
  | "baseline_ready"
  | "no_valid_points"
  | "insufficient_history"
  | "invalid_timestamp_excluded"
  | "future_point_excluded"
  | "non_finite_value_excluded"
  | "duplicate_timestamp_aggregated"
  | "outside_baseline_window"
  | "invalid_calculation"
  | "no_series_adapter";
export interface PersonalBaselineReason {
  code: PersonalBaselineReasonCode;
  message: string;
}
export interface PersonalBaselineOptions {
  evaluationAt: string;
  cadence?: PersonalBaselineCadence;
  aggregation?: TimeSeriesAggregation;
}
export interface PersonalBaselineResult {
  policy: typeof FITCORE_PERSONAL_BASELINE_POLICY;
  status: PersonalBaselineStatus;
  sampleCount: number;
  distinctDayCount: number;
  lookbackDays: number;
  exclusionDays: number;
  center: number | null;
  mean: number | null;
  minimum: number | null;
  maximum: number | null;
  percentile25: number | null;
  percentile75: number | null;
  medianAbsoluteDeviation: number | null;
  robustStandardDeviation: number | null;
  latestIncludedAt: string | null;
  reasons: PersonalBaselineReason[];
}

const messages: Record<PersonalBaselineReasonCode, string> = {
  baseline_ready: "The personal baseline meets the configured history minimum.",
  no_valid_points: "No valid points are available in the baseline interval.",
  insufficient_history: "The baseline interval has too few distinct valid days.",
  invalid_timestamp_excluded: "A point with an invalid timestamp was excluded.",
  future_point_excluded: "A future-dated point was excluded.",
  non_finite_value_excluded: "A point with a non-finite value was excluded.",
  duplicate_timestamp_aggregated: "Duplicate timestamps were aggregated deterministically.",
  outside_baseline_window: "Points outside the baseline interval were excluded.",
  invalid_calculation: "A baseline statistic could not be calculated safely.",
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

function percentile(sorted: readonly number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function sortedReasons(codes: Iterable<PersonalBaselineReasonCode>): PersonalBaselineReason[] {
  return [...new Set(codes)].sort().map((code) => ({ code, message: messages[code] }));
}

function emptyResult(
  cadence: PersonalBaselineCadence,
  status: PersonalBaselineStatus,
  sampleCount: number,
  distinctDayCount: number,
  latestIncludedAt: string | null,
  codes: Iterable<PersonalBaselineReasonCode>,
): PersonalBaselineResult {
  const policy = PERSONAL_BASELINE_POLICIES[cadence];
  return {
    policy: FITCORE_PERSONAL_BASELINE_POLICY,
    status,
    sampleCount,
    distinctDayCount,
    lookbackDays: policy.lookbackDays,
    exclusionDays: policy.exclusionDays,
    center: null,
    mean: null,
    minimum: null,
    maximum: null,
    percentile25: null,
    percentile75: null,
    medianAbsoluteDeviation: null,
    robustStandardDeviation: null,
    latestIncludedAt,
    reasons: sortedReasons(codes),
  };
}

/** Baseline interval semantics are [evaluation-exclusion-lookback, evaluation-exclusion). */
export function calculatePersonalBaseline(
  points: readonly unknown[],
  options: PersonalBaselineOptions,
): PersonalBaselineResult {
  const cadence = options.cadence ?? "daily";
  const policy = PERSONAL_BASELINE_POLICIES[cadence];
  const evaluationAt = Date.parse(options.evaluationAt);
  const codes: PersonalBaselineReasonCode[] = [];
  if (!Number.isFinite(evaluationAt)) {
    return emptyResult(cadence, "unavailable", 0, 0, null, ["invalid_timestamp_excluded"]);
  }
  const end = evaluationAt - policy.exclusionDays * DAY_MS;
  const start = end - policy.lookbackDays * DAY_MS;
  const valid: Array<{ timestamp: number; value: number; sourceId: string }> = [];
  for (const point of points) {
    if (
      !isRecord(point) ||
      typeof point.timestamp !== "string" ||
      !Number.isFinite(Date.parse(point.timestamp))
    ) {
      codes.push("invalid_timestamp_excluded");
      continue;
    }
    if (typeof point.value !== "number" || !Number.isFinite(point.value)) {
      codes.push("non_finite_value_excluded");
      continue;
    }
    const timestamp = Date.parse(point.timestamp);
    if (timestamp > evaluationAt) {
      codes.push("future_point_excluded");
      continue;
    }
    if (timestamp < start || timestamp >= end) {
      codes.push("outside_baseline_window");
      continue;
    }
    valid.push({
      timestamp,
      value: point.value,
      sourceId: typeof point.sourceId === "string" ? point.sourceId : "",
    });
  }
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
    codes.push("duplicate_timestamp_aggregated");
  const normalized = [...grouped.entries()].map(([timestamp, values]) => ({
    timestamp,
    value: aggregate(values, options.aggregation ?? "mean"),
  }));
  const distinctDayCount = new Set(
    normalized.map((point) => new Date(point.timestamp).toISOString().slice(0, 10)),
  ).size;
  const latestIncludedAt = normalized.length
    ? new Date(normalized.at(-1)!.timestamp).toISOString()
    : null;
  if (normalized.length === 0)
    return emptyResult(cadence, "unavailable", 0, 0, null, [...codes, "no_valid_points"]);
  if (distinctDayCount < policy.minimumDistinctDays) {
    return emptyResult(
      cadence,
      "insufficient_data",
      normalized.length,
      distinctDayCount,
      latestIncludedAt,
      [...codes, "insufficient_history"],
    );
  }
  const values = normalized.map((point) => point.value).sort((a, b) => a - b);
  const center = percentile(values, 0.5);
  const deviations = values.map((value) => Math.abs(value - center)).sort((a, b) => a - b);
  const statistics = {
    center,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum: values[0],
    maximum: values.at(-1)!,
    percentile25: percentile(values, 0.25),
    percentile75: percentile(values, 0.75),
    medianAbsoluteDeviation: percentile(deviations, 0.5),
  };
  const robustStandardDeviation = statistics.medianAbsoluteDeviation * 1.4826;
  if (![...Object.values(statistics), robustStandardDeviation].every(Number.isFinite)) {
    return emptyResult(
      cadence,
      "unavailable",
      normalized.length,
      distinctDayCount,
      latestIncludedAt,
      [...codes, "invalid_calculation"],
    );
  }
  return {
    policy: FITCORE_PERSONAL_BASELINE_POLICY,
    status: "ready",
    sampleCount: normalized.length,
    distinctDayCount,
    lookbackDays: policy.lookbackDays,
    exclusionDays: policy.exclusionDays,
    ...statistics,
    robustStandardDeviation,
    latestIncludedAt,
    reasons: sortedReasons([...codes, "baseline_ready"]),
  };
}
