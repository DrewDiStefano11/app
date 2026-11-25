import { EXERCISES } from "../data";
import type { AppState, DataProvenance, SetEntry } from "../types";

const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const confirmed = (value: { provenance?: DataProvenance }) => value.provenance?.confirmation !== "unconfirmed";
const positive = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value > 0;

function recordedSet(set: SetEntry) {
  return set.completed && confirmed(set) && set.modifier !== "warmup"
    && [set.weight, set.reps, set.durationMin, set.distanceMi].every(value => value === undefined || (Number.isFinite(value) && value >= 0))
    && (positive(set.reps) || positive(set.durationMin) || positive(set.distanceMi));
}

export function describeRecordedSet(set: SetEntry) {
  const parts: string[] = [];
  if (positive(set.reps)) parts.push(set.weight === undefined ? `${set.reps} reps` : `${set.weight} lb × ${set.reps}`);
  else if (positive(set.weight)) parts.push(`${set.weight} lb`);
  if (positive(set.durationMin)) parts.push(`${set.durationMin} min`);
  if (positive(set.distanceMi)) parts.push(`${set.distanceMi} mi`);
  if (set.modifier && set.modifier !== "normal") parts.push(`(${set.modifier})`);
  return parts.join(" · ");
}

/** Read-only history across tracking modes; completion time defines the latest session. */
export function lastExercisePerformance(state: AppState, request: unknown, now = new Date()) {
  const name = typeof request === "string" ? normalized(request) : "";
  if (!name) return { ok: false, summary: "Which exercise should I look up?", data: null };
  const catalog = [...EXERCISES, ...state.customExercises];
  const alias = name === "bench" || name === "barbell bench" ? "bench-press" : name === "db bench" || name === "dumbbell bench" ? "db-bench" : undefined;
  const matches = catalog.filter(row => normalized(row.id) === name || normalized(row.name) === name || row.id === alias);
  const ids = [...new Set(matches.map(row => row.id))];
  if (ids.length > 1) return { ok: false, summary: "More than one exercise has that name. Please use its exercise ID.", data: null };
  // Retain records for deleted custom definitions when their exact stored ID is supplied.
  const id = ids[0] ?? state.workouts.flatMap(workout => workout.exercises).find(row => normalized(row.exerciseId) === name)?.exerciseId;
  if (!id) return { ok: false, summary: "No matching exercise found. Use its exact saved name or exercise ID.", data: null };
  let latest: { workout: string; workoutId: string; when: number; completedAt: number; sets: SetEntry[] } | null = null;
  for (const workout of state.workouts) {
    const end = workout.endedAt;
    if (workout.id === state.activeWorkout?.id || !confirmed(workout)
      || !Number.isFinite(workout.startedAt) || workout.startedAt <= 0
      || end === undefined || !Number.isFinite(end) || end < workout.startedAt || end > now.getTime()) continue;
    const sets = workout.exercises.filter(row => row.exerciseId === id && confirmed(row)).flatMap(row => row.sets.filter(recordedSet));
    if (!sets.length) continue;
    if (!latest || end > latest.completedAt || (end === latest.completedAt && workout.id.localeCompare(latest.workoutId) < 0)) {
      latest = { workout: workout.name, workoutId: workout.id, when: workout.startedAt, completedAt: end, sets };
    }
  }
  const label = matches.find(row => row.id === id)?.name ?? id;
  return {
    ok: true,
    summary: latest ? `Last ${label}: ${latest.sets.map(describeRecordedSet).join(", ")} (${new Date(latest.completedAt).toLocaleDateString()}; ${latest.workout}).` : `No previous completed working sets found for ${label}.`,
    data: latest,
  };
}
