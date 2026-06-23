import { test, expect } from "@playwright/test";

test.describe("FitCore Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("App loads and onboarding renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/FitCore/i, { timeout: 30000 });
    const getStartedBtn = page.getByRole("button", { name: /get started/i });
    await expect(getStartedBtn).toBeVisible({ timeout: 30000 });
  });
});
