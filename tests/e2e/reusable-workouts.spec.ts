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

test("save a completed workout layout and reuse it after reload without copying logged sets", async ({
  page,
}) => {
  await seedMinimalOnboardedState(page);
  await openTraining(page);
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
  await openTraining(page);

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

test("plan and edit a template before logging any workouts", async ({ page }) => {
  await seedMinimalOnboardedState(page);
  await openTraining(page);
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  const create = page.getByRole("button", { name: "New template", exact: true });
  await expect(create).toBeVisible();
  await create.click();
  await page.getByLabel("Template name", { exact: true }).fill("Planned day");
  for (const name of ["Back Squat", "Barbell Bench Press"]) {
    await page.getByRole("button", { name: "Add exercise", exact: true }).click();
    await page.getByPlaceholder("Search exercise or muscle…").fill(name);
    await page.getByRole("button", { name: new RegExp(`^${name} `, "i") }).click();
  }
  await page.getByLabel("Sets for Back Squat").fill("5");
  await page.getByLabel("Target reps for Back Squat").fill("4–6");
  await page.getByLabel("Notes for Back Squat").fill("Pause each rep.");
  await page.getByRole("button", { name: "Move Barbell Bench Press up" }).click();
  await page.getByRole("button", { name: "Save template", exact: true }).click();
  await expect(create).toBeVisible();
  const ordered = (await readPersistedFitCoreState(page)).workoutTemplates[0].plan?.exercises;
  expect(ordered?.map(exercise => exercise.exerciseId)).toEqual(["bench-press", "squat"]);
  await page.getByRole("button", { name: "Edit Planned day", exact: true }).click();
  await page.getByRole("button", { name: "Remove Barbell Bench Press" }).click();
  await page.getByRole("button", { name: "Save template", exact: true }).click();
  await page.reload();
  await openTraining(page);

  const saved = await readPersistedFitCoreState(page);
  expect(saved.workouts).toHaveLength(0);
  expect(saved.workoutTemplates).toHaveLength(1);
  expect(saved.workoutTemplates[0]).toMatchObject({
    name: "Planned day",
    plan: {
      exercises: [{ exerciseId: "squat", sets: 5, reps: "4–6", notes: "Pause each rep." }],
    },
  });
});
