import type { AppState } from "../types";
import { queryLibraryMeal } from "./food-reference";
import type { LocalJarvisCommand } from "./text-commands";

export const USUAL_MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "proteinShake",
  "preWorkout",
  "postWorkout",
] as const;

type Slot = (typeof USUAL_MEAL_SLOTS)[number];

export const usualMealSlots = {
  breakfast: { field: "usualBreakfast", label: "breakfast", type: "breakfast" },
  lunch: { field: "usualLunch", label: "lunch", type: "lunch" },
  dinner: { field: "usualDinner", label: "dinner", type: "dinner" },
  snack: { field: "usualSnack", label: "snack", type: "snack" },
  proteinShake: { field: "usualProteinShake", label: "protein shake", type: "snack" },
  preWorkout: { field: "usualPreWorkoutMeal", label: "pre-workout meal", type: "pre-workout" },
  postWorkout: { field: "usualPostWorkoutMeal", label: "post-workout meal", type: "post-workout" },
} as const;

export const mealMacroFields = ["calories", "protein", "carbs", "fat"] as const;
type MealMacros = Record<(typeof mealMacroFields)[number], number>;

export interface UsualMealPreference {
  name?: string;
  macros?: MealMacros;
}

export function readMealMacros(value: unknown): MealMacros | undefined {
  if (!value || typeof value !== "object") return undefined;
  const macros = value as MealMacros;
  if (mealMacroFields.some((key) => !Number.isFinite(macros[key]) || macros[key] < 0))
    return undefined;
  const { calories, protein, carbs, fat } = macros;
  return { calories, protein, carbs, fat };
}

export function readUsualMeal(state: AppState, slot: Slot): UsualMealPreference {
  const name = state.userGoalsProfile[usualMealSlots[slot].field];
  return {
    name,
    macros: name ? readMealMacros(state.jarvisLearning[`usualMeal_${slot}`]) : undefined,
  };
}

export function writeUsualMeal(state: AppState, slot: Slot, meal: UsualMealPreference): AppState {
  const key = `usualMeal_${slot}`;
  const jarvisLearning = { ...state.jarvisLearning };
  if (meal.name && meal.macros) jarvisLearning[key] = meal.macros;
  else delete jarvisLearning[key];
  return {
    ...state,
    userGoalsProfile: { ...state.userGoalsProfile, [usualMealSlots[slot].field]: meal.name },
    jarvisLearning,
  };
}

export function isUsualMealSlot(slot: unknown): slot is Slot {
  return typeof slot === "string" && Object.hasOwn(usualMealSlots, slot);
}

export function queryUsualMeals(text: string, state: AppState): LocalJarvisCommand | undefined {
  if (/^(?:show|list) my (?:saved|usual) meals$/i.test(text)) {
    const meals = USUAL_MEAL_SLOTS.flatMap((slot) => {
      const { name, macros } = readUsualMeal(state, slot);
      return name
        ? [
            `Usual ${usualMealSlots[slot].label}: ${name}${macros ? ` (${macros.calories} kcal)` : " (macros needed)"}.`,
          ]
        : [];
    });
    return { reply: meals.join("\n") || "There are no usual meals saved." };
  }

  const action = /^(log|forget|delete|remember|change|correct) (?:my )?usual (.+)$/i.exec(text);
  if (!action) return undefined;
  const verb = action[1].toLowerCase(),
    request = action[2];
  if (verb === "log" || verb === "forget" || verb === "delete") {
    const target = request.toLowerCase();
    const matches = USUAL_MEAL_SLOTS.filter((slot) => {
      const { name } = readUsualMeal(state, slot);
      return name && (usualMealSlots[slot].label === target || name.toLowerCase() === target);
    });
    if (matches.length !== 1)
      return {
        reply: matches.length
          ? "Which saved meal slot do you mean?"
          : "I couldn't find that saved meal.",
      };
    return {
      tool: verb === "log" ? "logUsualMeal" : "deleteUsualMeal",
      args: { slot: matches[0] },
    };
  }

  const change = /^(.+?) (?:as|to) (.+)$/i.exec(request);
  const slot = USUAL_MEAL_SLOTS.find(
    (key) => usualMealSlots[key].label === change?.[1].toLowerCase(),
  );
  if (!change || !slot)
    return {
      reply: "Choose a usual meal slot, such as breakfast or lunch, and tell me what to save.",
    };

  const reference = queryLibraryMeal(`i ate ${change[2].toLowerCase()}`, "");
  if (reference && "tool" in reference) {
    const macros = readMealMacros(reference.args);
    if (macros)
      return { tool: "saveUsualMeal", args: { slot, name: reference.args.name, ...macros } };
  }
  const measured =
    /^(.+?),\s*(\d+(?:\.\d+)?)\s*(?:kcal|calories),\s*(\d+(?:\.\d+)?)\s*g protein,\s*(\d+(?:\.\d+)?)\s*g carbs,\s*(\d+(?:\.\d+)?)\s*g fat$/i.exec(
      change[2],
    );
  if (!measured)
    return {
      reply:
        "Give me a food and portion from the FitCore food library, or specify the meal name, calories, grams of protein, grams of carbs, and grams of fat.",
    };
  const [, name, calories, protein, carbs, fat] = measured;
  return {
    tool: "saveUsualMeal",
    args: {
      slot,
      name,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
    },
  };
}
