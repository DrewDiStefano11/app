import { test, expect } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard } from './helpers/fitcore-test-state';

test.describe('Settings/Hub Render Smoke', () => {
  test('renders safely without fatal errors and allows return', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    const checkFatalErrors = async () => {
      if (pageErrors.length > 0) {
        throw new Error(`Fatal page errors occurred: ${pageErrors.map(e => e.message).join(', ')}`);
      }
      const bodyText = await page.locator('body').innerText();
      const fatalStrings = [
        "This page didn't load",
        "Application error",
        "Unhandled Runtime Error",
        "createServerFn(...).validator is not a function",
        "Cannot read properties of undefined",
        "Cannot read properties of null"
      ];
      for (const errorStr of fatalStrings) {
        expect(bodyText).not.toContain(errorStr);
      }
    };

    // 1. App loads without fatal errors.
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
    await checkFatalErrors();

    // 2. Settings/Hub entry point is reachable using existing UI.
    const homeIndicator = page.getByText('FitCore Score', { exact: true }).or(page.getByText('FitCore Today', { exact: true }));
    await expect(homeIndicator).toBeVisible();
    await page.getByLabel('Settings').click();

    // 3. Settings/Hub screen renders.
    const hubHeading = page.getByRole('heading', { name: 'Hub', exact: true });
    await expect(hubHeading).toBeVisible();

    // 4. Major existing areas/options are visible if stable.
    await expect(page.locator('.text-base.font-semibold').filter({ hasText: 'Jarvis / AI' })).toBeVisible();
    await expect(page.locator('.text-base.font-semibold').filter({ hasText: 'Profile & Goals' })).toBeVisible();
    await expect(page.locator('.text-base.font-semibold').filter({ hasText: 'Data Management' })).toBeVisible();

    await checkFatalErrors();

    // 6. Reload does not create a fatal error.
    await page.reload();
    await expect(hubHeading.or(homeIndicator)).toBeVisible();
    await checkFatalErrors();

    if (await homeIndicator.isVisible()) {
      await page.getByLabel('Settings').click();
      await expect(hubHeading).toBeVisible();
    }

    // 5. User can return to another main app area afterward.
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(homeIndicator).toBeVisible();

    await page.getByRole('button', { name: 'Train', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Training' })).toBeVisible();

    await checkFatalErrors();
  });
});
