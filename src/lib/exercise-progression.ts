import { EXERCISES, type TemplateExercise } from "./data";
import { hasPerformedSet } from "./analytics/observed-fitness";
import { MAX_ESTIMATED_1RM_REPETITIONS, EXERCISE_STALE_AFTER_DAYS, STALLED_MINIMUM_SESSIONS, STALLED_CHANGE_TOLERANCE_PERCENT } from "./analytics/training-detail-metrics";
import { calendarDayDifference } from "./analytics/date-time";
import { e1RM } from "./workout-personal-records";
import type { AppState, SetEntry, Workout, WorkoutExercise } from "./types";

export type LoadedSet = SetEntry & { weight: number; reps: number };
export interface RecordedExerciseSession { workoutId: string; date: number; sets: LoadedSet[]; target?: WorkoutExercise["target"] }
export type ProgressionTarget = Pick<TemplateExercise, "sets" | "reps" | "targetWeightLb">;
export interface ParsedTarget { sets: number; minimum: number; maximum: number; weight?: number; strategy: "strength" | "hypertrophy" }
export function parseProgressionTarget(target?: ProgressionTarget): ParsedTarget | undefined {
  const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(target ? (typeof target.reps === "string" ? target.reps.trim() : "") : "8-12");
  const minimum = Number(match?.[1]), maximum = Number(match?.[2] ?? match?.[1]);
  const sets = target?.sets ?? 3, weight = target?.targetWeightLb;
  return match && Number.isInteger(sets) && sets > 0 && sets <= 1000 && minimum > 0 && maximum >= minimum && maximum <= 30
    && (weight === undefined || (Number.isFinite(weight) && weight > 0 && weight <= 2000))
    ? { sets, minimum, maximum, weight, strategy: maximum <= 6 ? "strength" : "hypertrophy" } : undefined;
}
export function completedLoadedSet(set: SetEntry): set is LoadedSet {
  return hasPerformedSet(set) && Number.isFinite(set.weight) && set.weight! > 0 && set.weight! <= 2000
    && Number.isInteger(set.reps) && set.reps! > 0 && set.reps! <= 1000
    && (!set.modifier || ["normal", "failure"].includes(set.modifier));
}
/** One immutable index shared by active-workout comparisons and Jarvis. All stored weights are lb. */
export function recordedExerciseHistory(workouts: readonly Workout[], before = Date.now()) {
  const result = new Map<string, RecordedExerciseSession[]>();
  for (const workout of [...workouts].filter(w => Number.isFinite(w.startedAt) && w.startedAt > 0 && Number.isFinite(w.endedAt) && w.endedAt! >= w.startedAt && w.endedAt! <= before && w.provenance?.confirmation !== "unconfirmed").sort((a, b) => b.startedAt - a.startedAt || a.id.localeCompare(b.id))) {
    const grouped = new Map<string, { sets: LoadedSet[]; target?: WorkoutExercise["target"] }>();
    for (const row of workout.exercises) {
      if (row.provenance?.confirmation === "unconfirmed" || row.exerciseTags?.some(tag => tag !== "normal")) continue;
      const sets = row.sets.filter(completedLoadedSet);
      if (!sets.length) continue;
      const group = grouped.get(row.exerciseId);
      if (group) group.sets.push(...sets); else grouped.set(row.exerciseId, { sets: [...sets], target: row.target });
    }
    for (const [id, group] of grouped) {
      const sessions = result.get(id) ?? [];
      sessions.push({ workoutId: workout.id, date: workout.startedAt, ...group });
      result.set(id, sessions);
    }
  }
  return result;
}
export function progressionTargetStatus(sets: readonly SetEntry[], target: ParsedTarget, finished = false) {
  const performed = sets.filter(completedLoadedSet);
  const met = performed.filter(set => set.reps >= target.minimum && (target.weight === undefined || set.weight >= target.weight)).length;
  const status = met >= target.sets ? "completed" : !performed.length && !finished ? "pending" : finished || performed.length >= target.sets ? "missed" : "partial";
  return { status, met: Math.min(met, target.sets), required: target.sets, performed: performed.length } as const;
}
export function sessionEstimatedMax(session: RecordedExerciseSession) {
  const values = session.sets.filter(s => s.reps <= MAX_ESTIMATED_1RM_REPETITIONS && s.modifier !== "failure").map(s => e1RM(s.weight, s.reps));
  return values.length ? Math.max(...values) : undefined;
}
export function exerciseProgression(sessions: readonly RecordedExerciseSession[], target?: ProgressionTarget, now = Date.now()) {
  const goal = parseProgressionTarget(target);
  const latest = sessions[0];
  const base = { goal, latest, sessions: sessions.slice(0, 4), plateau: false, optional: true as const };
  if (!goal) return { ...base, summary: "Choose a numeric repetition range and set target for progression advice." };
  if (!latest) return { ...base, summary: "Log completed weighted working sets before requesting a progression recommendation." };
  const age = calendarDayDifference(now, latest.date);
  if (age > EXERCISE_STALE_AFTER_DAYS) return { ...base, summary: `Your last eligible session was ${age} days ago. Record a current session before using a load increase.` };
  const weight = latest.sets[0].weight;
  const comparable = (session: RecordedExerciseSession) => session.sets.length >= goal.sets && session.sets.every(s => s.weight === weight && s.modifier !== "failure");
  const reachedTop = (session: RecordedExerciseSession) => comparable(session) && session.sets.slice(0, goal.sets).every(s => s.reps >= goal.maximum);
  const span = sessions.length >= STALLED_MINIMUM_SESSIONS ? calendarDayDifference(latest.date, sessions[STALLED_MINIMUM_SESSIONS - 1].date) : 0;
  const recent = sessions.slice(0, STALLED_MINIMUM_SESSIONS);
  const estimates = recent.map(sessionEstimatedMax);
  const values = estimates.filter((v): v is number => v !== undefined);
  const plateau = recent.length === STALLED_MINIMUM_SESSIONS && recent.every(comparable) && values.length === recent.length && span >= 7
    && (Math.max(...values) - Math.min(...values)) / Math.min(...values) * 100 <= STALLED_CHANGE_TOLERANCE_PERCENT;
  if (goal.weight !== undefined && goal.weight !== weight) return { ...base, plateau, summary: `Your target is ${goal.weight} lb; the latest recorded working load was ${weight} lb. Review this difference before increasing the target.` };
  if (!comparable(latest)) return { ...base, plateau, summary: `Latest session has ${latest.sets.length} eligible working sets, with varying loads, a failure tag or fewer than ${goal.sets} sets. Keep a consistent target and complete it before increasing load.` };
  const increase = reachedTop(latest) && (goal.strategy === "hypertrophy" || (sessions[1] && reachedTop(sessions[1]) && calendarDayDifference(latest.date, sessions[1].date) >= 1));
  if (increase && weight + 5 > 2000) return { ...base, plateau, summary: "The next increment exceeds the supported recorded-load range. Review your target manually." };
  const nextReps = increase ? goal.minimum : Math.min(goal.maximum, Math.min(...latest.sets.slice(0, goal.sets).map(s => s.reps)) + 1);
  return { ...base, plateau, weight: increase ? weight + 5 : weight, repetitions: nextReps,
    summary: increase ? `Optional: try ${weight + 5} lb for ${goal.sets} sets of ${goal.minimum}-${goal.maximum} reps. All required sets reached ${goal.maximum} reps at ${weight} lb${goal.strategy === "strength" ? " on two separate recorded days" : " in the latest session"}. This is a 5 lb step; adjust to available equipment.`
      : `Optional: keep ${weight} lb and aim for ${nextReps} reps per set toward ${goal.sets} × ${goal.minimum}-${goal.maximum}.${goal.strategy === "strength" && reachedTop(latest) ? " Strength progression waits for the top of the range on two separate recorded days." : " Complete the full target before adding weight."}` };
}
export function progressionExerciseId(state: AppState, input: unknown) {
  if (typeof input !== "string" || !input.trim()) return;
  const name = input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (["bench", "barbell bench", "benched"].includes(name)) return "bench-press";
  const matches = [...EXERCISES, ...state.customExercises].filter(e => [e.id, e.name].some(value => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === name));
  return matches.length === 1 ? matches[0].id : undefined;
}
