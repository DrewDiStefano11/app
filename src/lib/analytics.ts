import type { AppState, Workout } from "./types";
import { EXERCISES, type MuscleGroup } from "./data";
import { clampScore } from "./analytics/safe-math";
import {
  calculateMealTotals,
  calculateSetVolume,
  calculateWorkoutVolume,
  recoveryCheckInReadinessScore,
} from "./analytics/domain-metrics";
import {
  addCalendarDays,
  calendarDaysWindow,
  dateRangeContains,
  dayKey,
  fillMissingDays,
  startOfDay,
  todayWindow,
} from "./analytics/date-time";

export {
  ANALYTICS_ENGINE_VERSION,
  ANALYTICS_GENERATED_BY,
  ANALYTICS_PHASE,
  ANALYTICS_SCHEMA_VERSION,
  getAnalyticsVersionMetadata,
  type AnalyticsVersionMetadata,
} from "./analytics/analytics-version";

export {
  PROVENANCE_SOURCE_TYPES,
  calculateTraceability,
  combineMetricProvenance,
  getUnknownMetricProvenance,
  normalizeMetricProvenance,
  type MetricProvenance,
  type MetricProvenanceInput,
  type ProvenanceDerivation,
  type ProvenanceSourceType,
} from "./analytics/data-provenance";

export {
  METRIC_DEPENDENCY_GRAPH,
  METRIC_DEPENDENCY_GRAPH_ID,
  METRIC_DEPENDENCY_NODE_CATEGORIES,
  assertValidMetricDependencyGraph,
  getDirectMetricDependencies,
  getDirectMetricDependents,
  getMetricDependencyGraph,
  getMetricDependencyNode,
  getMetricDependencyTopologicalOrder,
  getTransitiveMetricDependencies,
  validateMetricDependencyGraph,
  type MetricDependencyDomain,
  type MetricDependencyGraphValidation,
  type MetricDependencyNode,
  type MetricDependencyNodeCategory,
} from "./analytics/metric-dependency-graph";

export {
  METRIC_QUALITY_THRESHOLDS,
  evaluateMetricQuality,
  type MetricQualityAssessment,
  type MetricQualityEvidence,
  type MetricQualityInput,
  type MetricQualityLevel,
  type MetricQualityReason,
  type MetricQualityReasonCode,
} from "./analytics/metric-quality";

export {
  METRIC_FRESHNESS_POLICIES,
  evaluateMetricFreshness,
  type MetricFreshnessAssessment,
  type MetricFreshnessInput,
  type MetricFreshnessPolicy,
  type MetricFreshnessReason,
  type MetricFreshnessReasonCode,
  type MetricFreshnessState,
} from "./analytics/metric-freshness";

export {
  FITCORE_METRIC_TRUST_POLICY_VERSION,
  METRIC_TRUST_THRESHOLDS,
  evaluateMetricTrust,
  type MetricDependencyTrustInput,
  type MetricTrustAssessment,
  type MetricTrustInput,
  type MetricTrustLevel,
  type MetricTrustReason,
  type MetricTrustReasonCode,
  type MetricTrustStatus,
} from "./analytics/metric-trust";

export {
  buildFitCoreAnalyticsTrust,
  type FitCoreAnalyticsTrustInput,
  type FitCoreAnalyticsTrustOptions,
  type FitCoreAnalyticsTrustReport,
  type FitCoreAnalyticsTrustSummary,
} from "./analytics/fitcore-analytics-trust";

export {
  FITCORE_PERSONAL_BASELINE_POLICY,
  PERSONAL_BASELINE_POLICIES,
  calculatePersonalBaseline,
  type AnalyticsTimeSeriesPoint,
  type PersonalBaselineCadence,
  type PersonalBaselineOptions,
  type PersonalBaselineReason,
  type PersonalBaselineReasonCode,
  type PersonalBaselineResult,
  type PersonalBaselineStatus,
  type TimeSeriesAggregation,
} from "./analytics/personal-baselines";

export {
  FITCORE_ROLLING_TREND_POLICY,
  ROLLING_TREND_WINDOWS,
  calculateRollingTrend,
  type RollingTrendDirection,
  type RollingTrendOptions,
  type RollingTrendReason,
  type RollingTrendReasonCode,
  type RollingTrendResult,
  type RollingTrendStatus,
  type RollingTrendWindow,
  type RollingTrendWindowResult,
} from "./analytics/rolling-trends";

export {
  getFitCoreAnalyticsTrends,
  type FitCoreAnalyticsTrendReport,
  type FitCoreAnalyticsTrendSummary,
  type FitCoreMetricTrendRecord,
  type FitCoreTrendReason,
  type FitCoreTrendReasonCode,
  type FitCoreTrendTrustContext,
} from "./analytics/fitcore-analytics-trends";

