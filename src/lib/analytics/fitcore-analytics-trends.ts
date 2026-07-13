import type { AppState, RecoveryCheckIn } from "../types";
import { calculateWorkoutVolume, recoveryCheckInReadinessScore } from "./domain-metrics";
import type { FitCoreAnalyticsResult } from "./fitcore-analytics";
import { METRIC_DEPENDENCY_GRAPH } from "./metric-dependency-graph";
import {
  FITCORE_PERSONAL_BASELINE_POLICY,
  PERSONAL_BASELINE_POLICIES,
  calculatePersonalBaseline,
  type AnalyticsTimeSeriesPoint,
  type PersonalBaselineCadence,
  type PersonalBaselineResult,
  type TimeSeriesAggregation,
} from "./personal-baselines";
import {
  FITCORE_ROLLING_TREND_POLICY,
  ROLLING_TREND_WINDOWS,
  calculateRollingTrend,
  type RollingTrendDirection,
  type RollingTrendWindowResult,
} from "./rolling-trends";
import type { MetricFreshnessState } from "./metric-freshness";
import type { ProvenanceSourceType } from "./data-provenance";
import type { MetricTrustLevel } from "./metric-trust";

export type FitCoreTrendReasonCode =
  | "no_series_adapter"
  | "no_series_data"
  | "insufficient_data"
  | "low_trust"
  | "unknown_freshness"
  | "stale_freshness"
  | "invalid_freshness"
  | "usable_evidence";
export interface FitCoreTrendReason {
  code: FitCoreTrendReasonCode;
  message: string;
}
export interface FitCoreTrendTrustContext {
  trustScore: number | null;
  trustLevel: MetricTrustLevel;
  freshnessState: MetricFreshnessState;
  traceability: number | null;
  provenanceType: ProvenanceSourceType | null;
}
export interface FitCoreMetricTrendRecord {
  nodeId: string;
  dependencyIds: string[];
  supported: boolean;
  baseline: PersonalBaselineResult;
  rollingWindows: RollingTrendWindowResult[];
  trust: FitCoreTrendTrustContext;
  usable: boolean;
  reasons: FitCoreTrendReason[];
}
export interface FitCoreAnalyticsTrendSummary {
  supported: number;
  unsupported: number;
  usable: number;
  unavailable: number;
  insufficientData: number;
  increasing: number;
  decreasing: number;
  stable: number;
}
export interface FitCoreAnalyticsTrendReport {
  rollingTrendPolicy: typeof FITCORE_ROLLING_TREND_POLICY;
  personalBaselinePolicy: typeof FITCORE_PERSONAL_BASELINE_POLICY;
  evaluationAt: string;
  nodeCount: number;
  supportedNodeCount: number;
  records: FitCoreMetricTrendRecord[];
  summary: FitCoreAnalyticsTrendSummary;
}

interface AdapterDefinition {
  nodeId: string;
  sourceCollection: "workouts" | "meal_entries" | "recovery_check_ins" | "bodyweight_entries";
  cadence: PersonalBaselineCadence;
  aggregation: TimeSeriesAggregation;
  unit: string;
  absoluteEpsilon: number;
  series:
    | "training_volume"
    | "calories"
    | "protein"
    | "carbs"
    | "fat"
    | "soreness"
    | "energy"
    | "motivation"
    | "stress"
    | "readiness"
    | "bodyweight";
}

const ADAPTERS: readonly AdapterDefinition[] = Object.freeze([
  {
    nodeId: "training.volume.7d",
    sourceCollection: "workouts",
    cadence: "sparse_event",
    aggregation: "sum",
    unit: "load",
    absoluteEpsilon: 1,
    series: "training_volume",
  },
  ...(["calories", "protein", "carbs", "fat"] as const).map((macro) => ({
    nodeId: `nutrition.${macro}.consistency`,
    sourceCollection: "meal_entries" as const,
    cadence: "daily" as const,
    aggregation: "sum" as const,
    unit: macro === "calories" ? "kcal" : "grams",
    absoluteEpsilon: macro === "calories" ? 10 : 1,
    series: macro,
  })),
  ...(["soreness", "energy", "motivation", "stress", "readiness"] as const).map((field) => ({
    nodeId: `recovery.detail.${field}.trend`,
    sourceCollection: "recovery_check_ins" as const,
    cadence: "daily" as const,
    aggregation: "mean" as const,
    unit: field === "readiness" ? "score_0_100" : "score_1_10",
    absoluteEpsilon: field === "readiness" ? 1 : 0.25,
    series: field,
  })),
  {
    nodeId: "progress.bodyweight.series",
    sourceCollection: "bodyweight_entries",
    cadence: "daily",
    aggregation: "last",
    unit: "lb",
    absoluteEpsilon: 0.1,
    series: "bodyweight",
  },
]);

