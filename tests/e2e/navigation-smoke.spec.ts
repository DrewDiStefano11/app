import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("Navigation Smoke Test", () => {
  test("should navigate to all top-level sections", async ({ page }) => {
    // 1. Seed the minimal onboarded state to bypass onboarding
    await seedMinimalOnboardedState(page);

    // 2. Navigate to the dashboard
    await gotoDashboard(page);

    // 3. Navigate to Training
    await page.getByRole("button", { name: "Train" }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();

    // 4. Navigate to Nutrition
    await page.getByRole("button", { name: "Fuel" }).click();
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();

    // 5. Navigate to Recovery
    await page.getByRole("button", { name: "Recover" }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();

    // 6. Navigate to Progress
    await page.getByRole("button", { name: "Stats" }).click();
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();

    // 7. Go back to Home
    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();

    // 8. Open Settings
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hub" })).toBeVisible();
  });
});
