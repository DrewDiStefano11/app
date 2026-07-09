import { test, expect, Page } from '@playwright/test';
import { FITCORE_STORAGE_KEY, FITCORE_DATA_VERSION } from './helpers/fitcore-test-state';

test.describe('Corrupt localStorage boot-safety smoke', () => {
  // Use sequential testing to avoid race conditions if needed, though they are isolated by default.
  // We'll manually seed and reload for each.

  const setupCorruptState = async (page: Page, data: string) => {
    await page.goto('/');
    await page.evaluate(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, { key: FITCORE_STORAGE_KEY, value: data });
    await page.reload();
  };

  test('handles invalid JSON gracefully', async ({ page }) => {
    await setupCorruptState(page, '{"broken": ');
    // App shell should load and not fatally crash
    await expect(page.locator('.phone-shell')).toBeVisible();
  });

  test('handles empty object gracefully', async ({ page }) => {
    await setupCorruptState(page, '{}');
    await expect(page.locator('.phone-shell')).toBeVisible();
  });

  test('handles partially valid state (missing required arrays)', async ({ page }) => {
    const data = JSON.stringify({
      version: FITCORE_DATA_VERSION,
      onboardingComplete: true
    });
    await setupCorruptState(page, data);
    await expect(page.locator('.phone-shell')).toBeVisible();
  });

  test('handles missing or old schema version', async ({ page }) => {
    const data = JSON.stringify({
      version: 1,
      onboardingComplete: true,
      workouts: []
    });
    await setupCorruptState(page, data);
    await expect(page.locator('.phone-shell')).toBeVisible();
  });

  test('handles malformed arrays/objects', async ({ page }) => {
    const data = JSON.stringify({
      version: FITCORE_DATA_VERSION,
      onboardingComplete: true,
      workouts: {}, // supposed to be array
      profile: []   // supposed to be object
    });
    await setupCorruptState(page, data);
    await expect(page.locator('.phone-shell')).toBeVisible();
  });
});
