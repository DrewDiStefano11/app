import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState } from "./helpers/fitcore-test-state";

test.describe("Mobile Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await page.waitForLoadState("networkidle");
  });

  const checkOverflow = async (page) => {
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);
  };

  test("should load home screen without horizontal overflow", async ({ page }) => {
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await checkOverflow(page);
  });

  test("should navigate to training without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "Train", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
    await checkOverflow(page);
  });

  test("should navigate to nutrition without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "Fuel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
    await checkOverflow(page);
  });

  test("should navigate to recovery without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();
    await checkOverflow(page);
  });

  test("should navigate to progress without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "Stats", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
    await checkOverflow(page);
  });

  test("should open settings without horizontal overflow", async ({ page }) => {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await checkOverflow(page);
  });
});
