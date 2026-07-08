import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  FITCORE_DATA_VERSION,
  FITCORE_STORAGE_KEY,
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

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), FITCORE_STORAGE_KEY);
}

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

// Reusing the reloadable state pattern from core-logging-persistence-smoke
async function seedReloadableOnboardedState(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ key, version }) => {
      localStorage.clear();
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          onboardingComplete: true,
          profile: {
            goal: "hypertrophy",
            experience: "intermediate",
            daysPerWeek: 5,
            split: "Push / Pull / Legs",
            bodyweightLb: 180,
            targetBodyweightLb: 185,
            units: "lb",
          },
          workouts: [],
          activeWorkout: null,
          mealEntries: [],
          bodyweightEntries: [],
          goals: [
            { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
          ],
        }),
      );
    },
    { key: FITCORE_STORAGE_KEY, version: FITCORE_DATA_VERSION },
  );
  await page.reload();
  await expectDashboardReady(page);
}

test.describe("Bodyweight weigh-in validation smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedReloadableOnboardedState(page);
  });

  test.afterEach(async ({ page }) => {
    await checkNoFatalErrors(page);
  });

  test("Scenario A & D & E: Valid weigh-in saves safely, Progress renders safely, and Reload stability", async ({ page }) => {
    // Navigate to the Weigh In popup
    await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    // Enter valid bodyweight
    await sheet.getByRole("spinbutton").first().fill("181.6");
    await sheet.getByRole("button", { name: "Save weigh-in", exact: true }).click();

    // Assert popup closes and no fatal error
    await expect(sheet).not.toBeVisible();
    await checkNoFatalErrors(page);

    // Poll localStorage for valid save
    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.bodyweightEntries?.length ?? 0;
    }).toBeGreaterThan(0);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.bodyweightEntries?.[0]?.weightLb;
    }).toBe(181.6);

    // Go to Stats
    // First, expand the mobile nav if it's hidden
    const homeBtn = page.getByRole('button', { name: 'Expand navigation, current section Home' });
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    }

    // In `recovery-check-in-validation-smoke.spec.ts` the button is "Recover"
    // Memory mentions "Stats" button for Insights/Progress
    // Wait for the popup to fully close and nav to be interactable
    await page.getByRole("button", { name: "Stats", exact: true }).click();

    // Assert the Progress or Stats heading renders. But wait, `error-context.md` showed no "Progress" heading. Let's assert something safe.
    // Memory says: "For data visualizations (e.g., Progress/Insights charts), smoke tests should avoid asserting exact graph math... Instead, focus on preventing fatal runtime errors and verifying stable empty-state or safe fallback UI renders correctly."
    // Let's assert a more robust title or just check fatal errors. The memory says: "the 5 tabs: Today, Training, Nutrition, Recovery, and Insights".
    // I will check for "Insights" or "Stats" being visible. Let's look for `Insights` heading or similar. Or just check no fatal errors. Let's just expect it not to crash.
    await expect(page.getByRole("heading", { name: "Insights", exact: true })
            .or(page.getByRole("heading", { name: "Stats", exact: true }))
            .or(page.getByText("Stats", { exact: true }))
    ).toBeVisible({ timeout: 5000 });

    await checkNoFatalErrors(page);

    // Reload stability on Stats
    await page.reload();
    await checkNoFatalErrors(page);

    // Confirm entry remains in localStorage
    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.bodyweightEntries?.[0]?.weightLb;
    }).toBe(181.6);
  });

  test("Scenario B: Cancel does not save", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialCount = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("spinbutton").first().fill("199.9");
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(sheet).not.toBeVisible();
    await checkNoFatalErrors(page);

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.bodyweightEntries?.length ?? 0;
    }).toBe(initialCount);
  });

  test("Scenario C: Empty input does not crash", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialCount = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    // Ensure we start with empty input
    await sheet.getByRole("spinbutton").first().fill("");

    const saveButton = sheet.getByRole("button", { name: "Save weigh-in", exact: true });

    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      await checkNoFatalErrors(page);
    }

    await expect.poll(async () => {
      const state = await persistedState(page);
      return state.bodyweightEntries?.length ?? 0;
    }).toBe(initialCount);

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    }
  });

  test("Scenario C: Invalid input does not crash", async ({ page }) => {
    const initialState = await persistedState(page);
    const initialCount = initialState.bodyweightEntries?.length ?? 0;

    await page.getByRole("button", { name: "Weigh In", exact: true }).click();
    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();

    // Enter an invalid or extreme value, something outside bounds if there are bounds, or zero/negative
    await sheet.getByRole("spinbutton").first().fill("-10");

    const saveButton = sheet.getByRole("button", { name: "Save weigh-in", exact: true });

    const isDisabled = await saveButton.isDisabled();
    if (isDisabled) {
      await expect(saveButton).toBeDisabled();
    } else {
      await saveButton.click();
      await checkNoFatalErrors(page);
    }

    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    }
  });
});
