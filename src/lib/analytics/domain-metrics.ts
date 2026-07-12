import type { AppState, RecoveryCheckIn, Workout } from "../types";
import {
  allTimeWindow,
  calendarDayDifference,
  calendarDaysWindow,
  dateRangeContains,
  dayKey,
  fillMissingDays,
  groupLogsByDay,
  last30DaysWindow,
  last7DaysWindow,
  previous7DaysWindow,
  sortDatedEntries,
  todayWindow,
  type DateRange,
} from "./date-time";
import {
  clampPercent,
  clampScore,
  safeAverage,
  safeNumber,
  safePercentChange,
  safeRatio,
  safeSum,
} from "./safe-math";

export type AnalyticsDomain = "training" | "nutrition" | "recovery" | "progress";
export type AnalyticsStatus = "ready" | "needs_more_data" | "unavailable";
export type AnalyticsConfidence = "none" | "low" | "medium" | "high";
export type MetricReasonCode =
  | "no_source_data"
  | "insufficient_samples"
  | "sparse_coverage"
  | "missing_target"
  | "invalid_target"
  | "missing_comparison_period"
  | "zero_comparison_baseline"
  | "single_sample"
  | "invalid_values_excluded"
  | "partial_period"
  | "stale_data"
  | "high_variability"
  | "uneven_spacing"
  | "outliers_detected"
  | "point_in_time"
  | "sufficient_samples"
  | "dense_coverage"
  | "valid_comparison_period"
  | "valid_target"
  | "recent_data"
  | "no_variation"
  | "indeterminate_direction"
  | "no_completed_workouts"
  | "no_valid_sets"
  | "missing_exercise_identity"
  | "missing_exercise_metadata"
  | "missing_muscle_metadata"
  | "missing_movement_classification"
  | "missing_side_metadata"
  | "insufficient_exercise_history"
  | "insufficient_comparable_sets"
  | "invalid_set_values_excluded"
  | "unsupported_rep_range"
  | "stale_exercise_history"
  | "partial_muscle_coverage"
  | "incompatible_units"
  | "initial_benchmark"
  | "insufficient_load_history"
  | "missing_body_area_soreness_mapping"
  | "stale_recovery_data"
  | "explicit_classification"
  | "balanced_distribution"
  | "uneven_distribution"
  | "no_meals"
  | "no_valid_meals"
  | "no_logged_days"
  | "insufficient_logged_days"
  | "invalid_meal_timestamp"
  | "missing_meal_identity"
  | "duplicate_meal_excluded"
  | "invalid_calories_excluded"
  | "invalid_protein_excluded"
  | "invalid_carbs_excluded"
  | "invalid_fat_excluded"
  | "invalid_nutrition_target"
  | "zero_nutrition_target"
  | "missing_bodyweight"
  | "invalid_bodyweight"
  | "missing_meal_type"
  | "missing_meal_timestamps"
  | "missing_workout_timestamps"
  | "insufficient_meals_for_distribution"
  | "insufficient_meals_for_timing"
  | "partial_macro_coverage"
  | "partial_period_coverage"
  | "unsupported_nutrient_field"
  | "pre_workout_evidence_unavailable"
  | "post_workout_evidence_unavailable"
  | "stale_bodyweight"
  | "no_recovery_checkins"
  | "invalid_recovery_timestamp"
  | "future_recovery_timestamp"
  | "duplicate_recovery_id"
  | "invalid_recovery_field"
  | "field_not_persisted"
  | "needs_wearable_sync"
  | "insufficient_recovery_samples"
  | "no_high_soreness_observation"
  | "no_low_readiness_observation"
  | "no_goals"
  | "invalid_goal"
  | "duplicate_goal_id"
  | "missing_baseline"
  | "missing_current_value"
  | "missing_deadline"
  | "invalid_deadline"
  | "deadline_passed"
  | "insufficient_goal_history"
  | "zero_elapsed_time"
  | "zero_velocity"
  | "pace_away_from_target"
  | "projection_unavailable"
  | "stale_goal_measurement"
  | "partial_coverage"
  | "uncertain_goal_linkage";
export type TrendDirection = "up" | "down" | "stable" | "unknown";
export type TrendQualityCode =
  | "insufficient_data"
  | "sparse_data"
  | "partial_coverage"
  | "stable_trend"
  | "volatile_trend"
  | "improving"
  | "declining"
  | "flat_or_unchanged"
  | "indeterminate"
  | "uneven_spacing"
  | "complete_coverage";
export type AnalyticsSourceCollection =
  | "workouts"
  | "meal_entries"
  | "recovery_check_ins"
  | "bodyweight_entries"
  | "goals"
  | "profile"
  | "derived_metrics";
export type AnalyticsMetricKind = "point_in_time" | "aggregate" | "time_series" | "comparison";
export type AnalyticsUnit =
  | "lb"
  | "kg"
  | "kcal"
  | "grams"
  | "score_0_100"
  | "score_1_5"
  | "score_1_10"
  | "percent"
  | "count"
  | "days"
  | "hours"
  | "date"
  | "g/lb"
  | "lb/week"
  | "none"
  | "unknown";

export interface MetricReason {
  code: MetricReasonCode;
  message: string;
  count?: number;
}

export interface MetricExclusion {
  code: "invalid_timestamp" | "future_timestamp" | "invalid_value" | "outside_range";
  count: number;
}

export interface ConfidenceEvidence {
  validRecordCount: number;
  minimumSampleSize: number;
  coverageDayCount: number;
  expectedDayCount: number | null;
  missingDataRatio: number | null;
  comparisonPeriodValid: boolean | null;
  targetValid: boolean | null;
  partialPeriod: boolean;
  stale: boolean;
  singleSample: boolean;
  excludedRecordCount: number;
}

export interface AnalyticsConfidenceResult {
  level: AnalyticsConfidence;
  score: number;
  reasons: MetricReason[];
  evidence: ConfidenceEvidence;
}

export interface TrendQualityResult {
  direction: TrendDirection;
  codes: TrendQualityCode[];
  hasEnoughData: boolean;
  sampleSize: number;
  minimumSampleSize: number;
  coverageDayCount: number;
  expectedDayCount: number | null;
  missingDayCount: number | null;
  coverageRatio: number | null;
  comparisonComplete: boolean | null;
  zeroBaseline: boolean;
  variability: number | null;
  outlierCount: number;
  reasons: MetricReason[];
}

export interface AnalyticsMetricSource {
  domain: AnalyticsDomain;
  collection: AnalyticsSourceCollection;
  entryIds: string[];
  includedRecordCount: number;
  excludedRecordCount: number;
  exclusions: MetricExclusion[];
  metricIds: string[];
  comparisonEntryIds: string[];
  earliestIncludedAt: number | null;
  latestIncludedAt: number | null;
  lastLoggedAt: number | null;
  requestedDateRange: DateRange | null;
  effectiveDateRange: DateRange | null;
  coverageDayCount: number;
  expectedDayCount: number | null;
  targetRequired: boolean;
  targetAvailable: boolean | null;
  calculationId: string;
  calculationVersion: 1;
  notes: string[];
}

export interface AnalyticsMetric<T> {
  id: string;
  label: string;
  domain: AnalyticsDomain;
  kind: AnalyticsMetricKind;
  unit: AnalyticsUnit;
  value: T | null;
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  dateRange: DateRange | null;
  sampleSize: number;
  minimumSampleSize: number;
  reason: string | null;
  reasons: MetricReason[];
  trendQuality: TrendQualityResult | null;
  source: AnalyticsMetricSource;
}

export interface DomainAvailability {
  status: AnalyticsStatus;
  sampleSize: number;
  reason: string | null;
  lastLoggedAt: number | null;
}

export interface TrainingVolumePoint {
  dayKey: string;
  timestamp: number;
  volume: number;
}

