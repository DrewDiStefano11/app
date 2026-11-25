import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";
import type { Workout } from "../../src/lib/types";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
function session(id: string, days: number, weight: number): Workout {
  const date = new Date(); date.setDate(date.getDate() - days);
  return { id, name: id, startedAt: date.getTime() - 3600000, endedAt: date.getTime(), exercises: [{ id: `row-${id}`, exerciseId: "bench-press", completed: true, sets: [{ id: `set-${id}`, weight, reps: 10, completed: true }] }] };
}
async function open(page: Page, workouts: Workout[]) {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, workouts }));
  const expand = page.getByRole("button", { name: "Expand navigation", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByText("Open training analytics", { exact: true }).click();
  const region = page.getByRole("region", { name: "Training period analysis", exact: true });
  await expect(region).toBeVisible(); return region;
}

test("Performance compares 7 and 30 calendar days using actual exercise and muscle volume", async ({ page }) => {
  const workouts = [session("recent", 1, 200), session("recent-two", 2, 100), session("prior", 8, 100)];
  const region = await open(page, workouts);
  await expect(region.getByText(/\+200.0% volume versus the preceding 7 days/)).toBeVisible();
  await expect(region.getByRole("table").getByRole("row", { name: /Barbell Bench Press 3,000 2/ })).toBeVisible();
  await expect(region.getByText("chest: 3,000", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(region.getByRole("button", { name: "30 days", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.getByRole("table").getByRole("row", { name: /Barbell Bench Press 4,000 3/ })).toBeVisible();
  await expect(region.getByText(/Volume comparison unavailable/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Volume trend (14d)", exact: true })).toBeVisible();
  const stored = await readPersistedFitCoreState(page);
  expect(stored.workouts.map(w => w.id)).toEqual(workouts.map(w => w.id));
  expect(stored.workouts[0].exercises[0].sets[0].weight).toBe(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Performance has truthful empty states for missing periods and schedule history", async ({ page }) => {
  const region = await open(page, []);
  await expect(region.getByText(/No eligible weighted working sets in these 7 days/)).toBeVisible();
  await expect(region.getByText(/Historical program adherence is unavailable/)).toBeVisible();
  await region.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(region.getByText(/No eligible weighted working sets in these 30 days/)).toBeVisible();
  await expect(region.getByRole("table")).toHaveCount(0);
  expect(await region.innerText()).not.toMatch(/NaN|Infinity/);
  expect((await readPersistedFitCoreState(page)).workouts).toHaveLength(0);
});
