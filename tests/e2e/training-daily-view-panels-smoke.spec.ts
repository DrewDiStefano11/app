import { test, expect } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  seedFitCoreAppState,
  gotoDashboard,
  FITCORE_MOBILE_VIEWPORTS,
  FITCORE_DATA_VERSION,
} from "./helpers/fitcore-test-state";

test.describe("Training Daily View Smoke", () => {
  test.use({ viewport: FITCORE_MOBILE_VIEWPORTS.iphoneModern, isMobile: true });

  test("renders Daily View panels and active workout start paths", async ({ page }) => {
    // Normal state with no active workout
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Navigate to Training tab
    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    await page.getByRole("button", { name: "Train", exact: true }).click();

    // 1. Training Daily View loads.
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // 2. No legacy subtabs exist
    await expect(page.getByRole("tab", { name: "Overview" })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "Log Workout" })).not.toBeVisible();

    // 3. Programs/templates panel opens and closes safely.
    await page.getByText("starter templates").click();
    const templatesHeading = page.locator(".sheet-title", { hasText: "Programs & templates" });
    await expect(templatesHeading).toBeVisible();
    await page.getByRole("button", { name: "Close programs panel" }).click();
    await expect(templatesHeading).not.toBeVisible();

    // 4. Cardio/sports panel opens and closes safely.
    await page.getByText("min this week").click();
    const cardioHeading = page.locator(".sheet-title", { hasText: "Cardio & sports" });
    await expect(cardioHeading).toBeVisible();
    await page.getByRole("button", { name: "Close cardio panel" }).click();
    await expect(cardioHeading).not.toBeVisible();

    // 5. Performance/progression panel opens and closes safely.
    await page.getByText("Open training analytics").click();
    const perfHeading = page.locator(".sheet-title", { hasText: "Performance", exact: true });
    await expect(perfHeading).toBeVisible();
    await page.getByRole("button", { name: "Close performance panel" }).click();
    await expect(perfHeading).not.toBeVisible();

    // 6. Start blank workout opens Active Workout.
    await page.getByText("Blank workout", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    // 7. Discard returns safely to Training.
    await page.getByRole("button", { name: "Discard workout" }).click();
    await page
      .locator(".sheet-surface")
      .getByRole("button", { name: "Discard", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // 8. Start template opens Active Workout.
    await page.getByText("starter templates").click();
    const startPushBtn = page
      .locator(".card-elev")
      .filter({ hasText: "Push Day" })
      .getByRole("button", { name: /^Start$/ });
    await startPushBtn.click();
    await expect(page.getByRole("heading", { name: "Push Day", exact: true })).toBeVisible();
  });

  test("resumes an existing active workout", async ({ page }) => {
    const startedAt = Date.now() - 60_000;

    await seedFitCoreAppState(page, {
      version: FITCORE_DATA_VERSION,
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
      mealEntries: [],
      bodyweightEntries: [],
      goals: [],
      activeWorkout: {
        id: "resume-test-workout",
        name: "Resume Test Workout",
        startedAt,
        exercises: [],
      },
    });

    await page.goto("/");

    // Verify app shell routed directly to Training automatically
    await expect(
      page.getByRole("heading", {
        name: "Training",
        exact: true,
      }),
    ).toBeVisible();

    // Verify pre-resume state: Active Workout surface is NOT already open
    await expect(page.getByText("Workout in progress", { exact: true })).toBeVisible();

    await expect(page.getByText("Resume Test Workout", { exact: false })).toBeVisible();

    await expect(page.getByText("In progress", { exact: true })).not.toBeVisible();

    // Locate and verify Resume button
    const resumeButton = page.getByRole("button", {
      name: "Resume workout",
      exact: true,
    });

    await expect(resumeButton).toHaveCount(1);
    await expect(resumeButton).toBeVisible();
    await expect(resumeButton).toBeEnabled();

    // Click Resume and verify real Active Workout surface
    await resumeButton.click();

    await expect(page.getByText("In progress", { exact: true })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Resume Test Workout", exact: true }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Discard workout", exact: true })).toBeVisible();

    await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
  });

  test("renders the four Deep Dive tabs", async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Switch to Deep Dive on Home page first since it's an app-wide state
    const layoutToggle = page
      .getByRole("group", { name: "Daily View or Deep Dive" })
      .getByRole("button", { name: "Deep Dive", exact: true });
    await layoutToggle.click();
    await expect(layoutToggle).toHaveAttribute("aria-pressed", "true");

    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    await page.getByRole("button", { name: "Train", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // Exactly 4 tabs
    await expect(page.getByRole("tab", { name: "Performance" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Strength" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Insights" })).toBeVisible();

    // Render contents safely
    await page.getByRole("tab", { name: "Performance" }).click();
    await expect(page.getByRole("heading", { name: "Volume trend (14d)" })).toBeVisible();

    await page.getByRole("tab", { name: "Strength" }).click();
    await expect(page.getByText("Strength & Personal Records")).toBeVisible();

    await page.getByRole("tab", { name: "Library" }).click();
    await expect(page.getByText("starter templates")).toBeVisible();

    await page.getByRole("tab", { name: "Insights" }).click();
    await expect(page.getByText("Training Insights")).toBeVisible();

    // Assert no fatal errors
    const fatalErrors = ["This page didn't load", "Application error", "Unhandled Runtime Error"];
    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }
  });
});
