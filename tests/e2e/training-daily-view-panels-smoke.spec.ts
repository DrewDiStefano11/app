import { test, expect } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  FITCORE_MOBILE_VIEWPORTS,
} from "./helpers/fitcore-test-state";

test.describe("Training Daily View Smoke", () => {
  test.use({ viewport: FITCORE_MOBILE_VIEWPORTS.iphoneModern, isMobile: true });

  test("scenario coverage for Training Daily View layout and active workout paths", async ({
    page,
  }) => {
    // Scenario A — Training tab renders safely
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Navigate to Training tab
    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    await page.getByRole("button", { name: "Train", exact: true }).click();

    // Assert the Training heading or Daily View shell is visible
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // Assert no fatal error text is visible
    const fatalErrors = [
      "This page didn't load",
      "Application error",
      "Unhandled Runtime Error",
      "createServerFn(...).validator is not a function",
      "Cannot read properties of undefined",
      "Cannot read properties of null",
    ];
    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }

    // Force Daily View before checking Daily-only panels.
    const dailyToggle = page.getByRole("button", { name: /daily view/i });
    if (await dailyToggle.isVisible()) {
      await dailyToggle.click();
      await expect(dailyToggle).toHaveAttribute("aria-pressed", "true");
    }

    // Scenario B — Main Training Daily View sections are reachable
    await expect(page.getByText("Programs & templates")).toBeVisible();
    await expect(page.getByText("Last workout").or(page.getByText("Recent history"))).toBeVisible();
    await expect(page.getByText("Cardio & sports")).toBeVisible();
    await expect(page.getByText("Weekly Volume Summary")).toBeVisible();

    // Scenario C — Secondary panels/sheets open and close safely
    // 1. Programs & templates
    // Click on the Card or "View all" button next to "Programs & templates"
    await page.getByRole("button", { name: /view all/i }).click();

    const templatesHeading = page.locator(".sheet-title", { hasText: "Programs & templates" });
    await expect(templatesHeading).toBeVisible();

    // The BottomSheet uses an X icon for closing, which now has aria-label="Close"
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(templatesHeading).not.toBeVisible();
    await expect(page.locator(".sheet-root")).not.toBeVisible();

    // 2. Cardio & sports
    await page.getByRole("button", { name: /^open$/i, exact: true }).click();

    const cardioHeading = page.locator(".sheet-title", { hasText: "Cardio & sports" });
    await expect(cardioHeading).toBeVisible();

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(cardioHeading).not.toBeVisible();
    await expect(page.locator(".sheet-root")).not.toBeVisible();

    // Confirm bottom navigation still works afterward by actually clicking a different tab
    const expandNavAgain = page.getByRole("button", { name: "Expand navigation" });
    if (await expandNavAgain.isVisible()) {
      await expandNavAgain.click();
    }

    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();

    const expandNavBack = page.getByRole("button", { name: "Expand navigation" });
    if (await expandNavBack.isVisible()) {
      await expandNavBack.click();
    }

    await page.getByRole("button", { name: "Train", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // Scenario D — Blank workout / active workout path is safe
    await page.getByText("Blank workout", { exact: true }).click();

    // Confirm the active workout screen appears
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    // Navigate away safely (discard workout)
    // Click the X button (aria-label="Discard workout")
    await page.getByRole("button", { name: "Discard workout" }).click();
    // Confirm dialog Discard button
    await page
      .locator(".sheet-surface")
      .getByRole("button", { name: "Discard", exact: true })
      .click();

    // Confirm the app does not crash and we're back at training view
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }

    // Scenario E — Reload stability
    await page.reload();

    // In FitCore, reloading puts us back on Home. Navigate to Train again.
    const expandBtnAfterReload = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtnAfterReload.isVisible()) {
      await expandBtnAfterReload.click();
    }
    await page.getByRole("button", { name: "Train", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }
  });
});
