import type { AppState } from "../types";
import { calculateWorkoutVolume, type AnalyticsConfidence } from "./domain-metrics";
import { dayKey, type DateRange } from "./date-time";
import type { FitCoreAnalyticsBaseResult } from "./fitcore-analytics";
import { ANALYTICS_SAMPLE_MINIMUMS, safeAverage } from "./safe-math";

export const FITCORE_INSIGHT_READINESS_VERSION = "1.0.0";
export const FITCORE_CORRELATION_VERSION = "pearson_overlapping_local_days_v1";
export const FITCORE_INSIGHT_MINIMUMS = Object.freeze({
  correlationSamples: ANALYTICS_SAMPLE_MINIMUMS.correlation,
  consistencySamples: 3,
  muscleGroups: 3,
} as const);

export type FitCoreInsightReadinessStatus = "ready" | "needs_more_data" | "unavailable";
export type FitCoreInsightPriority = "low" | "medium" | "high";
export type FitCoreInsightImpactArea =
  | "training"
  | "nutrition"
  | "recovery"
  | "progress"
  | "cross_app";
export type FitCoreInsightConfidence = "low" | "medium" | "high";
export type FitCoreInsightDomain = "training" | "nutrition" | "recovery" | "goals";
export type FitCoreCorrelationStatus = "ready" | "needs_more_data" | "unavailable";
export type FitCoreCorrelationDirection = "positive" | "negative" | "neutral" | null;
export type FitCoreCorrelationStrength = "weak" | "moderate" | "strong" | null;

export interface FitCoreCorrelationResult {
  id: string;
  status: FitCoreCorrelationStatus;
  coefficient: number | null;
  direction: FitCoreCorrelationDirection;
  strength: FitCoreCorrelationStrength;
  sampleSize: number;
  minimumSampleSize: number;
  dateRange: DateRange | null;
  sourceMetricIds: string[];
  reason: string;
  causationWarning: true;
  algorithmVersion: typeof FITCORE_CORRELATION_VERSION;
}

export interface FitCoreInsightSourceMetadata {
  sourceMetricIds: string[];
  sourcePresentationIds: string[];
  sourceDomains: FitCoreInsightDomain[];
  dateRange: DateRange | null;
  sampleSize: number;
  requiredMinimumSampleSize: number;
  lastRelevantLoggedAt: number | null;
  missingDataNotes: string[];
  relatedCorrelationId: string | null;
  correlationStatus: FitCoreCorrelationStatus | null;
  correlationDirection: FitCoreCorrelationDirection;
  correlationStrength: FitCoreCorrelationStrength;
  causationWarning: boolean;
}

export interface FitCoreInsightReadinessItem {
  id: string;
  title: string;
  domains: FitCoreInsightDomain[];
  status: FitCoreInsightReadinessStatus;
  requiredData: string[];
  availableData: Record<string, number>;
  reason: string;
  relatedCorrelationId: string | null;
  priority: FitCoreInsightPriority;
  impactArea: FitCoreInsightImpactArea;
  confidence: FitCoreInsightConfidence;
  source: FitCoreInsightSourceMetadata;
}

export interface FitCoreInsightReadinessResult {
  version: typeof FITCORE_INSIGHT_READINESS_VERSION;
  items: FitCoreInsightReadinessItem[];
  readyCount: number;
  needsMoreDataCount: number;
  unavailableCount: number;
}

export interface FitCoreInsightReadinessBuildResult {
  correlations: FitCoreCorrelationResult[];
  insightReadiness: FitCoreInsightReadinessResult;
}

interface DatedValue {
  timestamp: number;
  value: number;
}

interface CandidateDefinition {
  id: string;
  title: string;
  domains: FitCoreInsightDomain[];
  requiredData: string[];
  priority: FitCoreInsightPriority;
  impactArea: FitCoreInsightImpactArea;
  correlationId: string | null;
  sourceMetricIds: string[];
  unsupportedReason?: string;
}

