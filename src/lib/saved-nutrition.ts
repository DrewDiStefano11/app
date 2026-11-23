import type { Food } from "./data";
import { shouldRequireConfirmation } from "./fitcore-data";
import type { AppState, DataProvenance, MealEntry, SavedNutritionPreset } from "./types";

export function foodMeal(food: Food, type: string, id: string, createdAt = Date.now()): MealEntry {
  const { name, calories, protein, carbs, fat, fiber, servingLabel } = food;
  const item = { name, qty: servingLabel, calories, protein, carbs, fat };
  return { id, name, type, createdAt, calories, protein, carbs, fat, fiber, items: [item] };
}

function evidence({ source, confidence, confirmation }: DataProvenance): DataProvenance {
  return { source, confidence, confirmation };
}

function mealDefinition(meal: MealEntry) {
  return {
    name: meal.name,
    type: meal.type,
    calories: meal.calories,
    ...(meal.macroStatus === "unreported"
      ? { macroStatus: "unreported" as const }
      : { protein: meal.protein, carbs: meal.carbs, fat: meal.fat }),
    ...(meal.fiber !== undefined && { fiber: meal.fiber }),
    ...(meal.items && {
      items: meal.items.map((item) =>
        item.provenance ? { ...item, provenance: evidence(item.provenance) } : item,
      ),
    }),
    ...(meal.source !== undefined && { source: meal.source }),
    ...(meal.confidence !== undefined && { confidence: meal.confidence }),
    ...(meal.confirmed !== undefined && { confirmed: meal.confirmed }),
    ...(meal.provenance && { provenance: evidence(meal.provenance) }),
  };
}

export function requiresNutritionPresetConfirmation(meal: MealEntry): boolean {
  return meal.provenance
    ? shouldRequireConfirmation(meal)
    : (meal.source === "camera" || meal.source === "jarvis") && meal.confirmed !== true;
}

export function addNutritionPreset(state: AppState, preset: SavedNutritionPreset): AppState {
  if (requiresNutritionPresetConfirmation(preset.meal)) return state;
  const saved = state.savedNutrition ?? [];
  const definition = JSON.stringify(mealDefinition(preset.meal));
  if (
    saved.some(
      (item) =>
        item.id === preset.id ||
        (item.kind === preset.kind &&
          item.servingLabel === preset.servingLabel &&
          JSON.stringify(mealDefinition(item.meal)) === definition),
    )
  )
    return state;

  const meal = copyMealForLog(preset.meal, preset.meal.id, preset.meal.createdAt);
  const { id, kind, servingLabel } = preset;
  return {
    ...state,
    savedNutrition: [...saved, { id, kind, meal, ...(servingLabel && { servingLabel }) }],
  };
}

export function copyMealForLog(meal: MealEntry, id: string, createdAt = Date.now()): MealEntry {
  return { id, createdAt, ...mealDefinition(meal) };
}

export function replaceNutritionPreset(
  state: AppState,
  reviewed: SavedNutritionPreset,
  meal: MealEntry,
): AppState {
  const presets = state.savedNutrition ?? [];
  const index = presets.findIndex((preset) => preset.id === reviewed.id);
  if (index < 0 || JSON.stringify(presets[index]) !== JSON.stringify(reviewed)) return state;

  const withoutOriginal = {
    ...state,
    savedNutrition: presets.filter((_, position) => position !== index),
  };
  const updated = addNutritionPreset(withoutOriginal, { ...reviewed, meal });
  if (updated === withoutOriginal) return state;

  const replacement = updated.savedNutrition!.at(-1)!;
  return {
    ...state,
    savedNutrition: presets.map((preset, position) => (position === index ? replacement : preset)),
  };
}
