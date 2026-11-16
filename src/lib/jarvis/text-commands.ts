import { exerciseById } from "../data";
import { jarvisScheduledWorkout, WEEKDAYS } from "./scheduled-workout";
import type { AppState } from "../types";
import { exerciseName, findActiveExercise } from "./active-exercise";
import type { ToolName } from "./tools";

export type LocalJarvisCommand =
  { reply: string } | { tool: ToolName; args: Record<string, unknown> };

const LOAD = "(\\d+(?:\\.\\d+)?)\\s*(kg|kilograms?|lbs?|pounds?)?";
const SET = new RegExp(`^${LOAD}\\s+(?:for|x|×)\\s*(\\d+)(?:\\s+reps?)?$`, "i");
const BODYWEIGHT = new RegExp(
  `^(?:i weigh|(?:log )?(?:my )?(?:bodyweight|weight)(?: is)?)\\s+${LOAD}(?:\\s+today)?$`,
  "i",
);
const BENCH = new RegExp(
  `^(?:i (?:just )?benched|(?:log )?(?:my (?:first )?)?(?:(?:barbell )?bench|dumbbell bench)(?: set)?(?: at)?)\\s+(${LOAD}\\s+(?:for|x|×)\\s*(\\d+)(?:\\s+reps?)?)$`,
  "i",
);

function pounds(value: string, unit: string | undefined) {
  return unit && (unit === "kg" || unit.startsWith("kilogram"))
    ? Math.round(Number(value) * 2.2046226218 * 100) / 100
    : Number(value);
}

function latestActiveJarvisSet(state: AppState) {
  const active = state.activeWorkout;
  if (!active) return undefined;
  const latest = state.jarvisAudit.find(
    (audit) =>
      !audit.undone && audit.tool === "logExerciseSet" && audit.patch?.workoutId === active.id,
  );
  const row = active.exercises.find((exercise) => exercise.id === latest?.patch?.exerciseEntryId);
  const set = row?.sets.find((item) => item.completed && item.id === latest?.entityIds?.[0]);
  return row && set ? { row, set } : undefined;
}

function workoutSet(text: string, state: AppState): LocalJarvisCommand | undefined {
  const bench = BENCH.exec(text);
  const entry = SET.exec(bench?.[1] ?? text.replace(/^log /, ""));
  if (entry) {
    const exercise = bench ? (text.includes("dumbbell") ? "db-bench" : "bench-press") : undefined;
    const row = findActiveExercise(state, { exerciseId: exercise });
    if (!state.activeWorkout) return { reply: "Start a workout before logging a set." };
    if (!row) return { reply: "Which exercise in your active workout did you mean?" };
    if (!entry[2] && state.profile.units === "kg") {
      return { reply: "Was that load in kilograms or pounds?" };
    }
    return {
      tool: "logExerciseSet",
      args: {
        exerciseEntryId: row.id,
        weight: pounds(entry[1], entry[2]),
        reps: Number(entry[3]),
      },
    };
  }

  const correction =
    /^make that (\d+(?:\.\d+)?)(?: (lb|lbs|pounds?|kg))?(?: instead of (\d+(?:\.\d+)?))?$/.exec(
      text,
    );
  if (correction) {
    const latest = latestActiveJarvisSet(state);
    if (!latest || (correction[3] && latest.set.weight !== Number(correction[3]))) {
      return { reply: "Which completed set should I correct?" };
    }
    if (!correction[2] && state.profile.units === "kg")
      return { reply: "Was that load in kilograms or pounds?" };
    return {
      tool: "updateExerciseSet",
      args: {
        setId: latest.set.id,
        patch: { weight: pounds(correction[1], correction[2]) },
      },
    };
  }

  if (
    /^(?:add |log |i did )?another set(?: (?:with the )?same weight)?(?: for \d+(?: reps?)?)?$/.test(
      text,
    )
  ) {
    const latest = latestActiveJarvisSet(state);
    if (!latest || latest.set.weight === undefined)
      return { reply: "Which exercise and weight should I use?" };
    const count = /for (\d+)/.exec(text)?.[1];
    if (!count) return { reply: `How many reps at ${latest.set.weight} lb?` };
    return {
      tool: "logExerciseSet",
      args: {
        exerciseEntryId: latest.row.id,
        weight: latest.set.weight,
        reps: Number(count),
      },
    };
  }
  if (/^(?:remove|delete) (?:that |the )?last set$/.test(text)) {
    const latest = latestActiveJarvisSet(state);
    return latest
      ? { tool: "deleteExerciseSet", args: { setId: latest.set.id } }
      : { reply: "Which completed set should I remove?" };
  }
}

