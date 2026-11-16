import type { AppState, SetEntry, Workout } from "../types";
import { WEEKDAYS } from "./scheduled-workout";

export interface BenchDate {
  workoutDate: number;
  requestedDay: boolean;
}

function localDay(timestamp: number) {
  return new Date(timestamp).toDateString();
}

function benchSets(workout: Workout): SetEntry[] {
  return workout.exercises
    .filter((row) => row.exerciseId === "bench-press")
    .flatMap((row) =>
      row.sets.filter((set) => set.completed && set.weight !== undefined && set.reps !== undefined),
    );
}

function measurements(sets: SetEntry[]) {
  return sets
    .slice(0, 20)
    .map((set) => `${set.weight} lb × ${set.reps}`)
    .join(", ");
}

function previousWeekday(now: Date, weekday: string) {
  const date = new Date(now);
  date.setDate(date.getDate() - ((date.getDay() - WEEKDAYS.indexOf(weekday) + 7) % 7 || 7));
  return date;
}

function renderBenchDate(state: AppState, date: BenchDate) {
  const label = new Date(date.workoutDate).toLocaleDateString();
  const matches = state.workouts.filter((workout) =>
    date.requestedDay
      ? localDay(workout.startedAt) === localDay(date.workoutDate)
      : workout.startedAt === date.workoutDate,
  );
  const sets = matches.flatMap(benchSets);
  return sets.length
    ? `${label}: ${measurements(sets)}.`
    : `${label}: No completed barbell bench sets in saved history.`;
}

export function queryBenchHistory(
  text: string,
  state: AppState,
  now: Date,
  prior: BenchDate[] = [],
) {
  if (text === "compare the two" && prior.length === 2) {
    return {
      reply: `Barbell Bench Press\\n${prior.map((item) => renderBenchDate(state, item)).join("\\n")}`,
      history: prior,
    };
  }
  if (/^compare today(?:'s|s) bench sets with last week(?:'s|s)$/.test(text)) {
    const today = localDay(now.getTime());
    const earlier = new Date(now);
    earlier.setHours(0, 0, 0, 0);
    const weekday = (earlier.getDay() + 6) % 7;
    const end = new Date(earlier);
    end.setDate(end.getDate() - weekday);
    earlier.setDate(earlier.getDate() - weekday - 7);
    const current = [...state.workouts, ...(state.activeWorkout ? [state.activeWorkout] : [])]
      .filter((workout) => localDay(workout.startedAt) === today)
      .flatMap(benchSets);
    const previous = state.workouts
      .filter(
        (workout) => workout.startedAt >= earlier.getTime() && workout.startedAt < end.getTime(),
      )
      .flatMap(benchSets);
    return {
      reply: `Barbell Bench Press\\nToday: ${current.length ? measurements(current) : "no completed sets logged"}.\\nLast week: ${previous.length ? measurements(previous) : "no completed sets logged"}.`,
      history: [],
    };
  }

  const names = WEEKDAYS.join("|");
  const direct = new RegExp(
    `^(?:what did i bench|how much did i bench|what was my bench weight)(?: last (${names}))?$`,
  ).exec(text);
  const followUp = prior.length
    ? new RegExp(`^what about (?:last )?(${names})$`).exec(text)
    : undefined;
  if (!direct && !followUp) return undefined;
  const weekday = direct?.[1] ?? followUp?.[1];
  const latest = weekday
    ? undefined
    : [...state.workouts]
        .sort((a, b) => b.startedAt - a.startedAt)
        .find((workout) => benchSets(workout).length > 0);
  const date = weekday
    ? { workoutDate: previousWeekday(now, weekday).getTime(), requestedDay: true }
    : latest
      ? { workoutDate: latest.startedAt, requestedDay: false }
      : undefined;
  if (!date)
    return { reply: "There are no completed barbell bench sets in saved history.", history: [] };
  const differentDates = prior.filter(
    (item) => localDay(item.workoutDate) !== localDay(date.workoutDate),
  );
  return {
    reply: `Barbell Bench Press. ${renderBenchDate(state, date)}`,
    history: [...differentDates, date].slice(-2),
  };
}
