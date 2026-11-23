import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
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

async function gotoSection(page: Page, section: "Home" | "Train" | "Fuel" | "Recover" | "Stats") {
  const btn = page.getByRole("button", { name: section, exact: true });
  if (await btn.isVisible()) {
    await btn.click();
    return;
  }
  const expand = page.getByRole("button", { name: /Expand navigation/ });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: section, exact: true }).click();
}

async function logMeal(page: Page, name: string, calories: string, protein?: string, carbs?: string, fat?: string) {
  await page.getByRole("button", { name: "Log Meal", exact: true }).click();
  const sheet = sheetByHeading(page, "Log Meal");
  await expect(sheet).toBeVisible();
  await sheet.getByPlaceholder("e.g. Chicken & rice").fill(name);
  await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill(calories);
  if (protein !== undefined) await sheet.getByText("P (g)", { exact: true }).locator("..").locator("input").fill(protein);
  if (carbs !== undefined) await sheet.getByText("C (g)", { exact: true }).locator("..").locator("input").fill(carbs);
  if (fat !== undefined) await sheet.getByText("F (g)", { exact: true }).locator("..").locator("input").fill(fat);
  await sheet.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(sheet).not.toBeVisible();
}

test.describe("Nutrition macro integrity", () => {
  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("A. logged full macros are consistent across Home and Fuel; never marked unreported", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await page.goto("/");
    await expectDashboardReady(page);

    await logMeal(page, "Grilled chicken bowl", "600", "45", "60", "20");

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Grilled chicken bowl");
        return meal ? meal.protein : null;
      })
      .toBe(45);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Grilled chicken bowl");
        return meal ? meal.carbs : null;
      })
      .toBe(60);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Grilled chicken bowl");
        return meal ? meal.fat : null;
      })
      .toBe(20);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Grilled chicken bowl");
        return meal ? meal.calories : null;
      })
      .toBe(600);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Grilled chicken bowl");
        return meal ? meal.macroStatus : null;
      })
      .not.toBe("unreported");

    // Home macros card must not claim unreported macros when full macros are present.
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeHidden();

    // Fuel (Nutrition) Daily Macros tile renders macro bars and no unreported notice.
    await gotoSection(page, "Fuel");
    await expect(page.getByText("Daily Macros", { exact: true })).toBeVisible();
    await expect(page.getByText("Protein", { exact: true })).toBeVisible();
    await expect(page.getByText("Carbs", { exact: true })).toBeVisible();
    await expect(page.getByText("Fat", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeHidden();
  });

  test("B. calories-only meal marks macros unreported and never fabricates macro values", async ({
    page,
  }) => {
    const now = Date.now();
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        mealEntries: [
          {
            id: "meal-calorie-only",
            name: "Calorie-only dinner",
            type: "dinner",
            calories: 500,
            macroStatus: "unreported",
            createdAt: now,
            source: "jarvis",
          },
        ],
      }),
    );
    await page.goto("/");
    await expectDashboardReady(page);

    // Canonical state: calories recorded, macros unreported (never defaulted to 0 / fabricated).
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Calorie-only dinner");
        return meal ? meal.calories : null;
      })
      .toBe(500);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Calorie-only dinner");
        return meal ? meal.macroStatus : null;
      })
      .toBe("unreported");

    // Home flags unreported macros rather than showing fabricated P/C/F progress.
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeVisible();

    // Fuel Daily Macros tile shows the unreported-macros notice instead of macro bars.
    await gotoSection(page, "Fuel");
    await expect(page.getByText("Daily Macros", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Protein", { exact: true })).toBeHidden();
    await expect(page.getByText("Carbs", { exact: true })).toBeHidden();
    await expect(page.getByText("Fat", { exact: true })).toBeHidden();
  });

  test("C. logged macro totals survive a page reload across Home and Fuel", async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await page.goto("/");
    await expectDashboardReady(page);

    await logMeal(page, "Reload persistence bowl", "700", "50", "70", "25");

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find(
          (m: { name: string }) => m.name === "Reload persistence bowl",
        );
        return meal ? meal.protein : null;
      })
      .toBe(50);

    await page.reload();
    await expectDashboardReady(page);

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find(
          (m: { name: string }) => m.name === "Reload persistence bowl",
        );
        return meal ? meal.protein : null;
      })
      .toBe(50);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find(
          (m: { name: string }) => m.name === "Reload persistence bowl",
        );
        return meal ? meal.macroStatus : null;
      })
      .not.toBe("unreported");

    await gotoSection(page, "Fuel");
    await expect(page.getByText("Daily Macros", { exact: true })).toBeVisible();
    await expect(page.getByText("Protein", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeHidden();
  });
});
