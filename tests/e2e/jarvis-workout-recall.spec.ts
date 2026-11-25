import { expect, test } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test("last workout questions use finished chronology instead of import order without provider calls or writes", async ({ page }) => {
  const now = Date.now();
  const workout = (id: string, age: number) => ({ id, name: `Push ${id}`, startedAt: now - age - 60000, endedAt: now - age,
    exercises: [{ id: `${id}-row`, exerciseId: "bench-press", completed: true, sets: [{ id: `${id}-set`, weight: 185, reps: 8, completed: true }] }] });
  const newest = workout("newest", 60000); newest.startedAt -= 1000000;
  const originals = [newest, workout("older", 120000), workout("future", -120000)];
  let calls = 0;
  await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, workouts: originals, jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  const send = async (text: string) => {
    await page.getByRole("textbox", { name: "Jarvis message" }).fill(text);
    await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  };
  const replies = page.locator(".jarvis-layout");
  await send("What was my last push workout?");
  await expect(replies.getByText(/Last completed push workout: Push newest/)).toBeVisible();
  await send("Show my last pull workout");
  await expect(replies.getByText("No confirmed completed pull workout found.", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).workouts).toMatchObject(originals);
  await expect(replies.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});
