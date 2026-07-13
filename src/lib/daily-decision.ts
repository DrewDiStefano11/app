import { exerciseById } from "./data";
import { dayKey as dateKey, startOfDay } from "./analytics/date-time";
import type {
  AppState,
  ConfirmationStatus,
  DataProvenance,
  MealEntry,
  ProvenanceConfidence,
  Workout,
} from "./types";

export type DecisionType =
  | "train_hard"
  | "train_normal"
  | "train_light"
  | "deload"
  | "recover"
  | "insufficient_data";
export type DecisionConfidence = "high" | "medium" | "low" | "insufficient";
export type SignalConfidence = Exclude<DecisionConfidence, "insufficient">;

export interface DataUsed {
  area: "training" | "nutrition" | "recovery" | "progress" | "goals" | "active_workout";
  ids: string[];
  sourceSummary: string;
  confidence: SignalConfidence;
  confirmationStatus: ConfirmationStatus | "mixed";
}

export interface DataMissing {
  area: "training" | "nutrition" | "recovery" | "progress";
  whyItMatters: string;
  suggestedUserAction: string;
}

export interface TrainingDecision {
  recommendation: string;
  suggestedFocus: string;
  intensity: "hard" | "normal" | "light" | "deload" | "recovery" | "unknown";
  muscleGroupsToPrioritize: string[];
  muscleGroupsToLimit: string[];
  progressionAllowed: boolean;
  reason: string;
}

export interface NutritionDecision {
  recommendation: string;
  calorieTargetAdjustment: number;
  proteinGap: number | null;
  calorieGap: number | null;
  carbTimingSuggestion: string | null;
  underEatingWarning: boolean;
  reason: string;
}

export interface RecoveryDecision {
  recommendation: string;
  recoveryLimiters: string[];
  sorenessLevel: number | null;
  fatigueLevel: number | null;
  sleepSignal: "good" | "fair" | "poor" | "missing";
  reason: string;
}

export interface WhatChangedSignal {
  type:
    | "training_frequency"
    | "training_volume"
    | "performance"
    | "bodyweight"
    | "nutrition"
    | "recovery"
    | "consistency"
    | "data_confidence";
  label: string;
  currentValue: number | string;
  comparisonValue: number | string;
  comparisonWindow: string;
  direction: "increased" | "decreased" | "stable" | "changed";
  significance: "high" | "medium" | "low";
  confidence: SignalConfidence;
  explanation: string;
  dataUsed: DataUsed[];
}

export interface LimitingFactor {
  type:
    | "pain_or_injury_concern"
    | "soreness"
    | "fatigue"
    | "sleep"
    | "nutrition"
    | "training_load"
    | "missing_data";
  severity: "high" | "medium" | "low";
  confidence: SignalConfidence;
  explanation: string;
  dataUsed: DataUsed[];
}

export interface DataTrustSummary {
  confirmedInputsUsed: number;
  lowConfidenceInputs: number;
  unconfirmedAiInputsIgnoredOrSoftened: number;
  missingKeySignals: string[];
  overallDecisionConfidence: DecisionConfidence;
}

export interface DailyDecisionContext {
  generatedAt: number;
  date: string;
  todayMeals: MealEntry[];
  trustedTodayMeals: MealEntry[];
  ignoredNutritionIds: string[];
  activeWorkout: Workout | null;
  recentWorkouts: Workout[];
  previousWorkouts: Workout[];
  latestCheckIn: AppState["recoveryCheckIns"][number] | null;
  previousCheckIn: AppState["recoveryCheckIns"][number] | null;
  latestSleep: AppState["sleepEntries"][number] | null;
  recentRecoverySignals: AppState["recoverySignals"];
  caloriesToday: number;
  proteinToday: number;
  carbsToday: number;
  calorieTarget: number;
  proteinTarget: number;
  trainingVolume: number;
  previousTrainingVolume: number;
  muscleGroupsUsed: Record<string, number>;
  muscleGroupsToLimit: string[];
  painSeverity: number;
  underEating: boolean;
  dataUsed: DataUsed[];
  dataMissing: DataMissing[];
  warnings: string[];
  trust: DataTrustSummary;
}

export interface DailyDecision {
  id: string;
  generatedAt: number;
  date: string;
  decisionType: DecisionType;
  training: TrainingDecision;
  nutrition: NutritionDecision;
  recovery: RecoveryDecision;
  limitingFactors: LimitingFactor[];
  whatChanged: WhatChangedSignal[];
  confidence: DecisionConfidence;
  dataUsed: DataUsed[];
  dataMissing: DataMissing[];
  warnings: string[];
  oneAction: string;
  explanation: string;
}

const DAY = 86_400_000;

function provenanceOf(value: {
  provenance?: DataProvenance;
  source?: string;
  confidence?: string;
  confirmed?: boolean;
}): DataProvenance {
  if (value.provenance) return value.provenance;
  const aiSource = value.source === "camera" || value.source === "jarvis";
  return {
    source: aiSource ? "ai-estimated" : "manual",
    confidence:
      (value.confidence as ProvenanceConfidence | undefined) ?? (aiSource ? "unknown" : "high"),
    confirmation: value.confirmed === false ? "unconfirmed" : "confirmed",
  };
}

function isUnconfirmedAi(value: {
  provenance?: DataProvenance;
  source?: string;
  confidence?: string;
  confirmed?: boolean;
}): boolean {
  const provenance = provenanceOf(value);
  return provenance.source === "ai-estimated" && provenance.confirmation !== "confirmed";
}

