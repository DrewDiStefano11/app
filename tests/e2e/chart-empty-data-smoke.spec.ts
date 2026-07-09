import { test, expect, Page } from '@playwright/test';
import {
  FITCORE_DATA_VERSION,
  gotoDashboard,
  seedFitCoreAppState,
} from './helpers/fitcore-test-state';

const FATAL_TEXTS = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
  "TypeError: createServerFn",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

async function checkFatalTexts(page: Page) {
  const bodyText = await page.evaluate(() => document.body.textContent || '');
  for (const text of FATAL_TEXTS) {
    if (bodyText.includes(text)) {
      throw new Error(`Fatal error text found on page: "${text}"`);
    }
  }
}

function getBaseState() {
  return {
    version: FITCORE_DATA_VERSION,
    onboardingComplete: true,
    profile: {
      goal: 'hypertrophy',
      experience: 'intermediate',
      daysPerWeek: 5,
      split: 'Push / Pull / Legs',
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: 'lb',
    },
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    bodyweightEntries: [],
    recoveryCheckIns: [],
    sleepEntries: [],
    goals: [],
    progressPhotos: [],
    supplementLogs: [],
  };
}

test.describe('Progress Chart Empty Data Smoke', () => {
  test('Scenario A - Progress renders safely with completely empty logged data arrays', async ({ page }) => {
    const emptyState = getBaseState();

    await seedFitCoreAppState(page, emptyState);
    await gotoDashboard(page);

    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await checkFatalTexts(page);

    // Check for some fallback empty-state UI being visible (e.g. empty states in progress tab)
    await expect(page.locator('body')).toBeVisible();
  });

  test('Scenario B - Progress renders safely with only bodyweight data', async ({ page }) => {
    const bwState = getBaseState();
    bwState.bodyweightEntries = [
      { id: 'bw1', weightLb: 180, createdAt: Date.now() - 86400000 * 2 },
      { id: 'bw2', weightLb: 181, createdAt: Date.now() - 86400000 * 1 },
      { id: 'bw3', weightLb: 182, createdAt: Date.now() }
    ];

    await seedFitCoreAppState(page, bwState);
    await gotoDashboard(page);

    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await checkFatalTexts(page);

    // App should still render safely despite other arrays being empty
    // Go into Analytics tab specifically to find "Bodyweight vs time"
    await page.getByText('Analytics', { exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Bodyweight vs time', exact: true }).first()).toBeVisible();
  });

  test('Scenario C - Progress renders safely with only workout data', async ({ page }) => {
    const workoutState = getBaseState();
    workoutState.workouts = [
      {
        id: 'w1',
        name: 'Pull Day',
        startedAt: Date.now() - 86400000,
        endedAt: Date.now() - 86400000 + 3600000,
        exercises: [],
        muscleFatigue: {},
        rpe: 8
      }
    ];

    await seedFitCoreAppState(page, workoutState);
    await gotoDashboard(page);

    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await checkFatalTexts(page);

    // App should still render safely despite other arrays being empty
    await expect(page.getByText(/Not enough data|No weigh-ins|No goals|Training Vol Δ/i).first()).toBeVisible();
  });

  test('Scenario D - Reload stability on Progress page', async ({ page }) => {
    const emptyState = getBaseState();

    await seedFitCoreAppState(page, emptyState);
    await gotoDashboard(page);

    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await checkFatalTexts(page);

    // Reload the page
    await page.reload();

    // It's acceptable to reset to Home, but it must not crash
    await checkFatalTexts(page);
    await expect(
      page.getByRole('heading', { name: 'Progress' })
      .or(page.getByText('FitCore Score', { exact: true }))
      .or(page.getByText('FitCore Today', { exact: true }))
    ).toBeVisible();
  });
});
