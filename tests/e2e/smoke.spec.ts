import { test, expect } from "@playwright/test";

test.describe("App Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state for each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("should load the app and complete onboarding", async ({ page }) => {
    // Check initial load
    await expect(page).toHaveTitle(/FitCore/);

    const getStartedBtn = page.getByRole("button", { name: /Get started/i });
    await expect(getStartedBtn).toBeVisible();
    await getStartedBtn.click();

    // Step 1: Goal
    await expect(page.getByText(/What's your main goal?/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 2: Experience
    await expect(page.getByText(/Training experience?/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 3: Schedule
    await expect(page.getByText(/Training schedule/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 4: Weight
    await expect(page.getByText(/Your bodyweight/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 5: Macros
    await expect(page.getByText(/Macro targets/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Done step
    await expect(page.getByText(/You're all set/i)).toBeVisible();
    const finishBtn = page.getByRole("button", { name: /Enter FitCore/i });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Home screen renders after onboarding
    await expect(
      page.getByText("FitCore Today", { exact: true }).or(page.getByText("FitCore Score")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should navigate through main sections", async ({ page }) => {
    // Skip onboarding
    await page.evaluate(() => {
      localStorage.setItem("fitcore.v1", JSON.stringify({ onboardingComplete: true }));
    });
    await page.reload();

    // Home
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();

    // Navigate to Training
    await page.getByRole("button", { name: "Train" }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();

    // Navigate to Nutrition
    await page.getByRole("button", { name: "Fuel" }).click();
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();

    // Navigate to Recovery
    await page.getByRole("button", { name: "Recover" }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();

    // Navigate to Progress
    await page.getByRole("button", { name: "Stats" }).click();
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();

    // Back to Home
    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
  });

  test("should open and close quick actions", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("fitcore.v1", JSON.stringify({ onboardingComplete: true }));
    });
    await page.reload();

    // Log Meal
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    const logMealSheet = page.getByRole("heading", { name: "Log Meal" }).locator("xpath=..");
    await expect(logMealSheet).toBeVisible();
    await logMealSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(logMealSheet).not.toBeVisible();

    // Check In
    await page.getByRole("button", { name: "Check In", exact: true }).click();
    const checkInSheet = page.getByRole("heading", { name: "Daily Check-In" }).locator("xpath=..");
    await expect(checkInSheet).toBeVisible();
    await checkInSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(checkInSheet).not.toBeVisible();

    // Weigh In
    await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    const weighInSheet = page
      .getByRole("heading", { name: "Weigh In", exact: true })
      .locator("xpath=..");
    await expect(weighInSheet).toBeVisible();
    await weighInSheet
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(weighInSheet).not.toBeVisible();
  });

  test("should open and close settings", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("fitcore.v1", JSON.stringify({ onboardingComplete: true }));
    });
    await page.reload();

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hub" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { name: "Hub" })).not.toBeVisible();
  });

  test("should render AI launcher", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("fitcore.v1", JSON.stringify({ onboardingComplete: true }));
    });
    await page.reload();

    const aiLauncher = page
      .locator("button")
      .filter({ hasText: /Readiness is|AI COACH|Log your first/ });
    await expect(aiLauncher.first()).toBeVisible();
  });
});
