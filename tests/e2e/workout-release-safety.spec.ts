import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  await expectDashboardReady(page);
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = navigation.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await navigation.getByRole("button", { name: "Train", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
}

async function startWorkout(page: Page) {
  await seedMinimalOnboardedState(page);
  await openTraining(page);
  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const picker = page.locator(".sheet-surface");
  await picker.getByPlaceholder("Search exercise or muscle…").fill("Back Squat");
  await picker.getByRole("button", { name: /^Back Squat/i }).click();
  await page.getByPlaceholder("lb", { exact: true }).first().fill("135");
  await page.getByPlaceholder("reps", { exact: true }).first().fill("8");
}

async function rejectStorageWrites(page: Page) {
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Test storage is full", "QuotaExceededError");
    };
    window.addEventListener(
      "fitcore-test-restore-storage",
      () => { Storage.prototype.setItem = write; },
      { once: true },
    );
  });
  return () => page.evaluate(() => window.dispatchEvent(new Event("fitcore-test-restore-storage")));
}

async function recordStartupOverviews(context: BrowserContext) {
  await context.addInitScript(() => {
    const overviews: string[] = [];
    Object.defineProperty(window, "fitcoreTestOverviews", { value: overviews });
    new MutationObserver(() => {
      if (document.querySelector('.phone-shell[data-section="home"]')) {
        if (!overviews.includes("home")) overviews.push("home");
      }
      const training = [...document.querySelectorAll(".phone-shell h1")].some(
        (heading) => heading.textContent?.trim() === "Training",
      );
      if (training && !overviews.includes("training")) overviews.push("training");
    }).observe(document, { childList: true, subtree: true });
  });
}

