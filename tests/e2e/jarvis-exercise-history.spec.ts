import { expect, test } from "@playwright/test";
import { currentFitCoreState, gotoDashboard, readPersistedFitCoreState, seedRevisionedFitCoreState } from "./helpers/fitcore-test-state";

test("local exercise history selects finished chronology and preserves custom tracking without writes", async ({ page }) => {
  const now = Date.now();
  const state = currentFitCoreState({ onboardingComplete: true });
  state.customExercises = [{ id: "custom-circuit", name: "My Circuit", primary: ["core"], equipment: "bodyweight", category: "cardio", tracking: "time", isCustom: true, createdAt: now - 100000 }];
  const workout = (id: string, age: number, reps: number) => ({ id, name: id, startedAt: now - age - 60000, endedAt: now - age,
    exercises: [{ id: `${id}-row`, exerciseId: "bench-press", completed: true, sets: [{ id: `${id}-set`, weight: 185, reps, completed: true }] }] });
  state.workouts = [workout("Latest recorded", 120000, 8), workout("Older imported", 240000, 3), { id: "circuit", name: "Circuit session", startedAt: now - 120000, endedAt: now - 60000,
    exercises: [{ id: "custom-row", exerciseId: "custom-circuit", completed: true, sets: [{ id: "time", durationMin: 2.5, completed: true }, { id: "bw", reps: 12, completed: true }] }] }];
  await seedRevisionedFitCoreState(page, state);
  await gotoDashboard(page);
  const before = await readPersistedFitCoreState(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page.getByRole("textbox", { name: "Message Jarvis" }).fill("Show my last bench performance");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();
  const replies = page.locator(".jarvis-layout");
  await expect(replies.getByText(/Last Barbell Bench Press: 185 lb × 8/)).toBeVisible();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Show my last My Circuit performance");
  await input.press("Control+Enter");
  await expect(replies.getByText(/Last My Circuit: 2.5 min, 12 reps/)).toBeVisible();
  await expect(replies.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  expect((await readPersistedFitCoreState(page)).workouts).toEqual(before.workouts);
});
