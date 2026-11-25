import { todayMealEntries } from "../analytics/observed-fitness";
import { calculateMealTotals } from "../analytics/domain-metrics";
import { queryLibraryMeal, queryLibraryMealWithSaved } from "./food-reference";
import { queryMealPortion } from "./meal-portion";
import { queryRecoveryText, type RecoveryDraft } from "./recovery-text";
import { queryBenchHistory, queryTrainingText, type BenchDate } from "./workout-queries";
import { jarvisScheduledWorkout, WEEKDAYS } from "./scheduled-workout";
import { queryUsualMeals } from "./usual-meals";
import { querySavedNutrition } from "./saved-food-matches";
import type { AppState, WorkoutExercise } from "../types";
import { exerciseName, findActiveExercise } from "./active-exercise";
import type { ToolName } from "./tools";

interface ActiveExerciseReference {
  workoutId: string;
  exerciseEntryId: string;
}

interface SetDraft {
  workoutId: string;
  exerciseEntryId?: string;
  load: string;
  unit?: string;
  reps: number;
  modifier?: "warmup" | "unilateral";
  firstWorkingSet: boolean;
}

export interface JarvisTextContext {
  setCorrection?: { workoutId: string; exerciseEntryId: string; setId: string; expected: string; weight: string; reps: number };
  mixedDraft?: { clauses: string[]; resolved: (Extract<LocalJarvisCommand, { tool: string }> | null)[]; index: number; pendingContext?: Omit<JarvisTextContext, "mixedDraft"> };
  focusedExercise?: ActiveExerciseReference;
  benchHistory?: BenchDate[];
  lastMealId?: string;
  sleepHours?: number;
  recovery?: RecoveryDraft;
  cardioSteps?: number;
  setDraft?: SetDraft;
  repeatSet?: ActiveExerciseReference & { sourceSetId: string; weight: number };
}

export type LocalJarvisCommand = (
  { reply: string } | { tool: ToolName; args: Record<string, unknown> }
) & { nextContext?: Partial<JarvisTextContext> };

const HOUR_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

const LOAD = "(\\d+(?:\\.\\d+)?)\\s*(kg|kilograms?|lbs?|pounds?)?";
const LOAD_UNIT = /^(?:in )?(kg|kilograms?|lbs?|pounds?)$/;
const SET = new RegExp(`^${LOAD}\\s+(?:for|x|×)\\s*(\\d+)(?:\\s+reps?)?$`, "i");
const BODYWEIGHT = new RegExp(
  `^(?:i weigh|(?:log )?(?:my )?(?:bodyweight|weight)(?: is)?)\\s+${LOAD}(?:\\s+today)?$`,
  "i",
);
const BENCH = new RegExp(
  `^(?:i (?:just )?benched|(?:log )?(?:my (?:first )?)?(?:(?:barbell )?bench|dumbbell bench)(?: set)?(?: at)?)\\s+(${LOAD}\\s+(?:for|x|×)\\s*(\\d+)(?:\\s+reps?)?)$`,
  "i",
);
const NAMED_SET =
  /^(?:log )?(?:my |an? )?(?:(warm[- ]?up|unilateral|working) )?(.*?)\bset(?: (?:of|for) (.+?))? at (.+)$/;

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

function reviewSetDraft(
  state: AppState,
  draft: SetDraft,
  row?: WorkoutExercise,
): LocalJarvisCommand {
  if (state.activeWorkout?.id !== draft.workoutId || (draft.exerciseEntryId && !row))
    return { reply: "The active workout changed. Tell me the exercise, weight, and reps again." };
  if (!row) {
    return {
      reply: "Which exercise in your active workout did you mean?",
      nextContext: { setDraft: draft },
    };
  }
  if (draft.firstWorkingSet && row.sets.find((set) => set.modifier !== "warmup")?.completed) {
    return {
      reply:
        "The first working set already has results. Ask to correct that set or log another one.",
    };
  }
  if (!draft.unit && state.profile.units === "kg") {
    return {
      reply: "Was that load in kilograms or pounds?",
      nextContext: { setDraft: { ...draft, exerciseEntryId: row.id } },
    };
  }
  return {
    tool: "logExerciseSet",
    args: {
      exerciseEntryId: row.id,
      weight: pounds(draft.load, draft.unit),
      reps: draft.reps,
      ...(draft.modifier ? { modifier: draft.modifier } : {}),
    },
  };
}