export {
  FITCORE_ANOMALY_DETECTION_POLICY,
  evaluateAnomaly,
  type AnomalyClassification,
  type AnomalyDetectionOptions,
  type AnomalyDetectionReason,
  type AnomalyDetectionReasonCode,
  type AnomalyDetectionResult,
  type AnomalyDetectionStatus,
} from "./analytics/anomaly-detection";

export {
  FITCORE_MEANINGFUL_CHANGE_POLICY,
  MEANINGFUL_CHANGE_WINDOW_PRIORITY,
  evaluateMeaningfulChange,
  type MeaningfulChangeClassification,
  type MeaningfulChangeReason,
  type MeaningfulChangeReasonCode,
  type MeaningfulChangeResult,
  type MeaningfulChangeStatus,
} from "./analytics/meaningful-change";

export {
  getFitCoreAnalyticsSignals,
  type FitCoreAnalyticsSignalReport,
  type FitCoreAnalyticsSignalSummary,
  type FitCoreMetricSignalReason,
  type FitCoreMetricSignalReasonCode,
  type FitCoreMetricSignalRecord,
} from "./analytics/fitcore-analytics-signals";

export {
  FITCORE_INSIGHT_EVIDENCE_POLICY,
  INSIGHT_EVIDENCE_SOURCE_TYPES,
  buildInsightEvidence,
  type InsightEvidenceBundle,
  type InsightEvidenceInput,
  type InsightEvidenceReason,
  type InsightEvidenceReasonCode,
  type InsightEvidenceSourceType,
  type InsightEvidenceStatus,
} from "./analytics/insight-evidence";

export {
  FITCORE_INSIGHT_CANDIDATE_POLICY,
  evaluateInsightCandidate,
  type InsightCandidate,
  type InsightCandidateReason,
  type InsightCandidateReasonCode,
  type InsightCandidateStatus,
  type InsightDirection,
  type InsightEvidenceStrength,
  type InsightObservationType,
  type InsightReviewPriority,
} from "./analytics/insight-candidates";

export {
  FITCORE_SELECTED_CANDIDATE_LIMIT,
  getFitCoreAnalyticsInsights,
  type FitCoreAnalyticsInsightReport,
  type FitCoreAnalyticsInsightSource,
  type FitCoreAnalyticsInsightSummary,
  type FitCoreInsightNodeEvaluation,
} from "./analytics/fitcore-analytics-insights";

export {
  EVIDENCE_ATTRIBUTION_ROLES,
  EVIDENCE_ATTRIBUTION_STATUSES,
  FITCORE_EVIDENCE_ATTRIBUTION_POLICY,
  buildEvidenceAttribution,
  type EvidenceAttributionInput,
  type EvidenceAttributionReason,
  type EvidenceAttributionReasonCode,
  type EvidenceAttributionRecord,
  type EvidenceAttributionRole,
  type EvidenceAttributionStatus,
} from "./analytics/evidence-attribution";

export {
  FITCORE_INSIGHT_EXPLANATION_POLICY,
  INSIGHT_EXPLANATION_FACT_KINDS,
  INSIGHT_EXPLANATION_STATUSES,
  buildInsightExplanation,
  type InsightExplanationFact,
  type InsightExplanationFactKind,
  type InsightExplanationInput,
  type InsightExplanationLimitation,
  type InsightExplanationLimitationCode,
  type InsightExplanationPacket,
  type InsightExplanationReason,
  type InsightExplanationReasonCode,
  type InsightExplanationStatus,
} from "./analytics/insight-explanations";

export {
  getFitCoreAnalyticsExplanations,
  type FitCoreAnalyticsExplanationReport,
  type FitCoreAnalyticsExplanationSource,
  type FitCoreAnalyticsExplanationSummary,
  type FitCoreExplanationNodeEvaluation,
} from "./analytics/fitcore-analytics-explanations";

export {
  FITCORE_INSIGHT_VISUALIZATION_POLICY,
  INSIGHT_VISUALIZATION_DATA_MODES,
  INSIGHT_VISUALIZATION_INTERACTIONS,
  INSIGHT_VISUALIZATION_KINDS,
  INSIGHT_VISUALIZATION_STATUSES,
  buildInsightVisualizationPacket,
  isVisualizationKindModeCompatible,
  type InsightVisualizationComparisonData,
  type InsightVisualizationComparisonItem,
  type InsightVisualizationData,
  type InsightVisualizationDataMode,
  type InsightVisualizationDerivedData,
  type InsightVisualizationInteraction,
  type InsightVisualizationKind,
  type InsightVisualizationLimitationKey,
  type InsightVisualizationMatrixCell,
  type InsightVisualizationMatrixData,
  type InsightVisualizationPacket,
  type InsightVisualizationPacketInput,
  type InsightVisualizationReasonKey,
  type InsightVisualizationScalarData,
  type InsightVisualizationSeries,
  type InsightVisualizationSeriesData,
  type InsightVisualizationSeriesPoint,
  type InsightVisualizationStatus,
} from "./analytics/insight-visualizations";

