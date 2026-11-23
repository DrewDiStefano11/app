import { expect, test, type Page } from "@playwright/test";
import type { MealEntry } from "../../src/lib/types";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function openNutrition(page: Page) {
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Fuel", exact: true }).click();
}

async function seedMeal(page: Page): Promise<MealEntry> {
  const meal: MealEntry = {
    id: "seed-lunch",
    name: "Chicken bowl",
    type: "lunch",
    createdAt: Date.now(),
    calories: 520,
    protein: 42,
    carbs: 55,
    fat: 14,
    fiber: 4,
    notes: "Keep original notes",
  };
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, mealEntries: [meal] }),
  );
  await openNutrition(page);
  return meal;
}

test("correct a saved meal and update the daily totals after relaunch", async ({ page }) => {
  const meal = await seedMeal(page);
  await expect(page.getByText("520 kcal logged today", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit meal", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit meal", exact: true });
  await editor.getByRole("textbox", { name: "Meal name", exact: true }).fill("Chicken and rice");
  await editor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("450");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("450 kcal logged today", { exact: true })).toBeVisible();
  await expect(page.getByText("Chicken and rice", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([
    expect.objectContaining({ ...meal, name: "Chicken and rice", calories: 450 }),
  ]);
  await page.reload();
  await openNutrition(page);
  await expect(page.getByText("450 kcal logged today", { exact: true })).toBeVisible();
});

test("failed meal writes leave the saved record and edit draft intact", async ({ page }) => {
  const meal = await seedMeal(page);
  await page.getByRole("button", { name: "Edit meal", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit meal", exact: true });
  const name = editor.getByRole("textbox", { name: "Meal name", exact: true });
  await name.fill("Unsaved correction");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota limit", "QuotaExceededError");
    };
  });
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("Meal changes could not be saved");
  await expect(name).toHaveValue("Unsaved correction");
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([
    expect.objectContaining(meal),
  ]);
  await editor.getByRole("button", { name: "Cancel changes", exact: true }).click();
  await page.getByRole("button", { name: "Delete meal", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Meal could not be deleted");
  await expect(page.getByText("520 kcal logged today", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([
    expect.objectContaining(meal),
  ]);
});

test("find and correct a past meal without moving it to today's log", async ({ page }) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);
  const date = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, "0"),
    String(yesterday.getDate()).padStart(2, "0"),
  ].join("-");
  const meal: MealEntry = {
    id: "old-meal",
    name: "Earlier breakfast",
    type: "breakfast",
    createdAt: yesterday.getTime(),
    calories: 300,
    protein: 16,
    carbs: 40,
    fat: 8,
    source: "camera",
    items: [
      { name: "Oats and milk", qty: "1 bowl", calories: 300, protein: 16, carbs: 40, fat: 8 },
    ],
  };
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, mealEntries: [meal] }),
  );
  await openNutrition(page);
  await expect(page.getByText("No meals logged today", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Meal history", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Meal history", exact: true });
  await expect(history.getByText("No meals logged for this date.")).toBeVisible();
  await history.getByLabel("Meal date", { exact: true }).fill(date);
  await expect(history.getByText("AI estimate", { exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Edit meal", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit meal", exact: true });
  await editor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("320");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(history.getByText("320 kcal logged", { exact: true })).toBeVisible();
  await expect(history.getByText("AI estimate", { exact: true })).toBeVisible();
  await expect(history.getByText("Edited", { exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Delete meal", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete meal?" });
  await expect(confirmation.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirmation.getByRole("button", { name: "Delete", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(history.getByText("320 kcal logged", { exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Close meal history" }).click();
  await expect(page.getByText("No meals logged today", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([
    expect.objectContaining({
      ...meal,
      calories: 320,
      provenance: expect.objectContaining({ editedBy: "user" }),
    }),
  ]);
});
