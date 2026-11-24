import type { AppState, DataProvenance } from "../types";
import type { WhoopSnapshot } from "../whoop/dashboard";
import { selectSleepEvidence } from "../whoop/evidence";
import { whoopDailyHistory } from "../whoop/history";
import { addCalendarDays, calendarDaysWindow, dayKey, startOfDay } from "./date-time";
import {
  calculateWorkoutVolume,
  recordedRecoveryCheckIns,
  recoveryCheckInReadinessScore,
} from "./observed-fitness";
import { correlateDailySeries, type DatedValue } from "./fitcore-insight-readiness";

export const CORRELATION_METRICS = {
  calories: { label: "Calories", unit: "kcal", description: "Sum of logged calories per day." },
  protein: {
    label: "Protein",
    unit: "g",
    description: "Logged protein totals; days with unreported macros are omitted.",
  },
  volume: {
    label: "Training volume",
    unit: "lb × reps",
    description:
      "Completed-set weight × repetitions on logged session dates; missing workout days are omitted.",
  },
  sleep: {
    label: "Sleep",
    unit: "h",
    description:
      "Selected main sleep per local wake date, using the same WHOOP/manual selection as Recovery.",
  },
  hrv: {
    label: "HRV",
    unit: "ms",
    description: "Latest scored WHOOP HRV per local day, only while the snapshot is authorized.",
  },
  rhr: {
    label: "Resting heart rate",
    unit: "bpm",
    description: "Latest scored WHOOP resting heart rate per current-device local day.",
  },
  recovery: {
    label: "WHOOP recovery",
    unit: "%",
    description:
      "Latest scored WHOOP recovery per local wake date, linked to its main sleep when available.",
  },
  nextRecovery: {
    label: "Next-day WHOOP recovery",
    unit: "%",
    description:
      "Actual WHOOP recovery on the following local calendar day. No missing-day substitution; correlation does not imply causation.",
  },
  sleepPerformance: {
    label: "Sleep performance",
    unit: "%",
    description:
      "Latest scored WHOOP main-sleep performance per local wake date; naps are excluded.",
  },
  strain: {
    label: "WHOOP strain",
    unit: "strain",
    description: "Latest scored WHOOP physiological-cycle strain per current-device local day.",
  },
  soreness: {
    label: "Soreness",
    unit: "/10",
    description: "Average recorded check-in soreness per day.",
  },
  weight: {
    label: "Bodyweight",
    unit: "lb",
    description: "Last logged weigh-in per local day; profile weight is not a measurement.",
  },
  readiness: {
    label: "Check-in readiness",
    unit: "/100",
    description:
      "Average readiness from the four recorded check-in ratings; this excludes wearable-derived readiness.",
  },
} as const;

export type CorrelationMetric = keyof typeof CORRELATION_METRICS;
type DailyValue = { timestamp: number; value: number; count: number };

function confirmed(provenance?: DataProvenance) {
  return (
    provenance?.confirmation !== "unconfirmed" &&
    (provenance?.source !== "ai-estimated" || provenance.confirmation === "confirmed")
  );
}

/** Pure same-local-day analysis. No missing dates or profile defaults become observations. */
export function recordedCorrelation(
  state: AppState,
  left: CorrelationMetric,
  right: CorrelationMetric,
  days: number,
  snapshot?: WhoopSnapshot | null,
  now = Date.now(),
) {
  const range = calendarDaysWindow(days, now);
  const maps = Object.fromEntries(
    Object.keys(CORRELATION_METRICS).map((key) => [key, new Map<string, DailyValue>()]),
  ) as Record<CorrelationMetric, Map<string, DailyValue>>;
  const included = (at: number) => Number.isFinite(at) && at > 0 && at >= range.start && at <= now;
  const put = (
    metric: CorrelationMetric,
    at: number,
    value: number,
    mode: "sum" | "last" = "sum",
  ) => {
    if (!included(at) || !Number.isFinite(value)) return;
    const day = dayKey(at);
    const previous = maps[metric].get(day);
    if (mode === "last" && previous && previous.timestamp > at) return;
    maps[metric].set(day, {
      timestamp: at,
      value: mode === "sum" ? (previous?.value ?? 0) + value : value,
      count: mode === "sum" ? (previous?.count ?? 0) + 1 : 1,
    });
  };
  const incompleteProteinDays = new Set<string>();
  for (const meal of state.mealEntries) {
    if (!included(meal.createdAt) || !confirmed(meal.provenance)) continue;
    if (meal.calories >= 0) put("calories", meal.createdAt, meal.calories);
    if (meal.macroStatus === "unreported") incompleteProteinDays.add(dayKey(meal.createdAt));
    else if (meal.protein >= 0) put("protein", meal.createdAt, meal.protein);
  }
  for (const day of incompleteProteinDays) maps.protein.delete(day);
  for (const workout of state.workouts) {
    const at = workout.endedAt ?? workout.startedAt;
    if (!confirmed(workout.provenance)) continue;
    put(
      "volume",
      at,
      calculateWorkoutVolume({
        ...workout,
        exercises: workout.exercises
          .filter((exercise) => confirmed(exercise.provenance))
          .map((exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((set) => confirmed(set.provenance)),
          })),
      }),
    );
  }
  for (const entry of [...state.bodyweightEntries].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  )) {
    if (entry.weightLb > 0 && confirmed(entry.provenance))
      put("weight", entry.createdAt, entry.weightLb, "last");
  }
  for (const entry of recordedRecoveryCheckIns(state)) {
    put("soreness", entry.createdAt, entry.soreness);
    put("readiness", entry.createdAt, recoveryCheckInReadinessScore(entry));
  }
  for (const metric of ["soreness", "readiness"] as const) {
    for (const entry of maps[metric].values()) entry.value /= entry.count;
  }
  for (const entry of selectSleepEvidence(state, snapshot, now).allNights)
    put("sleep", entry.at, entry.hours, "last");
  const authorized = state.demoMode ? null : snapshot;
  for (const metric of ["hrv", "rhr", "recovery", "sleepPerformance", "strain"] as const) {
    for (const entry of whoopDailyHistory(authorized, metric, days, now))
      put(metric, Date.parse(entry.at), entry.value, "last");
  }
  for (const entry of whoopDailyHistory(authorized, "recovery", days + 1, now))
    put("nextRecovery", addCalendarDays(entry.timestamp, -1), entry.value, "last");
  const series = (metric: CorrelationMetric): DatedValue[] =>
    [...maps[metric].values()]
      .filter((entry) => Number.isFinite(entry.value))
      .map((entry) => ({ timestamp: startOfDay(entry.timestamp), value: entry.value }))
      .sort((a, b) => a.timestamp - b.timestamp);
  const x = series(left);
  const y = series(right);
  const rightByDay = new Map(y.map((entry) => [dayKey(entry.timestamp), entry.value]));
  const pairs = x.flatMap((entry) => {
    const match = rightByDay.get(dayKey(entry.timestamp));
    return match === undefined
      ? []
      : [{ date: dayKey(entry.timestamp), timestamp: entry.timestamp, x: entry.value, y: match }];
  });
  const result = correlateDailySeries(`progress.comparison.${left}.${right}`, x, y, [left, right]);
  if (left === right)
    Object.assign(result, {
      status: "unavailable",
      coefficient: null,
      direction: null,
      strength: null,
      reason: "Choose two different metrics to compare.",
    });
  return {
    result,
    pairs,
    range,
    left: CORRELATION_METRICS[left],
    right: CORRELATION_METRICS[right],
  };
}