export {
  buildFitCoreInsightVisualizations,
  type FitCoreInsightVisualizationEvaluation,
  type FitCoreInsightVisualizationInput,
  type FitCoreInsightVisualizationReport,
  type FitCoreInsightVisualizationSummary,
} from "./analytics/fitcore-analytics-visualizations";

export {
  FITCORE_INSIGHT_INTERACTION_POLICY,
  INSIGHT_INTERACTION_CONTRACT_STATUSES,
  INSIGHT_INTERACTION_REQUEST_KINDS,
  INSIGHT_INTERACTION_RESOLUTION_STATUSES,
  buildInsightInteractionContract,
  type InsightComparisonTarget,
  type InsightDetailTarget,
  type InsightInspectableTarget,
  type InsightInspectableTargetType,
  type InsightInteractionContract,
  type InsightInteractionContractStatus,
  type InsightInteractionLimitationKey,
  type InsightInteractionReasonKey,
  type InsightInteractionRequest,
  type InsightInteractionRequestKind,
  type InsightInteractionResolution,
  type InsightInteractionResolutionStatus,
  type InsightInteractionResolvedTarget,
  type InsightRegionTarget,
  type InsightSeriesTarget,
} from "./analytics/insight-interactions";

export {
  buildFitCoreInsightInteractions,
  resolveFitCoreInsightInteraction,
  type FitCoreInsightInteractionEvaluation,
  type FitCoreInsightInteractionReport,
  type FitCoreInsightInteractionSummary,
} from "./analytics/fitcore-analytics-interactions";

export {
  FITCORE_CORRELATION_VERSION,
  FITCORE_INSIGHT_MINIMUMS,
  FITCORE_INSIGHT_READINESS_VERSION,
  buildFitCoreInsightReadiness,
  type FitCoreCorrelationDirection,
  type FitCoreCorrelationResult,
  type FitCoreCorrelationStatus,
  type FitCoreCorrelationStrength,
  type FitCoreInsightConfidence,
  type FitCoreInsightDomain,
  type FitCoreInsightImpactArea,
  type FitCoreInsightPriority,
  type FitCoreInsightReadinessBuildResult,
  type FitCoreInsightReadinessItem,
  type FitCoreInsightReadinessResult,
  type FitCoreInsightReadinessStatus,
  type FitCoreInsightSourceMetadata,
} from "./analytics/fitcore-insight-readiness";

export {
  DAY_MS,
  addCalendarDays,
  allTimeWindow,
  calendarDayDifference,
  calendarDaysWindow,
  currentWeekWindow,
  dateRangeContains,
  dayKey,
  fillMissingDays,
  groupLogsByDay,
  last14DaysWindow,
  last30DaysWindow,
  last7DaysWindow,
  last90DaysWindow,
  previous30DaysWindow,
  previous7DaysWindow,
  previousWeekWindow,
  sortDatedEntries,
  startOfDay,
  todayWindow,
  yesterdayWindow,
  type DailySeriesPoint,
  type DateRange,
  type WeekdayIndex,
} from "./analytics/date-time";

export {
  ANALYTICS_SAMPLE_MINIMUMS,
  clamp,
  clampPercent,
  clampScore,
  safeAverage,
  safeMax,
  safeMin,
  safeNumber,
  safePercentChange,
  safeRatio,
  safeSum,
} from "./analytics/safe-math";

export {
  FITCORE_METRIC_IDS,
  calculateConfidence,
  calculateMealTotals,
  calculateTrendQuality,
  calculateWorkoutVolume,
  createAnalyticsMetric,
  completedWorkoutCountInRange,
  dailyTrainingVolumeSeries,
  getCoreDomainAnalytics,
  getNutritionAnalytics,
  getProgressAnalytics,
  getRecoveryAnalytics,
  getTrainingAnalytics,
  recoveryCheckInReadinessScore,
  type AnalyticsConfidence,
  type AnalyticsConfidenceResult,
  type AnalyticsDomain,
  type AnalyticsMetric,
  type AnalyticsMetricInput,
  type AnalyticsMetricKind,
  type AnalyticsMetricSource,
  type AnalyticsSourceCollection,
  type AnalyticsStatus,
  type AnalyticsUnit,
  type BodyweightPoint,
  type BodyweightTrendDirection,
  type CoreDomainAnalytics,
  type DomainAvailability,
  type ConfidenceEvidence,
  type MacroTotals,
  type MetricExclusion,
  type MetricReason,
  type MetricReasonCode,
  type NutritionAnalytics,
  type ProgressAnalytics,
  type RecoveryAnalytics,
  type RecoveryCheckInSummary,
  type TrainingAnalytics,
  type TrainingVolumePoint,
  type TrendDirection,
  type TrendQualityCode,
  type TrendQualityInput,
  type TrendQualityResult,
  type TrendValue,
} from "./analytics/domain-metrics";

