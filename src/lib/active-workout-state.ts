import { MAX_WORKOUT_TEMPLATE_SETS, type WorkoutTemplate } from "./data";
import type { Workout } from "./types";

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
