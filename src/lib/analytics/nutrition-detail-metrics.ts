import type { AppState, MealEntry, Workout } from "../types";
import {
  calculateConfidence,
  createAnalyticsMetric,
  type AnalyticsConfidence,
  type AnalyticsConfidenceResult,
  type AnalyticsMetric,
  type AnalyticsMetricSource,
  type AnalyticsStatus,
  type DomainAvailability,
  type MetricReason,
  type MetricReasonCode,
} from "./domain-metrics";
import {
  calendarDayDifference,
  calendarDaysWindow,
  dateRangeContains,
  dayKey,
  startOfDay,
  todayWindow,
  type DateRange,
} from "./date-time";
import { clampPercent, safeAverage, safeMax, safeMin, safeRatio, safeSum } from "./safe-math";

export const CANONICAL_MEAL_TYPES = Object.freeze([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "pre-workout",
  "post-workout",
] as const);
export type CanonicalMealType = (typeof CANONICAL_MEAL_TYPES)[number];
export type NutritionMacro = "calories" | "protein" | "carbs" | "fat";

export const NUTRITION_TARGET_TOLERANCE_PERCENT = 5;
export const NUTRITION_CONSISTENCY_MINIMUM_LOGGED_DAYS = 3;
export const PRE_WORKOUT_WINDOW_MINUTES = 240;
export const POST_WORKOUT_WINDOW_MINUTES = 240;
export const BODYWEIGHT_STALE_AFTER_DAYS = 30;

export const NUTRITION_DETAIL_METRIC_IDS = Object.freeze({
  source: "nutrition.detail.source",
  mealCountToday: "nutrition.meals.count_today",
  mealCountRange: "nutrition.meals.count_range",
  distinctLoggedDays: "nutrition.meals.logged_days",
  mealsPerLoggedDay: "nutrition.meals.per_logged_day",
  mealsPerRequestedDay: "nutrition.meals.per_requested_day",
  dailyMealCountSeries: "nutrition.meals.daily_count_series",
  consistency: (macro: NutritionMacro) => `nutrition.${macro}.consistency`,
  proteinPerBodyweight: "nutrition.protein.per_bodyweight",
} as const);

export interface NutritionDetailOptions {
  now?: number;
  days?: number;
  timeZone?: string;
}

export interface DailyMealCountPoint {
  dayKey: string;
  timestamp: number;
  mealCount: number;
  sourceMealIds: string[];
}

export interface MealCountAnalytics {
  today: AnalyticsMetric<number>;
  rangeTotal: AnalyticsMetric<number>;
  distinctLoggedDays: AnalyticsMetric<number>;
  mealsPerLoggedDay: AnalyticsMetric<number>;
  mealsPerRequestedDay: AnalyticsMetric<number>;
  dailySeries: AnalyticsMetric<DailyMealCountPoint[]>;
}

export interface MealTypeBreakdownItem {
  type: CanonicalMealType | "unknown";
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  mealCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  percentKnownCalories: number;
  percentKnownProtein: number;
  sourceMealIds: string[];
  excludedFieldCounts: Record<NutritionMacro, number>;
  reasons: MetricReason[];
}

export interface MealMacroShare {
  mealId: string;
  mealName: string;
  value: number;
  percent: number;
}

export interface MealMacroDistribution {
  macro: "calories" | "protein";
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  validMealCount: number;
  total: number;
  average: number;
  minimum: number | null;
  maximum: number | null;
  standardDeviation: number | null;
  coefficientOfVariation: number | null;
  evennessPercent: number | null;
  shares: MealMacroShare[];
  highestObservedMeal: { mealId: string; mealName: string; value: number } | null;
  lowestObservedMeal: { mealId: string; mealName: string; value: number } | null;
  sourceMealIds: string[];
  reasons: MetricReason[];
}

export interface DailyMacroPoint {
  dayKey: string;
  timestamp: number;
  value: number;
  sourceMealIds: string[];
  complete: boolean;
}

export interface MacroConsistencyValue {
  macro: NutritionMacro;
  loggedDayCount: number;
  requestedDayCount: number;
  coveragePercent: number;
  dailyValues: DailyMacroPoint[];
  mean: number;
  standardDeviation: number | null;
  coefficientOfVariation: number | null;
  consistencyScore: number | null;
  formula: "coefficient_of_variation_v1";
}

export interface MacroConsistencyAnalytics {
  calories: AnalyticsMetric<MacroConsistencyValue>;
  protein: AnalyticsMetric<MacroConsistencyValue>;
  carbs: AnalyticsMetric<MacroConsistencyValue>;
  fat: AnalyticsMetric<MacroConsistencyValue>;
}

export interface TargetAdherenceAnalytics {
  macro: "calories" | "protein";
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  target: number | null;
  tolerancePercent: number;
  underTargetLoggedDayCount: number | null;
  overTargetLoggedDayCount: number | null;
  withinTargetLoggedDayCount: number | null;
  unclassifiedLoggedDayCount: number;
  unloggedDayCount: number;
  loggedDayCount: number;
  requestedDayCount: number;
  sourceMealIds: string[];
  reasons: MetricReason[];
}

export interface ProteinPerBodyweightAnalytics {
  metric: AnalyticsMetric<number>;
  averageDailyProtein: number | null;
  bodyweightLb: number | null;
  bodyweightSource: "bodyweight_entry" | "profile" | null;
  bodyweightSourceId: string | null;
  bodyweightSourceTimestamp: number | null;
  profileFallbackUsed: boolean;
  staleBodyweight: boolean;
}

export interface WorkoutFuelAnalytics {
  kind: "pre_workout" | "post_workout";
  status: AnalyticsStatus;
  evidenceMode: "explicit_meal_type" | "timestamp_relationship" | null;
  windowMinutes: number;
  completedWorkoutsAnalyzed: number;
  workoutsWithQualifyingMeal: number;
  workoutsWithoutObservedQualifyingMeal: number;
  coveragePercent: number;
  sourceMealIds: string[];
  sourceWorkoutIds: string[];
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  reasons: MetricReason[];
}

export interface MealGapDay {
  dayKey: string;
  timestamp: number;
  gapHours: number[];
  sourceMealIds: string[];
}

export interface MealTimingAnalytics {
  status: AnalyticsStatus;
  daysWithEnoughMeals: number;
  gapCount: number;
  averageGapHours: number | null;
  medianGapHours: number | null;
  minimumGapHours: number | null;
  maximumGapHours: number | null;
  perDayGaps: MealGapDay[];
  sourceMealIds: string[];
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  reasons: MetricReason[];
  includesOvernightIntervals: false;
  fastingInterpretation: null;
}

export interface OptionalNutrientAnalytics {
  field: "fiber" | "sodium" | "sugar" | "hydration";
  supported: boolean;
  status: AnalyticsStatus;
  total: number | null;
  averagePerLoggedDay: number | null;
  coveragePercent: number;
  validSampleCount: number;
  excludedCount: number;
  unit: "grams" | "unknown";
  sourceMealIds: string[];
  confidence: AnalyticsConfidence;
  reasons: MetricReason[];
}

