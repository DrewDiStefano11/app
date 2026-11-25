import { EXERCISES, type TemplateExercise } from "./data";
import { exerciseProgression, recordedExerciseHistory } from "./exercise-progression";
import type { AppState } from "./types";

/** Link an actual planned exercise to its own recorded history; no recovery inference or program changes. */
export function dailyTrainingInsight(state: Pick<AppState, "workouts" | "customExercises">, plan: readonly TemplateExercise[], now = Date.now()) {
  if (!plan.length) return;
  const history = recordedExerciseHistory(state.workouts, now);
  for (const target of plan) {
    const sessions = history.get(target.exerciseId);
    if (!sessions?.length) continue;
    const name = EXERCISES.find(exercise => exercise.id === target.exerciseId)?.name
      ?? state.customExercises.find(exercise => exercise.id === target.exerciseId)?.name ?? target.exerciseId;
    const latest = sessions[0];
    return { name, exerciseId: target.exerciseId, latest, advice: exerciseProgression(sessions, target, now), planHasHistory: true as const };
  }
  return { planHasHistory: false as const };
}
