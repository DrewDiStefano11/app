import { parseNutritionAliases } from "./nutrition-aliases";
import type { Food } from "./data";
import { shouldRequireConfirmation } from "./fitcore-data";
import type { AppState, DataProvenance, MealEntry, SavedNutritionPreset } from "./types";

// ---- public helpers used by food library ----

/** Unique foods consumed recently, most-recent first (deduplicated by normalised name). */
export function recentlyConsumedFoods(state: AppState, limit = 10): MealEntry[] {
  const seen = new Set<string>();
  const result: MealEntry[] = [];
  const sorted = [...state.mealEntries].sort((a, b) => b.createdAt - a.createdAt);
  for (const meal of sorted) {
    const key = meal.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(meal);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** Most-logged foods, highest count first. */
export function frequentlyConsumedFoods(state: AppState, limit = 10): MealEntry[] {
  const counts = new Map<string, { meal: MealEntry; count: number }>();
  for (const meal of state.mealEntries) {
    const key = meal.name.trim().toLowerCase();
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
      // keep the most recent MealEntry as the representative
      if (meal.createdAt > entry.meal.createdAt) entry.meal = meal;
    } else {
      counts.set(key, { meal, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.meal.createdAt - a.meal.createdAt)
    .slice(0, limit)
    .map((e) => e.meal);
}

/** Update a saved preset's editable fields (name/servingLabel/kind/isFavorite).
 *  Does NOT retroactively change historical meal log entries. */
export function updateNutritionPreset(
  state: AppState,
  id: string,
  updates: Partial<Pick<SavedNutritionPreset, "servingLabel" | "kind" | "isFavorite" | "aliases">>,
): AppState {
  const presets = state.savedNutrition ?? [];
  const index = presets.findIndex((p) => p.id === id);
  if (index < 0) return state;
  const aliases = updates.aliases === undefined ? undefined : parseNutritionAliases(updates.aliases);
  if (updates.aliases !== undefined && !aliases) return state;
  const updated = { ...presets[index], ...updates, ...(aliases && { aliases }) };
  if (aliases && !aliases.length) delete updated.aliases;
  return {
    ...state,
    savedNutrition: presets.map((p, i) => (i === index ? updated : p)),
  };
}

/** Remove a saved preset by id.  Historical meal log entries are not affected. */
export function removeNutritionPreset(state: AppState, id: string): AppState {
  const presets = state.savedNutrition ?? [];
  if (!presets.some((p) => p.id === id)) return state;
  return { ...state, savedNutrition: presets.filter((p) => p.id !== id) };
}

/** Toggle (or explicitly set) the isFavorite flag on a saved preset. */
export function favoriteNutritionPreset(state: AppState, id: string, favorite: boolean): AppState {
  return updateNutritionPreset(state, id, { isFavorite: favorite });
}

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
  const aliases = preset.aliases === undefined ? undefined : parseNutritionAliases(preset.aliases);
  if (preset.aliases !== undefined && !aliases) return state;
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
  const { id, kind, servingLabel, isFavorite } = preset;
  return {
    ...state,
    savedNutrition: [
      ...saved,
      {
        id,
        kind,
        meal,
        ...(servingLabel && { servingLabel }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(aliases?.length && { aliases }),
      },
    ],
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
