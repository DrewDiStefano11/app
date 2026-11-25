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

async function openFoodLibrary(page: Page) {
  await openNutrition(page);
  await page.getByRole("button", { name: "Food library", exact: true }).click();
  const sheet = page
    .locator(".sheet-surface")
    .filter({ has: page.getByRole("heading", { name: "Food Library", exact: true }) });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe("Food Library", () => {
  test("browse catalog, search, and view tabs", async ({ page }) => {
    await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
    const sheet = await openFoodLibrary(page);

    // Switch to Catalog tab
    await sheet.getByRole("tab", { name: "Catalog", exact: true }).click();
    await expect(sheet.getByText("Grilled Chicken Breast", { exact: false })).toBeVisible();

    // Search catalog
    await sheet.getByLabel("Search foods").fill("Salmon");
    await expect(sheet.getByText("Salmon", { exact: false })).toBeVisible();
    await expect(sheet.getByText("Grilled Chicken Breast", { exact: false })).toBeHidden();
  });

  test("add a custom food with macros and verify it appears in library", async ({ page }) => {
    await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
    const sheet = await openFoodLibrary(page);

    // Click Add Food
    await sheet.getByRole("button", { name: "Add Food", exact: true }).click();
    const addSheet = page
      .locator(".sheet-surface")
      .filter({ has: page.getByRole("heading", { name: "Add Custom Food", exact: true }) });
    await expect(addSheet).toBeVisible();

    // Fill form
    await addSheet.getByLabel("Food name").fill("Protein Oats Bowl");
    await addSheet.getByLabel("Calories (kcal)").fill("420");
    await addSheet.getByLabel("Protein (g)").fill("35");
    await addSheet.getByLabel("Carbs (g)").fill("50");
    await addSheet.getByLabel("Fat (g)").fill("8");
    await addSheet.getByLabel("Serving amount").fill("1");
    await addSheet.getByRole("button", { name: "Add to Library", exact: true }).click();

    // Verify it appears in My Foods
    await expect(sheet.getByText("Protein Oats Bowl")).toBeVisible();
    await expect(sheet.getByText("420 kcal · 35g P · 50g C · 8g F")).toBeVisible();

    // Verify in persisted state
    const state = await readPersistedFitCoreState(page);
    expect(state.savedNutrition?.some((p) => p.meal.name === "Protein Oats Bowl")).toBe(true);
  });

  test("quick-log saved food directly from library", async ({ page }) => {
    const preset = {
      id: "preset-custom",
      kind: "food" as const,
      servingLabel: "1 bowl",
      meal: {
        id: "m-custom",
        name: "Teriyaki Chicken Rice",
        type: "dinner",
        createdAt: Date.now(),
        calories: 550,
        protein: 45,
        carbs: 65,
        fat: 10,
        confirmed: true,
      },
    };
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        savedNutrition: [preset],
      }),
    );
    const sheet = await openFoodLibrary(page);

    await expect(sheet.getByText("Teriyaki Chicken Rice")).toBeVisible();
    // Quick-log via the quick-log button
    await sheet.getByRole("button", { name: "Quick-log Teriyaki Chicken Rice" }).click();
    await expect(sheet.getByRole("status")).toContainText("Teriyaki Chicken Rice logged!");

    const state = await readPersistedFitCoreState(page);
    expect(state.mealEntries).toHaveLength(1);
    expect(state.mealEntries[0].name).toBe("Teriyaki Chicken Rice");
    expect(state.mealEntries[0].calories).toBe(550);
  });

  test("toggle favorite flag on saved preset", async ({ page }) => {
    const preset = {
      id: "preset-fav",
      kind: "food" as const,
      meal: {
        id: "m-fav",
        name: "Greek Yogurt Parfait",
        type: "snack",
        createdAt: Date.now(),
        calories: 220,
        protein: 20,
        carbs: 25,
        fat: 3,
        confirmed: true,
      },
    };
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        savedNutrition: [preset],
      }),
    );
    const sheet = await openFoodLibrary(page);

    // Toggle favorite
    await sheet.getByRole("button", { name: "Add to favorites" }).click();
    // Switch to Favorites tab
    await sheet.getByRole("tab", { name: "Favorites", exact: true }).click();
    await expect(sheet.getByText("Greek Yogurt Parfait")).toBeVisible();

    const state = await readPersistedFitCoreState(page);
    expect(state.savedNutrition?.[0].isFavorite).toBe(true);
  });
});
