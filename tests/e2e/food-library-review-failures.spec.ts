import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function openLibrary(page: Page) {
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Fuel", exact: true }).click();
  await page.getByRole("button", { name: "Food library", exact: true }).click();
  return page.locator(".sheet-surface").filter({
    has: page.getByRole("heading", { name: "Food Library", exact: true }),
  });
}

async function failWrites(page: Page) {
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic review quota", "QuotaExceededError");
    };
    window.addEventListener(
      "review-restore-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
}

test("review: failed library quick-log must not announce a saved meal", async ({ page }) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      mealEntries: [],
      savedNutrition: [
        {
          id: "review-preset",
          kind: "food",
          servingLabel: "100 g",
          meal: {
            id: "review-food",
            name: "Review Food",
            type: "snack",
            createdAt: 1,
            calories: 200,
            protein: 30,
            carbs: 0,
            fat: 8,
            confirmed: true,
          },
        },
      ],
    }),
  );
  const library = await openLibrary(page);
  await failWrites(page);
  await library.getByRole("button", { name: "Quick-log Review Food", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await expect(library.getByText("Review Food logged!", { exact: true })).not.toBeVisible({
    timeout: 500,
  });
  await expect(library.getByRole("alert")).toContainText("Could not save");
  await page.evaluate(() => window.dispatchEvent(new Event("review-restore-writes")));
  await library.getByRole("button", { name: "Quick-log Review Food", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(1);
  await expect(library.getByText("Review Food logged!", { exact: true })).toBeVisible();
});

test("review: failed custom-food save must retain its form and draft", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  const library = await openLibrary(page);
  await library.getByRole("button", { name: "Add Food", exact: true }).click();
  const form = page.locator(".sheet-surface").filter({
    has: page.getByRole("heading", { name: "Add Custom Food", exact: true }),
  });
  await form.getByLabel("Food name").fill("Unsaved Review Food");
  await form.getByLabel("Calories (kcal)").fill("200");
  await failWrites(page);
  await form.getByRole("button", { name: "Add to Library", exact: true }).click();
  expect(
    (await readPersistedFitCoreState(page)).savedNutrition?.some(
      (preset) => preset.meal.name === "Unsaved Review Food",
    ) ?? false,
  ).toBe(false);
  await expect(form).toBeVisible({ timeout: 500 });
  await expect(form.getByLabel("Food name")).toHaveValue("Unsaved Review Food");
  await expect(form.getByRole("alert")).toContainText("Could not save");
  await page.evaluate(() => window.dispatchEvent(new Event("review-restore-writes")));
  await form.getByRole("button", { name: "Add to Library", exact: true }).click();
  await expect(form).not.toBeVisible();
  expect(
    (await readPersistedFitCoreState(page)).savedNutrition?.filter(
      (preset) => preset.meal.name === "Unsaved Review Food",
    ),
  ).toHaveLength(1);
});
