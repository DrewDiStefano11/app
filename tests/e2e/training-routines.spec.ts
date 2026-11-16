import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
}

test("a custom weekly routine survives reload and leaves the bench program available", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
  await seedMinimalOnboardedState(page);
  await openTraining(page);
  await page.getByRole("button", { name: "Create custom routine" }).click();
  await page.getByLabel("Routine name").fill("Two-day week");
  await page.getByRole("combobox", { name: "Monday", exact: true }).selectOption("push");
  await page.getByRole("combobox", { name: "Thursday", exact: true }).selectOption("legs");
  await page.getByRole("button", { name: "Save and use routine" }).click();
  await expect(page.getByRole("heading", { name: "Two-day week" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Push Day", exact: true })).toBeVisible();
  await page.reload();
  await openTraining(page);
  await page.clock.setFixedTime(new Date(2026, 10, 17, 12));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("Rest Day", { exact: true })).toBeVisible();
  await page.getByLabel("Routine day").selectOption({ label: "Thursday · Legs Day" });
  await expect(page.getByRole("button", { name: "Start Legs Day", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use Bench Strength program" }).click();
  await expect(
    page.getByRole("heading", { name: "6-Day Upper/Lower Split — Bench Strength" }),
  ).toBeVisible();
  expect(
    (await readPersistedFitCoreState(page)).personalization.trainingRoutine?.days,
  ).toHaveLength(2);
});

test("a flexible rotation advances after saving and keeps manual selections available", async ({
  page,
}) => {
  await seedMinimalOnboardedState(page);
  await openTraining(page);
  await page.getByRole("button", { name: "Create custom routine" }).click();
  await page.getByLabel("Routine name").fill("A–B");
  await page.getByLabel("Schedule type").selectOption("rotation");
  await page.getByRole("combobox", { name: "Day 1", exact: true }).selectOption("push");
  await page.getByRole("button", { name: "Add training day" }).click();
  await page.getByRole("combobox", { name: "Day 2", exact: true }).selectOption("pull");
  await page.getByRole("button", { name: "Save and use routine" }).click();
  await page.getByRole("button", { name: "Start Push Day", exact: true }).click();
  await page.getByRole("button", { name: "Discard workout", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Start Push Day", exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).workouts).toHaveLength(0);
  await page.getByRole("button", { name: "Start Push Day", exact: true }).click();
  const activeBefore = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(activeBefore?.routineDayId).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.id).toBe(activeBefore?.id);
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Pull Day", exact: true })).toBeVisible();
  await page.getByLabel("Routine day").selectOption({ label: "Day 1 · Push Day" });
  await expect(page.getByRole("button", { name: "Start Push Day", exact: true })).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.workouts[0].routineDayId).toBe(activeBefore?.routineDayId);
});
