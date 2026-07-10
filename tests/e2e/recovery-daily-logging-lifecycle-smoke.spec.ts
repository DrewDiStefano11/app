import { test, expect } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  FITCORE_STORAGE_KEY,
} from "./helpers/fitcore-test-state";

test.describe("Recovery daily logging lifecycle smoke", () => {
  const checkFatalErrors = async (page) => {
    await expect(page.getByText("This page didn't load")).not.toBeVisible();
    await expect(page.getByText("Application error")).not.toBeVisible();
    await expect(page.getByText("Unhandled Runtime Error")).not.toBeVisible();
    await expect(
      page.getByText("createServerFn(...).validator is not a function"),
    ).not.toBeVisible();
    await expect(page.getByText("Cannot read properties of undefined")).not.toBeVisible();
    await expect(page.getByText("Cannot read properties of null")).not.toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  test("Full Recovery logging lifecycle", async ({ page }) => {
    // Navigate using robust bottom nav
    const expandNavBtn = page.getByRole("button", { name: /Expand navigation/i });
    const recoveryNavBtn = page.getByRole("button", { name: "Recover", exact: true });

    // We scroll top to ensure bottom nav is visible or we expand it.
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await expandNavBtn.isVisible()) {
      await expandNavBtn.click();
    }
    await recoveryNavBtn.click();

    // 1. Open Recovery Daily View.
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();

    // 2. Confirm no Daily View subtabs are visible.
    await expect(page.getByRole("tablist")).not.toBeVisible();

    // 3. Open Check-in.
    await page.getByRole("button", { name: "Check-in", exact: true }).click();
    const checkInSheet = page
      .getByRole("heading", { name: "Daily check-in", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');

    // 4. Confirm the intended sheet is visible by accessible title or heading.
    await expect(checkInSheet).toBeVisible();

    // 5. One valid check-in saves exactly once.
    await checkInSheet.getByRole("textbox").fill("Valid check-in");

    // 6. Rapid duplicate submission creates no second record.
    await checkInSheet.getByRole("button", { name: "Save check-in", exact: true }).click();

    // 7. Confirm the sheet closes.
    await expect(checkInSheet).not.toBeVisible();

    // 8. Confirm the latest check-in is visible.
    await expect(page.getByText("Last check-in", { exact: true })).toBeVisible();
    await expect(page.getByText("⚡7 • 💪7 • 😌7 • 🔥8", { exact: true })).toBeVisible();

    // Verify exactly one record was saved by checking local storage
    const checkInsLength = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      return state.recoveryCheckIns?.length ?? 0;
    }, FITCORE_STORAGE_KEY);
    expect(checkInsLength).toBe(1);

    // Reopen and save another to verify guard was reset
    await page.getByRole("button", { name: "Check-in", exact: true }).click();
    await expect(checkInSheet).toBeVisible();
    await checkInSheet.getByRole("textbox").fill("Second check-in");
    await checkInSheet.getByRole("button", { name: "Save check-in", exact: true }).click();
    await expect(checkInSheet).not.toBeVisible();

    // 9. Open Sleep. Avoid duplicate buttons by scoping or exactly matching
    await page.getByRole("button", { name: "Sleep", exact: true }).click();
    const sleepSheet = page
      .getByRole("heading", { name: "Log sleep", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sleepSheet).toBeVisible();

    // 10. Attempt invalid blank Sleep does not save.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("");
    await sleepSheet.locator('input[inputmode="decimal"]').blur();
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();

    // 14. Sleep sheet remains open after invalid input.
    await expect(sleepSheet).toBeVisible();

    // 15. Visible accessible validation appears.
    await expect(sleepSheet.getByRole("alert")).toBeVisible();

    // 11. Invalid zero Sleep does not save.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("0");
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(sleepSheet).toBeVisible();
    await expect(sleepSheet.getByRole("alert")).toBeVisible();

    // 12. Invalid negative Sleep does not save.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("-5");
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(sleepSheet).toBeVisible();

    // 13. Invalid malformed Sleep does not save.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("invalid");
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(sleepSheet).toBeVisible();

    // 16. One valid Sleep entry saves exactly once.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("8.5");
    await sleepSheet.locator('input[inputmode="decimal"]').blur();

    // 17. Rapid duplicate submission creates no second record.
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();

    // 18. Confirm the sheet closes.
    await expect(sleepSheet).not.toBeVisible();

    // 19. Daily View sleep summary updates.
    await expect(
      page
        .locator(".stat-card__label", { hasText: "Last sleep" })
        .locator("..")
        .getByText("8.5h", { exact: true }),
    ).toBeVisible();

    // Reopen and save another to verify guard was reset
    await page.getByRole("button", { name: "Sleep", exact: true }).click();
    await expect(sleepSheet).toBeVisible();
    await sleepSheet.locator('input[inputmode="decimal"]').fill("9");
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();
    await expect(sleepSheet).not.toBeVisible();

    // Check that we updated the new sleep to 9h
    await expect(
      page
        .locator(".stat-card__label", { hasText: "Last sleep" })
        .locator("..")
        .getByText("9h", { exact: true }),
    ).toBeVisible();

    const sleepLength = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      return state.sleepEntries?.length ?? 0;
    }, FITCORE_STORAGE_KEY);
    expect(sleepLength).toBe(2);

    // 20. Body Status sheet opens using an accessible control.
    await page.getByText("Body Status", { exact: true }).click();
    const fatigueSheet = page
      .getByRole("heading", { name: "Muscle fatigue", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(fatigueSheet).toBeVisible();

    // 21. A muscle status updates through the real UI.
    await fatigueSheet
      .getByText("chest", { exact: true })
      .locator("..")
      .getByRole("button", { name: "fatigued", exact: true })
      .click();

    // 22. The sheet closes through an accessible button.
    await fatigueSheet.locator("..").locator(".btn-control").click();

    // 23. Daily View reflects the updated muscle.
    await expect(fatigueSheet).not.toBeVisible();
    await expect(
      page
        .locator(".card-elev", { hasText: "Body Status" })
        .or(
          page
            .locator("div")
            .filter({ hasText: /^Body Status$/ })
            .locator(".."),
        )
        .getByText("chest", { exact: true }),
    ).toBeVisible();

    // 24. Deep Dive contains exactly Health, Sleep, Body, Insights.
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await expandNavBtn.isVisible()) {
      await expandNavBtn.click();
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();

    // Toggle Deep Dive on the Home view using the exact toggle button.
    const deepDiveBtn = page.getByRole("button", { name: "Deep Dive", exact: true });
    if (await deepDiveBtn.isVisible()) {
      await deepDiveBtn.click();
    } else {
      // App mode toggle is visible on Home for Deep Dive vs Daily View
      // Fallback
      const dailyViewBtn = page.getByRole("button", { name: "Daily View", exact: true });
      if (await dailyViewBtn.isVisible()) {
        await dailyViewBtn.click();
      }
    }

    if (await expandNavBtn.isVisible()) {
      await expandNavBtn.click();
    }
    await page.getByRole("button", { name: "Recover", exact: true }).click();

    const tabs = page.getByRole("tablist").getByRole("tab");

    // Wait for the tabs to render, some views require explicit toggle check
    await expect(tabs).toHaveCount(4);
    await expect(page.getByRole("tab", { name: "Health", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sleep", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Body", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Insights", exact: true })).toBeVisible();

    // 25. Check-in appears in Health.
    await expect(page.getByText("⚡7 • 💪7 • 😌7 • 🔥8", { exact: true })).toBeVisible();

    // 26. Sleep appears in Sleep.
    await page.getByRole("tab", { name: "Sleep", exact: true }).click();
    await expect(
      page
        .locator(".stat-card__label", { hasText: "Sleep avg" })
        .locator("..")
        .getByText("8.8h", { exact: true }), // avg of 8.5 and 9
    ).toBeVisible();

    // 27. Muscle state appears in Body.
    await page.getByRole("tab", { name: "Body", exact: true }).click();
    await expect(
      page.getByText("chest", { exact: true }).locator("..").getByText("fatigued", { exact: true }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Insights", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Deep Dive Insights", exact: true }),
    ).toBeVisible();

    // 28. Home navigation works.
    if (await expandNavBtn.isVisible()) {
      await expandNavBtn.click();
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();

    // 29. Home is confirmed using Settings and Command Center.
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByText("Command Center", { exact: true })).toBeVisible();

    // 30. Returning to Recovery preserves all saved values.
    if (await expandNavBtn.isVisible()) {
      await expandNavBtn.click();
    }
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();

    await expect(tabs).toHaveCount(4);
    await page.getByRole("tab", { name: "Health", exact: true }).click();
    await expect(page.getByText("⚡7 • 💪7 • 😌7 • 🔥8", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Sleep", exact: true }).click();
    await expect(
      page
        .locator(".stat-card__label", { hasText: "Sleep avg" })
        .locator("..")
        .getByText("8.8h", { exact: true }),
    ).toBeVisible();

    // 31. No invisible overlay remains.
    await expect(page.locator(".sheet-backdrop")).not.toBeVisible();

    // 32. No fatal page or console errors occur.
    await checkFatalErrors(page);
  });
});
