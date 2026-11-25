import { nutritionPresetNames, normalizeNutritionName } from "../nutrition-aliases";
import type { AppState, SavedNutritionPreset } from "../types";
import { requiresNutritionPresetConfirmation } from "../saved-nutrition";
import type { LocalJarvisCommand } from "./text-commands";
import { photoIngredientSchema, type PhotoMealDraft } from "./meal-photo-draft";

const normalized = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function savedFoodMatches(draft: PhotoMealDraft, state: AppState) {
  return draft.items
    .flatMap((item) =>
      (state.savedNutrition ?? []).flatMap((preset) => {
        const meal = preset.meal;
        if (
          preset.kind !== "food" ||
          requiresNutritionPresetConfirmation(meal) ||
          meal.macroStatus === "unreported"
        )
          return [];
        const words = normalized(item.name)
          .split(" ")
          .filter((word) => word.length > 2);
        const savedName = normalized(meal.name);
        const aliasMatch = preset.aliases?.some(alias => normalizeNutritionName(alias) === normalizeNutritionName(item.name));
        if (!aliasMatch && (!words.length || !words.every((word) => savedName.split(" ").includes(word)))) return [];
        const serving = /^(\d+(?:\.\d+)?)\s+(g|oz|cup|tbsp|tsp|piece|serving|ml)s?$/.exec(
          preset.servingLabel ?? "",
        );
        const ingredient = photoIngredientSchema.safeParse({
          id: item.id,
          name: meal.name,
          quantity: serving ? Number(serving[1]) : 1,
          unit: serving?.[2] ?? "serving",
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          evidence: "user",
          preparation: `Saved label: ${preset.servingLabel ?? "one saved serving"}`,
        });
        return ingredient.success
          ? [
              {
                itemId: item.id,
                presetId: preset.id,
                servingLabel: preset.servingLabel ?? "one saved serving",
                ingredient: ingredient.data,
              },
            ]
          : [];
      }),
    )
    .slice(0, 12);
}

export function querySavedNutrition(text: string, state: AppState): LocalJarvisCommand | undefined {
  if (/^(?:show|list) my saved (?:foods|food library)$/i.test(text)) {
    return {
      reply:
        (state.savedNutrition ?? [])
          .filter((p) => !requiresNutritionPresetConfirmation(p.meal))
          .map((p) => `${p.meal.name} (${p.servingLabel ?? "one saved serving"})`)
          .join("\n") || "Your saved food library is empty. Save a food or meal in Fuel.",
    };
  }
  const request = /^log (?:my )?saved (.+?)(?: for (breakfast|lunch|dinner|snack))?$/i.exec(text);
  if (!request) return;
  const matches = (state.savedNutrition ?? []).filter(
    (preset) =>
      nutritionPresetNames(preset).some(name => normalizeNutritionName(name) === normalizeNutritionName(request[1])) &&
      !requiresNutritionPresetConfirmation(preset.meal),
  );
  if (matches.length !== 1)
    return {
      reply: matches.length
        ? "Several saved foods share that name. Choose the correct product and serving in Fuel's saved library."
        : "I couldn't find a confirmed saved food with that exact name. Check your Fuel library.",
    };
  return savedNutritionCommand(matches[0], text, request[2]);
}

function savedNutritionCommand(
  preset: SavedNutritionPreset,
  originalText: string,
  mealType?: string,
): LocalJarvisCommand {
  const meal = preset.meal;
  const common = {
    name: meal.name,
    mealType: mealType ?? meal.type,
    calories: meal.calories,
    originalText,
  };
  return meal.macroStatus === "unreported"
    ? { tool: "logCaloriesOnly", args: { ...common, approximate: false } }
    : {
        tool: "logReferenceMeal",
        args: {
          ...common,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ...(meal.items && {
            items: meal.items.map(({ name, qty, calories, protein, carbs, fat }) => ({
              name,
              ...(qty && { qty }),
              calories,
              protein,
              carbs,
              fat,
            })),
          }),
          confidence: "high",
          assumptions: [
            `User selected saved library values for ${preset.servingLabel ?? "one saved serving"}.`,
          ],
        },
      };
}
