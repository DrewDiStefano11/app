import { test, expect, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  FITCORE_MOBILE_VIEWPORTS,
  currentFitCoreState,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
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
  return readPersistedFitCoreState(page);
}

async function seedReloadableOnboardedState(page: Page) {
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
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
      mealEntries: [
        {
          id: "m_seed1",
          name: "Smoke chicken bowl",
          type: "lunch",
          calories: 520,
          protein: 42,
          carbs: 55,
          fat: 14,
          createdAt: todayTs,
        },
      ],
      nutritionTargets: {
        calories: 2500,
        protein: 150,
        carbs: 250,
        fat: 80,
        waterOz: 100,
      },
      bodyweightEntries: [],
      goals: [
        { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
      ],
    }),
  );
  await expectDashboardReady(page);
}

test.describe("Nutrition Daily View panels smoke", () => {
  test.use({ viewport: FITCORE_MOBILE_VIEWPORTS.iphoneModern, isMobile: true });

  test("scenario coverage for Nutrition/Fuel Daily View layout and panels", async ({ page }) => {
    // Seed and load the dashboard
    await seedReloadableOnboardedState(page);

    // Scenario A — Nutrition/Fuel tab renders safely
    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    await page.getByRole("button", { name: "Fuel", exact: true }).click();

    // Assert the Nutrition heading renders
    await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
    await checkNoFatalErrors(page);

    // Scenario B — Main nutrition sections are reachable
    // Assert broad presence of important sections
    await expect(page.getByRole("button", { name: "Log Meal", exact: true }).first()).toBeVisible();
    await expect(page.getByText("kcal remaining", { exact: false })).toBeVisible();

    // Scenario C — Seeded meal data appears or persists safely
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.mealEntries?.length ?? 0;
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.mealEntries?.[0]?.name;
      })
      .toBe("Smoke chicken bowl");

    // Check if it surfaces in the UI. If it does, assert it.
    const mealNameLocator = page.getByText("Smoke chicken bowl", { exact: true });
    if ((await mealNameLocator.count()) > 0) {
      await expect(mealNameLocator.first()).toBeVisible();
    }

    // Scenario D — Nutrition detail/panel/sheet smoke
    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();

    const logMealSheet = page
      .getByRole("heading", { name: "Log Meal", exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
    await expect(logMealSheet).toBeVisible();

    // Close it using the Cancel button (which might just be the backdrop in some sheets, or Cancel btn)
    const cancelBtn = logMealSheet.getByRole("button", { name: "Cancel", exact: true });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      // If there is no explicit Cancel button, try clicking the backdrop to close it
      await page
        .locator(".sheet-backdrop")
        .first()
        .click({ force: true, position: { x: 10, y: 10 } });
    }

    // Confirm it closes and we return without a stuck overlay
    await expect(logMealSheet).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
    await checkNoFatalErrors(page);

    // Confirm bottom navigation still works
    const expandNavAgain = page.getByRole("button", { name: "Expand navigation" });
    if (await expandNavAgain.isVisible()) {
      await expandNavAgain.click();
    }
    await expect(
      page
        .locator("nav")
        .getByRole("button", { name: "Fuel", exact: true })
        .or(page.getByRole("button", { name: /Expand navigation/ })),
    ).toBeVisible();

    // Scenario E — Reload stability
    await page.reload();

    // FitCore reload puts us back on Home. Re-navigate to Fuel.
    await expectDashboardReady(page);

    const expandBtnAfterReload = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtnAfterReload.isVisible()) {
      await expandBtnAfterReload.click();
    }
    await page.getByRole("button", { name: "Fuel", exact: true }).click();

    // Confirm it renders safely again
    await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
    await checkNoFatalErrors(page);

    // Confirm seeded meal still exists
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.mealEntries?.length ?? 0;
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.mealEntries?.[0]?.name;
      })
      .toBe("Smoke chicken bowl");
  });
});
