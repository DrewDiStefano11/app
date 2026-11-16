import { availableWorkoutTemplates } from "./data";
import type { AppState, TrainingRoutine, Workout } from "./types";

export function activeRoutineSession(state: AppState, date: Date, dayId?: string) {
  const routine = state.personalization.trainingRoutine;
  if (!routine?.enabled) return undefined;
  const day = dayId
    ? routine.days.find((row) => row.id === dayId)
    : plannedRoutineDay(routine, date, state.workouts);
  const template =
    day &&
    availableWorkoutTemplates(state.workoutTemplates).find((row) => row.id === day.templateId);
  return { routine, day, template };
}

export function plannedRoutineDay(
  routine: TrainingRoutine,
  date: Date,
  workouts: readonly Workout[],
) {
  if (routine.mode === "weekly") {
    return routine.days.find((day) => day.weekday === date.getDay());
  }

  const positions = new Map(routine.days.map((day, index) => [day.id, index]));
  let latestEnd = -Infinity;
  let latestIndex = -1;
  for (const workout of workouts) {
    if (workout.routineId !== routine.id || !workout.routineDayId || workout.endedAt == null)
      continue;
    const position = positions.get(workout.routineDayId);
    if (position !== undefined && workout.endedAt >= latestEnd) {
      latestEnd = workout.endedAt;
      latestIndex = position;
    }
  }
  return routine.days.length ? routine.days[(latestIndex + 1) % routine.days.length] : undefined;
}
