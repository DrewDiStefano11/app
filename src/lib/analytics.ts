import type { AppState, Workout } from "./types";
import { EXERCISES, type MuscleGroup } from "./data";

const DAY = 86400000;

export function withinDays(ts: number, days: number) {
  return ts > Date.now() - days * DAY;
}

export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      if (s.completed && s.weight && s.reps) v += s.weight * s.reps;
    }
  }
  return v;
}

export function workoutsInRange(state: AppState, days: number) {
  return state.workouts.filter((w) => withinDays(w.startedAt, days));
}

export function totalVolumeInRange(state: AppState, days: number) {
  return workoutsInRange(state, days).reduce((s, w) => s + workoutVolume(w), 0);
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
  const days = new Map<number, { c: number; p: number }>();
  for (const m of recent) {
    const d = Math.floor(m.createdAt / DAY);
    const e = days.get(d) ?? { c: 0, p: 0 };
    e.c += m.calories;
    e.p += m.protein;
    days.set(d, e);
  }
  const targetC = state.nutritionTargets.calories;
  const targetP = state.nutritionTargets.protein;
  let sum = 0;
  let n = 0;
  for (const e of days.values()) {
    const cFit = 1 - Math.min(1, Math.abs(e.c - targetC) / targetC);
    const pFit = 1 - Math.min(1, Math.max(0, targetP - e.p) / targetP);
    sum += cFit * 0.5 + pFit * 0.5;
    n++;
  }
  return Math.round((sum / Math.max(1, n)) * 100);
}

export function readinessScore(state: AppState): number {
  const sleep = state.sleepEntries.slice(-3);
  const check = state.recoveryCheckIns.slice(-3);
  if (!sleep.length && !check.length) return 70; // baseline
  const sleepAvg = sleep.length
    ? sleep.reduce((s, e) => s + Math.min(1, e.hours / 8) * (e.quality / 5), 0) / sleep.length
    : 0.7;
  const checkAvg = check.length
    ? check.reduce(
        (s, c) => s + (c.energy + c.motivation + (6 - c.soreness) + (6 - c.stress)) / 20,
        0,
      ) / check.length
    : 0.7;
  return Math.round((sleepAvg * 0.5 + checkAvg * 0.5) * 100);
}

