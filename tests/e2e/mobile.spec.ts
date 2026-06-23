import { test, expect } from "@playwright/test";

test.describe("FitCore Mobile Responsiveness", () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding for these tests
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fitcore.v1",
        JSON.stringify({
          onboardingComplete: true,
          profile: { name: "MOBILE_USER" },
        }),
      );
    });
  });

  test("No horizontal overflow on mobile viewports", async ({ page }) => {
    await page.goto("/");
    const viewports = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Check for horizontal overflow
      const overflowX = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(
        overflowX,
        `Horizontal overflow detected at ${viewport.width}x${viewport.height}`,
      ).toBe(false);

      // Check core screens
      const navItems = [/home/i, /train/i, /fuel/i, /recover/i, /stats/i];
      for (const item of navItems) {
        const btn = page.getByRole("button", { name: item });
        if (await btn.isVisible()) {
          await btn.click();
          // Small delay for animations
          await page.waitForTimeout(500);
          const currentOverflowX = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });
          expect(
            currentOverflowX,
            `Horizontal overflow detected on ${item} at ${viewport.width}x${viewport.height}`,
          ).toBe(false);
        }
      }
    }
  });
});
