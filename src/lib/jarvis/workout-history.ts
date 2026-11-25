import type { AppState, Workout } from "../types";
import { normalizeText } from "./action-audit";

/** Saved completion timestamps, not storage/import order, define the last completed session. */
export function lastWorkoutByType(state: AppState, request: unknown, now = new Date()) {
  const query = typeof request === "string" ? normalizeText(request) : "";
  if (!query) return { ok: false, summary: "Which workout name or type should I look up?", data: null };
  let last: Workout | undefined;
  for (const workout of state.workouts) {
    const end = workout.endedAt;
    if (!normalizeText(workout.name).includes(query) || workout.id === state.activeWorkout?.id
      || workout.provenance?.confirmation === "unconfirmed"
      || !Number.isFinite(workout.startedAt) || workout.startedAt <= 0
      || end === undefined || !Number.isFinite(end) || end < workout.startedAt || end > now.getTime()) continue;
    if (!last || end > last.endedAt! || (end === last.endedAt && workout.id.localeCompare(last.id) < 0)) last = workout;
  }
  return { ok: true, summary: last ? `Last completed ${query} workout: ${last.name} (${new Date(last.endedAt!).toLocaleDateString()}).` : `No confirmed completed ${query} workout found.`, data: last ?? null };
}
