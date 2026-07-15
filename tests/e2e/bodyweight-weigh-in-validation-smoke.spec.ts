import { expect, test, type Page } from "@playwright/test";
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
    "TypeError: createServerFn",
    "Cannot read properties of undefined",
    "Cannot read properties of null",
  ];
  for (const error of fatalErrors) {
    await expect(page.getByText(error, { exact: false })).not.toBeVisible();
  }
}

const persistedState = readPersistedFitCoreState;

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

test.describe("Bodyweight weigh-in validation smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("Scenario A: Valid weigh-in saves safely", async ({ page }) => {
    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("181.4");
    await sheet.getByRole("button", { name: "Save weigh-in", exact: true }).click();

    await expect(sheet).not.toBeVisible();

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.bodyweightEntries?.length ?? 0;
      })
      .toBe(1);

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.bodyweightEntries?.[0]?.weightLb;
      })
      .toBe(181.4);

    await page.reload();
    await expectDashboardReady(page);

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.bodyweightEntries?.length ?? 0;
      })
      .toBe(1);

    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("fitcore:nav", { detail: "progress" })),
    );
    await expect(
      page
        .getByText("FitCore Score", { exact: true })
        .or(page.getByRole("heading", { name: "Progress", exact: true })),
    ).toBeVisible();
    await checkNoFatalErrors(page);
  });

  test("Scenario B: Cancel does not save", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialEntries = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("182");
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(sheet).not.toBeVisible();

    await expect
      .poll(async () => {
        const state = await persistedState(page);
        return state.bodyweightEntries?.length ?? 0;
      })
      .toBe(initialEntries);
  });

  test("Scenario C: Empty input does not crash or create broken data", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialEntries = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("");

    const saveButton = sheet.getByRole("button", { name: "Save weigh-in", exact: true });

    // In current implementation it might not be disabled but clicking save does nothing if wt is empty.
    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      // Expect not to create a new entry
      await expect
        .poll(async () => {
          const state = await persistedState(page);
          return state.bodyweightEntries?.length ?? 0;
        })
        .toBe(initialEntries);
    }

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(sheet).not.toBeVisible();
    }
  });

  test("Scenario D: Invalid numeric input does not create broken data", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialEntries = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("-50");

    const saveButton = sheet.getByRole("button", { name: "Save weigh-in", exact: true });

    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      // Ensure it does not create a broken entry (-50, 0, negative values)
      await expect
        .poll(async () => {
          const state = await persistedState(page);
          // Specifically verify localStorage does not contain a negative or zero bodyweight entry.
          const entryCount = state.bodyweightEntries?.length ?? 0;
          if (entryCount > initialEntries) {
            const lastEntry = state.bodyweightEntries[state.bodyweightEntries.length - 1];
            return lastEntry.weightLb <= 0; // we want this to be false, meaning not negative/zero
          }
          return false; // length didn't change, so no negative entry created
        })
        .toBe(false);
    }

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(sheet).not.toBeVisible();
    }
  });

  test("Scenario E: Progress/Stats remains safe after valid weigh-in", async ({ page }) => {
    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("181.4");
    await sheet.getByRole("button", { name: "Save weigh-in", exact: true }).click();

    await expect(sheet).not.toBeVisible();

    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("fitcore:nav", { detail: "progress" })),
    );
    await expect(
      page
        .getByText("FitCore Score", { exact: true })
        .or(page.getByRole("heading", { name: "Progress", exact: true })),
    ).toBeVisible();
    await checkNoFatalErrors(page);
  });
});