export interface NutritionCompleteness {
  hasMeals: boolean;
  hasMultipleLoggedDays: boolean;
  hasValidCalories: boolean;
  hasValidProtein: boolean;
  hasValidCarbs: boolean;
  hasValidFat: boolean;
  hasValidTargets: boolean;
  hasValidCalorieTarget: boolean;
  hasValidProteinTarget: boolean;
  hasBodyweight: boolean;
  hasMealTypes: boolean;
  hasMealTiming: boolean;
  hasWorkoutTiming: boolean;
  hasPreWorkoutEvidence: boolean;
  hasPostWorkoutEvidence: boolean;
  hasFiberData: boolean;
  hasSodiumData: boolean;
  hasSugarData: boolean;
  hasHydrationData: boolean;
}

export interface NutritionDetailAnalytics {
  mealCounts: MealCountAnalytics;
  mealTypeBreakdown: MealTypeBreakdownItem[];
  proteinDistribution: MealMacroDistribution;
  calorieDistribution: MealMacroDistribution;
  consistency: MacroConsistencyAnalytics;
  targetAdherence: {
    calories: TargetAdherenceAnalytics;
    protein: TargetAdherenceAnalytics;
  };
  proteinPerBodyweight: ProteinPerBodyweightAnalytics;
  workoutFuel: {
    preWorkout: WorkoutFuelAnalytics;
    postWorkout: WorkoutFuelAnalytics;
  };
  mealTiming: MealTimingAnalytics;
  optionalNutrients: {
    fiber: OptionalNutrientAnalytics;
    sodium: OptionalNutrientAnalytics;
    sugar: OptionalNutrientAnalytics;
    hydration: OptionalNutrientAnalytics;
  };
  completeness: NutritionCompleteness;
  availability: DomainAvailability;
  sourceMetadata: AnalyticsMetricSource;
  requestedDateRange: DateRange;
  effectiveDateRange: DateRange | null;
  calendarTimeZone: "local";
}

interface ValidatedMeal {
  meal: MealEntry;
  valid: Record<NutritionMacro, boolean>;
}

interface MealCollection {
  meals: ValidatedMeal[];
  duplicateCount: number;
  invalidIdentityCount: number;
  invalidTimestampCount: number;
  outsideRangeCount: number;
  futureCount: number;
}

interface DayBucket {
  dayKey: string;
  timestamp: number;
  meals: ValidatedMeal[];
}

const MACROS: readonly NutritionMacro[] = ["calories", "protein", "carbs", "fat"];

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && dayKey(value) !== "";
}

function validNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Number.isFinite(value) ? Math.round(value * factor) / factor : 0;
}

