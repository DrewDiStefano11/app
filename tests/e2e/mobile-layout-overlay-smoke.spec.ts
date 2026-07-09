import { test, expect } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard } from './helpers/fitcore-test-state';

test.describe('Mobile Layout and Overlay Smoke Test', () => {
  // Use a mobile-sized viewport (e.g., iPhone 12 Pro size)
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test.beforeEach(async ({ page }) => {
    // Seed onboarded state
    await seedMinimalOnboardedState(page);
    // Navigate to dashboard
    await gotoDashboard(page);
  });

  const checkFatalErrors = async (page) => {
    const errorTexts = [
      "This page didn't load",
      "Application error",
      "Unhandled Runtime Error",
      "createServerFn(...).validator is not a function"
    ];
    for (const text of errorTexts) {
      await expect(page.getByText(text)).not.toBeVisible();
    }
  };

  test('should verify mobile navigation works without errors', async ({ page }) => {
    // Confirm Home renders and bottom nav is visible (or mobile nav)
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();
    await checkFatalErrors(page);

    // Navigate to Training
    await page.getByRole('button', { name: 'Train', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();
    await checkFatalErrors(page);

    // Navigate to Nutrition
    await page.getByRole('button', { name: 'Fuel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible();
    await checkFatalErrors(page);

    // Navigate to Recovery
    await page.getByRole('button', { name: 'Recover', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Recovery' })).toBeVisible();
    await checkFatalErrors(page);

    // Navigate to Progress
    await page.getByRole('button', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await checkFatalErrors(page);

    // Open Settings/Hub
    // Return to Home first or straight to Settings
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await checkFatalErrors(page);

    // Close Settings
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
  });

  test('should open and close home quick action overlays without trapping user', async ({ page }) => {
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();

    // Log Meal
    await page.getByRole('button', { name: 'Log Meal', exact: true }).click();
    const logMealSheet = page.getByRole('heading', { name: 'Log Meal' }).locator('xpath=..');
    await expect(logMealSheet).toBeVisible();
    await checkFatalErrors(page);
    await logMealSheet.getByRole('button').filter({ has: page.locator('svg') }).first().click();
    await expect(logMealSheet).not.toBeVisible();

    // Check that home is visible and not trapped
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check In', exact: true })).toBeVisible();

    // Check In
    await page.getByRole('button', { name: 'Check In', exact: true }).click();
    const checkInSheet = page.getByRole('heading', { name: 'Daily Check-In' }).locator('xpath=..');
    await expect(checkInSheet).toBeVisible();
    await checkFatalErrors(page);
    await checkInSheet.getByRole('button').filter({ has: page.locator('svg') }).first().click();
    await expect(checkInSheet).not.toBeVisible();

    // Check that home is visible and not trapped
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Weigh In', exact: true })).toBeVisible();

    // Weigh In
    await page.getByRole('button', { name: 'Weigh In', exact: true }).click();
    const weighInSheet = page.getByRole('heading', { name: 'Weigh In', exact: true }).locator('xpath=..');
    await expect(weighInSheet).toBeVisible();
    await checkFatalErrors(page);
    await weighInSheet.getByRole('button').filter({ has: page.locator('svg') }).first().click();
    await expect(weighInSheet).not.toBeVisible();

    // Final check that home is visible and bottom nav is usable
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();
    await expect(page.getByText('Weekly Workouts')).toBeVisible();
  });
});
