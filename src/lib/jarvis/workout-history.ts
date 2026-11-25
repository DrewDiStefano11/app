import type { AppState, Workout } from "../types";
import { normalizeText } from "./action-audit";

function eligibleWorkout(workout: Workout, state: AppState, now: Date) {
  return workout.id !== state.activeWorkout?.id && workout.provenance?.confirmation !== "unconfirmed"
    && Number.isFinite(workout.startedAt) && workout.startedAt > 0
    && workout.endedAt !== undefined && Number.isFinite(workout.endedAt)
    && workout.endedAt >= workout.startedAt && workout.endedAt <= now.getTime();
}

export function recentCompletedWorkoutHistory(state: AppState, requestedDays: unknown, now = new Date()) {
  const days = typeof requestedDays === "number" && Number.isFinite(requestedDays) ? Math.min(90, Math.max(1, requestedDays)) : 30;
  const cutoff = now.getTime() - days * 86400000;
  const workouts = state.workouts.filter(workout => eligibleWorkout(workout, state, now) && workout.endedAt! >= cutoff)
    .sort((a, b) => b.endedAt! - a.endedAt! || a.id.localeCompare(b.id));
  return { ok: true, summary: `${workouts.length} workouts`, data: workouts };
}

/** Saved completion timestamps, not storage/import order, define the last completed session. */
export function lastWorkoutByType(state: AppState, request: unknown, now = new Date()) {
  const query = typeof request === "string" ? normalizeText(request) : "";
  if (!query) return { ok: false, summary: "Which workout name or type should I look up?", data: null };
  let last: Workout | undefined;
  for (const workout of state.workouts) {
    const end = workout.endedAt;
    if (!normalizeText(workout.name).includes(query) || !eligibleWorkout(workout, state, now)) continue;
    if (!last || end! > last.endedAt! || (end === last.endedAt && workout.id.localeCompare(last.id) < 0)) last = workout;
  }
  return { ok: true, summary: last ? `Last completed ${query} workout: ${last.name} (${new Date(last.endedAt!).toLocaleDateString()}).` : `No confirmed completed ${query} workout found.`, data: last ?? null };
}
