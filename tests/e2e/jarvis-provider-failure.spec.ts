import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function seedWithCloudText(page: Page, jarvisSettings: Record<string, unknown> = {}) {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { allowCloudText: true, ...jarvisSettings },
    }),
  );
}

const fatalErrors = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

async function assertNoFatalErrors(page: Page) {
  for (const error of fatalErrors) {
    await expect(page.getByText(error, { exact: false })).not.toBeVisible();
  }
}

test.describe("Jarvis provider failure", () => {
  test("an error response from the provider preserves the draft and shows no fatal error", async ({
    page,
  }) => {
    await seedWithCloudText(page);
    await page.addInitScript(() => {
      const fetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.includes("/_serverFn/")) return fetch(input, init);
        return Promise.resolve(
          Response.json({
            result: { ok: false, error: "Upstream provider returned invalid data." },
          }),
        );
      };
    });
    await gotoDashboard(page);
    const message = "How was my chest session last week?";
    await page.getByRole("button", { name: "Open AI composer" }).click();
    await page.getByRole("textbox", { name: "Message Jarvis" }).fill(message);
    await page.getByRole("button", { name: "Send to Jarvis" }).click();
    await expect(page.getByText("Warning: Upstream provider returned invalid data.", { exact: true })).toBeVisible();
    const input = page.getByPlaceholder("Talk to Jarvis...");
    // Draft is preserved after a provider error.
    await expect(input).toHaveValue(message);
    await assertNoFatalErrors(page);
  });

  test("a long multiline message is accepted and entered without crashing", async ({ page }) => {
    await seedWithCloudText(page);
    await gotoDashboard(page);
    const longMessage = [
      "Please review my full training log in detail.",
      "",
      "Line 1: Monday bench press, 4 sets of 8 at 185 lb.",
      "Line 2: Tuesday squat, 3 sets of 10 at 225 lb.",
      "Line 3: Friday deadlift, 5 sets of 5 at 275 lb.",
      "What do you recommend for next week's volume?",
    ].join("\n");
    await page.getByRole("button", { name: "Open AI composer" }).click();
    await page
      .getByRole("textbox", { name: "Message Jarvis" })
      .fill(longMessage);
    const entered = await page.getByRole("textbox", { name: "Message Jarvis" }).inputValue();
    expect(entered).toBe(longMessage);
    await assertNoFatalErrors(page);
  });

  test("clearing the conversation resets history", async ({ page }) => {
    await seedWithCloudText(page);
    await page.addInitScript(() => {
      const fetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.includes("/_serverFn/")) return fetch(input, init);
        return Promise.resolve(
          Response.json({ result: { ok: true, content: "Synthetic answer.", toolCalls: [] } }),
        );
      };
    });
    await gotoDashboard(page);
    await page.getByRole("button", { name: "Open AI composer" }).click();
    await page.getByRole("textbox", { name: "Message Jarvis" }).fill("First message");
    await page.getByRole("button", { name: "Send to Jarvis" }).click();
    await expect(page.getByText("Synthetic answer.", { exact: true })).toBeVisible();

    // Reset the conversation.
    await page.getByRole("button", { name: "Clear conversation", exact: true }).click();
    await expect(page.getByText("Synthetic answer.", { exact: true })).toBeHidden();
    await assertNoFatalErrors(page);
  });
});
