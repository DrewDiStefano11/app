import { EXERCISES, type Exercise, type MuscleGroup } from "../data";
import type { AppState, CustomExercise, SetEntry, Workout, WorkoutExercise } from "../types";
import {
  calculateConfidence,
  calculateSetVolume,
  calculateTrendQuality,
  createAnalyticsMetric,
  type AnalyticsConfidence,
  type AnalyticsConfidenceResult,
  type AnalyticsMetric,
  type AnalyticsMetricSource,
  type AnalyticsStatus,
  type DomainAvailability,
  type MetricReason,
  type MetricReasonCode,
  type TrendQualityResult,
} from "./domain-metrics";
import {
  allTimeWindow,
  calendarDayDifference,
  calendarDaysWindow,
  dateRangeContains,
  dayKey,
  type DateRange,
} from "./date-time";
import { clampPercent, safePercentChange, safeRatio, safeSum } from "./safe-math";

export const MAX_ESTIMATED_1RM_REPETITIONS = 12;
export const STRENGTH_TREND_MINIMUM_SESSIONS = 3;
export const STRENGTH_STABLE_CHANGE_PERCENT = 1;
export const STALLED_MINIMUM_SESSIONS = 4;
export const STALLED_CHANGE_TOLERANCE_PERCENT = 1;
export const EXERCISE_STALE_AFTER_DAYS = 21;
export const BALANCE_TOLERANCE_PERCENT = 10;
export const SECONDARY_MUSCLE_VOLUME_FACTOR = 0.4;

export const TRAINING_DETAIL_METRIC_IDS = Object.freeze({
  source: "training.detail.source",
  exerciseEstimatedOneRepMax: (exerciseId: string) =>
    `training.exercise.${exerciseId}.estimated_1rm`,
  exerciseStrengthTrend: (exerciseId: string) => `training.exercise.${exerciseId}.strength_trend`,
  muscleVolume: (muscle: string) => `training.muscle.${muscle}.volume`,
  muscleVolumeChange: (muscle: string) => `training.muscle.${muscle}.volume_change`,
} as const);

export interface TrainingDetailOptions {
  now?: number;
  historyDays?: number;
  comparisonDays?: number;
  staleAfterDays?: number;
}

export type ExerciseIdentityStrategy =
  | "catalog_id"
  | "custom_id"
  | "unverified_id"
  | "normalized_name";

export interface ExerciseIdentity {
  id: string;
  sourceExerciseId: string;
  displayName: string;
  strategy: ExerciseIdentityStrategy;
  confidence: AnalyticsConfidence;
}

export interface ExerciseSetObservation {
  setId: string;
  workoutId: string;
  workoutExerciseId: string;
  performedAt: number;
  weight: number;
  repetitions: number;
  volume: number;
  estimatedOneRepMax: number | null;
  modifier: SetEntry["modifier"];
}

export interface BestObservedSet extends ExerciseSetObservation {
  selectionBasis: "estimated_1rm" | "observed_weight_repetitions";
  unit: "unknown";
}

export type ExercisePrType =
  | "initial_benchmark"
  | "highest_observed_weight"
  | "highest_estimated_1rm"
  | "highest_repetitions_at_weight";

export interface ExercisePrEvent {
  id: string;
  type: ExercisePrType;
  current: ExerciseSetObservation;
  previous: ExerciseSetObservation | null;
  improvement: number | null;
  unit: "unknown" | "count";
  timestamp: number;
  sourceIds: string[];
  confidence: AnalyticsConfidence;
  reason: MetricReason;
}

export interface StrengthTrendPoint {
  workoutId: string;
  timestamp: number;
  estimatedOneRepMax: number;
  sourceSetId: string;
}

export interface ExerciseHistoryAnalytics {
  identity: ExerciseIdentity;
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  reasons: MetricReason[];
  requestedDateRange: DateRange;
  effectiveDateRange: DateRange | null;
  completedWorkoutAppearances: number;
  distinctPerformanceDays: number;
  averageSessionsPerWeek: number;
  daysSinceLastPerformed: number | null;
  stale: boolean;
  validSetCount: number;
  excludedSetCount: number;
  totalRepetitions: number;
  totalVolume: number;
  weightUnit: "unknown";
  volumeUnit: "unknown";
  firstPerformedAt: number | null;
  lastPerformedAt: number | null;
  performanceDates: number[];
  sourceWorkoutIds: string[];
  sourceWorkoutExerciseIds: string[];
  sourceSetIds: string[];
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
  muscleMetadataAvailable: boolean;
  bestObservedSet: BestObservedSet | null;
  personalRecordEvents: ExercisePrEvent[];
  estimatedOneRepMax: AnalyticsMetric<number>;
  strengthTrend: AnalyticsMetric<StrengthTrendPoint[]>;
  strengthChangePercent: number | null;
}

export interface MuscleRecoveryReadiness {
  status: AnalyticsStatus;
  loadHistoryAvailable: boolean;
  bodyAreaRecoveryDataAvailable: boolean;
  latestRecoverySignalAt: number | null;
  reasons: MetricReason[];
  sourceIds: string[];
  medicalConclusion: null;
}

export interface MuscleGroupAnalytics {
  id: string;
  status: AnalyticsStatus;
  confidence: AnalyticsConfidence;
  confidenceDetails: AnalyticsConfidenceResult;
  reasons: MetricReason[];
  currentPeriodVolume: number;
  previousPeriodVolume: number;
  volumeChangePercent: number | null;
  volumeUnit: "unknown";
  validSetCount: number;
  completedWorkoutCount: number;
  distinctTrainingDays: number;
  lastTrainedAt: number | null;
  daysSinceLastTrained: number | null;
  sourceExerciseIds: string[];
  sourceWorkoutIds: string[];
  sourceSetIds: string[];
  allocation: "primary_full_secondary_0.4";
  trendQuality: TrendQualityResult;
  recoveryRiskReadiness: MuscleRecoveryReadiness;
}

export interface MuscleGroupAnalyticsResult {
  status: AnalyticsStatus;
  metadataCoveragePercent: number;
  mappedExerciseAppearanceCount: number;
  totalExerciseAppearanceCount: number;
  reasons: MetricReason[];
  groups: MuscleGroupAnalytics[];
  mostTrainedObserved: string[];
  leastTrainedObserved: string[];
  unobservedCanonicalGroups: string[];
}

export interface BalanceDistributionItem {
  id: string;
  value: number;
  percent: number;
}

