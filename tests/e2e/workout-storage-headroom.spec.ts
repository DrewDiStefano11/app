import { expect, test } from "@playwright/test";
import { migrateFitCoreDataIfNeeded } from "../../src/lib/fitcore-data";
import {
  currentFitCoreState,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("a large existing workout history leaves room to save and relaunch", async ({ page, context }) => {
  test.setTimeout(90_000);
  const started = Date.now() - 1_002 * 86_400_000;
  const fixtures = Array.from({ length: 1_000 }, (_, index) => ({
    id: `workout-${index}`,
    name: "Synthetic strength session",
    startedAt: started + index * 86_400_000,
    endedAt: started + index * 86_400_000 + 3_600_000,
    notes: `Saved note ${index}`,
    exercises: ["bench-press", "squat", "db-row"].map((exerciseId) => ({
      id: `${index}-${exerciseId}`,
      exerciseId,
      completed: true,
      sets: Array.from({ length: 5 }, (_, setIndex) => ({
        id: `${index}-${exerciseId}-${setIndex}`,
        completed: true,
        weight: 130 + setIndex,
        reps: 6,
      })),
    })),
  }));
  const oldState = migrateFitCoreDataIfNeeded(currentFitCoreState({
    onboardingComplete: true,
    workouts: fixtures,
    activeWorkout: {
      id: "active",
      name: "Synthetic active workout",
      startedAt: Date.now() - 120_000,
      notes: "Keep the active note",
      exercises: [{
        id: "active-squat",
        exerciseId: "squat",
        completed: false,
        sets: [{ id: "active-set", completed: true, weight: 135, reps: 5 }],
      }],
    },
  }));
  await seedRevisionedFitCoreState(page, JSON.parse(JSON.stringify(oldState)));
  const field = page.getByRole("spinbutton").first();
  await expect(field).toHaveValue("135");
  for (const weight of [136, 137, 138]) {
    await field.fill(String(weight));
    await expect.poll(async () => {
      const saved = await readPersistedFitCoreState(page);
      return saved.activeWorkout?.exercises[0].sets[0].weight;
    }, { timeout: 15_000 }).toBe(weight);
  }
  await expect(page.getByText("Workout edit could not be saved")).toBeHidden();
  await page.close();

  const resumed = await context.newPage();
  await resumed.goto("/");
  await expect(resumed.getByRole("spinbutton").first()).toHaveValue("138");
  const saved = await readPersistedFitCoreState(resumed);
  expect(saved.activeWorkout?.notes).toBe("Keep the active note");
  expect(saved.workouts).toHaveLength(1_000);
  expect(saved.workouts[999].notes).toBe("Saved note 999");
  expect(saved.workouts.flatMap((workout) => workout.exercises.flatMap((exercise) => exercise.sets)))
    .toHaveLength(15_000);
});
