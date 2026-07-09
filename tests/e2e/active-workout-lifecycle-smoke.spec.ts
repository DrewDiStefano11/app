import { test, expect } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  FITCORE_MOBILE_VIEWPORTS,
} from "./helpers/fitcore-test-state";

test.describe("Active Workout Lifecycle Smoke", () => {
  test.use({ viewport: FITCORE_MOBILE_VIEWPORTS.iphoneModern, isMobile: true });

  test("scenario coverage for creating, adding exercises, and saving a workout", async ({
    page,
  }) => {
    // 1. App loads without fatal errors
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    const fatalErrors = [
      "This page didn't load",
      "Application error",
      "Unhandled Runtime Error",
      "createServerFn(...).validator is not a function",
      "Cannot read properties of undefined",
      "Cannot read properties of null",
    ];
    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }

    // 2. Training tab or workout start entry point is reachable.
    const expandBtn = page.getByRole("button", { name: "Expand navigation" });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    await page.getByRole("button", { name: "Train", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // 3. User can start or open an active workout using existing UI.
    await page.getByText("Blank workout", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "No exercises yet" })).toBeVisible();

    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }

    // 4. User can add or interact with at least one exercise/set only if the current UI supports it reliably.
    await page.getByRole("button", { name: "Add" }).first().click();
    await expect(page.locator(".sheet-title", { hasText: "Add exercise" })).toBeVisible();

    // In the exercise picker sheet, we look for an explicit exercise (e.g., Squat)
    // rather than relying on brittle bullet points which might fail to match exactly or timeout.
    const exerciseBtn = page
      .locator(".sheet-surface")
      .getByRole("button", { name: /Squat/i })
      .first();
    await expect(exerciseBtn).toBeVisible();
    await exerciseBtn.click();

    // We should be back at the active workout view, with the exercise added.
    await expect(page.getByRole("heading", { name: "No exercises yet" })).not.toBeVisible();

    // 5. Existing active workout UI renders without crashing.
    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }

    // 6. User can finish, discard, cancel, or safely exit the workout using existing UI.
    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect(page.locator(".sheet-title", { hasText: "Finish workout" })).toBeVisible();
    await page.locator(".sheet-surface").getByRole("button", { name: "Confirm & save" }).click();

    // Should return to Training view after save
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // 7. Bottom navigation/app shell is usable afterward.
    await expect(
      page
        .locator("nav")
        .getByRole("button", { name: "Train", exact: true })
        .or(page.getByRole("button", { name: /Expand navigation/ })),
    ).toBeVisible();

    // 8. Reload does not create a fatal error.
    await page.reload();

    for (const errorText of fatalErrors) {
      await expect(page.getByText(errorText)).not.toBeVisible();
    }
  });
});
