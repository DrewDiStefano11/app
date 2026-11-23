import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

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

const persistedState = readPersistedFitCoreState;

async function logMeal(page: Page, name: string, calories: string) {
  await page.getByRole("button", { name: "Log Meal", exact: true }).click();
  const sheet = sheetByHeading(page, "Log Meal");
  await expect(sheet).toBeVisible();
  await sheet.getByPlaceholder("e.g. Chicken & rice").fill(name);
  await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill(calories);
  await sheet.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(sheet).not.toBeVisible();
}

test.describe("Data integrity under interruption", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("rapid successive meal writes are all persisted without data loss", async ({ page }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    const meals = [
      { name: "Rapid meal A", calories: "300" },
      { name: "Rapid meal B", calories: "400" },
      { name: "Rapid meal C", calories: "500" },
      { name: "Rapid meal D", calories: "600" },
    ];
    for (const meal of meals) {
      await logMeal(page, meal.name, meal.calories);
    }

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return (state.mealEntries ?? []).filter(
          (m: { name: string }) => meals.some((mm) => mm.name === m.name),
        ).length;
      })
      .toBe(4);

    const total = meals.reduce((sum, m) => sum + Number(m.calories), 0);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return (state.mealEntries ?? [])
          .filter((m: { name: string }) => meals.some((mm) => mm.name === m.name))
          .reduce((sum: number, m: { calories: number }) => sum + m.calories, 0);
      })
      .toBe(total);
  });

  test("reload mid-meal-edit does not crash or corrupt persisted data", async ({ page }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    // Persist a reference meal first.
    await logMeal(page, "Reference meal", "200");
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return (state.mealEntries ?? []).some((m: { name: string }) => m.name === "Reference meal");
      })
      .toBe(true);

    // Begin editing a new meal, then reload before saving.
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Interrupted meal");
    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("999");

    await page.reload();
    await expectDashboardReady(page);

    // App recovered cleanly and the reference meal survived the interruption.
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return (state.mealEntries ?? []).some((m: { name: string }) => m.name === "Reference meal");
      })
      .toBe(true);

    const interrupted = (await persistedState(page)).mealEntries?.some(
      (m: { name: string }) => m.name === "Interrupted meal",
    );
    expect(interrupted).toBe(false); // in-flight draft is discarded, not partially committed

    await checkNoFatalErrors(page);
  });
});
