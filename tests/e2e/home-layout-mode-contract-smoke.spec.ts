import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("Home Layout Mode Contract Smoke Test", () => {
  test("should toggle between daily and deepDive modes and persist across navigation", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Initial mode should be daily
    const dailyToggle = page.getByRole("button", { name: /daily view/i });
    const deepDiveToggle = page.getByRole("button", { name: /deep dive/i });

    await expect(dailyToggle).toHaveAttribute("aria-pressed", "true");
    await expect(deepDiveToggle).toHaveAttribute("aria-pressed", "false");

    // Home should have no subtabs in Daily View
    const homeTabList = page.locator(".app-subtabs");
    await expect(homeTabList).toHaveCount(0);

    // Switch to Deep Dive
    await deepDiveToggle.click();
    await expect(dailyToggle).toHaveAttribute("aria-pressed", "false");
    await expect(deepDiveToggle).toHaveAttribute("aria-pressed", "true");

    // Home should have no subtabs in Deep Dive
    await expect(homeTabList).toHaveCount(0);

    // Navigate away and back using navigation locator
    const nav = page.locator("nav.app-bottom-nav");
    await page.locator(".command-bar__nav-item").filter({ hasText: "Training" }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
    await page.locator(".command-bar__nav-item").filter({ hasText: "Home" }).click();

    // Mode should be preserved
    await expect(deepDiveToggle).toHaveAttribute("aria-pressed", "true");
  });
});
