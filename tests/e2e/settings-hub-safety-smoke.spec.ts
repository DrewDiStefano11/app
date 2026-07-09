import { test, expect } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard } from './helpers/fitcore-test-state';

test.describe('Settings / Hub Safety Smoke Test', () => {
  test('Settings and Hub can be opened, navigated, and closed safely', async ({ page }) => {
    // Navigate to Dashboard
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Open Settings/Hub from Home
    await page.getByLabel('Settings').click();

    // Confirm Hub/Settings heading appears
    await expect(page.getByRole('heading', { name: 'Hub', exact: true })).toBeVisible();

    // Confirm major visible settings sections render
    await expect(page.locator('h3').filter({ hasText: 'AI Coach & Goals' })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: /^Profile$/ })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Data Management' })).toBeVisible();

    // Find "Reset all data" button and click it
    await page.getByRole('button', { name: 'Reset all data' }).click();

    // Assert the confirmation dialog appears
    await expect(page.getByRole('heading', { name: 'Reset all data?' })).toBeVisible();
    await expect(page.getByText('This permanently erases workouts, meals, recovery, photos and PRs.')).toBeVisible();

    // Click "Cancel" in the dialog
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Ensure dialog is closed
    await expect(page.getByRole('heading', { name: 'Reset all data?' })).toBeHidden();

    // Close Hub/Settings
    await page.getByRole('button', { name: 'Done' }).click();

    // Confirm Home is visible again
    await expect(
      page.getByText('FitCore Today', { exact: true })
      .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();

    // Confirm no fatal error text appears
    const fatalStrings = [
      "This page didn't load",
      "Application error",
      "Unhandled Runtime Error",
      "createServerFn(...).validator is not a function",
    ];

    for (const errorString of fatalStrings) {
      await expect(page.getByText(errorString)).toBeHidden();
    }
  });
});
