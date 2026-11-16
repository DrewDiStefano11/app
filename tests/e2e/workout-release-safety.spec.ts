import { expect, test, type Page } from "@playwright/test";
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

test("a workout resumes after reload and saves the same set and notes to history", async ({ page }) => {
  await startWorkout(page);
  const before = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(before?.exercises[0]?.sets[0]).toMatchObject({ weight: 135, reps: 8, completed: true });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await expect(page.getByPlaceholder("lb", { exact: true }).first()).toHaveValue("135");
  expect((await readPersistedFitCoreState(page)).activeWorkout).toEqual(before);

  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByPlaceholder("How did it feel? Pain, energy, sleep…").fill("Controlled tempo.");
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

test("a rejected finish preserves the workout and notes, then retries exactly once", async ({ page }) => {
  await startWorkout(page);
  const before = (await readPersistedFitCoreState(page)).activeWorkout;
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  const notes = page.getByPlaceholder("How did it feel? Pain, energy, sleep…");
  await notes.fill("Controlled tempo.");

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

  const confirm = page.getByRole("button", { name: "Confirm & save", exact: true });
  await confirm.click();
  await expect(notes).toHaveValue("Controlled tempo.");
  await expect(page.getByRole("alert")).toContainText("Workout could not be saved");
  const rejected = await readPersistedFitCoreState(page);
  expect(rejected.activeWorkout).toEqual(before);
  expect(rejected.workouts).toHaveLength(0);

  await page.evaluate(() => window.dispatchEvent(new Event("fitcore-test-restore-storage")));
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
