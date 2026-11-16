import { MAX_WORKOUT_TEMPLATE_SETS, type WorkoutTemplate } from "./data";
import type { SetEntry, Workout, WorkoutExercise } from "./types";

export function createActiveWorkout(
  template: WorkoutTemplate | undefined,
  assignment: Pick<Workout, "routineId" | "routineDayId"> | undefined,
  createId: () => string,
  startedAt: number,
): Workout | null {
  if (
    template &&
    template.exercises.reduce((sum, row) => sum + row.sets, 0) > MAX_WORKOUT_TEMPLATE_SETS
  ) {
    return null;
  }
  return {
    id: createId(),
    name: template?.name ?? "Workout",
    startedAt,
    templateId: template?.id,
    ...assignment,
    exercises:
      template?.exercises.map(({ exerciseId, ...target }) => ({
        id: createId(),
        exerciseId,
        target,
        completed: false,
        sets: Array.from({ length: target.sets }, () => ({
          id: createId(),
          modifier: "normal" as const,
          completed: false,
        })),
      })) ?? [],
  };
}

export const DEFAULT_REST_SECONDS = 90;
const MAX_REST_SECONDS = 24 * 60 * 60;

export function restTimerAfterSet(
  workout: Workout,
  exercise: WorkoutExercise,
  previous: SetEntry | undefined,
  current: SetEntry | undefined,
  now: number,
): Pick<Workout, "restEndsAt" | "restLoggedSetKeys"> {
  if (!current || !(previous?.completed || current.completed)) return {};
  const key = JSON.stringify([exercise.id, current.id]);
  const keys = workout.restLoggedSetKeys ?? [];
  if (keys.includes(key)) return {};
  const seconds = Math.min(exercise.target?.rest ?? DEFAULT_REST_SECONDS, MAX_REST_SECONDS);
  const startsRest =
    seconds > 0 && !previous?.completed && current.completed && current.durationMin == null;
  return {
    ...(startsRest ? { restEndsAt: now + Math.round(seconds * 1000) } : {}),
    restLoggedSetKeys: [...keys, key],
  };
}
