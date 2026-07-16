import { Page, expect } from "@playwright/test";
import {
  FITCORE_SEED_APPLIED_KEY,
  FITCORE_SEED_REQUEST_KEY,
  getHydratedStoreIdentity,
  migrateFitCoreAppState,
  type HydratedStoreIdentity,
} from "../../../src/lib/hydration-contract";
import { FITCORE_DATA_VERSION, FITCORE_STORAGE_KEY } from "../../../src/lib/fitcore-data";
import type { AppState } from "../../../src/lib/types";

/**
 * FITCORE_STORAGE_KEY: The main localStorage key where the app persists its state.
 * Verified from src/lib/fitcore-data.ts
 */
export { FITCORE_STORAGE_KEY };

/**
 * FITCORE_DATA_VERSION: The current expected version of the data schema.
 * Verified from src/lib/fitcore-data.ts
 */
export { FITCORE_DATA_VERSION };

const HYDRATED_APP = '[data-fitcore-hydrated="true"]';
let seedSequence = 0;

function canonicalFixtureIdentity(state: Record<string, unknown>): HydratedStoreIdentity {
  return getHydratedStoreIdentity(migrateFitCoreAppState(state as Partial<AppState>));
}

export async function expectFitCoreHydrated(page: Page) {
  await expect(page.locator(HYDRATED_APP)).toBeVisible();
}

export async function expectFitCoreHydratedStore(
  page: Page,
  requestId: string,
  expected: Partial<HydratedStoreIdentity>,
) {
  const app = page.locator(HYDRATED_APP);
  await expect.poll(() => page.evaluate(() => window.__FITCORE_HYDRATION__)).toBeDefined();
  const hydration = await page.evaluate(() => window.__FITCORE_HYDRATION__!);
  if (hydration.requestId !== requestId) {
    throw new Error(
      `Seed correlation failed: expected request ${requestId}, application reported ${hydration.requestId ?? "none"}`,
    );
  }
  expect(hydration).toMatchObject({
    phase: "react-committed",
    requestId,
    persisted: true,
    identity: expected,
  });
  await expect(app).toHaveAttribute("data-fitcore-seed-request", requestId);
  await expect(app).toHaveAttribute("data-fitcore-store-signature", hydration.signature);
}

export const FITCORE_MOBILE_VIEWPORTS = {
  iphoneModern: { width: 390, height: 844 },
  iphoneClassic: { width: 375, height: 812 },
  smallAndroid: { width: 360, height: 800 },
};

/**
 * Seeds exactly once before an application boot, then confirms both application
 * hydration and fixture-specific persisted state. Later reloads do not reseed.
 */
export async function seedFitCoreAppState(page: Page, state: Record<string, unknown>) {
  const requestId = `fitcore-seed-${++seedSequence}`;
  const appAlreadyBooted = page.url() !== "about:blank";
  if (appAlreadyBooted) {
    await expectFitCoreHydrated(page);
    await page.evaluate(
      ({ requestKey, requestId }) => {
        try {
          window.sessionStorage.setItem(requestKey, requestId);
          return true;
        } catch {
          return false;
        }
      },
      { requestKey: FITCORE_SEED_REQUEST_KEY, requestId },
    );
  }
  await page.addInitScript(
    ({ key, value, requestKey, appliedKey, requestId }) => {
      const safeGet = (storageKey: string) => {
        try {
          return window.sessionStorage.getItem(storageKey);
        } catch {
          return null;
        }
      };
      const safeSet = (storageKey: string, storageValue: string) => {
        try {
          window.sessionStorage.setItem(storageKey, storageValue);
          return true;
        } catch {
          return false;
        }
      };
      const requested = safeGet(requestKey);
      if (requested !== null && requested !== requestId) return;
      const requestStored = requested === requestId || safeSet(requestKey, requestId);
      if (safeGet(appliedKey) === requestId) return;
      window.localStorage.setItem(key, JSON.stringify(value));
      if (requestStored) safeSet(appliedKey, requestId);
    },
    {
      key: FITCORE_STORAGE_KEY,
      value: state,
      requestKey: FITCORE_SEED_REQUEST_KEY,
      appliedKey: FITCORE_SEED_APPLIED_KEY,
      requestId,
    },
  );

  if (appAlreadyBooted) await page.reload();
  else await page.goto("/");

  const expected = canonicalFixtureIdentity(state);
  await expectFitCoreHydratedStore(page, requestId, expected);
  return requestId;
}

/**
 * Seeds a minimal onboarded state to bypass the onboarding flow.
 */
export async function seedMinimalOnboardedState(page: Page) {
  const minimalState = {
    version: FITCORE_DATA_VERSION,
    onboardingComplete: true,
    // Provide minimal profile to avoid hydration errors if the app expects it
    profile: {
      goal: "hypertrophy",
      experience: "intermediate",
      daysPerWeek: 5,
      split: "Push / Pull / Legs",
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: "lb",
    },
    // Ensure essential arrays are present
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    bodyweightEntries: [],
    goals: [
      { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
    ],
  };

  await seedFitCoreAppState(page, minimalState);
}

/**
 * Navigates to the dashboard and waits for it to be ready.
 */
export async function gotoDashboard(page: Page) {
  await page.goto("/");
  await expectDashboardReady(page);
}

/**
 * Verifies that the dashboard is visible.
 */
export async function expectDashboardReady(page: Page) {
  await expectFitCoreHydrated(page);
  // Wait for a stable dashboard element
  await expect(
    page
      .getByText("FitCore Today", { exact: true })
      .or(page.getByText("FitCore Score", { exact: true })),
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Sets the viewport to a specific mobile preset.
 */
export async function setMobileViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
}
