import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
}

test("the weekly plan keeps existing history and reopens its workout with actuals and targets", async ({
  page,
  context,
}) => {
  const historical = {
    id: "older-workout",
    name: "Existing session",
    startedAt: 1794660000000,
    endedAt: 1794663600000,
    notes: "Keep this.",
    exercises: [],
  };
  const custom = {
    id: "personal-exercise",
    name: "Personal movement",
    equipment: "cable",
    category: "isolation" as const,
    primary: ["back"],
    isCustom: true as const,
    createdAt: 1794660000000,
  };
  await page.clock.setFixedTime(new Date(2026, 10, 16, 12));
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      workouts: [historical],
      customExercises: [custom],
    }),
  );
  await openTraining(page);

  await expect(
    page.getByRole("heading", { name: "6-Day Upper/Lower Split — Bench Strength" }),
  ).toBeVisible();
  await expect(page.getByText("4 × 4 at 195 lb", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start Upper A", exact: true }).click();
  await expect(page.getByText("Target 4 × 4 at 195 lb")).toBeVisible();
  await expect(page.getByPlaceholder("lb", { exact: true }).first()).toHaveValue("");
  await page.getByPlaceholder("lb", { exact: true }).first().fill("190");
  await page.getByPlaceholder("reps", { exact: true }).first().fill("4");
  const before = await readPersistedFitCoreState(page);
  expect(before.workoutTemplates).toHaveLength(0);
  expect(before.activeWorkout?.exercises[0]).toMatchObject({
    target: { targetWeightLb: 195, reps: "4", sets: 4 },
    sets: [{ weight: 190, reps: 4, completed: true }, {}, {}, {}],
  });
  expect(before.workouts[0]).toMatchObject(historical);
  expect(before.customExercises[0]).toMatchObject(custom);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expect(reopened.getByRole("button", { name: "Finish workout", exact: true })).toBeVisible();
  await expect(reopened.getByText("Target 4 × 4 at 195 lb")).toBeVisible();
  expect((await readPersistedFitCoreState(reopened)).activeWorkout).toEqual(before.activeWorkout);
});

test("manual day selection handles rest, early paused bench, optional work and timed sets", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 10, 22, 12));
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await openTraining(page);
  await expect(page.getByRole("heading", { name: "Rest Day" })).toBeVisible();
  await expect(page.getByText("Optional light walking and mobility")).toBeVisible();
  await page.getByLabel("Program day").selectOption({ label: "Wednesday" });
  await expect(page.getByText("3 × 3 at 155 lb · Starts Week 3")).toBeVisible();
  await page.getByLabel("Program day").selectOption({ label: "Friday" });
  await expect(page.getByText("2 × 12 · Optional", { exact: true })).toBeVisible();
  await page.getByLabel("Program day").selectOption({ label: "Thursday" });
  await expect(page.getByText("2 × 12 per side", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start Lower B", exact: true }).click();
  await expect(page.getByText("Target 30 min", { exact: true })).toBeVisible();
  const duration = page.getByLabel("Actual minutes for set 1");
  await expect(duration).toHaveValue("");
  await duration.fill("29.5");
  await page.reload();
  await expect(page.getByLabel("Actual minutes for set 1")).toHaveValue("29.5");
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  const data = await readPersistedFitCoreState(page);
  expect(data.workouts).toHaveLength(1);
  expect(data.workouts[0].exercises[0]).toMatchObject({
    target: { targetMinutes: 30 },
    sets: [{ durationMin: 29.5, completed: true }],
  });
});

test("a program-day edit is applied once and paused bench needs confirmation after week two", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 11, 2, 12));
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await openTraining(page);
  await expect(page.getByText("3 × 3 at 155 lb · Confirm two comfortable weeks")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Two weeks of Monday and Friday benching felt comfortable" })
    .check();
  await page.getByRole("button", { name: "Edit Upper B" }).click();
  await page.getByLabel("Target reps for Wide-Grip Lat Pulldown").fill("9");
  await page.getByRole("button", { name: "Save template", exact: true }).click();
  await page.reload();
  await openTraining(page);
  await expect(page.getByText("3 × 9", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start Upper B", exact: true }).click();
  const data = await readPersistedFitCoreState(page);
  expect(data.workoutTemplates).toHaveLength(1);
  expect(data.workoutTemplates[0].pausedBenchConfirmed).toBe(true);
  expect(data.activeWorkout?.exercises[0]).toMatchObject({
    exerciseId: "light-paused-bench-press",
    target: { targetWeightLb: 155 },
  });
  expect(data.workouts).toHaveLength(0);
});

test("a bench increase waits for technique confirmation and changes only the next target", async ({
  page,
}) => {
  const startedAt = new Date(2026, 10, 16, 10).getTime();
  await page.clock.setFixedTime(new Date(2026, 10, 23, 12));
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      workouts: [
        {
          id: "synthetic-bench-complete",
          name: "Upper A",
          templateId: "bench-strength-upper-lower-v1-upper-a",
          startedAt,
          endedAt: startedAt + 900_000,
          exercises: [
            {
              id: "logged-bench",
              exerciseId: "bench-press",
              completed: true,
              target: { targetWeightLb: 195, sets: 4, reps: "4" },
              sets: Array.from({ length: 4 }, (_, index) => ({
                id: `bench-set-${index}`,
                weight: 195,
                reps: 4,
                completed: true,
              })),
            },
          ],
        },
      ],
    }),
  );
  await openTraining(page);
  const nextTarget = page.getByLabel("Next bench target in pounds");
  await expect(nextTarget).toHaveValue("200");
  const apply = page.getByRole("button", { name: "Apply target" });
  await expect(apply).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "My technique was controlled and I had about 1–2 reps left" })
    .check();
  await nextTarget.fill("197.5");
  await apply.click();
  await expect(page.getByText("4 × 4 at 197.5 lb", { exact: true })).toBeVisible();
  const persisted = await readPersistedFitCoreState(page);
  expect(persisted.workouts[0].exercises[0].target?.targetWeightLb).toBe(195);
  expect(persisted.workouts[0].exercises[0].sets.every((set) => set.weight === 195)).toBe(true);
  expect(persisted.workoutTemplates[0].reviewedBenchWorkoutId).toBe("synthetic-bench-complete");
});
