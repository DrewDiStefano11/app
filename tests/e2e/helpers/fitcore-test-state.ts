import { Page, expect } from '@playwright/test';

/**
 * FITCORE_STORAGE_KEY: The main localStorage key where the app persists its state.
 * Verified from src/lib/fitcore-data.ts
 */
export const FITCORE_STORAGE_KEY = 'fitcore.v1';

/**
 * FITCORE_DATA_VERSION: The current expected version of the data schema.
 * Verified from src/lib/fitcore-data.ts
 */
export const FITCORE_DATA_VERSION = 4;

export const FITCORE_MOBILE_VIEWPORTS = {
  iphoneModern: { width: 390, height: 844 },
  iphoneClassic: { width: 375, height: 812 },
  smallAndroid: { width: 360, height: 800 },
};

/**
 * Seeds the FitCore app state in localStorage before navigation.
 * Uses page.addInitScript to ensure the state is present when the app hydrates.
 */
export async function seedFitCoreAppState(page: Page, state: Record<string, any>) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: FITCORE_STORAGE_KEY, value: state });
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
      goal: 'hypertrophy',
      experience: 'intermediate',
      daysPerWeek: 5,
      split: 'Push / Pull / Legs',
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: 'lb',
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
  await page.goto('/');
  await expectDashboardReady(page);
}

/**
 * Verifies that the dashboard is visible.
 */
export async function expectDashboardReady(page: Page) {
  // Wait for a stable dashboard element
  await expect(
    page.getByText('FitCore Today', { exact: true })
    .or(page.getByText('FitCore Score', { exact: true }))
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Sets the viewport to a specific mobile preset.
 */
export async function setMobileViewport(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
}
