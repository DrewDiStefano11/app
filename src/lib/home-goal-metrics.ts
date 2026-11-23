import type { AppState } from "./types";
import type { WhoopSnapshot } from "./whoop/dashboard";
import { selectSleepEvidence, selectWhoopEvidence } from "./whoop/evidence";
import { dayKey, last7DaysWindow } from "./analytics/date-time";
import { calculateWorkoutVolume, todayMealEntries } from "./analytics/observed-fitness";
import { calculateMealTotals } from "./analytics/domain-metrics";
import { safeSum } from "./analytics/safe-math";

/** Transient provider measurements stay outside profile, logs and backups. */
export function homeGoalMetrics(
  state: AppState,
  snapshot?: WhoopSnapshot | null,
  now = Date.now(),
) {
  const window = last7DaysWindow(now);
  const workouts = state.workouts.filter(
    (workout) =>
      Number.isFinite(workout.startedAt) &&
      workout.startedAt >= window.start &&
      workout.startedAt <= now,
  );
  const meals = todayMealEntries(state, now);
  const totals = calculateMealTotals(meals);
  const cycle = state.demoMode ? null : selectWhoopEvidence(snapshot, now)?.cycle;
  const steps = cycle && dayKey(Date.parse(cycle.at)) === dayKey(now) ? cycle.steps : null;
  const lastSleep = selectSleepEvidence(state, snapshot, now).last;
  const recentSleep = lastSleep && now - lastSleep.at <= 48 * 3600000 ? lastSleep : null;
  return {
    weeklyWorkouts: workouts.length,
    volumeLb: safeSum(workouts.map(calculateWorkoutVolume)),
    volumeTargetLb: state.profile.weeklyVolumeGoalLb ?? null,
    steps,
    sleepHours: recentSleep?.hours ?? null,
    sleepSource: recentSleep?.source ?? null,
    protein: meals.some((meal) => meal.macroStatus === "unreported") ? null : totals.protein,
    calories: totals.calories,
  };
}

/** Keep the internal target independent of display units and remove blank targets. */
export function withVolumeGoal(state: AppState, targetLb: number | null): AppState {
  if (targetLb !== null && (!Number.isFinite(targetLb) || targetLb <= 0)) return state;
  const profile = { ...state.profile };
  if (targetLb === null) delete profile.weeklyVolumeGoalLb;
  else profile.weeklyVolumeGoalLb = targetLb;
  return { ...state, profile };
}
