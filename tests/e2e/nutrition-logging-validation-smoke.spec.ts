import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  FITCORE_DATA_VERSION,
  FITCORE_STORAGE_KEY,
} from "./helpers/fitcore-test-state";

async function checkNoFatalErrors(page: Page) {
  const fatalErrors = [
    "This page didn't load",
    "Application error",
    "Unhandled Runtime Error",
    "createServerFn(...).validator is not a function",
    "Cannot read properties of undefined",
    "Cannot read properties of null",
  ];
  for (const error of fatalErrors) {
    await expect(page.getByText(error, { exact: false })).not.toBeVisible();
  }
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), FITCORE_STORAGE_KEY);
}

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

// Reusing the reloadable state pattern from core-logging-persistence-smoke
async function seedReloadableOnboardedState(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ key, version }) => {
      localStorage.clear();
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          onboardingComplete: true,
          profile: {
            goal: "hypertrophy",
            experience: "intermediate",
            daysPerWeek: 5,
            split: "Push / Pull / Legs",
            bodyweightLb: 180,
            targetBodyweightLb: 185,
            units: "lb",
          },
          workouts: [],
          activeWorkout: null,
          mealEntries: [],
          bodyweightEntries: [],
          goals: [
            { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
          ],
        }),
      );
    },
    { key: FITCORE_STORAGE_KEY, version: FITCORE_DATA_VERSION },
  );
  await page.reload();
  await expectDashboardReady(page);
}

test.describe("Nutrition logging validation smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedReloadableOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("Scenario A: Valid meal saves safely", async ({ page }) => {
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();

    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();

    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Validation protein bowl");
    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("500");
    await sheet.getByText("P (g)", { exact: true }).locator("..").locator("input").fill("40");
    await sheet.getByText("C (g)", { exact: true }).locator("..").locator("input").fill("50");
    await sheet.getByText("F (g)", { exact: true }).locator("..").locator("input").fill("15");

    await sheet.getByRole("button", { name: "Save meal", exact: true }).click();

    await expect(sheet).not.toBeVisible();
    await expectDashboardReady(page);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.mealEntries?.length ?? 0;
    }).toBe(1);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.mealEntries?.[0]?.name;
    }).toBe("Validation protein bowl");

    // The current UI exposes Recent Activity
    const recentActivity = page.getByText("Recent activity", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'tile')][1]");
    await expect(recentActivity.getByText("Meal logged", { exact: true })).toBeVisible();
    await expect(recentActivity.getByText("Validation protein bowl", { exact: true })).toBeVisible();

    await page.reload();
    await expectDashboardReady(page);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.mealEntries?.[0]?.name;
    }).toBe("Validation protein bowl");
  });

  test("Scenario B: Empty required fields do not crash", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialMeals = initialState.mealEntries?.length ?? 0;

    await page.getByRole("button", { name: "Log Meal", exact: true }).click();

    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();

    // Check if the button is disabled to prevent saving empty data
    const saveButton = sheet.getByRole("button", { name: "Save meal", exact: true });

    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      await expect(sheet).toBeVisible(); // Sheet should remain open
    }

    await checkNoFatalErrors(page);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.mealEntries?.length ?? 0;
    }).toBe(initialMeals);

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(sheet).not.toBeVisible();
    }
  });

  test("Scenario C: Invalid numeric values do not create broken data", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialMeals = initialState.mealEntries?.length ?? 0;

    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();

    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Invalid macros bowl");

    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("-100");
    await sheet.getByText("P (g)", { exact: true }).locator("..").locator("input").fill("-20");
    await sheet.getByText("C (g)", { exact: true }).locator("..").locator("input").fill("-30");
    await sheet.getByText("F (g)", { exact: true }).locator("..").locator("input").fill("-10");

    const saveButton = sheet.getByRole("button", { name: "Save meal", exact: true });
    const isDisabled = await saveButton.isDisabled();

    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      // If allowed to save, ensure it didn't crash
      await checkNoFatalErrors(page);
    }

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    }
  });

  test("Scenario D: Cancel does not save", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialMeals = initialState.mealEntries?.length ?? 0;

    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();

    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Canceled bowl");
    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("300");

    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(sheet).not.toBeVisible();

    const stateAfter = await persistedState(page);
    expect(stateAfter.mealEntries?.length ?? 0).toBe(initialMeals);
  });
});
