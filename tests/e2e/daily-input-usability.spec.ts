import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });
test("Jarvis expands multiline drafts, preserves focus and keeps controls visible in a short viewport", async ({
  page,
}, info) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, jarvisSettings: { voiceModeEnabled: true } }),
  );
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await expect(input).toHaveJSProperty("tagName", "TEXTAREA");
  const first = (await input.boundingBox())!;
  const long =
    "Please review my meals and training history. ".repeat(16) +
    "\nInclude today's protein totals.";
  await input.fill(long);
  await expect(input).toBeFocused();
  const expanded = (await input.boundingBox())!;
  expect(expanded.height).toBeGreaterThan(first.height + 20);
  expect(expanded.height).toBeLessThanOrEqual(154);
  await input.press("Shift+Enter");
  await expect(input).toHaveValue(long + "\n");
  await input.press("Enter");
  await expect(input).toHaveValue(long + "\n\n");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await expect(input).toHaveValue(long + "\n\n");
  await page.setViewportSize({ width: 390, height: 480 });
  await input.focus();
  await expect
    .poll(() => input.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(480);
  const geometry = await input.evaluate((element) => ({
    rect: element.getBoundingClientRect().toJSON(),
    fontSize: getComputedStyle(element).fontSize,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  const send = (await page.getByRole("button", { name: "Send message to Jarvis" }).boundingBox())!;
  const mic = (await page
    .getByRole("button", { name: "Record voice", exact: true })
    .boundingBox())!;
  expect(geometry.rect.bottom).toBeLessThanOrEqual(480);
  expect(send.y + send.height).toBeLessThanOrEqual(480);
  expect(mic.y + mic.height).toBeLessThanOrEqual(geometry.rect.y);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(parseFloat(geometry.fontSize)).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: info.outputPath("jarvis-multiline-short.png") });
  // Synthetic keyboard: VisualViewport shrinks while layout viewport stays tall.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 400 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(() => input.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(400);
  await expect(page.locator(".jarvis-suggestions")).toBeHidden();
});

test("Jarvis formats ordinary bold, paragraphs and lists and treats HTML as text", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("fitcore.jarvis.groqApiKey.v1", "synthetic-test-key"),
  );
  await page.route("**/_serverFn/**", (route) =>
    route.fulfill({
      json: {
        result: {
          ok: true,
          content:
            "**Meal review**\n\nYour saved records show:\n- Protein: **120 g**\n- Calories: 1800\n\n1. Review dinner\n2. Keep logging\n\n<script>window.unsafeReply=true</script>",
        },
      },
    }),
  );
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: true } }),
  );
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("Explain my meal pattern");
  await page.getByRole("button", { name: "Send message to Jarvis" }).click();
  await expect(page.locator("strong").filter({ hasText: "Meal review" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Protein:" })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { unsafeReply?: boolean }).unsafeReply),
  ).toBeUndefined();
});

test("workout set editing preserves scroll, field identity and timer with visible finish controls", async ({
  page,
}, info) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "keyboard-workout",
        name: "Keyboard workout",
        startedAt: Date.now() - 30000,
        restEndsAt: Date.now() + 120000,
        exercises: Array.from({ length: 12 }, (_, n) => ({
          id: `row-${n}`,
          exerciseId: n ? "db-bench" : "bench-press",
          completed: false,
          sets: Array.from({ length: 4 }, (_, index) => ({
            id: `set-${n}-${index}`,
            completed: false,
          })),
        })),
      },
    }),
  );
  const rest = (await readPersistedFitCoreState(page)).activeWorkout!.restEndsAt;
  await page.waitForTimeout(550); // The existing entry animation must have settled before geometry assertions.
  const finish = (await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .boundingBox())!;
  expect(finish.y + finish.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const weight = page.locator('input[placeholder="lb"]').first();
  await weight.fill("185");
  await weight.evaluate((element) => Object.assign(element, { fitcoreIdentity: "original-field" }));
  const before = await page.evaluate(() => window.scrollY);
  await weight.press("End");
  await weight.press("Backspace");
  await weight.press("5");
  await expect(weight).toBeFocused();
  expect(
    await weight.evaluate(
      (element) => (element as HTMLInputElement & { fitcoreIdentity?: string }).fitcoreIdentity,
    ),
  ).toBe("original-field");
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(2);
  expect((await readPersistedFitCoreState(page)).activeWorkout!.restEndsAt).toBe(rest);
  await page.setViewportSize({ width: 390, height: 460 });
  await weight.focus();
  const box = (await weight.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(460);
  expect(
    await weight.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: info.outputPath("workout-keyboard-short.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const reps = page.locator('input[placeholder="reps"]').first();
  await reps.fill("8");
  await expect(reps).toBeFocused();
  // Completing weight + reps intentionally starts the normal set-rest interval.
  const afterSetRest = (await readPersistedFitCoreState(page)).activeWorkout!.restEndsAt;
  await page.getByRole("button", { name: "+ Add note", exact: true }).first().click();
  const note = page.getByPlaceholder("Exercise notes…").first();
  await note.fill("Keep shoulders set");
  const noteScroll = await page.evaluate(() => window.scrollY);
  await note.press("End");
  await note.press("!");
  await expect(note).toBeFocused();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - noteScroll)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  const workoutNote = page.getByPlaceholder("How did it feel? Pain, energy, sleep…");
  await workoutNote.fill("Synthetic workout note");
  await page.setViewportSize({ width: 390, height: 460 });
  await workoutNote.focus();
  await expect
    .poll(() => workoutNote.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(460);
  await workoutNote.press("End");
  await workoutNote.press("!");
  await expect(workoutNote).toHaveValue("Synthetic workout note!");
  expect((await readPersistedFitCoreState(page)).activeWorkout!.restEndsAt).toBe(afterSetRest);
});
