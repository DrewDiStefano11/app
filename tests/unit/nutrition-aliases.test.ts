import { expect, test } from "bun:test";
import { parseNutritionAliases } from "../../src/lib/nutrition-aliases";
import { addNutritionPreset, updateNutritionPreset, favoriteNutritionPreset, replaceNutritionPreset } from "../../src/lib/saved-nutrition";
import { defaultState, type SavedNutritionPreset } from "../../src/lib/types";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";
import { parseFitCoreImport } from "../../src/lib/fitcore-data";
import { createFitCoreBackupEnvelope, inspectFitCoreBackupEnvelope } from "../../src/lib/data-backup";
import { interpretJarvisText } from "../../src/lib/jarvis/text-commands";
import { querySavedNutrition, savedFoodMatches } from "../../src/lib/jarvis/saved-food-matches";
import { createPhotoMealDraft } from "../../src/lib/jarvis/meal-photo-draft";
const preset: SavedNutritionPreset = { id: "oats", kind: "food", aliases: ["morning bowl", "PB oats"], servingLabel: "1 cup", meal: { id: "source", name: "Overnight Oats", type: "breakfast", createdAt: Date.UTC(2026, 10, 24), calories: 350, protein: 20, carbs: 45, fat: 10, confirmed: true } };

test("aliases normalize display whitespace, deduplicate common punctuation/case variants and reject invalid bounds", () => {
  expect(parseNutritionAliases([" morning   bowl ", "MORNING-BOWL", "PB oats"])).toEqual(["morning bowl", "PB oats"]);
  for (const input of [null, [1], [""], ["!!!"], ["x".repeat(81)], Array(9).fill("name")]) expect(parseNutritionAliases(input)).toBeUndefined();
  expect(parseNutritionAliases([])).toEqual([]);
});

test("aliases survive favorites, replacement and verified backup/import without changing historical meals", () => {
  const original = structuredClone(preset.meal);
  let state = addNutritionPreset({ ...structuredClone(defaultState), mealEntries: [original] }, preset);
  state = favoriteNutritionPreset(state, preset.id, true);
  state = replaceNutritionPreset(state, state.savedNutrition![0], { ...preset.meal, name: "Oats new label" });
  expect(state.savedNutrition![0]).toMatchObject({ aliases: preset.aliases, isFavorite: true });
  expect(state.mealEntries).toEqual([original]);
  const backup = createFitCoreBackupEnvelope(state, { exportedAt: new Date().toISOString() });
  expect(backup.safeToExport).toBe(true); expect(inspectFitCoreBackupEnvelope(backup.envelope).status).toBe("valid");
  expect(parseFitCoreImport(JSON.stringify(state))?.savedNutrition?.[0].aliases).toEqual(preset.aliases);
  state = updateNutritionPreset(state, preset.id, { aliases: [] });
  expect(state.savedNutrition![0].aliases).toBeUndefined();
  expect(state.mealEntries).toEqual([original]);
});

test("Jarvis matches aliases before catalog guesses, scales saved servings and clarifies collisions", () => {
  let state = addNutritionPreset(structuredClone(defaultState), preset);
  const result = interpretJarvisText("log two servings of morning bowl", state);
  expect(result).toMatchObject({ tool: "logReferenceMeal", args: { calories: 700, protein: 40, carbs: 90, fat: 20 } });
  expect(querySavedNutrition("log saved pb-oats", state)?.args.name).toBe("Overnight Oats");
  state = addNutritionPreset(state, { ...preset, id: "second", meal: { ...preset.meal, id: "second-source", name: "Different oats", calories: 500 } });
  expect(interpretJarvisText("log morning bowl", state)?.reply).toContain("multiple matches");
  expect(querySavedNutrition("log saved morning bowl", state)?.reply).toContain("Several saved foods");
});

test("unknown macros remain unreported and never fall through an alias to catalog nutrients", () => {
  const unknown: SavedNutritionPreset = { ...preset, aliases: ["banana"], meal: { id: "unknown", name: "My unknown bowl", type: "snack", createdAt: Date.now(), calories: 200, macroStatus: "unreported" } };
  const state = addNutritionPreset(structuredClone(defaultState), unknown);
  expect(interpretJarvisText("log banana", state)?.reply).toContain("unreported macros");
  expect(querySavedNutrition("log saved banana", state)).toMatchObject({ tool: "logCaloriesOnly", args: { calories: 200 } });
});

test("malformed alias imports and helper updates are rejected atomically", () => {
  const state = addNutritionPreset(structuredClone(defaultState), preset);
  const invalid = { ...state, savedNutrition: [{ ...preset, aliases: ["x".repeat(81)] }] };
  expect(validateFitCoreDataIntegrity(invalid).status).toBe("invalid");
  expect(updateNutritionPreset(state, preset.id, { aliases: [""] })).toBe(state);
  const empty = structuredClone(defaultState);
  expect(addNutritionPreset(empty, { ...preset, aliases: Array(9).fill("name") })).toBe(empty);
});

test("photo alias matching produces a reviewable saved-label choice without applying it", () => {
  const state = addNutritionPreset(structuredClone(defaultState), preset);
  const draft = createPhotoMealDraft({ name: "Photo meal", mealType: "breakfast", recipeServings: 1, servingsEaten: 1, assumptions: [], question: "", items: [{ id: "item", name: "PB oats", quantity: 1, unit: "cup", preparation: "cooked", evidence: "visible", calories: 500, protein: 10, carbs: 80, fat: 15 }] }, "photo");
  expect(savedFoodMatches(draft, state)).toHaveLength(1);
  expect(draft.items[0].calories).toBe(500);
});
