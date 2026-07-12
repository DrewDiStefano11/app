import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("App PR Gate Smoke", () => {
  test("broad app load, navigation, and quick actions", async ({ page }) => {
    // A. Page error handling
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    // B. App load
    // Seed minimal onboarded state using existing helper pattern
    await seedMinimalOnboardedState(page);
    // Navigate to the app/dashboard
    await gotoDashboard(page);

    // Fail the test if fatal page errors occur
    if (pageErrors.length > 0) {
      throw new Error(`Fatal page errors occurred: ${pageErrors.map((e) => e.message).join(", ")}`);
    }

    // Confirm the app does not show error messages or blank shell
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("This page didn't load");
    expect(bodyText).not.toContain("Application error");
    expect(bodyText).not.toContain("Unhandled Runtime Error");
    expect(bodyText).not.toContain("createServerFn(...).validator is not a function");
    expect(bodyText.trim()).not.toBe("");

    // Confirm Home/FitCore dashboard is visible
    const homeIndicator = page
      .getByText("FitCore Score", { exact: true })
      .or(page.getByText("FitCore Today", { exact: true }));
    await expect(homeIndicator).toBeVisible();

    // C. Main navigation
    const sections = [
      { name: "Training", navButton: "Training", heading: "Training" },
      { name: "Nutrition", navButton: "Fuel/Nutrition", heading: "Nutrition" },
      { name: "Recovery", navButton: "Recovery", heading: "Recovery", exactNav: true },
      { name: "Progress", navButton: "Stats", heading: "Stats" },
    ];

    for (const section of sections) {
      await page.getByRole("button", { name: section.navButton, exact: section.exactNav }).click();
      await expect(page.getByRole("heading", { name: section.heading })).toBeVisible();
      expect(pageErrors.length).toBe(0);
    }

    await page.getByRole("button", { name: "Home" }).click();
    await expect(homeIndicator).toBeVisible();

    // Settings or Hub
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(pageErrors.length).toBe(0);

    // Close Hub and return to Home
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Home" }).click();
    await expect(homeIndicator).toBeVisible();

    // D. Reload stability
    // Reload from a major section (Training)
    await page.getByRole("button", { name: "Train" }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Training" }).or(homeIndicator)).toBeVisible();
    expect(pageErrors.length).toBe(0);

    // Return to Home
    await page.getByRole("button", { name: "Home" }).click();
    await expect(homeIndicator).toBeVisible();

    // E. Home quick actions
    const quickActions = [
      { buttonName: "Log Meal", headingName: "Log Meal" },
      { buttonName: "Check In", headingName: "Daily Check-In" },
      { buttonName: "Weigh In", headingName: "Weigh In" },
    ];

    for (const action of quickActions) {
      // Record current URL
      const currentUrl = page.url();

      // Confirm button is visible and click
      const actionButton = page.getByRole("button", { name: action.buttonName, exact: true });
      await expect(actionButton).toBeVisible();
      await actionButton.click();

      // Confirm overlay appears
      const overlay = page
        .getByRole("heading", { name: action.headingName, exact: true })
        .locator("xpath=..");
      await expect(overlay).toBeVisible();

      // Confirm URL did not unexpectedly navigate away
      expect(page.url()).toBe(currentUrl);

      // Close/cancel the overlay
      // Typically these overlays have an X button or a Cancel button.
      // The smoke.spec.ts uses: getByRole('button').filter({ has: page.locator('svg') }).first().click()
      await overlay
        .getByRole("button")
        .filter({ has: page.locator("svg") })
        .first()
        .click();

      // Confirm Home is visible again
      await expect(overlay).not.toBeVisible();
      await expect(homeIndicator).toBeVisible();
    }

    // Final error check
    if (pageErrors.length > 0) {
      throw new Error(`Fatal page errors occurred: ${pageErrors.map((e) => e.message).join(", ")}`);
    }
  });
});
