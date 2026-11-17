import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
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

async function openSavedMeals(page: Page) {
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  const sheet = page
    .locator(".sheet-surface")
    .filter({ has: page.getByRole("heading", { name: "Log Meal", exact: true }) });
  await sheet.getByRole("button", { name: "Saved", exact: true }).click();
  return sheet;
}

test("save a meal preset and log it after relaunch without changing the original", async ({
  page,
}) => {
  const original = {
    id: "original-oats",
    name: "Breakfast bowl",
    type: "breakfast",
    createdAt: Date.now(),
    calories: 470,
    protein: 31,
    carbs: 63,
    fat: 10,
    fiber: 8,
    items: [{ name: "Oats", qty: "1 cup", calories: 470, protein: 31, carbs: 63, fat: 10 }],
  };
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, mealEntries: [original] }),
  );
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit meal", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit meal" });
  await editor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("450");
  await editor.getByRole("button", { name: "Save as reusable meal", exact: true }).click();
  await expect(editor.getByText("Meal saved to your library.", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Save as reusable meal", exact: true }).click();
  const before = await readPersistedFitCoreState(page);
  expect(before.mealEntries).toHaveLength(1);
  expect(before.savedNutrition).toHaveLength(1);
  expect(before.savedNutrition?.[0].meal.calories).toBe(450);

  await page.reload();
  await openNutrition(page);
  let sheet = await openSavedMeals(page);
  await sheet.getByRole("button", { name: "Edit Breakfast bowl", exact: true }).click();
  const presetEditor = page.getByRole("dialog", { name: "Edit saved meal", exact: true });
  await presetEditor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("440");
  await presetEditor.getByRole("button", { name: "Save changes", exact: true }).click();
  await sheet.getByRole("button", { name: "Log Breakfast bowl", exact: true }).click();
  await expect(page.getByText("910 kcal logged today", { exact: true })).toBeVisible();
  const after = await readPersistedFitCoreState(page);
  expect(after.mealEntries[0]).toEqual(expect.objectContaining(original));
  expect(after.mealEntries[1]).toEqual(
    expect.objectContaining({
      name: original.name,
      calories: 440,
      fiber: original.fiber,
      items: original.items,
    }),
  );
  expect(after.mealEntries[1].id).not.toBe(original.id);

  sheet = await openSavedMeals(page);
  await sheet.getByRole("button", { name: "Remove Breakfast bowl", exact: true }).click();
  await expect(sheet.getByText("No saved foods or meals.", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(2);
});

test("save a catalog food without logging it and retain the serving on reuse", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await openNutrition(page);
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  const sheet = page.locator(".sheet-surface");
  await sheet.getByRole("button", { name: "Foods Library", exact: true }).click();
  await sheet.getByPlaceholder("Search foods library...").fill("Banana");
  await sheet.getByRole("button", { name: "Save Banana", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await sheet.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(sheet.getByText("1 medium", { exact: true })).toBeVisible();
  await sheet.getByRole("button", { name: "Log Banana", exact: true }).click();
  await expect(page.getByText("Banana", { exact: true })).toBeVisible();
  const [meal] = (await readPersistedFitCoreState(page)).mealEntries;
  expect(meal?.items?.[0]).toMatchObject({ name: "Banana", qty: "1 medium" });
});

test("empty-library Settings backup restores without keeping newer presets", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await exported;
  const bytes = await readFile(await download.path());
  expect(JSON.parse(bytes.toString()).savedNutrition).toEqual([]);

  await page.reload();
  await openNutrition(page);
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  const logger = page.getByRole("dialog", { name: "Log Meal", exact: true });
  await logger.getByRole("button", { name: "Foods Library", exact: true }).click();
  await logger.getByPlaceholder("Search foods library...").fill("Banana");
  await logger.getByRole("button", { name: "Save Banana", exact: true }).click();
  await logger.getByRole("button", { name: "Close meal logger", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).savedNutrition).toHaveLength(1);

  await page.reload();
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await page.getByLabel("Import backup file").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.getByRole("status")).toContainText("Imported successfully");
  expect((await readPersistedFitCoreState(page)).savedNutrition).toEqual([]);
});

test("saving a legacy photo estimate requires explicit confirmation and preserves the original log", async ({
  page,
}) => {
  const estimate = {
    id: "photo-estimate",
    name: "Estimated snack",
    type: "snack",
    createdAt: Date.now(),
    calories: 250,
    protein: 15,
    carbs: 28,
    fat: 8,
    source: "camera" as const,
  };
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      mealEntries: [estimate],
    }),
  );
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit meal", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit meal", exact: true });
  await expect(
    editor.getByRole("button", { name: "Save as reusable meal", exact: true }),
  ).toBeHidden();
  await editor.getByRole("button", { name: "Confirm values and save preset", exact: true }).click();
  await expect(editor.getByText("Meal saved to your library.", { exact: true })).toBeVisible();
  const state = await readPersistedFitCoreState(page);
  expect(state.savedNutrition?.[0].meal.provenance?.confirmation).toBe("confirmed");
  expect(state.mealEntries[0].provenance?.confirmation).toBe("unconfirmed");
});
