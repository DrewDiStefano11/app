import { workoutPersonalRecords } from "./analytics/training-detail-metrics";
import type { CustomExercise, PR, Workout } from "./types";

export const e1RM = (weight: number, reps: number) => Math.round(weight * (1 + reps / 30));

export function workoutRecordImprovements(
  workout: Workout,
  history: readonly Workout[],
  customExercises: readonly CustomExercise[],
  now = Date.now(),
) {
  const previous = new Map(
    workoutPersonalRecords(history, customExercises, { now }).map((record) => [
      record.exerciseId,
      record.value,
    ]),
  );
  return workoutPersonalRecords([workout], customExercises, { includeActive: true, now }).filter(
    (record) => record.value > (previous.get(record.exerciseId) ?? 0),
  );
}

export function applyWorkoutPersonalRecords(
  existing: PR[],
  records: readonly PR[],
  id: () => string,
  date: number,
) {
  const next = [...existing];
  for (const record of records) {
    const index = next.findIndex(
      (item) => item.exerciseId === record.exerciseId && item.type === "1rm",
    );
    const entry: PR = { ...record, id: id(), date };
    if (index >= 0) next[index] = entry;
    else next.push(entry);
  }
  return next;
}
