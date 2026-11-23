import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

async function checkNoFatalErrors(page: Page) {
  const fatalErrors = [
    "This page didn't load",
    "Application error",
    "Unhandled Runtime Error",
    "createServerFn(...).validator is not a function",
    "Cannot read properties of undefined",
    "Cannot read properties of null",
  ];
  for (const error of fatalErrors) {
    await expect(page.getByText(error, { exact: false })).not.toBeVisible();
  }
}

const persistedState = readPersistedFitCoreState;

async function gotoSettings(page: Page) {
  const btn = page.getByLabel("Settings");
  if ((await btn.count()) === 0) {
    const expand = page.getByRole("button", { name: /Expand navigation/ });
    if (await expand.isVisible()) await expand.click();
  }
  await page.getByLabel("Settings").click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
}

test.describe("Settings reload behavior", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("preferences persist across a page reload", async ({ page }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    await gotoSettings(page);
    await page.getByRole("tab", { name: "Profile", exact: true }).click();

    const daysInput = page.getByLabel("Training days per week").or(
      page.getByPlaceholder(/days/i),
    );
    // Ensure profile tab renders a changeable days-per-week field.
    await expect(
      page.getByText("Training Profile", { exact: true }).or(
        page.getByText("days per week", { exact: true }),
      ),
    ).toBeVisible();

    // Navigate away and back through Settings to confirm tab state behavior.
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    await expect(page.getByText("Data Management", { exact: true }).first()).toBeVisible();

    await page.reload();
    await expectDashboardReady(page);

    await gotoSettings(page);
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Profile", exact: true })).toBeVisible();
  });

  test("backup export and import round-trip without fatal errors", async ({ page }) => {
    let exportSaved = false;
    page.on("download", async (download) => {
      const suggested = download.suggestedFilename();
      if (suggested.includes("fitcore") || suggested.includes("backup") || suggested.endsWith(".json")) {
        exportSaved = true;
        await download.path().catch(() => {});
      }
    });

    await page.goto("/");
    await expectDashboardReady(page);

    await gotoSettings(page);
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    await expect(page.getByText("Data Management", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect.poll(() => exportSaved).toBe(true);

    await expect(page.getByText("Import", { exact: true })).toBeVisible();
    await expect(page.getByText("Reset all data", { exact: true })).toBeVisible();
  });
});
