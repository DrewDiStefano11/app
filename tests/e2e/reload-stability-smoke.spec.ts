import { test, expect } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard } from './helpers/fitcore-test-state';

test.describe('Reload Stability Smoke Test', () => {
  test('should survive reload across all top-level sections', async ({ page }) => {
    // 1. Seed minimal onboarded state and navigate to Home (Dashboard)
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Verify Home renders
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();

    // Reload Home
    await page.reload();
    await expect(page.getByText('FitCore Score', { exact: true })).toBeVisible();

    // 2. Test Training section
    await page.getByRole('button', { name: 'Train' }).click();
    await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();
    await page.reload();
    // After reload, verify Training heading OR safe default (Home)
    await expect(
      page.getByRole('heading', { name: 'Training' })
        .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();

    // Reset to Home state for next section just in case
    await page.getByRole('button', { name: 'Home' }).click();

    // 3. Test Nutrition section
    await page.getByRole('button', { name: 'Fuel' }).click();
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Nutrition' })
        .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();

    await page.getByRole('button', { name: 'Home' }).click();

    // 4. Test Recovery section
    await page.getByRole('button', { name: 'Recover', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Recovery' })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Recovery' })
        .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();

    await page.getByRole('button', { name: 'Home' }).click();

    // 5. Test Progress section
    await page.getByRole('button', { name: 'Stats' }).click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Progress' })
        .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();

    await page.getByRole('button', { name: 'Home' }).click();

    // 6. Test Settings (Hub) section
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Settings' })
        .or(page.getByText('FitCore Score', { exact: true }))
    ).toBeVisible();
  });
});
