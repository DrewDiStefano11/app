import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("cloud text without consent keeps the draft and sends no server request", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_serverFn/")) requests.push(request.url());
  });
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const input = page.getByPlaceholder("Talk to Jarvis...");
  await input.fill("How much protein have I eaten?");
  await input.press("Enter");
  await expect(
    page.getByText("To send this message, enable cloud text in Settings > Jarvis AI."),
  ).toBeVisible();
  await expect(input).toHaveValue("How much protein have I eaten?");
  expect(requests).toEqual([]);
});

test("a transport failure returns the exact text to the composer for retry", async ({ page }) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { allowCloudText: true },
    }),
  );
  await page.route("**/_serverFn/**", (route) => route.abort());
  await gotoDashboard(page);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  const input = page.getByPlaceholder("Talk to Jarvis...");
  const message = "Compare both training weeks, please.";
  await input.fill(message);
  await input.press("Enter");
  await expect(page.getByText("Jarvis could not complete the request. Try again.")).toBeVisible();
  await expect(input).toHaveValue(message);
});
