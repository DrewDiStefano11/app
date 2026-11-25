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


test("custom routine session counts follow recorded links and periods without inventing adherence", async ({ page }) => {
  const linked = { ...session("assigned", 1, 100), routineId: "retired-routine", routineDayId: "upper" };
  const prior = { ...session("prior-assigned", 8, 100), routineId: "another-routine", routineDayId: "lower" };
  const older = { ...session("older-assigned", 20, 100), routineId: "retired-routine", routineDayId: "upper" };
  const workouts = [linked, session("without-routine", 2, 100), prior, older];
  const region = await open(page, workouts);
  const before = (await readPersistedFitCoreState(page)).workouts;
  await expect(region.getByLabel("Custom routine weighted sessions", { exact: true })).toHaveText("1");
  await expect(region.getByLabel("Weighted sessions without a recorded routine", { exact: true })).toHaveText("1");
  await expect(region.getByText("1 in the preceding 7 days", { exact: true })).toBeVisible();
  await expect(region.getByText(/Historical program adherence is unavailable/)).toBeVisible();
  await region.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(region.getByLabel("Custom routine weighted sessions", { exact: true })).toHaveText("3");
  await expect(region.getByLabel("Weighted sessions without a recorded routine", { exact: true })).toHaveText("1");
  await expect(region.getByText("0 in the preceding 30 days", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).workouts).toEqual(before);
});