const reasonMessages: Record<FitCoreTrendReasonCode, string> = {
  no_series_adapter: "No legitimate historical-series adapter exists for this graph node.",
  no_series_data: "The supported adapter found no valid historical source data.",
  insufficient_data: "Historical evidence does not meet the baseline or rolling-window minimums.",
  low_trust: "Task 12 trust is unavailable or below the usability threshold.",
  unknown_freshness: "Task 12 freshness is unknown.",
  stale_freshness: "Task 12 freshness is stale; mathematical results are retained but unusable.",
  invalid_freshness: "Task 12 freshness is invalid.",
  usable_evidence: "Historical results and Task 12 trust meet the usability policy.",
};
function sortedReasons(codes: Iterable<FitCoreTrendReasonCode>): FitCoreTrendReason[] {
  return [...new Set(codes)].sort().map((code) => ({ code, message: reasonMessages[code] }));
}
interface RawPoint {
  id: string;
  timestamp: number;
  value: number;
}
function utcDay(timestamp: number): string {
  return new Date(
    Date.UTC(
      new Date(timestamp).getUTCFullYear(),
      new Date(timestamp).getUTCMonth(),
      new Date(timestamp).getUTCDate(),
    ),
  ).toISOString();
}
function bucketDaily(
  records: readonly RawPoint[],
  aggregation: TimeSeriesAggregation,
): AnalyticsTimeSeriesPoint[] {
  const sorted = [...records].sort(
    (a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : a.value - b.value),
  );
  const seenIds = new Set<string>();
  const unique = sorted.filter((record) => {
    if (record.id === "") return true;
    if (seenIds.has(record.id)) return false;
    seenIds.add(record.id);
    return true;
  });
  const invalid = unique
    .filter((record) => !Number.isFinite(record.timestamp) || !Number.isFinite(record.value))
    .map((record) => ({
      timestamp: Number.isFinite(record.timestamp)
        ? new Date(record.timestamp).toISOString()
        : "invalid",
      value: record.value,
    }));
  const groups = new Map<string, RawPoint[]>();
  unique
    .filter((record) => Number.isFinite(record.timestamp) && Number.isFinite(record.value))
    .forEach((record) => {
      const day = utcDay(record.timestamp);
      groups.set(day, [...(groups.get(day) ?? []), record]);
    });
  const aggregated = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([timestamp, values]) => {
      const numbers = values.map((value) => value.value);
      const value =
        aggregation === "sum"
          ? numbers.reduce((sum, item) => sum + item, 0)
          : aggregation === "mean"
            ? numbers.reduce((sum, item) => sum + item, 0) / numbers.length
            : aggregation === "minimum"
              ? Math.min(...numbers)
              : aggregation === "maximum"
                ? Math.max(...numbers)
                : values.at(-1)!.value;
      return { timestamp, value };
    });
  return [...aggregated, ...invalid];
}
function recoveryValue(checkIn: RecoveryCheckIn, field: AdapterDefinition["series"]): number {
  if (field === "readiness") return recoveryCheckInReadinessScore(checkIn);
  if (field === "soreness" || field === "energy" || field === "motivation" || field === "stress")
    return checkIn[field];
  return Number.NaN;
}
function buildSeries(state: AppState, adapter: AdapterDefinition): AnalyticsTimeSeriesPoint[] {
  if (adapter.series === "training_volume")
    return bucketDaily(
      state.workouts
        .filter((workout) => workout.endedAt !== undefined)
        .map((workout) => ({
          id: workout.id,
          timestamp: workout.endedAt!,
          value: calculateWorkoutVolume(workout),
        })),
      adapter.aggregation,
    );
  if (["calories", "protein", "carbs", "fat"].includes(adapter.series))
    return bucketDaily(
      state.mealEntries.map((meal) => ({
        id: meal.id,
        timestamp: meal.createdAt,
        value: meal[adapter.series as "calories" | "protein" | "carbs" | "fat"],
      })),
      adapter.aggregation,
    );
  if (["soreness", "energy", "motivation", "stress", "readiness"].includes(adapter.series))
    return bucketDaily(
      state.recoveryCheckIns.map((checkIn) => ({
        id: checkIn.id,
        timestamp: checkIn.createdAt,
        value: recoveryValue(checkIn, adapter.series),
      })),
      adapter.aggregation,
    );
  return bucketDaily(
    state.bodyweightEntries.map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt,
      value: entry.weightLb,
    })),
    adapter.aggregation,
  );
}
function unsupportedBaseline(): PersonalBaselineResult {
  return {
    policy: FITCORE_PERSONAL_BASELINE_POLICY,
    status: "unavailable",
    sampleCount: 0,
    distinctDayCount: 0,
    lookbackDays: PERSONAL_BASELINE_POLICIES.daily.lookbackDays,
    exclusionDays: PERSONAL_BASELINE_POLICIES.daily.exclusionDays,
    center: null,
    mean: null,
    minimum: null,
    maximum: null,
    percentile25: null,
    percentile75: null,
    medianAbsoluteDeviation: null,
    robustStandardDeviation: null,
    latestIncludedAt: null,
    reasons: [
      {
        code: "no_series_adapter",
        message: "No legitimate historical-series adapter is available.",
      },
    ],
  };
}
function unsupportedWindows(evaluationAt: string): RollingTrendWindowResult[] {
  return (Object.keys(ROLLING_TREND_WINDOWS) as Array<keyof typeof ROLLING_TREND_WINDOWS>).map(
    (window) => {
      const days = ROLLING_TREND_WINDOWS[window].days;
      const end = Date.parse(evaluationAt);
      const currentStart = end - days * 86_400_000;
      const previousStart = currentStart - days * 86_400_000;
      return {
        window,
        status: "unavailable",
        direction: "unavailable",
        currentSampleCount: 0,
        previousSampleCount: 0,
        currentValue: null,
        previousValue: null,
        absoluteChange: null,
        relativeChange: null,
        slopePerDay: null,
        threshold: null,
        currentStartAt: new Date(currentStart).toISOString(),
        currentEndAt: evaluationAt,
        previousStartAt: new Date(previousStart).toISOString(),
        previousEndAt: new Date(currentStart).toISOString(),
        reasons: [
          {
            code: "no_series_adapter",
            message: "No legitimate historical-series adapter is available.",
          },
        ],
      };
    },
  );
}

