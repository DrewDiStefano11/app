import { expect, test } from "bun:test";
import {
  createFitCoreBackupEnvelope,
  inspectFitCoreBackupEnvelope,
} from "../../src/lib/data-backup";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";
import { addNutritionPreset, copyMealForLog } from "../../src/lib/saved-nutrition";
import { defaultState, type SavedNutritionPreset } from "../../src/lib/types";

const createdAt = Date.UTC(2026, 10, 16, 18);
const preset: SavedNutritionPreset = {
  id: "saved-meal",
  kind: "meal",
  meal: {
    id: "original",
    name: "Chicken bowl",
    type: "lunch",
    createdAt,
    calories: 520,
    protein: 42,
    carbs: 55,
    fat: 14,
    source: "camera",
    notes: "Private note about that day",
    items: [
      {
        name: "Chicken",
        calories: 520,
        protein: 42,
        carbs: 55,
        fat: 14,
        provenance: {
          source: "ai-estimated",
          confidence: "medium",
          confirmation: "unconfirmed",
          auditId: "original-item-audit",
          originalText: "Original description",
          assumptions: ["Original portions"],
        },
      },
    ],
    auditId: "original-audit",
    provenance: {
      source: "ai-estimated",
      confidence: "medium",
      confirmation: "unconfirmed",
      auditId: "original-audit",
      originalText: "Original description",
    },
  },
};

test("saved nutrition is optional for older data and round-trips in a verified backup", () => {
  expect(validateFitCoreDataIntegrity(defaultState).status).toBe("valid");
  expect(addNutritionPreset(defaultState, preset)).toBe(defaultState);
  const confirmed: SavedNutritionPreset = {
    ...preset,
    meal: {
      ...preset.meal,
      confirmed: true,
      provenance: { source: "ai-estimated", confirmation: "confirmed", confidence: "high" },
    },
  };
  const state = addNutritionPreset(defaultState, confirmed);
  expect(state.mealEntries).toEqual([]);
  expect(addNutritionPreset(state, { ...confirmed, id: "second" })).toBe(state);
  const backup = createFitCoreBackupEnvelope(state, {
    exportedAt: new Date(createdAt).toISOString(),
  });
  expect(backup.safeToExport).toBe(true);
  expect(backup.requiresReview).toBe(false);
  expect(inspectFitCoreBackupEnvelope(backup.envelope).status).toBe("valid");
  expect(backup.envelope?.payload.savedNutrition).toEqual(state.savedNutrition);
});

test("reusing a meal preserves estimate evidence without copying prior entry identity", () => {
  const meal = copyMealForLog(preset.meal, "new-meal", createdAt + 1);
  expect(meal).toMatchObject({
    id: "new-meal",
    createdAt: createdAt + 1,
    calories: 520,
    source: "camera",
    provenance: { source: "ai-estimated", confidence: "medium", confirmation: "unconfirmed" },
  });
  expect(meal.notes).toBeUndefined();
  expect(meal.auditId).toBeUndefined();
  expect(meal.provenance?.auditId).toBeUndefined();
  expect(meal.provenance?.originalText).toBeUndefined();
  expect(meal.items?.[0].provenance).toEqual({
    source: "ai-estimated",
    confidence: "medium",
    confirmation: "unconfirmed",
  });
});

test("invalid preset data fails integrity without masking an existing workout", () => {
  const state = {
    ...defaultState,
    workouts: [
      {
        id: "w",
        name: "Saved workout",
        startedAt: createdAt - 3600000,
        endedAt: createdAt,
        exercises: [],
      },
    ],
    savedNutrition: [{ ...preset, meal: { ...preset.meal, calories: -1 } }],
  };
  const report = validateFitCoreDataIntegrity(state);
  expect(report.status).toBe("invalid");
  expect(report.issues.some((issue) => issue.path === "$.savedNutrition[0].meal.calories")).toBe(
    true,
  );
  expect(state.workouts[0].name).toBe("Saved workout");
});
