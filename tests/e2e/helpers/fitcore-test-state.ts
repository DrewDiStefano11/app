import { Page, expect } from "@playwright/test";
import {
  FITCORE_SEED_APPLIED_KEY,
  FITCORE_SEED_REQUEST_KEY,
} from "../../../src/lib/hydration-contract";

/**
 * FITCORE_STORAGE_KEY: The main localStorage key where the app persists its state.
 * Verified from src/lib/fitcore-data.ts
 */
export const FITCORE_STORAGE_KEY = "fitcore.v1";

/**
 * FITCORE_DATA_VERSION: The current expected version of the data schema.
 * Verified from src/lib/fitcore-data.ts
 */
export const FITCORE_DATA_VERSION = 4;

const HYDRATED_APP = '[data-fitcore-hydrated="true"]';
let seedSequence = 0;

const ID_ARRAY_KEYS = [
  "workouts",
  "workoutTemplates",
  "customExercises",
  "cardioEntries",
  "mealEntries",
  "bodyweightEntries",
  "sleepEntries",
  "recoveryCheckIns",
  "recoverySignals",
  "prs",
  "goals",
  "progressPhotos",
  "aiMessages",
  "jarvisAudit",
  "supplementLogs",
] as const;

function fixtureSignature(state: Record<string, unknown>) {
  const signature: Record<string, unknown> = {};
  if ("version" in state) signature.version = state.version;
  if ("onboardingComplete" in state) signature.onboardingComplete = state.onboardingComplete;
  if ("demoMode" in state) signature.demoMode = state.demoMode;
  const profile = state.profile as { name?: unknown } | undefined;
  if (profile && "name" in profile) signature.profileName = profile.name;
  if ("nutritionTargets" in state) signature.nutritionTargets = state.nutritionTargets;
  const activeWorkout = state.activeWorkout as { id?: unknown } | null | undefined;
  if ("activeWorkout" in state) signature.activeWorkoutId = activeWorkout?.id ?? null;
  for (const key of ID_ARRAY_KEYS) {
    if (key in state) {
      const entries = state[key] as Array<{ id?: unknown }> | undefined;
      signature[key] = (entries ?? []).map((entry) => entry.id ?? null);
    }
  }
  if ("dismissedSuggestions" in state) signature.dismissedSuggestions = state.dismissedSuggestions;
  return signature;
}

export async function expectFitCoreHydrated(page: Page) {
  await expect(page.locator(HYDRATED_APP)).toBeVisible();
}

export async function expectFitCoreHydratedStore(
  page: Page,
  requestId: string,
  expected: Record<string, unknown>,
) {
  const app = page.locator(HYDRATED_APP);
  await expect(app).toHaveAttribute("data-fitcore-seed-request", requestId);
  await expect
    .poll(() => page.evaluate(() => window.__FITCORE_HYDRATION__))
    .toMatchObject({
      phase: "react-committed",
      requestId,
      persisted: true,
      identity: expected,
    });
  const signature = await page.evaluate(() => window.__FITCORE_HYDRATION__?.signature ?? null);
  expect(signature).not.toBeNull();
  await expect(app).toHaveAttribute("data-fitcore-store-signature", signature!);
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
      ({ requestKey, requestId }) => window.sessionStorage.setItem(requestKey, requestId),
      { requestKey: FITCORE_SEED_REQUEST_KEY, requestId },
    );
  }
  await page.addInitScript(
    ({ key, value, requestKey, appliedKey, requestId }) => {
      const requested = window.sessionStorage.getItem(requestKey);
      if (requested !== null && requested !== requestId) return;
      if (requested === null) window.sessionStorage.setItem(requestKey, requestId);
      if (window.sessionStorage.getItem(appliedKey) === requestId) return;
      window.localStorage.setItem(key, JSON.stringify(value));
      window.sessionStorage.setItem(appliedKey, requestId);
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

  const expected = fixtureSignature(state);
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
