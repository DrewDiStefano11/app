import { expect, test } from "bun:test";
import {
  addNutritionPreset,
  updateNutritionPreset,
  removeNutritionPreset,
  favoriteNutritionPreset,
  recentlyConsumedFoods,
  frequentlyConsumedFoods,
  replaceNutritionPreset,
} from "../../src/lib/saved-nutrition";
import {
  defaultState,
  type AppState,
  type MealEntry,
  type SavedNutritionPreset,
} from "../../src/lib/types";
import { queryLibraryMealWithSaved } from "../../src/lib/jarvis/food-reference";
import { interpretJarvisText } from "../../src/lib/jarvis/text-commands";
import { parseFitCoreImport } from "../../src/lib/fitcore-data";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";
import {
  createFitCoreBackupEnvelope,
  inspectFitCoreBackupEnvelope,
} from "../../src/lib/data-backup";

const createdAt = Date.UTC(2026, 10, 16, 18);

test("catalog-only Jarvis meals retain the established confidence and source assumptions", () => {
  const command = interpretJarvisText(
    "I ate a banana and two slices of whole wheat bread.",
    defaultState,
  );
  expect(command?.tool).toBe("logReferenceMeal");
  expect(command?.args.confidence).toBe("medium");
  expect(command?.args.assumptions).toEqual(["Used FitCore food library serving values."]);
});

test("saved food quantities honor base units, fractions and serving counts", () => {
  const preset = confirmedPreset({ servingLabel: "100 g" });
  const state = stateWithPreset(preset);
  for (const [text, expected] of [
    ["log 200 grams of overnight oats", 700],
    ["log 1/2 servings of overnight oats", 175],
    ["log 50 g of overnight oats", 175],
    ["log two servings of overnight oats", 700],
  ] as const) {
    const command = queryLibraryMealWithSaved(text, text, state);
    expect(command?.tool).toBe("logReferenceMeal");
    expect(command?.args.calories).toBe(expected);
  }
  const cupState = stateWithPreset(confirmedPreset());
  const text = "log 1/2 cup of overnight oats";
  expect(queryLibraryMealWithSaved(text, text, cupState)?.args.calories).toBe(175);
});

test("saved food quantities never turn invalid or incompatible units into one serving", () => {
  const state = stateWithPreset(confirmedPreset());
  for (const text of [
    "log 200 grams of overnight oats",
    "log zero servings of overnight oats",
    "log 1/0 servings of overnight oats",
    "log 11 servings of overnight oats",
  ]) {
    const command = queryLibraryMealWithSaved(text, text, state);
    expect(command?.reply).toBeTruthy();
    expect(command?.tool).toBeUndefined();
  }
});

test("favorite presets survive validation, backup import and preset replacement without editing history", () => {
  const preset = confirmedPreset({ isFavorite: true });
  const historical = loggedMeal("Historical meal", 500, 0);
  const state = { ...stateWithPreset(preset), mealEntries: [historical] };
  const before = JSON.stringify(state);
  const next = replaceNutritionPreset(state, preset, { ...preset.meal, calories: 400 });
  expect(next.savedNutrition?.[0].isFavorite).toBe(true);
  expect(next.mealEntries).toEqual([historical]);
  expect(JSON.stringify(state)).toBe(before);
  expect(validateFitCoreDataIntegrity(next).status).toBe("valid");
  const backup = createFitCoreBackupEnvelope(next, {
    exportedAt: new Date(createdAt).toISOString(),
  });
  expect(backup.safeToExport).toBe(true);
  expect(backup.requiresReview).toBe(false);
  expect(inspectFitCoreBackupEnvelope(backup.envelope).status).toBe("valid");
  expect(backup.envelope?.payload.savedNutrition).toEqual(next.savedNutrition);
  expect(parseFitCoreImport(JSON.stringify(next))?.savedNutrition?.[0].isFavorite).toBe(true);
  const malformed = {
    ...next,
    savedNutrition: [{ ...next.savedNutrition![0], isFavorite: "yes" }],
  };
  expect(validateFitCoreDataIntegrity(malformed).status).toBe("invalid");
});

function confirmedPreset(overrides: Partial<SavedNutritionPreset> = {}): SavedNutritionPreset {
  return {
    id: "preset-1",
    kind: "food",
    servingLabel: "1 cup",
    meal: {
      id: "meal-1",
      name: "Overnight Oats",
      type: "breakfast",
      createdAt,
      calories: 350,
      protein: 20,
      carbs: 45,
      fat: 8,
      confirmed: true,
    },
    ...overrides,
  };
}

function stateWithPreset(preset: SavedNutritionPreset): AppState {
  return { ...defaultState, savedNutrition: [preset] };
}

function loggedMeal(name: string, calories: number, daysAgo = 0): MealEntry {
  return {
    id: `meal-${name}-${daysAgo}`,
    name,
    type: "lunch",
    createdAt: createdAt - daysAgo * 86_400_000,
    calories,
    protein: 20,
    carbs: 30,
    fat: 10,
  };
}

// ---- updateNutritionPreset ----
test("updateNutritionPreset updates servingLabel without touching other fields", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  const next = updateNutritionPreset(state, "preset-1", { servingLabel: "200g" });
  expect(next.savedNutrition![0].servingLabel).toBe("200g");
  expect(next.savedNutrition![0].meal.name).toBe("Overnight Oats");
});

test("updateNutritionPreset is a no-op for unknown id", () => {
  const state = stateWithPreset(confirmedPreset());
  expect(updateNutritionPreset(state, "nope", { servingLabel: "1g" })).toBe(state);
});

