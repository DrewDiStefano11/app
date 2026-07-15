import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  gotoDashboard,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

type QuickActionCase = {
  buttonName: "Log Meal" | "Check In" | "Weigh In";
  headingName: "Log Meal" | "Daily Check-In" | "Weigh In";
  content: RegExp;
};

const quickActions: QuickActionCase[] = [
  { buttonName: "Log Meal", headingName: "Log Meal", content: /Meal name|AI Photo Estimate/i },
  { buttonName: "Check In", headingName: "Daily Check-In", content: /Predicted Readiness|Energy/i },
  { buttonName: "Weigh In", headingName: "Weigh In", content: /Current weight|Save weigh-in/i },
];

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

async function expectNoQuickActionDataSaved(page: Page) {
  await expect
    .poll(async () => {
      const state = await readPersistedFitCoreState(page);
      return {
        meals: state.mealEntries.length,
        checkIns: state.recoveryCheckIns.length,
        weights: state.bodyweightEntries.length,
      };
    })
    .toEqual({ meals: 0, checkIns: 0, weights: 0 });
}

test.describe("Quick Actions popup open/close regression", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  for (const action of quickActions) {
    test(`${action.buttonName} opens an overlay and closes back to Home`, async ({ page }) => {
      const homeUrl = page.url();

      await page.getByRole("button", { name: action.buttonName, exact: true }).click();

      const sheet = sheetByHeading(page, action.headingName);
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(action.content);
      expect(page.url()).toBe(homeUrl);

      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();

      await expect(sheet).not.toBeVisible();
      await expectDashboardReady(page);
      expect(page.url()).toBe(homeUrl);
      await expectNoQuickActionDataSaved(page);
    });
  }
});
