import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });

async function voiceFixture(page: Page, deny = false) {
  await page.addInitScript(
    ({ deny }) => {
      localStorage.setItem("fitcore.jarvis.groqApiKey.v1", "synthetic-test-key");
      const probe = { tracksStopped: 0, recordings: 0 };
      Object.assign(window, { voiceProbe: probe });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            if (deny) throw new DOMException("Synthetic denial", "NotAllowedError");
            return {
              getTracks: () => [
                {
                  stop: () => {
                    probe.tracksStopped++;
                  },
                  addEventListener() {},
                  removeEventListener() {},
                },
              ],
            };
          },
        },
      });
      class SyntheticRecorder {
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
          probe.recordings++;
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
      Object.defineProperty(window, "MediaRecorder", {
        configurable: true,
        value: SyntheticRecorder,
      });
    },
    { deny },
  );
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      jarvisSettings: { voiceModeEnabled: true, allowCloudText: false },
      activeWorkout: {
        id: "voice-workout",
        name: "Voice workout",
        restEndsAt: Date.now() + 120_000,
        startedAt: Date.now() - 30_000,
        exercises: [
          {
            id: "bench-row",
            exerciseId: "bench-press",
            completed: false,
            sets: [{ id: "set-one", completed: false }],
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
}

test("voice produces editable text, then the normal confirmation saves one active set", async ({
  page,
}) => {
  await voiceFixture(page);
  const originalRest = (await readPersistedFitCoreState(page)).activeWorkout?.restEndsAt;
  expect(originalRest).toBeGreaterThan(Date.now());
  let uploads = 0;
  await page.route("**/_serverFn/**", async (route) => {
    uploads++;
    const payload = route.request().postData() ?? "";
    expect(payload).not.toContain("includeWhoop");
    expect(payload).not.toContain("bench-row");
    await route.fulfill({
      json: {
        result: {
          ok: true,
          text:
            uploads === 1
              ? "I benched 185 pounds for 8 reps."
              : "Actually, that was two hundred thirty-five pounds for six reps.",
          model: "whisper-large-v3-turbo",
          audioSeconds: 1,
        },
      },
    });
  });
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop and transcribe", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop and transcribe", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await expect(input).toHaveValue("I benched 185 pounds for 8 reps.");
  expect(
    (await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].sets[0].completed,
  ).toBe(false);
  expect((await readPersistedFitCoreState(page)).activeWorkout?.restEndsAt).toBe(originalRest);
  await input.fill("I benched 195 pounds for 8 reps.");
  await input.press("Control+Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Logged Barbell Bench Press: 195 lb for 8 reps", { exact: true }),
  ).toBeVisible();
  const state = await readPersistedFitCoreState(page);
  expect(state.activeWorkout?.exercises[0].sets).toHaveLength(1);
  expect(state.activeWorkout?.exercises[0].sets[0]).toMatchObject({
    id: "set-one",
    completed: true,
    weight: 195,
    reps: 8,
  });
  expect(state.jarvisAudit[0].patch).toMatchObject({ inputMethod: "voice" });
  const restAfterFirstSet = state.activeWorkout?.restEndsAt;
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await page.getByRole("button", { name: "Stop and transcribe", exact: true }).click();
  await expect(input).toHaveValue(
    "Actually, that was two hundred thirty-five pounds for six reps.",
  );
  await input.press("Control+Enter");
  await expect(page.getByText(/Correct Barbell Bench Press, set 1 .*235 lb/)).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Corrected Barbell Bench Press, set 1 .*235 lb/)).toBeVisible();
  const corrected = await readPersistedFitCoreState(page);
  expect(corrected.activeWorkout?.exercises[0].sets).toHaveLength(1);
  expect(corrected.activeWorkout?.exercises[0].sets[0]).toMatchObject({
    id: "set-one",
    weight: 235,
    reps: 6,
  });
  expect(corrected.activeWorkout?.restEndsAt).toBe(restAfterFirstSet);
  await input.fill("Undo that");
  await input.press("Control+Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Undid: Voice: Corrected Barbell Bench Press/)).toBeVisible();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].sets[0]).toMatchObject(
    { id: "set-one", weight: 195, reps: 8 },
  );
  expect(uploads).toBe(2);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { voiceProbe: { tracksStopped: number } }).voiceProbe.tracksStopped,
    ),
  ).toBe(2);
});

test("microphone denial preserves a typed draft and never changes the workout", async ({
  page,
}) => {
  await voiceFixture(page, true);
  const before = await readPersistedFitCoreState(page);
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Keep this draft");
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(page.getByText(/Microphone permission was denied/)).toBeVisible();
  await expect(input).toHaveValue("Keep this draft");
  expect((await readPersistedFitCoreState(page)).activeWorkout).toEqual(before.activeWorkout);
});

