import { test, expect, type Page } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  FITCORE_MOBILE_VIEWPORTS,
  FITCORE_STORAGE_KEY,
} from "./helpers/fitcore-test-state";

async function checkNoFatalErrors(page: Page) {
  const fatalErrors = [
    "This page didn't load",
    "Application error",
    "Unhandled Runtime Error",
    "Cannot read properties of undefined",
    "Cannot read properties of null",
  ];
  for (const error of fatalErrors) {
    await expect(page.getByText(error, { exact: false })).not.toBeVisible();
  }
}

test.describe("Nutrition Daily View Lifecycle", () => {
  test.use({ viewport: FITCORE_MOBILE_VIEWPORTS.iphoneModern, isMobile: true });

  test("Daily view validations, logging a custom meal, handling duplicates, and deep dive tabs", async ({
    page,
  }) => {
    // 1-2. Seed state and navigate to Fuel/Nutrition
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    await page.getByRole("button", { name: /^Fuel/i }).click();

    // 3. Confirm Daily View is active and no subtabs
    await expect(page.getByText("Daily View", { exact: false })).toBeVisible();
    await expect(page.getByRole("tablist")).not.toBeVisible();

    // 4. Confirm Daily Macros is visible
    await expect(page.getByText("Daily Macros", { exact: true })).toBeVisible();

    // 5. Confirm no Photo Meal control exists on the main surface
    await expect(page.getByText("Photo Log", { exact: true })).not.toBeVisible();

    // 6. Confirm hydration does not display fabricated "0 fl oz"
    await expect(page.getByText("0 fl oz", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Not connected", { exact: true })).toBeVisible();

    // 7. Open Log Meal
    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
    const sheetRoot = page
      .locator(".sheet-root")
      .filter({ has: page.getByRole("heading", { name: "Log Meal", exact: true }) });
    await expect(sheetRoot).toBeVisible();

    // Switch to Custom Entry
    await sheetRoot.getByText("Custom Entry", { exact: true }).click();

    // 8. Attempt invalid custom entries
    const nameInput = sheetRoot.getByRole("textbox").first(); // Name
    const kcalInput = sheetRoot.locator('input[inputmode="numeric"]').nth(0);
    const saveBtn = sheetRoot.getByRole("button", { name: "Add to Daily Log" });

    await nameInput.fill("");
    await saveBtn.click();

    // 9. Confirm invalid entries do not close the sheet
    await expect(sheetRoot).toBeVisible();

    // 10. Confirm accessible validation appears
    await expect(sheetRoot.locator('p[role="alert"]')).toBeVisible();

    // 11. Confirm controlled values remain present
    await nameInput.fill("Invalid Kcal Meal");
    await kcalInput.fill("-100");
    await saveBtn.click();

    await expect(sheetRoot).toBeVisible();
    await expect(kcalInput).toHaveValue("-100");
    await expect(sheetRoot.locator('p[role="alert"]')).toBeVisible();

    // 12. Correct the inputs
    await nameInput.fill("Valid Chicken Bowl");
    await kcalInput.fill("400");
    const pInput = sheetRoot.locator('input[inputmode="numeric"]').nth(1);
    await pInput.fill("35");

    // 13. Save one valid custom meal
    await saveBtn.click();

    // 14. Confirm the sheet closes
    await expect(sheetRoot).not.toBeVisible();

    // 15. Confirm the meal appears once
    await expect(page.getByText("Valid Chicken Bowl", { exact: true })).toBeVisible();

    // 16. Confirm calorie totals update
    // Verify through the real UI instead of localStorage
    await expect(page.getByText("Valid Chicken Bowl", { exact: true })).toBeVisible();
    await expect(page.getByText("400", { exact: true })).toBeVisible(); // Check UI for calories

    // 17. Reopen the sheet
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();
    await expect(sheetRoot).toBeVisible();

    // The form should be reset, switch back to custom
    await sheetRoot.getByText("Custom Entry", { exact: true }).click();

    // 18. Save a second valid meal
    const nameInput2 = sheetRoot.getByRole("textbox").first();
    const kcalInput2 = sheetRoot.locator('input[inputmode="numeric"]').nth(0);
    await nameInput2.fill("Quick Snack");
    await kcalInput2.fill("150");

    // 19-20. Test rapid duplicate submission (double click)
    // Fire the click, then immediately try firing another click without waiting for navigation/closure
    const btnHandle = await saveBtn.elementHandle();
    if (btnHandle) {
      await btnHandle.click();
      await btnHandle.click().catch(() => {});
    }

    await expect(sheetRoot).not.toBeVisible();

    // 21. Confirm one intended record is created
    // Verify through the real UI instead of localStorage
    await expect(page.getByText("Quick Snack", { exact: true })).toHaveCount(1);

    // 22. Delete one selected meal
    // Scope the delete click specifically to the Quick Snack record
    // Using `locator('.premium-card')` to be more specific than just 'div' which can nest the button multiple times
    const quickSnackRecord = page.locator(".premium-card").filter({ hasText: "Quick Snack" }).first();
    await quickSnackRecord.getByRole("button", { name: "Delete meal" }).click();

    // Confirm delete dialog appears and confirm it
    const confirmDialog = page
      .locator(".sheet-root")
      .filter({ has: page.getByRole("heading", { name: "Delete meal?", exact: true }) });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();

    // 24. Confirm overlays are removed
    await expect(confirmDialog).not.toBeVisible();

    // 25. Confirm navigation remains usable
    // Verify through the real UI instead of localStorage
    await expect(page.getByText("Quick Snack", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Valid Chicken Bowl", { exact: true })).toBeVisible();

    // 26. Switch to Deep Dive
    // First, navigate to home where the toggle lives, change it, then navigate back
    await page.getByRole("button", { name: /^Home/i }).click();
    await expect(
      page
        .getByText("FitCore Today", { exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();

    const layoutToggle = page.getByRole("button", { name: "Deep Dive" });
    if (await layoutToggle.isVisible()) {
      await layoutToggle.click();
      await expect(layoutToggle).toHaveAttribute("aria-pressed", "true");
    }

    // Navigate back to Fuel/Nutrition
    await page.getByRole("button", { name: /^Fuel/i }).click();

    // 27. Confirm exactly Macros, Quality, Timing, and Insights.
    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible();

    await expect(page.getByRole("tab", { name: "Macros", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quality", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Timing", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Insights", exact: true })).toBeVisible();

    // 28. Confirm every Deep Dive tab renders without errors.
    await page.getByRole("tab", { name: "Quality", exact: true }).click();
    await checkNoFatalErrors(page);
    await page.getByRole("tab", { name: "Timing", exact: true }).click();
    await checkNoFatalErrors(page);
    await page.getByRole("tab", { name: "Insights", exact: true }).click();
    await checkNoFatalErrors(page);
    await page.getByRole("tab", { name: "Macros", exact: true }).click();
    await checkNoFatalErrors(page);
  });
});
