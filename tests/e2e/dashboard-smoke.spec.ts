import { test } from "@playwright/test";
import {
  seedMinimalOnboardedState,
  gotoDashboard,
  setMobileViewport,
  FITCORE_MOBILE_VIEWPORTS,
} from "./helpers/fitcore-test-state";

test.describe("Dashboard Smoke Test", () => {
  test("loads dashboard with seeded onboarded state", async ({ page }) => {
    // 1. Seed the minimal onboarded state to bypass onboarding
    await seedMinimalOnboardedState(page);

    // 2. Navigate to the dashboard
    await gotoDashboard(page);
  });

  test("loads dashboard on mobile viewport with seeded onboarded state", async ({ page }) => {
    // 1. Set mobile viewport
    await setMobileViewport(page, FITCORE_MOBILE_VIEWPORTS.iphoneModern);

    // 2. Seed the minimal onboarded state
    await seedMinimalOnboardedState(page);

    // 3. Navigate to the dashboard
    await gotoDashboard(page);
  });
});
