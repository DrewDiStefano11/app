import { exerciseProgression, progressionExerciseId, recordedExerciseHistory } from "../exercise-progression";
import { lastExercisePerformance } from "./exercise-history";
import { exerciseById } from "../data";
import type { AppState, SetEntry, Workout } from "../types";
import { jarvisScheduledWorkout, WEEKDAYS } from "./scheduled-workout";

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
      reply: `Barbell Bench Press\n${prior.map((item) => renderBenchDate(state, item)).join("\n")}`,
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
      reply: `Barbell Bench Press\nToday: ${current.length ? measurements(current) : "no completed sets logged"}.\nLast week: ${previous.length ? measurements(previous) : "no completed sets logged"}.`,
      history: [],
    };
  }

  const names = WEEKDAYS.join("|");
  const direct = new RegExp(
    `^(?:what did i bench|how much did i bench|what was my bench weight)(?: last (${names})| last time)?$`,
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

const LEG_MUSCLES = new Set(["quads", "hamstrings", "calves", "glutes"]);

function primaryMuscles(state: AppState, exerciseId: string) {
  return (
    exerciseById(exerciseId)?.primary ??
    state.customExercises.find((row) => row.id === exerciseId)?.primary ??
    []
  );
}

function workingSet(set: SetEntry) {
  return set.completed && set.modifier !== "warmup";
}

function nextBenchPrescription(state: AppState, now: Date) {
  const active = state.activeWorkout;
  const activeBench = active?.exercises.find(
    (row) =>
      row.exerciseId === "bench-press" &&
      row.sets.some((set) => !set.completed && set.modifier !== "warmup"),
  );
  if (activeBench) {
    const load = activeBench.target?.targetWeightLb;
    return load === undefined
      ? `There is no prescribed bench load for the remaining sets in ${active?.name}.`
      : `The next working bench set in ${active?.name} is prescribed at ${load} lb.`;
  }

  const rotation =
    state.personalization.trainingRoutine?.enabled &&
    state.personalization.trainingRoutine.mode === "rotation";
  if (rotation && active)
    return "Finish the active rotation workout to resolve the next scheduled bench prescription.";
  const activeHasBench = active?.exercises.some((row) => row.exerciseId === "bench-press");
  for (let offset = 0; offset < (rotation ? 1 : 7); offset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const planned = jarvisScheduledWorkout(state, date);
    const row = planned?.template.exercises.find(
      (exercise) => exercise.exerciseId === "bench-press",
    );
    if (
      !row ||
      (offset === 0 &&
        (activeHasBench ||
          state.workouts.some(
            (workout) =>
              workout.templateId === planned?.template.id &&
              localDay(workout.startedAt) === localDay(now.getTime()) &&
              workout.exercises.some(
                (exercise) =>
                  exercise.exerciseId === "bench-press" && exercise.sets.some(workingSet),
              ),
          )))
    )
      continue;
    const label = rotation ? "the next rotation workout" : date.toLocaleDateString();
    return row.targetWeightLb === undefined
      ? `The bench in ${planned?.template.name} has no prescribed load.`
      : `The planned bench in ${planned?.template.name} (${label}) is ${row.targetWeightLb} lb.`;
  }
  return "There is no upcoming bench prescription in the current schedule.";
}

export function queryTrainingText(text: string, state: AppState, now: Date) {
  const progression = /^(?:suggest progression for|what should i lift next for|how should i progress) (.+)$/.exec(text);
  if (progression) {
    const id = progressionExerciseId(state, progression[1]);
    if (!id) return { reply: "Name one exact saved or catalog exercise for progression advice." };
    const history = recordedExerciseHistory(state.workouts, now.getTime()).get(id) ?? [];
    const target = state.activeWorkout?.exercises.find(row => row.exerciseId === id)?.target ?? history[0]?.target;
    return { reply: exerciseProgression(history, target, now.getTime()).summary };
  }
  const lastPerformance = /^(?:show|what was) (?:my )?last (.+?) performance$/.exec(text);
  if (lastPerformance) return { reply: lastExercisePerformance(state, lastPerformance[1], now).summary };
  if (/^what(?: is|'s) (?:my|the) next prescribed bench weight$/.test(text)) {
    return { reply: nextBenchPrescription(state, now) };
  }
  if (/^how many chest sets did i complete this week$/.test(text)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const workouts = [...state.workouts];
    if (
      state.activeWorkout &&
      !workouts.some((workout) => workout.id === state.activeWorkout?.id)
    ) {
      workouts.push(state.activeWorkout);
    }
    const count = workouts
      .filter(
        (workout) => workout.startedAt >= start.getTime() && workout.startedAt <= now.getTime(),
      )
      .flatMap((workout) => workout.exercises)
      .filter((row) => primaryMuscles(state, row.exerciseId).includes("chest"))
      .reduce((sum, row) => sum + row.sets.filter(workingSet).length, 0);
    return {
      reply: count
        ? `${count} completed working set${count === 1 ? "" : "s"} this week for exercises that primarily train chest.`
        : "There are no completed working sets logged this week for exercises that primarily train chest.",
    };
  }
  if (/^show (?:my )?last (?:three|3) leg workouts$/.test(text)) {
    const legs = state.workouts.filter(
      (workout) =>
        workout.startedAt <= now.getTime() &&
        workout.exercises.some(
          (row) =>
            row.sets.some(workingSet) &&
            primaryMuscles(state, row.exerciseId).some((muscle) => LEG_MUSCLES.has(muscle)),
        ),
    );
    const latest = legs.sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
    return {
      reply: latest.length
        ? latest
            .map(
              (workout) => `${new Date(workout.startedAt).toLocaleDateString()}: ${workout.name}`,
            )
            .join("\n")
        : "There are no saved workouts with completed leg working sets.",
    };
  }
  if (/^what(?: is|'s) my bench progression$/.test(text)) {
    const recent = [...state.workouts]
      .filter((workout) => workout.startedAt <= now.getTime())
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((workout) => ({ date: workout.startedAt, sets: benchSets(workout).filter(workingSet) }))
      .filter((row) => row.sets.length)
      .slice(0, 5);
    return {
      reply: recent.length
        ? `Recent completed bench working sets\n${recent
            .reverse()
            .map((row) => `${new Date(row.date).toLocaleDateString()}: ${measurements(row.sets)}`)
            .join("\n")}`
        : "There are no saved bench working sets to compare.",
    };
  }
}