const CORRELATION_IDS = Object.freeze({
  trainingVolumeReadiness: "correlation.training_volume.recovery_readiness",
  caloriesBodyweight: "correlation.calories.bodyweight",
  proteinReadiness: "correlation.protein.recovery_readiness",
  sorenessTrainingLoad: "correlation.soreness.training_load",
} as const);

const CANDIDATES: readonly CandidateDefinition[] = Object.freeze([
  {
    id: "insight.training_volume.recovery_readiness",
    title: "Training volume and recovery readiness",
    domains: ["training", "recovery"],
    requiredData: ["completed training volume by day", "recovery readiness by day"],
    priority: "high",
    impactArea: "cross_app",
    correlationId: CORRELATION_IDS.trainingVolumeReadiness,
    sourceMetricIds: ["training.detail.source", "recovery.detail.readiness.trend"],
  },
  {
    id: "insight.calories.bodyweight_trend",
    title: "Calories and bodyweight trend",
    domains: ["nutrition", "goals"],
    requiredData: ["calories by day", "bodyweight by day"],
    priority: "high",
    impactArea: "progress",
    correlationId: CORRELATION_IDS.caloriesBodyweight,
    sourceMetricIds: ["nutrition.calories.consistency", "progress.bodyweight.series"],
  },
  {
    id: "insight.protein.recovery_readiness",
    title: "Protein intake and recovery readiness",
    domains: ["nutrition", "recovery"],
    requiredData: ["protein by day", "recovery readiness by day"],
    priority: "medium",
    impactArea: "cross_app",
    correlationId: CORRELATION_IDS.proteinReadiness,
    sourceMetricIds: ["nutrition.protein.consistency", "recovery.detail.readiness.trend"],
  },
  {
    id: "insight.soreness.training_load",
    title: "Soreness and training load",
    domains: ["recovery", "training"],
    requiredData: ["soreness by day", "completed training load by day"],
    priority: "high",
    impactArea: "training",
    correlationId: CORRELATION_IDS.sorenessTrainingLoad,
    sourceMetricIds: ["recovery.detail.soreness.trend", "training.detail.source"],
  },
  {
    id: "insight.workout_consistency.momentum",
    title: "Workout consistency and momentum",
    domains: ["training"],
    requiredData: ["completed workouts across multiple days"],
    priority: "medium",
    impactArea: "training",
    correlationId: null,
    sourceMetricIds: ["training.detail.source"],
  },
  {
    id: "insight.nutrition_consistency.goal_progress",
    title: "Nutrition consistency and goal progress",
    domains: ["nutrition", "goals"],
    requiredData: ["nutrition consistency", "supported goal history"],
    priority: "medium",
    impactArea: "progress",
    correlationId: null,
    sourceMetricIds: ["nutrition.calories.consistency", "progress.goals.detail.source"],
  },
  {
    id: "insight.recovery_score.training_consistency",
    title: "Recovery score and training consistency",
    domains: ["recovery", "training"],
    requiredData: ["persisted recovery score", "training consistency"],
    priority: "medium",
    impactArea: "cross_app",
    correlationId: null,
    sourceMetricIds: ["recovery.score", "training.detail.source"],
    unsupportedReason: "The detail aggregate does not expose a persisted recovery score metric.",
  },
  {
    id: "insight.bodyweight.average_calories",
    title: "Bodyweight trend and average calories",
    domains: ["goals", "nutrition"],
    requiredData: ["bodyweight by day", "calories by day"],
    priority: "high",
    impactArea: "progress",
    correlationId: CORRELATION_IDS.caloriesBodyweight,
    sourceMetricIds: ["progress.bodyweight.series", "nutrition.calories.consistency"],
  },
  {
    id: "insight.goal.deadline_risk",
    title: "Goal deadline risk",
    domains: ["goals"],
    requiredData: ["goal target", "current value", "deadline", "dated progress history"],
    priority: "high",
    impactArea: "progress",
    correlationId: null,
    sourceMetricIds: ["progress.goals.detail.source"],
    unsupportedReason:
      "The current goal schema does not persist a deadline or sufficient linked history for deadline-risk analysis.",
  },
  {
    id: "insight.muscle_group.load_imbalance",
    title: "Muscle-group load imbalance",
    domains: ["training"],
    requiredData: [
      "explicit exercise-to-muscle mappings",
      "completed load across multiple muscle groups",
    ],
    priority: "medium",
    impactArea: "training",
    correlationId: null,
    sourceMetricIds: ["training.detail.source"],
  },
]);

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function dailyTrainingVolume(state: AppState, now: number): DatedValue[] {
  const totals = new Map<string, DatedValue>();
  for (const workout of state.workouts) {
    if (!finiteTimestamp(workout.endedAt) || workout.endedAt > now) continue;
    const key = dayKey(workout.endedAt);
    if (!key) continue;
    const existing = totals.get(key);
    const volume = calculateWorkoutVolume(workout);
    totals.set(key, {
      timestamp: existing ? Math.min(existing.timestamp, workout.endedAt) : workout.endedAt,
      value: (existing?.value ?? 0) + volume,
    });
  }
  return [...totals.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function bodyweightSeries(state: AppState, now: number): DatedValue[] {
  const byDay = new Map<string, DatedValue>();
  const sorted = [...state.bodyweightEntries]
    .filter(
      (entry) =>
        finiteTimestamp(entry.createdAt) &&
        entry.createdAt <= now &&
        Number.isFinite(entry.weightLb) &&
        entry.weightLb > 0,
    )
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  for (const entry of sorted)
    byDay.set(dayKey(entry.createdAt), { timestamp: entry.createdAt, value: entry.weightLb });
  return [...byDay.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function overlap(
  left: readonly DatedValue[],
  right: readonly DatedValue[],
): Array<[number, number, number]> {
  const rightByDay = new Map(right.map((item) => [dayKey(item.timestamp), item]));
  return left.flatMap((item) => {
    const match = rightByDay.get(dayKey(item.timestamp));
    return match
      ? [
          [item.value, match.value, Math.max(item.timestamp, match.timestamp)] as [
            number,
            number,
            number,
          ],
        ]
      : [];
  });
}

function pearson(pairs: readonly [number, number, number][]): number | null {
  if (pairs.length < FITCORE_INSIGHT_MINIMUMS.correlationSamples) return null;
  const leftMean = safeAverage(pairs.map(([left]) => left));
  const rightMean = safeAverage(pairs.map(([, right]) => right));
  let numerator = 0;
  let leftSquared = 0;
  let rightSquared = 0;
  for (const [left, right] of pairs) {
    const leftDelta = left - leftMean;
    const rightDelta = right - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquared += leftDelta * leftDelta;
    rightSquared += rightDelta * rightDelta;
  }
  const denominator = Math.sqrt(leftSquared * rightSquared);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function correlation(
  id: string,
  left: readonly DatedValue[],
  right: readonly DatedValue[],
  sourceMetricIds: string[],
): FitCoreCorrelationResult {
  const pairs = overlap(left, right);
  const coefficient = pearson(pairs);
  const enough = pairs.length >= FITCORE_INSIGHT_MINIMUMS.correlationSamples;
  const status: FitCoreCorrelationStatus =
    coefficient !== null ? "ready" : enough ? "unavailable" : "needs_more_data";
  const magnitude = coefficient === null ? null : Math.abs(coefficient);
  return {
    id,
    status,
    coefficient,
    direction:
      coefficient === null
        ? null
        : coefficient > 0.05
          ? "positive"
          : coefficient < -0.05
            ? "negative"
            : "neutral",
    strength:
      magnitude === null
        ? null
        : magnitude >= 0.7
          ? "strong"
          : magnitude >= 0.4
            ? "moderate"
            : "weak",
    sampleSize: pairs.length,
    minimumSampleSize: FITCORE_INSIGHT_MINIMUMS.correlationSamples,
    dateRange: pairs.length
      ? {
          start: Math.min(...pairs.map(([, , timestamp]) => timestamp)),
          end: Math.max(...pairs.map(([, , timestamp]) => timestamp)) + 1,
        }
      : null,
    sourceMetricIds: uniqueSorted(sourceMetricIds),
    reason:
      coefficient !== null
        ? "Enough overlapping, varying observations exist for descriptive correlation analysis."
        : enough
          ? "Overlapping observations have zero variance, so correlation is unavailable."
          : `Correlation requires ${FITCORE_INSIGHT_MINIMUMS.correlationSamples} overlapping dated observations.`,
    causationWarning: true,
    algorithmVersion: FITCORE_CORRELATION_VERSION,
  };
}

function confidenceFromCorrelation(result: FitCoreCorrelationResult): FitCoreInsightConfidence {
  if (result.status !== "ready") return "high";
  return result.sampleSize >= 14 ? "high" : result.sampleSize >= 7 ? "medium" : "low";
}

function itemFromCorrelation(
  definition: CandidateDefinition,
  result: FitCoreCorrelationResult,
): FitCoreInsightReadinessItem {
  const status: FitCoreInsightReadinessStatus = result.status === "ready" ? "ready" : result.status;
  return {
    id: definition.id,
    title: definition.title,
    domains: [...definition.domains],
    status,
    requiredData: [...definition.requiredData],
    availableData: { overlappingSamples: result.sampleSize },
    reason: result.reason,
    relatedCorrelationId: result.id,
    priority: definition.priority,
    impactArea: definition.impactArea,
    confidence: confidenceFromCorrelation(result),
    source: {
      sourceMetricIds: [...result.sourceMetricIds],
      sourcePresentationIds: [...result.sourceMetricIds],
      sourceDomains: [...definition.domains],
      dateRange: result.dateRange,
      sampleSize: result.sampleSize,
      requiredMinimumSampleSize: result.minimumSampleSize,
      lastRelevantLoggedAt: result.dateRange ? result.dateRange.end - 1 : null,
      missingDataNotes: result.status === "ready" ? [] : [result.reason],
      relatedCorrelationId: result.id,
      correlationStatus: result.status,
      correlationDirection: result.direction,
      correlationStrength: result.strength,
      causationWarning: true,
    },
  };
}

function unsupportedItem(definition: CandidateDefinition): FitCoreInsightReadinessItem {
  const reason = definition.unsupportedReason!;
  return {
    id: definition.id,
    title: definition.title,
    domains: [...definition.domains],
    status: "unavailable",
    requiredData: [...definition.requiredData],
    availableData: {},
    reason,
    relatedCorrelationId: null,
    priority: definition.priority,
    impactArea: definition.impactArea,
    confidence: "high",
    source: {
      sourceMetricIds: [...definition.sourceMetricIds],
      sourcePresentationIds: [...definition.sourceMetricIds],
      sourceDomains: [...definition.domains],
      dateRange: null,
      sampleSize: 0,
      requiredMinimumSampleSize: 0,
      lastRelevantLoggedAt: null,
      missingDataNotes: [reason],
      relatedCorrelationId: null,
      correlationStatus: null,
      correlationDirection: null,
      correlationStrength: null,
      causationWarning: false,
    },
  };
}

function directItem(
  definition: CandidateDefinition,
  analytics: FitCoreAnalyticsBaseResult,
): FitCoreInsightReadinessItem {
  let available = 0;
  let required: number = FITCORE_INSIGHT_MINIMUMS.consistencySamples;
  let supported = true;
  let reason = "More dated observations are required for this potential analysis.";
  if (definition.id === "insight.workout_consistency.momentum") {
    available = analytics.domains.training.availability.sampleSize;
  } else if (definition.id === "insight.nutrition_consistency.goal_progress") {
    available = Math.min(
      analytics.domains.nutrition.consistency.calories.sampleSize,
      analytics.domains.goals.availability.sampleSize,
    );
    required = Math.max(FITCORE_INSIGHT_MINIMUMS.consistencySamples, 1);
  } else {
    const groups = analytics.domains.training.muscleGroups.groups.filter(
      (group) => group.status === "ready",
    );
    available = groups.length;
    required = FITCORE_INSIGHT_MINIMUMS.muscleGroups;
    supported = analytics.domains.training.muscleGroups.metadataCoveragePercent === 100;
    reason = supported
      ? "More explicitly mapped muscle-group load observations are required."
      : "Current completed load does not have complete explicit muscle-group mapping.";
  }
  const ready = supported && available >= required;
  return {
    id: definition.id,
    title: definition.title,
    domains: [...definition.domains],
    status: supported ? (ready ? "ready" : "needs_more_data") : "unavailable",
    requiredData: [...definition.requiredData],
    availableData: { samples: available },
    reason: ready ? "The explicit minimum source requirements are satisfied." : reason,
    relatedCorrelationId: null,
    priority: definition.priority,
    impactArea: definition.impactArea,
    confidence: ready ? "medium" : "high",
    source: {
      sourceMetricIds: [...definition.sourceMetricIds],
      sourcePresentationIds: [...definition.sourceMetricIds],
      sourceDomains: [...definition.domains],
      dateRange: analytics.range,
      sampleSize: available,
      requiredMinimumSampleSize: required,
      lastRelevantLoggedAt:
        Math.max(
          ...definition.domains.map(
            (domain) => analytics.domains[domain].availability.lastLoggedAt ?? 0,
          ),
          0,
        ) || null,
      missingDataNotes: ready ? [] : [reason],
      relatedCorrelationId: null,
      correlationStatus: null,
      correlationDirection: null,
      correlationStrength: null,
      causationWarning: false,
    },
  };
}

export function buildFitCoreInsightReadiness(
  state: AppState,
  analytics: FitCoreAnalyticsBaseResult,
  now: number,
): FitCoreInsightReadinessBuildResult {
  const training = dailyTrainingVolume(state, now);
  const bodyweight = bodyweightSeries(state, now);
  const calories =
    analytics.domains.nutrition.consistency.calories.value?.dailyValues.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    })) ?? [];
  const protein =
    analytics.domains.nutrition.consistency.protein.value?.dailyValues.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    })) ?? [];
  const readiness =
    analytics.domains.recovery.trends.readiness.value?.points.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    })) ?? [];
  const soreness =
    analytics.domains.recovery.trends.soreness.value?.points.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
    })) ?? [];
  const correlations = [
    correlation(CORRELATION_IDS.trainingVolumeReadiness, training, readiness, [
      "training.detail.source",
      "recovery.detail.readiness.trend",
    ]),
    correlation(CORRELATION_IDS.caloriesBodyweight, calories, bodyweight, [
      "nutrition.calories.consistency",
      "progress.bodyweight.series",
    ]),
    correlation(CORRELATION_IDS.proteinReadiness, protein, readiness, [
      "nutrition.protein.consistency",
      "recovery.detail.readiness.trend",
    ]),
    correlation(CORRELATION_IDS.sorenessTrainingLoad, soreness, training, [
      "recovery.detail.soreness.trend",
      "training.detail.source",
    ]),
  ];
  const byId = new Map(correlations.map((result) => [result.id, result]));
  const items = CANDIDATES.map((definition) => {
    if (definition.unsupportedReason) return unsupportedItem(definition);
    if (definition.correlationId)
      return itemFromCorrelation(definition, byId.get(definition.correlationId)!);
    return directItem(definition, analytics);
  });
  return {
    correlations,
    insightReadiness: {
      version: FITCORE_INSIGHT_READINESS_VERSION,
      items,
      readyCount: items.filter((item) => item.status === "ready").length,
      needsMoreDataCount: items.filter((item) => item.status === "needs_more_data").length,
      unavailableCount: items.filter((item) => item.status === "unavailable").length,
    },
  };
}
