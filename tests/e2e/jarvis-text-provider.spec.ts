import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("cloud text without consent keeps the draft and sends no server request", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_serverFn/")) requests.push(request.url());
  });
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page
    .getByRole("textbox", { name: "Message Jarvis" })
    .fill("Compare both training weeks, please.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  const input = page.getByPlaceholder("Talk to Jarvis...");
  await expect(
    page.getByText("To send this message, enable cloud text in Settings > Jarvis AI."),
  ).toBeVisible();
  await expect(input).toHaveValue("Compare both training weeks, please.");
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
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      return url.includes("/_serverFn/")
        ? Promise.reject(new TypeError("Synthetic network failure"))
        : fetch(input, init);
    };
  });
  await gotoDashboard(page);
  const message = "Compare both training weeks, please.";
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page.getByRole("textbox", { name: "Message Jarvis" }).fill(message);
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  const input = page.getByPlaceholder("Talk to Jarvis...");
  await expect(page.getByText("Jarvis could not complete the request. Try again.")).toBeVisible();
  await expect(input).toHaveValue(message);
});

test("a text meal estimate supports portion edits and commits a single AI-estimated record", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: true } }),
  );
  const argsJson = JSON.stringify({
    name: "Chicken and rice",
    mealType: "dinner",
    calories: 410,
    protein: 38,
    carbs: 45,
    fat: 8,
    items: [
      { name: "Chicken", qty: "1 portion", calories: 200, protein: 34, carbs: 0, fat: 7 },
      { name: "Rice", qty: "1 cup", calories: 210, protein: 4, carbs: 45, fat: 1 },
    ],
    confidence: "medium",
    assumptions: ["Unspecified portion treated as one serving."],
  });
  await page.addInitScript((argsJson) => {
    const fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.includes("/_serverFn/")) return fetch(input, init);
      return Promise.resolve(
        Response.json({
          result: {
            ok: true,
            content: "Saved your meal.",
            toolCalls: [
              { id: "call-1", name: "logMeal", argsJson },
              { id: "call-2", name: "logMeal", argsJson },
            ],
          },
        }),
      );
    };
  }, argsJson);
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page
    .getByRole("textbox", { name: "Message Jarvis" })
    .fill("I had chicken and rice for dinner.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();

  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(1);
  await expect(page.getByText("Saved your meal.", { exact: true })).toHaveCount(0);
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([]);
  await page.getByRole("spinbutton", { name: "Portion multiplier for Rice" }).fill("2");
  await expect(page.getByText("Rice (2 cup)")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Logged Chicken and rice - 620 kcal, 42g P / 90g C / 9g F"),
  ).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.mealEntries).toHaveLength(1);
  expect(saved.mealEntries[0]).toMatchObject({
    name: "Chicken and rice",
    calories: 620,
    protein: 42,
    carbs: 90,
    fat: 9,
    provenance: { source: "ai-estimated", confirmation: "confirmed", editedBy: "user" },
  });
});
