import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

const RICH_STATE = currentFitCoreState({
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
  workouts: [
    {
      id: "w-rich-1",
      name: "Push Day",
      startedAt: Date.now() - 86400000,
      endedAt: Date.now() - 82800000,
      exercises: [],
    },
  ],
  activeWorkout: null,
  mealEntries: [
    {
      id: "m-rich-1",
      name: "Big Chicken Bowl",
      type: "lunch",
      calories: 800,
      protein: 60,
      carbs: 80,
      fat: 20,
      createdAt: Date.now() - 40000000,
    },
  ],
  bodyweightEntries: [
    {
      id: "bw-rich-1",
      weightLb: 181.5,
      createdAt: Date.now() - 50000000,
    },
  ],
  sleepEntries: [
    {
      id: "sl-rich-1",
      hours: 7.5,
      quality: 4,
      createdAt: Date.now() - 60000000,
    },
  ],
  recoveryCheckIns: [
    {
      id: "rc-rich-1",
      energy: 4,
      soreness: 2,
      stress: 2,
      motivation: 4,
      notes: "Feeling rich",
      createdAt: Date.now() - 30000000,
    },
  ],
  muscleFatigue: {
    chest: "moderate",
    legs: "fatigued",
  },
  goals: [
    { id: "g-rich-1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 2 },
  ],
  supplementLogs: [
    { id: "sup-rich-1", name: "Whey", createdAt: Date.now() - 20000000, dose: "1 scoop" },
  ],
  progressPhotos: [
    {
      id: "pho-rich-1",
      dataUrl: "data:image/png;base64,AA==",
      view: "front",
      phase: "maintenance",
      createdAt: Date.now() - 10000000,
    },
  ],
});

async function seedReloadableRichState(page: Page) {
  await seedRevisionedFitCoreState(page, RICH_STATE);
  await expectDashboardReady(page);
}

const persistedState = readPersistedFitCoreState;

async function assertNoFatalErrors(page: Page) {
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("This page didn't load");
  expect(bodyText).not.toContain("Application error");
  expect(bodyText).not.toContain("Unhandled Runtime Error");
  expect(bodyText).not.toContain("createServerFn(...).validator is not a function");
  expect(bodyText).not.toContain("Cannot read properties of undefined");
  expect(bodyText).not.toContain("Cannot read properties of null");
}

test.describe("Rich state all-tabs smoke", () => {
  let pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async ({ page }) => {
    if (pageErrors.length > 0) {
      throw new Error(`Fatal page errors occurred: ${pageErrors.map((e) => e.message).join(", ")}`);
    }
    await assertNoFatalErrors(page);
  });

  test("loads rich state safely, navigates all tabs, does not wipe data, handles reload", async ({
    page,
  }) => {
    // Scenario A — Rich state loads Home safely
    await seedReloadableRichState(page);
    await assertNoFatalErrors(page);

    // Confirm localStorage contains the seeded data (Scenario A)
    let state = await persistedState(page);
    expect(state.workouts[0]?.id).toBe("w-rich-1");
    expect(state.mealEntries[0]?.id).toBe("m-rich-1");

    // Scenario B — All main tabs render safely
    const sections = [
      { name: "Training", navButton: "Train", heading: "Training", exactNav: true },
      { name: "Nutrition", navButton: "Fuel", heading: "Nutrition", exactNav: true },
      { name: "Recovery", navButton: "Recover", heading: "Recovery", exactNav: true },
      { name: "Progress", navButton: "Stats", heading: "Progress", exactNav: true },
    ];

    for (const section of sections) {
      await page.getByRole("button", { name: section.navButton, exact: section.exactNav }).click();
      await expect(page.getByRole("heading", { name: section.heading })).toBeVisible();
      await assertNoFatalErrors(page);
    }

    await page.getByRole("button", { name: "Home", exact: true }).click();
    // Settings/Hub (Scenario B continued)
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await assertNoFatalErrors(page);

    // Scenario E — No stuck overlay / no blocked navigation
    // Close the hub safely
    await page.getByRole("button", { name: "Done" }).click();

    // Navigate back to Home to ensure nav is still usable
    await page.getByRole("button", { name: "Home" }).click();
    await expectDashboardReady(page);
    await assertNoFatalErrors(page);

    // Scenario C — Data is not wiped during navigation
    state = await persistedState(page);
    expect(state.workouts[0]?.id).toBe("w-rich-1");
    expect(state.mealEntries[0]?.id).toBe("m-rich-1");
    expect(state.bodyweightEntries[0]?.id).toBe("bw-rich-1");
    expect(state.sleepEntries[0]?.id).toBe("sl-rich-1");
    expect(state.recoveryCheckIns[0]?.id).toBe("rc-rich-1");

    // Scenario D — Reload stability
    // Navigate to Recovery
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();

    // Reload
    await page.reload();

    // In FitCore, reloading on a sub-tab resets to 'Home' tab.
    await expectDashboardReady(page);
    await assertNoFatalErrors(page);

    // Confirm seeded localStorage data still exists
    state = await persistedState(page);
    expect(state.workouts[0]?.id).toBe("w-rich-1");
    expect(state.mealEntries[0]?.id).toBe("m-rich-1");
    expect(state.bodyweightEntries[0]?.id).toBe("bw-rich-1");

    // Final check for bottom nav functionality
    await page.getByRole("button", { name: "Home" }).click();
    await assertNoFatalErrors(page);
  });
});
