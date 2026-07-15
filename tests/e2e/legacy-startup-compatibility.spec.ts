import { expect, test } from "@playwright/test";

import { FITCORE_ATOMIC_PERSISTENCE_KEYS } from "../../src/lib/atomic-persistence";
import { FITCORE_REVISION_STORAGE_KEY } from "../../src/lib/revisioned-persistence";
import {
  FITCORE_DATA_VERSION,
  FITCORE_STORAGE_KEY,
  seedFitCoreAppState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

test.describe("legacy startup compatibility", () => {
  test("empty startup remains onboarding without persistence writes", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
    const persisted = await page.evaluate(
      (keys) => keys.map((key) => localStorage.getItem(key)),
      [
        FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
        FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
        FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB,
        FITCORE_REVISION_STORAGE_KEY,
        FITCORE_STORAGE_KEY,
      ],
    );
    expect(persisted).toEqual([null, null, null, null, null]);
  });

  test("recognized partial legacy startup migrates and publishes once", async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await page.goto("/");

    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), FITCORE_REVISION_STORAGE_KEY))
      .not.toBeNull();
    await expect(
      page
        .getByText("FitCore Today", { exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();

    const beforeReload = await page.evaluate(
      (keys) => keys.map((key) => localStorage.getItem(key)),
      [
        FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
        FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
        FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB,
        FITCORE_REVISION_STORAGE_KEY,
      ],
    );
    await page.reload();
    expect(
      await page.evaluate(
        (keys) => keys.map((key) => localStorage.getItem(key)),
        [
          FITCORE_ATOMIC_PERSISTENCE_KEYS.manifest,
          FITCORE_ATOMIC_PERSISTENCE_KEYS.slotA,
          FITCORE_ATOMIC_PERSISTENCE_KEYS.slotB,
          FITCORE_REVISION_STORAGE_KEY,
        ],
      ),
    ).toEqual(beforeReload);
  });

  test("partial legacy active workout reaches the application and survives reload", async ({
    page,
  }) => {
    await seedFitCoreAppState(page, {
      version: FITCORE_DATA_VERSION,
      onboardingComplete: true,
      profile: {
        goal: "hypertrophy",
        experience: "intermediate",
        daysPerWeek: 0,
        split: "Push / Pull / Legs",
        bodyweightLb: 180,
        targetBodyweightLb: 185,
        units: "lb",
      },
      workouts: [],
      activeWorkout: {
        id: "legacy-active-workout",
        name: "Legacy workout",
        startedAt: 1_700_000_000_000,
        exercises: [],
      },
      mealEntries: [],
      bodyweightEntries: [],
      goals: [],
    });
    await page.goto("/");

    await expect(page.getByText(/Legacy workout started/)).toBeVisible();
    await page.getByRole("button", { name: "Resume workout", exact: true }).click();
    await expect(page.getByText("No exercises yet", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Legacy workout started/)).toBeVisible();
    await page.getByRole("button", { name: "Resume workout", exact: true }).click();
    await expect(page.getByText("No exercises yet", { exact: true })).toBeVisible();
  });
});