export interface TrainingBalanceDimension {
  status: AnalyticsStatus;
  basis: "volume" | "valid_sets" | null;
  unit: "unknown" | "count" | "none";
  distribution: BalanceDistributionItem[];
  coveragePercent: number;
  confidence: AnalyticsConfidence;
  tolerancePercent: number;
  interpretation: "balanced_within_tolerance" | "uneven_distribution" | null;
  reasons: MetricReason[];
  sourceWorkoutIds: string[];
}

export interface TrainingBalanceAnalytics {
  pushPullLegs: TrainingBalanceDimension;
  upperLower: TrainingBalanceDimension;
  anteriorPosterior: TrainingBalanceDimension;
  leftRight: TrainingBalanceDimension;
}

export interface ExerciseRanking<T extends "improving" | "stalled"> {
  classification: T;
  status: AnalyticsStatus;
  exerciseIds: string[];
  reasons: MetricReason[];
}

export interface ExerciseAndMuscleAnalytics {
  exercises: ExerciseHistoryAnalytics[];
  topImprovingExercises: ExerciseRanking<"improving">;
  stalledExercises: ExerciseRanking<"stalled">;
  muscleGroups: MuscleGroupAnalyticsResult;
  trainingBalance: TrainingBalanceAnalytics;
  availability: DomainAvailability;
  sourceMetadata: AnalyticsMetricSource;
}

interface CanonicalExerciseMetadata {
  id: string;
  name: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  tracking: CustomExercise["tracking"] | undefined;
  source: "catalog" | "custom";
}

interface ResolvedExercise {
  identity: ExerciseIdentity;
  metadata: CanonicalExerciseMetadata | null;
}

interface ExerciseOccurrence {
  workout: Workout;
  exercise: WorkoutExercise;
  completedAt: number;
  resolved: ResolvedExercise;
  validSets: ExerciseSetObservation[];
  excludedSetCount: number;
  unsupportedRepCount: number;
}

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && dayKey(value) !== "";
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sortedReasons(reasons: readonly MetricReason[]): MetricReason[] {
  const byCode = new Map<MetricReasonCode, MetricReason>();
  for (const reason of reasons) {
    const previous = byCode.get(reason.code);
    byCode.set(reason.code, {
      code: reason.code,
      message: previous?.message ?? reason.message,
      ...((previous?.count ?? 0) + (reason.count ?? 0) > 0
        ? { count: (previous?.count ?? 0) + (reason.count ?? 0) }
        : {}),
    });
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Number.isFinite(value) ? Math.round(value * factor) / factor : 0;
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function metadataMap(state: AppState): Map<string, CanonicalExerciseMetadata> {
  const entries: CanonicalExerciseMetadata[] = [
    ...EXERCISES.map((exercise: Exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primary: uniqueSorted(exercise.primary),
      secondary: uniqueSorted(exercise.secondary ?? []),
      equipment: exercise.equipment,
      tracking: undefined,
      source: "catalog" as const,
    })),
    ...state.customExercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primary: uniqueSorted(exercise.primary),
      secondary: uniqueSorted(exercise.secondary ?? []),
      equipment: exercise.equipment,
      tracking: exercise.tracking,
      source: "custom" as const,
    })),
  ];
  return new Map(entries.sort((a, b) => a.id.localeCompare(b.id)).map((item) => [item.id, item]));
}

function resolveExercise(
  exerciseId: unknown,
  metadata: ReadonlyMap<string, CanonicalExerciseMetadata>,
): ResolvedExercise | null {
  if (typeof exerciseId !== "string" || !exerciseId.trim()) return null;
  const raw = exerciseId.trim();
  const canonical = metadata.get(raw) ?? null;
  if (canonical) {
    return {
      identity: {
        id: canonical.id,
        sourceExerciseId: raw,
        displayName: canonical.name,
        strategy: canonical.source === "catalog" ? "catalog_id" : "custom_id",
        confidence: "high",
      },
      metadata: canonical,
    };
  }
  const looksLikeName = /\s/.test(raw);
  const fallback = normalizedName(raw);
  return {
    identity: {
      id: looksLikeName ? `name:${fallback}` : `unverified:${raw}`,
      sourceExerciseId: raw,
      displayName: raw,
      strategy: looksLikeName ? "normalized_name" : "unverified_id",
      confidence: "low",
    },
    metadata: null,
  };
}

function workoutFingerprint(workout: Workout): string {
  const exercises = [...workout.exercises]
    .map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      completed: exercise.completed,
      sets: [...exercise.sets]
        .map((set) => ({
          id: set.id,
          completed: set.completed,
          modifier: set.modifier ?? "normal",
          reps: Number.isFinite(set.reps) ? set.reps : null,
          weight: Number.isFinite(set.weight) ? set.weight : null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id) || a.exerciseId.localeCompare(b.exerciseId));
  return JSON.stringify({
    id: workout.id,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt ?? null,
    templateId: workout.templateId ?? null,
    exercises,
  });
}

function completedWorkouts(
  state: AppState,
  range: DateRange,
  now: number,
): { workouts: Workout[]; excludedCount: number } {
  const eligible = state.workouts
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
    .map((workout) => ({ workout, fingerprint: workoutFingerprint(workout) }))
    .sort(
      (a, b) =>
        a.workout.endedAt! - b.workout.endedAt! ||
        a.workout.id.localeCompare(b.workout.id) ||
        a.fingerprint.localeCompare(b.fingerprint),
    );
  const byId = new Map<string, Workout>();
  for (const item of eligible)
    if (!byId.has(item.workout.id)) byId.set(item.workout.id, item.workout);
  const workouts = [...byId.values()].sort(
    (a, b) => a.endedAt! - b.endedAt! || a.id.localeCompare(b.id),
  );
  return { workouts, excludedCount: Math.max(0, state.workouts.length - workouts.length) };
}

function normalizedRepetitions(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= 0.000_001 ? nearest : null;
}

function isBodyweightOnly(metadata: CanonicalExerciseMetadata | null): boolean {
  return metadata?.tracking === "bodyweight" || metadata?.equipment === "bodyweight";
}

function estimatedOneRepMax(weight: number, repetitions: number, warmup: boolean): number | null {
  if (
    warmup ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isInteger(repetitions) ||
    repetitions <= 0 ||
    repetitions > MAX_ESTIMATED_1RM_REPETITIONS
  ) {
    return null;
  }
  return rounded(weight * (1 + repetitions / 30));
}

function validateSet(
  set: SetEntry,
  workoutId: string,
  workoutExerciseId: string,
  performedAt: number,
  metadata: CanonicalExerciseMetadata | null,
): { observation: ExerciseSetObservation | null; unsupportedRep: boolean } {
  if (!set.completed || typeof set.id !== "string" || !set.id.trim()) {
    return { observation: null, unsupportedRep: false };
  }
  const repetitions = normalizedRepetitions(set.reps);
  if (repetitions === null) return { observation: null, unsupportedRep: false };
  const bodyweightOnly = isBodyweightOnly(metadata);
  const weight = set.weight === undefined && bodyweightOnly ? 0 : set.weight;
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
    return { observation: null, unsupportedRep: false };
  }
  const unsupportedRep = repetitions > MAX_ESTIMATED_1RM_REPETITIONS;
  const warmup = set.modifier === "warmup";
  return {
    observation: {
      setId: set.id,
      workoutId,
      workoutExerciseId,
      performedAt,
      weight,
      repetitions,
      volume: calculateSetVolume(weight, repetitions),
      estimatedOneRepMax: bodyweightOnly ? null : estimatedOneRepMax(weight, repetitions, warmup),
      modifier: set.modifier,
    },
    unsupportedRep,
  };
}

