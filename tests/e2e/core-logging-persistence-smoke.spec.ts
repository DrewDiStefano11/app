import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  FITCORE_DATA_VERSION,
  FITCORE_STORAGE_KEY,
} from "./helpers/fitcore-test-state";

async function expectRecentActivity(page: Page, label: string, detail?: string) {
  const recentActivity = page.getByText("Recent activity", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'tile')][1]");
  await expect(recentActivity.getByText(label, { exact: true })).toBeVisible();
  if (detail) {
    await expect(recentActivity.getByText(detail, { exact: true })).toBeVisible();
  }
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), FITCORE_STORAGE_KEY);
}

function sheetByHeading(page: Page, name: string) {
  return page
    .getByRole("heading", { name, exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

async function seedReloadableOnboardedState(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ key, version }) => {
      localStorage.clear();
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          onboardingComplete: true,
          profile: {
            goal: "hypertrophy",
            experience: "intermediate",
            daysPerWeek: 5,
            split: "Push / Pull / Legs",
            bodyweightLb: 180,
            targetBodyweightLb: 185,
            units: "lb",
          },
          workouts: [],
          activeWorkout: null,
          mealEntries: [],
          bodyweightEntries: [],
          goals: [
            { id: "g1", type: "weekly_workouts", label: "Train 5x per week", target: 5, current: 0 },
          ],
        }),
      );
    },
    { key: FITCORE_STORAGE_KEY, version: FITCORE_DATA_VERSION },
  );
  await page.reload();
  await expectDashboardReady(page);
}

test.describe("Core logging persistence smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedReloadableOnboardedState(page);
  });

  test("persists a meal logged from the Home quick action", async ({ page }) => {
    await page.getByRole("button", { name: "Log Meal", exact: true }).click();

    const sheet = sheetByHeading(page, "Log Meal");
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Smoke protein bowl");
    await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("420");
    await sheet.getByText("P (g)", { exact: true }).locator("..").locator("input").fill("38");
    await sheet.getByText("C (g)", { exact: true }).locator("..").locator("input").fill("42");
    await sheet.getByText("F (g)", { exact: true }).locator("..").locator("input").fill("12");
    await sheet.getByRole("button", { name: "Save meal", exact: true }).click();

    await expect.poll(async () => (await persistedState(page)).mealEntries?.[0]?.name).toBe("Smoke protein bowl");

    await page.reload();
    await expectDashboardReady(page);
    await expectRecentActivity(page, "Meal logged", "Smoke protein bowl");
  });

  test("persists a weigh-in logged from the Home quick action", async ({ page }) => {
    await page.getByRole("button", { name: "Weigh In", exact: true }).click();

    const sheet = sheetByHeading(page, "Weigh In");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("spinbutton").first().fill("181.6");
    await sheet.getByRole("button", { name: "Save weigh-in", exact: true }).click();

    await expect.poll(async () => (await persistedState(page)).bodyweightEntries?.[0]?.weightLb).toBe(181.6);

    await page.reload();
    await expectDashboardReady(page);
    await expectRecentActivity(page, "Weigh-in saved", "bodyweight");
  });

  test("persists a check-in logged from the Home quick action", async ({ page }) => {
    await page.getByRole("button", { name: "Check In", exact: true }).click();

    const sheet = sheetByHeading(page, "Daily Check-In");
    await expect(sheet).toBeVisible();
    await sheet.getByPlaceholder("How are you feeling today?").fill("Smoke check-in");
    await sheet.getByRole("button", { name: "Save check-in", exact: true }).click();

    await expectRecentActivity(page, "Check-in completed");

    await page.reload();
    await expectDashboardReady(page);
    await expectRecentActivity(page, "Check-in completed");
  });
});
