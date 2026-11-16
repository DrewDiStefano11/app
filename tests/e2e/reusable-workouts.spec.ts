import { expect, test } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

test("save a completed workout layout and reuse it after reload without copying logged sets", async ({
  page,
}) => {
  await seedMinimalOnboardedState(page);
  const openTraining = async () => {
    await expectDashboardReady(page);
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    const expand = nav.getByRole("button", { name: "Expand navigation" });
    if (await expand.isVisible()) await expand.click();
    await nav.getByRole("button", { name: "Train", exact: true }).click();
  };
  await openTraining();
  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Search exercise or muscle…").fill("Back Squat");
  await page.getByRole("button", { name: /^Back Squat/i }).click();
  await page.getByPlaceholder("lb", { exact: true }).first().fill("135");
  await page.getByPlaceholder("reps", { exact: true }).first().fill("8");
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: /Save as new template/ }).click();
  await page.getByPlaceholder("Template name").fill("Synthetic lower day");
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  await page.reload();
  await openTraining();

  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.locator(".sheet-surface").filter({ hasText: "Programs & templates" })
    .getByText("Synthetic lower day", { exact: true }).click();
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic lower day", exact: true })).toBeVisible();
  const data = await readPersistedFitCoreState(page);
  expect(data.workouts).toHaveLength(1);
  expect(data.workouts[0].exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
  expect(data.activeWorkout?.exercises[0].exerciseId).toBe("squat");
  expect(data.activeWorkout?.exercises[0].sets).toHaveLength(4);
  expect(data.activeWorkout?.exercises[0].sets.every(set => !set.completed && set.weight == null)).toBe(true);
});
