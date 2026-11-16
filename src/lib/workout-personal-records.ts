import type { PR, Workout } from "./types";

export const e1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

export interface WorkoutRecord {
  exerciseId: string;
  est: number;
  weight: number;
  reps: number;
}

export function workoutPersonalRecords(workout: Workout, existing: PR[]): WorkoutRecord[] {
  const records = new Map<string, WorkoutRecord>();
  for (const exercise of workout.exercises) {
    const previous = existing.find(
      (record) => record.exerciseId === exercise.exerciseId && record.type === "1rm",
    );
    for (const set of exercise.sets) {
      if (!set.completed || !set.weight || !set.reps || set.modifier === "warmup") continue;
      const estimate = e1RM(set.weight, set.reps);
      if (
        (previous && estimate <= previous.value) ||
        estimate <= (records.get(exercise.exerciseId)?.est ?? 0)
      )
        continue;
      records.set(exercise.exerciseId, {
        exerciseId: exercise.exerciseId,
        est: estimate,
        weight: set.weight,
        reps: set.reps,
      });
    }
  }
  return [...records.values()];
}

export function applyWorkoutPersonalRecords(
  existing: PR[],
  records: WorkoutRecord[],
  id: () => string,
  date: number,
) {
  const next = [...existing];
  for (const record of records) {
    const index = next.findIndex(
      (item) => item.exerciseId === record.exerciseId && item.type === "1rm",
    );
    const entry: PR = {
      id: id(),
      exerciseId: record.exerciseId,
      type: "1rm",
      value: record.est,
      weight: record.weight,
      reps: record.reps,
      date,
    };
    if (index >= 0) next[index] = entry;
    else next.push(entry);
  }
  return next;
}
