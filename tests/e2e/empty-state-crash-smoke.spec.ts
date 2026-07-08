import { test, expect, Page } from '@playwright/test';
import { seedFitCoreAppState, FITCORE_DATA_VERSION } from './helpers/fitcore-test-state';

// Fatal error texts to assert against
const FATAL_TEXTS = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
];

const emptyState = {
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
  workoutTemplates: [],
  customExercises: [],
  cardioEntries: [],
  mealEntries: [],
  bodyweightEntries: [],
  sleepEntries: [],
  recoveryCheckIns: [],
  recoverySignals: [],
  muscleFatigue: {},
  prs: [],
  goals: [],
  progressPhotos: [],
  aiMessages: [],
  reminders: { workout: true, weighIn: true, lunch: false },
  demoMode: false,
  jarvisSettings: { allowLogging: true, enableVoice: false, confirmActions: true, autoCorrection: true },
  jarvisAudit: [],
  jarvisLearning: { memory: [], entities: [], feedback: [] },
  userGoalsProfile: { weekly: [], longTerm: [] },
  supplementLogs: [],
  dismissedSuggestions: [],
};

test.describe('Empty State Crash Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await seedFitCoreAppState(page, emptyState);
    await page.goto('/');
  });

  async function assertNoFatalErrors(page: Page) {
    for (const text of FATAL_TEXTS) {
      await expect(page.getByText(text, { exact: false })).toHaveCount(0);
    }
    // Also make sure the shell exists
    await expect(page.locator('.phone-shell')).toBeVisible();
  }

  test('A. Minimal empty state: Home renders without fatal error', async ({ page }) => {
    await assertNoFatalErrors(page);
    // Home screen
    await expect(page.getByText('FitCore Today', { exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible({ timeout: 10000 });
  });

  test('B & C. Navigate through main sections and verify no crash with empty data', async ({ page }) => {
    await assertNoFatalErrors(page);

    // Navigate to Training
    await page.getByRole('button', { name: 'Train' }).click();
    await assertNoFatalErrors(page);
    await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();

    // Navigate to Nutrition
    await page.getByRole('button', { name: 'Fuel' }).click();
    await assertNoFatalErrors(page);
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible();

    // Navigate to Recovery
    await page.getByRole('button', { name: 'Recover' }).click();
    await assertNoFatalErrors(page);
    await expect(page.getByRole('heading', { name: 'Recovery' })).toBeVisible();

    // Navigate to Progress
    await page.getByRole('button', { name: 'Stats' }).click();
    await assertNoFatalErrors(page);
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();

    // Navigate to Settings/Hub
    // First navigate back to Home
    await page.getByRole('button', { name: 'Home' }).click();
    // Then click settings
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await assertNoFatalErrors(page);
    await expect(page.getByRole('heading', { name: 'Hub' })).toBeVisible();
  });

  test('D. Reload on empty state view still renders safely', async ({ page }) => {
    // Navigate to Training, which is heavily data-dependent
    await page.getByRole('button', { name: 'Train' }).click();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await assertNoFatalErrors(page);
    // Since section is stored in React state, reloading resets to Home
    await expect(page.getByText('FitCore Today', { exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible({ timeout: 10000 });
  });
});
