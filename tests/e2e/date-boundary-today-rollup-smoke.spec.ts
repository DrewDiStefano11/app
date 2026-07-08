import { test, expect, Page } from '@playwright/test';
import { expectDashboardReady, FITCORE_DATA_VERSION, FITCORE_STORAGE_KEY } from './helpers/fitcore-test-state';

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

async function seedReloadableOnboardedMixedDateState(page: Page) {
  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;
  const older = now - 2 * 24 * 60 * 60 * 1000;

  await page.goto("/");
  await page.evaluate(
    ({ key, version, now, yesterday, older }) => {
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
          workouts: [
            {
              id: "workout-today",
              name: "Today Workout",
              startedAt: now,
              endedAt: now + 3600000,
              exercises: []
            },
            {
              id: "workout-yesterday",
              name: "Yesterday Workout",
              startedAt: yesterday,
              endedAt: yesterday + 3600000,
              exercises: []
            },
            {
              id: "workout-older",
              name: "Older Workout",
              startedAt: older,
              endedAt: older + 3600000,
              exercises: []
            }
          ],
          activeWorkout: null,
          mealEntries: [
            {
              id: "meal-today",
              name: "Today Meal",
              type: "lunch",
              calories: 500, protein: 40, carbs: 40, fat: 20,
              createdAt: now,
            },
            {
              id: "meal-yesterday",
              name: "Yesterday Meal",
              type: "lunch",
              calories: 500, protein: 40, carbs: 40, fat: 20,
              createdAt: yesterday,
            },
            {
              id: "meal-older",
              name: "Older Meal",
              type: "lunch",
              calories: 500, protein: 40, carbs: 40, fat: 20,
              createdAt: older,
            }
          ],
          bodyweightEntries: [
            { id: "weight-today", weightLb: 180, createdAt: now },
            { id: "weight-yesterday", weightLb: 181, createdAt: yesterday },
            { id: "weight-older", weightLb: 182, createdAt: older }
          ],
          goals: [
            { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
          ],
        }),
      );
    },
    { key: FITCORE_STORAGE_KEY, version: FITCORE_DATA_VERSION, now, yesterday, older }
  );
  await page.reload();
  await expectDashboardReady(page);
}

test.describe('Date Boundary and Today Rollup Smoke Test', () => {
  test('mixed-date persisted state does not crash the app', async ({ page }) => {
    await seedReloadableOnboardedMixedDateState(page);

    // Scenario A — Home renders safely with mixed-date data
    await expectDashboardReady(page);
    await checkFatalTexts(page);

    // Scenario B — Training today rollup is safe
    await page.getByRole('button', { name: 'Train', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible();
    await checkFatalTexts(page);

    // Scenario C — Fuel/Nutrition today rollup is safe
    await page.getByRole('button', { name: 'Fuel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible();
    await checkFatalTexts(page);

    // Scenario D — Stats/Progress renders safely with historical and current data
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
    await checkFatalTexts(page);

    // Scenario E — Reload stability
    // Go to Home
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expectDashboardReady(page);
    await page.reload();
    await expectDashboardReady(page);
    await checkFatalTexts(page);

    await page.getByRole('button', { name: 'Train', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Training', exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible();
    await checkFatalTexts(page);

    await page.getByRole('button', { name: 'Fuel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nutrition', exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible();
    await checkFatalTexts(page);

    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Progress', exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible();
    await checkFatalTexts(page);

    // LocalStorage survival assertion
    await expect.poll(async () => {
      const storageState = await page.evaluate((key) => {
        return JSON.parse(localStorage.getItem(key) || '{}');
      }, FITCORE_STORAGE_KEY);

      const workouts = storageState.workouts || [];
      const mealEntries = storageState.mealEntries || [];
      const bodyweightEntries = storageState.bodyweightEntries || [];

      if (workouts.length < 2) return false;
      if (mealEntries.length < 2) return false;
      if (bodyweightEntries.length < 2) return false;

      const hasWorkoutToday = workouts.some((w: any) => w.id === 'workout-today');
      const hasWorkoutYesterday = workouts.some((w: any) => w.id === 'workout-yesterday' || w.id === 'workout-older');

      const hasMealToday = mealEntries.some((m: any) => m.id === 'meal-today');
      const hasMealYesterday = mealEntries.some((m: any) => m.id === 'meal-yesterday' || m.id === 'meal-older');

      const hasWeightToday = bodyweightEntries.some((b: any) => b.id === 'weight-today');
      const hasWeightYesterday = bodyweightEntries.some((b: any) => b.id === 'weight-yesterday' || b.id === 'weight-older');

      return hasWorkoutToday && hasWorkoutYesterday && hasMealToday && hasMealYesterday && hasWeightToday && hasWeightYesterday;
    }).toBeTruthy();
  });
});