test("reload and relaunch open the saved workout directly without an overview flash", async ({
  page,
  context,
}) => {
  await startWorkout(page);
  await page.getByRole("button", { name: "+ Add note", exact: true }).click();
  await page.getByPlaceholder("Exercise notes…").fill("Pause at the bottom.");
  const before = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(before?.exercises[0]).toMatchObject({
    notes: "Pause at the bottom.",
    sets: [{ weight: 135, reps: 8 }, {}, {}, {}],
  });
  await recordStartupOverviews(context);

  const expectDirectRecovery = async (view: Page) => {
    await expect(view.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
    await expect(view.getByPlaceholder("lb", { exact: true }).first()).toHaveValue("135");
    await expect(view.getByPlaceholder("reps", { exact: true }).first()).toHaveValue("8");
    await expect(view.getByRole("button", { name: "Pause at the bottom.", exact: true })).toBeVisible();
    expect((await readPersistedFitCoreState(view)).activeWorkout).toEqual(before);
    expect(await view.evaluate(() =>
      (window as Window & { fitcoreTestOverviews: string[] }).fitcoreTestOverviews,
    )).toEqual([]);
  };

  await page.reload();
  await expectDirectRecovery(page);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expectDirectRecovery(reopened);
});

test("reload and relaunch return to Home when no workout is in progress", async ({
  page,
  context,
}) => {
  await seedMinimalOnboardedState(page);
  await page.reload();
  await expectDashboardReady(page);
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toHaveCount(0);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expectDashboardReady(reopened);
  await expect(reopened.getByRole("button", { name: "Finish workout", exact: true })).toHaveCount(0);
  expect((await readPersistedFitCoreState(reopened)).activeWorkout).toBeNull();
});

test("a workout resumes after reload and saves the same set and notes to history", async ({ page }) => {
  await startWorkout(page);
  const before = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(before?.exercises[0]?.sets[0]).toMatchObject({ weight: 135, reps: 8, completed: true });

  await page.reload();
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  const notes = page.getByPlaceholder("How did it feel? Pain, energy, sleep…");
  await notes.fill("Controlled tempo.");
  await page.getByRole("button", { name: "Back to edit", exact: true }).click();
  await page.getByRole("button", { name: "Back to Training", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  const withNotes = { ...before, notes: "Controlled tempo." };
  expect((await readPersistedFitCoreState(page)).activeWorkout).toEqual(withNotes);
  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await expect(page.getByPlaceholder("lb", { exact: true }).first()).toHaveValue("135");
  expect((await readPersistedFitCoreState(page)).activeWorkout).toEqual(withNotes);

  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await expect(notes).toHaveValue("Controlled tempo.");
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

  await page.getByText("Workout", { exact: true }).click();
  const history = page.locator(".sheet-surface").filter({ hasText: "Workout history" });
  await history.getByText("Workout", { exact: true }).click();
  await expect(page.getByText("Set 1: 135lb × 8 ✓", { exact: true })).toBeVisible();
  await expect(page.getByText("Controlled tempo.", { exact: true })).toBeVisible();

  await page.reload();
  await expectDashboardReady(page);
  const saved = await readPersistedFitCoreState(page);
  expect(saved.activeWorkout).toBeNull();
  expect(saved.workouts).toHaveLength(1);
  expect(saved.workouts[0]).toMatchObject({
    id: before?.id,
    notes: "Controlled tempo.",
    exercises: [{ sets: before?.exercises[0].sets }],
  });
});

test("first use saves a training goal and exposes install assets without an AI account", async ({
  page,
  request,
}) => {
  const root = await page.goto("/");
  expect(root?.ok()).toBe(true);
  await expect(page).toHaveTitle(/FitCore/);
  await expect(page.getByRole("heading", { name: "FitCore", exact: true })).toBeVisible();
  const manifestResponse = await request.get("/manifest.json");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ name: "FitCore", start_url: "/", display: "standalone" });
  for (const path of ["/apple-touch-icon.png", "/icon-192.png", "/icon-512.png"]) {
    const icon = await request.get(path);
    expect(icon.ok()).toBe(true);
    expect(icon.headers()["content-type"]).toMatch(/^image\/png/);
  }
  expect((await request.get("/sw.js")).ok()).toBe(true);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(sitemap.headers()["content-type"]).toMatch(/xml/);

  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await page.getByRole("combobox").selectOption("strength");
  const next = page.getByRole("button", { name: "Continue", exact: true });
  for (const heading of [
    "Training experience?",
    "Training schedule",
    "Your bodyweight",
    "Macro targets",
    "You're all set",
  ]) {
    await next.click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Enter FitCore", exact: true }).click();
  await openTraining(page);
  expect((await readPersistedFitCoreState(page)).profile.goal).toBe("strength");
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize()!.width);
});

async function exportSavedWorkout(page: Page) {
  const button = page.getByRole("button", { name: "Export saved data", exact: true });
  await expect(button).toBeVisible();
  const download = page.waitForEvent("download");
  await button.click();
  const file = await download;
  return JSON.parse(await readFile(await file.path(), "utf8"));
}

test("a rejected finish preserves the workout and notes, then retries exactly once", async ({ page }) => {
  await startWorkout(page);
  const before = (await readPersistedFitCoreState(page)).activeWorkout;
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  const notes = page.getByPlaceholder("How did it feel? Pain, energy, sleep…");
  await notes.fill("Controlled tempo.");

  const restoreStorage = await rejectStorageWrites(page);

  const confirm = page.getByRole("button", { name: "Confirm & save", exact: true });
  await confirm.click();
  await expect(notes).toHaveValue("Controlled tempo.");
  await expect(page.getByRole("alert")).toContainText("Workout could not be saved");
  const rejected = await readPersistedFitCoreState(page);
  expect(rejected.activeWorkout).toEqual(before);
  expect(rejected.workouts).toHaveLength(0);
  const backup = await exportSavedWorkout(page);
  expect(backup.workouts).toHaveLength(0);
  expect(backup.activeWorkout.id).toBe(before?.id);
  expect(backup.activeWorkout.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
  expect(backup.activeWorkout.notes).toBe(before?.notes);
  await expect(notes).toHaveValue("Controlled tempo.");

  await restoreStorage();
  await confirm.click();
  await expect(confirm).toBeHidden();
  await page.reload();
  await expectDashboardReady(page);
  const saved = await readPersistedFitCoreState(page);
  expect(saved.activeWorkout).toBeNull();
  expect(saved.workouts).toHaveLength(1);
  expect(saved.workouts[0]).toMatchObject({
    id: before?.id,
    notes: "Controlled tempo.",
    exercises: [{ sets: before?.exercises[0].sets }],
  });
});

test("a rejected set edit must be resolved before finishing the workout", async ({ page }) => {
  await startWorkout(page);
  const restoreStorage = await rejectStorageWrites(page);
  const weight = page.getByPlaceholder("lb", { exact: true }).first();
  await weight.fill("145");
  await expect(page.getByRole("heading", { name: "Workout edit could not be saved" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Back to Training", exact: true })).toBeDisabled();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].sets[0].weight).toBe(135);
  const backup = await exportSavedWorkout(page);
  expect(backup.activeWorkout.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });

  await restoreStorage();
  await page.getByRole("button", { name: "Retry edit", exact: true }).click();
  await expect(weight).toHaveValue("145");

  await page.getByRole("button", { name: "+ Add note", exact: true }).click();
  const restoreNoteStorage = await rejectStorageWrites(page);
  await page.getByPlaceholder("Exercise notes…").fill("Pause at the bottom.");
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeDisabled();
  await restoreNoteStorage();
  await page.getByRole("button", { name: "Retry edit", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].notes).toBe(
    "Pause at the bottom.",
  );

  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByPlaceholder("How did it feel? Pain, energy, sleep…").fill("Discard this draft.");
  await page.getByRole("button", { name: "Back to edit", exact: true }).click();
  const restoreBackStorage = await rejectStorageWrites(page);
  await page.getByRole("button", { name: "Back to Training", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workout edit could not be saved" })).toBeVisible();
  await page.getByRole("button", { name: "Keep saved values", exact: true }).click();
  await restoreBackStorage();
  await page.getByRole("button", { name: "Back to Training", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.notes).toBeUndefined();
  await page.getByRole("button", { name: "Resume workout", exact: true }).click();

  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  const settled = await readPersistedFitCoreState(page);
  expect(settled.workouts).toHaveLength(1);
  expect(settled.workouts[0].exercises[0].notes).toBe("Pause at the bottom.");
  expect(settled.workouts[0].exercises[0].sets[0]).toMatchObject({ weight: 145, reps: 8, completed: true });
});

test("a workout backup restores its notes and completed set in a fresh context", async ({
  page,
  browser,
  baseURL,
}) => {
  await startWorkout(page);
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByPlaceholder("How did it feel? Pain, energy, sleep…").fill("Restored session.");
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  await page.reload();
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const backup = await exported;
  const bytes = await readFile(await backup.path());

  const freshContext = await browser.newContext({ baseURL });
  try {
    const restoredPage = await freshContext.newPage();
    await seedMinimalOnboardedState(restoredPage);
    await expectDashboardReady(restoredPage);
    expect((await readPersistedFitCoreState(restoredPage)).workouts).toHaveLength(0);
    await restoredPage.getByRole("button", { name: "Settings", exact: true }).click();
    await restoredPage.getByRole("tab", { name: "Data", exact: true }).click();
    await restoredPage.getByLabel("Import backup file").setInputFiles({
      name: backup.suggestedFilename(),
      mimeType: "application/json",
      buffer: bytes,
    });
    await expect(restoredPage.getByRole("status")).toContainText("Imported successfully");
    await restoredPage.reload();
    await expectDashboardReady(restoredPage);
    const restored = await readPersistedFitCoreState(restoredPage);
    expect(restored.workouts).toHaveLength(1);
    expect(restored.workouts[0].notes).toBe("Restored session.");
    expect(restored.workouts[0].exercises[0].sets[0]).toMatchObject({
      weight: 135, reps: 8, completed: true,
    });
  } finally {
    await freshContext.close();
  }
});