export {
  BALANCE_TOLERANCE_PERCENT,
  EXERCISE_STALE_AFTER_DAYS,
  MAX_ESTIMATED_1RM_REPETITIONS,
  SECONDARY_MUSCLE_VOLUME_FACTOR,
  STALLED_CHANGE_TOLERANCE_PERCENT,
  STALLED_MINIMUM_SESSIONS,
  STRENGTH_STABLE_CHANGE_PERCENT,
  STRENGTH_TREND_MINIMUM_SESSIONS,
  TRAINING_DETAIL_METRIC_IDS,
  getExerciseAndMuscleAnalytics,
  type BalanceDistributionItem,
  type BestObservedSet,
  type ExerciseAndMuscleAnalytics,
  type ExerciseHistoryAnalytics,
  type ExerciseIdentity,
  type ExerciseIdentityStrategy,
  type ExercisePrEvent,
  type ExercisePrType,
  type ExerciseRanking,
  type ExerciseSetObservation,
  type MuscleGroupAnalytics,
  type MuscleGroupAnalyticsResult,
  type MuscleRecoveryReadiness,
  type StrengthTrendPoint,
  type TrainingBalanceAnalytics,
  type TrainingBalanceDimension,
  type TrainingDetailOptions,
} from "./analytics/training-detail-metrics";

export {
  BODYWEIGHT_STALE_AFTER_DAYS,
  CANONICAL_MEAL_TYPES,
  NUTRITION_CONSISTENCY_MINIMUM_LOGGED_DAYS,
  NUTRITION_DETAIL_METRIC_IDS,
  NUTRITION_TARGET_TOLERANCE_PERCENT,
  POST_WORKOUT_WINDOW_MINUTES,
  PRE_WORKOUT_WINDOW_MINUTES,
  getNutritionDetailAnalytics,
  type CanonicalMealType,
  type DailyMacroPoint,
  type DailyMealCountPoint,
  type MacroConsistencyAnalytics,
  type MacroConsistencyValue,
  type MealCountAnalytics,
  type MealGapDay,
  type MealMacroDistribution,
  type MealMacroShare,
  type MealTimingAnalytics,
  type MealTypeBreakdownItem,
  type NutritionCompleteness,
  type NutritionDetailAnalytics,
  type NutritionDetailOptions,
  type NutritionMacro,
  type OptionalNutrientAnalytics,
  type ProteinPerBodyweightAnalytics,
  type TargetAdherenceAnalytics,
  type WorkoutFuelAnalytics,
} from "./analytics/nutrition-detail-metrics";

export {
  RECOVERY_CONSISTENCY_MINIMUM_LOGGED_DAYS,
  RECOVERY_DETAIL_METRIC_IDS,
  RECOVERY_FIELD_MAXIMUM,
  RECOVERY_FIELD_MINIMUM,
  RECOVERY_HIGH_SORENESS_THRESHOLD,
  RECOVERY_LOW_READINESS_THRESHOLD,
  RECOVERY_TREND_MINIMUM_SAMPLES,
  RECOVERY_TREND_STABLE_THRESHOLD,
  getRecoveryDetailAnalytics,
  recoveryDetailReadinessScore,
  type BodyAreaFrequencyItem,
  type RecoveryCompleteness,
  type RecoveryConditionAnalytics,
  type RecoveryConsistencyValue,
  type RecoveryDetailAnalytics,
  type RecoveryDetailField,
  type RecoveryDetailOptions,
  type RecoverySignalAnalytics,
  type RecoveryTrendPoint,
  type RecoveryTrendValue,
  type WearableMetricAvailability,
} from "./analytics/recovery-detail-metrics";

export {
  FITCORE_ANALYTICS_PRESENTATION_CATALOG,
  FITCORE_ANALYTICS_PRESENTATION_SURFACES,
  FITCORE_ANALYTICS_PRESENTATION_VERSION,
  FITCORE_PRESENTATION_STATE_PRECEDENCE,
  buildFitCoreAnalyticsPresentation,
  getFitCoreAnalyticsPresentation,
  type AnalyticsPresentationAggregateSummary,
  type AnalyticsPresentationDomain,
  type AnalyticsPresentationDomainSummary,
  type AnalyticsPresentationMetric,
  type AnalyticsPresentationMetricDefinition,
  type AnalyticsPresentationMetricId,
  type AnalyticsPresentationMetricValue,
  type AnalyticsPresentationReason,
  type AnalyticsPresentationReasonCode,
  type AnalyticsPresentationSection,
  type AnalyticsPresentationState,
  type AnalyticsPresentationSurface,
  type AnalyticsPresentationSurfaceResult,
  type FitCoreAnalyticsPresentationOptions,
  type FitCoreAnalyticsPresentationResult,
} from "./analytics/fitcore-analytics-presentation";

