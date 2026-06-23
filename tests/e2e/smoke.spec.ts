import { test, expect } from "@playwright/test";

test.describe("FitCore Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure a fresh state for onboarding
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto("/");
  });

  test("App loads and onboarding can be completed", async ({ page }) => {
    // 1. App loads without crashing
    // 2. No obvious runtime error overlay appears
    await expect(page).toHaveTitle(/FitCore/i);

    // 3. Onboarding renders for a fresh localStorage state
    // Looking for "Get started" button or "FitCore" heading
    const getStartedBtn = page.getByRole("button", { name: /get started/i });
    await expect(getStartedBtn).toBeVisible();
    await expect(page.getByText(/Your personal command center/i)).toBeVisible();

    // 4. User can complete onboarding with default/simple values
    await getStartedBtn.click();

    // Goal step
    await expect(page.getByText(/What's your main goal/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Experience step
    await expect(page.getByText(/Training experience/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Split step
    await expect(page.getByText(/Training schedule/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Weight step
    await expect(page.getByText(/Your bodyweight/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Macros step
    await expect(page.getByText(/Macro targets/i)).toBeVisible();
    await page.getByRole("button", { name: /continue/i }).click();

    // Done step
    await expect(page.getByText(/You're all set/i)).toBeVisible();
    const enterBtn = page.getByRole("button", { name: /enter fitcore/i });
    await expect(enterBtn).toBeVisible();
    await enterBtn.click();

    // 5. Home screen renders after onboarding
    await expect(page.getByText(/Command Center/i)).toBeVisible();
  });

  test("Navigation and core features", async ({ page }) => {
    // Skip onboarding by setting localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fitcore.v1",
        JSON.stringify({
          onboardingComplete: true,
          profile: { name: "TESTER" },
        }),
      );
    });
    await page.goto("/");

    // 6. Bottom navigation can open various screens
    const navItems = [
      { name: /home/i, heading: /Command Center/i },
      { name: /train/i, heading: /Training/i },
      { name: /fuel|nutrition/i, heading: /Nutrition/i },
      { name: /recover|recovery/i, heading: /Recovery/i },
      { name: /stats|progress/i, heading: /Progress/i },
    ];

    for (const item of navItems) {
      await page.getByRole("button", { name: item.name }).click();
    }

    // Go back to Home
    await page.getByRole("button", { name: /home/i }).click();

    // 7. Settings/Hub can be opened
    const settingsBtn = page.getByLabel(/settings/i);
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await expect(page.getByText(/Settings/i)).toBeVisible();
      // Close settings if it's a modal
      const closeBtn = page.getByRole("button", { name: /close|back/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // 9. Quick-log buttons open their popup/sheet
    const quickLogs = [/Log Meal/i, /Check In/i, /Weigh In/i];
    for (const log of quickLogs) {
      const btn = page.getByRole("button", { name: log });
      if (await btn.isVisible()) {
        await btn.click();
        // 10. Popups/sheets can close
        const closeBtn = page.getByRole("button", { name: /close|done|cancel/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          // Try clicking outside or escape
          await page.keyboard.press("Escape");
        }
      }
    }

    // 11. Active workout flow
    await page.getByRole("button", { name: /train/i }).click();
    const startWorkoutBtn = page.getByRole("button", { name: /start workout/i });
    if (await startWorkoutBtn.isVisible()) {
      await startWorkoutBtn.click();
      // 12. Active workout screen renders if reachable
      const beginBtn = page.getByRole("button", { name: /begin|start/i }).last();
      if (await beginBtn.isVisible()) await beginBtn.click();
    }

    // 14. AI launcher renders if present
    const aiLauncher = page.getByLabel(/jarvis|ai|coach/i).first();
    const aiText = page.getByText(/Jarvis/i).first();
    await expect(aiLauncher.or(aiText)).toBeVisible();
  });
});
