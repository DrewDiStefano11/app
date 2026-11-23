import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
const now = new Date(2026, 10, 23, 12).getTime();

async function goals(page: Page, options: { metric?: boolean; target?: number } = {}) {
  await page.clock.install({ time: new Date(now) });
  await page.addInitScript(() =>
    localStorage.setItem(
      "fitcore.ui.home.goals.selected",
      JSON.stringify(["steps", "volume", "sleep", "protein", "calories"]),
    ),
  );
  const at = new Date(now - 3600000).toISOString();
  const base = {
    source: "whoop",
    user_id: "1",
    created_at: at,
    updated_at: at,
    score_state: "SCORED",
    calibrating: false,
  };
  const snapshot = {
    version: "goals:1",
    lastSyncedAt: new Date(now).toISOString(),
    accessExpiresAt: new Date(now + 600000).toISOString(),
    records: [
      { ...base, id: "cycle", kind: "cycle", start: at, step_count: 8234, score: { strain: 8 } },
      {
        ...base,
        id: "sleep",
        kind: "sleep",
        nap: false,
        start: new Date(now - 8 * 3600000).toISOString(),
        end: at,
        score: {
          stage_summary: {
            total_light_sleep_time_milli: 4 * 3600000,
            total_slow_wave_sleep_time_milli: 3600000,
            total_rem_sleep_time_milli: 2 * 3600000,
            total_no_data_time_milli: 0,
          },
        },
      },
    ],
  };
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({ json: { status: "connected", version: "goals:1" } }),
  );
  await page.route("**/api/whoop/records", (route) => route.fulfill({ json: null }));
  await page.route("**/api/whoop/sync", (route) => route.fulfill({ json: snapshot }));
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      profile: {
        stepGoal: 8000,
        ...(options.target === undefined ? {} : { weeklyVolumeGoalLb: options.target }),
      },
      personalization: { units: { weight: options.metric ? "kg" : "lb" } },
      workouts: [
        {
          id: "recorded",
          name: "Recorded",
          startedAt: now - 2 * 3600000,
          endedAt: now - 3600000,
          exercises: [
            {
              id: "exercise",
              exerciseId: "bench-press",
              completed: true,
              sets: [
                { id: "done", completed: true, weight: 100, reps: 10 },
                { id: "planned", completed: false, weight: 999, reps: 99 },
              ],
            },
          ],
        },
      ],
      sleepEntries: [{ id: "manual", createdAt: now - 3600000, hours: 2, quality: 0 }],
      mealEntries: [
        {
          id: "meal",
          name: "Calorie-only",
          type: "lunch",
          createdAt: now,
          calories: 500,
          macroStatus: "unreported",
        },
      ],
    }),
  );
  await expectDashboardReady(page);
  await expect(page.getByRole("group", { name: "Steps goal", exact: true })).toContainText("8,234");
}

async function customize(page: Page) {
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  return page.getByRole("dialog", { name: "Customize Goals", exact: true });
}

test("Goals display measured steps, recorded volume and WHOOP sleep without fabricated progress or persisted health data", async ({
  page,
}) => {
  await goals(page);
  const steps = page.getByRole("group", { name: "Steps goal", exact: true });
  const volume = page.getByRole("group", { name: "Training Volume goal", exact: true });
  await expect(steps).toContainText("8,234 / 8,000 steps");
  await expect(volume).toContainText("1,000 lb × reps");
  await expect(volume).toContainText("No target");
  await expect(volume).not.toContainText("25,000");
  await expect(volume.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Sleep goal", exact: true })).toContainText(
    "7.0 / 8.0 h",
  );
  await expect(page.getByRole("group", { name: "Protein goal", exact: true })).toContainText(
    "Unavailable",
  );
  await expect(page.getByRole("group", { name: "Calories goal", exact: true })).toContainText(
    "500",
  );
  await page.clock.runFor(600001);
  await expect(steps).toContainText("Unavailable");
  await expect(steps.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Sleep goal", exact: true })).toContainText(
    "2.0 / 8.0 h",
  );
  const saved = JSON.stringify(await readPersistedFitCoreState(page));
  expect(saved).not.toContain("step_count");
  expect(saved).not.toContain("stage_summary");
});

test("a user-selected training volume target persists, drives actual progress and clears without inventing a fallback", async ({
  page,
}) => {
  await goals(page);
  const sheet = await customize(page);
  await sheet.getByLabel("7-day training volume target (lb × reps)").fill("4000");
  await sheet.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(sheet.getByRole("status")).toHaveText("Training volume target saved.");
  await sheet.getByRole("button", { name: "Close goal customization", exact: true }).click();
  const volume = page.getByRole("group", { name: "Training Volume goal", exact: true });
  await expect(volume).toContainText("1,000 / 4,000 lb × reps");
  await expect(volume.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  await page.reload();
  await expectDashboardReady(page);
  await expect(volume).toContainText("1,000 / 4,000 lb × reps");
  expect((await readPersistedFitCoreState(page)).profile.weeklyVolumeGoalLb).toBe(4000);
  const reopened = await customize(page);
  await reopened.getByLabel("7-day training volume target (lb × reps)").fill("");
  await reopened.getByRole("button", { name: "Save target", exact: true }).click();
  await reopened.getByRole("button", { name: "Close goal customization", exact: true }).click();
  await expect(volume).toContainText("No target");
  expect((await readPersistedFitCoreState(page)).profile.weeklyVolumeGoalLb).toBeUndefined();
});

test("metric volume targets convert both current and target while storing one canonical pounds value", async ({
  page,
}) => {
  await goals(page, { metric: true });
  const sheet = await customize(page);
  await sheet.getByLabel("7-day training volume target (kg × reps)").fill("1000");
  await sheet.getByRole("button", { name: "Save target", exact: true }).click();
  await sheet.getByRole("button", { name: "Close goal customization", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Training Volume goal", exact: true }),
  ).toContainText("454 / 1,000 kg × reps");
  expect((await readPersistedFitCoreState(page)).profile.weeklyVolumeGoalLb).toBeCloseTo(
    1000 / 0.453592,
    4,
  );
});

test("invalid targets cannot save and a storage failure preserves the draft and prior target", async ({
  page,
}) => {
  await goals(page, { target: 2000 });
  const sheet = await customize(page);
  const input = sheet.getByLabel("7-day training volume target (lb × reps)");
  await input.fill("-2");
  await expect(sheet.getByRole("button", { name: "Save target", exact: true })).toBeDisabled();
  await input.fill("4000");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("fitcore.persistence.v1.slot."))
        throw new DOMException("Synthetic quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await sheet.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(sheet.getByRole("alert")).toContainText("Target could not be saved");
  await expect(input).toHaveValue("4000");
  expect((await readPersistedFitCoreState(page)).profile.weeklyVolumeGoalLb).toBe(2000);
});
