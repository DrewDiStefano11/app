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

test("change nutrition targets after onboarding and retain them after reload", async ({ page }) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      nutritionTargets: { calories: 2200, protein: 140, carbs: 250, fat: 60 },
    }),
  );
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit nutrition targets", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nutrition targets", exact: true });
  await editor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("2400");
  await editor.getByRole("spinbutton", { name: "Protein (g)", exact: true }).fill("160");
  await editor.getByRole("button", { name: "Save targets", exact: true }).click();
  await expect(editor).toBeHidden();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.nutritionTargets).toMatchObject({
    calories: 2400,
    protein: 160,
    carbs: 250,
    fat: 60,
  });
  expect(saved.mealEntries).toEqual([]);
  await page.reload();
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit nutrition targets", exact: true }).click();
  await expect(editor.getByRole("spinbutton", { name: "Protein (g)", exact: true })).toHaveValue(
    "160",
  );
});

test("failed target writes keep the saved values and edit draft", async ({ page }) => {
  const targets = { calories: 2200, protein: 140, carbs: 250, fat: 60 };
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, nutritionTargets: targets }),
  );
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit nutrition targets", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nutrition targets", exact: true });
  const calories = editor.getByRole("spinbutton", { name: "Calories (kcal)", exact: true });
  await calories.fill("0");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota", "QuotaExceededError");
    };
  });
  await editor.getByRole("button", { name: "Save targets", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("Targets could not be saved");
  await expect(calories).toHaveValue("0");
  expect((await readPersistedFitCoreState(page)).nutritionTargets).toMatchObject(targets);
});

test("clearing targets removes progress against an unset goal across Fuel and Home", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      userGoalsProfile: { calorieGoal: 2100, proteinGoal: 130 },
      mealEntries: [
        {
          id: "sample-dinner",
          name: "Dinner",
          type: "dinner",
          createdAt: Date.now(),
          calories: 400,
          protein: 24,
          carbs: 52,
          fat: 11,
        },
      ],
    }),
  );
  await openNutrition(page);
  await page.getByRole("button", { name: "Edit nutrition targets", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Nutrition targets", exact: true });
  for (const name of ["Calories (kcal)", "Protein (g)"]) {
    await editor.getByRole("spinbutton", { name, exact: true }).fill("0");
  }
  await editor.getByRole("button", { name: "Save targets", exact: true }).click();
  await expect(page.getByText("No calorie target", { exact: true })).toBeVisible();
  await expect(page.getByText("24g · No target", { exact: true })).toBeVisible();
  await expect(page.getByText("400 kcal logged today", { exact: true })).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.userGoalsProfile).toMatchObject({ calorieGoal: 0, proteinGoal: 0 });
  await page.reload();
  await expectDashboardReady(page);
  const macroCard = page.locator(".home-section-card--macros");
  await expect(macroCard.getByText("No calorie target", { exact: true })).toBeVisible();
  await macroCard.click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "Logged today" });
  await expect(sheet.getByText("kcal · No target", { exact: true })).toBeVisible();
});