function sortedReasons(reasons: readonly MetricReason[]): MetricReason[] {
  const byCode = new Map<MetricReasonCode, MetricReason>();
  for (const reason of reasons) {
    const prior = byCode.get(reason.code);
    byCode.set(reason.code, {
      code: reason.code,
      message: prior?.message ?? reason.message,
      ...((prior?.count ?? 0) + (reason.count ?? 0) > 0
        ? { count: (prior?.count ?? 0) + (reason.count ?? 0) }
        : {}),
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function macroReasonCode(macro: NutritionMacro): MetricReasonCode {
  return {
    calories: "invalid_calories_excluded",
    protein: "invalid_protein_excluded",
    carbs: "invalid_carbs_excluded",
    fat: "invalid_fat_excluded",
  }[macro] as MetricReasonCode;
}

function mealFingerprint(meal: MealEntry): string {
  return JSON.stringify({
    id: meal.id,
    createdAt: Number.isFinite(meal.createdAt) ? meal.createdAt : null,
    name: meal.name,
    type: meal.type,
    calories: Number.isFinite(meal.calories) ? meal.calories : null,
    protein: Number.isFinite(meal.protein) ? meal.protein : null,
    carbs: Number.isFinite(meal.carbs) ? meal.carbs : null,
    fat: Number.isFinite(meal.fat) ? meal.fat : null,
    fiber: Number.isFinite(meal.fiber) ? meal.fiber : null,
  });
}

function collectMeals(state: AppState, range: DateRange, now: number): MealCollection {
  const candidates = state.mealEntries
    .map((meal) => ({
      meal,
      identityValid: typeof meal.id === "string" && meal.id.trim() !== "",
      timestampValid: finiteTimestamp(meal.createdAt),
      inRange: finiteTimestamp(meal.createdAt) && dateRangeContains(range, meal.createdAt),
      future: finiteTimestamp(meal.createdAt) && meal.createdAt > now,
      fingerprint: mealFingerprint(meal),
    }))
    .sort(
      (a, b) =>
        Number(b.identityValid) - Number(a.identityValid) ||
        Number(b.inRange && !b.future) - Number(a.inRange && !a.future) ||
        Number(b.timestampValid) - Number(a.timestampValid) ||
        (a.timestampValid && b.timestampValid ? a.meal.createdAt - b.meal.createdAt : 0) ||
        String(a.meal.id).localeCompare(String(b.meal.id)) ||
        a.fingerprint.localeCompare(b.fingerprint),
    );
  const chosen = new Map<string, (typeof candidates)[number]>();
  let duplicateCount = 0;
  let invalidIdentityCount = 0;
  for (const candidate of candidates) {
    if (!candidate.identityValid) {
      invalidIdentityCount += 1;
      continue;
    }
    if (chosen.has(candidate.meal.id)) duplicateCount += 1;
    else chosen.set(candidate.meal.id, candidate);
  }
  let invalidTimestampCount = 0;
  let outsideRangeCount = 0;
  let futureCount = 0;
  const meals: ValidatedMeal[] = [];
  for (const candidate of chosen.values()) {
    if (!candidate.timestampValid) {
      invalidTimestampCount += 1;
      continue;
    }
    if (candidate.future) {
      futureCount += 1;
      continue;
    }
    if (!candidate.inRange) {
      outsideRangeCount += 1;
      continue;
    }
    meals.push({
      meal: candidate.meal,
      valid: {
        calories: validNonNegative(candidate.meal.calories),
        protein: validNonNegative(candidate.meal.protein),
        carbs: validNonNegative(candidate.meal.carbs),
        fat: validNonNegative(candidate.meal.fat),
      },
    });
  }
  meals.sort(
    (a, b) =>
      a.meal.createdAt - b.meal.createdAt ||
      a.meal.id.localeCompare(b.meal.id) ||
      mealFingerprint(a.meal).localeCompare(mealFingerprint(b.meal)),
  );
  return {
    meals,
    duplicateCount,
    invalidIdentityCount,
    invalidTimestampCount,
    outsideRangeCount,
    futureCount,
  };
}

function dayBuckets(meals: readonly ValidatedMeal[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const meal of meals) {
    const key = dayKey(meal.meal.createdAt);
    const bucket = map.get(key) ?? {
      dayKey: key,
      timestamp: startOfDay(meal.meal.createdAt),
      meals: [],
    };
    bucket.meals.push(meal);
    map.set(key, bucket);
  }
  return [...map.values()]
    .map((bucket) => ({
      ...bucket,
      meals: [...bucket.meals].sort(
        (a, b) => a.meal.createdAt - b.meal.createdAt || a.meal.id.localeCompare(b.meal.id),
      ),
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.dayKey.localeCompare(b.dayKey));
}

function expectedDays(range: DateRange): number {
  return Math.max(0, calendarDayDifference(range.end, range.start));
}

function invalidMacroCount(meals: readonly ValidatedMeal[], macro: NutritionMacro): number {
  return meals.filter((meal) => !meal.valid[macro]).length;
}

function macroSourceIds(meals: readonly ValidatedMeal[], macro: NutritionMacro): string[] {
  return uniqueSorted(meals.filter((meal) => meal.valid[macro]).map((meal) => meal.meal.id));
}

function metricReasonsForCollection(collection: MealCollection): MetricReason[] {
  const reasons: MetricReason[] = [];
  if (!collection.meals.length) {
    reasons.push({ code: "no_valid_meals", message: "No valid meal records are in range." });
  }
  if (collection.invalidIdentityCount > 0) {
    reasons.push({
      code: "missing_meal_identity",
      message: "Meals without a stable ID were excluded.",
      count: collection.invalidIdentityCount,
    });
  }
  if (collection.invalidTimestampCount > 0) {
    reasons.push({
      code: "invalid_meal_timestamp",
      message: "Meals with invalid timestamps were excluded.",
      count: collection.invalidTimestampCount,
    });
  }
  if (collection.duplicateCount > 0) {
    reasons.push({
      code: "duplicate_meal_excluded",
      message: "Duplicate meal IDs were deterministically suppressed.",
      count: collection.duplicateCount,
    });
  }
  return reasons;
}

function mealCountAnalytics(
  collection: MealCollection,
  range: DateRange,
  now: number,
): MealCountAnalytics {
  const buckets = dayBuckets(collection.meals);
  const ids = uniqueSorted(collection.meals.map((meal) => meal.meal.id));
  const timestamps = collection.meals.map((meal) => meal.meal.createdAt);
  const requestedDays = expectedDays(range);
  const today = todayWindow(now);
  const todayMeals = collection.meals.filter((meal) =>
    dateRangeContains(today, meal.meal.createdAt),
  );
  const excluded =
    collection.duplicateCount +
    collection.invalidIdentityCount +
    collection.invalidTimestampCount +
    collection.outsideRangeCount +
    collection.futureCount;
  const reasons = metricReasonsForCollection(collection);
  const base = {
    domain: "nutrition" as const,
    collection: "meal_entries" as const,
    dateRange: range,
    entryIds: ids,
    entryTimestamps: timestamps,
    excludedRecordCount: excluded,
    exclusions: [
      {
        code: "invalid_timestamp" as const,
        count: collection.invalidTimestampCount,
      },
      { code: "future_timestamp" as const, count: collection.futureCount },
      {
        code: "invalid_value" as const,
        count: collection.invalidIdentityCount + collection.duplicateCount,
      },
      { code: "outside_range" as const, count: collection.outsideRangeCount },
    ],
  };
  const total = collection.meals.length;
  const loggedDays = buckets.length;
  const totalStatus: AnalyticsStatus = total ? "ready" : "needs_more_data";
  const perLogged = loggedDays ? rounded(safeRatio(total, loggedDays)) : null;
  const perRequested = requestedDays ? rounded(safeRatio(total, requestedDays)) : null;
  return {
    today: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.mealCountToday,
      label: "Meal count today",
      kind: "point_in_time",
      unit: "count",
      value: todayMeals.length,
      status: todayMeals.length ? "ready" : "needs_more_data",
      dateRange: today,
      sampleSize: todayMeals.length,
      minimumSampleSize: 1,
      reasons,
      entryIds: uniqueSorted(todayMeals.map((meal) => meal.meal.id)),
      entryTimestamps: todayMeals.map((meal) => meal.meal.createdAt),
      partialPeriod: true,
      calculationId: "nutrition.meal_count.today.v1",
    }),
    rangeTotal: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.mealCountRange,
      label: "Meal count in requested range",
      kind: "aggregate",
      unit: "count",
      value: total,
      status: totalStatus,
      sampleSize: total,
      minimumSampleSize: 1,
      reasons,
      expectedDayCount: requestedDays,
      calculationId: "nutrition.meal_count.range.v1",
    }),
    distinctLoggedDays: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.distinctLoggedDays,
      label: "Distinct logged nutrition days",
      kind: "aggregate",
      unit: "days",
      value: loggedDays,
      status: loggedDays ? "ready" : "needs_more_data",
      sampleSize: loggedDays,
      minimumSampleSize: 1,
      reasons,
      expectedDayCount: requestedDays,
      calculationId: "nutrition.logged_days.v1",
    }),
    mealsPerLoggedDay: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.mealsPerLoggedDay,
      label: "Meals per logged day",
      kind: "aggregate",
      unit: "count",
      value: perLogged,
      status: perLogged === null ? "needs_more_data" : "ready",
      sampleSize: loggedDays,
      minimumSampleSize: 1,
      reasons,
      expectedDayCount: null,
      calculationId: "nutrition.meals_per_logged_day.v1",
    }),
    mealsPerRequestedDay: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.mealsPerRequestedDay,
      label: "Meals per requested calendar day",
      kind: "aggregate",
      unit: "count",
      value: perRequested,
      status: perRequested === null ? "unavailable" : totalStatus,
      sampleSize: loggedDays,
      minimumSampleSize: 1,
      reasons,
      expectedDayCount: requestedDays,
      calculationId: "nutrition.meals_per_requested_day.v1",
    }),
    dailySeries: createAnalyticsMetric({
      ...base,
      id: NUTRITION_DETAIL_METRIC_IDS.dailyMealCountSeries,
      label: "Daily logged meal count series",
      kind: "time_series",
      unit: "count",
      value: buckets.map((bucket) => ({
        dayKey: bucket.dayKey,
        timestamp: bucket.timestamp,
        mealCount: bucket.meals.length,
        sourceMealIds: uniqueSorted(bucket.meals.map((meal) => meal.meal.id)),
      })),
      status: loggedDays ? "ready" : "needs_more_data",
      sampleSize: loggedDays,
      minimumSampleSize: 1,
      reasons,
      expectedDayCount: requestedDays,
      calculationId: "nutrition.daily_meal_count.logged_days_only.v1",
    }),
  };
}

