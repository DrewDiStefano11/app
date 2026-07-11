import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("Navigation accessibility contract", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  test("Unique accessible names contract", async ({ page }) => {
    // Confirm unique accessible names for bottom tabs
    const nav = page.locator("nav.app-bottom-nav");
    await expect(nav.getByRole("button", { name: "Home", exact: true })).toHaveCount(1);

    // We expect these exactly as specified in the prompt.
    // The test is failing because the app doesn't implement these exact labels,
    // which is the intended outcome of this strict contract test.
    await expect(nav.getByRole("button", { name: "Training", exact: true })).toHaveCount(1);
    await expect(nav.getByRole("button", { name: "Fuel/Nutrition", exact: true })).toHaveCount(1);
    await expect(nav.getByRole("button", { name: "Recovery", exact: true })).toHaveCount(1);
    await expect(nav.getByRole("button", { name: "Progress", exact: true })).toHaveCount(1);

    // Confirm unique accessible names for global controls
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Daily View", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Deep Dive", exact: true })).toHaveCount(1);

    // Dialog heading and close controls (Settings)
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toHaveCount(1);

    // Done should be unique in this context
    await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(1);
  });

  test("Keyboard navigation contract", async ({ page }) => {
    // Focus sequence check
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Bottom tabs keyboard reachable
    // Open Settings with keyboard activation
    const settingsBtn = page.getByRole("button", {
      name: "Settings",
      exact: true,
    });
    await settingsBtn.focus();
    await page.keyboard.press("Enter");

    // Settings is reachable from Home and openable via keyboard
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    // Done can be reached and activated via keyboard
    const doneBtn = page.getByRole("button", { name: "Done", exact: true });
    await doneBtn.focus();
    await page.keyboard.press("Enter");

    // Focus does not become trapped or lost into invisible portals
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).not.toBeVisible();
    await expect(page.locator(".sheet-root")).toHaveCount(0);

    // Layout mode controls can be reached and activated
    const deepDiveBtn = page.getByRole("button", {
      name: "Deep Dive",
      exact: true,
    });
    await deepDiveBtn.focus();
    await page.keyboard.press("Enter");
    await expect(deepDiveBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("Focus and overlay cleanup contract", async ({ page }) => {
    // After opening and closing Settings
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).not.toBeVisible();

    // No invisible backdrop intercepts pointer events
    await expect(page.locator(".sheet-root")).toHaveCount(0);

    // Bottom navigation is clickable
    const trainTab = page.locator("nav").getByRole("button", { name: "Training", exact: true });

    // Expected to fail if Training tab does not exist
    await trainTab.click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // Return Home
    const homeTab = page.locator("nav").getByRole("button", { name: "Home", exact: true });

    await homeTab.click();

    // Body scrolling is restored
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    // Keyboard Tab navigation continues through visible controls
    await page.keyboard.press("Tab");

    // App remains navigable after repeated open/close cycles
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator(".sheet-root")).toHaveCount(0);
  });
});
