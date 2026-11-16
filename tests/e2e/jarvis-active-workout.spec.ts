import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("typed bench entry reviews, saves, reloads and undoes a planned row offline", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "upper-a",
        name: "Upper A",
        startedAt: Date.now() - 30_000,
        exercises: [
          {
            id: "bench-row",
            exerciseId: "bench-press",
            completed: false,
            sets: [
              { id: "set-1", completed: false },
              { id: "set-2", completed: false },
            ],
          },
        ],
      },
    }),
  );
  await expect(page.getByRole("heading", { name: "Upper A" })).toBeVisible();
  await page.getByRole("button", { name: "Open Jarvis" }).click();
  const input = page.getByPlaceholder("Talk to Jarvis...");
  await page.context().setOffline(true);
  await input.fill("I just benched 195 for 4 reps.");
  await input.press("Enter");
  await expect(page.getByText("Log Barbell Bench Press: 195 lb for 4 reps")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Logged Barbell Bench Press: 195 lb for 4 reps")).toBeVisible();

  const saved = await readPersistedFitCoreState(page);
  expect(saved.activeWorkout?.exercises[0].sets).toHaveLength(2);
  expect(saved.activeWorkout?.exercises[0].sets[0]).toMatchObject({
    id: "set-1",
    weight: 195,
    reps: 4,
    completed: true,
  });
  expect(saved.workouts).toEqual([]);
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Upper A" })).toBeVisible();
  await page.getByRole("button", { name: "Open Jarvis" }).click();
  await input.fill("Undo that last entry.");
  await input.press("Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Undid: Logged Barbell Bench Press: 195 lb for 4 reps"),
  ).toBeVisible();
});

test("follow-up, correction and cancel preserve the intended set rows", async ({ page }) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "upper-a",
        name: "Upper A",
        startedAt: Date.now() - 30_000,
        exercises: [
          {
            id: "bench-row",
            exerciseId: "bench-press",
            completed: false,
            sets: [
              { id: "set-1", completed: false },
              { id: "set-2", completed: false },
              { id: "set-3", completed: false },
            ],
          },
          { id: "db-row", exerciseId: "db-bench", completed: false, sets: [] },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Open Jarvis" }).click();
  const input = page.getByPlaceholder("Talk to Jarvis...");
  const send = async (text: string) => {
    await input.fill(text);
    await input.press("Enter");
  };
  const save = page.getByRole("button", { name: "Save", exact: true });

  await send("195 for 4");
  await expect(page.getByText("Log Barbell Bench Press: 195 lb for 4 reps")).toBeVisible();
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText("Logged Barbell Bench Press: 195 lb for 4 reps")).toBeVisible();

  await send("I did another set with the same weight.");
  await expect(page.getByText("How many reps at 195 lb?")).toBeVisible();
  await send("5");
  await expect(page.getByText("Log Barbell Bench Press: 195 lb for 5 reps")).toBeVisible();
  await save.click();
  await expect(page.getByText("Logged Barbell Bench Press: 195 lb for 5 reps")).toBeVisible();

  await send("Make that 200 instead of 195.");
  await expect(page.getByText(/Correct Barbell Bench Press, set 2 .*200 lb/)).toBeVisible();
  await save.click();
  await expect(page.getByText(/Corrected Barbell Bench Press, set 2 .*200 lb/)).toBeVisible();

  const prior = await readPersistedFitCoreState(page);
  await send("195 for 4");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await readPersistedFitCoreState(page)).toEqual(prior);
  expect(prior.activeWorkout?.exercises[0].sets).toMatchObject([
    { id: "set-1", completed: true, weight: 195, reps: 4 },
    { id: "set-2", completed: true, weight: 200, reps: 5 },
    { id: "set-3", completed: false },
  ]);
  expect(prior.activeWorkout?.exercises[1].sets).toEqual([]);

  await send("Log a warm-up bench set at 135 lb for 8.");
  await expect(
    page.getByText("Log Barbell Bench Press warm-up set: 135 lb for 8 reps"),
  ).toBeVisible();
  await save.click();
  await send("Log a unilateral set for dumbbell bench at 20 kg for 10.");
  await expect(
    page.getByText("Log Dumbbell Bench Press unilateral set: 44.09 lb for 10 reps"),
  ).toBeVisible();
  await save.click();
  const modified = await readPersistedFitCoreState(page);
  expect(modified.activeWorkout?.exercises[0].sets[2]).toMatchObject({
    id: "set-3",
    completed: false,
  });
  expect(modified.activeWorkout?.exercises[0].sets[3]).toMatchObject({
    completed: true,
    modifier: "warmup",
    weight: 135,
    reps: 8,
  });
  expect(modified.activeWorkout?.exercises[1].sets[0]).toMatchObject({
    completed: true,
    modifier: "unilateral",
    weight: 44.09,
    reps: 10,
  });

  await send("I finished my workout.");
  await expect(page.getByText("Finish and save the active workout")).toBeVisible();
  expect((await readPersistedFitCoreState(page)).workouts).toEqual([]);
  await save.click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).activeWorkout).toBeNull();
  const finished = await readPersistedFitCoreState(page);
  expect(finished.workouts).toHaveLength(1);
  expect(finished.workouts[0].id).toBe("upper-a");
  expect(finished.workouts[0].exercises[0].sets[1]).toMatchObject({
    id: "set-2",
    weight: 200,
    reps: 5,
  });
  expect(finished.prs).toContainEqual(
    expect.objectContaining({ exerciseId: "bench-press", weight: 200, reps: 5 }),
  );
});
