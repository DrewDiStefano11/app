import type { AppState } from "../types";
import { calendarDaysWindow, dateRangeContains, dayKey, type DateRange } from "./date-time";
import { getExerciseAndMuscleAnalytics } from "./training-detail-metrics";

function period(state: AppState, range: DateRange, days: number, now: number) {
  const workouts = state.workouts.filter(workout => workout.provenance?.confirmation !== "unconfirmed"
    && typeof workout.endedAt === "number" && dateRangeContains(range, workout.endedAt))
    .map(workout => ({ ...workout, exercises: workout.exercises.filter(row => row.provenance?.confirmation !== "unconfirmed")
      .map(row => ({ ...row, sets: row.sets.filter(set => set.provenance?.confirmation !== "unconfirmed" && set.modifier !== "warmup" && set.completed && Number.isInteger(set.reps) && set.reps! > 0 && typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0) })).filter(row => row.sets.length > 0) })).filter(workout => workout.exercises.length > 0);
  const analytics = getExerciseAndMuscleAnalytics({ ...state, workouts }, { now, historyDays: days * 2 + 1, comparisonDays: days });
  const exercises = analytics.exercises.filter(exercise => exercise.validSetCount > 0).sort((a, b) => b.totalVolume - a.totalVolume || a.identity.id.localeCompare(b.identity.id));
  const ids = new Set(exercises.flatMap(exercise => exercise.sourceWorkoutIds));
  const trainingDays = new Set(exercises.flatMap(exercise => exercise.performanceDates).map(dayKey));
  return { range, volume: exercises.reduce((sum, exercise) => sum + exercise.totalVolume, 0),
    sets: exercises.reduce((sum, exercise) => sum + exercise.validSetCount, 0), sessions: ids.size, trainingDays: trainingDays.size,
    exercises, muscles: analytics.muscleGroups.groups.filter(group => group.validSetCount > 0),
    hasData: exercises.length > 0, muscleCoverage: analytics.muscleGroups.metadataCoveragePercent };
}
/** Read-only equal calendar periods. Uses the existing validated exercise/muscle engine and completion dates. */
export function trainingPeriodComparison(state: AppState, days: 7 | 30, now = Date.now()) {
  const current = period(state, calendarDaysWindow(days, now), days, now);
  const previous = period(state, calendarDaysWindow(days, now, days), days, now);
  return { days, current, previous,
    changePercent: current.hasData && previous.hasData && previous.volume > 0 ? (current.volume - previous.volume) / previous.volume * 100 : null };
}
