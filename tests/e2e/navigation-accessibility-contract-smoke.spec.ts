import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("Navigation Accessibility Contract Smoke Test", () => {
  test("destinations must be keyboard accessible with correct focus semantics", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    const nav = page.locator("nav.app-bottom-nav");
    await expect(nav).toBeVisible();

    const tabs = nav.locator(".command-bar__nav-item:not(.command-bar__nav-ai)");
    const numTabs = await tabs.count();

    // Check initial state
    await expect(tabs.nth(0)).toHaveClass(/nav-item-active/);

    // Test keyboard navigation
    for (let i = 1; i < numTabs; i++) {
      const tab = tabs.nth(i);
      await tab.focus();
      await expect(tab).toBeFocused();
      await page.keyboard.press("Enter");

      await expect(tab).toHaveClass(/nav-item-active/);
    }
  });
});