// ---- removeNutritionPreset ----
test("removeNutritionPreset removes by id", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  const next = removeNutritionPreset(state, "preset-1");
  expect(next.savedNutrition).toHaveLength(0);
});

test("removeNutritionPreset is a no-op for unknown id", () => {
  const state = stateWithPreset(confirmedPreset());
  expect(removeNutritionPreset(state, "unknown")).toBe(state);
});

// ---- favoriteNutritionPreset ----
test("favoriteNutritionPreset sets isFavorite flag", () => {
  const state = stateWithPreset(confirmedPreset());
  const favored = favoriteNutritionPreset(state, "preset-1", true);
  expect(favored.savedNutrition![0].isFavorite).toBe(true);
  const unfavored = favoriteNutritionPreset(favored, "preset-1", false);
  expect(unfavored.savedNutrition![0].isFavorite).toBe(false);
});

// ---- Duplicate prevention already in addNutritionPreset ----
test("addNutritionPreset prevents duplicate by name+macros", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  // Adding the same preset again under a different id should be blocked
  const dup: SavedNutritionPreset = { ...preset, id: "preset-2" };
  const next = addNutritionPreset(state, dup);
  expect(next).toBe(state);
});

// ---- recentlyConsumedFoods ----
test("recentlyConsumedFoods returns most recent unique meals", () => {
  const meals: MealEntry[] = [
    loggedMeal("Chicken Bowl", 500, 0),
    loggedMeal("Chicken Bowl", 500, 1), // duplicate name — should collapse
    loggedMeal("Oats", 300, 2),
    loggedMeal("Salmon", 400, 3),
  ];
  const state = { ...defaultState, mealEntries: meals };
  const recent = recentlyConsumedFoods(state, 10);
  expect(recent).toHaveLength(3);
  expect(recent[0].name).toBe("Chicken Bowl"); // most recent first
});

test("recentlyConsumedFoods respects limit", () => {
  const meals: MealEntry[] = Array.from({ length: 15 }, (_, i) => loggedMeal(`Food ${i}`, 200, i));
  const state = { ...defaultState, mealEntries: meals };
  expect(recentlyConsumedFoods(state, 5)).toHaveLength(5);
});

// ---- frequentlyConsumedFoods ----
test("frequentlyConsumedFoods ranks by count", () => {
  const meals: MealEntry[] = [
    loggedMeal("Chicken", 400, 0),
    loggedMeal("Chicken", 400, 1),
    loggedMeal("Chicken", 400, 2),
    loggedMeal("Oats", 300, 3),
    loggedMeal("Oats", 300, 4),
    loggedMeal("Salmon", 350, 5),
  ];
  const state = { ...defaultState, mealEntries: meals };
  const frequent = frequentlyConsumedFoods(state, 10);
  expect(frequent[0].name).toBe("Chicken"); // 3 times
  expect(frequent[1].name).toBe("Oats"); // 2 times
  expect(frequent[2].name).toBe("Salmon"); // 1 time
});

// ---- Jarvis: queryLibraryMealWithSaved ----
test("queryLibraryMealWithSaved matches a saved preset by name", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  const cmd = queryLibraryMealWithSaved("i had overnight oats", "i had overnight oats", state);
  expect(cmd).toBeDefined();
  expect(cmd!.tool).toBe("logReferenceMeal");
  expect(cmd!.args.name).toContain("Overnight Oats");
});

test("queryLibraryMealWithSaved handles 'my usual' prefix stripping", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  const cmd = queryLibraryMealWithSaved(
    "i had my usual overnight oats",
    "i had my usual overnight oats",
    state,
  );
  expect(cmd).toBeDefined();
  expect(cmd!.tool).toBe("logReferenceMeal");
});

test("queryLibraryMealWithSaved scales by serving count", () => {
  const preset = confirmedPreset();
  const state = stateWithPreset(preset);
  const cmd = queryLibraryMealWithSaved("i had 2 overnight oats", "i had 2 overnight oats", state);
  expect(cmd).toBeDefined();
  expect(cmd!.args.calories).toBe(700); // 350 * 2
  expect(cmd!.args.protein).toBe(40); // 20 * 2
});

test("queryLibraryMealWithSaved returns ambiguity reply when multiple presets match", () => {
  const p1 = confirmedPreset({
    id: "p1",
    meal: { ...confirmedPreset().meal, id: "m1", name: "Chicken Bowl Light" },
  });
  const p2 = confirmedPreset({
    id: "p2",
    meal: { ...confirmedPreset().meal, id: "m2", name: "Chicken Bowl Heavy" },
  });
  const state = { ...defaultState, savedNutrition: [p1, p2] };
  const cmd = queryLibraryMealWithSaved("i had chicken bowl", "i had chicken bowl", state);
  expect(cmd).toBeDefined();
  expect("reply" in cmd!).toBe(true);
  expect(cmd!.reply).toContain("multiple matches");
});

test("queryLibraryMealWithSaved falls back to catalog when no saved match", () => {
  const state = defaultState;
  // "i ate two salmon for lunch" — "salmon" is in FOODS catalog
  const cmd = queryLibraryMealWithSaved(
    "i ate two salmon for lunch",
    "i ate two salmon for lunch",
    state,
  );
  // May return undefined or a catalog hit; just check it doesn't crash
  expect(cmd === undefined || typeof cmd === "object").toBe(true);
});

test("queryLibraryMealWithSaved returns undefined for unknown food with no saved match", () => {
  const state = defaultState;
  const cmd = queryLibraryMealWithSaved(
    "i had xyzzy mystery food",
    "i had xyzzy mystery food",
    state,
  );
  expect(cmd).toBeUndefined();
});
