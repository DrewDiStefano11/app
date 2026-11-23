import { exerciseById } from "../data";
import type { AppState, SetEntry, WorkoutExercise } from "../types";

const aliases: Readonly<Record<string, string>> = {
  bench: "bench-press",
  benched: "bench-press",
  "barbell bench": "bench-press",
  "dumbbell bench": "db-bench",
  "db bench": "db-bench",
  "paused bench": "light-paused-bench-press",
};

function normalized(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function exerciseName(state: AppState, row: WorkoutExercise) {
  return (
    (
      exerciseById(row.exerciseId) ??
      state.customExercises.find((item) => item.id === row.exerciseId)
    )?.name ?? row.exerciseId
  );
}

export function findActiveExercise(
  state: AppState,
  request: { exerciseId?: string; exerciseName?: string; exerciseEntryId?: string },
) {
  const rows = state.activeWorkout?.exercises ?? [];
  const name = request.exerciseName ? normalized(request.exerciseName) : undefined;
  const compatible = rows.filter(
    (row) =>
      (request.exerciseEntryId === undefined || request.exerciseEntryId === row.id) &&
      (request.exerciseId === undefined ||
        normalized(request.exerciseId) === normalized(row.exerciseId)) &&
      (name === undefined ||
        name === normalized(exerciseName(state, row)) ||
        name === normalized(row.exerciseId) ||
        (Object.hasOwn(aliases, name) && aliases[name] === row.exerciseId)),
  );
  if (
    name !== undefined ||
    request.exerciseEntryId !== undefined ||
    request.exerciseId !== undefined
  ) {
    return compatible.length === 1 ? compatible[0] : undefined;
  }
  return rows.length === 1 ? rows[0] : undefined;
}

export function nextSetRow(row: WorkoutExercise, modifier: SetEntry["modifier"]) {
  return row.sets.find(
    (set) =>
      !set.completed &&
      (modifier === "warmup" ? set.modifier === "warmup" : set.modifier !== "warmup"),
  );
}

export function describeWorkoutSet(row: WorkoutExercise, set: SetEntry) {
  const index = row.sets.findIndex((item) => item.id === set.id) + 1;
  const load = set.weight === undefined ? "" : `${set.weight} lb`;
  const reps = set.reps === undefined ? "" : `${set.reps} reps`;
  const time = set.durationMin === undefined ? "" : `${set.durationMin} min`;
  const distance = set.distanceMi === undefined ? "" : `${set.distanceMi} mi`;
  const values = [load, reps, time, distance].filter(Boolean).join(", ");
  return `set ${index}${values ? ` (${values})` : " (planned)"}`;
}

export function sameWorkoutSet(current: SetEntry, expected: SetEntry) {
  return (
    current.id === expected.id &&
    current.completed === expected.completed &&
    current.reps === expected.reps &&
    current.weight === expected.weight &&
    current.durationMin === expected.durationMin &&
    current.distanceMi === expected.distanceMi &&
    (current.modifier ?? "normal") === (expected.modifier ?? "normal")
  );
}
