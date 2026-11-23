import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
test("section navigation starts at the heading and editing a field preserves its scroll context", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page
    .getByRole("button", { name: "Exercise library", exact: true })
    .scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await page.evaluate(() => window.scrollBy({ top: -80, behavior: "instant" }));
  // A queued scroll can collapse the navigation between lookup and tap. Use the
  // current expansion control if that happens; do not force a stale click.
  await expect(async () => {
    const expand = page.getByRole("button", { name: /Expand navigation, current section/ });
    if (await expand.isVisible()) await expand.click({ timeout: 1500 });
    await page.getByRole("button", { name: "Fuel", exact: true }).click({ timeout: 1500 });
  }).toPass({ timeout: 10000 });
  const heading = page.getByRole("heading", { name: "Nutrition", exact: true });
  await expect
    .poll(() => heading.evaluate((element) => element.getBoundingClientRect().top))
    .toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(4);
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  await page.getByRole("button", { name: "Custom Entry", exact: true }).click();
  const name = page.getByPlaceholder("e.g. Post-workout protein bowl");
  await name.fill("Synthetic meal");
  const before = await page.evaluate(() => window.scrollY);
  await name.press("End");
  await name.press("!");
  await expect(name).toBeFocused();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(3);
});

test("saved workout activity contains one real set and retains planned rows after relaunch", async ({
  page,
}, info) => {
  const startedAt = Date.now() - 120000;
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      workouts: [
        {
          id: "one-set",
          name: "Synthetic workout",
          startedAt,
          endedAt: Date.now() - 60000,
          exercises: [
            {
              id: "bench",
              exerciseId: "bench-press",
              completed: false,
              sets: [
                { id: "real", weight: 185, reps: 8, completed: true },
                { id: "planned-1", completed: false },
                { id: "planned-2", completed: false },
              ],
            },
            {
              id: "back",
              exerciseId: "db-bench",
              completed: false,
              sets: [{ id: "planned-3", completed: false }],
            },
          ],
        },
      ],
    }),
  );
  await expect(page.getByText("Set logged", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Workout completed", { exact: true })).toHaveCount(1);
  await page.getByText("Recent activity", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("verified-recent-activity.png") });
  await page.reload();
  await expect(page.getByText("Set logged", { exact: true })).toHaveCount(1);
  const state = await readPersistedFitCoreState(page);
  expect(state.workouts[0].exercises[0].sets).toHaveLength(3);
  expect(state.workouts[0].exercises[1].sets).toHaveLength(1);
});

test("Finish counts muscles only for performed exercises", async ({ page }) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      activeWorkout: {
        id: "muscle-summary",
        name: "Synthetic bench",
        startedAt: Date.now() - 60000,
        exercises: [
          {
            id: "bench",
            exerciseId: "bench-press",
            completed: false,
            sets: [{ id: "real", weight: 185, reps: 8, completed: true }],
          },
          {
            id: "back",
            exerciseId: "lat-pulldown",
            completed: false,
            sets: [{ id: "plan", completed: false }],
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Finish workout", exact: true }).click();
  await expect(page.getByText("Muscles", { exact: true }).locator("..")).toHaveText(/Muscles\s*1/);
  expect((await readPersistedFitCoreState(page)).activeWorkout!.exercises).toHaveLength(2);
});