export {
  FITCORE_AGGREGATE_CONFIDENCE_VERSION,
  FITCORE_ANALYTICS_SCHEMA_VERSION,
  getFitCoreAnalytics,
  type FitCoreAnalyticsAvailability,
  type FitCoreAnalyticsBaseResult,
  type FitCoreAnalyticsCompleteness,
  type FitCoreAnalyticsConfidence,
  type FitCoreAnalyticsDomain,
  type FitCoreAnalyticsExclusions,
  type FitCoreAnalyticsOptions,
  type FitCoreAnalyticsReason,
  type FitCoreAnalyticsReasonCode,
  type FitCoreAnalyticsResult,
  type FitCoreAnalyticsSources,
  type FitCoreDomainAvailabilityStatus,
  type FitCoreDomainCompleteness,
  type FitCoreDomainConfidence,
  type FitCoreDomainSources,
  type FitCoreDomainStatus,
} from "./analytics/fitcore-analytics";

export {
  GOAL_DETAIL_METRIC_IDS,
  GOAL_HIGH_CONFIDENCE_MINIMUM_OBSERVATIONS,
  GOAL_HIGH_CONFIDENCE_MINIMUM_SPAN_DAYS,
  GOAL_HISTORY_MINIMUM_OBSERVATIONS,
  GOAL_PACE_TOLERANCE_PERCENT,
  GOAL_STALE_MEASUREMENT_DAYS,
  getGoalDetailAnalytics,
  type GoalAnalyticalStatus,
  type GoalAnalyticsItem,
  type GoalCompleteness,
  type GoalDeadlineRisk,
  type GoalDetailAnalytics,
  type GoalDetailOptions,
  type GoalDirection,
  type GoalMeasurementPoint,
  type GoalNeededPaceValue,
  type GoalPaceValue,
  type GoalProgressValue,
  type GoalProjectionValue,
} from "./analytics/goal-detail-metrics";

