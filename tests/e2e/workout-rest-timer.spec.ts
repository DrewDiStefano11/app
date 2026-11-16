import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("a completed lifting set starts a rest timer that survives relaunch", async ({
  page,
  context,
}) => {
  const startedAt = new Date(2026, 10, 16, 12);
  await page.clock.setFixedTime(startedAt);
  await seedMinimalOnboardedState(page);
  await expectDashboardReady(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Search exercise or muscle…").fill("Back Squat");
  await page.getByRole("button", { name: /^Back Squat/i }).click();

  const timer = page.getByRole("timer", { name: "Rest timer" });
  await page.getByPlaceholder("lb", { exact: true }).first().fill("145");
  await expect(timer).toHaveCount(0);
  await page.getByPlaceholder("reps", { exact: true }).first().fill("6");
  await expect(timer).toHaveText("1:30");
  const original = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(original?.restEndsAt).toBe(startedAt.getTime() + 90_000);

  await page.close();
  const reopened = await context.newPage();
  await reopened.clock.setFixedTime(startedAt.getTime() + 30_000);
  await reopened.goto("/");
  const resumedTimer = reopened.getByRole("timer", { name: "Rest timer" });
  await expect(resumedTimer).toHaveText("1:00");
  const reps = reopened.getByPlaceholder("reps", { exact: true }).first();
  await reps.fill("");
  await reps.fill("7");
  expect((await readPersistedFitCoreState(reopened)).activeWorkout?.restEndsAt).toBe(
    original?.restEndsAt,
  );
  await reopened.getByRole("button", { name: "Stop rest timer" }).click();
  await expect(resumedTimer).toHaveCount(0);
  const remaining = (await readPersistedFitCoreState(reopened)).activeWorkout;
  expect(remaining?.restEndsAt).toBeUndefined();
  expect(remaining?.exercises[0].sets[0]).toMatchObject({ weight: 145, reps: 7, completed: true });

  await reopened.getByRole("button", { name: "Start rest timer" }).click();
  await expect(resumedTimer).toHaveText("1:30");
  await reopened.clock.setFixedTime(startedAt.getTime() + 121_000);
  await expect(reopened.getByText("Rest complete", { exact: true })).toBeVisible();
  await reopened.getByRole("button", { name: "Finish workout", exact: true }).click();
  await reopened.getByRole("button", { name: "Confirm & save", exact: true }).click();
  const saved = await readPersistedFitCoreState(reopened);
  expect(saved.workouts).toHaveLength(1);
  expect(saved.workouts[0].restEndsAt).toBeUndefined();
  expect(saved.workouts[0].restLoggedSetKeys).toBeUndefined();
  expect(saved.activeWorkout).toBeNull();
});

test("imported sets with the same ID use each exercise's prescribed rest", async ({ page }) => {
  const startedAt = new Date(2026, 10, 16, 12).getTime();
  await page.clock.setFixedTime(startedAt);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "fixture-workout",
        name: "Imported session",
        startedAt,
        exercises: ["squat", "bench-press"].map((exerciseId, index) => ({
          id: `fixture-exercise-${index}`,
          exerciseId,
          completed: false,
          sets: [{ id: "imported-set", completed: false }],
          target: { sets: 1, reps: "6", rest: index === 0 ? 120 : 75 },
        })),
      },
    }),
  );

  const timer = page.getByRole("timer", { name: "Rest timer" });
  await page.getByPlaceholder("lb", { exact: true }).fill("145");
  await page.getByPlaceholder("reps", { exact: true }).fill("6");
  await expect(timer).toHaveText("2:00");
  await page.getByRole("button", { name: "Mark exercise complete" }).click();

  await page.clock.setFixedTime(startedAt + 30_000);
  await page.getByPlaceholder("lb", { exact: true }).fill("105");
  await page.getByPlaceholder("reps", { exact: true }).fill("6");
  await expect(timer).toHaveText("1:15");
  const stored = (await readPersistedFitCoreState(page)).activeWorkout;
  expect(stored?.restEndsAt).toBe(startedAt + 105_000);
  expect(stored?.exercises.map((exercise) => exercise.sets[0].weight)).toEqual([145, 105]);
});
