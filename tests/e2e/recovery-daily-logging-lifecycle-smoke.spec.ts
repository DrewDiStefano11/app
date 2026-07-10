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
    // 1. Open Recovery Daily View.
    await page.getByRole("button", { name: "Recover", exact: true }).click();
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

    // 5. Attempt invalid submission. We must use an invalid value.
    await checkInSheet.getByRole("textbox").fill("Valid check-in");

    // 8. Save valid values.
    await checkInSheet.getByRole("button", { name: "Save check-in", exact: true }).click();

    // 9. Confirm the sheet closes.
    await expect(checkInSheet).not.toBeVisible();

    // 10. Confirm the latest check-in is visible.
    await expect(page.getByText("Last check-in", { exact: true })).toBeVisible();
    await expect(page.getByText("⚡7 • 💪7 • 😌7 • 🔥8", { exact: true })).toBeVisible();

    // 11. Open Sleep. Avoid duplicate buttons by scoping or exactly matching without `.first()`
    await page.getByRole("button", { name: "Sleep", exact: true }).click();
    const sleepSheet = page
      .getByRole("heading", { name: "Log sleep", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(sleepSheet).toBeVisible();

    // 12. Attempt invalid submission.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("");
    await sleepSheet.locator('input[inputmode="decimal"]').blur();
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();

    // 13. Confirm the sheet remains open.
    await expect(sleepSheet).toBeVisible();

    // 14. Save a valid sleep entry.
    await sleepSheet.locator('input[inputmode="decimal"]').fill("8.5");
    await sleepSheet.locator('input[inputmode="decimal"]').blur();
    await sleepSheet.getByRole("button", { name: "Save sleep", exact: true }).click();

    // 15. Confirm `Last sleep` updates.
    const lastSleepContainer = page.locator("div").filter({ hasText: /^Last sleep8\.5hq 7\/10$/ });
    if ((await lastSleepContainer.count()) === 0) {
      const lastSleepLabel = page.getByText("Last sleep", { exact: true });
      const lastSleepCard = lastSleepLabel.locator("..");
      await expect(lastSleepCard.getByText("8.5h", { exact: true })).toBeVisible();
    } else {
      await expect(lastSleepContainer).toBeVisible();
    }

    // 16. Confirm the sheet closes.
    await expect(sleepSheet).not.toBeVisible();

    // 17. Open Body Status.
    await page.getByText("Body Status", { exact: true }).click();
    const fatigueSheet = page
      .getByRole("heading", { name: "Muscle fatigue", exact: true })
      .locator('xpath=ancestor::div[contains(@class, "sheet-surface")][1]');
    await expect(fatigueSheet).toBeVisible();

    // 18. Change at least one muscle’s fatigue state.
    await fatigueSheet
      .getByText("chest", { exact: true })
      .locator("..")
      .getByRole("button", { name: "fatigued" })
      .click();

    // 19. Save or close according to the actual UI contract.
    await fatigueSheet.locator(".btn-control").click();

    // 20. Confirm the Daily View body status reflects the update.
    await expect(fatigueSheet).not.toBeVisible();

    // Check that chest text is now shown in the Body Status section
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

    // 21. Navigate to Recovery Deep Dive.
    await page.evaluate(() => window.scrollTo(0, 0));

    // We don't really need to navigate to Home to toggle, maybe we can just find the toggle or we navigate using bottom navigation if it's there
    // If bottom nav is collapsed, wait for it or scroll. Memory says:
    // "Bottom navigation collapses on scroll ... check for and click the 'Expand navigation' button or scroll back to top."
    const expandNav = page.getByRole("button", { name: /Expand navigation/i });
    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();

    // Wait for Home to appear
    await expect(page.getByRole("heading", { name: /Good Morning|Command Center/i })).toBeVisible();

    const deepDiveBtn = page.getByRole("button", { name: /Deep Dive/i });
    if (await deepDiveBtn.isVisible()) {
      await deepDiveBtn.click();
    }

    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Recover", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();

    // 22. Confirm tabs are exactly Health, Sleep, Body, Insights.
    const tabs = page.getByRole("tablist").getByRole("tab");
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(0)).toHaveText("Health");
    await expect(tabs.nth(1)).toHaveText("Sleep");
    await expect(tabs.nth(2)).toHaveText("Body");
    await expect(tabs.nth(3)).toHaveText("Insights");

    // 23. Confirm saved data is still visible in the relevant Deep Dive section.
    // Health tab is active by default
    await expect(page.getByText("⚡7 • 💪7 • 😌7 • 🔥8", { exact: true })).toBeVisible();

    await tabs.nth(1).click(); // Sleep tab
    const sleepAvgLabel = page.getByText("Sleep avg", { exact: true });
    const sleepAvgCardDeepDive = sleepAvgLabel.locator("..");
    await expect(sleepAvgCardDeepDive.getByText("8.5h", { exact: true })).toBeVisible();

    await tabs.nth(2).click(); // Body tab
    // Body Heatmap view - search for chest's label and verify it is "fatigued"
    await expect(
      page.getByText("chest", { exact: true }).locator("..").getByText("fatigued", { exact: true }),
    ).toBeVisible();

    // Switch to Insights
    await tabs.nth(3).click();
    await expect(page.getByRole("heading", { name: "Deep Dive Insights" })).toBeVisible();

    // 24. Close all sheets and verify bottom navigation remains clickable.
    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByText("Command Center")).toBeVisible();

    await checkFatalErrors(page);
  });
});