function sortByCreatedAtThenId<T extends { createdAt: number; id: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function withinDays(ts: number, days: number, now = Date.now()) {
  return dateRangeContains(calendarDaysWindow(days, now), ts);
}

export function workoutVolume(w: Workout): number {
  return calculateWorkoutVolume(w);
}

export function workoutsInRange(state: AppState, days: number, now = Date.now()) {
  return state.workouts.filter((w) => withinDays(w.startedAt, days, now));
}

export function totalVolumeInRange(state: AppState, days: number, now = Date.now()) {
  return workoutsInRange(state, days, now).reduce((s, w) => s + workoutVolume(w), 0);
}

export function trainingConsistencyScore(state: AppState): number {
  const target = state.profile.daysPerWeek || 4;
  const actual = workoutsInRange(state, 7).length;
  return Math.max(0, Math.min(100, Math.round((actual / target) * 100)));
}

export function nutritionAdherenceScore(state: AppState): number {
  const recent = state.mealEntries.filter((m) => withinDays(m.createdAt, 7));
  if (!recent.length) return 0;
  // bucket by day
  const days = new Map<string, { c: number; p: number }>();
  for (const m of recent) {
    const d = dayKey(m.createdAt);
    const e = days.get(d) ?? { c: 0, p: 0 };
    e.c += m.calories;
    e.p += m.protein;
    days.set(d, e);
  }
  const targetC = Math.max(1, state.nutritionTargets.calories);
  const targetP = Math.max(1, state.nutritionTargets.protein);
  let sum = 0;
  let n = 0;
  for (const e of days.values()) {
    const cFit = 1 - Math.min(1, Math.abs(e.c - targetC) / targetC);
    const pFit = 1 - Math.min(1, Math.max(0, targetP - e.p) / targetP);
    sum += cFit * 0.5 + pFit * 0.5;
    n++;
  }
  return clampScore((sum / Math.max(1, n)) * 100);
}

export function readinessScore(state: AppState): number {
  const sleep = sortByCreatedAtThenId(state.sleepEntries).slice(-3);
  const check = sortByCreatedAtThenId(state.recoveryCheckIns).slice(-3);
  if (!sleep.length && !check.length) return 70; // baseline
  const sleepAvg = sleep.length
    ? sleep.reduce((s, e) => s + Math.min(1, e.hours / 8) * (e.quality / 5), 0) / sleep.length
    : 0.7;
  const checkAvg = check.length
    ? check.reduce((sum, item) => sum + recoveryCheckInReadinessScore(item) / 100, 0) / check.length
    : 0.7;
  return clampScore((sleepAvg * 0.5 + checkAvg * 0.5) * 100);
}

export function recoveryScore(state: AppState): number {
  // inverse of recent load + readiness
  const recentVol = totalVolumeInRange(state, 3);
  const monthlyAvg = (totalVolumeInRange(state, 28) / 28) * 3;
  const loadRatio = monthlyAvg > 0 ? Math.min(1.5, recentVol / monthlyAvg) : 0.6;
  const loadComponent = Math.max(0, 100 - (loadRatio - 0.7) * 80);
  const readiness = readinessScore(state);
  return clampScore(loadComponent * 0.4 + readiness * 0.6);
}

export function progressScore(state: AppState): number {
  const recent = totalVolumeInRange(state, 14);
  const prev = totalVolumeInRange(state, 28) - recent;
  if (prev <= 0) return recent > 0 ? 70 : 0;
  const delta = (recent - prev) / prev;
  return Math.max(0, Math.min(100, Math.round(60 + delta * 200)));
}

export function fitcoreScore(state: AppState): number {
  const t = trainingConsistencyScore(state);
  const n = nutritionAdherenceScore(state);
  const r = recoveryScore(state);
  const p = progressScore(state);
  return Math.round(t * 0.35 + n * 0.25 + r * 0.25 + p * 0.15);
}

export type MomentumLabel =
  | "Strong Momentum"
  | "Steady"
  | "Slipping"
  | "Reset Needed"
  | "Not Enough Data";

export interface MomentumFactor {
  id: "training" | "nutrition" | "checkins" | "recovery" | "progress";
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface MomentumResult {
  score: number;
  label: MomentumLabel;
  explanation: string;
  hasData: boolean;
  factors: MomentumFactor[];
}

function distinctDays(timestamps: number[], days: number, now = Date.now()) {
  const range = calendarDaysWindow(days, now);
  return new Set(
    timestamps
      .filter((ts) => dateRangeContains(range, ts))
      .map(dayKey)
      .filter(Boolean),
  ).size;
}

function momentumLabel(score: number): Exclude<MomentumLabel, "Not Enough Data"> {
  if (score >= 80) return "Strong Momentum";
  if (score >= 60) return "Steady";
  if (score >= 35) return "Slipping";
  return "Reset Needed";
}

/** Read-only 0-100 trend signal derived entirely from existing FitCore activity. */
export function momentumScore(state: AppState, now = Date.now()): MomentumResult {
  const factors: MomentumFactor[] = [];
  const targetWorkouts = Math.max(1, state.profile.daysPerWeek || 4);
  const recentWorkouts = workoutsInRange(state, 7, now).length;
  const priorRange = calendarDaysWindow(7, now, 7);
  const priorWorkouts = state.workouts.filter((workout) =>
    dateRangeContains(priorRange, workout.startedAt),
  ).length;

  if (state.workouts.length > 0) {
    const adherence = Math.min(1, recentWorkouts / targetWorkouts);
    const trend =
      priorWorkouts > 0
        ? Math.min(1, recentWorkouts / priorWorkouts)
        : recentWorkouts > 0
          ? 0.75
          : 0;
    factors.push({
      id: "training",
      label: "Training consistency",
      score: clampScore((adherence * 0.75 + trend * 0.25) * 100),
      weight: 35,
      detail: `${recentWorkouts} of ${targetWorkouts} planned workouts in the last 7 days`,
    });
  }

  if (state.mealEntries.length > 0) {
    const recentMeals = state.mealEntries.filter((meal) => withinDays(meal.createdAt, 7, now));
    const loggedDays = distinctDays(
      recentMeals.map((meal) => meal.createdAt),
      7,
      now,
    );
    const proteinByDay = new Map<string, number>();
    for (const meal of recentMeals) {
      const day = dayKey(meal.createdAt);
      proteinByDay.set(day, (proteinByDay.get(day) ?? 0) + meal.protein);
    }
    const proteinTarget = Math.max(1, state.nutritionTargets.protein);
    const proteinDays = [...proteinByDay.values()].filter(
      (protein) => protein >= proteinTarget * 0.8,
    ).length;
    factors.push({
      id: "nutrition",
      label: "Nutrition logging",
      score: clampScore(
        (Math.min(1, loggedDays / 7) * 0.6 + Math.min(1, proteinDays / 7) * 0.4) * 100,
      ),
      weight: 25,
      detail: `${loggedDays} meal-log days and ${proteinDays} protein-target days this week`,
    });
  }

  if (state.bodyweightEntries.length > 0 || state.recoveryCheckIns.length > 0) {
    const weighIns = distinctDays(
      state.bodyweightEntries.map((entry) => entry.createdAt),
      14,
      now,
    );
    const checkIns = distinctDays(
      state.recoveryCheckIns.map((entry) => entry.createdAt),
      14,
      now,
    );
    const touchpoints = weighIns + checkIns;
    factors.push({
      id: "checkins",
      label: "Check-in rhythm",
      score: clampScore(Math.min(1, touchpoints / 6) * 100),
      weight: 15,
      detail: `${weighIns} weigh-in${weighIns === 1 ? "" : "s"} and ${checkIns} recovery check-in${checkIns === 1 ? "" : "s"} in 14 days`,
    });
  }

  if (state.sleepEntries.length > 0 || state.recoveryCheckIns.length > 0) {
    const recentSleep = state.sleepEntries.filter((entry) => withinDays(entry.createdAt, 7, now));
    const recentChecks = state.recoveryCheckIns.filter((entry) =>
      withinDays(entry.createdAt, 7, now),
    );
    const sleepDays = distinctDays(
      recentSleep.map((entry) => entry.createdAt),
      7,
      now,
    );
    const sleepGoal = Math.max(1, state.profile.sleepGoalH ?? 8);
    const sleepQuality = recentSleep.length
      ? recentSleep.reduce(
          (sum, entry) => sum + Math.min(1, entry.hours / sleepGoal) * (entry.quality / 5),
          0,
        ) / recentSleep.length
      : 0;
    const checkQuality = recentChecks.length
      ? recentChecks.reduce(
          (sum, entry) =>
            sum +
            (entry.energy + entry.motivation + (6 - entry.soreness) + (6 - entry.stress)) / 20,
          0,
        ) / recentChecks.length
      : 0;
    const qualitySignals = [
      recentSleep.length ? sleepQuality : null,
      recentChecks.length ? checkQuality : null,
    ].filter((value): value is number => value !== null);
    const quality =
      qualitySignals.reduce((sum, value) => sum + value, 0) / Math.max(1, qualitySignals.length);
    factors.push({
      id: "recovery",
      label: "Recovery consistency",
      score: clampScore(
        (Math.min(1, (sleepDays + recentChecks.length) / 7) * 0.45 + quality * 0.55) * 100,
      ),
      weight: 15,
      detail: `${sleepDays} sleep logs and ${recentChecks.length} recovery signals this week`,
    });
  }

  const sortedWeights = sortByCreatedAtThenId(state.bodyweightEntries);
  const recentVolume = totalVolumeInRange(state, 14, now);
  const previousVolume = totalVolumeInRange(state, 28, now) - recentVolume;
  if (sortedWeights.length >= 2 || previousVolume > 0) {
    let score = 50;
    let detail = "Progress signals are holding steady";
    if (sortedWeights.length >= 2) {
      const oldest = sortedWeights[Math.max(0, sortedWeights.length - 4)];
      const latest = sortedWeights[sortedWeights.length - 1];
      const delta = latest.weightLb - oldest.weightLb;
      const wantsLoss = state.profile.goal === "cut";
      const wantsGain = ["lean_bulk", "strength", "hypertrophy"].includes(state.profile.goal);
      const movingCorrectly =
        Math.abs(delta) < 0.25 ||
        (wantsLoss && delta < 0) ||
        (wantsGain && delta > 0) ||
        state.profile.goal === "maintenance";
      score = movingCorrectly ? 85 : 35;
      detail = `Bodyweight moved ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} lb toward your ${state.profile.goal.replace("_", " ")} goal`;
    } else if (previousVolume > 0) {
      const ratio = recentVolume / previousVolume;
      score = clampScore(55 + (ratio - 1) * 80);
      detail = `Training volume is ${ratio >= 1 ? "up" : "down"} ${Math.abs(Math.round((ratio - 1) * 100))}% over the prior 14 days`;
    }
    factors.push({
      id: "progress",
      label: "Goal direction",
      score,
      weight: 10,
      detail,
    });
  }

  if (factors.length === 0) {
    return {
      score: 0,
      label: "Not Enough Data",
      explanation:
        "Log a workout, meal, weigh-in, check-in, or sleep entry to start building momentum.",
      hasData: false,
      factors: [],
    };
  }

  const availableWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const score = clampScore(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / availableWeight,
  );
  const strongest = [...factors].sort((a, b) => b.score - a.score)[0];
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];
  const explanation =
    strongest.id === weakest.id ? strongest.detail : `${strongest.detail}. ${weakest.detail}.`;

  return {
    score,
    label: momentumLabel(score),
    explanation,
    hasData: true,
    factors,
  };
}

export function performanceScore(state: AppState): number {
  const t = trainingConsistencyScore(state);
  const p = progressScore(state);
  return Math.round(t * 0.5 + p * 0.5);
}

export const MUSCLES: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const EX_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export type HeatMode = "load" | "strength" | "recovery" | "imbalance";

/** Returns 0..1 per muscle for the selected mode. */
export function muscleMap(state: AppState, mode: HeatMode): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of MUSCLES) out[m] = 0;

  if (mode === "load" || mode === "imbalance") {
    const recent = workoutsInRange(state, 7);
    for (const w of recent) {
      for (const we of w.exercises) {
        const ex = EX_BY_ID.get(we.exerciseId);
        if (!ex) continue;
        const sets = we.sets.filter((s) => s.completed).length;
        for (const m of ex.primary) out[m] = (out[m] ?? 0) + sets;
        for (const m of ex.secondary ?? []) out[m] = (out[m] ?? 0) + sets * 0.5;
      }
    }
    const max = Math.max(1, ...Object.values(out));
    for (const k of Object.keys(out)) out[k] = out[k] / max;
    if (mode === "imbalance") {
      // imbalance = distance from mean (higher = more imbalanced)
      const vals = Object.values(out);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      for (const k of Object.keys(out)) out[k] = Math.min(1, Math.abs(out[k] - mean) * 2);
    }
    return out;
  }

  if (mode === "recovery") {
    // recovery = 1 - normalized recent load (last 3 days)
    const recent = workoutsInRange(state, 3);
    for (const w of recent) {
      for (const we of w.exercises) {
        const ex = EX_BY_ID.get(we.exerciseId);
        if (!ex) continue;
        const sets = we.sets.filter((s) => s.completed).length;
        for (const m of ex.primary) out[m] = (out[m] ?? 0) + sets;
      }
    }
    const max = Math.max(1, ...Object.values(out));
    for (const k of Object.keys(out)) out[k] = 1 - (out[k] / max) * 0.85;
    return out;
  }

  // strength = volume contribution over 30d, normalized
  const recent = workoutsInRange(state, 30);
  for (const w of recent) {
    for (const we of w.exercises) {
      const ex = EX_BY_ID.get(we.exerciseId);
      if (!ex) continue;
      const vol = we.sets.reduce(
        (s, x) => s + (x.completed && x.weight && x.reps ? x.weight * x.reps : 0),
        0,
      );
      for (const m of ex.primary) out[m] = (out[m] ?? 0) + vol;
      for (const m of ex.secondary ?? []) out[m] = (out[m] ?? 0) + vol * 0.4;
    }
  }
  const max = Math.max(1, ...Object.values(out));
  for (const k of Object.keys(out)) out[k] = out[k] / max;
  return out;
}

