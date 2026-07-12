import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("App Shell Navigation Contract Smoke Test", () => {
  test("should have exactly 5 main destinations with proper names", async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    const nav = page.locator("nav.app-bottom-nav");
    await expect(nav).toBeVisible();

    const items = nav.locator(".command-bar__nav-item:not(.command-bar__nav-ai)");
    await expect(items).toHaveCount(5);

    // Exact names
    await expect(items.nth(0)).toHaveText(/Home/i);
    await expect(items.nth(1)).toHaveText(/Training/i);
    await expect(items.nth(2)).toHaveText(/Fuel\/Nutrition/i);
    await expect(items.nth(3)).toHaveText(/Recovery/i);
    await expect(items.nth(4)).toHaveText(/Stats/i);
  });
});
