import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
  expectDashboardReady,
} from "./helpers/fitcore-test-state";

test("a Jarvis set finishes into one canonical workout and answers from saved history after relaunch", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "integrated-workout",
        name: "Integrated bench",
        startedAt: Date.now() - 120_000,
        exercises: [
          {
            id: "bench-row",
            exerciseId: "bench-press",
            completed: false,
            sets: [{ id: "stable-set", completed: false }],
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Open Jarvis" }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("I benched 185 pounds for 8 reps");
  await input.press("Enter");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Logged Barbell Bench Press: 185 lb for 8 reps", { exact: true }),
  ).toBeVisible();
  await page.locator(".sheet-header").filter({ hasText: "Jarvis" }).getByRole("button").click();
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await page.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await page.reload();
  await expectDashboardReady(page);
  const state = await readPersistedFitCoreState(page);
  expect(state.activeWorkout).toBeNull();
  expect(state.workouts).toHaveLength(1);
  expect(state.workouts[0]).toMatchObject({
    id: "integrated-workout",
    exercises: [{ sets: [{ id: "stable-set", weight: 185, reps: 8, completed: true }] }],
  });
  expect(state.prs.filter((record) => record.exerciseId === "bench-press")).toHaveLength(1);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore:open-jarvis")));
  await input.fill("What did I bench last time?");
  await input.press("Enter");
  await expect(page.getByText(/185 lb × 8/)).toBeVisible();
});
