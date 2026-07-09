import { test, expect, Page } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

const FATAL_TEXTS = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
  "TypeError: createServerFn",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

// Helper to check for fatal texts in the body text content
async function checkFatalTexts(page: Page) {
  const bodyText = await page.evaluate(() => document.body.textContent || "");
  for (const text of FATAL_TEXTS) {
    if (bodyText.includes(text)) {
      throw new Error(`Fatal error text found on page: "${text}"`);
    }
  }
}

test.describe("App Smoke Test - No Fatal Errors", () => {
  test("should navigate basic app flow without fatal errors or crashes", async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleFatalErrors: string[] = [];

    // Listen for uncaught page errors
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    // Optionally listen for console errors that indicate fatal failure
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore expected warnings, deprecations, or dev tools errors. Focus on actual app crashes.
        if (
          text.includes("TypeError: createServerFn") ||
          text.includes("Unhandled Runtime Error") ||
          text.includes("Application error")
        ) {
          consoleFatalErrors.push(text);
        }
      }
    });

    // Seed state and navigate
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // Initial check on Dashboard (Home)
    await expect(
      page
        .getByText("FitCore Today", { exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible({ timeout: 10000 });
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);
    expect(consoleFatalErrors.length).toBe(0);

    // Navigate to Training
    await page.getByRole("button", { name: "Train" }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Navigate to Nutrition
    await page.getByRole("button", { name: "Fuel" }).click();
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Navigate to Recovery
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Navigate to Insights (Progress/Stats)
    await page.getByRole("button", { name: "Stats" }).click();
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Back to Home
    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();

    // Navigate to Hub/Settings
    await page
      .getByRole("button", { name: "Settings", exact: true })
      .or(page.locator('button[aria-label="Settings"]'))
      .or(page.locator('button[aria-label="Hub"]'))
      .click();
    await expect(page.getByRole("heading", { name: "Hub" })).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Close Hub
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { name: "Hub" })).not.toBeVisible();

    // Reload stability test
    await page.getByRole("button", { name: "Train" }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
    await page.reload();
    await expect(
      page
        .getByRole("heading", { name: "Training" })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);
    expect(consoleFatalErrors.length).toBe(0);
  });
});