export function recoveryScore(state: AppState): number {
  // inverse of recent load + readiness
  const recentVol = totalVolumeInRange(state, 3);
  const monthlyAvg = (totalVolumeInRange(state, 28) / 28) * 3;
  const loadRatio = monthlyAvg > 0 ? Math.min(1.5, recentVol / monthlyAvg) : 0.6;
  const loadComponent = Math.max(0, 100 - (loadRatio - 0.7) * 80);
  const readiness = readinessScore(state);
  return Math.round(loadComponent * 0.4 + readiness * 0.6);
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

function distinctDays(timestamps: number[], days: number) {
  const cutoff = Date.now() - days * DAY;
  return new Set(
    timestamps.filter((ts) => ts >= cutoff).map((ts) => new Date(ts).toISOString().slice(0, 10)),
  ).size;
}

function momentumLabel(score: number): Exclude<MomentumLabel, "Not Enough Data"> {
  if (score >= 80) return "Strong Momentum";
  if (score >= 60) return "Steady";
  if (score >= 35) return "Slipping";
  return "Reset Needed";
}

/** Read-only 0-100 trend signal derived entirely from existing FitCore activity. */
export function momentumScore(state: AppState): MomentumResult {
  const factors: MomentumFactor[] = [];
  const targetWorkouts = Math.max(1, state.profile.daysPerWeek || 4);
  const recentWorkouts = workoutsInRange(state, 7).length;
  const priorWorkouts = state.workouts.filter(
    (workout) =>
      workout.startedAt >= Date.now() - 14 * DAY && workout.startedAt < Date.now() - 7 * DAY,
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
      score: Math.round((adherence * 0.75 + trend * 0.25) * 100),
      weight: 35,
      detail: `${recentWorkouts} of ${targetWorkouts} planned workouts in the last 7 days`,
    });
  }

  if (state.mealEntries.length > 0) {
    const recentMeals = state.mealEntries.filter((meal) => withinDays(meal.createdAt, 7));
    const loggedDays = distinctDays(
      recentMeals.map((meal) => meal.createdAt),
      7,
    );
    const proteinByDay = new Map<string, number>();
    for (const meal of recentMeals) {
      const day = new Date(meal.createdAt).toISOString().slice(0, 10);
      proteinByDay.set(day, (proteinByDay.get(day) ?? 0) + meal.protein);
    }
    const proteinTarget = Math.max(1, state.nutritionTargets.protein);
    const proteinDays = [...proteinByDay.values()].filter(
      (protein) => protein >= proteinTarget * 0.8,
    ).length;
    factors.push({
      id: "nutrition",
      label: "Nutrition logging",
      score: Math.round(
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
    );
    const checkIns = distinctDays(
      state.recoveryCheckIns.map((entry) => entry.createdAt),
      14,
    );
    const touchpoints = weighIns + checkIns;
    factors.push({
      id: "checkins",
      label: "Check-in rhythm",
      score: Math.round(Math.min(1, touchpoints / 6) * 100),
      weight: 15,
      detail: `${weighIns} weigh-in${weighIns === 1 ? "" : "s"} and ${checkIns} recovery check-in${checkIns === 1 ? "" : "s"} in 14 days`,
    });
  }

  if (state.sleepEntries.length > 0 || state.recoveryCheckIns.length > 0) {
    const recentSleep = state.sleepEntries.filter((entry) => withinDays(entry.createdAt, 7));
    const recentChecks = state.recoveryCheckIns.filter((entry) => withinDays(entry.createdAt, 7));
    const sleepDays = distinctDays(
      recentSleep.map((entry) => entry.createdAt),
      7,
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
      score: Math.round(
        (Math.min(1, (sleepDays + recentChecks.length) / 7) * 0.45 + quality * 0.55) * 100,
      ),
      weight: 15,
      detail: `${sleepDays} sleep logs and ${recentChecks.length} recovery signals this week`,
    });
  }

  const sortedWeights = [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt);
  const recentVolume = totalVolumeInRange(state, 14);
  const previousVolume = totalVolumeInRange(state, 28) - recentVolume;
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
      score = Math.round(Math.max(0, Math.min(100, 55 + (ratio - 1) * 80)));
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
  const score = Math.round(
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

export function weeklyVolumeSeries(state: AppState, days = 7): { day: string; volume: number }[] {
  const out: { day: string; volume: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end = now - i * DAY;
    const vol = state.workouts
      .filter((w) => w.startedAt >= start && w.startedAt < end)
      .reduce((s, w) => s + workoutVolume(w), 0);
    const d = new Date(end);
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
      volume: Math.round(vol),
    });
  }
  return out;
}

export function todayMealTotals(state: AppState) {
  const today = state.mealEntries.filter((m) => m.createdAt > Date.now() - DAY);
  return today.reduce(
    (s, m) => ({
      calories: s.calories + m.calories,
      protein: s.protein + m.protein,
      carbs: s.carbs + m.carbs,
      fat: s.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function trainingStreak(state: AppState): number {
  if (!state.workouts.length) return 0;
  const days = new Set(state.workouts.map((w) => Math.floor(w.startedAt / DAY)));
  let streak = 0;
  let d = Math.floor(Date.now() / DAY);
  while (days.has(d) || days.has(d - 1)) {
    if (days.has(d)) {
      streak++;
      d--;
    } else if (streak === 0) {
      d--;
    } // allow today off
    else break;
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

export function bodyweightDelta(state: AppState, days: number): number | null {
  const sorted = [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt);
  if (!sorted.length) return null;
  const latest = sorted[sorted.length - 1];
  const cutoff = Date.now() - days * DAY;
  const baseline = sorted.find((e) => e.createdAt >= cutoff) ?? sorted[0];
  return latest.weightLb - baseline.weightLb;
}
