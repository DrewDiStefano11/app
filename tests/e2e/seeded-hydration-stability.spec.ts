import { expect, test } from "@playwright/test";
import { defaultState } from "../../src/lib/types";
import {
  expectFitCoreHydrated,
  expectFitCoreHydratedStore,
  FITCORE_STORAGE_KEY,
  seedFitCoreAppState,
} from "./helpers/fitcore-test-state";

function seededState(label: string) {
  const createdAt = Date.now();
  return {
    ...defaultState,
    onboardingComplete: true,
    demoMode: false,
    profile: { ...defaultState.profile, name: label },
    nutritionTargets: { calories: 2345, protein: 171, carbs: 266, fat: 77 },
    workouts: [
      {
        id: `${label}-workout`,
        name: `${label} training`,
        startedAt: createdAt - 3_600_000,
        endedAt: createdAt - 1_800_000,
        exercises: [],
      },
    ],
    mealEntries: [
      {
        id: `${label}-meal`,
        name: `${label} meal`,
        type: "lunch",
        calories: 650,
        protein: 45,
        carbs: 75,
        fat: 18,
        createdAt,
      },
    ],
    sleepEntries: [
      {
        id: `${label}-sleep`,
        hours: 7.75,
        quality: 4,
        createdAt,
      },
    ],
    recoveryCheckIns: [
      {
        id: `${label}-recovery`,
        createdAt,
        soreness: 2,
        stress: 2,
        energy: 4,
        motivation: 4,
        notes: `${label} recovery fixture`,
      },
    ],
  };
}

test.describe("Seeded hydration contract", () => {
  test("confirms fixture-specific state only after application hydration", async ({ page }) => {
    const state = seededState("contract-a");
    const requestId = await seedFitCoreAppState(page, state);

    await expectFitCoreHydrated(page);
    await expectFitCoreHydratedStore(page, requestId, {
      profileName: "contract-a",
      workouts: ["contract-a-workout"],
      mealEntries: ["contract-a-meal"],
      sleepEntries: ["contract-a-sleep"],
      recoveryCheckIns: ["contract-a-recovery"],
    });
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const stored = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            profile: stored.profile?.name,
            workout: stored.workouts?.[0]?.id,
            meal: stored.mealEntries?.[0]?.id,
            sleep: stored.sleepEntries?.[0]?.id,
            recovery: stored.recoveryCheckIns?.[0]?.id,
          };
        }, FITCORE_STORAGE_KEY),
      )
      .toEqual({
        profile: "contract-a",
        workout: "contract-a-workout",
        meal: "contract-a-meal",
        sleep: "contract-a-sleep",
        recovery: "contract-a-recovery",
      });
  });

  test("does not reseed a fixture on later reloads", async ({ page }) => {
    const requestId = await seedFitCoreAppState(page, seededState("one-shot"));
    const initialSignature = await page
      .locator('[data-fitcore-hydrated="true"]')
      .getAttribute("data-fitcore-store-signature");
    await page.evaluate((key) => {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      stored.mealEntries = [];
      localStorage.setItem(key, JSON.stringify(stored));
    }, FITCORE_STORAGE_KEY);

    await page.reload();
    await expectFitCoreHydrated(page);
    await expectFitCoreHydratedStore(page, requestId, { mealEntries: [] });
    await expect(page.locator('[data-fitcore-hydrated="true"]')).not.toHaveAttribute(
      "data-fitcore-store-signature",
      initialSignature!,
    );
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const stored = JSON.parse(localStorage.getItem(key) || "{}");
          return stored.mealEntries?.length ?? -1;
        }, FITCORE_STORAGE_KEY),
      )
      .toBe(0);
  });

  test("supports a new explicit fixture without reactivating an older seed", async ({ page }) => {
    await seedFitCoreAppState(page, seededState("first"));
    const requestId = await seedFitCoreAppState(page, seededState("second"));
    await page.reload();
    await expectFitCoreHydrated(page);
    await expectFitCoreHydratedStore(page, requestId, {
      profileName: "second",
      mealEntries: ["second-meal"],
    });

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const stored = JSON.parse(localStorage.getItem(key) || "{}");
          return [stored.profile?.name, stored.mealEntries?.[0]?.id];
        }, FITCORE_STORAGE_KEY),
      )
      .toEqual(["second", "second-meal"]);
  });

  test("distinguishes storage installation from the committed React store", async ({ page }) => {
    await seedFitCoreAppState(page, seededState("committed"));
    await page.evaluate((key) => {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      stored.profile.name = "storage-only";
      localStorage.setItem(key, JSON.stringify(stored));
    }, FITCORE_STORAGE_KEY);

    await expect
      .poll(() => page.evaluate(() => window.__FITCORE_HYDRATION__?.identity.profileName))
      .toBe("committed");
    await expect(page.getByText("Good Morning, committed", { exact: true })).toBeVisible();
  });

  test("does not accept stale or incorrect seed request correlation", async ({ page }) => {
    const requestId = await seedFitCoreAppState(page, seededState("correlated"));
    const app = page.locator('[data-fitcore-hydrated="true"]');
    await expect(app).toHaveAttribute("data-fitcore-seed-request", requestId);
    await expect(app).not.toHaveAttribute("data-fitcore-seed-request", "stale-request");
    expect(await page.evaluate(() => window.__FITCORE_HYDRATION__?.requestId)).toBe(requestId);
  });

  test("rejects a fixture whose migrated store identity falls back", async ({ page }) => {
    await expect(
      seedFitCoreAppState(page, { ...seededState("invalid-version"), version: 0 }),
    ).rejects.toThrow();
    await expectFitCoreHydrated(page);
    expect(await page.evaluate(() => window.__FITCORE_HYDRATION__?.identity.version)).toBe(4);
  });
});