export interface BodyweightPoint {
  dayKey: string;
  timestamp: number;
  weightLb: number;
  entryId: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecoveryCheckInSummary {
  id: string;
  createdAt: number;
  energy: number;
  soreness: number;
  stress: number;
  motivation: number;
  notes?: string;
}

export type BodyweightTrendDirection = TrendDirection;

export const FITCORE_METRIC_IDS = Object.freeze({
  training: Object.freeze({
    volume7d: "training.volume.7d",
    previousVolume7d: "training.volume.previous_7d",
    volumeChange7d: "training.volume.change_7d",
    completedWorkouts7d: "training.workouts.completed_7d",
    consistencyScore: "training.consistency.score",
    streak: "training.streak.current",
    dailyVolumeSeries7d: "training.volume.daily_series_7d",
  }),
  nutrition: Object.freeze({
    caloriesToday: "nutrition.calories.today",
    proteinToday: "nutrition.protein.today",
    carbsToday: "nutrition.carbs.today",
    fatToday: "nutrition.fat.today",
    caloriesTargetPercent: "nutrition.calories.target_percent",
    proteinTargetPercent: "nutrition.protein.target_percent",
    carbsTargetPercent: "nutrition.carbs.target_percent",
    fatTargetPercent: "nutrition.fat.target_percent",
    macroTargetCompletion: "nutrition.macros.target_completion",
    caloriesRemaining: "nutrition.calories.remaining",
    proteinRemaining: "nutrition.protein.remaining",
    calories7dAverage: "nutrition.calories.7d_average",
    protein7dAverage: "nutrition.protein.7d_average",
    adherenceScore: "nutrition.adherence.score",
  }),
  recovery: Object.freeze({
    latestCheckIn: "recovery.check_in.latest",
    readiness7dAverage: "recovery.readiness.7d_average",
    soreness7dAverage: "recovery.soreness.7d_average",
    stress7dAverage: "recovery.stress.7d_average",
    energy7dAverage: "recovery.energy.7d_average",
    motivation7dAverage: "recovery.motivation.7d_average",
    score: "recovery.score",
  }),
  progress: Object.freeze({
    latestBodyweight: "progress.bodyweight.latest",
    bodyweight7dDelta: "progress.bodyweight.7d_delta",
    bodyweight30dDelta: "progress.bodyweight.30d_delta",
    bodyweightTrend: "progress.bodyweight.trend",
    goalProgressPercent: "progress.goal.progress_percent",
    bodyweightSeries: "progress.bodyweight.series",
  }),
} as const);

export interface TrainingAnalytics {
  domain: "training";
  availability: DomainAvailability;
  volume7d: AnalyticsMetric<number>;
  previousVolume7d: AnalyticsMetric<number>;
  volumeChange7d: AnalyticsMetric<number>;
  completedWorkouts7d: AnalyticsMetric<number>;
  consistencyScore: AnalyticsMetric<number>;
  streak: AnalyticsMetric<number>;
  dailyVolumeSeries7d: AnalyticsMetric<TrainingVolumePoint[]>;
}

export interface NutritionAnalytics {
  domain: "nutrition";
  availability: DomainAvailability;
  caloriesToday: AnalyticsMetric<number>;
  proteinToday: AnalyticsMetric<number>;
  carbsToday: AnalyticsMetric<number>;
  fatToday: AnalyticsMetric<number>;
  targetCompletion: {
    calories: AnalyticsMetric<number>;
    protein: AnalyticsMetric<number>;
    carbs: AnalyticsMetric<number>;
    fat: AnalyticsMetric<number>;
    overall: AnalyticsMetric<number>;
  };
  caloriesRemaining: AnalyticsMetric<number>;
  proteinRemaining: AnalyticsMetric<number>;
  calories7dAverage: AnalyticsMetric<number>;
  protein7dAverage: AnalyticsMetric<number>;
  adherenceScore: AnalyticsMetric<number>;
}

export interface RecoveryAnalytics {
  domain: "recovery";
  availability: DomainAvailability;
  latestCheckIn: AnalyticsMetric<RecoveryCheckInSummary>;
  readiness7dAverage: AnalyticsMetric<number>;
  soreness7dAverage: AnalyticsMetric<number>;
  stress7dAverage: AnalyticsMetric<number>;
  energy7dAverage: AnalyticsMetric<number>;
  motivation7dAverage: AnalyticsMetric<number>;
  recoveryScore: AnalyticsMetric<number>;
}

export interface ProgressAnalytics {
  domain: "progress";
  availability: DomainAvailability;
  latestBodyweight: AnalyticsMetric<number>;
  bodyweight7dDelta: AnalyticsMetric<number>;
  bodyweight30dDelta: AnalyticsMetric<number>;
  bodyweightTrend: AnalyticsMetric<BodyweightTrendDirection>;
  goalProgressPercent: AnalyticsMetric<number>;
  bodyweightSeries: AnalyticsMetric<BodyweightPoint[]>;
}

export interface CoreDomainAnalytics {
  training: TrainingAnalytics;
  nutrition: NutritionAnalytics;
  recovery: RecoveryAnalytics;
  progress: ProgressAnalytics;
}

export interface AnalyticsMetricInput<T> {
  id: string;
  label: string;
  domain: AnalyticsDomain;
  kind?: AnalyticsMetricKind;
  unit: AnalyticsUnit;
  value: T | null;
  status: AnalyticsStatus;
  confidence?: AnalyticsConfidence;
  confidenceReasons?: MetricReason[];
  dateRange?: DateRange | null;
  sampleSize?: number;
  minimumSampleSize?: number;
  reason?: string | null;
  reasons?: MetricReason[];
  entryIds?: string[];
  entryTimestamps?: number[];
  includedRecordCount?: number;
  metricIds?: string[];
  comparisonEntryIds?: string[];
  lastLoggedAt?: number | null;
  collection?: AnalyticsSourceCollection;
  excludedRecordCount?: number;
  exclusions?: MetricExclusion[];
  expectedDayCount?: number | null;
  targetRequired?: boolean;
  targetAvailable?: boolean | null;
  comparisonPeriodValid?: boolean | null;
  partialPeriod?: boolean;
  stale?: boolean;
  calculationId?: string;
  trendQuality?: TrendQualityResult | null;
  notes?: string[];
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueReasons(reasons: readonly MetricReason[]): MetricReason[] {
  const byCode = new Map<MetricReasonCode, MetricReason>();
  for (const item of reasons) {
    const previous = byCode.get(item.code);
    byCode.set(item.code, {
      code: item.code,
      message: previous?.message ?? item.message,
      ...((previous?.count ?? 0) + (item.count ?? 0) > 0
        ? { count: (previous?.count ?? 0) + (item.count ?? 0) }
        : {}),
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function expectedDaysForRange(range: DateRange | null): number | null {
  if (!range || range.start < 0 || range.end <= range.start) return null;
  const days = calendarDayDifference(range.end, range.start);
  return days > 0 && days <= 366 ? days : null;
}

function timestampsForSource(values: readonly number[]): number[] {
  return [...new Set(values.filter(validTimestamp))].sort((a, b) => a - b);
}

function defaultMetricReason(
  status: AnalyticsStatus,
  sampleSize: number,
  reason: string | null,
): MetricReason[] {
  if (!reason) return [];
  if (sampleSize === 0 && status === "needs_more_data") {
    return [{ code: "no_source_data", message: reason }];
  }
  if (status === "unavailable") {
    return [{ code: "missing_target", message: reason }];
  }
  return [{ code: "insufficient_samples", message: reason }];
}

interface ConfidenceInput {
  levelHint?: AnalyticsConfidence;
  validRecordCount: number;
  minimumSampleSize: number;
  coverageDayCount: number;
  expectedDayCount: number | null;
  comparisonPeriodValid: boolean | null;
  targetValid: boolean | null;
  partialPeriod: boolean;
  stale: boolean;
  excludedRecordCount: number;
  additionalReasons?: MetricReason[];
}

export function calculateConfidence(input: ConfidenceInput): AnalyticsConfidenceResult {
  const sampleSize = Math.max(0, Math.trunc(safeNumber(input.validRecordCount)));
  const minimum = Math.max(1, Math.trunc(safeNumber(input.minimumSampleSize, 1)));
  const coverageDays = Math.max(0, Math.trunc(safeNumber(input.coverageDayCount)));
  const expectedDays = input.expectedDayCount;
  const missingRatio =
    expectedDays && expectedDays > 0
      ? clampPercent(safeRatio(Math.max(0, expectedDays - coverageDays), expectedDays) * 100) / 100
      : null;
  const reasons: MetricReason[] = [...(input.additionalReasons ?? [])];
  let level: AnalyticsConfidence = input.levelHint ?? confidenceForSample(sampleSize);

  if (sampleSize === 0) {
    level = "none";
    reasons.push({ code: "no_source_data", message: "No valid source records contributed." });
  } else if (sampleSize < minimum) {
    level = "low";
    reasons.push({
      code: sampleSize === 1 ? "single_sample" : "insufficient_samples",
      message: `${sampleSize} valid record${sampleSize === 1 ? "" : "s"} contributed; ${minimum} required.`,
    });
  } else {
    reasons.push({
      code: "sufficient_samples",
      message: `${sampleSize} valid records meet the minimum sample requirement.`,
    });
  }
  if (sampleSize === 1) {
    reasons.push({
      code: "single_sample",
      message: "The result depends on a single valid source record.",
    });
  }

  if (expectedDays && expectedDays > 0) {
    const coverageRatio = safeRatio(coverageDays, expectedDays);
    if (coverageRatio < 0.3) {
      level = level === "none" ? "none" : "low";
      reasons.push({
        code: "sparse_coverage",
        message: "Source records cover less than 30% of the requested days.",
      });
    } else if (coverageRatio < 0.75) {
      if (level === "high") level = "medium";
      reasons.push({
        code: "partial_period",
        message: "Source records cover only part of the requested period.",
      });
    } else if (coverageRatio >= 0.75) {
      reasons.push({
        code: "dense_coverage",
        message: "Source records cover at least 75% of the requested days.",
      });
    }
  }

  if (input.comparisonPeriodValid === false) {
    level = "none";
    reasons.push({
      code: "missing_comparison_period",
      message: "A valid comparison period is required.",
    });
  } else if (input.comparisonPeriodValid === true) {
    reasons.push({
      code: "valid_comparison_period",
      message: "Both comparison periods contain valid data.",
    });
  }

  if (input.targetValid === false) {
    level = "none";
    reasons.push({ code: "invalid_target", message: "A valid positive target is required." });
  } else if (input.targetValid === true) {
    reasons.push({ code: "valid_target", message: "The required target is valid." });
  }

  if (input.partialPeriod) {
    if (level === "high") level = "medium";
    reasons.push({
      code: "partial_period",
      message: "The requested calendar period is still in progress.",
    });
  }
  if (input.stale) {
    if (level !== "none") level = "low";
    reasons.push({ code: "stale_data", message: "The latest contributing record is stale." });
  } else if (sampleSize > 0) {
    reasons.push({ code: "recent_data", message: "At least one contributing record is recent." });
  }
  if (input.excludedRecordCount > 0) {
    if (level === "high") level = "medium";
    reasons.push({
      code: "invalid_values_excluded",
      message: "Invalid records or values were excluded from the calculation.",
      count: input.excludedRecordCount,
    });
  }
  if (reasons.some((reason) => reason.code === "invalid_values_excluded") && level === "high") {
    level = "medium";
  }

  const scoreByLevel: Record<AnalyticsConfidence, number> = {
    none: 0,
    low: 30,
    medium: 65,
    high: 90,
  };
  return {
    level,
    score: scoreByLevel[level],
    reasons: uniqueReasons(reasons),
    evidence: {
      validRecordCount: sampleSize,
      minimumSampleSize: minimum,
      coverageDayCount: coverageDays,
      expectedDayCount: expectedDays,
      missingDataRatio: missingRatio,
      comparisonPeriodValid: input.comparisonPeriodValid,
      targetValid: input.targetValid,
      partialPeriod: input.partialPeriod,
      stale: input.stale,
      singleSample: sampleSize === 1,
      excludedRecordCount: Math.max(0, Math.trunc(safeNumber(input.excludedRecordCount))),
    },
  };
}

export interface TrendValue {
  timestamp: number;
  value: number;
}

export interface TrendQualityInput {
  values: readonly TrendValue[];
  minimumSampleSize?: number;
  expectedDayCount?: number | null;
  comparisonComplete?: boolean | null;
  zeroBaseline?: boolean;
  stableThreshold?: number;
  direction?: TrendDirection;
  higherIsBetter?: boolean | null;
  stale?: boolean;
}

function quartile(sorted: readonly number[], fraction: number): number {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function calculateTrendQuality(input: TrendQualityInput): TrendQualityResult {
  const values = input.values
    .filter((item) => validTimestamp(item.timestamp) && Number.isFinite(item.value))
    .sort((a, b) => a.timestamp - b.timestamp || a.value - b.value);
  const minimum = Math.max(2, Math.trunc(safeNumber(input.minimumSampleSize, 2)));
  const coverageDays = new Set(values.map((item) => dayKey(item.timestamp))).size;
  const expectedDays = input.expectedDayCount ?? null;
  const missingDays = expectedDays === null ? null : Math.max(0, expectedDays - coverageDays);
  const coverageRatio =
    expectedDays && expectedDays > 0 ? safeRatio(coverageDays, expectedDays) : null;
  const zeroBaseline = input.zeroBaseline ?? false;
  const comparisonComplete = input.comparisonComplete ?? null;
  const hasEnoughData = values.length >= minimum && comparisonComplete !== false && !zeroBaseline;
  const reasons: MetricReason[] = [];
  const codes: TrendQualityCode[] = [];

  let direction: TrendDirection = "unknown";
  if (hasEnoughData) {
    if (input.direction) {
      direction = input.direction;
    } else {
      const change = values.at(-1)!.value - values[0].value;
      const threshold = Math.max(0, safeNumber(input.stableThreshold));
      direction = Math.abs(change) <= threshold ? "stable" : change > 0 ? "up" : "down";
    }
  }

  if (values.length < minimum) {
    codes.push("insufficient_data");
    reasons.push({
      code: values.length === 1 ? "single_sample" : "insufficient_samples",
      message: `Trend requires ${minimum} valid samples; ${values.length} contributed.`,
    });
  }
  if (comparisonComplete === false) {
    codes.push("indeterminate");
    reasons.push({
      code: "missing_comparison_period",
      message: "The comparison period has no valid data.",
    });
  }
  if (zeroBaseline) {
    codes.push("indeterminate");
    reasons.push({ code: "zero_comparison_baseline", message: "The comparison baseline is zero." });
  }
  if (coverageRatio !== null) {
    if (coverageRatio < 0.3) {
      codes.push("sparse_data");
      reasons.push({
        code: "sparse_coverage",
        message: "Trend samples cover less than 30% of expected days.",
      });
    } else if (coverageRatio < 0.75) {
      codes.push("partial_coverage");
      reasons.push({
        code: "partial_period",
        message: "Trend samples cover only part of the requested period.",
      });
    } else {
      codes.push("complete_coverage");
    }
  }

  const gaps = values
    .slice(1)
    .map((item, index) =>
      Math.max(0, calendarDayDifference(item.timestamp, values[index].timestamp)),
    );
  const positiveGaps = gaps.filter((gap) => gap > 0).sort((a, b) => a - b);
  const medianGap = quartile(positiveGaps, 0.5);
  const unevenSpacing =
    positiveGaps.length >= 2 && medianGap > 0 && positiveGaps.at(-1)! > medianGap * 2;
  if (unevenSpacing) {
    codes.push("uneven_spacing");
    reasons.push({ code: "uneven_spacing", message: "Trend samples are unevenly spaced." });
  }

  const numericValues = values.map((item) => item.value);
  const mean = safeAverage(numericValues);
  const variance = numericValues.length
    ? safeAverage(numericValues.map((value) => (value - mean) ** 2))
    : 0;
  const variability =
    numericValues.length > 1 ? safeRatio(Math.sqrt(variance), Math.max(Math.abs(mean), 1)) : null;
  const sortedValues = [...numericValues].sort((a, b) => a - b);
  const q1 = quartile(sortedValues, 0.25);
  const q3 = quartile(sortedValues, 0.75);
  const iqr = q3 - q1;
  const outlierCount =
    sortedValues.length >= 4 && iqr > 0
      ? sortedValues.filter((value) => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr).length
      : 0;
  if ((variability ?? 0) >= 0.5 || outlierCount > 0) {
    codes.push("volatile_trend");
    reasons.push({ code: "high_variability", message: "Source values have high variability." });
    if (outlierCount > 0) {
      reasons.push({
        code: "outliers_detected",
        message: "Statistical outliers were detected.",
        count: outlierCount,
      });
    }
  }

  if (direction === "stable") {
    codes.push("stable_trend", "flat_or_unchanged");
    reasons.push({
      code: "no_variation",
      message: "The first and latest values are effectively unchanged.",
    });
  } else if (hasEnoughData && typeof input.higherIsBetter === "boolean") {
    const improving = input.higherIsBetter ? direction === "up" : direction === "down";
    codes.push(improving ? "improving" : "declining");
  } else if (hasEnoughData && direction !== "unknown") {
    codes.push("indeterminate");
    reasons.push({
      code: "indeterminate_direction",
      message:
        "Direction is measurable, but improvement or decline is not defined for this metric.",
    });
  }
  if (input.stale) {
    codes.push("indeterminate");
    reasons.push({ code: "stale_data", message: "The latest trend sample is stale." });
  }
  if (!codes.length) codes.push("indeterminate");

  return {
    direction,
    codes: [...new Set(codes)].sort((a, b) => a.localeCompare(b)),
    hasEnoughData,
    sampleSize: values.length,
    minimumSampleSize: minimum,
    coverageDayCount: coverageDays,
    expectedDayCount: expectedDays,
    missingDayCount: missingDays,
    coverageRatio,
    comparisonComplete,
    zeroBaseline,
    variability,
    outlierCount,
    reasons: uniqueReasons(reasons),
  };
}

export function createAnalyticsMetric<T>(input: AnalyticsMetricInput<T>): AnalyticsMetric<T> {
  const status = input.status;
  const sampleSize = Math.max(0, Math.trunc(safeNumber(input.sampleSize)));
  const minimumSampleSize = Math.max(1, Math.trunc(safeNumber(input.minimumSampleSize, 1)));
  const dateRange = input.dateRange ?? null;
  const timestamps = timestampsForSource(input.entryTimestamps ?? []);
  const entryIds = uniqueSorted(input.entryIds ?? []);
  const comparisonEntryIds = uniqueSorted(input.comparisonEntryIds ?? []);
  const expectedDayCount =
    input.expectedDayCount === undefined ? expectedDaysForRange(dateRange) : input.expectedDayCount;
  const coverageDayCount = new Set(timestamps.map(dayKey)).size;
  const exclusions = [...(input.exclusions ?? [])]
    .filter((item) => item.count > 0)
    .sort((a, b) => a.code.localeCompare(b.code));
  const excludedRecordCount = Math.max(
    Math.max(0, Math.trunc(safeNumber(input.excludedRecordCount))),
    safeSum(exclusions.map((item) => item.count)),
  );
  const confidenceDetails = calculateConfidence({
    levelHint: input.confidence,
    validRecordCount: sampleSize,
    minimumSampleSize,
    coverageDayCount,
    expectedDayCount,
    comparisonPeriodValid: input.comparisonPeriodValid ?? null,
    targetValid: input.targetRequired ? (input.targetAvailable ?? false) : null,
    partialPeriod: input.partialPeriod ?? false,
    stale: input.stale ?? false,
    excludedRecordCount,
    additionalReasons: input.confidenceReasons,
  });
  const reason = input.reason ?? null;
  const reasons = uniqueReasons([
    ...(input.reasons ?? defaultMetricReason(status, sampleSize, reason)),
    ...confidenceDetails.reasons,
  ]);
  const earliestIncludedAt = timestamps[0] ?? null;
  const latestIncludedAt = timestamps.at(-1) ?? input.lastLoggedAt ?? null;
  return {
    id: input.id,
    label: input.label,
    domain: input.domain,
    kind: input.kind ?? "aggregate",
    unit: input.unit,
    value: input.value,
    status,
    confidence: confidenceDetails.level,
    confidenceDetails,
    dateRange,
    sampleSize,
    minimumSampleSize,
    reason,
    reasons,
    trendQuality: input.trendQuality ?? null,
    source: {
      domain: input.domain,
      collection: input.collection ?? "derived_metrics",
      entryIds,
      includedRecordCount: Math.max(
        0,
        Math.trunc(safeNumber(input.includedRecordCount, entryIds.length)),
      ),
      excludedRecordCount,
      exclusions,
      metricIds: uniqueSorted(input.metricIds ?? []),
      comparisonEntryIds,
      earliestIncludedAt,
      latestIncludedAt,
      lastLoggedAt: input.lastLoggedAt ?? latestIncludedAt,
      requestedDateRange: dateRange,
      effectiveDateRange:
        earliestIncludedAt === null || latestIncludedAt === null
          ? null
          : { start: earliestIncludedAt, end: latestIncludedAt + 1 },
      coverageDayCount,
      expectedDayCount,
      targetRequired: input.targetRequired ?? false,
      targetAvailable: input.targetRequired ? (input.targetAvailable ?? false) : null,
      calculationId: input.calculationId ?? `${input.id}.v1`,
      calculationVersion: 1,
      notes: uniqueSorted(input.notes ?? []),
    },
  };
}

const metric = createAnalyticsMetric;

function confidenceForSample(sampleSize: number): AnalyticsConfidence {
  if (sampleSize <= 0) return "none";
  if (sampleSize >= 4) return "high";
  if (sampleSize >= 2) return "medium";
  return "low";
}

function finiteNonNegative(value: unknown): number {
  return Math.max(0, safeNumber(value));
}

function validTimestamp(timestamp: number): boolean {
  return dayKey(timestamp) !== "";
}

function validBodyweight(weight: unknown): weight is number {
  return typeof weight === "number" && Number.isFinite(weight) && weight > 0;
}

function validCheckIn(checkIn: RecoveryCheckIn): boolean {
  return (
    validTimestamp(checkIn.createdAt) &&
    [checkIn.energy, checkIn.soreness, checkIn.stress, checkIn.motivation].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  );
}

function latestTimestamp(
  entries: readonly { createdAt?: number; startedAt?: number }[],
): number | null {
  const timestamps = entries
    .map((entry) => entry.createdAt ?? entry.startedAt)
    .filter((value): value is number => value !== undefined && validTimestamp(value));
  return timestamps.length ? Math.max(...timestamps) : null;
}

export function calculateSetVolume(weight: unknown, repetitions: unknown): number {
  if (
    typeof weight !== "number" ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    typeof repetitions !== "number" ||
    !Number.isFinite(repetitions) ||
    repetitions < 0
  ) {
    return 0;
  }
  return safeNumber(weight * repetitions);
}

export function calculateWorkoutVolume(workout: Workout): number {
  const values: number[] = [];
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      const weight = finiteNonNegative(set.weight);
      const reps = finiteNonNegative(set.reps);
      if (set.completed && weight > 0 && reps > 0) {
        values.push(calculateSetVolume(weight, reps));
      }
    }
  }
  return safeSum(values);
}

function workoutsInDateRange(state: AppState, range: DateRange): Workout[] {
  return state.workouts.filter(
    (workout) => validTimestamp(workout.startedAt) && dateRangeContains(range, workout.startedAt),
  );
}

export function completedWorkoutCountInRange(state: AppState, range: DateRange): number {
  return workoutsInDateRange(state, range).length;
}

function volumeInDateRange(state: AppState, range: DateRange): number {
  return safeSum(workoutsInDateRange(state, range).map(calculateWorkoutVolume));
}

export function dailyTrainingVolumeSeries(
  state: AppState,
  range: DateRange,
): TrainingVolumePoint[] {
  const byDay: Record<string, number> = {};
  for (const workout of workoutsInDateRange(state, range)) {
    const key = dayKey(workout.startedAt);
    byDay[key] = safeSum([byDay[key], calculateWorkoutVolume(workout)]);
  }
  return fillMissingDays(range, byDay, 0).map((point) => ({
    dayKey: point.dayKey,
    timestamp: point.timestamp,
    volume: finiteNonNegative(point.value),
  }));
}

function currentTrainingStreak(state: AppState, now: number): number {
  const days = new Set(
    state.workouts
      .filter((workout) => validTimestamp(workout.startedAt))
      .map((workout) => dayKey(workout.startedAt)),
  );
  let cursor = todayWindow(now).start;
  if (!days.has(dayKey(cursor))) cursor = calendarDaysWindow(1, now, 1).start;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = calendarDaysWindow(1, cursor, 1).start;
  }
  return streak;
}

export function getTrainingAnalytics(state: AppState, now = Date.now()): TrainingAnalytics {
  const currentRange = last7DaysWindow(now);
  const previousRange = previous7DaysWindow(now);
  const historyRange = allTimeWindow(now);
  const validWorkouts = state.workouts.filter(
    (workout) =>
      validTimestamp(workout.startedAt) && dateRangeContains(historyRange, workout.startedAt),
  );
  const currentWorkouts = workoutsInDateRange(state, currentRange);
  const previousWorkouts = workoutsInDateRange(state, previousRange);
  const invalidTimestampCount = state.workouts.filter(
    (workout) => !validTimestamp(workout.startedAt),
  ).length;
  const futureTimestampCount = state.workouts.filter(
    (workout) =>
      validTimestamp(workout.startedAt) && !dateRangeContains(historyRange, workout.startedAt),
  ).length;
  const invalidSetValueCount = state.workouts.reduce(
    (count, workout) =>
      count +
      workout.exercises.reduce(
        (exerciseCount, exercise) =>
          exerciseCount +
          exercise.sets.filter(
            (set) =>
              set.completed &&
              (!Number.isFinite(set.weight) ||
                !Number.isFinite(set.reps) ||
                safeNumber(set.weight) <= 0 ||
                safeNumber(set.reps) <= 0),
          ).length,
        0,
      ),
    0,
  );
  const hasTrainingData = validWorkouts.length > 0;
  const currentVolume = volumeInDateRange(state, currentRange);
  const previousVolume = volumeInDateRange(state, previousRange);
  const percentChange = safePercentChange(currentVolume, previousVolume);
  const target = finiteNonNegative(state.profile.daysPerWeek);
  const consistencyValue =
    target > 0 ? clampScore(safeRatio(currentWorkouts.length, target) * 100) : null;
  const lastLoggedAt = latestTimestamp(validWorkouts);
  const sourceExclusions: MetricExclusion[] = [
    { code: "invalid_timestamp", count: invalidTimestampCount },
    { code: "future_timestamp", count: futureTimestampCount },
  ];
  const invalidSetReasons: MetricReason[] = invalidSetValueCount
    ? [
        {
          code: "invalid_values_excluded",
          message: "Completed sets with invalid weight or rep values were excluded from volume.",
          count: invalidSetValueCount,
        },
      ]
    : [];
  const currentSeries = dailyTrainingVolumeSeries(state, currentRange);
  const comparisonComplete = currentWorkouts.length > 0 && previousWorkouts.length > 0;
  const zeroBaseline = previousVolume === 0;
  const changeDirection: TrendDirection =
    percentChange === null
      ? "unknown"
      : percentChange === 0
        ? "stable"
        : percentChange > 0
          ? "up"
          : "down";
  const volumeChangeTrend = calculateTrendQuality({
    values: [
      { timestamp: previousRange.start, value: previousVolume },
      { timestamp: currentRange.start, value: currentVolume },
    ],
    expectedDayCount: 14,
    comparisonComplete,
    zeroBaseline,
    stableThreshold: 0,
    direction: changeDirection,
    higherIsBetter: null,
  });
  const dailyVolumeTrend = calculateTrendQuality({
    values: currentSeries.map((point) => ({ timestamp: point.timestamp, value: point.volume })),
    expectedDayCount: 7,
    stableThreshold: 0,
    higherIsBetter: null,
  });
  const sourceFor = (
    entries: readonly Workout[],
    expectedDayCount: number | null,
    comparisonEntries: readonly Workout[] = [],
  ) => ({
    collection: "workouts" as const,
    entryIds: entries.map((workout) => workout.id),
    entryTimestamps: entries.map((workout) => workout.startedAt),
    includedRecordCount: entries.length,
    comparisonEntryIds: comparisonEntries.map((workout) => workout.id),
    excludedRecordCount: invalidTimestampCount + futureTimestampCount,
    exclusions: sourceExclusions,
    expectedDayCount,
    confidenceReasons: invalidSetReasons,
  });
  const baseStatus: AnalyticsStatus = hasTrainingData ? "ready" : "needs_more_data";
  const baseReason = hasTrainingData ? null : "No completed workouts are logged.";

  return {
    domain: "training",
    availability: {
      status: baseStatus,
      sampleSize: validWorkouts.length,
      reason: baseReason,
      lastLoggedAt,
    },
    volume7d: metric({
      id: FITCORE_METRIC_IDS.training.volume7d,
      label: "Training volume — last 7 days",
      domain: "training",
      unit: "unknown",
      value: currentVolume,
      status: baseStatus,
      confidence: confidenceForSample(currentWorkouts.length),
      dateRange: currentRange,
      sampleSize: currentWorkouts.length,
      reason: baseReason,
      ...sourceFor(currentWorkouts, 7),
      partialPeriod: true,
      lastLoggedAt,
      notes: [
        "Volume is the sum of completed set weight multiplied by reps; stored weight unit is not explicit.",
      ],
    }),
    previousVolume7d: metric({
      id: FITCORE_METRIC_IDS.training.previousVolume7d,
      label: "Training volume — previous 7 days",
      domain: "training",
      unit: "unknown",
      value: previousVolume,
      status: baseStatus,
      confidence: confidenceForSample(previousWorkouts.length),
      dateRange: previousRange,
      sampleSize: previousWorkouts.length,
      reason: baseReason,
      ...sourceFor(previousWorkouts, 7),
      lastLoggedAt,
    }),
    volumeChange7d: metric({
      id: FITCORE_METRIC_IDS.training.volumeChange7d,
      label: "Training volume change",
      domain: "training",
      kind: "comparison",
      unit: "percent",
      value: percentChange,
      status: !hasTrainingData
        ? "needs_more_data"
        : percentChange === null
          ? "needs_more_data"
          : "ready",
      confidence: confidenceForSample(currentWorkouts.length + previousWorkouts.length),
      dateRange: { start: previousRange.start, end: currentRange.end },
      sampleSize: currentWorkouts.length + previousWorkouts.length,
      minimumSampleSize: 2,
      reason: !hasTrainingData
        ? baseReason
        : percentChange === null
          ? "Previous 7-day volume is zero, so percent change has no valid baseline."
          : null,
      ...sourceFor([...previousWorkouts, ...currentWorkouts], 14, previousWorkouts),
      comparisonPeriodValid: comparisonComplete && !zeroBaseline,
      partialPeriod: true,
      trendQuality: volumeChangeTrend,
      reasons: zeroBaseline
        ? [
            {
              code: "zero_comparison_baseline",
              message: "Previous 7-day volume is zero, so percent change has no valid baseline.",
            },
          ]
        : !comparisonComplete
          ? [
              {
                code: "missing_comparison_period",
                message: "Both 7-day windows require completed workouts.",
              },
            ]
          : [],
      metricIds: [
        FITCORE_METRIC_IDS.training.volume7d,
        FITCORE_METRIC_IDS.training.previousVolume7d,
      ],
      lastLoggedAt,
    }),
    completedWorkouts7d: metric({
      id: FITCORE_METRIC_IDS.training.completedWorkouts7d,
      label: "Completed workouts — last 7 days",
      domain: "training",
      unit: "count",
      value: currentWorkouts.length,
      status: baseStatus,
      confidence: confidenceForSample(currentWorkouts.length),
      dateRange: currentRange,
      sampleSize: currentWorkouts.length,
      reason: baseReason,
      ...sourceFor(currentWorkouts, 7),
      partialPeriod: true,
      lastLoggedAt,
      notes: ["AppState.workouts is completed workout history; activeWorkout is excluded."],
    }),
    consistencyScore: metric({
      id: FITCORE_METRIC_IDS.training.consistencyScore,
      label: "Training consistency score",
      domain: "training",
      unit: "score_0_100",
      value: consistencyValue,
      status: target <= 0 ? "unavailable" : baseStatus,
      confidence: confidenceForSample(currentWorkouts.length),
      dateRange: currentRange,
      sampleSize: currentWorkouts.length,
      reason: target <= 0 ? "Weekly workout target is not configured." : baseReason,
      ...sourceFor(currentWorkouts, 7),
      targetRequired: true,
      targetAvailable: target > 0,
      partialPeriod: true,
      reasons:
        target <= 0
          ? [{ code: "missing_target", message: "Weekly workout target is not configured." }]
          : [],
      lastLoggedAt,
    }),
    streak: metric({
      id: FITCORE_METRIC_IDS.training.streak,
      label: "Current training streak",
      domain: "training",
      unit: "days",
      value: currentTrainingStreak(state, now),
      status: baseStatus,
      confidence: confidenceForSample(validWorkouts.length),
      dateRange: allTimeWindow(now),
      sampleSize: validWorkouts.length,
      reason: baseReason,
      ...sourceFor(validWorkouts, null),
      lastLoggedAt,
    }),
    dailyVolumeSeries7d: metric({
      id: FITCORE_METRIC_IDS.training.dailyVolumeSeries7d,
      label: "Daily training volume series — last 7 days",
      domain: "training",
      kind: "time_series",
      unit: "unknown",
      value: currentSeries,
      status: baseStatus,
      confidence: confidenceForSample(currentWorkouts.length),
      dateRange: currentRange,
      sampleSize: currentWorkouts.length,
      reason: baseReason,
      ...sourceFor(currentWorkouts, 7),
      partialPeriod: true,
      trendQuality: dailyVolumeTrend,
      lastLoggedAt,
      notes: ["Missing calendar days are represented as zero because training volume is additive."],
    }),
  };
}

export function calculateMealTotals(
  entries: readonly AppState["mealEntries"][number][],
): MacroTotals {
  return {
    calories: safeSum(entries.map((entry) => finiteNonNegative(entry.calories))),
    protein: safeSum(entries.map((entry) => finiteNonNegative(entry.protein))),
    carbs: safeSum(entries.map((entry) => finiteNonNegative(entry.carbs))),
    fat: safeSum(entries.map((entry) => finiteNonNegative(entry.fat))),
  };
}

function targetMetric(
  id: string,
  label: string,
  total: number,
  target: number,
  range: DateRange,
  entries: readonly AppState["mealEntries"][number][],
  lastLoggedAt: number | null,
  excludedRecordCount: number,
  exclusions: MetricExclusion[],
  confidenceReasons: MetricReason[],
): AnalyticsMetric<number> {
  const validTarget = finiteNonNegative(target);
  const loggedDayCount = entries.length ? 1 : 0;
  return metric({
    id,
    label,
    domain: "nutrition",
    kind: "point_in_time",
    unit: "percent",
    value: validTarget > 0 ? clampPercent(safeRatio(total, validTarget) * 100) : null,
    status: validTarget > 0 ? (entries.length ? "ready" : "needs_more_data") : "unavailable",
    confidence: confidenceForSample(loggedDayCount),
    dateRange: range,
    sampleSize: loggedDayCount,
    reason:
      validTarget <= 0
        ? "Nutrition target is zero or not configured."
        : entries.length
          ? null
          : "No meals are logged for this calendar day.",
    reasons:
      validTarget <= 0
        ? [{ code: "invalid_target", message: "Nutrition target must be a positive number." }]
        : [],
    collection: "meal_entries",
    entryIds: entries.map((entry) => entry.id),
    entryTimestamps: entries.map((entry) => entry.createdAt),
    includedRecordCount: entries.length,
    excludedRecordCount,
    exclusions,
    confidenceReasons,
    expectedDayCount: 1,
    targetRequired: true,
    targetAvailable: validTarget > 0,
    partialPeriod: true,
    lastLoggedAt,
  });
}

export function getNutritionAnalytics(state: AppState, now = Date.now()): NutritionAnalytics {
  const today = todayWindow(now);
  const recentRange = last7DaysWindow(now);
  const previousRange = previous7DaysWindow(now);
  const historyRange = allTimeWindow(now);
  const validMeals = state.mealEntries.filter(
    (meal) => validTimestamp(meal.createdAt) && dateRangeContains(historyRange, meal.createdAt),
  );
  const todayMeals = validMeals.filter((meal) => dateRangeContains(today, meal.createdAt));
  const recentMeals = validMeals.filter((meal) => dateRangeContains(recentRange, meal.createdAt));
  const previousMeals = validMeals.filter((meal) =>
    dateRangeContains(previousRange, meal.createdAt),
  );
  const totals = calculateMealTotals(todayMeals);
  const grouped = groupLogsByDay(recentMeals, (meal) => meal.createdAt);
  const previousGrouped = groupLogsByDay(previousMeals, (meal) => meal.createdAt);
  const dailyRecords = Object.values(grouped).map((entries) => ({
    timestamp: Math.min(...entries.map((entry) => entry.createdAt)),
    totals: calculateMealTotals(entries),
  }));
  const previousDailyRecords = Object.values(previousGrouped).map((entries) => ({
    timestamp: Math.min(...entries.map((entry) => entry.createdAt)),
    totals: calculateMealTotals(entries),
  }));
  const dailyTotals = dailyRecords.map((record) => record.totals);
  const targets = state.nutritionTargets;
  const calorieTargetValue = finiteNonNegative(targets.calories);
  const proteinTargetValue = finiteNonNegative(targets.protein);
  const lastLoggedAt = latestTimestamp(validMeals);
  const invalidTimestampCount = state.mealEntries.filter(
    (meal) => !validTimestamp(meal.createdAt),
  ).length;
  const futureTimestampCount = state.mealEntries.filter(
    (meal) => validTimestamp(meal.createdAt) && !dateRangeContains(historyRange, meal.createdAt),
  ).length;
  const invalidMacroValueCount = state.mealEntries.reduce(
    (count, meal) =>
      count +
      [meal.calories, meal.protein, meal.carbs, meal.fat].filter(
        (value) => !Number.isFinite(value) || value < 0,
      ).length,
    0,
  );
  const sourceExclusions: MetricExclusion[] = [
    { code: "invalid_timestamp", count: invalidTimestampCount },
    { code: "future_timestamp", count: futureTimestampCount },
  ];
  const invalidValueReasons: MetricReason[] = invalidMacroValueCount
    ? [
        {
          code: "invalid_values_excluded",
          message: "Invalid macro values were excluded from nutrition totals.",
          count: invalidMacroValueCount,
        },
      ]
    : [];
  const excludedMealCount = invalidTimestampCount + futureTimestampCount;
  const nutritionSource = (
    entries: readonly AppState["mealEntries"][number][],
    expectedDayCount: number | null,
  ) => ({
    collection: "meal_entries" as const,
    entryIds: entries.map((entry) => entry.id),
    entryTimestamps: entries.map((entry) => entry.createdAt),
    includedRecordCount: entries.length,
    excludedRecordCount: excludedMealCount,
    exclusions: sourceExclusions,
    confidenceReasons: invalidValueReasons,
    expectedDayCount,
  });
  const todayStatus: AnalyticsStatus = todayMeals.length ? "ready" : "needs_more_data";
  const todayReason = todayMeals.length ? null : "No meals are logged for this calendar day.";
  const recentStatus: AnalyticsStatus = dailyTotals.length ? "ready" : "needs_more_data";
  const recentReason = dailyTotals.length
    ? null
    : "No meals are logged in the last 7 calendar days.";

  const caloriesTarget = targetMetric(
    FITCORE_METRIC_IDS.nutrition.caloriesTargetPercent,
    "Calorie target completion",
    totals.calories,
    targets.calories,
    today,
    todayMeals,
    lastLoggedAt,
    excludedMealCount,
    sourceExclusions,
    invalidValueReasons,
  );
  const proteinTarget = targetMetric(
    FITCORE_METRIC_IDS.nutrition.proteinTargetPercent,
    "Protein target completion",
    totals.protein,
    targets.protein,
    today,
    todayMeals,
    lastLoggedAt,
    excludedMealCount,
    sourceExclusions,
    invalidValueReasons,
  );
  const carbsTarget = targetMetric(
    FITCORE_METRIC_IDS.nutrition.carbsTargetPercent,
    "Carbohydrate target completion",
    totals.carbs,
    targets.carbs,
    today,
    todayMeals,
    lastLoggedAt,
    excludedMealCount,
    sourceExclusions,
    invalidValueReasons,
  );
  const fatTarget = targetMetric(
    FITCORE_METRIC_IDS.nutrition.fatTargetPercent,
    "Fat target completion",
    totals.fat,
    targets.fat,
    today,
    todayMeals,
    lastLoggedAt,
    excludedMealCount,
    sourceExclusions,
    invalidValueReasons,
  );
  const targetMetrics = [caloriesTarget, proteinTarget, carbsTarget, fatTarget];
  const availableTargetValues = targetMetrics
    .filter((target) => target.value !== null)
    .map((target) => target.value as number);

  const adherenceValues: number[] = [];
  for (const day of dailyTotals) {
    const components: number[] = [];
    const proteinGoal = proteinTargetValue;
    if (calorieTargetValue > 0) {
      components.push(
        clampPercent(
          100 - safeRatio(Math.abs(day.calories - calorieTargetValue), calorieTargetValue) * 100,
        ),
      );
    }
    if (proteinGoal > 0) {
      components.push(clampPercent(safeRatio(day.protein, proteinGoal) * 100));
    }
    if (components.length) adherenceValues.push(safeAverage(components));
  }
  const hasAdherenceTargets = calorieTargetValue > 0 || proteinTargetValue > 0;
  const averageDirection = (current: number | null, previous: number | null): TrendDirection =>
    current === null || previous === null
      ? "unknown"
      : Math.abs(current - previous) < 0.0001
        ? "stable"
        : current > previous
          ? "up"
          : "down";
  const currentCaloriesAverage = dailyTotals.length
    ? safeAverage(dailyTotals.map((day) => day.calories))
    : null;
  const previousCaloriesAverage = previousDailyRecords.length
    ? safeAverage(previousDailyRecords.map((record) => record.totals.calories))
    : null;
  const currentProteinAverage = dailyTotals.length
    ? safeAverage(dailyTotals.map((day) => day.protein))
    : null;
  const previousProteinAverage = previousDailyRecords.length
    ? safeAverage(previousDailyRecords.map((record) => record.totals.protein))
    : null;
  const nutritionTrend = (field: "calories" | "protein") => {
    const currentAverage = field === "calories" ? currentCaloriesAverage : currentProteinAverage;
    const previousAverage = field === "calories" ? previousCaloriesAverage : previousProteinAverage;
    return calculateTrendQuality({
      values: [...previousDailyRecords, ...dailyRecords].map((record) => ({
        timestamp: record.timestamp,
        value: record.totals[field],
      })),
      minimumSampleSize: 2,
      expectedDayCount: 14,
      comparisonComplete: currentAverage !== null && previousAverage !== null,
      direction: averageDirection(currentAverage, previousAverage),
      stableThreshold: field === "calories" ? 25 : 2,
      higherIsBetter: null,
    });
  };

  const todayMetric = (
    id: string,
    label: string,
    unit: AnalyticsUnit,
    value: number,
  ): AnalyticsMetric<number> =>
    metric({
      id,
      label,
      domain: "nutrition",
      kind: "point_in_time",
      unit,
      value,
      status: todayStatus,
      confidence: confidenceForSample(todayMeals.length ? 1 : 0),
      dateRange: today,
      sampleSize: todayMeals.length ? 1 : 0,
      reason: todayReason,
      ...nutritionSource(todayMeals, 1),
      partialPeriod: true,
      lastLoggedAt,
    });

  return {
    domain: "nutrition",
    availability: {
      status: validMeals.length ? "ready" : "needs_more_data",
      sampleSize: validMeals.length,
      reason: validMeals.length ? null : "No meal entries are logged.",
      lastLoggedAt,
    },
    caloriesToday: todayMetric(
      FITCORE_METRIC_IDS.nutrition.caloriesToday,
      "Calories today",
      "kcal",
      totals.calories,
    ),
    proteinToday: todayMetric(
      FITCORE_METRIC_IDS.nutrition.proteinToday,
      "Protein today",
      "grams",
      totals.protein,
    ),
    carbsToday: todayMetric(
      FITCORE_METRIC_IDS.nutrition.carbsToday,
      "Carbohydrates today",
      "grams",
      totals.carbs,
    ),
    fatToday: todayMetric(FITCORE_METRIC_IDS.nutrition.fatToday, "Fat today", "grams", totals.fat),
    targetCompletion: {
      calories: caloriesTarget,
      protein: proteinTarget,
      carbs: carbsTarget,
      fat: fatTarget,
      overall: metric({
        id: FITCORE_METRIC_IDS.nutrition.macroTargetCompletion,
        label: "Overall macro target completion",
        domain: "nutrition",
        kind: "point_in_time",
        unit: "percent",
        value: availableTargetValues.length ? safeAverage(availableTargetValues) : null,
        status: !availableTargetValues.length
          ? "unavailable"
          : todayMeals.length
            ? "ready"
            : "needs_more_data",
        confidence: confidenceForSample(todayMeals.length ? 1 : 0),
        dateRange: today,
        sampleSize: todayMeals.length ? 1 : 0,
        reason: !availableTargetValues.length
          ? "No positive macro targets are configured."
          : todayReason,
        ...nutritionSource(todayMeals, 1),
        targetRequired: true,
        targetAvailable: availableTargetValues.length > 0,
        partialPeriod: true,
        reasons: !availableTargetValues.length
          ? [{ code: "invalid_target", message: "No positive macro targets are configured." }]
          : [],
        metricIds: targetMetrics.map((target) => target.id),
        lastLoggedAt,
      }),
    },
    caloriesRemaining: metric({
      id: FITCORE_METRIC_IDS.nutrition.caloriesRemaining,
      label: "Calories remaining",
      domain: "nutrition",
      kind: "point_in_time",
      unit: "kcal",
      value: calorieTargetValue > 0 ? Math.max(0, calorieTargetValue - totals.calories) : null,
      status: calorieTargetValue > 0 ? todayStatus : "unavailable",
      confidence: confidenceForSample(todayMeals.length ? 1 : 0),
      dateRange: today,
      sampleSize: todayMeals.length ? 1 : 0,
      reason: calorieTargetValue > 0 ? todayReason : "Calorie target is zero or not configured.",
      ...nutritionSource(todayMeals, 1),
      targetRequired: true,
      targetAvailable: calorieTargetValue > 0,
      partialPeriod: true,
      lastLoggedAt,
    }),
    proteinRemaining: metric({
      id: FITCORE_METRIC_IDS.nutrition.proteinRemaining,
      label: "Protein remaining",
      domain: "nutrition",
      kind: "point_in_time",
      unit: "grams",
      value: proteinTargetValue > 0 ? Math.max(0, proteinTargetValue - totals.protein) : null,
      status: proteinTargetValue > 0 ? todayStatus : "unavailable",
      confidence: confidenceForSample(todayMeals.length ? 1 : 0),
      dateRange: today,
      sampleSize: todayMeals.length ? 1 : 0,
      reason: proteinTargetValue > 0 ? todayReason : "Protein target is zero or not configured.",
      ...nutritionSource(todayMeals, 1),
      targetRequired: true,
      targetAvailable: proteinTargetValue > 0,
      partialPeriod: true,
      lastLoggedAt,
    }),
    calories7dAverage: metric({
      id: FITCORE_METRIC_IDS.nutrition.calories7dAverage,
      label: "Average calories — logged days in last 7 days",
      domain: "nutrition",
      unit: "kcal",
      value: currentCaloriesAverage,
      status: recentStatus,
      confidence: confidenceForSample(dailyTotals.length),
      dateRange: recentRange,
      sampleSize: dailyTotals.length,
      reason: recentReason,
      ...nutritionSource(recentMeals, 7),
      partialPeriod: true,
      trendQuality: nutritionTrend("calories"),
      comparisonEntryIds: previousMeals.map((meal) => meal.id),
      lastLoggedAt,
      notes: ["Unlogged days are excluded rather than treated as zero intake."],
    }),
    protein7dAverage: metric({
      id: FITCORE_METRIC_IDS.nutrition.protein7dAverage,
      label: "Average protein — logged days in last 7 days",
      domain: "nutrition",
      unit: "grams",
      value: currentProteinAverage,
      status: recentStatus,
      confidence: confidenceForSample(dailyTotals.length),
      dateRange: recentRange,
      sampleSize: dailyTotals.length,
      reason: recentReason,
      ...nutritionSource(recentMeals, 7),
      partialPeriod: true,
      trendQuality: nutritionTrend("protein"),
      comparisonEntryIds: previousMeals.map((meal) => meal.id),
      lastLoggedAt,
      notes: ["Unlogged days are excluded rather than treated as zero intake."],
    }),
    adherenceScore: metric({
      id: FITCORE_METRIC_IDS.nutrition.adherenceScore,
      label: "Nutrition adherence score",
      domain: "nutrition",
      unit: "score_0_100",
      value: adherenceValues.length ? clampScore(safeAverage(adherenceValues)) : null,
      status: !hasAdherenceTargets ? "unavailable" : recentStatus,
      confidence: confidenceForSample(adherenceValues.length),
      dateRange: recentRange,
      sampleSize: adherenceValues.length,
      reason: !hasAdherenceTargets
        ? "Calorie and protein targets are zero or not configured."
        : recentReason,
      ...nutritionSource(recentMeals, 7),
      targetRequired: true,
      targetAvailable: hasAdherenceTargets,
      partialPeriod: true,
      lastLoggedAt,
    }),
  };
}

export function recoveryCheckInReadinessScore(checkIn: RecoveryCheckIn): number {
  const energy = boundedCheckInValue(checkIn.energy);
  const motivation = boundedCheckInValue(checkIn.motivation);
  const soreness = boundedCheckInValue(checkIn.soreness);
  const stress = boundedCheckInValue(checkIn.stress);
  return clampScore(safeRatio(energy + motivation + (6 - soreness) + (6 - stress), 20) * 100);
}

function boundedCheckInValue(value: unknown): number {
  return Math.max(0, Math.min(5, safeNumber(value)));
}

export function getRecoveryAnalytics(state: AppState, now = Date.now()): RecoveryAnalytics {
  const range = last7DaysWindow(now);
  const previousRange = previous7DaysWindow(now);
  const historyRange = allTimeWindow(now);
  const validCheckIns = sortDatedEntries(
    state.recoveryCheckIns.filter(
      (checkIn) => validCheckIn(checkIn) && dateRangeContains(historyRange, checkIn.createdAt),
    ),
    (checkIn) => checkIn.createdAt,
  );
  const recent = validCheckIns.filter((checkIn) => dateRangeContains(range, checkIn.createdAt));
  const previous = validCheckIns.filter((checkIn) =>
    dateRangeContains(previousRange, checkIn.createdAt),
  );
  const invalidCheckInCount = state.recoveryCheckIns.filter(
    (checkIn) => !validCheckIn(checkIn),
  ).length;
  const futureCheckInCount = state.recoveryCheckIns.filter(
    (checkIn) => validCheckIn(checkIn) && !dateRangeContains(historyRange, checkIn.createdAt),
  ).length;
  const excludedCheckInCount = invalidCheckInCount + futureCheckInCount;
  const sourceExclusions: MetricExclusion[] = [
    { code: "invalid_value", count: invalidCheckInCount },
    { code: "future_timestamp", count: futureCheckInCount },
  ];
  const invalidReasons: MetricReason[] = invalidCheckInCount
    ? [
        {
          code: "invalid_values_excluded",
          message: "Recovery check-ins with invalid timestamps or ratings were excluded.",
          count: invalidCheckInCount,
        },
      ]
    : [];
  const latest = validCheckIns.at(-1) ?? null;
  const lastLoggedAt = latest?.createdAt ?? null;
  const recentStatus: AnalyticsStatus = recent.length ? "ready" : "needs_more_data";
  const recentReason = recent.length
    ? null
    : "No valid recovery check-ins are logged in the last 7 calendar days.";
  const latestSummary: RecoveryCheckInSummary | null = latest
    ? {
        id: latest.id,
        createdAt: latest.createdAt,
        energy: latest.energy,
        soreness: latest.soreness,
        stress: latest.stress,
        motivation: latest.motivation,
        ...(latest.notes ? { notes: latest.notes } : {}),
      }
    : null;
  const readinessValues = recent.map(recoveryCheckInReadinessScore);
  const previousReadinessValues = previous.map(recoveryCheckInReadinessScore);
  const currentReadinessAverage = readinessValues.length ? safeAverage(readinessValues) : null;
  const previousReadinessAverage = previousReadinessValues.length
    ? safeAverage(previousReadinessValues)
    : null;
  const readinessDirection: TrendDirection =
    currentReadinessAverage === null || previousReadinessAverage === null
      ? "unknown"
      : Math.abs(currentReadinessAverage - previousReadinessAverage) <= 2
        ? "stable"
        : currentReadinessAverage > previousReadinessAverage
          ? "up"
          : "down";
  const readinessTrend = calculateTrendQuality({
    values: [...previous, ...recent].map((checkIn) => ({
      timestamp: checkIn.createdAt,
      value: recoveryCheckInReadinessScore(checkIn),
    })),
    expectedDayCount: 14,
    comparisonComplete: recent.length > 0 && previous.length > 0,
    stableThreshold: 2,
    direction: readinessDirection,
    higherIsBetter: true,
  });
  const recoverySource = (
    entries: readonly RecoveryCheckIn[],
    expectedDayCount: number | null,
  ) => ({
    collection: "recovery_check_ins" as const,
    entryIds: entries.map((checkIn) => checkIn.id),
    entryTimestamps: entries.map((checkIn) => checkIn.createdAt),
    includedRecordCount: entries.length,
    excludedRecordCount: excludedCheckInCount,
    exclusions: sourceExclusions,
    confidenceReasons: invalidReasons,
    expectedDayCount,
  });

  const averageMetric = (
    id: string,
    label: string,
    unit: AnalyticsUnit,
    values: number[],
    metricIds: string[] = [],
    trendQuality: TrendQualityResult | null = null,
  ): AnalyticsMetric<number> =>
    metric({
      id,
      label,
      domain: "recovery",
      unit,
      value: values.length ? safeAverage(values) : null,
      status: recentStatus,
      confidence: confidenceForSample(values.length),
      dateRange: range,
      sampleSize: values.length,
      reason: recentReason,
      ...recoverySource(recent, 7),
      partialPeriod: true,
      trendQuality,
      comparisonEntryIds: trendQuality ? previous.map((checkIn) => checkIn.id) : [],
      metricIds,
      lastLoggedAt,
    });

  const readiness = averageMetric(
    FITCORE_METRIC_IDS.recovery.readiness7dAverage,
    "Average readiness — last 7 days",
    "score_0_100",
    readinessValues,
    [],
    readinessTrend,
  );

  return {
    domain: "recovery",
    availability: {
      status: validCheckIns.length ? "ready" : "needs_more_data",
      sampleSize: validCheckIns.length,
      reason: validCheckIns.length ? null : "No valid recovery check-ins are logged.",
      lastLoggedAt,
    },
    latestCheckIn: metric({
      id: FITCORE_METRIC_IDS.recovery.latestCheckIn,
      label: "Latest recovery check-in",
      domain: "recovery",
      kind: "point_in_time",
      unit: "none",
      value: latestSummary,
      status: latest ? "ready" : "needs_more_data",
      confidence: latest ? "low" : "none",
      dateRange: allTimeWindow(now),
      sampleSize: latest ? 1 : 0,
      reason: latest ? null : "No valid recovery check-ins are logged.",
      ...(latest ? recoverySource([latest], null) : recoverySource([], null)),
      confidenceReasons: latest
        ? [
            ...invalidReasons,
            {
              code: "point_in_time",
              message: "The latest check-in is a point-in-time state, not a trend.",
            },
          ]
        : invalidReasons,
      lastLoggedAt,
    }),
    readiness7dAverage: readiness,
    soreness7dAverage: averageMetric(
      FITCORE_METRIC_IDS.recovery.soreness7dAverage,
      "Average soreness — last 7 days",
      "score_1_5",
      recent.map((checkIn) => boundedCheckInValue(checkIn.soreness)),
    ),
    stress7dAverage: averageMetric(
      FITCORE_METRIC_IDS.recovery.stress7dAverage,
      "Average stress — last 7 days",
      "score_1_5",
      recent.map((checkIn) => boundedCheckInValue(checkIn.stress)),
    ),
    energy7dAverage: averageMetric(
      FITCORE_METRIC_IDS.recovery.energy7dAverage,
      "Average energy — last 7 days",
      "score_1_5",
      recent.map((checkIn) => boundedCheckInValue(checkIn.energy)),
    ),
    motivation7dAverage: averageMetric(
      FITCORE_METRIC_IDS.recovery.motivation7dAverage,
      "Average motivation — last 7 days",
      "score_1_5",
      recent.map((checkIn) => boundedCheckInValue(checkIn.motivation)),
    ),
    recoveryScore: averageMetric(
      FITCORE_METRIC_IDS.recovery.score,
      "Recovery score",
      "score_0_100",
      readinessValues,
      [FITCORE_METRIC_IDS.recovery.readiness7dAverage],
      readinessTrend,
    ),
  };
}

function bodyweightDeltaMetric(
  entries: BodyweightPoint[],
  range: DateRange,
  id: string,
  label: string,
  lastLoggedAt: number | null,
  excludedRecordCount: number,
  exclusions: MetricExclusion[],
  confidenceReasons: MetricReason[],
  stale: boolean,
): AnalyticsMetric<number> {
  const inRange = entries.filter((entry) => dateRangeContains(range, entry.timestamp));
  const hasEnoughData = inRange.length >= 2;
  const expectedDayCount = expectedDaysForRange(range);
  const trendQuality = calculateTrendQuality({
    values: inRange.map((entry) => ({ timestamp: entry.timestamp, value: entry.weightLb })),
    expectedDayCount,
    stableThreshold: 0.25,
    higherIsBetter: null,
    stale,
  });
  return metric({
    id,
    label,
    domain: "progress",
    kind: "comparison",
    unit: "lb",
    value: hasEnoughData ? safeNumber(inRange.at(-1)!.weightLb - inRange[0].weightLb) : null,
    status: hasEnoughData ? "ready" : "needs_more_data",
    confidence: confidenceForSample(inRange.length),
    dateRange: range,
    sampleSize: inRange.length,
    minimumSampleSize: 2,
    reason: hasEnoughData
      ? null
      : "At least two valid bodyweight entries are required in this range.",
    reasons: hasEnoughData
      ? []
      : [
          {
            code: inRange.length === 1 ? "single_sample" : "insufficient_samples",
            message: "At least two valid bodyweight entries are required in this range.",
          },
        ],
    collection: "bodyweight_entries",
    entryIds: inRange.map((entry) => entry.entryId),
    entryTimestamps: inRange.map((entry) => entry.timestamp),
    includedRecordCount: inRange.length,
    excludedRecordCount,
    exclusions,
    confidenceReasons,
    expectedDayCount,
    stale,
    trendQuality,
    lastLoggedAt,
  });
}

export function getProgressAnalytics(state: AppState, now = Date.now()): ProgressAnalytics {
  const historyRange = allTimeWindow(now);
  const validEntries = sortDatedEntries(
    state.bodyweightEntries.filter(
      (entry) =>
        validTimestamp(entry.createdAt) &&
        dateRangeContains(historyRange, entry.createdAt) &&
        validBodyweight(entry.weightLb),
    ),
    (entry) => entry.createdAt,
  );
  const invalidTimestampCount = state.bodyweightEntries.filter(
    (entry) => !validTimestamp(entry.createdAt),
  ).length;
  const futureTimestampCount = state.bodyweightEntries.filter(
    (entry) => validTimestamp(entry.createdAt) && !dateRangeContains(historyRange, entry.createdAt),
  ).length;
  const invalidWeightCount = state.bodyweightEntries.filter(
    (entry) =>
      validTimestamp(entry.createdAt) &&
      dateRangeContains(historyRange, entry.createdAt) &&
      !validBodyweight(entry.weightLb),
  ).length;
  const excludedEntryCount = invalidTimestampCount + futureTimestampCount + invalidWeightCount;
  const sourceExclusions: MetricExclusion[] = [
    { code: "invalid_timestamp", count: invalidTimestampCount },
    { code: "future_timestamp", count: futureTimestampCount },
    { code: "invalid_value", count: invalidWeightCount },
  ];
  const invalidReasons: MetricReason[] = excludedEntryCount
    ? [
        {
          code: "invalid_values_excluded",
          message: "Invalid or future bodyweight entries were excluded.",
          count: excludedEntryCount,
        },
      ]
    : [];
  const byDay = new Map<string, AppState["bodyweightEntries"][number]>();
  for (const entry of validEntries) byDay.set(dayKey(entry.createdAt), entry);
  const series: BodyweightPoint[] = [...byDay.values()].map((entry) => ({
    dayKey: dayKey(entry.createdAt),
    timestamp: entry.createdAt,
    weightLb: entry.weightLb,
    entryId: entry.id,
  }));
  const latest = series.at(-1) ?? null;
  const lastLoggedAt = latest?.timestamp ?? null;
  const stale = lastLoggedAt !== null && calendarDayDifference(now, lastLoggedAt) > 14;
  const progressSource = (
    entries: readonly BodyweightPoint[],
    expectedDayCount: number | null,
  ) => ({
    collection: "bodyweight_entries" as const,
    entryIds: entries.map((entry) => entry.entryId),
    entryTimestamps: entries.map((entry) => entry.timestamp),
    includedRecordCount: entries.length,
    excludedRecordCount: excludedEntryCount,
    exclusions: sourceExclusions,
    confidenceReasons: invalidReasons,
    expectedDayCount,
    stale,
  });
  const delta7 = bodyweightDeltaMetric(
    series,
    last7DaysWindow(now),
    FITCORE_METRIC_IDS.progress.bodyweight7dDelta,
    "Bodyweight change — last 7 days",
    lastLoggedAt,
    excludedEntryCount,
    sourceExclusions,
    invalidReasons,
    stale,
  );
  const delta30 = bodyweightDeltaMetric(
    series,
    last30DaysWindow(now),
    FITCORE_METRIC_IDS.progress.bodyweight30dDelta,
    "Bodyweight change — last 30 days",
    lastLoggedAt,
    excludedEntryCount,
    sourceExclusions,
    invalidReasons,
    stale,
  );
  const trendSource = delta30.status === "ready" ? delta30 : delta7;
  const trendValue = trendSource.value;
  const trendDirection: BodyweightTrendDirection =
    trendValue === null
      ? "unknown"
      : Math.abs(trendValue) < 0.25
        ? "stable"
        : trendValue > 0
          ? "up"
          : "down";

  const explicitGoal =
    state.goals.find((goal) => goal.type === "bodyweight") ??
    state.goals.find((goal) => goal.pinned) ??
    state.goals[0] ??
    null;
  const goalTarget = explicitGoal?.target ?? state.profile.targetBodyweightLb;
  const goalCurrent = explicitGoal
    ? explicitGoal.type === "bodyweight" && latest
      ? latest.weightLb
      : explicitGoal.current
    : (latest?.weightLb ?? null);
  const validGoal =
    typeof goalCurrent === "number" &&
    Number.isFinite(goalCurrent) &&
    Number.isFinite(goalTarget) &&
    goalTarget > 0;
  const goalEntryIds = [explicitGoal?.id, latest?.entryId].filter((id): id is string =>
    Boolean(id),
  );
  const trendEntries = series.filter((entry) =>
    trendSource.dateRange ? dateRangeContains(trendSource.dateRange, entry.timestamp) : false,
  );
  const bodyweightTrendQuality = calculateTrendQuality({
    values: trendEntries.map((entry) => ({ timestamp: entry.timestamp, value: entry.weightLb })),
    expectedDayCount: trendSource.source.expectedDayCount,
    stableThreshold: 0.25,
    direction: trendDirection,
    higherIsBetter: null,
    stale,
  });
  const goalTrendQuality = calculateTrendQuality({
    values:
      validGoal && latest ? [{ timestamp: latest.timestamp, value: safeNumber(goalCurrent) }] : [],
    minimumSampleSize: 2,
    comparisonComplete: false,
    higherIsBetter: true,
    stale,
  });

  return {
    domain: "progress",
    availability: {
      status: series.length ? "ready" : "needs_more_data",
      sampleSize: series.length,
      reason: series.length ? null : "No valid bodyweight entries are logged.",
      lastLoggedAt,
    },
    latestBodyweight: metric({
      id: FITCORE_METRIC_IDS.progress.latestBodyweight,
      label: "Latest bodyweight",
      domain: "progress",
      kind: "point_in_time",
      unit: "lb",
      value: latest?.weightLb ?? null,
      status: latest ? "ready" : "needs_more_data",
      confidence: latest ? "low" : "none",
      dateRange: allTimeWindow(now),
      sampleSize: latest ? 1 : 0,
      reason: latest ? null : "No valid bodyweight entries are logged.",
      ...(latest ? progressSource([latest], null) : progressSource([], null)),
      confidenceReasons: latest
        ? [
            ...invalidReasons,
            {
              code: "point_in_time",
              message: "Latest bodyweight is a point-in-time measurement.",
            },
          ]
        : invalidReasons,
      lastLoggedAt,
    }),
    bodyweight7dDelta: delta7,
    bodyweight30dDelta: delta30,
    bodyweightTrend: metric({
      id: FITCORE_METRIC_IDS.progress.bodyweightTrend,
      label: "Bodyweight trend direction",
      domain: "progress",
      kind: "comparison",
      unit: "none",
      value: trendDirection,
      status: trendValue === null ? "needs_more_data" : "ready",
      confidence: trendSource.confidence,
      dateRange: trendSource.dateRange,
      sampleSize: trendSource.sampleSize,
      minimumSampleSize: 2,
      reason:
        trendValue === null ? "At least two bodyweight entries are required for a trend." : null,
      ...progressSource(trendEntries, trendSource.source.expectedDayCount),
      trendQuality: bodyweightTrendQuality,
      metricIds: [trendSource.id],
      lastLoggedAt,
      notes: ["Changes smaller than 0.25 lb are treated as stable."],
    }),
    goalProgressPercent: metric({
      id: FITCORE_METRIC_IDS.progress.goalProgressPercent,
      label: "Goal progress",
      domain: "progress",
      kind: "point_in_time",
      unit: "percent",
      value: validGoal ? clampPercent(safeRatio(goalCurrent, goalTarget) * 100) : null,
      status: validGoal ? "ready" : "unavailable",
      confidence: validGoal ? "low" : "none",
      dateRange: allTimeWindow(now),
      sampleSize: validGoal ? 1 : 0,
      reason: validGoal ? null : "A positive goal target and current value are required.",
      reasons: validGoal
        ? []
        : [
            {
              code: "invalid_target",
              message: "A positive goal target and current value are required.",
            },
          ],
      collection: explicitGoal ? "goals" : "profile",
      entryIds: goalEntryIds,
      entryTimestamps: latest ? [latest.timestamp] : [],
      includedRecordCount: validGoal ? 1 : 0,
      targetRequired: true,
      targetAvailable: validGoal,
      stale,
      trendQuality: goalTrendQuality,
      lastLoggedAt,
      notes: [
        explicitGoal
          ? `Goal source: ${explicitGoal.type}.`
          : "Goal source: profile target bodyweight.",
      ],
    }),
    bodyweightSeries: metric({
      id: FITCORE_METRIC_IDS.progress.bodyweightSeries,
      label: "Bodyweight series",
      domain: "progress",
      kind: "time_series",
      unit: "lb",
      value: series,
      status: series.length ? "ready" : "needs_more_data",
      confidence: confidenceForSample(series.length),
      dateRange: allTimeWindow(now),
      sampleSize: series.length,
      reason: series.length ? null : "No valid bodyweight entries are logged.",
      ...progressSource(series, null),
      trendQuality: calculateTrendQuality({
        values: series.map((entry) => ({ timestamp: entry.timestamp, value: entry.weightLb })),
        stableThreshold: 0.25,
        higherIsBetter: null,
        stale,
      }),
      lastLoggedAt,
      notes: ["When multiple entries share a day, the latest entry is used for charting."],
    }),
  };
}

export function getCoreDomainAnalytics(state: AppState, now = Date.now()): CoreDomainAnalytics {
  return {
    training: getTrainingAnalytics(state, now),
    nutrition: getNutritionAnalytics(state, now),
    recovery: getRecoveryAnalytics(state, now),
    progress: getProgressAnalytics(state, now),
  };
}