function mealTypeBreakdown(meals: readonly ValidatedMeal[]): MealTypeBreakdownItem[] {
  const canonicalMealCount = meals.filter((meal) =>
    CANONICAL_MEAL_TYPES.includes(meal.meal.type as CanonicalMealType),
  ).length;
  const typeCoverage = meals.length ? safeRatio(canonicalMealCount, meals.length) : 0;
  const knownCalories = safeSum(
    meals.filter((meal) => meal.valid.calories).map((meal) => meal.meal.calories),
  );
  const knownProtein = safeSum(
    meals.filter((meal) => meal.valid.protein).map((meal) => meal.meal.protein),
  );
  const order: readonly (CanonicalMealType | "unknown")[] = [...CANONICAL_MEAL_TYPES, "unknown"];
  return order
    .map((type) => {
      const group = meals.filter((meal) => {
        const canonical = CANONICAL_MEAL_TYPES.includes(meal.meal.type as CanonicalMealType)
          ? (meal.meal.type as CanonicalMealType)
          : "unknown";
        return canonical === type;
      });
      if (!group.length) return null;
      const excludedFieldCounts = Object.fromEntries(
        MACROS.map((macro) => [macro, invalidMacroCount(group, macro)]),
      ) as Record<NutritionMacro, number>;
      const excluded = safeSum(Object.values(excludedFieldCounts));
      const distinctDays = new Set(group.map((meal) => dayKey(meal.meal.createdAt))).size;
      const calories = safeSum(
        group.filter((meal) => meal.valid.calories).map((meal) => meal.meal.calories),
      );
      const protein = safeSum(
        group.filter((meal) => meal.valid.protein).map((meal) => meal.meal.protein),
      );
      const confidenceDetails = calculateConfidence({
        levelHint:
          excluded > 0 || type === "unknown" || typeCoverage < 0.75
            ? "low"
            : typeCoverage < 1 || distinctDays < 2
              ? "medium"
              : group.length >= 3
                ? "high"
                : "medium",
        validRecordCount: group.length,
        minimumSampleSize: 1,
        coverageDayCount: new Set(group.map((meal) => dayKey(meal.meal.createdAt))).size,
        expectedDayCount: null,
        comparisonPeriodValid: null,
        targetValid: null,
        partialPeriod: false,
        stale: false,
        excludedRecordCount: excluded,
        additionalReasons:
          type === "unknown" || typeCoverage < 1
            ? [
                {
                  code: "missing_meal_type",
                  message: "At least one meal type is not canonical and was not inferred.",
                },
              ]
            : [],
      });
      return {
        type,
        status: "ready" as const,
        confidence: confidenceDetails.level,
        confidenceDetails,
        mealCount: group.length,
        calories,
        protein,
        carbs: safeSum(group.filter((meal) => meal.valid.carbs).map((meal) => meal.meal.carbs)),
        fat: safeSum(group.filter((meal) => meal.valid.fat).map((meal) => meal.meal.fat)),
        percentKnownCalories:
          knownCalories > 0 ? rounded(clampPercent(safeRatio(calories, knownCalories) * 100)) : 0,
        percentKnownProtein:
          knownProtein > 0 ? rounded(clampPercent(safeRatio(protein, knownProtein) * 100)) : 0,
        sourceMealIds: uniqueSorted(group.map((meal) => meal.meal.id)),
        excludedFieldCounts,
        reasons: sortedReasons(confidenceDetails.reasons),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function standardDeviation(values: readonly number[]): number | null {
  if (!values.length) return null;
  const mean = safeAverage(values);
  return rounded(Math.sqrt(safeAverage(values.map((value) => (value - mean) ** 2))));
}

function sharesForMeals(
  meals: readonly { mealId: string; mealName: string; value: number }[],
  total: number,
): MealMacroShare[] {
  if (total <= 0) return meals.map((meal) => ({ ...meal, percent: 0 }));
  const ordered = [...meals].sort((a, b) => a.mealId.localeCompare(b.mealId));
  let assigned = 0;
  return ordered.map((meal, index) => {
    const percent =
      index === ordered.length - 1
        ? rounded(Math.max(0, 100 - assigned))
        : rounded(clampPercent(safeRatio(meal.value, total) * 100));
    assigned = rounded(assigned + percent);
    return { ...meal, percent };
  });
}

function macroDistribution(
  meals: readonly ValidatedMeal[],
  macro: "calories" | "protein",
): MealMacroDistribution {
  const valid = meals
    .filter((meal) => meal.valid[macro] && meal.meal[macro] > 0)
    .map((meal) => ({ mealId: meal.meal.id, mealName: meal.meal.name, value: meal.meal[macro] }))
    .sort((a, b) => a.mealId.localeCompare(b.mealId));
  const values = valid.map((item) => item.value);
  const total = safeSum(values);
  const deviation = standardDeviation(values);
  const average = valid.length ? rounded(safeAverage(values)) : 0;
  const coefficient =
    average > 0 && deviation !== null ? rounded(safeRatio(deviation, average)) : null;
  const enough = valid.length >= 2 && total > 0;
  const excluded = invalidMacroCount(meals, macro);
  const distinctDays = new Set(
    meals.filter((meal) => meal.valid[macro]).map((meal) => dayKey(meal.meal.createdAt)),
  ).size;
  const reasons: MetricReason[] = [];
  if (!enough) {
    reasons.push({
      code: "insufficient_meals_for_distribution",
      message: "At least two valid positive meal values are required for distribution analysis.",
    });
  }
  if (excluded > 0) {
    reasons.push({
      code: macroReasonCode(macro),
      message: `Meals with invalid ${macro} were excluded from distribution calculations.`,
      count: excluded,
    });
  }
  const confidenceDetails = calculateConfidence({
    levelHint:
      excluded > 0 || distinctDays < 2
        ? "low"
        : valid.length >= 4
          ? "high"
          : valid.length >= 2
            ? "medium"
            : valid.length
              ? "low"
              : "none",
    validRecordCount: valid.length,
    minimumSampleSize: 2,
    coverageDayCount: new Set(
      meals.filter((meal) => meal.valid[macro]).map((meal) => dayKey(meal.meal.createdAt)),
    ).size,
    expectedDayCount: null,
    comparisonPeriodValid: null,
    targetValid: null,
    partialPeriod: false,
    stale: false,
    excludedRecordCount: excluded,
    additionalReasons: reasons,
  });
  const byHighest = [...valid].sort(
    (a, b) => b.value - a.value || a.mealId.localeCompare(b.mealId),
  );
  const byLowest = [...valid].sort((a, b) => a.value - b.value || a.mealId.localeCompare(b.mealId));
  return {
    macro,
    status: enough ? "ready" : "needs_more_data",
    confidence: confidenceDetails.level,
    confidenceDetails,
    validMealCount: valid.length,
    total,
    average,
    minimum: valid.length ? safeMin(values) : null,
    maximum: valid.length ? safeMax(values) : null,
    standardDeviation: deviation,
    coefficientOfVariation: coefficient,
    evennessPercent:
      enough && coefficient !== null ? rounded(clampPercent(100 - coefficient * 100)) : null,
    shares: sharesForMeals(valid, total),
    highestObservedMeal: byHighest[0] ?? null,
    lowestObservedMeal: byLowest[0] ?? null,
    sourceMealIds: uniqueSorted(valid.map((item) => item.mealId)),
    reasons: sortedReasons([...reasons, ...confidenceDetails.reasons]),
  };
}

function dailyMacroPoints(buckets: readonly DayBucket[], macro: NutritionMacro): DailyMacroPoint[] {
  return buckets
    .filter((bucket) => bucket.meals.some((meal) => meal.valid[macro]))
    .map((bucket) => {
      const valid = bucket.meals.filter((meal) => meal.valid[macro]);
      return {
        dayKey: bucket.dayKey,
        timestamp: bucket.timestamp,
        value: safeSum(valid.map((meal) => meal.meal[macro])),
        sourceMealIds: uniqueSorted(valid.map((meal) => meal.meal.id)),
        complete: valid.length === bucket.meals.length,
      };
    });
}

function consistencyMetric(
  meals: readonly ValidatedMeal[],
  buckets: readonly DayBucket[],
  macro: NutritionMacro,
  range: DateRange,
): AnalyticsMetric<MacroConsistencyValue> {
  const points = dailyMacroPoints(buckets, macro);
  const values = points.map((point) => point.value);
  const mean = points.length ? rounded(safeAverage(values)) : 0;
  const deviation = standardDeviation(values);
  const coefficient = mean > 0 && deviation !== null ? rounded(safeRatio(deviation, mean)) : null;
  const requested = expectedDays(range);
  const coverage = requested ? rounded(clampPercent(safeRatio(points.length, requested) * 100)) : 0;
  const enough = points.length >= NUTRITION_CONSISTENCY_MINIMUM_LOGGED_DAYS && mean > 0;
  const excluded = invalidMacroCount(meals, macro);
  const incompleteDays = points.filter((point) => !point.complete).length;
  const reasons: MetricReason[] = [];
  if (!enough) {
    reasons.push({
      code: points.length ? "insufficient_logged_days" : "no_logged_days",
      message: `Consistency requires ${NUTRITION_CONSISTENCY_MINIMUM_LOGGED_DAYS} distinct valid logged days with a positive mean.`,
    });
  }
  if (coverage < 100) {
    reasons.push({
      code: "partial_period_coverage",
      message: "Unlogged requested days remain missing and are not treated as zero intake.",
      count: Math.max(0, requested - points.length),
    });
  }
  if (excluded > 0 || incompleteDays > 0) {
    reasons.push({
      code: "partial_macro_coverage",
      message: `Some logged meals or days lack valid ${macro}.`,
      count: Math.max(excluded, incompleteDays),
    });
    if (excluded > 0) {
      reasons.push({
        code: macroReasonCode(macro),
        message: `Invalid ${macro} fields were excluded.`,
        count: excluded,
      });
    }
  }
  const unit = macro === "calories" ? "kcal" : "grams";
  return createAnalyticsMetric({
    id: NUTRITION_DETAIL_METRIC_IDS.consistency(macro),
    label: `${macro} consistency`,
    domain: "nutrition",
    kind: "time_series",
    unit,
    value: {
      macro,
      loggedDayCount: points.length,
      requestedDayCount: requested,
      coveragePercent: coverage,
      dailyValues: points,
      mean,
      standardDeviation: deviation,
      coefficientOfVariation: coefficient,
      consistencyScore:
        enough && coefficient !== null ? rounded(clampPercent(100 - coefficient * 100)) : null,
      formula: "coefficient_of_variation_v1",
    },
    status: enough ? "ready" : "needs_more_data",
    dateRange: range,
    sampleSize: points.length,
    minimumSampleSize: NUTRITION_CONSISTENCY_MINIMUM_LOGGED_DAYS,
    reasons,
    entryIds: uniqueSorted(points.flatMap((point) => point.sourceMealIds)),
    entryTimestamps: points.map((point) => point.timestamp),
    collection: "meal_entries",
    excludedRecordCount: excluded,
    expectedDayCount: requested,
    calculationId: `nutrition.${macro}.coefficient_of_variation_v1`,
    notes: [
      "Consistency score = clamp(100 - coefficient of variation * 100).",
      "Only logged days with valid values contribute; unlogged days are omitted.",
    ],
  });
}

function targetAdherence(
  meals: readonly ValidatedMeal[],
  buckets: readonly DayBucket[],
  macro: "calories" | "protein",
  targetValue: unknown,
  requestedDays: number,
): TargetAdherenceAnalytics {
  const target = validPositive(targetValue) ? targetValue : null;
  const loggedDays = buckets.length;
  const unloggedDays = Math.max(0, requestedDays - loggedDays);
  const points = dailyMacroPoints(buckets, macro);
  const complete = points.filter((point) => point.complete);
  const unclassified = loggedDays - complete.length;
  const reasons: MetricReason[] = [];
  if (target === null) {
    reasons.push({
      code: targetValue === 0 ? "zero_nutrition_target" : "invalid_nutrition_target",
      message: "A finite positive nutrition target is required for adherence classification.",
    });
  }
  if (unclassified > 0) {
    reasons.push({
      code: "partial_macro_coverage",
      message: "Logged days with incomplete macro values remain unclassified.",
      count: unclassified,
    });
  }
  if (unloggedDays > 0) {
    reasons.push({
      code: "partial_period_coverage",
      message: "Unlogged days remain unclassified and are not counted as under target.",
      count: unloggedDays,
    });
  }
  const lower = target === null ? null : target * (1 - NUTRITION_TARGET_TOLERANCE_PERCENT / 100);
  const upper = target === null ? null : target * (1 + NUTRITION_TARGET_TOLERANCE_PERCENT / 100);
  const under = target === null ? null : complete.filter((point) => point.value < lower!).length;
  const over = target === null ? null : complete.filter((point) => point.value > upper!).length;
  const within =
    target === null
      ? null
      : complete.filter((point) => point.value >= lower! && point.value <= upper!).length;
  const confidenceDetails = calculateConfidence({
    levelHint:
      target === null
        ? "none"
        : unclassified > 0 || unloggedDays > 0
          ? "low"
          : complete.length >= 4
            ? "high"
            : complete.length >= 2
              ? "medium"
              : complete.length
                ? "low"
                : "none",
    validRecordCount: complete.length,
    minimumSampleSize: 1,
    coverageDayCount: complete.length,
    expectedDayCount: requestedDays,
    comparisonPeriodValid: null,
    targetValid: target !== null,
    partialPeriod: false,
    stale: false,
    excludedRecordCount: invalidMacroCount(meals, macro),
    additionalReasons: reasons,
  });
  return {
    macro,
    status: target === null ? "unavailable" : complete.length ? "ready" : "needs_more_data",
    confidence: confidenceDetails.level,
    confidenceDetails,
    target,
    tolerancePercent: NUTRITION_TARGET_TOLERANCE_PERCENT,
    underTargetLoggedDayCount: under,
    overTargetLoggedDayCount: over,
    withinTargetLoggedDayCount: within,
    unclassifiedLoggedDayCount: unclassified,
    unloggedDayCount: unloggedDays,
    loggedDayCount: loggedDays,
    requestedDayCount: requestedDays,
    sourceMealIds: uniqueSorted(complete.flatMap((point) => point.sourceMealIds)),
    reasons: sortedReasons([...reasons, ...confidenceDetails.reasons]),
  };
}

function proteinPerBodyweight(
  state: AppState,
  meals: readonly ValidatedMeal[],
  buckets: readonly DayBucket[],
  range: DateRange,
): ProteinPerBodyweightAnalytics {
  const proteinDays = dailyMacroPoints(buckets, "protein");
  const averageProtein = proteinDays.length
    ? rounded(safeAverage(proteinDays.map((point) => point.value)))
    : null;
  const entries = state.bodyweightEntries
    .filter(
      (entry) =>
        typeof entry.id === "string" &&
        entry.id.trim() !== "" &&
        validPositive(entry.weightLb) &&
        finiteTimestamp(entry.createdAt) &&
        entry.createdAt < range.end &&
        entry.createdAt <= range.end - 1,
    )
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  const latest = entries[0] ?? null;
  const profileValid = state.profile.units === "lb" && validPositive(state.profile.bodyweightLb);
  const bodyweight = latest?.weightLb ?? (profileValid ? state.profile.bodyweightLb : null);
  const source = latest ? "bodyweight_entry" : profileValid ? "profile" : null;
  const stale = latest
    ? calendarDayDifference(range.end - 1, latest.createdAt) > BODYWEIGHT_STALE_AFTER_DAYS
    : false;
  const reasons: MetricReason[] = [];
  if (bodyweight === null) {
    reasons.push({
      code: state.profile.bodyweightLb === 0 ? "missing_bodyweight" : "invalid_bodyweight",
      message: "A valid explicitly pound-denominated bodyweight is required.",
    });
  }
  if (averageProtein === null) {
    reasons.push({
      code: "no_logged_days",
      message: "No logged day has valid protein for the requested period.",
    });
  }
  if (stale) {
    reasons.push({
      code: "stale_bodyweight",
      message: `The latest bodyweight entry is older than ${BODYWEIGHT_STALE_AFTER_DAYS} days.`,
    });
  }
  const ready = bodyweight !== null && averageProtein !== null;
  const ids = uniqueSorted([
    ...proteinDays.flatMap((point) => point.sourceMealIds),
    ...(latest ? [latest.id] : []),
  ]);
  const timestamps = [
    ...proteinDays.map((point) => point.timestamp),
    ...(latest ? [latest.createdAt] : []),
  ];
  return {
    metric: createAnalyticsMetric({
      id: NUTRITION_DETAIL_METRIC_IDS.proteinPerBodyweight,
      label: "Average protein per pound of bodyweight",
      domain: "nutrition",
      kind: "aggregate",
      unit: "g/lb",
      value: ready ? rounded(safeRatio(averageProtein!, bodyweight!)) : null,
      status: ready ? "ready" : "unavailable",
      dateRange: range,
      sampleSize: proteinDays.length,
      minimumSampleSize: 1,
      reasons,
      entryIds: ids,
      entryTimestamps: timestamps,
      collection: "derived_metrics",
      expectedDayCount: null,
      stale,
      calculationId: "nutrition.average_daily_protein_per_explicit_pound.v1",
      notes: [
        source === "bodyweight_entry"
          ? "Bodyweight source: latest valid weightLb entry on or before period end."
          : source === "profile"
            ? "Bodyweight source: profile.bodyweightLb fallback with profile units set to pounds."
            : "No explicitly pound-denominated bodyweight source was available.",
      ],
    }),
    averageDailyProtein: averageProtein,
    bodyweightLb: bodyweight,
    bodyweightSource: source,
    bodyweightSourceId: latest?.id ?? null,
    bodyweightSourceTimestamp: latest?.createdAt ?? null,
    profileFallbackUsed: source === "profile",
    staleBodyweight: stale,
  };
}

function completedWorkouts(state: AppState, range: DateRange, now: number): Workout[] {
  const candidates = state.workouts
    .filter(
      (workout) =>
        typeof workout.id === "string" &&
        workout.id.trim() !== "" &&
        finiteTimestamp(workout.startedAt) &&
        finiteTimestamp(workout.endedAt) &&
        workout.endedAt >= workout.startedAt &&
        workout.endedAt <= now &&
        dateRangeContains(range, workout.endedAt),
    )
    .sort((a, b) => a.endedAt! - b.endedAt! || a.id.localeCompare(b.id));
  const byId = new Map<string, Workout>();
  for (const workout of candidates) if (!byId.has(workout.id)) byId.set(workout.id, workout);
  return [...byId.values()];
}

function workoutFuel(
  meals: readonly ValidatedMeal[],
  workouts: readonly Workout[],
  kind: "pre_workout" | "post_workout",
): WorkoutFuelAnalytics {
  const canonicalType = kind === "pre_workout" ? "pre-workout" : "post-workout";
  const explicit = meals.filter((meal) => meal.meal.type === canonicalType);
  const evidenceMode = explicit.length
    ? "explicit_meal_type"
    : meals.length && workouts.length
      ? "timestamp_relationship"
      : null;
  const candidates = evidenceMode === "explicit_meal_type" ? explicit : meals;
  const windowMinutes =
    kind === "pre_workout" ? PRE_WORKOUT_WINDOW_MINUTES : POST_WORKOUT_WINDOW_MINUTES;
  const windowMs = windowMinutes * 60_000;
  const usedMeals = new Set<string>();
  const linkedMealIds: string[] = [];
  const linkedWorkoutIds: string[] = [];
  for (const workout of workouts) {
    const eligible = candidates
      .filter((meal) => {
        if (usedMeals.has(meal.meal.id)) return false;
        if (kind === "pre_workout") {
          return (
            meal.meal.createdAt <= workout.startedAt &&
            meal.meal.createdAt >= workout.startedAt - windowMs
          );
        }
        return (
          meal.meal.createdAt >= workout.endedAt! &&
          meal.meal.createdAt <= workout.endedAt! + windowMs
        );
      })
      .sort((a, b) => {
        const anchor = kind === "pre_workout" ? workout.startedAt : workout.endedAt!;
        return (
          Math.abs(a.meal.createdAt - anchor) - Math.abs(b.meal.createdAt - anchor) ||
          a.meal.id.localeCompare(b.meal.id)
        );
      });
    const chosen = eligible[0];
    if (!chosen) continue;
    usedMeals.add(chosen.meal.id);
    linkedMealIds.push(chosen.meal.id);
    linkedWorkoutIds.push(workout.id);
  }
  const withMeal = linkedWorkoutIds.length;
  const without = Math.max(0, workouts.length - withMeal);
  const coverage = workouts.length
    ? rounded(clampPercent(safeRatio(withMeal, workouts.length) * 100))
    : 0;
  const reasons: MetricReason[] = [];
  if (!workouts.length) {
    reasons.push({
      code: "missing_workout_timestamps",
      message: "No completed workout with valid start and end timestamps is available.",
    });
  }
  if (evidenceMode === null) {
    reasons.push({
      code:
        kind === "pre_workout"
          ? "pre_workout_evidence_unavailable"
          : "post_workout_evidence_unavailable",
      message: "No valid meal timestamps are available for workout-fuel observation.",
    });
  }
  if (without > 0 && workouts.length > 0) {
    reasons.push({
      code:
        kind === "pre_workout"
          ? "pre_workout_evidence_unavailable"
          : "post_workout_evidence_unavailable",
      message:
        "A qualifying logged meal was not observed for every completed workout; this is not proof no meal was eaten.",
      count: without,
    });
  }
  const confidenceDetails = calculateConfidence({
    levelHint:
      evidenceMode === null || !workouts.length
        ? "none"
        : without > 0
          ? "low"
          : evidenceMode === "explicit_meal_type" && workouts.length >= 3
            ? "high"
            : "medium",
    validRecordCount: withMeal,
    minimumSampleSize: 1,
    coverageDayCount: new Set(
      workouts
        .filter((workout) => linkedWorkoutIds.includes(workout.id))
        .map((workout) => dayKey(workout.endedAt)),
    ).size,
    expectedDayCount: null,
    comparisonPeriodValid: null,
    targetValid: null,
    partialPeriod: false,
    stale: false,
    excludedRecordCount: without,
    additionalReasons: reasons,
  });
  return {
    kind,
    status: !workouts.length || evidenceMode === null ? "unavailable" : "ready",
    evidenceMode,
    windowMinutes,
    completedWorkoutsAnalyzed: workouts.length,
    workoutsWithQualifyingMeal: withMeal,
    workoutsWithoutObservedQualifyingMeal: without,
    coveragePercent: coverage,
    sourceMealIds: uniqueSorted(linkedMealIds),
    sourceWorkoutIds: uniqueSorted(workouts.map((workout) => workout.id)),
    confidence: confidenceDetails.level,
    confidenceDetails,
    reasons: sortedReasons([...reasons, ...confidenceDetails.reasons]),
  };
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : rounded((sorted[middle - 1] + sorted[middle]) / 2);
}

function mealTiming(buckets: readonly DayBucket[], requestedDays: number): MealTimingAnalytics {
  const perDay: MealGapDay[] = [];
  for (const bucket of buckets) {
    if (bucket.meals.length < 2) continue;
    const gaps: number[] = [];
    for (let index = 1; index < bucket.meals.length; index += 1) {
      const gapMs = bucket.meals[index].meal.createdAt - bucket.meals[index - 1].meal.createdAt;
      gaps.push(rounded(Math.max(0, gapMs) / 3_600_000));
    }
    perDay.push({
      dayKey: bucket.dayKey,
      timestamp: bucket.timestamp,
      gapHours: gaps,
      sourceMealIds: uniqueSorted(bucket.meals.map((meal) => meal.meal.id)),
    });
  }
  const gaps = perDay.flatMap((day) => day.gapHours);
  const reasons: MetricReason[] = [];
  if (!gaps.length) {
    reasons.push({
      code: "insufficient_meals_for_timing",
      message: "At least two valid meals on the same calendar day are required for a timing gap.",
    });
  }
  const confidenceDetails = calculateConfidence({
    levelHint:
      gaps.length >= 6 ? "high" : gaps.length >= 2 ? "medium" : gaps.length ? "low" : "none",
    validRecordCount: gaps.length,
    minimumSampleSize: 1,
    coverageDayCount: perDay.length,
    expectedDayCount: requestedDays,
    comparisonPeriodValid: null,
    targetValid: null,
    partialPeriod: false,
    stale: false,
    excludedRecordCount: 0,
    additionalReasons: reasons,
  });
  return {
    status: gaps.length ? "ready" : "needs_more_data",
    daysWithEnoughMeals: perDay.length,
    gapCount: gaps.length,
    averageGapHours: gaps.length ? rounded(safeAverage(gaps)) : null,
    medianGapHours: median(gaps),
    minimumGapHours: gaps.length ? safeMin(gaps) : null,
    maximumGapHours: gaps.length ? safeMax(gaps) : null,
    perDayGaps: perDay,
    sourceMealIds: uniqueSorted(perDay.flatMap((day) => day.sourceMealIds)),
    confidence: confidenceDetails.level,
    confidenceDetails,
    reasons: sortedReasons([...reasons, ...confidenceDetails.reasons]),
    includesOvernightIntervals: false,
    fastingInterpretation: null,
  };
}

function fiberAnalytics(
  meals: readonly ValidatedMeal[],
  loggedDays: number,
): OptionalNutrientAnalytics {
  const valid = meals.filter((meal) => validNonNegative(meal.meal.fiber));
  const invalid = meals.filter(
    (meal) => meal.meal.fiber !== undefined && !validNonNegative(meal.meal.fiber),
  ).length;
  const total = safeSum(valid.map((meal) => meal.meal.fiber));
  const coverage = meals.length
    ? rounded(clampPercent(safeRatio(valid.length, meals.length) * 100))
    : 0;
  const reasons: MetricReason[] = [];
  if (!valid.length) {
    reasons.push({
      code: "no_source_data",
      message: "Fiber is supported by the meal schema but no valid fiber values were logged.",
    });
  }
  if (coverage < 100 && meals.length) {
    reasons.push({
      code: "partial_macro_coverage",
      message: "Fiber is present on only some logged meals.",
      count: meals.length - valid.length,
    });
  }
  return {
    field: "fiber",
    supported: true,
    status: valid.length ? "ready" : "needs_more_data",
    total: valid.length ? total : null,
    averagePerLoggedDay: valid.length && loggedDays ? rounded(safeRatio(total, loggedDays)) : null,
    coveragePercent: coverage,
    validSampleCount: valid.length,
    excludedCount: invalid,
    unit: "grams",
    sourceMealIds: uniqueSorted(valid.map((meal) => meal.meal.id)),
    confidence:
      invalid > 0 || coverage < 100 || loggedDays < 2
        ? "low"
        : valid.length >= 3 && loggedDays >= 3
          ? "high"
          : valid.length
            ? "medium"
            : "none",
    reasons: sortedReasons(reasons),
  };
}

function unsupportedNutrient(field: "sodium" | "sugar" | "hydration"): OptionalNutrientAnalytics {
  return {
    field,
    supported: false,
    status: "unavailable",
    total: null,
    averagePerLoggedDay: null,
    coveragePercent: 0,
    validSampleCount: 0,
    excludedCount: 0,
    unit: "unknown",
    sourceMealIds: [],
    confidence: "none",
    reasons: [
      {
        code: "unsupported_nutrient_field",
        message: `${field} is not persisted by the current meal schema.`,
      },
    ],
  };
}

export function getNutritionDetailAnalytics(
  state: AppState,
  options: NutritionDetailOptions = {},
): NutritionDetailAnalytics {
  const now = finiteTimestamp(options.now) ? options.now : Date.now();
  const days = Math.max(1, Math.trunc(options.days ?? 7));
  const range = calendarDaysWindow(days, now);
  const collection = collectMeals(state, range, now);
  const buckets = dayBuckets(collection.meals);
  const requestedDays = expectedDays(range);
  const counts = mealCountAnalytics(collection, range, now);
  const consistency: MacroConsistencyAnalytics = {
    calories: consistencyMetric(collection.meals, buckets, "calories", range),
    protein: consistencyMetric(collection.meals, buckets, "protein", range),
    carbs: consistencyMetric(collection.meals, buckets, "carbs", range),
    fat: consistencyMetric(collection.meals, buckets, "fat", range),
  };
  const calorieTargetValid = validPositive(state.nutritionTargets.calories);
  const proteinTargetValid = validPositive(state.nutritionTargets.protein);
  const proteinBodyweight = proteinPerBodyweight(state, collection.meals, buckets, range);
  const workouts = completedWorkouts(state, range, now);
  const preWorkout = workoutFuel(collection.meals, workouts, "pre_workout");
  const postWorkout = workoutFuel(collection.meals, workouts, "post_workout");
  const timing = mealTiming(buckets, requestedDays);
  const fiber = fiberAnalytics(collection.meals, buckets.length);
  const sourceIds = uniqueSorted(collection.meals.map((meal) => meal.meal.id));
  const timestamps = collection.meals.map((meal) => meal.meal.createdAt);
  const invalidMacroTotal = safeSum(
    MACROS.map((macro) => invalidMacroCount(collection.meals, macro)),
  );
  const collectionReasons = metricReasonsForCollection(collection);
  for (const macro of MACROS) {
    const count = invalidMacroCount(collection.meals, macro);
    if (count > 0) {
      collectionReasons.push({
        code: macroReasonCode(macro),
        message: `Invalid ${macro} values were excluded from ${macro} calculations without removing meal-count records.`,
        count,
      });
    }
  }
  if (!state.mealEntries.length) {
    collectionReasons.push({ code: "no_meals", message: "No meal records exist." });
  }
  const excluded =
    collection.duplicateCount +
    collection.invalidIdentityCount +
    collection.invalidTimestampCount +
    collection.outsideRangeCount +
    collection.futureCount;
  const sourceMetric = createAnalyticsMetric({
    id: NUTRITION_DETAIL_METRIC_IDS.source,
    label: "Nutrition detail source",
    domain: "nutrition",
    kind: "aggregate",
    unit: "count",
    value: collection.meals.length,
    status: collection.meals.length ? "ready" : "needs_more_data",
    dateRange: range,
    sampleSize: collection.meals.length,
    minimumSampleSize: 1,
    reasons: collectionReasons,
    entryIds: sourceIds,
    entryTimestamps: timestamps,
    includedRecordCount: collection.meals.length,
    collection: "meal_entries",
    excludedRecordCount: excluded + invalidMacroTotal,
    exclusions: [
      { code: "invalid_timestamp", count: collection.invalidTimestampCount },
      { code: "future_timestamp", count: collection.futureCount },
      {
        code: "invalid_value",
        count: collection.invalidIdentityCount + collection.duplicateCount + invalidMacroTotal,
      },
      { code: "outside_range", count: collection.outsideRangeCount },
    ],
    expectedDayCount: requestedDays,
    calculationId: "nutrition.detail.valid_meals_and_fields.v1",
    notes: [
      "Calendar behavior uses the existing local-day utilities.",
      "Malformed nutrient fields are excluded independently from meal-count validity.",
      ...(options.timeZone && options.timeZone !== "local"
        ? [
            `Requested timeZone '${options.timeZone}' is not applied; current analytics use local calendar days.`,
          ]
        : []),
    ],
  });
  const effectiveRange = timestamps.length
    ? { start: Math.min(...timestamps), end: Math.max(...timestamps) + 1 }
    : null;
  const sodium = unsupportedNutrient("sodium");
  const sugar = unsupportedNutrient("sugar");
  const hydration = unsupportedNutrient("hydration");
  return {
    mealCounts: counts,
    mealTypeBreakdown: mealTypeBreakdown(collection.meals),
    proteinDistribution: macroDistribution(collection.meals, "protein"),
    calorieDistribution: macroDistribution(collection.meals, "calories"),
    consistency,
    targetAdherence: {
      calories: targetAdherence(
        collection.meals,
        buckets,
        "calories",
        state.nutritionTargets.calories,
        requestedDays,
      ),
      protein: targetAdherence(
        collection.meals,
        buckets,
        "protein",
        state.nutritionTargets.protein,
        requestedDays,
      ),
    },
    proteinPerBodyweight: proteinBodyweight,
    workoutFuel: { preWorkout, postWorkout },
    mealTiming: timing,
    optionalNutrients: { fiber, sodium, sugar, hydration },
    completeness: {
      hasMeals: collection.meals.length > 0,
      hasMultipleLoggedDays: buckets.length >= 2,
      hasValidCalories: collection.meals.some((meal) => meal.valid.calories),
      hasValidProtein: collection.meals.some((meal) => meal.valid.protein),
      hasValidCarbs: collection.meals.some((meal) => meal.valid.carbs),
      hasValidFat: collection.meals.some((meal) => meal.valid.fat),
      hasValidTargets: calorieTargetValid && proteinTargetValid,
      hasValidCalorieTarget: calorieTargetValid,
      hasValidProteinTarget: proteinTargetValid,
      hasBodyweight: proteinBodyweight.bodyweightLb !== null,
      hasMealTypes: collection.meals.some((meal) =>
        CANONICAL_MEAL_TYPES.includes(meal.meal.type as CanonicalMealType),
      ),
      hasMealTiming: collection.meals.length > 0,
      hasWorkoutTiming: workouts.length > 0,
      hasPreWorkoutEvidence: preWorkout.workoutsWithQualifyingMeal > 0,
      hasPostWorkoutEvidence: postWorkout.workoutsWithQualifyingMeal > 0,
      hasFiberData: fiber.validSampleCount > 0,
      hasSodiumData: false,
      hasSugarData: false,
      hasHydrationData: false,
    },
    availability: {
      status: collection.meals.length
        ? "ready"
        : state.mealEntries.length
          ? "needs_more_data"
          : "unavailable",
      sampleSize: collection.meals.length,
      reason: collectionReasons[0]?.message ?? null,
      lastLoggedAt: timestamps.at(-1) ?? null,
    },
    sourceMetadata: sourceMetric.source,
    requestedDateRange: range,
    effectiveDateRange: effectiveRange,
    calendarTimeZone: "local",
  };
}
