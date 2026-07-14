import { expect, test, type Page } from "@playwright/test";
import { buildDemoState } from "../../src/lib/demo-data";
import { defaultState } from "../../src/lib/types";
import { FITCORE_STORAGE_KEY } from "./helpers/fitcore-test-state";

async function seedStateOnOrigin(page: Page, state: Record<string, unknown>) {
  await page.goto("/");
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), {
    key: FITCORE_STORAGE_KEY,
    value: state,
  });
  await page.reload();
}

async function openDashboardWithState(page: Page, state: Record<string, unknown>) {
  await seedStateOnOrigin(page, state);
  await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe("Home Daily premium redesign", () => {
  test("keeps the daily command center actionable with rich data", async ({ page }, testInfo) => {
    await openDashboardWithState(
      page,
      buildDemoState({
        ...defaultState,
        onboardingComplete: true,
        demoMode: true,
        profile: { ...defaultState.profile, name: "Drew" },
      }),
    );

    await expect(page.getByText("Good Morning, Drew", { exact: true })).toBeVisible();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /today's core actions are complete|start today's training|push day|pull day|leg day|log your first meal|close the .* protein gap|complete a recovery check-in|add today's weigh-in/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Training volume vs calories" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Home analytics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Body status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nutrition summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Goals & momentum" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick actions" })).toBeVisible();

    await page.getByLabel(/Readiness \d+/).click();
    const readinessSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: /Readiness/i }),
    });
    await expect(readinessSheet).toBeVisible();
    await readinessSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(readinessSheet).not.toBeVisible();

    await page.getByRole("button", { name: "View score details" }).click();
    const scoreSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "FitCore Score", exact: true }),
    });
    await expect(scoreSheet).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("home-score-sheet.png") });
    await scoreSheet.getByRole("button", { name: "Close FitCore Score" }).click();

    const analytics = page.getByRole("region", { name: "Home analytics" });
    await expect(analytics.getByLabel("7-day volume, pinned")).toContainText("Pinned");
    await analytics.getByRole("button", { name: "Next chart" }).click();
    await expect(analytics).toHaveAttribute("data-active-chart", "nutrition");
    await page.screenshot({ path: testInfo.outputPath("home-analytics-non-first-chart.png") });
    await analytics.getByRole("button", { name: "Show Bodyweight direction" }).click();
    await expect(analytics.getByLabel("Bodyweight direction, suggested")).toContainText(
      "Suggested",
    );
    await analytics.getByRole("button", { name: "Dismiss" }).click();
    await expect(analytics.getByLabel("7-day volume, pinned")).toContainText("Pinned");

    const comparison = page.getByRole("heading", { name: "Training volume vs calories" });
    await comparison.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Focus", exact: true }).click();
    const focusSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Training volume vs calories", exact: true }),
    });
    await expect(focusSheet).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("home-comparison-focus.png") });
    await focusSheet.getByRole("button", { name: "Close Training volume vs calories" }).click();

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const compactMuscle = page.locator(".home-body-map .body-heatmap-region").first();
    await compactMuscle.focus();
    await compactMuscle.press("Enter");
    const muscleSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: /Shoulders|Chest|Biceps|Core|Quads|Calves/ }),
    });
    await expect(muscleSheet).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("home-muscle-detail-sheet.png") });
    await muscleSheet.getByRole("button", { name: /^Close / }).click();

    await page.getByRole("button", { name: "Open Body Heat Map details" }).click();
    const heatmapSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Body Heat Map", exact: true }),
    });
    await expect(heatmapSheet).toBeVisible();
    await heatmapSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();

    const nutritionSummary = page
      .getByRole("heading", { name: "Nutrition summary" })
      .locator("xpath=ancestor::section[1]");
    await nutritionSummary.getByRole("button", { name: "Details" }).click();
    const macroSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Nutrition", exact: true }),
    });
    await expect(macroSheet).toBeVisible();
    await macroSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();

    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const mealSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Log Meal", exact: true }),
    });
    await expect(mealSheet).toBeVisible();
    await mealSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("home-daily-desktop.png") });

    for (const width of [320, 360, 390, 430, 480]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`home-daily-${width}.png`) });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("heading", { name: "Body status" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("home-daily-390-body-nutrition.png") });
    await page.getByRole("heading", { name: "Quick actions" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("home-daily-390-actions.png") });
    await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();

    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByRole("button", { name: /Deep Dive/i }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("shows honest sparse-data states without losing core logging", async ({
    page,
  }, testInfo) => {
    await openDashboardWithState(page, {
      ...defaultState,
      onboardingComplete: true,
      activeWorkout: null,
      workouts: [],
      mealEntries: [],
      sleepEntries: [],
      recoveryCheckIns: [],
      bodyweightEntries: [],
    });

    await expect(page.getByLabel(/Needs more data/).first()).toBeVisible();
    await expect(page.getByText(/Baseline · no recent sleep or check-in/).first()).toBeVisible();
    await expect(page.getByText("A clearer trend is taking shape")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start Workout", exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Meal", exact: true }).last()).toBeVisible();
    await expect(page.getByRole("button", { name: "Check In", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Weigh In", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("home-empty-state.png"), fullPage: true });

    await page.getByLabel(/Readiness \d+/).click();
    const readinessSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Readiness Score", exact: true }),
    });
    await expect(
      readinessSheet.getByText("Log sleep or complete a recovery check-in to start this trend."),
    ).toBeVisible();
    await expect(readinessSheet.locator(".recharts-wrapper")).toHaveCount(0);
  });

  test("labels partial readiness and keeps keyboard and reduced-motion interactions usable", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDashboardWithState(page, {
      ...defaultState,
      onboardingComplete: true,
      sleepEntries: [
        {
          id: "partial-sleep",
          createdAt: Date.now(),
          hours: 7.2,
          quality: 4,
        },
      ],
      recoveryCheckIns: [],
    });

    await expect(page.getByText("Estimated · no recent check-in").first()).toBeVisible();
    const analytics = page.getByRole("region", { name: "Home analytics" });
    const analyticsViewport = analytics.locator(".premium-stack__viewport");
    await analyticsViewport.focus();
    await analyticsViewport.press("ArrowRight");
    await expect(analytics).toHaveAttribute("data-active-chart", "nutrition");
    await expect
      .poll(() => analytics.evaluate((element) => getComputedStyle(element).scrollBehavior))
      .not.toBe("smooth");
    await page.screenshot({
      path: testInfo.outputPath("home-partial-reduced-motion.png"),
      fullPage: true,
    });
  });

  test("restores an active workout directly into its resumable training state", async ({
    page,
  }) => {
    await seedStateOnOrigin(page, {
      ...defaultState,
      onboardingComplete: true,
      activeWorkout: {
        id: "active-home-workout",
        name: "Upper Strength",
        startedAt: Date.now(),
        exercises: [],
      },
    });

    await expect(page.getByText("Workout in progress", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Resume workout", exact: true }).click();
    await expect(page.getByRole("button", { name: /Finish/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start Workout" })).not.toBeVisible();
  });
});