export function interpretJarvisText(
  raw: string,
  state: AppState,
  now = new Date(),
): LocalJarvisCommand | undefined {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
  if (/\b(?:prescription|prescribed|planned target)\b/.test(text) && /\d\s*[×x]\s*\d/.test(text)) {
    return {
      reply: "Tell me the weight and reps you actually completed when you are ready to log a set.",
    };
  }

  const set = workoutSet(text, state);
  if (set) return set;
  const weight = BODYWEIGHT.exec(text);
  if (weight) {
    const unit = weight[2] ?? state.profile.units;
    return {
      tool: "logBodyWeight",
      args: { weightLb: pounds(weight[1], unit), originalText: raw },
    };
  }

  const supplement =
    /^(?:log|i took) (?:(\d+(?:\.\d+)?\s*(?:g|mg|grams?|milligrams?)\s+of|my)\s+)?(creatine|multivitamin)(?: today)?$/.exec(
      text,
    );
  if (supplement)
    return {
      tool: "logSupplement",
      args: {
        name: supplement[2],
        ...(supplement[1] ? { dose: supplement[1] } : {}),
        originalText: raw,
      },
    };
  if (/^undo(?: that)?(?: (?:last|most recent)(?: (?:meal|entry|action|change))?)?$/.test(text)) {
    if (text.endsWith("meal")) {
      const last = state.jarvisAudit.find((a) => !a.undone && a.status === "logged");
      if (last?.entityKind !== "meal")
        return {
          reply:
            "The most recent Jarvis action was not a meal. Select the meal in Jarvis activity or Nutrition.",
        };
    }
    return { tool: "undoLastAction", args: {} };
  }
  if (/^(?:(?:finish|end) (?:my|the) workout|i finished my workout)$/.test(text)) {
    return { tool: "finishActiveWorkout", args: {} };
  }

  const start =
    /^start (?:my |the )?(today(?:'s)?|next scheduled|sunday|monday|tuesday|wednesday|thursday|friday|saturday) workout$/.exec(
      text,
    );
  if (start) {
    const weekday = WEEKDAYS.indexOf(start[1]);
    return { tool: "startScheduledWorkout", args: weekday >= 0 ? { weekday } : {} };
  }

  const timer = /^start (?:a )?(\d+)[ -]?(second|sec|minute|min)s? (?:rest )?timer$/.exec(text);
  if (timer)
    return {
      tool: "startRestTimer",
      args: { seconds: Number(timer[1]) * (timer[2].startsWith("m") ? 60 : 1) },
    };
  if (
    /^(?:how much (?:rest time|time) (?:do i have(?: left)?|is left)(?: on (?:my|the) (?:rest )?timer)?|rest timer)$/.test(
      text,
    )
  ) {
    const remaining = Math.ceil(((state.activeWorkout?.restEndsAt ?? 0) - now.getTime()) / 1_000);
    return {
      reply:
        remaining > 0
          ? `Your rest timer has ${remaining} seconds left.`
          : "There is no running rest timer.",
    };
  }

  if (/^how many sets (?:do i have left|are left)$/.test(text)) {
    const count = state.activeWorkout?.exercises.reduce(
      (sum, row) =>
        sum + row.sets.filter((item) => !item.completed && item.modifier !== "warmup").length,
      0,
    );
    return {
      reply:
        count === undefined
          ? "There is no active workout."
          : `${count} planned working sets remaining in this workout.`,
    };
  }
  if (/^(?:what exercise is next|next exercise)$/.test(text)) {
    const row = state.activeWorkout?.exercises.find((item) =>
      item.sets.some((working) => !working.completed && working.modifier !== "warmup"),
    );
    return {
      reply: row
        ? `Next planned work: ${exerciseName(state, row)}.`
        : "There are no remaining planned sets in an active workout.",
    };
  }
  if (
    /^(?:show today(?:'s|s) workout|what am i supposed to train tomorrow|what is today(?:'s|s) workout)$/.test(
      text,
    )
  ) {
    const date = new Date(now);
    const tomorrow = text.endsWith("tomorrow");
    if (tomorrow) date.setDate(date.getDate() + 1);
    if (!tomorrow && state.activeWorkout)
      return { reply: `Active workout: ${state.activeWorkout.name}.` };
    const planned = jarvisScheduledWorkout(state, date);
    return {
      reply: planned?.template
        ? `Scheduled workout: ${planned.template.name}.`
        : "There is no workout scheduled for that day.",
    };
  }

  const benchHistory =
    /^(?:what did i bench|what was my bench weight)(?: last (sunday|monday|tuesday|wednesday|thursday|friday|saturday))?$/.exec(
      text,
    );
  if (benchHistory) {
    const date = new Date(now);
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    if (benchHistory[1])
      date.setDate(
        date.getDate() - ((date.getDay() - weekdays.indexOf(benchHistory[1]) + 7) % 7 || 7),
      );
    const history = state.workouts.filter(
      (workout) =>
        workout.endedAt !== undefined &&
        (!benchHistory[1] || new Date(workout.startedAt).toDateString() === date.toDateString()),
    );
    const results = [...history]
      .sort((a, b) => b.startedAt - a.startedAt)
      .flatMap((workout) => {
        const sets = workout.exercises
          .filter((row) => row.exerciseId === "bench-press")
          .flatMap((row) =>
            row.sets.filter(
              (item) => item.completed && item.weight !== undefined && item.reps !== undefined,
            ),
          );
        return sets.length
          ? [
              `${new Date(workout.startedAt).toLocaleDateString()}: ${sets.map((item) => `${item.weight} lb × ${item.reps}`).join(", ")}`,
            ]
          : [];
      });
    return {
      reply: results[0]
        ? `${exerciseById("bench-press")?.name}: ${results[0]}.`
        : "No completed barbell bench sets were logged for that request.",
    };
  }

  if (/^how (?:much protein|many calories) have i (?:eaten|logged)(?: today)?$/.test(text)) {
    const meals = state.mealEntries.filter(
      (meal) => new Date(meal.createdAt).toDateString() === now.toDateString(),
    );
    if (!meals.length) return { reply: "There are no meals logged today." };
    const protein = text.includes("protein");
    const total = meals.reduce((sum, meal) => sum + (protein ? meal.protein : meal.calories), 0);
    return {
      reply: `Today's meal log totals ${Math.round(total)} ${protein ? "g of protein" : "kcal"}, including any saved estimates.`,
    };
  }
}
