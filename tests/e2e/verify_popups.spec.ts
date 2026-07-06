import { test, expect } from '@playwright/test';

test.describe('Popup Positioning Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fitcore.v1', JSON.stringify({
        onboardingComplete: true,
        demoMode: true,
        version: 3
      }));
    });
    await page.reload();
  });

  test('FitCore Score popup should have correct height and visibility', async ({ page }) => {
    await page.locator('.home-score-panel').click();

    const panel = page.locator('.sheet-surface');
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    const viewport = page.viewportSize();

    if (box && viewport) {
        // Should be at the bottom
        expect(box.y + box.height).toBeCloseTo(viewport.height, 1);
        // Should be roughly 92% of height or less
        expect(box.height).toBeLessThanOrEqual(viewport.height * 0.93);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/verified_score_popup.png' });
  });

  test('Log Meal popup should have correct height and visibility', async ({ page }) => {
    await page.getByRole('button', { name: 'Fuel' }).click();
    await page.getByRole('button', { name: 'Log Meal', exact: true }).first().click();

    const panel = page.locator('.sheet-surface');
    await expect(panel).toBeVisible();

    const box = await panel.boundingBox();
    const viewport = page.viewportSize();

    if (box && viewport) {
        expect(box.y + box.height).toBeCloseTo(viewport.height, 1);
        expect(box.height).toBeLessThanOrEqual(viewport.height * 0.93);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/verified_meal_popup.png' });
  });
});
