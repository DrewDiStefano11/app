import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";
import type { AppState } from "../../src/lib/types";

test.use({ serviceWorkers: "block" });

test("voice corrections and voice confirmation share the photo review without reuploading the image", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {}, addEventListener() {}, removeEventListener() {} }],
        }),
      },
    });
    class Recorder {
      static isTypeSupported(type: string) {
        return type === "audio/mp4";
      }
      state = "inactive";
      mimeType = "audio/mp4";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        queueMicrotask(() => {
          this.ondataavailable?.({
            data: new Blob(
              [new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0])],
              { type: this.mimeType },
            ),
          });
          this.onstop?.();
        });
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: Recorder });
  });
  let images = 0,
    transcripts = 0;
  await page.route("**/_serverFn/**", async (route) => {
    const isPhoto = route.request().postData()?.includes("imageDataUrl");
    if (isPhoto) images++;
    else transcripts++;
    await route.fulfill({
      json: {
        result: isPhoto
          ? { ok: true, estimate: plate }
          : {
              ok: true,
              text:
                transcripts === 1
                  ? "Actually the chicken was eight ounces, remove the broccoli, and add a tablespoon of olive oil."
                  : "Looks good, save it.",
              model: "whisper-large-v3-turbo",
              audioSeconds: 1,
            },
      },
    });
  });
  await start(page);
  await upload(page);
  const review = page.getByRole("region", { name: "Meal photo review" });
  for (let turn = 0; turn < 2; turn++) {
    await page.getByRole("button", { name: "Record voice", exact: true }).click();
    await page.getByRole("button", { name: "Stop and transcribe", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Jarvis message" })).toHaveValue(
      turn === 0 ? /eight ounces/ : "Looks good, save it.",
    );
    await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
    if (turn === 0) {
      await expect(review.getByText("698 kcal", { exact: true })).toBeVisible();
      expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
    }
  }
  await expect(review.getByRole("button", { name: "Undo saved meal", exact: true })).toBeVisible();
  expect(images).toBe(1);
  expect(transcripts).toBe(2);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(1);
});
const plate = {
  name: "Chicken rice and broccoli",
  mealType: "dinner",
  recipeServings: 1,
  servingsEaten: 1,
  assumptions: ["Estimated portions; cooking oil may be hidden."],
  question: "Was any oil or sauce added?",
  items: [
    {
      id: "chicken",
      name: "Grilled chicken",
      quantity: 6,
      unit: "oz",
      calories: 280,
      protein: 52,
      carbs: 0,
      fat: 6,
      evidence: "visible",
      preparation: "grilled",
    },
    {
      id: "rice",
      name: "White rice",
      quantity: 1,
      unit: "cup",
      calories: 205,
      protein: 4,
      carbs: 45,
      fat: 0,
      evidence: "visible",
      preparation: "cooked",
    },
    {
      id: "broccoli",
      name: "Broccoli",
      quantity: 1,
      unit: "cup",
      calories: 55,
      protein: 4,
      carbs: 11,
      fat: 1,
      evidence: "visible",
      preparation: "steamed",
    },
  ],
};
const image = {
  name: "synthetic-food.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ),
};
async function start(page: Page, savedNutrition: AppState["savedNutrition"] = []) {
  await page.addInitScript(() =>
    localStorage.setItem("fitcore.jarvis.groqApiKey.v1", "synthetic-test-key"),
  );
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      savedNutrition,
      jarvisSettings: { allowCloudText: false, voiceModeEnabled: true },
    }),
  );
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("button", { name: "Meal photo", exact: true }).click();
  await page.getByLabel("Upload food photo").setInputFiles(image);
  await expect(page.getByRole("button", { name: "Estimate meal", exact: true })).toBeDisabled();
}
async function upload(page: Page) {
  await page.getByLabel("Send this photo and meal corrections to Groq").check();
  await page.getByRole("button", { name: "Estimate meal", exact: true }).click();
  await expect(page.getByRole("region", { name: "Meal photo review" })).toBeVisible();
}
test("food photo is independently estimated, conversationally corrected, explicitly saved once and revised in place", async ({
  page,
}, testInfo) => {
  let calls = 0;
  await page.route("**/_serverFn/**", async (route) => {
    calls++;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          ok: true,
          estimate: plate,
          model: "qwen/qwen3.8-27b",
          usage: { promptTokens: 2100, completionTokens: 300 },
        },
      }),
    });
  });
  await start(page);
  await upload(page);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await expect(page.getByText("Was any oil or sauce added?", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill(
    "Actually the chicken was 8 ounces, remove the broccoli, and add a tablespoon of olive oil.",
  );
  await input.press("Control+Enter");
  const review = page.getByRole("region", { name: "Meal photo review" });
  await expect(review.getByText("698 kcal", { exact: true })).toBeVisible();
  await expect(
    review.getByRole("list").first().getByText("Olive Oil", { exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath("food-photo-review.png"), fullPage: true });
  await input.fill("Looks good, save it.");
  await input.press("Control+Enter");
  await expect(review.getByRole("button", { name: "Undo saved meal", exact: true })).toBeVisible();
  const first = (await readPersistedFitCoreState(page)).mealEntries[0];
  expect(first).toMatchObject({
    calories: 698,
    protein: 73,
    carbs: 45,
    fat: 22,
    confirmed: true,
    source: "camera",
  });
  await input.fill("the rice was 2 cups");
  await input.press("Control+Enter");
  await expect(review.getByText("903 kcal", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Save corrected meal", exact: true }).dblclick();
  await expect
    .poll(async () => (await readPersistedFitCoreState(page)).mealEntries[0].calories)
    .toBe(903);
  const saved = (await readPersistedFitCoreState(page)).mealEntries;
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(first.id);
  await review.getByRole("button", { name: "Undo saved meal", exact: true }).click();
  await expect
    .poll(async () => (await readPersistedFitCoreState(page)).mealEntries[0].calories)
    .toBe(698);
  await page.reload();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(1);
  await expect(page.locator(".home-section-card--macros")).toContainText("698");
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await expect(page.getByText("698 kcal logged today", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await expect(page.getByText("698 kcal logged today", { exact: true })).toBeVisible();
});

test("photo rate limit leaves ordinary text logging and stored records available", async ({
  page,
}) => {
  await page.route("**/_serverFn/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          ok: false,
          error: "Synthetic Groq limit reached",
          code: "quota",
          retryAfterMs: 30000,
        },
      }),
    }),
  );
  await start(page);
  await upload(page);
  await expect(page.getByText("Synthetic Groq limit reached", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Discard meal photo", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Log creatine");
  await input.press("Control+Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  expect((await readPersistedFitCoreState(page)).supplementLogs).toHaveLength(1);
});

test("saved labels require selection and failed photo saves retain the review for retry", async ({
  page,
}) => {
  await page.route("**/_serverFn/**", (route) =>
    route.fulfill({ json: { result: { ok: true, estimate: plate } } }),
  );
  await start(page, [
    {
      id: "rice-label",
      kind: "food",
      servingLabel: "1 cup",
      meal: {
        id: "rice",
        name: "Brand White rice",
        type: "dinner",
        calories: 190,
        protein: 5,
        carbs: 40,
        fat: 1,
        createdAt: Date.now(),
      },
    },
  ]);
  await upload(page);
  const review = page.getByRole("region", { name: "Meal photo review" });
  await expect(review.getByText("540 kcal", { exact: true })).toBeVisible();
  await review
    .getByRole("button", { name: "Use saved Brand White rice (1 cup)", exact: true })
    .click();
  await expect(review.getByText("525 kcal", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota", "QuotaExceededError");
    };
    window.addEventListener(
      "restore-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
  await review.getByRole("button", { name: "Confirm and save meal", exact: true }).click();
  await expect(review.getByRole("alert")).toContainText("could not verify the save");
  await expect(review.getByText("525 kcal", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await review.getByRole("button", { name: "Confirm and save meal", exact: true }).click();
  await expect(review.getByRole("button", { name: "Undo saved meal", exact: true })).toBeVisible();
  const state = await readPersistedFitCoreState(page);
  expect(state.mealEntries).toHaveLength(1);
  expect(state.mealEntries[0]).toMatchObject({ calories: 525, protein: 61, carbs: 51, fat: 8 });
  expect(state.savedNutrition?.[0].meal.calories).toBe(190);
});

test("saved meal text reuse preserves its name and unknown macros after confirmation", async ({
  page,
}) => {
  await start(page, [
    {
      id: "usual-bowl",
      kind: "meal",
      meal: {
        id: "previous",
        name: "Lunch bowl",
        type: "lunch",
        calories: 500,
        macroStatus: "unreported",
        createdAt: Date.now() - 86400000,
      },
    },
  ]);
  await page.getByRole("button", { name: "Discard meal photo", exact: true }).click();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("Log saved lunch bowl");
  await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(1);
  expect((await readPersistedFitCoreState(page)).mealEntries[0]).toMatchObject({
    name: "Lunch bowl",
    calories: 500,
    macroStatus: "unreported",
  });
});
