import { test, expect, Page } from '@playwright/test';
import { seedFitCoreAppState, FITCORE_DATA_VERSION } from './helpers/fitcore-test-state';

test.describe('LocalStorage Compatibility Smoke Coverage', () => {

  const fatalErrors = [
    "This page didn't load",
    "Application error",
    "Unhandled Runtime Error",
    "createServerFn(...).validator is not a function"
  ];

  async function assertNoFatalErrors(page: Page) {
    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText, { exact: false }).first()).toBeHidden();
    }
  }

  async function verifyCoreNavigation(page: Page) {
    // Check Home
    await expect(page.getByText('FitCore Score', { exact: true }).or(page.getByText('FitCore Today', { exact: true }))).toBeVisible({ timeout: 10000 });
    await assertNoFatalErrors(page);

    // Training
    await page.getByRole('button', { name: 'Train', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();
    await assertNoFatalErrors(page);

    // Nutrition
    await page.getByRole('button', { name: 'Fuel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible();
    await assertNoFatalErrors(page);

    // Recovery - ensure exact match
    await page.getByRole('button', { name: 'Recover', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Recovery' })).toBeVisible();
    await assertNoFatalErrors(page);

    // Progress
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await assertNoFatalErrors(page);

    // Go back to Home
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByText('FitCore Score', { exact: true }).or(page.getByText('FitCore Today', { exact: true }))).toBeVisible();

    // Settings (Hub)
    // We try to access it via the Hub navigation if the exact 'Settings' name isn't reliably available in all viewports/states
    await page.locator('.lucide-circle-user').or(page.getByRole('button', { name: 'Settings', exact: true })).first().click();
    await expect(page.getByRole('heading', { name: 'Hub', exact: true })).toBeVisible();
    await assertNoFatalErrors(page);
  }

  test('Scenario A — Minimal current state', async ({ page }) => {
    const minimalState = {
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
      goals: [
        { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
      ],
    };

    await seedFitCoreAppState(page, minimalState);
    await page.goto('/');
    await verifyCoreNavigation(page);
  });

  test('Scenario B — Partial older-looking state', async ({ page }) => {
    // Intentionally omit some arrays and fields that might have been added later
    const olderState = {
      version: 3, // older version
      onboardingComplete: true,
      profile: {
        goal: 'hypertrophy',
        experience: 'beginner',
        bodyweightLb: 150,
      },
      // missing activeWorkout, mealEntries, goals
      workouts: [{ id: 'w1', name: 'Old Workout', startedAt: Date.now() - 86400000, exercises: [] }],
      bodyweightEntries: [{ id: 'bw1', weightLb: 150, createdAt: Date.now() - 86400000 }],
    };

    await seedFitCoreAppState(page, olderState);
    await page.goto('/');
    await verifyCoreNavigation(page);
  });

  test('Scenario C — Empty collections', async ({ page }) => {
    const emptyCollectionsState = {
      version: FITCORE_DATA_VERSION,
      onboardingComplete: true,
      profile: {
        goal: 'hypertrophy',
        experience: 'advanced',
        daysPerWeek: 4,
        split: 'Upper/Lower',
        bodyweightLb: 170,
        targetBodyweightLb: 180,
        units: 'lb',
      },
      workouts: [],
      activeWorkout: null,
      mealEntries: [],
      bodyweightEntries: [],
      recoveryCheckIns: [],
      sleepEntries: [],
      cardioEntries: [],
      supplementLogs: [],
      recoverySignals: [],
      jarvisAudit: [],
      goals: [],
      progressPhotos: [],
    };

    await seedFitCoreAppState(page, emptyCollectionsState);
    await page.goto('/');
    await verifyCoreNavigation(page);
  });
});
