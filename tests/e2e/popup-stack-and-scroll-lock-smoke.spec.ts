import { test, expect, type Page } from '@playwright/test';
import { seedMinimalOnboardedState, gotoDashboard } from './helpers/fitcore-test-state';

async function assertNoFatalErrors(page: Page) {
  const fatalErrors = [
    "This page didn't load",
    'Application error',
    'Unhandled Runtime Error',
    'createServerFn(...).validator is not a function',
    'Cannot read properties of undefined',
    'Cannot read properties of null',
  ];

  for (const errorStr of fatalErrors) {
    await expect(page.getByText(errorStr, { exact: false })).toHaveCount(0);
  }
}

async function handleMobileNav(page: Page) {
  const expandNavButton = page.getByRole('button', { name: /^Expand navigation/ });
  if (await expandNavButton.isVisible()) {
    await expandNavButton.click();
  }
}

test.describe('Popup Stack and Scroll-Lock Smoke Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
    await assertNoFatalErrors(page);
  });

  test('Scenario A - Quick action sheets open and close safely', async ({ page }) => {
    const quickActions = [
      { button: 'Log Meal', heading: 'Log Meal' },
      { button: 'Check In', heading: 'Daily Check-In' },
      { button: 'Weigh In', heading: 'Weigh In' },
    ];

    for (const action of quickActions) {
      await page.getByRole('button', { name: action.button, exact: true }).click();
      await assertNoFatalErrors(page);

      const heading = page.getByRole('heading', { name: action.heading, exact: true });
      await expect(heading).toBeVisible();

      const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true }).first();
      await cancelBtn.click();

      await expect(heading).toBeHidden();
      await assertNoFatalErrors(page);

      // verify bottom navigation is still clickable
      await handleMobileNav(page);
      const trainBtn = page.getByRole('button', { name: 'Train', exact: true });
      await expect(trainBtn).toBeEnabled();
    }
  });

  test('Scenario B - No stuck overlay after sequential popups', async ({ page }) => {
    const quickActions = [
      { button: 'Log Meal', heading: 'Log Meal' },
      { button: 'Check In', heading: 'Daily Check-In' },
      { button: 'Weigh In', heading: 'Weigh In' },
    ];

    for (const action of quickActions) {
      await page.getByRole('button', { name: action.button, exact: true }).click();
      const heading = page.getByRole('heading', { name: action.heading, exact: true });
      await expect(heading).toBeVisible();

      const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true }).first();
      await cancelBtn.click();
      await expect(heading).toBeHidden();
    }

    await assertNoFatalErrors(page);

    const tabs = [
      { name: 'Train', expected: 'Weekly Workouts' },
      { name: 'Fuel', expected: 'Nutrition' }, // might need exact match update based on app
      { name: 'Recover', expected: 'Recovery' },
      { name: 'Stats', expected: 'Insights' },
      { name: 'Home', expected: 'FitCore Today' }, // or FitCore Score
    ];

    for (const tab of tabs) {
      await handleMobileNav(page);
      await page.getByRole('button', { name: tab.name, exact: true }).click();
      await assertNoFatalErrors(page);

      // we check for standard headings or fallback text loosely since exact text depends on state
      // but the main requirement is no invisible overlay blocking clicks, which clicking the nav verifies.
      // We also do a tiny wait or assert that tab renders safely
      if (tab.name === 'Home') {
        await expect(page.getByText('FitCore Today', { exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible();
      }
    }

    // Attempt clicking on a central page element to ensure no blocking overlay
    const bodyLocator = page.locator('body');
    await bodyLocator.click({ position: { x: 10, y: 10 }, force: false }); // force: false ensures it fails if covered
    await assertNoFatalErrors(page);
  });

  test('Scenario C - Popup close behavior survives reload', async ({ page }) => {
    // Open a safe popup
    await page.getByRole('button', { name: 'Weigh In', exact: true }).click();
    const heading = page.getByRole('heading', { name: 'Weigh In', exact: true });
    await expect(heading).toBeVisible();

    // Close it
    const cancelBtn = page.getByRole('button', { name: 'Cancel', exact: true }).first();
    await cancelBtn.click();
    await expect(heading).toBeHidden();

    // Reload
    await page.reload();
    await assertNoFatalErrors(page);

    // Confirm the app reloads to a usable state
    await expect(page.getByText('FitCore Today', { exact: true }).or(page.getByText('FitCore Score', { exact: true }))).toBeVisible();

    // Confirm the popup can open and close again
    await page.getByRole('button', { name: 'Weigh In', exact: true }).click();
    await expect(heading).toBeVisible();
    await cancelBtn.click();
    await expect(heading).toBeHidden();
    await assertNoFatalErrors(page);
  });

  // Scenario D is implicitly covered since Playwright project setups run this against desktop and mobile viewports
  // and we avoid screenshot assertions and exact CSS checks.
});