export function getFitCoreAnalyticsTrends(
  state: AppState,
  analytics: Omit<FitCoreAnalyticsResult, "trends">,
  evaluationAt: number,
): FitCoreAnalyticsTrendReport {
  const evaluationIso = new Date(evaluationAt).toISOString();
  const adapterById = new Map(ADAPTERS.map((adapter) => [adapter.nodeId, adapter]));
  const trustById = new Map(analytics.trust.nodes.map((item) => [item.metricId, item]));
  const records = METRIC_DEPENDENCY_GRAPH.map((node): FitCoreMetricTrendRecord => {
    const trust = trustById.get(node.id);
    const trustContext: FitCoreTrendTrustContext = {
      trustScore: trust?.score ?? null,
      trustLevel: trust?.level ?? "unavailable",
      freshnessState: trust?.freshness.state ?? "unknown",
      traceability: trust?.provenance?.traceability ?? null,
      provenanceType: trust?.provenance?.type ?? null,
    };
    const adapter = adapterById.get(node.id);
    if (!adapter)
      return {
        nodeId: node.id,
        dependencyIds: [...node.dependencies],
        supported: false,
        baseline: unsupportedBaseline(),
        rollingWindows: unsupportedWindows(evaluationIso),
        trust: trustContext,
        usable: false,
        reasons: sortedReasons(["no_series_adapter"]),
      };
    const series = buildSeries(state, adapter);
    const baseline = calculatePersonalBaseline(series, {
      evaluationAt: evaluationIso,
      cadence: adapter.cadence,
      aggregation: adapter.aggregation,
    });
    const rolling = calculateRollingTrend(series, {
      evaluationAt: evaluationIso,
      absoluteEpsilon: adapter.absoluteEpsilon,
      baseline,
      aggregation: adapter.aggregation,
    });
    const hasMath =
      baseline.status === "ready" || rolling.windows.some((window) => window.status === "ready");
    const trustOkay =
      trustContext.trustScore !== null &&
      trustContext.trustScore >= 0.5 &&
      (trustContext.trustLevel === "medium" || trustContext.trustLevel === "high");
    const freshnessOkay =
      trustContext.freshnessState === "fresh" || trustContext.freshnessState === "aging";
    const usable = hasMath && trustOkay && freshnessOkay;
    const codes: FitCoreTrendReasonCode[] = [];
    if (!series.length) codes.push("no_series_data");
    if (!hasMath && series.length) codes.push("insufficient_data");
    if (!trustOkay) codes.push("low_trust");
    if (trustContext.freshnessState === "unknown") codes.push("unknown_freshness");
    if (trustContext.freshnessState === "stale") codes.push("stale_freshness");
    if (trustContext.freshnessState === "invalid") codes.push("invalid_freshness");
    if (usable) codes.push("usable_evidence");
    return {
      nodeId: node.id,
      dependencyIds: [...node.dependencies],
      supported: true,
      baseline,
      rollingWindows: rolling.windows,
      trust: trustContext,
      usable,
      reasons: sortedReasons(codes),
    };
  });
  const primary = records.map(
    (record) => record.rollingWindows.find((window) => window.window === "days_7")!,
  );
  const countDirection = (direction: RollingTrendDirection) =>
    primary.filter((window) => window.direction === direction).length;
  const summary: FitCoreAnalyticsTrendSummary = {
    supported: records.filter((record) => record.supported).length,
    unsupported: records.filter((record) => !record.supported).length,
    usable: records.filter((record) => record.usable).length,
    unavailable: primary.filter((window) => window.status === "unavailable").length,
    insufficientData: primary.filter((window) => window.status === "insufficient_data").length,
    increasing: countDirection("increasing"),
    decreasing: countDirection("decreasing"),
    stable: countDirection("stable"),
  };
  return {
    rollingTrendPolicy: FITCORE_ROLLING_TREND_POLICY,
    personalBaselinePolicy: FITCORE_PERSONAL_BASELINE_POLICY,
    evaluationAt: evaluationIso,
    nodeCount: records.length,
    supportedNodeCount: summary.supported,
    records,
    summary,
  };
}
