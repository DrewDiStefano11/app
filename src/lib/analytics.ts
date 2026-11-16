import type { AppState, Workout } from "./types";
import { EXERCISES, type MuscleGroup } from "./data";
import { calculatePersonalScores } from "./analytics/personal-scores";
import {
  calculateMealTotals,
  calculateSetVolume,
  calculateWorkoutVolume,
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

export const trainingConsistencyScore = (state: AppState) => calculatePersonalScores(state).training.value;
export const nutritionAdherenceScore = (state: AppState) => calculatePersonalScores(state).nutrition.value;
export const readinessScore = (state: AppState, now = Date.now()) => calculatePersonalScores(state, now).readiness.value;
export const recoveryScore = (state: AppState) => calculatePersonalScores(state).recovery.value;
export const progressScore = (state: AppState) => calculatePersonalScores(state).progress.value;
export const fitcoreScore = (state: AppState) => calculatePersonalScores(state).fitcore.value;
export const performanceScore = (state: AppState) => calculatePersonalScores(state).performance.value;

export interface MomentumFactor {
  id: "training" | "nutrition" | "recovery" | "progress";
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface MomentumResult {
  score: number | null;
  label: string;
  explanation: string;
  hasData: boolean;
  factors: MomentumFactor[];
}

export function momentumScore(state: AppState, now = Date.now()): MomentumResult {
  const scores = calculatePersonalScores(state, now);
  const parts = [
    { id: "training", label: "Training consistency", weight: 35 },
    { id: "nutrition", label: "Nutrition adherence", weight: 25 },
    { id: "recovery", label: "Recovery", weight: 25 },
    { id: "progress", label: "Comparable lifts", weight: 15 },
  ] as const;
  const factors = parts.flatMap(part => {
    const metric = scores[part.id];
    return metric.status === "available" && metric.value !== null
      ? [{ ...part, score: metric.value, detail: metric.explanation }]
      : [];
  });
  const recent = parts.some(part => scores[part.id].freshness === "recent");
  const stale = !recent && parts.some(part => scores[part.id].status === "stale");
  const score = factors.length < 2 ? null : Math.round(
    factors.reduce((sum, part) => sum + part.score * part.weight, 0) /
    factors.reduce((sum, part) => sum + part.weight, 0),
  );
  return {
    score,
    label: state.demoMode ? "Demo Data" : score !== null ? "Logged Activity" :
      stale ? "Stale" : recent ? "Limited Data" : "Not Enough Data",
    explanation: score === null
      ? "Momentum needs recent evidence in at least two areas to summarize your logged activity."
      : "A weighted summary of the available factors shown below. Missing areas are left out, so comparisons require the same contributors.",
    hasData: score !== null,
    factors,
  };
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
    // Preserve the saved mode identifier and show recorded three-day load.
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
    for (const k of Object.keys(out)) out[k] = out[k] / max;
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
  const cutoff = calendarDaysWindow(days, now).start;
  const observations = sorted.filter((e) => e.createdAt >= cutoff && e.createdAt <= now);
  const baseline = observations[0];
  const latest = observations[observations.length - 1];
  if (!baseline || baseline.createdAt === latest.createdAt) return null;
  return latest.weightLb - baseline.weightLb;
}