function observations(
  workouts: readonly Workout[],
  metadata: ReadonlyMap<string, CanonicalExerciseMetadata>,
): { occurrences: ExerciseOccurrence[]; missingIdentityCount: number } {
  const result: ExerciseOccurrence[] = [];
  let missingIdentityCount = 0;
  for (const workout of workouts) {
    const exercises = [...workout.exercises].sort(
      (a, b) => a.id.localeCompare(b.id) || a.exerciseId.localeCompare(b.exerciseId),
    );
    for (const exercise of exercises) {
      const resolved = resolveExercise(exercise.exerciseId, metadata);
      if (!resolved) {
        missingIdentityCount += 1;
        continue;
      }
      const validSets: ExerciseSetObservation[] = [];
      let excludedSetCount = 0;
      let unsupportedRepCount = 0;
      const seenSetIds = new Set<string>();
      const sets = [...exercise.sets].sort((a, b) => {
        const idOrder = String(a.id).localeCompare(String(b.id));
        if (idOrder) return idOrder;
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
      });
      for (const set of sets) {
        if (seenSetIds.has(set.id)) {
          excludedSetCount += 1;
          continue;
        }
        seenSetIds.add(set.id);
        const checked = validateSet(
          set,
          workout.id,
          exercise.id,
          workout.endedAt!,
          resolved.metadata,
        );
        if (!checked.observation) excludedSetCount += 1;
        else validSets.push(checked.observation);
        if (checked.unsupportedRep) unsupportedRepCount += 1;
      }
      result.push({
        workout,
        exercise,
        completedAt: workout.endedAt!,
        resolved,
        validSets,
        excludedSetCount,
        unsupportedRepCount,
      });
    }
  }
  return { occurrences: result, missingIdentityCount };
}

function compareBestSets(a: ExerciseSetObservation, b: ExerciseSetObservation): number {
  return (
    (b.estimatedOneRepMax ?? -1) - (a.estimatedOneRepMax ?? -1) ||
    b.weight - a.weight ||
    b.repetitions - a.repetitions ||
    b.performedAt - a.performedAt ||
    a.workoutId.localeCompare(b.workoutId) ||
    a.setId.localeCompare(b.setId)
  );
}

function bestSet(sets: readonly ExerciseSetObservation[]): BestObservedSet | null {
  const best = [...sets].sort(compareBestSets)[0];
  return best
    ? {
        ...best,
        selectionBasis:
          best.estimatedOneRepMax === null ? "observed_weight_repetitions" : "estimated_1rm",
        unit: "unknown",
      }
    : null;
}

function sessionTrendPoints(sets: readonly ExerciseSetObservation[]): StrengthTrendPoint[] {
  const byWorkout = new Map<string, ExerciseSetObservation[]>();
  for (const set of sets) {
    if (set.estimatedOneRepMax === null) continue;
    const existing = byWorkout.get(set.workoutId) ?? [];
    existing.push(set);
    byWorkout.set(set.workoutId, existing);
  }
  return [...byWorkout.entries()]
    .map(([workoutId, sessionSets]) => {
      const best = [...sessionSets].sort(compareBestSets)[0];
      return {
        workoutId,
        timestamp: best.performedAt,
        estimatedOneRepMax: best.estimatedOneRepMax!,
        sourceSetId: best.setId,
      };
    })
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp ||
        a.workoutId.localeCompare(b.workoutId) ||
        a.sourceSetId.localeCompare(b.sourceSetId),
    );
}

