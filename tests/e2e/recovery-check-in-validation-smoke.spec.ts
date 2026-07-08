import { test, expect } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard, FITCORE_STORAGE_KEY } from './helpers/fitcore-test-state';

test.describe('Recovery check-in validation smoke', () => {

  const checkFatalErrors = async (page) => {
    await expect(page.getByText('This page didn\'t load')).not.toBeVisible();
    await expect(page.getByText('Application error')).not.toBeVisible();
    await expect(page.getByText('Unhandled Runtime Error')).not.toBeVisible();
    await expect(page.getByText('createServerFn(...).validator is not a function')).not.toBeVisible();
    await expect(page.getByText('Cannot read properties of undefined')).not.toBeVisible();
    await expect(page.getByText('Cannot read properties of null')).not.toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  test('Scenario A & D — Valid check-in saves safely and Recovery renders safely', async ({ page }) => {
    await page.getByRole('button', { name: 'Check In', exact: true }).click();
    const sheet = page.getByRole('heading', { name: 'Daily Check-In', exact: true }).locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole('textbox').fill('Validation recovery check-in');

    // Attempt to save
    await sheet.getByRole('button', { name: 'Save check-in', exact: true }).click();

    // Confirm sheet closes
    await expect(sheet).not.toBeVisible();
    await checkFatalErrors(page);

    // Verify localStorage state
    const savedCheckIn = await expect.poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || "{}");
        return state.recoveryCheckIns?.length ?? 0;
      }, FITCORE_STORAGE_KEY)
    ).toBeGreaterThan(0);

    // Navigate to Recovery section using bottom navigation
    // Let's try matching part of the label and click the navigation button.
    const recoveryBtn = page.getByRole('button', { name: /recover/i }).filter({ hasText: /Recovery|Recover/i });
    try {
      await recoveryBtn.first().click({ timeout: 5000 });
    } catch (e) {
      // Find the button directly from DOM
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(b => b.textContent && (b.textContent.trim().toLowerCase() === 'recovery' || b.textContent.trim().toLowerCase() === 'recover'));
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (!clicked) {
        // Last fallback, maybe click the Recover score if we can't find nav
        const scoreBtn = page.getByRole('button').filter({ hasText: /Recovery/ }).first();
        await scoreBtn.click();
      }
    }

    await checkFatalErrors(page);

    // Reload
    await page.reload();
    await checkFatalErrors(page);
  });

  test('Scenario B — Empty/minimal check-in does not crash', async ({ page }) => {
    await page.getByRole('button', { name: 'Check In', exact: true }).click();
    const sheet = page.getByRole('heading', { name: 'Daily Check-In', exact: true }).locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole('button', { name: 'Save check-in', exact: true }).click();
    await checkFatalErrors(page);
  });

  test('Scenario C — Cancel does not save', async ({ page }) => {
    await page.getByRole('button', { name: 'Check In', exact: true }).click();
    const sheet = page.getByRole('heading', { name: 'Daily Check-In', exact: true }).locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sheet).toBeVisible();

    await sheet.getByRole('textbox').fill('Validation recovery check-in');

    await sheet.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(sheet).not.toBeVisible();
    await checkFatalErrors(page);

    // Verify no new check-in
    await expect.poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) || "{}");
        return state.recoveryCheckIns?.length ?? 0;
      }, FITCORE_STORAGE_KEY)
    ).toBe(0);
  });
});
