import { test, expect } from "bun:test";
import { defaultState } from "../../../src/lib/types";
import { createPhotoMealDraft } from "../../../src/lib/jarvis/meal-photo-draft";
import { savedFoodMatches, querySavedNutrition } from "../../../src/lib/jarvis/saved-food-matches";
import { runTool } from "../../../src/lib/jarvis/tools";

test("saved label matches are local suggestions, require complete confirmed values and do not mutate a photo", () => {
  const state = structuredClone(defaultState);
  const meal = {
    id: "base",
    name: "Brand white rice",
    type: "dinner",
    createdAt: Date.now(),
    calories: 190,
    protein: 5,
    carbs: 40,
    fat: 1,
  };
  state.savedNutrition = [
    { id: "label", kind: "food", servingLabel: "1 cup", meal },
    {
      id: "unknown",
      kind: "food",
      meal: {
        ...meal,
        macroStatus: "unreported",
        protein: undefined,
        carbs: undefined,
        fat: undefined,
      },
    },
    { id: "unconfirmed", kind: "food", meal: { ...meal, source: "camera", confirmed: false } },
  ];
  const draft = createPhotoMealDraft(
    {
      name: "Rice",
      mealType: "dinner",
      recipeServings: 1,
      servingsEaten: 1,
      items: [
        {
          id: "rice",
          name: "White rice",
          quantity: 2,
          unit: "cup",
          calories: 400,
          protein: 8,
          carbs: 90,
          fat: 0,
          evidence: "visible",
          preparation: "cooked",
        },
      ],
      assumptions: [],
      question: "",
    },
    "draft",
  );
  const before = structuredClone(draft);
  const matches = savedFoodMatches(draft, state);
  expect(matches).toHaveLength(1);
  expect(matches[0].ingredient).toMatchObject({
    name: meal.name,
    calories: 190,
    quantity: 1,
    unit: "cup",
    evidence: "user",
  });
  expect(draft).toEqual(before);
});

test("saved meal reuse requires an exact unambiguous name and preserves unreported macros", () => {
  const state = structuredClone(defaultState);
  const meal = {
    id: "old",
    name: "Lunch bowl",
    type: "lunch",
    createdAt: Date.now(),
    calories: 500,
    macroStatus: "unreported" as const,
  };
  state.savedNutrition = [{ id: "preset", kind: "meal", meal }];
  const command = querySavedNutrition("log saved lunch bowl", state);
  expect(command).toMatchObject({
    tool: "logCaloriesOnly",
    args: { calories: 500, name: "Lunch bowl" },
  });
  if (!command || !("tool" in command)) throw Error("No reuse command");
  let saved = state;
  expect(
    runTool(command.tool, command.args, {
      state,
      set: (update) => {
        saved = update(saved);
        return true;
      },
      settings: state.jarvisSettings,
      confirmed: true,
    }).ok,
  ).toBe(true);
  expect(saved.mealEntries[0]).toMatchObject({
    name: "Lunch bowl",
    calories: 500,
    macroStatus: "unreported",
  });
  expect(querySavedNutrition("log saved bowl", state)).toHaveProperty("reply");
  state.savedNutrition.push({ id: "other", kind: "meal", meal });
  expect(querySavedNutrition("log saved lunch bowl", state)).toHaveProperty("reply");
});