function prEvents(exerciseId: string, sets: readonly ExerciseSetObservation[]): ExercisePrEvent[] {
  const byWorkout = new Map<string, ExerciseSetObservation[]>();
  for (const set of sets) {
    const existing = byWorkout.get(set.workoutId) ?? [];
    existing.push(set);
    byWorkout.set(set.workoutId, existing);
  }
  const sessions = [...byWorkout.entries()]
    .map(([workoutId, sessionSets]) => ({
      workoutId,
      timestamp: Math.min(...sessionSets.map((set) => set.performedAt)),
      sets: [...sessionSets].sort(compareBestSets),
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.workoutId.localeCompare(b.workoutId));
  if (!sessions.length) return [];
  const events: ExercisePrEvent[] = [];
  let highestWeight: ExerciseSetObservation | null = null;
  let highestE1rm: ExerciseSetObservation | null = null;
  const repetitionsByWeight = new Map<number, ExerciseSetObservation>();
  for (const [sessionIndex, session] of sessions.entries()) {
    const strongest = session.sets[0];
    const weightCandidate = [...session.sets].sort(
      (a, b) =>
        b.weight - a.weight || b.repetitions - a.repetitions || a.setId.localeCompare(b.setId),
    )[0];
    const e1rmCandidate = session.sets.find((set) => set.estimatedOneRepMax !== null) ?? null;
    if (sessionIndex === 0) {
      events.push({
        id: `training.exercise.${exerciseId}.pr.initial.${strongest.workoutId}.${strongest.setId}`,
        type: "initial_benchmark",
        current: strongest,
        previous: null,
        improvement: null,
        unit: "unknown",
        timestamp: strongest.performedAt,
        sourceIds: uniqueSorted([strongest.workoutId, strongest.setId]),
        confidence: "low",
        reason: {
          code: "initial_benchmark",
          message: "This is the first valid recorded benchmark, not an improvement claim.",
        },
      });
    } else if (highestWeight && weightCandidate.weight > highestWeight.weight) {
      events.push({
        id: `training.exercise.${exerciseId}.pr.weight.${weightCandidate.workoutId}.${weightCandidate.setId}`,
        type: "highest_observed_weight",
        current: weightCandidate,
        previous: highestWeight,
        improvement: rounded(weightCandidate.weight - highestWeight.weight),
        unit: "unknown",
        timestamp: weightCandidate.performedAt,
        sourceIds: uniqueSorted([
          weightCandidate.workoutId,
          weightCandidate.setId,
          highestWeight.workoutId,
          highestWeight.setId,
        ]),
        confidence: "medium",
        reason: {
          code: "sufficient_samples",
          message: "Observed weight exceeded a prior comparable recorded set.",
        },
      });
    }
    if (e1rmCandidate?.estimatedOneRepMax !== null && e1rmCandidate) {
      if (
        highestE1rm &&
        e1rmCandidate.estimatedOneRepMax! > highestE1rm.estimatedOneRepMax! + 0.000_001
      ) {
        events.push({
          id: `training.exercise.${exerciseId}.pr.e1rm.${e1rmCandidate.workoutId}.${e1rmCandidate.setId}`,
          type: "highest_estimated_1rm",
          current: e1rmCandidate,
          previous: highestE1rm,
          improvement: rounded(e1rmCandidate.estimatedOneRepMax! - highestE1rm.estimatedOneRepMax!),
          unit: "unknown",
          timestamp: e1rmCandidate.performedAt,
          sourceIds: uniqueSorted([
            e1rmCandidate.workoutId,
            e1rmCandidate.setId,
            highestE1rm.workoutId,
            highestE1rm.setId,
          ]),
          confidence: "medium",
          reason: {
            code: "sufficient_samples",
            message: "Estimated 1RM exceeded a prior eligible recorded set using the same formula.",
          },
        });
      }
      if (!highestE1rm || e1rmCandidate.estimatedOneRepMax! > highestE1rm.estimatedOneRepMax!) {
        highestE1rm = e1rmCandidate;
      }
    }
    const bestAtWeight = new Map<number, ExerciseSetObservation>();
    for (const candidate of session.sets) {
      const sessionBest = bestAtWeight.get(candidate.weight);
      if (!sessionBest || candidate.repetitions > sessionBest.repetitions) {
        bestAtWeight.set(candidate.weight, candidate);
      }
    }
    for (const candidate of [...bestAtWeight.values()].sort(
      (a, b) => a.weight - b.weight || a.setId.localeCompare(b.setId),
    )) {
      const previousAtWeight = repetitionsByWeight.get(candidate.weight);
      if (previousAtWeight && candidate.repetitions > previousAtWeight.repetitions) {
        events.push({
          id: `training.exercise.${exerciseId}.pr.reps.${candidate.workoutId}.${candidate.setId}`,
          type: "highest_repetitions_at_weight",
          current: candidate,
          previous: previousAtWeight,
          improvement: candidate.repetitions - previousAtWeight.repetitions,
          unit: "count",
          timestamp: candidate.performedAt,
          sourceIds: uniqueSorted([
            candidate.workoutId,
            candidate.setId,
            previousAtWeight.workoutId,
            previousAtWeight.setId,
          ]),
          confidence: "medium",
          reason: {
            code: "sufficient_samples",
            message: "Repetitions exceeded a prior-workout valid set at the same observed weight.",
          },
        });
      }
      if (!previousAtWeight || candidate.repetitions > previousAtWeight.repetitions) {
        repetitionsByWeight.set(candidate.weight, candidate);
      }
    }
    if (!highestWeight || weightCandidate.weight > highestWeight.weight)
      highestWeight = weightCandidate;
  }
  const unique = new Map(events.map((event) => [event.id, event]));
  return [...unique.values()].sort(
    (a, b) => a.timestamp - b.timestamp || a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
  );
}

function staleAt(lastAt: number | null, now: number, staleAfterDays: number): boolean {
  return lastAt !== null && calendarDayDifference(now, lastAt) > staleAfterDays;
}

function exerciseHistory(
  exerciseOccurrences: readonly ExerciseOccurrence[],
  range: DateRange,
  now: number,
  historyDays: number,
  staleAfterDays: number,
): ExerciseHistoryAnalytics {
  const first = exerciseOccurrences[0];
  const identity = first.resolved.identity;
  const validSets = exerciseOccurrences.flatMap((item) => item.validSets);
  const performanceDates = [...new Set(exerciseOccurrences.map((item) => item.completedAt))].sort(
    (a, b) => a - b,
  );
  const workoutIds = uniqueSorted(exerciseOccurrences.map((item) => item.workout.id));
  const workoutExerciseIds = uniqueSorted(exerciseOccurrences.map((item) => item.exercise.id));
  const setIds = uniqueSorted(validSets.map((item) => item.setId));
  const distinctDays = new Set(performanceDates.map(dayKey)).size;
  const excludedSetCount = safeSum(exerciseOccurrences.map((item) => item.excludedSetCount));
  const unsupportedRepCount = safeSum(exerciseOccurrences.map((item) => item.unsupportedRepCount));
  const lastPerformedAt = performanceDates.at(-1) ?? null;
  const stale = staleAt(lastPerformedAt, now, staleAfterDays);
  const reasons: MetricReason[] = [];
  if (identity.confidence !== "high") {
    reasons.push({
      code: "missing_exercise_metadata",
      message: "Exercise identity uses an unverified ID or normalized-name fallback.",
    });
  }
  if (!first.resolved.metadata) {
    reasons.push({
      code: "missing_muscle_metadata",
      message: "No canonical muscle metadata is attached to this exercise identity.",
    });
  }
  if (!validSets.length) {
    reasons.push({ code: "no_valid_sets", message: "No valid completed sets were available." });
  }
  if (excludedSetCount > 0) {
    reasons.push({
      code: "invalid_set_values_excluded",
      message: "Incomplete, malformed, or duplicate sets were excluded.",
      count: excludedSetCount,
    });
  }
  if (unsupportedRepCount > 0) {
    reasons.push({
      code: "unsupported_rep_range",
      message: `Sets above ${MAX_ESTIMATED_1RM_REPETITIONS} repetitions were excluded from estimated 1RM.`,
      count: unsupportedRepCount,
    });
  }
  if (performanceDates.length < STRENGTH_TREND_MINIMUM_SESSIONS) {
    reasons.push({
      code: "insufficient_exercise_history",
      message: `Strength trend requires ${STRENGTH_TREND_MINIMUM_SESSIONS} comparable completed workouts.`,
    });
  }
  if (stale) {
    reasons.push({
      code: "stale_exercise_history",
      message: `The exercise has not been performed within ${staleAfterDays} calendar days.`,
    });
  }
  const confidenceDetails = calculateConfidence({
    levelHint:
      identity.confidence === "low"
        ? "low"
        : workoutIds.length >= 4
          ? "high"
          : workoutIds.length >= 2
            ? "medium"
            : workoutIds.length
              ? "low"
              : "none",
    validRecordCount: validSets.length,
    minimumSampleSize: 2,
    coverageDayCount: distinctDays,
    expectedDayCount: null,
    comparisonPeriodValid: null,
    targetValid: null,
    partialPeriod: false,
    stale,
    excludedRecordCount: excludedSetCount,
    additionalReasons: reasons,
  });
  const trendPoints = sessionTrendPoints(validSets);
  const firstTrend = trendPoints[0]?.estimatedOneRepMax ?? null;
  const latestTrend = trendPoints.at(-1)?.estimatedOneRepMax ?? null;
  const strengthChangePercent =
    firstTrend === null || latestTrend === null
      ? null
      : rounded(safePercentChange(latestTrend, firstTrend) ?? 0);
  const stableThreshold =
    firstTrend === null ? 0 : firstTrend * (STRENGTH_STABLE_CHANGE_PERCENT / 100);
  const trendQuality = calculateTrendQuality({
    values: trendPoints.map((item) => ({
      timestamp: item.timestamp,
      value: item.estimatedOneRepMax,
    })),
    minimumSampleSize: STRENGTH_TREND_MINIMUM_SESSIONS,
    expectedDayCount: null,
    stableThreshold,
    higherIsBetter: true,
    stale,
  });
  const trendStatus: AnalyticsStatus = trendQuality.hasEnoughData ? "ready" : "needs_more_data";
  const trendReason = trendQuality.hasEnoughData
    ? null
    : `At least ${STRENGTH_TREND_MINIMUM_SESSIONS} eligible completed workouts are required.`;
  const e1rmSets = validSets.filter((item) => item.estimatedOneRepMax !== null);
  const bestE1rmSet = [...e1rmSets].sort(compareBestSets)[0] ?? null;
  const e1rmReason = bestE1rmSet
    ? null
    : unsupportedRepCount > 0
      ? `No set was eligible within the supported 1-${MAX_ESTIMATED_1RM_REPETITIONS} repetition range.`
      : "No valid positive-weight working set was eligible for estimated 1RM.";
  const estimatedOneRepMaxMetric = createAnalyticsMetric({
    id: TRAINING_DETAIL_METRIC_IDS.exerciseEstimatedOneRepMax(identity.id),
    label: `${identity.displayName} estimated 1RM`,
    domain: "training",
    kind: "point_in_time",
    unit: "unknown",
    value: bestE1rmSet?.estimatedOneRepMax ?? null,
    status: bestE1rmSet ? "ready" : "unavailable",
    dateRange: range,
    sampleSize: e1rmSets.length,
    minimumSampleSize: 1,
    reason: e1rmReason,
    reasons: bestE1rmSet
      ? []
      : [
          {
            code:
              unsupportedRepCount > 0 ? "unsupported_rep_range" : "insufficient_comparable_sets",
            message: e1rmReason!,
          },
        ],
    entryIds: uniqueSorted(e1rmSets.flatMap((item) => [item.workoutId, item.setId])),
    entryTimestamps: e1rmSets.map((item) => item.performedAt),
    collection: "workouts",
    excludedRecordCount: excludedSetCount,
    expectedDayCount: null,
    stale,
    calculationId: "training.exercise.estimated_1rm.epley.v1",
    notes: [
      "Formula: Epley weight * (1 + repetitions / 30).",
      `Eligible repetition range: 1-${MAX_ESTIMATED_1RM_REPETITIONS}.`,
      "Warmup and bodyweight-only sets are ineligible.",
      "Stored weight unit is unknown.",
    ],
  });
  const strengthTrendMetric = createAnalyticsMetric({
    id: TRAINING_DETAIL_METRIC_IDS.exerciseStrengthTrend(identity.id),
    label: `${identity.displayName} strength trend`,
    domain: "training",
    kind: "time_series",
    unit: "unknown",
    value: trendPoints,
    status: trendStatus,
    confidence:
      stale || trendQuality.codes.includes("uneven_spacing")
        ? "low"
        : trendPoints.length >= 5
          ? "high"
          : trendPoints.length >= STRENGTH_TREND_MINIMUM_SESSIONS
            ? "medium"
            : trendPoints.length
              ? "low"
              : "none",
    confidenceReasons: trendQuality.reasons,
    dateRange: range,
    sampleSize: trendPoints.length,
    minimumSampleSize: STRENGTH_TREND_MINIMUM_SESSIONS,
    reason: trendReason,
    reasons: trendQuality.reasons,
    entryIds: uniqueSorted(trendPoints.flatMap((item) => [item.workoutId, item.sourceSetId])),
    entryTimestamps: trendPoints.map((item) => item.timestamp),
    collection: "workouts",
    excludedRecordCount: excludedSetCount,
    expectedDayCount: null,
    stale,
    trendQuality,
    calculationId: "training.exercise.session_best_epley_trend.v1",
  });
  return {
    identity,
    status: validSets.length ? "ready" : "needs_more_data",
    confidence: confidenceDetails.level,
    confidenceDetails,
    reasons: sortedReasons([...reasons, ...confidenceDetails.reasons]),
    requestedDateRange: range,
    effectiveDateRange:
      performanceDates.length > 0
        ? { start: performanceDates[0], end: performanceDates.at(-1)! + 1 }
        : null,
    completedWorkoutAppearances: workoutIds.length,
    distinctPerformanceDays: distinctDays,
    averageSessionsPerWeek: rounded(safeRatio(workoutIds.length, Math.max(1, historyDays / 7))),
    daysSinceLastPerformed:
      lastPerformedAt === null ? null : Math.max(0, calendarDayDifference(now, lastPerformedAt)),
    stale,
    validSetCount: validSets.length,
    excludedSetCount,
    totalRepetitions: safeSum(validSets.map((item) => item.repetitions)),
    totalVolume: safeSum(validSets.map((item) => item.volume)),
    weightUnit: "unknown",
    volumeUnit: "unknown",
    firstPerformedAt: performanceDates[0] ?? null,
    lastPerformedAt,
    performanceDates,
    sourceWorkoutIds: workoutIds,
    sourceWorkoutExerciseIds: workoutExerciseIds,
    sourceSetIds: setIds,
    primaryMuscleGroups: first.resolved.metadata?.primary ?? [],
    secondaryMuscleGroups: first.resolved.metadata?.secondary ?? [],
    muscleMetadataAvailable: first.resolved.metadata !== null,
    bestObservedSet: bestSet(validSets),
    personalRecordEvents: prEvents(identity.id, validSets),
    estimatedOneRepMax: estimatedOneRepMaxMetric,
    strengthTrend: strengthTrendMetric,
    strengthChangePercent,
  };
}

function directRecoveryReadiness(
  state: AppState,
  muscle: string,
  workoutIds: readonly string[],
  now: number,
): MuscleRecoveryReadiness {
  const matching = state.recoverySignals
    .filter(
      (signal) =>
        typeof signal.bodyArea === "string" &&
        normalizedName(signal.bodyArea) === normalizedName(muscle) &&
        finiteTimestamp(signal.createdAt) &&
        signal.createdAt <= now,
    )
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const latest = matching.at(-1) ?? null;
  const stale = latest ? calendarDayDifference(now, latest.createdAt) > 7 : false;
  const loadReady = uniqueSorted(workoutIds).length >= 2;
  const recoveryReady = latest !== null && !stale;
  const reasons: MetricReason[] = [];
  if (!loadReady) {
    reasons.push({
      code: "insufficient_load_history",
      message:
        "At least two completed load sessions are required for future risk-signal readiness.",
    });
  }
  if (!latest) {
    reasons.push({
      code: "missing_body_area_soreness_mapping",
      message: "No recovery signal is explicitly mapped to this muscle group.",
    });
  } else if (stale) {
    reasons.push({
      code: "stale_recovery_data",
      message: "The latest explicitly mapped recovery signal is older than seven days.",
    });
  }
  return {
    status: loadReady && recoveryReady ? "ready" : "needs_more_data",
    loadHistoryAvailable: loadReady,
    bodyAreaRecoveryDataAvailable: recoveryReady,
    latestRecoverySignalAt: latest?.createdAt ?? null,
    reasons: sortedReasons(reasons),
    sourceIds: uniqueSorted(matching.map((item) => item.id)),
    medicalConclusion: null,
  };
}

function muscleAnalytics(
  occurrences: readonly ExerciseOccurrence[],
  state: AppState,
  currentRange: DateRange,
  previousRange: DateRange,
  now: number,
): MuscleGroupAnalyticsResult {
  const mapped = occurrences.filter((item) => item.resolved.metadata !== null);
  const totalAppearances = occurrences.length;
  const coveragePercent = clampPercent(safeRatio(mapped.length, totalAppearances) * 100);
  const bucket = new Map<
    string,
    {
      current: ExerciseSetObservation[];
      previous: ExerciseSetObservation[];
      exerciseIds: string[];
    }
  >();
  for (const occurrence of mapped) {
    const metadata = occurrence.resolved.metadata!;
    const allocation = new Map<string, number>();
    for (const muscle of metadata.primary) allocation.set(muscle, 1);
    for (const muscle of metadata.secondary) {
      if (!allocation.has(muscle)) allocation.set(muscle, SECONDARY_MUSCLE_VOLUME_FACTOR);
    }
    for (const [muscle, factor] of allocation) {
      const target = bucket.get(muscle) ?? { current: [], previous: [], exerciseIds: [] };
      const allocated = occurrence.validSets.map((set) => ({
        ...set,
        volume: rounded(set.volume * factor),
      }));
      if (dateRangeContains(currentRange, occurrence.completedAt))
        target.current.push(...allocated);
      if (dateRangeContains(previousRange, occurrence.completedAt))
        target.previous.push(...allocated);
      target.exerciseIds.push(occurrence.resolved.identity.id);
      bucket.set(muscle, target);
    }
  }
  const partial = totalAppearances > 0 && mapped.length < totalAppearances;
  const groups: MuscleGroupAnalytics[] = [...bucket.entries()]
    .map(([muscle, values]) => {
      const currentVolume = safeSum(values.current.map((item) => item.volume));
      const previousVolume = safeSum(values.previous.map((item) => item.volume));
      const change = safePercentChange(currentVolume, previousVolume);
      const currentWorkoutIds = uniqueSorted(values.current.map((item) => item.workoutId));
      const currentDays = new Set(values.current.map((item) => dayKey(item.performedAt))).size;
      const lastAt = values.current.length
        ? Math.max(...values.current.map((item) => item.performedAt))
        : null;
      const zeroBaseline = previousVolume === 0;
      const trendQuality = calculateTrendQuality({
        values: [
          { timestamp: previousRange.start, value: previousVolume },
          { timestamp: currentRange.start, value: currentVolume },
        ],
        minimumSampleSize: 2,
        expectedDayCount: null,
        comparisonComplete: values.previous.length > 0,
        zeroBaseline,
        stableThreshold: Math.max(1, previousVolume * 0.01),
        higherIsBetter: null,
      });
      const reasons: MetricReason[] = [];
      if (partial) {
        reasons.push({
          code: "partial_muscle_coverage",
          message: "Some exercise appearances lack canonical muscle metadata.",
        });
      }
      if (!values.previous.length) {
        reasons.push({
          code: zeroBaseline ? "zero_comparison_baseline" : "missing_comparison_period",
          message:
            "Previous-period muscle volume is unavailable or zero; percent change is undefined.",
        });
      }
      const confidenceDetails = calculateConfidence({
        levelHint: partial
          ? "medium"
          : currentWorkoutIds.length >= 4
            ? "high"
            : currentWorkoutIds.length >= 2
              ? "medium"
              : currentWorkoutIds.length
                ? "low"
                : "none",
        validRecordCount: values.current.length,
        minimumSampleSize: 2,
        coverageDayCount: currentDays,
        expectedDayCount: null,
        comparisonPeriodValid: null,
        targetValid: null,
        partialPeriod: false,
        stale: false,
        excludedRecordCount: partial ? totalAppearances - mapped.length : 0,
        additionalReasons: reasons,
      });
      return {
        id: muscle,
        status: (values.current.length ? "ready" : "needs_more_data") as AnalyticsStatus,
        confidence: confidenceDetails.level,
        confidenceDetails,
        reasons: sortedReasons([...reasons, ...trendQuality.reasons, ...confidenceDetails.reasons]),
        currentPeriodVolume: currentVolume,
        previousPeriodVolume: previousVolume,
        volumeChangePercent: change === null ? null : rounded(change),
        volumeUnit: "unknown" as const,
        validSetCount: values.current.length,
        completedWorkoutCount: currentWorkoutIds.length,
        distinctTrainingDays: currentDays,
        lastTrainedAt: lastAt,
        daysSinceLastTrained:
          lastAt === null ? null : Math.max(0, calendarDayDifference(now, lastAt)),
        sourceExerciseIds: uniqueSorted(values.exerciseIds),
        sourceWorkoutIds: currentWorkoutIds,
        sourceSetIds: uniqueSorted(values.current.map((item) => item.setId)),
        allocation: "primary_full_secondary_0.4" as const,
        trendQuality,
        recoveryRiskReadiness: directRecoveryReadiness(state, muscle, currentWorkoutIds, now),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const observed = groups.filter((item) => item.validSetCount > 0);
  const most = [...observed]
    .sort(
      (a, b) =>
        b.currentPeriodVolume - a.currentPeriodVolume ||
        b.validSetCount - a.validSetCount ||
        a.id.localeCompare(b.id),
    )
    .map((item) => item.id);
  const least = [...observed]
    .sort(
      (a, b) =>
        a.currentPeriodVolume - b.currentPeriodVolume ||
        a.validSetCount - b.validSetCount ||
        a.id.localeCompare(b.id),
    )
    .map((item) => item.id);
  const canonical = uniqueSorted(
    EXERCISES.flatMap((exercise) => [...exercise.primary, ...(exercise.secondary ?? [])]),
  );
  const observedIds = new Set(observed.map((item) => item.id));
  const reasons: MetricReason[] = [];
  if (!mapped.length) {
    reasons.push({
      code: "missing_muscle_metadata",
      message: "No observed exercise has canonical muscle metadata.",
    });
  } else if (partial) {
    reasons.push({
      code: "partial_muscle_coverage",
      message: "Muscle analytics omit exercise appearances without canonical metadata.",
      count: totalAppearances - mapped.length,
    });
  }
  return {
    status: mapped.length ? "ready" : "unavailable",
    metadataCoveragePercent: rounded(coveragePercent),
    mappedExerciseAppearanceCount: mapped.length,
    totalExerciseAppearanceCount: totalAppearances,
    reasons: sortedReasons(reasons),
    groups,
    mostTrainedObserved: most,
    leastTrainedObserved: least,
    unobservedCanonicalGroups: canonical.filter((muscle) => !observedIds.has(muscle)),
  };
}

function unavailableBalance(code: MetricReasonCode, message: string): TrainingBalanceDimension {
  return {
    status: "unavailable",
    basis: null,
    unit: "none",
    distribution: [],
    coveragePercent: 0,
    confidence: "none",
    tolerancePercent: BALANCE_TOLERANCE_PERCENT,
    interpretation: null,
    reasons: [{ code, message }],
    sourceWorkoutIds: [],
  };
}

function templateBalance(
  occurrences: readonly ExerciseOccurrence[],
  categories: readonly string[],
): TrainingBalanceDimension {
  const byWorkout = new Map<
    string,
    { templateId: string | undefined; sets: ExerciseSetObservation[] }
  >();
  for (const occurrence of occurrences) {
    const existing = byWorkout.get(occurrence.workout.id) ?? {
      templateId: occurrence.workout.templateId,
      sets: [],
    };
    existing.sets.push(...occurrence.validSets);
    byWorkout.set(occurrence.workout.id, existing);
  }
  const totals = new Map(categories.map((category) => [category, { volume: 0, sets: 0 }]));
  let totalSets = 0;
  let classifiedSets = 0;
  const sourceWorkoutIds: string[] = [];
  for (const [workoutId, workout] of [...byWorkout.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    totalSets += workout.sets.length;
    if (!workout.templateId || !totals.has(workout.templateId)) continue;
    const target = totals.get(workout.templateId)!;
    target.volume += safeSum(workout.sets.map((item) => item.volume));
    target.sets += workout.sets.length;
    classifiedSets += workout.sets.length;
    sourceWorkoutIds.push(workoutId);
  }
  if (!classifiedSets) {
    return unavailableBalance(
      "missing_movement_classification",
      `No completed workout uses an explicit ${categories.join("/")} canonical template classification.`,
    );
  }
  const totalVolume = safeSum([...totals.values()].map((item) => item.volume));
  const basis = totalVolume > 0 ? "volume" : "valid_sets";
  const denominator =
    basis === "volume" ? totalVolume : safeSum([...totals.values()].map((item) => item.sets));
  const distribution = categories.map((category) => {
    const item = totals.get(category)!;
    const value = basis === "volume" ? item.volume : item.sets;
    return {
      id: category,
      value,
      percent: rounded(clampPercent(safeRatio(value, denominator) * 100)),
    };
  });
  const shares = distribution.map((item) => item.percent);
  const uneven = Math.max(...shares) - Math.min(...shares) > BALANCE_TOLERANCE_PERCENT;
  const coverage = clampPercent(safeRatio(classifiedSets, totalSets) * 100);
  const partial = coverage < 100;
  return {
    status: "ready",
    basis,
    unit: basis === "volume" ? "unknown" : "count",
    distribution,
    coveragePercent: rounded(coverage),
    confidence: partial ? "low" : sourceWorkoutIds.length >= 3 ? "medium" : "low",
    tolerancePercent: BALANCE_TOLERANCE_PERCENT,
    interpretation: uneven ? "uneven_distribution" : "balanced_within_tolerance",
    reasons: sortedReasons([
      {
        code: "explicit_classification",
        message: "Distribution uses explicit canonical workout template IDs.",
      },
      {
        code: uneven ? "uneven_distribution" : "balanced_distribution",
        message: uneven
          ? `Distribution exceeds the ${BALANCE_TOLERANCE_PERCENT}% analytical tolerance.`
          : `Distribution is within the ${BALANCE_TOLERANCE_PERCENT}% analytical tolerance.`,
      },
      ...(partial
        ? [
            {
              code: "missing_movement_classification" as const,
              message:
                "Some valid sets belong to workouts without a supported explicit classification.",
            },
          ]
        : []),
    ]),
    sourceWorkoutIds: uniqueSorted(sourceWorkoutIds),
  };
}

function rankings(exercises: readonly ExerciseHistoryAnalytics[]): {
  improving: ExerciseRanking<"improving">;
  stalled: ExerciseRanking<"stalled">;
} {
  const improving = exercises
    .filter(
      (exercise) =>
        exercise.strengthTrend.status === "ready" &&
        (exercise.confidence === "medium" || exercise.confidence === "high") &&
        exercise.strengthTrend.trendQuality?.codes.includes("improving") &&
        !exercise.strengthTrend.trendQuality.codes.includes("uneven_spacing") &&
        (exercise.strengthChangePercent ?? 0) > STRENGTH_STABLE_CHANGE_PERCENT,
    )
    .sort(
      (a, b) =>
        (b.strengthChangePercent ?? 0) - (a.strengthChangePercent ?? 0) ||
        (b.confidenceDetails.score ?? 0) - (a.confidenceDetails.score ?? 0) ||
        a.identity.id.localeCompare(b.identity.id),
    )
    .map((exercise) => exercise.identity.id);
  const stalled = exercises
    .filter(
      (exercise) =>
        exercise.strengthTrend.sampleSize >= STALLED_MINIMUM_SESSIONS &&
        exercise.strengthTrend.status === "ready" &&
        exercise.strengthTrend.trendQuality?.direction === "stable" &&
        !exercise.strengthTrend.trendQuality.codes.includes("uneven_spacing") &&
        !exercise.stale &&
        Math.abs(exercise.strengthChangePercent ?? Infinity) <= STALLED_CHANGE_TOLERANCE_PERCENT,
    )
    .sort((a, b) => a.identity.id.localeCompare(b.identity.id))
    .map((exercise) => exercise.identity.id);
  return {
    improving: {
      classification: "improving",
      status: improving.length ? "ready" : "needs_more_data",
      exerciseIds: improving,
      reasons: improving.length
        ? []
        : [
            {
              code: "insufficient_exercise_history",
              message: "No exercise has a positive, sufficiently supported comparable trend.",
            },
          ],
    },
    stalled: {
      classification: "stalled",
      status: stalled.length ? "ready" : "needs_more_data",
      exerciseIds: stalled,
      reasons: stalled.length
        ? []
        : [
            {
              code: "insufficient_exercise_history",
              message: `Stalled classification requires ${STALLED_MINIMUM_SESSIONS} recent, regular comparable sessions within a ${STALLED_CHANGE_TOLERANCE_PERCENT}% tolerance.`,
            },
          ],
    },
  };
}

export function getExerciseAndMuscleAnalytics(
  state: AppState,
  options: TrainingDetailOptions = {},
): ExerciseAndMuscleAnalytics {
  const now = finiteTimestamp(options.now) ? options.now : Date.now();
  const historyDays = Math.max(1, Math.trunc(options.historyDays ?? 90));
  const comparisonDays = Math.max(1, Math.trunc(options.comparisonDays ?? 30));
  const staleAfterDays = Math.max(
    1,
    Math.trunc(options.staleAfterDays ?? EXERCISE_STALE_AFTER_DAYS),
  );
  const historyRange = calendarDaysWindow(historyDays, now);
  const currentRange = calendarDaysWindow(comparisonDays, now);
  const previousRange = calendarDaysWindow(comparisonDays, now, comparisonDays);
  const metadata = metadataMap(state);
  const completed = completedWorkouts(state, historyRange, now);
  const collected = observations(completed.workouts, metadata);
  const grouped = new Map<string, ExerciseOccurrence[]>();
  for (const occurrence of collected.occurrences) {
    const existing = grouped.get(occurrence.resolved.identity.id) ?? [];
    existing.push(occurrence);
    grouped.set(occurrence.resolved.identity.id, existing);
  }
  const exercises = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, items]) => exerciseHistory(items, historyRange, now, historyDays, staleAfterDays));
  const muscleGroups = muscleAnalytics(
    collected.occurrences,
    state,
    currentRange,
    previousRange,
    now,
  );
  const ranked = rankings(exercises);
  const validSets = collected.occurrences.flatMap((item) => item.validSets);
  const workoutIds = uniqueSorted(completed.workouts.map((workout) => workout.id));
  const timestamps = completed.workouts.map((workout) => workout.endedAt!);
  const reasons: MetricReason[] = [];
  if (!completed.workouts.length) {
    reasons.push({
      code: "no_completed_workouts",
      message: "No completed workout exists in the requested history range.",
    });
  }
  if (completed.workouts.length && !validSets.length) {
    reasons.push({ code: "no_valid_sets", message: "Completed workouts contain no valid sets." });
  }
  if (collected.missingIdentityCount > 0) {
    reasons.push({
      code: "missing_exercise_identity",
      message: "Workout exercises without a usable identity were excluded.",
      count: collected.missingIdentityCount,
    });
  }
  const sourceMetric = createAnalyticsMetric({
    id: TRAINING_DETAIL_METRIC_IDS.source,
    label: "Training detail source",
    domain: "training",
    kind: "aggregate",
    unit: "count",
    value: validSets.length,
    status: validSets.length ? "ready" : "needs_more_data",
    dateRange: historyRange,
    sampleSize: validSets.length,
    minimumSampleSize: 1,
    reason: reasons[0]?.message ?? null,
    reasons,
    entryIds: uniqueSorted([...workoutIds, ...validSets.map((item) => item.setId)]),
    entryTimestamps: timestamps,
    includedRecordCount: validSets.length,
    collection: "workouts",
    excludedRecordCount:
      completed.excludedCount +
      collected.missingIdentityCount +
      safeSum(collected.occurrences.map((item) => item.excludedSetCount)),
    exclusions: [
      {
        code: "invalid_value",
        count:
          collected.missingIdentityCount +
          safeSum(collected.occurrences.map((item) => item.excludedSetCount)),
      },
      { code: "outside_range", count: completed.excludedCount },
    ],
    expectedDayCount: null,
    calculationId: "training.detail.completed_workouts_valid_sets.v1",
  });
  const latest = timestamps.length ? Math.max(...timestamps) : null;
  const allTime = allTimeWindow(now);
  return {
    exercises,
    topImprovingExercises: ranked.improving,
    stalledExercises: ranked.stalled,
    muscleGroups,
    trainingBalance: {
      pushPullLegs: templateBalance(collected.occurrences, ["push", "pull", "legs"]),
      upperLower: templateBalance(collected.occurrences, ["upper", "lower"]),
      anteriorPosterior: unavailableBalance(
        "missing_movement_classification",
        "The current exercise and workout schemas do not provide anterior/posterior classification.",
      ),
      leftRight: unavailableBalance(
        "missing_side_metadata",
        "Sets do not store an explicit side; unilateral or bilateral tags alone cannot establish left/right balance.",
      ),
    },
    availability: {
      status: validSets.length
        ? "ready"
        : completed.workouts.length
          ? "needs_more_data"
          : "unavailable",
      sampleSize: validSets.length,
      reason: reasons[0]?.message ?? null,
      lastLoggedAt: latest,
    },
    sourceMetadata: {
      ...sourceMetric.source,
      requestedDateRange: historyRange,
      effectiveDateRange:
        timestamps.length > 0
          ? { start: Math.min(...timestamps), end: Math.max(...timestamps) + 1 }
          : null,
      notes: uniqueSorted([
        ...sourceMetric.source.notes,
        `Available all-time boundary ends at ${allTime.end}.`,
        "Only workouts with a finite completion timestamp are included.",
        "Stored weight and volume units are unknown.",
      ]),
    },
  };
}

export type { MuscleGroup };