function confidenceOf(
  values: {
    provenance?: DataProvenance;
    source?: string;
    confidence?: string;
    confirmed?: boolean;
  }[],
): SignalConfidence {
  if (!values.length) return "low";
  const provenances = values.map(provenanceOf);
  if (
    provenances.some(
      (item) =>
        item.confirmation === "unconfirmed" ||
        item.confidence === "low" ||
        item.confidence === "unknown",
    )
  )
    return "low";
  if (provenances.some((item) => item.confidence === "medium")) return "medium";
  return "high";
}

function used(
  area: DataUsed["area"],
  values: {
    id: string;
    provenance?: DataProvenance;
    source?: string;
    confidence?: string;
    confirmed?: boolean;
  }[],
  sourceSummary: string,
): DataUsed {
  const provenances = values.map(provenanceOf);
  const statuses = new Set(provenances.map((value) => value.confirmation));
  const sources = Object.entries(
    provenances.reduce<Record<string, number>>((counts, item) => {
      counts[item.source] = (counts[item.source] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([source, count]) => `${source}${count > 1 ? ` (${count})` : ""}`)
    .join(", ");
  return {
    area,
    ids: values.map((value) => value.id),
    sourceSummary: `${sourceSummary}. Sources: ${sources}.`,
    confidence: confidenceOf(values),
    confirmationStatus: statuses.size === 1 ? [...statuses][0] : "mixed",
  };
}

function workoutVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce((sum, set) => {
        if (!set.completed) return sum;
        if (set.weight && set.reps) return sum + set.weight * set.reps;
        return sum + (set.durationMin ?? set.reps ?? 0);
      }, 0),
    0,
  );
}

function muscleUse(workouts: Workout[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const workout of workouts) {
    for (const entry of workout.exercises) {
      const exercise = exerciseById(entry.exerciseId);
      const sets = entry.sets.filter((set) => set.completed).length;
      for (const muscle of [...(exercise?.primary ?? []), ...(exercise?.secondary ?? [])]) {
        result[muscle] = (result[muscle] ?? 0) + sets;
      }
    }
  }
  return result;
}

function bodyAreaMatchesMuscle(bodyArea: string | undefined, muscle: string): boolean {
  if (!bodyArea) return false;
  const area = bodyArea.toLowerCase();
  const aliases: Record<string, string[]> = {
    quads: ["leg", "knee", "quad"],
    hamstrings: ["leg", "hamstring"],
    glutes: ["leg", "hip", "glute"],
    calves: ["leg", "calf"],
    chest: ["chest", "pec"],
    back: ["back", "lat"],
    shoulders: ["shoulder", "delt"],
    biceps: ["arm", "bicep", "elbow"],
    triceps: ["arm", "tricep", "elbow"],
    core: ["core", "ab", "torso"],
  };
  return (aliases[muscle] ?? [muscle]).some((alias) => area.includes(alias));
}

function trend(values: number[]): number {
  if (values.length < 2) return 0;
  const midpoint = Math.ceil(values.length / 2);
  const average = (items: number[]) => items.reduce((sum, item) => sum + item, 0) / items.length;
  return average(values.slice(midpoint)) - average(values.slice(0, midpoint));
}

function latestFirst<T extends { createdAt?: number; startedAt?: number }>(values: T[]): T[] {
  return [...values].sort(
    (a, b) => (b.createdAt ?? b.startedAt ?? 0) - (a.createdAt ?? a.startedAt ?? 0),
  );
}

export function getDataTrustSummary(state: AppState, now = Date.now()): DataTrustSummary {
  const recentCutoff = startOfDay(now) - 7 * DAY;
  const candidates = [
    ...(state.activeWorkout ? [state.activeWorkout] : []),
    ...state.workouts.filter((item) => item.startedAt >= recentCutoff),
    ...state.mealEntries.filter((item) => item.createdAt >= recentCutoff),
    ...state.bodyweightEntries.filter((item) => item.createdAt >= recentCutoff),
    ...state.sleepEntries.filter((item) => item.createdAt >= recentCutoff),
    ...state.recoveryCheckIns.filter((item) => item.createdAt >= recentCutoff),
    ...state.recoverySignals.filter((item) => item.createdAt >= recentCutoff),
  ];
  const provenances = candidates.map(provenanceOf);
  const missingKeySignals: string[] = [];
  if (!state.recoveryCheckIns.some((item) => item.createdAt >= now - 48 * 60 * 60 * 1000))
    missingKeySignals.push("recent recovery check-in");
  if (!state.sleepEntries.some((item) => item.createdAt >= now - 36 * 60 * 60 * 1000))
    missingKeySignals.push("recent sleep");
  if (!state.workouts.some((item) => item.startedAt >= recentCutoff) && !state.activeWorkout)
    missingKeySignals.push("recent training");
  if (!state.mealEntries.some((item) => item.createdAt >= startOfDay(now)))
    missingKeySignals.push("today's nutrition");

  const confirmedInputsUsed = provenances.filter(
    (item) => item.confirmation === "confirmed" || item.confirmation === "not-required",
  ).length;
  const lowConfidenceInputs = provenances.filter(
    (item) => item.confidence === "low" || item.confidence === "unknown",
  ).length;
  const unconfirmedAiInputsIgnoredOrSoftened = provenances.filter(
    (item) => item.source === "ai-estimated" && item.confirmation !== "confirmed",
  ).length;
  let overallDecisionConfidence: DecisionConfidence = "high";
  if (missingKeySignals.length >= 3 || !candidates.length)
    overallDecisionConfidence = "insufficient";
  else if (missingKeySignals.length >= 2 || unconfirmedAiInputsIgnoredOrSoftened > 0)
    overallDecisionConfidence = "low";
  else if (missingKeySignals.length || lowConfidenceInputs > 0 || confirmedInputsUsed < 3)
    overallDecisionConfidence = "medium";

  return {
    confirmedInputsUsed,
    lowConfidenceInputs,
    unconfirmedAiInputsIgnoredOrSoftened,
    missingKeySignals,
    overallDecisionConfidence,
  };
}

export function buildDailyDecisionContext(state: AppState, now = Date.now()): DailyDecisionContext {
  const today = startOfDay(now);
  const todayMeals = state.mealEntries.filter(
    (item) => item.createdAt >= today && item.createdAt <= now,
  );
  const trustedTodayMeals = todayMeals.filter((item) => !isUnconfirmedAi(item));
  const ignoredNutritionIds = todayMeals.filter(isUnconfirmedAi).map((item) => item.id);
  const recentWorkouts = latestFirst(
    state.workouts.filter((item) => item.startedAt >= today - 7 * DAY && item.startedAt <= now),
  );
  const previousWorkouts = latestFirst(
    state.workouts.filter(
      (item) => item.startedAt >= today - 14 * DAY && item.startedAt < today - 7 * DAY,
    ),
  );
  const recentCheckIns = latestFirst(
    state.recoveryCheckIns.filter((item) => item.createdAt <= now),
  );
  const latestCheckIn =
    recentCheckIns.find((item) => item.createdAt >= now - 48 * 60 * 60 * 1000) ?? null;
  const previousCheckIn = recentCheckIns.find((item) => item.id !== latestCheckIn?.id) ?? null;
  const latestSleep =
    latestFirst(state.sleepEntries.filter((item) => item.createdAt <= now))[0] ?? null;
  const recentRecoverySignals = latestFirst(
    state.recoverySignals.filter(
      (item) => item.createdAt >= now - 7 * DAY && item.createdAt <= now,
    ),
  );
  const caloriesToday = trustedTodayMeals.reduce((sum, item) => sum + item.calories, 0);
  const proteinToday = trustedTodayMeals.reduce((sum, item) => sum + item.protein, 0);
  const carbsToday = trustedTodayMeals.reduce((sum, item) => sum + item.carbs, 0);
  const calorieTarget = state.nutritionTargets.calories || state.userGoalsProfile.calorieGoal || 0;
  const proteinTarget = state.nutritionTargets.protein || state.userGoalsProfile.proteinGoal || 0;
  const trainingVolume = recentWorkouts.reduce((sum, item) => sum + workoutVolume(item), 0);
  const previousTrainingVolume = previousWorkouts.reduce(
    (sum, item) => sum + workoutVolume(item),
    0,
  );
  const muscleGroupsUsed = muscleUse(recentWorkouts);
  const painSeverity = Math.max(
    0,
    ...recentRecoverySignals
      .filter(
        (item) => item.kind === "pain" || item.kind === "injury" || item.kind === "discomfort",
      )
      .map((item) => item.severity),
  );
  const muscleGroupsToLimit = new Set(
    Object.entries(state.muscleFatigue)
      .filter(([, level]) => level === "fatigued" || level === "very")
      .map(([muscle]) => muscle),
  );
  for (const signal of recentRecoverySignals.filter((item) => item.severity >= 6)) {
    for (const muscle of Object.keys(muscleGroupsUsed)) {
      if (bodyAreaMatchesMuscle(signal.bodyArea || signal.notes, muscle))
        muscleGroupsToLimit.add(muscle);
    }
    if (
      signal.bodyArea &&
      ![...muscleGroupsToLimit].some((muscle) => bodyAreaMatchesMuscle(signal.bodyArea, muscle))
    ) {
      muscleGroupsToLimit.add(signal.bodyArea.toLowerCase());
    }
  }

  const hour = new Date(now).getHours();
  const expectedProgress = Math.max(0.35, Math.min(0.9, (hour - 7) / 14));
  const underEating =
    trustedTodayMeals.length > 0 &&
    hour >= 12 &&
    ((calorieTarget > 0 && caloriesToday < calorieTarget * expectedProgress * 0.72) ||
      (proteinTarget > 0 && proteinToday < proteinTarget * expectedProgress * 0.65));
  const trust = getDataTrustSummary(state, now);
  const dataUsed: DataUsed[] = [];
  if (recentWorkouts.length)
    dataUsed.push(used("training", recentWorkouts, "Completed workouts from the last 7 days"));
  if (state.activeWorkout)
    dataUsed.push(used("active_workout", [state.activeWorkout], "Current active workout"));
  if (trustedTodayMeals.length)
    dataUsed.push(used("nutrition", trustedTodayMeals, "Confirmed or trusted meals logged today"));
  if (latestCheckIn) dataUsed.push(used("recovery", [latestCheckIn], "Latest recovery check-in"));
  if (latestSleep) dataUsed.push(used("recovery", [latestSleep], "Latest sleep entry"));
  if (recentRecoverySignals.length)
    dataUsed.push(
      used("recovery", recentRecoverySignals, "Recent soreness, fatigue, or pain signals"),
    );
  const recentWeights = latestFirst(
    state.bodyweightEntries.filter(
      (item) => item.createdAt >= today - 28 * DAY && item.createdAt <= now,
    ),
  );
  if (recentWeights.length)
    dataUsed.push(used("progress", recentWeights, "Bodyweight entries from the last 28 days"));

  const dataMissing: DataMissing[] = [];
  if (!latestCheckIn)
    dataMissing.push({
      area: "recovery",
      whyItMatters: "Current soreness, energy, and stress are unknown.",
      suggestedUserAction: "Log today's recovery check-in.",
    });
  if (!latestSleep || latestSleep.createdAt < now - 36 * 60 * 60 * 1000)
    dataMissing.push({
      area: "recovery",
      whyItMatters: "Recent sleep can materially change training intensity.",
      suggestedUserAction: "Log last night's sleep.",
    });
  if (!todayMeals.length)
    dataMissing.push({
      area: "nutrition",
      whyItMatters: "Today's fueling and protein status cannot be assessed.",
      suggestedUserAction: "Log today's meals.",
    });
  if (ignoredNutritionIds.length)
    dataMissing.push({
      area: "nutrition",
      whyItMatters:
        "An AI or camera-estimated meal is not confirmed, so it was not used for macro guidance.",
      suggestedUserAction: "Confirm or correct the estimated meal.",
    });
  if (!recentWorkouts.length && !state.activeWorkout)
    dataMissing.push({
      area: "training",
      whyItMatters:
        "There is not enough recent load or performance data for a strong progression recommendation.",
      suggestedUserAction: "Log your next workout at a comfortable restart effort.",
    });
  if (recentWeights.length < 3)
    dataMissing.push({
      area: "progress",
      whyItMatters: "At least three weigh-ins are needed for a useful short-term trend.",
      suggestedUserAction: "Continue regular weigh-ins before changing calorie targets.",
    });

  const warnings: string[] = [];
  if (painSeverity >= 5)
    warnings.push(
      "Pain or injury-concern data is present. Avoid pushing through pain; consider professional guidance if it persists or worsens.",
    );
  if (ignoredNutritionIds.length)
    warnings.push("Unconfirmed AI/camera nutrition was excluded from calorie and macro totals.");

  return {
    generatedAt: now,
    date: dateKey(now),
    todayMeals,
    trustedTodayMeals,
    ignoredNutritionIds,
    activeWorkout: state.activeWorkout,
    recentWorkouts,
    previousWorkouts,
    latestCheckIn,
    previousCheckIn,
    latestSleep,
    recentRecoverySignals,
    caloriesToday,
    proteinToday,
    carbsToday,
    calorieTarget,
    proteinTarget,
    trainingVolume,
    previousTrainingVolume,
    muscleGroupsUsed,
    muscleGroupsToLimit: [...muscleGroupsToLimit],
    painSeverity,
    underEating,
    dataUsed,
    dataMissing,
    warnings,
    trust,
  };
}

export function getDailyDecisionConfidence(context: DailyDecisionContext): DecisionConfidence {
  let confidence = context.trust.overallDecisionConfidence;
  if (context.ignoredNutritionIds.length && (confidence === "high" || confidence === "medium"))
    confidence = "low";
  if (!context.latestCheckIn && !context.latestSleep && confidence !== "insufficient")
    confidence = "low";
  return confidence;
}

function getPerformanceChange(context: DailyDecisionContext): WhatChangedSignal | null {
  for (const latest of context.recentWorkouts) {
    const previous = context.previousWorkouts.find(
      (item) => item.name.toLowerCase() === latest.name.toLowerCase(),
    );
    if (!previous) continue;
    const best = (workout: Workout) =>
      Math.max(
        0,
        ...workout.exercises.flatMap((exercise) =>
          exercise.sets
            .filter((set) => set.completed && set.weight && set.reps)
            .map((set) => set.weight! * (1 + set.reps! / 30)),
        ),
      );
    const current = best(latest);
    const comparison = best(previous);
    if (!current || !comparison || Math.abs(current - comparison) / comparison < 0.03) continue;
    const improved = current > comparison;
    return {
      type: "performance",
      label: improved
        ? "Matching-workout performance improved"
        : "Matching-workout performance dipped",
      currentValue: Math.round(current),
      comparisonValue: Math.round(comparison),
      comparisonWindow: "latest workout vs previous matching workout",
      direction: improved ? "increased" : "decreased",
      significance: Math.abs(current - comparison) / comparison >= 0.08 ? "high" : "medium",
      confidence: confidenceOf([latest, previous]),
      explanation: improved
        ? "Estimated top-set performance improved, which may support cautious progression when recovery is good."
        : "Estimated top-set performance declined; repeat the prior load before adding weight and watch recovery.",
      dataUsed: [used("training", [latest, previous], "Latest and previous matching workouts")],
    };
  }
  return null;
}

export function getWhatChangedSignals(state: AppState, now = Date.now()): WhatChangedSignal[] {
  const context = buildDailyDecisionContext(state, now);
  const signals: WhatChangedSignal[] = [];
  const currentCount = context.recentWorkouts.length;
  const previousCount = context.previousWorkouts.length;
  if (currentCount !== previousCount) {
    signals.push({
      type: "training_frequency",
      label: `Training frequency ${currentCount > previousCount ? "increased" : "decreased"}`,
      currentValue: currentCount,
      comparisonValue: previousCount,
      comparisonWindow: "last 7 days vs previous 7 days",
      direction: currentCount > previousCount ? "increased" : "decreased",
      significance: Math.abs(currentCount - previousCount) >= 2 ? "high" : "medium",
      confidence: confidenceOf([...context.recentWorkouts, ...context.previousWorkouts]),
      explanation:
        currentCount > previousCount
          ? "More sessions can support progress, but recovery should keep pace with the added frequency."
          : previousCount > 0 && currentCount === 0
            ? "Training paused this week. Restart with a comfortable session rather than trying to make up missed work."
            : "Fewer sessions may reduce training stimulus; resume the normal schedule when practical.",
      dataUsed:
        context.recentWorkouts.length || context.previousWorkouts.length
          ? [
              used(
                "training",
                [...context.recentWorkouts, ...context.previousWorkouts],
                "Workouts from two consecutive 7-day windows",
              ),
            ]
          : [],
    });
  }
  if (context.trainingVolume && context.previousTrainingVolume) {
    const ratio = context.trainingVolume / context.previousTrainingVolume;
    if (ratio >= 1.15 || ratio <= 0.85) {
      signals.push({
        type: "training_volume",
        label: `Training volume ${ratio > 1 ? "increased" : "decreased"}`,
        currentValue: Math.round(context.trainingVolume),
        comparisonValue: Math.round(context.previousTrainingVolume),
        comparisonWindow: "last 7 days vs previous 7 days",
        direction: ratio > 1 ? "increased" : "decreased",
        significance: ratio >= 1.3 || ratio <= 0.7 ? "high" : "medium",
        confidence: confidenceOf([...context.recentWorkouts, ...context.previousWorkouts]),
        explanation:
          ratio > 1
            ? "Load rose meaningfully, so soreness, sleep, and performance should guide whether to progress again."
            : "Load fell meaningfully; use a normal, non-punitive return rather than adding missed volume at once.",
        dataUsed: [
          used(
            "training",
            [...context.recentWorkouts, ...context.previousWorkouts],
            "Completed set volume from two 7-day windows",
          ),
        ],
      });
    }
  }
  const performance = getPerformanceChange(context);
  if (performance) signals.push(performance);

  if (context.latestCheckIn && context.previousCheckIn) {
    const current =
      context.latestCheckIn.energy -
      context.latestCheckIn.soreness -
      context.latestCheckIn.stress / 2;
    const comparison =
      context.previousCheckIn.energy -
      context.previousCheckIn.soreness -
      context.previousCheckIn.stress / 2;
    if (Math.abs(current - comparison) >= 2) {
      const improved = current > comparison;
      signals.push({
        type: "recovery",
        label: `Recovery ${improved ? "improved" : "worsened"}`,
        currentValue: Math.round(current * 10) / 10,
        comparisonValue: Math.round(comparison * 10) / 10,
        comparisonWindow: "latest vs previous check-in",
        direction: improved ? "increased" : "decreased",
        significance: Math.abs(current - comparison) >= 4 ? "high" : "medium",
        confidence: confidenceOf([context.latestCheckIn, context.previousCheckIn]),
        explanation: improved
          ? "Energy, soreness, and stress moved in a better direction."
          : "Current check-in signals less recovery capacity, so intensity should be conservative.",
        dataUsed: [
          used(
            "recovery",
            [context.latestCheckIn, context.previousCheckIn],
            "Latest two recovery check-ins",
          ),
        ],
      });
    }
  }

  if (context.trustedTodayMeals.length) {
    const today = startOfDay(now);
    const priorMeals = state.mealEntries.filter(
      (item) =>
        item.createdAt >= today - 7 * DAY && item.createdAt < today && !isUnconfirmedAi(item),
    );
    const loggedDays = new Set(priorMeals.map((item) => dateKey(item.createdAt))).size;
    if (loggedDays >= 2) {
      const usualCalories = priorMeals.reduce((sum, item) => sum + item.calories, 0) / loggedDays;
      const usualProtein = priorMeals.reduce((sum, item) => sum + item.protein, 0) / loggedDays;
      const caloriesRatio = context.caloriesToday / usualCalories;
      const proteinRatio = usualProtein ? context.proteinToday / usualProtein : caloriesRatio;
      if (caloriesRatio <= 0.65 || proteinRatio <= 0.65) {
        signals.push({
          type: "nutrition",
          label:
            proteinRatio <= caloriesRatio
              ? "Protein is behind the recent usual pace"
              : "Calories are behind the recent usual pace",
          currentValue:
            proteinRatio <= caloriesRatio
              ? `${Math.round(context.proteinToday)}g protein`
              : `${Math.round(context.caloriesToday)} kcal`,
          comparisonValue:
            proteinRatio <= caloriesRatio
              ? `${Math.round(usualProtein)}g daily average`
              : `${Math.round(usualCalories)} kcal daily average`,
          comparisonWindow: "today vs average of logged days in the prior 7 days",
          direction: "decreased",
          significance: Math.min(caloriesRatio, proteinRatio) <= 0.45 ? "high" : "medium",
          confidence: confidenceOf([...context.trustedTodayMeals, ...priorMeals]),
          explanation:
            "Confirmed intake is materially behind the recent logged pattern. Complete today's logs before changing targets.",
          dataUsed: [
            used(
              "nutrition",
              [...context.trustedTodayMeals, ...priorMeals],
              "Trusted meals from today and the prior 7 days",
            ),
          ],
        });
      }
    }
  }

  const weights = latestFirst(
    state.bodyweightEntries.filter(
      (item) => item.createdAt >= now - 28 * DAY && item.createdAt <= now,
    ),
  ).reverse();
  if (weights.length >= 4) {
    const movement = trend(weights.map((item) => item.weightLb));
    const goal = state.userGoalsProfile.goal ?? state.profile.goal;
    const gaining = goal === "bulk" || goal === "lean_bulk";
    const losing = goal === "cut";
    const mismatch = (gaining && movement <= 0) || (losing && movement >= 0);
    if (Math.abs(movement) >= 0.2 || mismatch) {
      signals.push({
        type: "bodyweight",
        label: mismatch
          ? "Bodyweight trend is not matching the goal direction"
          : `Bodyweight trend ${movement > 0 ? "rose" : "fell"}`,
        currentValue: `${weights.at(-1)!.weightLb} lb`,
        comparisonValue: `${weights[0].weightLb} lb`,
        comparisonWindow: "recent half vs prior half of the last 28 days",
        direction: movement > 0 ? "increased" : movement < 0 ? "decreased" : "stable",
        significance: mismatch ? "medium" : "low",
        confidence: confidenceOf(weights),
        explanation: mismatch
          ? "The short trend does not match the stated goal. Review confirmed food logs before making a small target change."
          : "The trend is worth monitoring, but one short window is not enough for a large calorie adjustment.",
        dataUsed: [used("progress", weights, "Bodyweight trend and stated goal direction")],
      });
    }
  }

  if (context.ignoredNutritionIds.length) {
    const ignored = context.todayMeals.filter((item) =>
      context.ignoredNutritionIds.includes(item.id),
    );
    signals.push({
      type: "data_confidence",
      label: "Nutrition confidence decreased",
      currentValue: `${ignored.length} unconfirmed estimate${ignored.length === 1 ? "" : "s"}`,
      comparisonValue: "confirmed meal data",
      comparisonWindow: "today",
      direction: "decreased",
      significance: "medium",
      confidence: "high",
      explanation:
        "Unconfirmed AI/camera estimates were excluded, so macro guidance is intentionally softened until they are reviewed.",
      dataUsed: [
        used(
          "nutrition",
          ignored,
          "Unconfirmed AI/camera meal estimates (excluded from macro totals)",
        ),
      ],
    });
  }
  return signals.slice(0, 6);
}

function chooseDecisionType(context: DailyDecisionContext): DecisionType {
  const checkIn = context.latestCheckIn;
  const severePain = context.painSeverity >= 7;
  const highSoreness = (checkIn?.soreness ?? 0) >= 8;
  const lowEnergy = (checkIn?.energy ?? 10) <= 3;
  const poorSleep = context.latestSleep
    ? context.latestSleep.hours < 5.5 || context.latestSleep.quality <= 3
    : false;
  const veryFatigued = context.muscleGroupsToLimit.length >= 3;
  const loadSpike =
    context.previousTrainingVolume > 0 &&
    context.trainingVolume > context.previousTrainingVolume * 1.35;

  if (severePain || (highSoreness && lowEnergy)) return "recover";
  if (context.painSeverity >= 5 || highSoreness || (poorSleep && lowEnergy)) return "train_light";
  if ((loadSpike && (lowEnergy || poorSleep || (checkIn?.soreness ?? 0) >= 6)) || veryFatigued)
    return "deload";
  if (!checkIn && !context.latestSleep && !context.recentWorkouts.length && !context.activeWorkout)
    return "insufficient_data";
  if (context.underEating) return "train_light";
  if (context.activeWorkout) return "train_normal";
  const goodRecovery =
    !!checkIn &&
    checkIn.energy >= 8 &&
    checkIn.soreness <= 3 &&
    checkIn.stress <= 5 &&
    (!context.latestSleep || (context.latestSleep.hours >= 7 && context.latestSleep.quality >= 6));
  return goodRecovery && context.recentWorkouts.length > 0 ? "train_hard" : "train_normal";
}

function priorityMuscles(state: AppState, context: DailyDecisionContext): string[] {
  const limits = new Set(context.muscleGroupsToLimit);
  const preferred = [
    ...(state.userGoalsProfile.weakPoints ?? []),
    ...(state.profile.weakMuscles ?? []),
    ...Object.keys(context.muscleGroupsUsed).sort(
      (a, b) => context.muscleGroupsUsed[a] - context.muscleGroupsUsed[b],
    ),
  ].filter((item) => !limits.has(item.toLowerCase()));
  return [...new Set(preferred.map((item) => item.toLowerCase()))].slice(0, 3);
}

function buildLimitingFactors(context: DailyDecisionContext): LimitingFactor[] {
  const factors: LimitingFactor[] = [];
  const recoveryData = context.dataUsed.filter((item) => item.area === "recovery");
  if (context.painSeverity > 0)
    factors.push({
      type: "pain_or_injury_concern",
      severity: context.painSeverity >= 7 ? "high" : context.painSeverity >= 5 ? "medium" : "low",
      confidence: recoveryData[0]?.confidence ?? "medium",
      explanation: `A pain/discomfort signal was logged at severity ${context.painSeverity}/10. This is a safety limiter, not a diagnosis.`,
      dataUsed: recoveryData,
    });
  if ((context.latestCheckIn?.soreness ?? 0) >= 6 || context.muscleGroupsToLimit.length)
    factors.push({
      type: "soreness",
      severity: (context.latestCheckIn?.soreness ?? 0) >= 8 ? "high" : "medium",
      confidence: recoveryData[0]?.confidence ?? "medium",
      explanation: context.muscleGroupsToLimit.length
        ? `Soreness or fatigue supports limiting ${context.muscleGroupsToLimit.join(", ")}.`
        : "Whole-body soreness is elevated.",
      dataUsed: recoveryData,
    });
  if ((context.latestCheckIn?.energy ?? 10) <= 5)
    factors.push({
      type: "fatigue",
      severity: (context.latestCheckIn?.energy ?? 10) <= 3 ? "high" : "medium",
      confidence: recoveryData[0]?.confidence ?? "medium",
      explanation: `Energy is ${context.latestCheckIn?.energy}/10, which lowers confidence in max-effort work.`,
      dataUsed: recoveryData,
    });
  if (context.latestSleep && (context.latestSleep.hours < 7 || context.latestSleep.quality < 6))
    factors.push({
      type: "sleep",
      severity:
        context.latestSleep.hours < 5.5 || context.latestSleep.quality <= 3 ? "high" : "medium",
      confidence: confidenceOf([context.latestSleep]),
      explanation: `${context.latestSleep.hours} hours of sleep with quality ${context.latestSleep.quality}/10 may limit recovery.`,
      dataUsed: recoveryData.filter((item) => item.ids.includes(context.latestSleep!.id)),
    });
  if (context.underEating)
    factors.push({
      type: "nutrition",
      severity: "medium",
      confidence: context.dataUsed.find((item) => item.area === "nutrition")?.confidence ?? "low",
      explanation:
        "Confirmed calories or protein are behind the expected pace for today, which may limit performance.",
      dataUsed: context.dataUsed.filter((item) => item.area === "nutrition"),
    });
  if (!context.latestCheckIn && !context.latestSleep)
    factors.push({
      type: "missing_data",
      severity: "medium",
      confidence: "high",
      explanation:
        "Current recovery cannot be assessed strongly because both a recent check-in and sleep entry are missing.",
      dataUsed: [],
    });
  return factors;
}

export function buildDailyDecision(state: AppState, now = Date.now()): DailyDecision {
  const context = buildDailyDecisionContext(state, now);
  const decisionType = chooseDecisionType(context);
  const confidence = getDailyDecisionConfidence(context);
  const limits = context.muscleGroupsToLimit;
  const priorities = priorityMuscles(state, context);
  const activeName = state.activeWorkout?.name;
  const trainingReason: Record<DecisionType, string> = {
    train_hard:
      "Recent recovery is good and there is enough training history to support cautious progression.",
    train_normal: activeName
      ? `An active ${activeName} session is already in progress, so the recommendation stays aligned with it.`
      : context.recentWorkouts.length
        ? "Recovery and recent load support a normal session without forcing progression."
        : "Use a comfortable restart session; missed workouts do not need to be made up.",
    train_light:
      context.painSeverity >= 5
        ? "A pain or discomfort signal makes intensity reduction the safest choice."
        : context.underEating
          ? "Confirmed fueling is behind today, so hard training is softened."
          : "Soreness, fatigue, or sleep signals support reducing intensity.",
    deload: "Recent load and recovery signals favor a lower-volume, lower-intensity session.",
    recover:
      "Current pain, soreness, or fatigue signals make a recovery-focused day the safer recommendation.",
    insufficient_data:
      "There is not enough current recovery or recent training data for a strong recommendation.",
  };
  const intensityByType: Record<DecisionType, TrainingDecision["intensity"]> = {
    train_hard: "hard",
    train_normal: "normal",
    train_light: "light",
    deload: "deload",
    recover: "recovery",
    insufficient_data: "unknown",
  };
  const recommendationByType: Record<DecisionType, string> = {
    train_hard: "Train hard: progress cautiously and keep about 1–2 reps in reserve.",
    train_normal: activeName
      ? `Continue ${activeName} at a normal, controlled effort.`
      : context.recentWorkouts.length
        ? "Train normal: use a controlled effort and keep 1–2 reps in reserve."
        : "Restart with a normal, comfortable session; do not add make-up volume.",
    train_light: limits.length
      ? `Train light: reduce volume and limit ${limits.join(", ")}.`
      : "Train light: reduce volume and avoid max-effort sets.",
    deload: "Deload: reduce both load and total working sets today.",
    recover: "Recover: make today recovery-focused and avoid pushing through pain.",
    insufficient_data:
      "Insufficient data: log a recovery check-in before a strong training recommendation.",
  };
  const training: TrainingDecision = {
    recommendation: recommendationByType[decisionType],
    suggestedFocus:
      activeName ??
      (priorities.length
        ? `${priorities.join(" / ")} focus`
        : decisionType === "recover"
          ? "recovery"
          : "comfortable full-body or scheduled split"),
    intensity: intensityByType[decisionType],
    muscleGroupsToPrioritize: priorities,
    muscleGroupsToLimit: limits,
    progressionAllowed:
      decisionType === "train_hard" && confidence !== "low" && confidence !== "insufficient",
    reason: trainingReason[decisionType],
  };

  const calorieGap = context.calorieTarget ? context.calorieTarget - context.caloriesToday : null;
  const proteinGap = context.proteinTarget ? context.proteinTarget - context.proteinToday : null;
  let nutritionRecommendation = "Keep meals balanced and continue logging confirmed intake.";
  let nutritionReason = "Confirmed nutrition is reasonably aligned with today's target.";
  let carbTimingSuggestion: string | null = null;
  if (context.ignoredNutritionIds.length) {
    nutritionRecommendation =
      "Confirm or correct the photo/AI-estimated meal before adjusting macros.";
    nutritionReason =
      "Unconfirmed estimated nutrition was excluded from totals and cannot support a strong adjustment.";
  } else if (!context.todayMeals.length) {
    nutritionRecommendation = "Log today's meals before making a calorie or macro adjustment.";
    nutritionReason = "No nutrition entries are available for today.";
  } else if (proteinGap != null && proteinGap >= 30) {
    const nextMealProtein = Math.max(35, Math.min(45, Math.round(proteinGap / 5) * 5));
    nutritionRecommendation = `Protein is behind target; prioritize about ${nextMealProtein}g at your next meal.`;
    nutritionReason = `${Math.round(context.proteinToday)}g of ${context.proteinTarget}g protein is confirmed so far today.`;
  } else if (context.underEating && calorieGap != null) {
    nutritionRecommendation =
      "Calories are low for today's training demand; add a normal carb-and-protein meal.";
    nutritionReason = `${Math.round(context.caloriesToday)} of ${context.calorieTarget} calories are confirmed so far today.`;
    carbTimingSuggestion =
      "If training is still ahead, include an easy-to-digest carb source in the pre-workout meal.";
  }
  const nutrition: NutritionDecision = {
    recommendation: nutritionRecommendation,
    calorieTargetAdjustment: 0,
    proteinGap: proteinGap == null ? null : Math.max(0, Math.round(proteinGap)),
    calorieGap: calorieGap == null ? null : Math.round(calorieGap),
    carbTimingSuggestion,
    underEatingWarning: context.underEating,
    reason: nutritionReason,
  };

  const soreness = context.latestCheckIn?.soreness ?? null;
  const fatigueLevel = context.latestCheckIn ? 10 - context.latestCheckIn.energy : null;
  const sleepSignal: RecoveryDecision["sleepSignal"] =
    !context.latestSleep || context.latestSleep.createdAt < now - 36 * 60 * 60 * 1000
      ? "missing"
      : context.latestSleep.hours >= 7 && context.latestSleep.quality >= 6
        ? "good"
        : context.latestSleep.hours < 5.5 || context.latestSleep.quality <= 3
          ? "poor"
          : "fair";
  const limitingFactors = buildLimitingFactors(context);
  const recoveryLimiters = limitingFactors
    .filter((item) => item.type !== "missing_data")
    .map((item) => item.type);
  const recovery: RecoveryDecision = {
    recommendation: recoveryLimiters.length
      ? `Recovery is limited mainly by ${recoveryLimiters.slice(0, 2).join(" and ").replaceAll("_", " ")}.`
      : context.latestCheckIn || context.latestSleep
        ? "Recovery signals support a controlled training session."
        : "Recovery data is missing; complete a check-in for a better recommendation.",
    recoveryLimiters,
    sorenessLevel: soreness,
    fatigueLevel,
    sleepSignal,
    reason:
      limitingFactors[0]?.explanation ??
      "No material recovery limiter was detected in the available trusted data.",
  };

  let oneAction = "Keep today's workout controlled and leave 1–2 reps in reserve.";
  if (context.painSeverity >= 5)
    oneAction = limits.length
      ? `Avoid pushing ${limits[0]} today; seek professional guidance if pain persists or worsens.`
      : "Avoid pushing through pain today; seek professional guidance if it persists or worsens.";
  else if (!context.latestCheckIn) oneAction = "Log today's recovery check-in.";
  else if (context.ignoredNutritionIds.length)
    oneAction = "Confirm or correct the estimated meal before I adjust macros.";
  else if (decisionType === "recover")
    oneAction = "Make today recovery-focused and avoid max-effort training.";
  else if (decisionType === "deload")
    oneAction = "Cut today's working sets and load to a comfortable deload effort.";
  else if (decisionType === "train_light")
    oneAction = limits.length
      ? `Keep today's workout light and avoid heavy ${limits[0]}.`
      : "Keep today's workout light and avoid max-effort sets.";
  else if (proteinGap != null && proteinGap >= 30)
    oneAction = `Add ${Math.max(35, Math.min(45, Math.round(proteinGap / 5) * 5))}g protein at your next meal.`;
  else if (sleepSignal === "poor")
    oneAction = "Prioritize a full sleep window tonight; recovery is the main limiter.";

  const whatChanged = getWhatChangedSignals(state, now);
  return {
    id: `daily-decision:${context.date}`,
    generatedAt: now,
    date: context.date,
    decisionType,
    training,
    nutrition,
    recovery,
    limitingFactors,
    whatChanged,
    confidence,
    dataUsed: context.dataUsed,
    dataMissing: context.dataMissing,
    warnings: context.warnings,
    oneAction,
    explanation: `${training.recommendation} ${training.reason} ${recovery.recommendation}`,
  };
}
