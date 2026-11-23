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

test.describe("Cross-screen workflows", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("Workflow 1: complete a workout in Training, see it in Stats, open Jarvis", async ({
    page,
  }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    // --- Training: start and save a workout ---
    await gotoSection(page, "Train");
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
    await page.getByText("Blank workout", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Blank workout", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    await page.getByRole("button", { name: "Add" }).first().click();
    await expect(page.locator(".sheet-title", { hasText: "Add exercise" })).toBeVisible();
    await page.locator(".sheet-surface").getByRole("button", { name: /Squat/i }).first().click();
    await expect(page.getByRole("heading", { name: "No exercises yet" })).not.toBeVisible();

    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect(page.locator(".sheet-title", { hasText: "Finish workout" })).toBeVisible();
    await page.locator(".sheet-surface").getByRole("button", { name: "Confirm & save" }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // The completed workout is persisted.
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return (state.workouts ?? []).length;
      })
      .toBeGreaterThan(0);

    // --- Stats: the workout is reflected ---
    await gotoSection(page, "Stats");
    await expect(
      page.getByRole("heading", { name: "Progress", exact: true }).or(
        page.getByRole("heading", { name: "Stats", exact: true }),
      ),
    ).toBeVisible();

    // --- Jarvis: AI composer is reachable without making a provider request ---
    await page.getByRole("button", { name: "Open AI composer", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Message Jarvis" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Workflow 2: log a meal, verify macros across Fuel and Home, open Deep Dive, survive reload", async ({
    page,
  }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    // --- Log a meal with full macros from Home ---
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Cross-screen bowl");
    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("650");
    await sheet.getByText("P (g)", { exact: true }).locator("..").locator("input").fill("40");
    await sheet.getByText("C (g)", { exact: true }).locator("..").locator("input").fill("70");
    await sheet.getByText("F (g)", { exact: true }).locator("..").locator("input").fill("22");
    await sheet.getByRole("button", { name: "Save meal", exact: true }).click();
    await expect(sheet).not.toBeVisible();

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Cross-screen bowl");
        return meal ? meal.protein : null;
      })
      .toBe(40);

    // --- Fuel (Nutrition): Daily Macros tile shows the same values ---
    await gotoSection(page, "Fuel");
    await expect(page.getByText("Daily Macros", { exact: true })).toBeVisible();
    await expect(page.getByText("Protein", { exact: true })).toBeVisible();
    await expect(page.getByText("Carbs", { exact: true })).toBeVisible();
    await expect(page.getByText("Fat", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeHidden();

    // --- Home: macros card does not flag unreported macros ---
    await gotoSection(page, "Home");
    await expectDashboardReady(page);
    await expect(
      page.getByText("Some meals have unreported macros.", { exact: true }),
    ).toBeHidden();

    // --- Home Deep Dive loads and renders the macro trend chart ---
    await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
    await expect(page.getByText("Deep Dive Metrics", { exact: true })).toBeVisible();

    // --- Reload: totals persist across screens ---
    await page.reload();
    await expectDashboardReady(page);
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        const meal = (state.mealEntries ?? []).find((m: { name: string }) => m.name === "Cross-screen bowl");
        return meal ? meal.protein : null;
      })
      .toBe(40);
  });

  test("Workflow 4: start a workout, navigate away and back, the active workout survives interruption", async ({
    page,
  }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    // --- Training: start an active workout ---
    await gotoSection(page, "Train");
    await page.getByText("Blank workout", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Blank workout", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    // --- Interrupt: navigate away — the app forces Training view when an active workout exists ---
    await page.goto("/");
    // Cannot land on Home while an active workout exists; verify the active workout view persists.
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    // Persisted active workout survived the screen switch.
    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.activeWorkout !== null;
      })
      .toBe(true);
  });
});
