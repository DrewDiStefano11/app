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