test("backgrounding cancels the microphone without uploading and preserves draft and workout", async ({
  page,
}) => {
  await voiceFixture(page);
  let uploads = 0;
  await page.route("**/_serverFn/**", async (route) => {
    uploads++;
    await route.abort();
  });
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Keep this draft");
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop and transcribe", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText(/Voice input interrupted/)).toBeVisible();
  await expect(input).toHaveValue("Keep this draft");
  expect(uploads).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { voiceProbe: { tracksStopped: number } }).voiceProbe.tracksStopped,
    ),
  ).toBe(1);
  expect((await readPersistedFitCoreState(page)).activeWorkout?.id).toBe("voice-workout");
});

test("one spoken mixed command reviews each entry and saves the selected records once", async ({
  page,
}, testInfo) => {
  await voiceFixture(page);
  await page.route("**/_serverFn/**", async (route) =>
    route.fulfill({
      json: {
        result: {
          ok: true,
          text: "I did 20 minutes treadmill, had 500 calories for lunch, and took creatine.",
          model: "whisper-large-v3-turbo",
          audioSeconds: 2,
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await page.getByRole("button", { name: "Stop and transcribe", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await expect(input).toHaveValue(/20 minutes treadmill/);
  await input.press("Control+Enter");
  const review = page.getByRole("group", { name: "Review mixed entries" });
  await expect(review.getByRole("checkbox")).toHaveCount(3);
  expect((await readPersistedFitCoreState(page)).mealEntries).toEqual([]);
  await review.getByRole("button", { name: "Save selected entries", exact: true }).dblclick();
  await expect(page.getByText("Saved 3 reviewed entries.", { exact: true })).toBeVisible();
  const recordBox = await page
    .getByRole("button", { name: "Record voice", exact: true })
    .boundingBox();
  const inputBox = await input.boundingBox();
  expect(recordBox).not.toBeNull();
  expect(inputBox).not.toBeNull();
  expect(recordBox!.y + recordBox!.height).toBeLessThanOrEqual(inputBox!.y);
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: testInfo.outputPath("voice-mixed-review.png"), fullPage: false });
  const saved = await readPersistedFitCoreState(page);
  expect(saved.cardioEntries).toHaveLength(1);
  expect(saved.mealEntries).toHaveLength(1);
  expect(saved.supplementLogs).toHaveLength(1);
  expect(saved.mealEntries[0]).toMatchObject({ calories: 500, macroStatus: "unreported" });
  expect(saved.jarvisAudit.filter((entry) => entry.status === "logged")).toHaveLength(3);
  await page.locator(".sheet-header").filter({ hasText: "Jarvis" }).getByRole("button").click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Voice workout", exact: true })).toBeVisible();
  const restored = await readPersistedFitCoreState(page);
  expect(restored.cardioEntries).toHaveLength(1);
  expect(restored.mealEntries).toHaveLength(1);
  expect(restored.supplementLogs).toHaveLength(1);
});

test("closing a live recording releases the microphone and reopening leaves typed send available", async ({
  page,
}) => {
  await voiceFixture(page);
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop and transcribe", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Jarvis", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("Log creatine");
  await expect(page.getByRole("button", { name: "Send message to Jarvis" })).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { voiceProbe: { tracksStopped: number } }).voiceProbe.tracksStopped,
    ),
  ).toBe(1);
});

test("clearing a conversation cancels live voice without losing a typed draft", async ({
  page,
}) => {
  await voiceFixture(page);
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("How many calories have I eaten today?");
  await input.press("Control+Enter");
  await expect(page.getByText("There are no meals logged today.", { exact: true })).toBeVisible();
  await input.fill("Keep this draft");
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop and transcribe", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear conversation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record voice", exact: true })).toBeVisible();
  await expect(input).toHaveValue("Keep this draft");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { voiceProbe: { tracksStopped: number } }).voiceProbe.tracksStopped,
    ),
  ).toBe(1);
});

test("voice origin survives a typed clarification before a mixed save", async ({ page }) => {
  await voiceFixture(page);
  await page.route("**/_serverFn/**", async (route) =>
    route.fulfill({
      json: {
        result: {
          ok: true,
          text: "I slept seven hours; log creatine",
          model: "whisper-large-v3-turbo",
          audioSeconds: 2,
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await page.getByRole("button", { name: "Stop and transcribe", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await expect(input).toHaveValue("I slept seven hours; log creatine");
  await input.press("Control+Enter");
  await expect(page.getByText(/Part 1 needs clarification/)).toBeVisible();
  await input.fill("quality 7");
  await input.press("Control+Enter");
  await page.getByRole("button", { name: "Save selected entries", exact: true }).click();
  await expect(page.getByText("Saved 2 reviewed entries.", { exact: true })).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(
    saved.jarvisAudit
      .filter((entry) => entry.status === "logged")
      .every((entry) => entry.patch?.inputMethod === "voice"),
  ).toBe(true);
});