export function weeklyVolumeSeries(
  state: AppState,
  days = 7,
  now = Date.now(),
): { day: string; volume: number }[] {
  const range = calendarDaysWindow(days, now);
  const volumeByDay: Record<string, number> = {};
  for (const workout of state.workouts) {
    if (!dateRangeContains(range, workout.startedAt)) continue;
    const key = dayKey(workout.startedAt);
    volumeByDay[key] = (volumeByDay[key] ?? 0) + workoutVolume(workout);
  }
  return fillMissingDays(range, volumeByDay, 0).map((point) => ({
    day: new Date(point.timestamp).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
    volume: Math.round(point.value),
  }));
}

export function todayMealTotals(state: AppState, now = Date.now()) {
  const range = todayWindow(now);
  const today = state.mealEntries.filter((m) => dateRangeContains(range, m.createdAt));
  return calculateMealTotals(today);
}

export function trainingStreak(state: AppState, now = Date.now()): number {
  if (!state.workouts.length) return 0;
  const days = new Set(state.workouts.map((w) => dayKey(w.startedAt)).filter(Boolean));
  let streak = 0;
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addCalendarDays(cursor, -1); // allow today off
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function bestMuscleToTrainToday(state: AppState): string {
  const recovery = muscleMap(state, "recovery");
  const load = muscleMap(state, "load");
  // pick muscle with highest recovery × lowest recent load
  let best = "chest";
  let score = -1;
  for (const m of MUSCLES) {
    const s = (recovery[m] ?? 0.5) - (load[m] ?? 0) * 0.4;
    if (s > score) {
      score = s;
      best = m;
    }
  }
  return best;
}

export function bodyweightDelta(state: AppState, days: number, now = Date.now()): number | null {
  const sorted = sortByCreatedAtThenId(state.bodyweightEntries);
  if (!sorted.length) return null;
  const latest = sorted[sorted.length - 1];
  const cutoff = calendarDaysWindow(days, now).start;
  const baseline = sorted.find((e) => e.createdAt >= cutoff) ?? sorted[0];
  return latest.weightLb - baseline.weightLb;
}
