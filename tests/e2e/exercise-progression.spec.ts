import { expect, test } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";
import type { Workout } from "../../src/lib/types";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
function historical(id: string, days: number, weight: number): Workout {
  const date = new Date(); date.setDate(date.getDate() - days);
  return { id, name: id, startedAt: date.getTime(), endedAt: date.getTime() + 3600000, exercises: [{ id: `row-${id}`, exerciseId: "bench-press", completed: true, target: { sets: 3, reps: "8-12" }, sets: [
    { id: `${id}-warmup`, weight: 45, reps: 20, completed: true, modifier: "warmup" },
    ...Array.from({ length: 3 }, (_, i) => ({ id: `${id}-${i}`, weight, reps: 12, completed: true })),
  ] }] };
}
function fixture(active = true) {
  return currentFitCoreState({ onboardingComplete: true, workouts: [historical("recent", 1, 180), historical("older", 5, 100)],
    ...(active && { activeWorkout: { id: "active", name: "Progression session", startedAt: Date.now(), exercises: [{ id: "bench", exerciseId: "bench-press", completed: false, sets: Array.from({ length: 3 }, (_, i) => ({ id: `new-${i}`, completed: false })) }] } }),
    jarvisSettings: { allowCloudText: false },
  });
}

test("active workout uses chronological working sets, saves an explicit session target, and reports its status", async ({ page }) => {
  await seedRevisionedFitCoreState(page, fixture());
  await expect(page.getByText("best 180×12", { exact: true })).toBeVisible();
  await page.getByText("Progression and session target", { exact: true }).click();
  await expect(page.getByText(/Optional: try 185 lb/)).toBeVisible();
  await expect(page.getByText(/Save a session target to track completion/)).toBeVisible();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].target).toBeUndefined();
  await page.getByLabel("Progression strategy", { exact: true }).selectOption("strength");
  await page.getByLabel("Progression target sets", { exact: true }).fill("2");
  await page.getByLabel("Progression target load", { exact: true }).fill("180");
  await page.getByRole("button", { name: "Save session target", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].target?.reps).toBe("3-5");
  expect((await readPersistedFitCoreState(page)).workoutTemplates).toHaveLength(0);
  await page.reload();
  await page.getByText("Progression and session target", { exact: true }).click();
  await expect(page.getByLabel("Progression target sets", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Progression target reps", { exact: true })).toHaveValue("3-5");
  await page.getByLabel("Actual weight for set 1 (lb)", { exact: true }).fill("180");
  await page.getByLabel("Actual reps for set 1", { exact: true }).fill("5");
  await expect(page.getByText(/Target partial: 1\/2/)).toBeVisible();
  await page.getByLabel("Actual weight for set 2 (lb)", { exact: true }).fill("180");
  await page.getByLabel("Actual reps for set 2", { exact: true }).fill("5");
  await expect(page.getByText(/Target completed: 2\/2/)).toBeVisible();
  await page.getByLabel("Actual reps for set 1", { exact: true }).fill("2");
  await expect(page.getByText(/Target not met: 1\/2/)).toBeVisible();
  const stored = await readPersistedFitCoreState(page);
  expect(stored.workouts.map(w => w.id)).toEqual(["recent", "older"]);
  expect(stored.workouts[0].exercises[0].sets[1].weight).toBe(180);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("failed target persistence retains the form and retries without changing programs or history", async ({ page }) => {
  await seedRevisionedFitCoreState(page, fixture());
  await page.getByText("Progression and session target", { exact: true }).click();
  await page.getByLabel("Progression target sets", { exact: true }).fill("4");
  await page.getByLabel("Progression target load", { exact: true }).fill("180");
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); };
    window.addEventListener("restore-writes", () => { Storage.prototype.setItem = write; }, { once: true });
  });
  await page.getByRole("button", { name: "Save session target", exact: true }).click();
  await expect(page.getByText("Workout edit could not be saved", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Progression target sets", { exact: true })).toHaveValue("4");
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].target).toBeUndefined();
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await page.getByRole("button", { name: "Retry edit", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].target?.sets).toBe(4);
  const stored = await readPersistedFitCoreState(page);
  expect(stored.workouts).toHaveLength(2); expect(stored.workoutTemplates).toHaveLength(0);
});

test("Jarvis progression is a deterministic read-only answer with no default exercise or AI request", async ({ page }) => {
  let calls = 0;
  await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, fixture(false));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message", exact: true });
  await input.fill("suggest progression for bench");
  await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  await expect(page.getByText(/Optional: try 185 lb/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  const stored = await readPersistedFitCoreState(page);
  expect(stored.workouts).toHaveLength(2); expect(stored.activeWorkout).toBeNull(); expect(calls).toBe(0);
});
