import { test, expect, Page } from '@playwright/test';

const FATAL_TEXTS = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
  "TypeError: createServerFn",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

// Helper to check for fatal texts in the body text content
async function checkFatalTexts(page: Page) {
  const bodyText = await page.evaluate(() => document.body.textContent || '');
  for (const text of FATAL_TEXTS) {
    if (bodyText.includes(text)) {
      throw new Error(`Fatal error text found on page: "${text}"`);
    }
  }
}

// Helper to seed state manually and navigate
async function loadWithState(page: Page, state: string) {
  await page.goto('/');
  await page.evaluate((data) => {
    localStorage.clear();
    localStorage.setItem('fitcore.v1', data);
  }, state);
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Corrupt LocalStorage Boot-Safety Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each scenario
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  // Verify app shell loads without crashing
  async function assertStableMainScreen(page: Page) {
    await expect(page.locator('.phone-shell')).toBeVisible({ timeout: 15000 });
  }

  test('should boot safely with completely invalid JSON', async ({ page }) => {
    await loadWithState(page, '{ this is not valid JSON ]');
    await assertStableMainScreen(page);
    await checkFatalTexts(page);
  });

  test('should boot safely with partial/empty valid JSON', async ({ page }) => {
    await loadWithState(page, '{}');
    await assertStableMainScreen(page);
    await checkFatalTexts(page);
  });

  test('should boot safely with missing optional arrays/objects', async ({ page }) => {
    const partialState = {
      version: 4,
      onboardingComplete: true,
      profile: {
        goal: "strength",
        experience: "advanced",
        daysPerWeek: 6,
        split: "Bro Split",
        bodyweightLb: 190,
        targetBodyweightLb: 200,
        units: "lb"
      }
      // missing workouts, logs, meals, nutritionTargets, sleep, etc.
    };
    await loadWithState(page, JSON.stringify(partialState));
    await assertStableMainScreen(page);
    await checkFatalTexts(page);
  });

  test('should boot safely with extra unknown keys and malformed arrays', async ({ page }) => {
    const weirdState = {
      version: 4,
      onboardingComplete: true,
      future_feature_flag: true,
      workouts: [{
        id: 'w1',
        unknown_field: 'hello',
        // missing required workout fields
      }],
      sleepEntries: null, // Should be an array or object
      settings: "string instead of object"
    };
    await loadWithState(page, JSON.stringify(weirdState));
    await assertStableMainScreen(page);
    await checkFatalTexts(page);
  });

  test('should boot safely when stored state schema version is missing or old', async ({ page }) => {
    const oldState = {
      // missing version
      onboardingComplete: true,
      profile: { name: 'Old User' }
    };
    await loadWithState(page, JSON.stringify(oldState));
    await assertStableMainScreen(page);
    await checkFatalTexts(page);
  });

});