function workoutSet(
  text: string,
  state: AppState,
  context: JarvisTextContext,
): LocalJarvisCommand | undefined {
  const repeat = context.repeatSet;
  const repeatCount = /^(\d+)(?: reps?)?$/.exec(text)?.[1];
  const active = state.activeWorkout;
  const draft = context.setDraft;
  if (draft?.exerciseEntryId) {
    const unit = LOAD_UNIT.exec(text)?.[1];
    if (unit) {
      const row = findActiveExercise(state, { exerciseEntryId: draft.exerciseEntryId });
      return reviewSetDraft(state, { ...draft, unit }, row);
    }
  } else if (draft) {
    const row = findActiveExercise(state, { exerciseName: text });
    if (row) return reviewSetDraft(state, draft, row);
  }
  if (repeat && repeatCount) {
    const row =
      active?.id === repeat.workoutId
        ? active.exercises.find((exercise) => exercise.id === repeat.exerciseEntryId)
        : undefined;
    if (
      !row?.sets.some(
        (set) => set.id === repeat.sourceSetId && set.completed && set.weight === repeat.weight,
      )
    ) {
      return {
        reply:
          "The referenced set has changed. Tell me the exercise, weight, and reps for the new set.",
      };
    }
    return {
      tool: "logExerciseSet",
      args: { exerciseEntryId: row.id, weight: repeat.weight, reps: Number(repeatCount) },
    };
  }
  const focused = context.focusedExercise;
  const focusId = active?.id === focused?.workoutId ? focused?.exerciseEntryId : undefined;
  const bench = BENCH.exec(text);
  const named = NAMED_SET.exec(text);
  const entry = SET.exec(bench?.[1] ?? named?.[4] ?? text.replace(/^log /, ""));
  if (entry) {
    if (!active) return { reply: "Start a workout before logging a set." };
    const exercise = bench ? (text.includes("dumbbell") ? "db-bench" : "bench-press") : undefined;
    const exerciseName = named?.[3] || named?.[2].trim() || undefined;
    const qualifier = named?.[1];
    const modifier = qualifier?.startsWith("warm")
      ? "warmup"
      : qualifier === "unilateral"
        ? "unilateral"
        : undefined;
    const row = findActiveExercise(state, {
      exerciseId: exercise,
      exerciseName: exercise ? undefined : exerciseName,
      exerciseEntryId: exercise || exerciseName ? undefined : focusId,
    });
    return reviewSetDraft(
      state,
      {
        workoutId: active.id,
        load: entry[1],
        unit: entry[2],
        reps: Number(entry[3]),
        modifier,
        firstWorkingSet: Boolean(bench && /\bfirst\b/.test(text)),
      },
      row,
    );
  }

  const planned = /^add (?:another|a fifth|a 5th) (?:planned )?set$/.exec(text);
  if (planned) {
    const row = findActiveExercise(state, { exerciseEntryId: focusId });
    if (!row) return { reply: "Which active exercise should get an extra planned set?" };
    return {
      tool: "addPlannedExerciseSet",
      args: {
        exerciseEntryId: row.id,
        ...(text.includes("fifth") || text.includes("5th") ? { expectedCount: 4 } : {}),
      },
    };
  }
  if (/^i finished all (?:four|4) sets of bench$/.test(text)) {
    const row = findActiveExercise(state, { exerciseId: "bench-press" });
    const sets = row?.sets.filter((set) => set.modifier !== "warmup");
    if (!sets) return { reply: "Barbell Bench Press is not in the current workout." };
    if (sets.filter((set) => set.completed).length >= 4)
      return { reply: "Four completed bench sets are already recorded." };
    return {
      reply: "Tell me the actual weight and reps for the bench sets still missing from the log.",
    };
  }
  const timed = /^(?:log|i did) (.+) for (\d+(?:\.\d+)?) (minutes?|seconds?)$/.exec(text);
  if (timed) {
    const row = findActiveExercise(state, { exerciseName: timed[1] });
    if (row)
      return {
        tool: "logExerciseSet",
        args: {
          exerciseEntryId: row.id,
          durationMin: Number(timed[2]) / (timed[3].startsWith("second") ? 60 : 1),
        },
      };
  }
  const pendingCorrection = context.setCorrection;
  const correctionUnit = pendingCorrection ? LOAD_UNIT.exec(text)?.[1] : undefined;
  if (pendingCorrection && correctionUnit) {
    const row = active?.exercises.find(item => item.id === pendingCorrection.exerciseEntryId);
    const current = row?.sets.find(item => item.id === pendingCorrection.setId);
    if (active?.id !== pendingCorrection.workoutId || JSON.stringify(current) !== pendingCorrection.expected) {
      return { reply: "That set changed while you were clarifying. Review its current values before correcting it." };
    }
    return { tool: "updateExerciseSet", args: { setId: pendingCorrection.setId, patch: { weight: pounds(pendingCorrection.weight, correctionUnit), reps: pendingCorrection.reps } } };
  }
  const completeCorrection = new RegExp(`^(?:actually,? (?:that|it) was|(?:that|it) was|make that)\\s+${LOAD}\\s+(?:for|x|×)\\s*(\\d+)(?:\\s*reps?)?$`).exec(text);
  if (completeCorrection) {
    const latest = latestActiveJarvisSet(state);
    if (!latest || !active) return { reply: "Which completed set should I correct?" };
    if (!completeCorrection[2] && state.profile.units === "kg") {
      return { reply: "Was that corrected load in kilograms or pounds?", nextContext: { setCorrection: {
        workoutId: active.id, exerciseEntryId: latest.row.id, setId: latest.set.id,
        expected: JSON.stringify(latest.set), weight: completeCorrection[1], reps: Number(completeCorrection[3]),
      } } };
    }
    return { tool: "updateExerciseSet", args: { setId: latest.set.id, patch: { weight: pounds(completeCorrection[1], completeCorrection[2]), reps: Number(completeCorrection[3]) } } };
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
    if (!count && active)
      return {
        reply: `How many reps at ${latest.set.weight} lb?`,
        nextContext: {
          repeatSet: {
            workoutId: active.id,
            exerciseEntryId: latest.row.id,
            sourceSetId: latest.set.id,
            weight: latest.set.weight,
          },
        },
      };
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
  context: JarvisTextContext = {},
): LocalJarvisCommand | undefined {
  const normalized = raw
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ");
  const text = normalized.toLowerCase();
  if (/\b(?:prescription|prescribed|planned target)\b/.test(text) && /\d\s*[×x]\s*\d/.test(text)) {
    return {
      reply: "Tell me the weight and reps you actually completed when you are ready to log a set.",
    };
  }

  const set = workoutSet(text, state, context);
  if (set) return set;
  const sleep =
    /^(?:i slept|log sleep(?: of)?) (\d+(?:\.\d+)?|[a-z]+)( and a half)? hours?(?:,? quality (\d+)(?:\s*\/\s*10)?)?$/.exec(
      text,
    );
  if (sleep) {
    const value = /^\d/.test(sleep[1]) ? Number(sleep[1]) : HOUR_WORDS.indexOf(sleep[1]);
    const hours = value + (sleep[2] ? 0.5 : 0);
    if (hours <= 0 || hours > 24)
      return { reply: "Enter a sleep duration above 0 and up to 24 hours." };
    if (!sleep[3])
      return {
        reply: `You reported ${hours} hours. How would you rate your sleep quality from 1 to 10?`,
        nextContext: { sleepHours: hours },
      };
    return { tool: "logSleep", args: { hours, quality: Number(sleep[3]) } };
  }
  if (context.sleepHours !== undefined) {
    const quality = /^(?:quality )?(\d+)(?:\s*(?:\/|out of)\s*10)?$/.exec(text);
    if (quality)
      return { tool: "logSleep", args: { hours: context.sleepHours, quality: Number(quality[1]) } };
  }

  const recovery = queryRecoveryText(text, state, now, context.recovery);
  if (recovery) return recovery;

  const cardio =
    /^(?:(?:log|i did) (\d+(?:\.\d+)?) minutes? (?:on |of )?(?:the )?(stairmaster|(?:incline )?treadmill|rowing|bike)|i walked on (?:an? )?((?:incline )?treadmill) for (\d+(?:\.\d+)?) minutes?)$/.exec(
      text,
    );
  if (cardio) {
    return {
      tool: "logCardio",
      args: {
        type: cardio[2] ?? cardio[3],
        minutes: Number(cardio[1] ?? cardio[4]),
        originalText: raw,
      },
    };
  }
  const steps = /^(?:log|i did) (\d{1,3}(?:,\d{3})+|\d+) steps on (?:the )?stairmaster$/.exec(text);
  if (steps) {
    const count = Number(steps[1].replaceAll(",", ""));
    if (!Number.isSafeInteger(count) || count <= 0)
      return { reply: "Enter a positive whole number of steps." };
    return {
      reply:
        "How many minutes did you spend on the StairMaster? I'll include the reported steps as a note.",
      nextContext: { cardioSteps: count },
    };
  }
  if (context.cardioSteps !== undefined) {
    const duration = /^(\d+(?:\.\d+)?) minutes?$/.exec(text);
    if (duration)
      return {
        tool: "logCardio",
        args: {
          type: "StairMaster",
          minutes: Number(duration[1]),
          notes: `Reported steps: ${context.cardioSteps}`,
        },
      };
  }

  const weightCorrection = new RegExp(
    `^(?:correct|change) (today|yesterday)(?:'s|s) (?:body)?weight to ${LOAD}$`,
  ).exec(text);
  if (weightCorrection) {
    const date = new Date(now);
    if (weightCorrection[1] === "yesterday") date.setDate(date.getDate() - 1);
    const matches = state.bodyweightEntries.filter(
      (entry) => new Date(entry.createdAt).toDateString() === date.toDateString(),
    );
    if (matches.length !== 1)
      return {
        reply: matches.length
          ? "There are multiple weigh-ins on that date. Choose the one to correct in Progress."
          : "There is no weigh-in saved on that date.",
      };
    return {
      tool: "updateBodyWeight",
      args: {
        id: matches[0].id,
        weightLb: pounds(weightCorrection[2], weightCorrection[3] ?? state.profile.units),
      },
    };
  }
  if (/^what was my (?:body)?weight last week$/.test(text)) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const start = new Date(date);
    start.setDate(start.getDate() - 7);
    const latest = [...state.bodyweightEntries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .find((entry) => entry.createdAt >= start.getTime() && entry.createdAt < date.getTime());
    return {
      reply: latest
        ? `Your latest weigh-in last week was ${latest.weightLb} lb on ${new Date(latest.createdAt).toLocaleDateString()}.`
        : "There are no weigh-ins from last week.",
    };
  }

  const weight = BODYWEIGHT.exec(text);
  if (weight) {
    const unit = weight[2] ?? state.profile.units;
    return {
      tool: "logBodyWeight",
      args: { weightLb: pounds(weight[1], unit), originalText: raw },
    };
  }

  const supplement =
    /^(?:log|i took) (?:(?:(\d+(?:\.\d+)?\s*(?:g|mg|grams?|milligrams?))\s+of|my)\s+)?(creatine|multivitamin)(?: today)?$/.exec(
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
  const saved = querySavedNutrition(normalized, state);
  if (saved) return saved;
  const usual = queryUsualMeals(normalized, state);
  if (usual) return usual;
  if (/^undo (?:the |my |that )?(?:last|most recent) meal$/.test(text)) {
    const meal = [...state.mealEntries]
      .reverse()
      .sort((a, b) => b.createdAt - a.createdAt)
      .find((entry) => entry.createdAt <= now.getTime());
    if (!meal) return { reply: "There are no saved meals to undo." };
    const log = state.jarvisAudit.find(
      (entry) =>
        entry.id === meal.auditId &&
        entry.entityIds?.includes(meal.id) &&
        entry.entityKind === "meal" &&
        !entry.undone &&
        entry.status === "logged",
    );
    return log
      ? { tool: "undoLastAction", args: { targetAuditId: log.id } }
      : { reply: `Open Nutrition to remove or correct your latest meal, ${meal.name}.` };
  }
  if (/^undo(?: that)?(?: (?:last|most recent)(?: (?:entry|action|change))?)?$/.test(text)) {
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

  const training = queryTrainingText(text, state, now);
  if (training) return training;

  const caloriesOnly =
    /^(?:i (?:had|ate)|log) (about |around |roughly )?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:calories|kcal)(?: for (breakfast|lunch|dinner|snack))?$/.exec(
      text,
    );
  if (caloriesOnly)
    return {
      tool: "logCaloriesOnly",
      args: {
        calories: Number(caloriesOnly[2].replaceAll(",", "")),
        approximate: Boolean(caloriesOnly[1]),
        mealType: caloriesOnly[3] ?? "snack",
        originalText: raw,
      },
    };

  const referenceMeal = queryLibraryMealWithSaved(text, raw, state) ?? queryLibraryMeal(text, raw);
  if (referenceMeal) return referenceMeal;

  const correction = queryMealPortion(text, state, context.lastMealId);
  if (correction) return correction;

  const history = queryBenchHistory(text, state, now, context.benchHistory);
  if (history) return { reply: history.reply, nextContext: { benchHistory: history.history } };

  if (/^show (?:everything|what) i(?:'ve| have) eaten today$/.test(text)) {
    const meals = todayMealEntries(state, now.getTime());
    return {
      reply: meals.length
        ? meals
            .slice(0, 20)
            .map((meal) => {
              const estimate = meal.provenance?.source === "ai-estimated" ? " (estimate)" : "";
              const protein =
                meal.macroStatus === "unreported"
                  ? "macros unreported"
                  : `${meal.protein} g protein`;
              return `${meal.name}: ${meal.calories} kcal, ${protein}${estimate}.`;
            })
            .join("\n")
        : "There are no meals logged today.",
    };
  }

  const supplementStatus = /^did i (?:log|take) (?:my )?(creatine|multivitamin)(?: today)?$/.exec(
    text,
  );
  if (supplementStatus) {
    const name = supplementStatus[1];
    const logs = state.supplementLogs.filter(
      (entry) =>
        new Date(entry.createdAt).toDateString() === now.toDateString() &&
        entry.name.toLowerCase().includes(name),
    );
    return {
      reply: logs.length
        ? `Today's log includes ${logs.map((entry) => (entry.dose ? `${entry.name} (${entry.dose})` : entry.name)).join(", ")}.`
        : `There is no ${name} entry in today's log.`,
    };
  }

  if (/^how (?:much protein|many calories) have i (?:eaten|logged)(?: today)?$/.test(text)) {
    const meals = todayMealEntries(state, now.getTime());
    if (!meals.length) return { reply: "There are no meals logged today." };
    const protein = text.includes("protein");
    const missing = meals.filter((meal) => meal.macroStatus === "unreported").length;
    const totals = calculateMealTotals(meals);
    const total = protein ? totals.protein : totals.calories;
    if (protein && missing) {
      const recorded =
        missing === meals.length
          ? "No protein amounts have been logged today."
          : `${Math.round(total)} g of protein are recorded so far.`;
      return {
        reply: `${recorded} ${missing} ${missing === 1 ? "meal has" : "meals have"} unreported macros.`,
      };
    }
    return {
      reply: `Today's meal log totals ${Math.round(total)} ${protein ? "g of protein" : "kcal"}, including any saved estimates.`,
    };
  }
}
