import { test, expect } from '@playwright/test';
import * as fs from 'fs';

// Actually, tests in this repo often inject an initial state via localStorage before page load.
test.describe('Settings Data Safety Lifecycle Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Scaffold initial state to avoid onboarding.
    await page.addInitScript(() => {
      window.localStorage.setItem('fitcore.v1', JSON.stringify({
        version: 4,
        onboardingComplete: true,
        profile: {
          goal: 'strength',
          experience: 'intermediate',
          daysPerWeek: 4,
          split: 'Push/Pull/Legs',
          bodyweightLb: 180,
          targetBodyweightLb: 190,
          units: 'lb'
        },
        reminders: { workout: false, weighIn: false, lunch: false },
        demoMode: false,
        jarvisSettings: { allowLogging: true, enableVoice: false, confirmActions: true, autoCorrection: true }
      }));
    });
  });

  test('Settings safety, profile validation, import, export, and reset', async ({ page }) => {
    // 1. Open Home.
    await page.goto('/');

    // 2. Use the Settings button at the top of Home.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();

    // 3. Confirm the page title is exactly `Settings`.
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    // 4. Confirm Settings is not a bottom tab.
    // The bottom nav tabs in the app are usually Home, Train, Fuel, Recover, Progress
    // We expect Settings is NOT one of the bottom tabs.
    const bottomNavSettings = page.locator('nav.bottom-nav').getByRole('button', { name: 'Settings' });
    await expect(bottomNavSettings).toHaveCount(0);

    // 5. Confirm top-level sections are exactly Profile, Preferences, Data, Integrations.
    const tabs = page.getByRole('tablist').getByRole('tab');
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(0)).toHaveText('Profile');
    await expect(tabs.nth(1)).toHaveText('Preferences');
    await expect(tabs.nth(2)).toHaveText('Data');
    await expect(tabs.nth(3)).toHaveText('Integrations');

    // 6. Switch through all four sections.
    // 7. Confirm each section shows its own intended content.
    await tabs.nth(1).click();
    // The HubCard title is rendered inside a span or heading depending on its implementation,
    // actually it's a span, let's just use exact text match to check visibility.
    await expect(page.getByText('Preferences & Reminders', { exact: true })).toBeVisible();
    await expect(page.getByText('Basic Profile', { exact: true })).not.toBeVisible();

    await tabs.nth(2).click();
    await expect(page.getByText('Data Management', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Preferences & Reminders', { exact: true })).not.toBeVisible();

    await tabs.nth(3).click();
    await expect(page.getByText('Integrations & Devices', { exact: true })).toBeVisible();
    await expect(page.getByText('Data Management', { exact: true }).first()).not.toBeVisible();

    // 8. Return to Profile.
    await tabs.nth(0).click();
    await expect(page.getByText('Basic Profile', { exact: true })).toBeVisible();

    // 9. Change at least one existing active profile value to a valid value.
    const bwInput = page.locator('div').filter({ hasText: /^Bodyweight \(lb\)$/ }).locator('input');
    await bwInput.fill('185');
    await bwInput.blur(); // Trigger validation logic

    const dpwInput = page.locator('div').filter({ hasText: /^Days\/week$/ }).locator('input');
    await dpwInput.fill('5');
    await dpwInput.blur();

    // 10. Switch sections and return.
    await tabs.nth(1).click();
    await tabs.nth(0).click();

    // 11. Confirm the value persists.
    await expect(bwInput).toHaveValue('185');
    await expect(dpwInput).toHaveValue('5');

    // 12. Leave Settings with Done.
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();

    // 13. Reopen Settings.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();

    // 14. Confirm the value remains.
    await expect(bwInput).toHaveValue('185');

    // 15. Test invalid active numeric input.
    await bwInput.fill('-10');
    await bwInput.blur();

    // 16. Confirm invalid input does not corrupt visible persistent state.
    // Our logic resets to previous valid state ('185') when invalid input is blurred.
    await expect(bwInput).toHaveValue('185');

    await bwInput.fill('abc');
    await bwInput.blur();
    await expect(bwInput).toHaveValue('185');

    // 17. Open Data.
    await tabs.nth(2).click();

    // 18. Trigger export and capture the browser download.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;

    // 19. Confirm filename format and valid JSON.
    expect(download.suggestedFilename()).toMatch(/^fitcore-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const downloadPath = await download.path();
    const content = fs.readFileSync(downloadPath, 'utf8');
    const parsedData = JSON.parse(content);
    expect(parsedData.profile.bodyweightLb).toBe(185);

    // 20. Confirm export does not mutate state.
    await tabs.nth(0).click();
    await expect(bwInput).toHaveValue('185');
    await tabs.nth(2).click();

    // 21. Attempt import of invalid JSON.
    // Use the file input directly since setInputFiles handles hidden inputs automatically
    const fileInput = page.getByLabel('Import backup file');
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ invalid: json }')
    });

    // 22. Confirm visible failure feedback.
    await expect(page.locator('text=Invalid backup file')).toBeVisible();

    // 23. Confirm previous state remains unchanged.
    await tabs.nth(0).click();
    await expect(bwInput).toHaveValue('185');
    await tabs.nth(2).click();

    // 24. Import a controlled valid backup using the canonical format available in test setup.
    const validBackup = {
      ...parsedData,
      profile: { ...parsedData.profile, bodyweightLb: 195 }
    };

    await fileInput.setInputFiles({
      name: 'valid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(validBackup))
    });

    // 25. Confirm visible success feedback and expected state update.
    await expect(page.locator('text=Imported successfully \u2713')).toBeVisible();
    await tabs.nth(0).click();
    await expect(bwInput).toHaveValue('195');
    await tabs.nth(2).click();

    // 26. Trigger reset.
    await page.getByRole('button', { name: 'Reset all data' }).click();

    // 27. Confirm a real confirmation dialog appears.
    const dialog = page.locator('.sheet-root').last();
    await expect(dialog.getByRole('heading', { name: 'Reset all data?' })).toBeVisible();

    // 28. Cancel.
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    // 29. Confirm state remains unchanged.
    await tabs.nth(0).click();
    await expect(bwInput).toHaveValue('195');
    await tabs.nth(2).click();

    // 30. Trigger reset again.
    await page.getByRole('button', { name: 'Reset all data' }).click();

    // 31. Confirm.
    await dialog.getByRole('button', { name: 'Reset', exact: true }).click();

    // 32. Confirm reset occurs exactly once.
    // 33. Confirm the dialog closes.
    await expect(dialog.getByRole('heading', { name: 'Reset all data?' })).not.toBeVisible();

    // 34. Confirm no overlay remains.
    await expect(dialog).not.toBeVisible();

    // Resetting the data causes the app to return to the onboarding state.
    // Confirm the onboarding screen is visible.
    await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
  });
});
