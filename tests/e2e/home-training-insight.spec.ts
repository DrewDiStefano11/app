import { expect, test } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
function fixture(rest = false) {
  const now = Date.now();
  return currentFitCoreState({ onboardingComplete: true,
    workouts: [{ id: "past", name: "Past push", startedAt: now - 86400000, endedAt: now - 82800000, exercises: [{ id: "row", exerciseId: "bench-press", completed: true, sets: Array.from({ length: 3 }, (_, i) => ({ id: `set-${i}`, weight: 180, reps: 12, completed: true })) }] }],
    workoutTemplates: [{ id: "personal-push", name: "Personal push", templateId: "personal-push", plan: { durationMin: 40, exercises: [{ exerciseId: "bench-press", sets: 3, reps: "8-12" }] } }],
    personalization: { trainingRoutine: { enabled: true, id: "routine", name: "My routine", mode: "weekly", days: [{ id: "day", templateId: "personal-push", weekday: (new Date().getDay() + (rest ? 1 : 0)) % 7 }] } },
    jarvisSettings: { allowCloudText: false },
  });
}

test("Home links the assigned workout to recorded performance and optional progression without changing it", async ({ page }) => {
  let calls = 0;
  await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, fixture());
  const insight = page.getByRole("region", { name: "Training insight from your records", exact: true });
  await expect(insight).toBeVisible();
  await expect(insight.getByText(/Barbell Bench Press/)).toBeVisible();
  await expect(insight.getByText(/Last recorded working sets: 180 lb/)).toBeVisible();
  await expect(insight.getByText(/Optional: try 185 lb/)).toBeVisible();
  const before = await readPersistedFitCoreState(page);
  expect(before.activeWorkout).toBeNull();
  expect(before.workoutTemplates[0].plan?.exercises[0]).toMatchObject({ sets: 3, reps: "8-12" });
  // Home's context card must not collide with the main navigation/view names.
  await expect(page.getByRole("button", { name: "Train" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Training" })).toHaveCount(0);
  await insight.getByRole("button", { name: "Review workout", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  const after = await readPersistedFitCoreState(page);
  expect(after.workouts).toEqual(before.workouts);
  expect(after.workoutTemplates).toEqual(before.workoutTemplates);
  expect(after.activeWorkout).toBeNull(); expect(calls).toBe(0);
});

test("an explicit routine rest day does not invent planned progression", async ({ page }) => {
  await seedRevisionedFitCoreState(page, fixture(true));
  await expect(page.getByRole("heading", { name: /Good Morning/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Training insight from your records", exact: true })).toHaveCount(0);
  expect((await readPersistedFitCoreState(page)).activeWorkout).toBeNull();
});
