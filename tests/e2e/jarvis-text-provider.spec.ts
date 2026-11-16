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

  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Actually, that was three cups of rice.");
  await input.press("Enter");
  await expect(page.getByText(/Correct Chicken and rice.*830 kcal/)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Corrected Chicken and rice.*830 kcal/)).toBeVisible();
  const revised = await readPersistedFitCoreState(page);
  expect(revised.mealEntries).toHaveLength(1);
  expect(revised.mealEntries[0]).toMatchObject({
    id: saved.mealEntries[0].id,
    calories: 830,
    protein: 46,
    carbs: 135,
    fat: 10,
    provenance: { source: "ai-estimated", confirmation: "confirmed", editedBy: "user" },
  });
  expect(revised.mealEntries[0].items?.[0]).toEqual(saved.mealEntries[0].items?.[0]);

  await input.fill("Undo that.");
  await input.press("Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Undid: Corrected Chicken and rice/)).toBeVisible();
  const undone = await readPersistedFitCoreState(page);
  expect(undone.mealEntries).toHaveLength(1);
  expect(undone.mealEntries[0]).toMatchObject({
    id: saved.mealEntries[0].id,
    calories: 620,
    protein: 42,
    carbs: 90,
    fat: 9,
  });
});

test("temporary credentials and local records stay out of persistent storage and cloud context", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { allowCloudText: true },
      bodyweightEntries: [
        {
          id: "synthetic-historical-weigh-in",
          weightLb: 190,
          createdAt: Date.now() - 60_000,
          notes: "unrelated-private-record-marker",
        },
      ],
    }),
  );
  await page.addInitScript(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.includes("/_serverFn/")) return fetch(input, init);
      document.documentElement.dataset.syntheticJarvisRequest = String(init?.body ?? "");
      return Promise.resolve(
        Response.json({
          result: { ok: true, content: "Synthetic general answer.", toolCalls: [] },
        }),
      );
    };
  });
  const openJarvisSettings = async () => {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Data", exact: true }).click();
    const section = page.getByRole("button", { name: /Jarvis \/ AI Memory/ });
    if ((await section.getAttribute("aria-expanded")) !== "true") await section.click();
  };
  await gotoDashboard(page);
  await openJarvisSettings();
  await page.getByLabel("Groq API key").fill("synthetic-temporary-provider-key");
  await page.getByRole("button", { name: "Use until reload", exact: true }).first().click();
  await expect(page.getByText("Key available until this page reloads.")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("fitcore.jarvis.groqApiKey.v1")),
  ).toBeNull();

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page.getByRole("textbox", { name: "Message Jarvis" }).fill("I weigh 182.6 pounds today.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Logged 182.6 lb")).toBeVisible();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Explain what progressive overload means.");
  await input.press("Enter");
  await expect(page.getByText("Synthetic general answer.")).toBeVisible();
  const payload = await page.locator("html").getAttribute("data-synthetic-jarvis-request");
  expect(payload).toContain("Explain what progressive overload means.");
  expect(payload).toContain("synthetic-temporary-provider-key");
  expect(payload).not.toContain("unrelated-private-record-marker");
  expect(payload).not.toContain("182.6");

  await page.reload();
  await openJarvisSettings();
  await expect(page.getByLabel("Groq API key")).toHaveAttribute(
    "placeholder",
    "Paste Groq API key",
  );
});
