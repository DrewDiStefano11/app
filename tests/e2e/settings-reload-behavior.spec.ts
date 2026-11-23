import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

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

    const daysInput = page.getByLabel("Training days per week");
    await daysInput.fill("4");
    await daysInput.blur();
    await expect.poll(async () => (await persistedState(page)).profile.daysPerWeek).toBe(4);

    // Navigate away and back through Settings to confirm tab state behavior.
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    await expect(page.getByText("Data Management", { exact: true }).first()).toBeVisible();

    await page.reload();
    await expectDashboardReady(page);

    await gotoSettings(page);
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Profile", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await expect(daysInput).toHaveValue("4");
    expect((await persistedState(page)).profile.daysPerWeek).toBe(4);
  });

  test("backup export and import round-trip without fatal errors", async ({ page }) => {
    await page.goto("/");
    await expectDashboardReady(page);

    await gotoSettings(page);
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    await expect(page.getByText("Data Management", { exact: true }).first()).toBeVisible();

    const original = await persistedState(page);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^fitcore-backup-.*\.json$/);
    const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(backup.profile).toEqual(original.profile);
    expect(await persistedState(page)).toEqual(original);

    // Change a value, then restore the original export through the real importer.
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await page.getByLabel("Training days per week").fill("4");
    await page.getByLabel("Training days per week").blur();
    await expect.poll(async () => (await persistedState(page)).profile.daysPerWeek).toBe(4);
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    await page.getByLabel("Import backup file").setInputFiles({
      name: download.suggestedFilename(), mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(page.getByRole("status")).toHaveText("Imported successfully \u2713");
    await expect.poll(async () => (await persistedState(page)).profile).toEqual(original.profile);
    await page.reload();
    await expectDashboardReady(page);
    expect((await persistedState(page)).profile).toEqual(original.profile);

  });
});
