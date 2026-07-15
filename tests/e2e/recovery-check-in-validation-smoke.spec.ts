import { test, expect } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.describe("Recovery check-in validation smoke", () => {
  const checkFatalErrors = async (page) => {
    await expect(page.getByText("This page didn't load")).not.toBeVisible();
    await expect(page.getByText("Application error")).not.toBeVisible();
    await expect(page.getByText("Unhandled Runtime Error")).not.toBeVisible();
    await expect(
      page.getByText("createServerFn(...).validator is not a function"),
    ).not.toBeVisible();
    await expect(page.getByText("Cannot read properties of undefined")).not.toBeVisible();
    await expect(page.getByText("Cannot read properties of null")).not.toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  test("Scenario A & D — Valid check-in saves safely and Recovery renders safely", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Check In", exact: true }).click();
    const sheet = page
      .getByRole("heading", { name: "Daily Check-In", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole("textbox").fill("Validation recovery check-in");

    // Attempt to save
    await sheet.getByRole("button", { name: "Save check-in", exact: true }).click();

    // Confirm sheet closes
    await expect(sheet).not.toBeVisible();
    await checkFatalErrors(page);

    // Verify authoritative revisioned state.
    await expect
      .poll(async () => (await readPersistedFitCoreState(page)).recoveryCheckIns.length)
      .toBeGreaterThan(0);

    // Wait for the popup to fully close and nav to be interactable
    const homeBtn = page.getByRole("button", { name: "Expand navigation, current section Home" });
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    }

    // Navigate to Recovery section using bottom navigation
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
    await checkFatalErrors(page);

    // Reload
    await page.reload();
    await checkFatalErrors(page);
  });

  test("Scenario B — Empty/minimal check-in does not crash", async ({ page }) => {
    await page.getByRole("button", { name: "Check In", exact: true }).click();
    const sheet = page
      .getByRole("heading", { name: "Daily Check-In", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Save check-in", exact: true }).click();
    await checkFatalErrors(page);
  });

  test("Scenario C — Cancel does not save", async ({ page }) => {
    await page.getByRole("button", { name: "Check In", exact: true }).click();
    const sheet = page
      .getByRole("heading", { name: "Daily Check-In", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole("textbox").fill("Validation recovery check-in");

    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(sheet).not.toBeVisible();
    await checkFatalErrors(page);

    // Verify no new check-in
    await expect
      .poll(async () => (await readPersistedFitCoreState(page)).recoveryCheckIns.length)
      .toBe(0);
  });
});
