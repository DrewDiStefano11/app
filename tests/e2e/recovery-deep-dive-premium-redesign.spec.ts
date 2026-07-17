import { expect, test, type Page } from "@playwright/test";
import { defaultState } from "../../src/lib/types";
import { FITCORE_DATA_VERSION, seedFitCoreAppState } from "./helpers/fitcore-test-state";

const DAY = 86_400_000;
const HOUR = 3_600_000;

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    ...defaultState,
    version: FITCORE_DATA_VERSION,
    onboardingComplete: true,
    demoMode: false,
    profile: { ...defaultState.profile, name: "Recovery Fixture", sleepGoalH: 8 },
    workouts: [],
    activeWorkout: null,
    sleepEntries: [],
    recoveryCheckIns: [],
    muscleFatigue: {},
    ...overrides,
  };
}

function sleep(id: string, createdAt: number, hours = 8, quality = 8) {
  return { id, createdAt, hours, quality, notes: `Sleep source ${id}` };
}

function check(id: string, createdAt: number, values = [7, 3, 3, 8]) {
  return {
    id,
    createdAt,
    energy: values[0],
    soreness: values[1],
    stress: values[2],
    motivation: values[3],
    notes: `Check-in source ${id}`,
  };
}

function workout(id: string, createdAt: number, weight: number) {
  return {
    id,
    name: `Training ${id}`,
    startedAt: createdAt,
    endedAt: createdAt + HOUR,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "squat",
        completed: true,
        sets: [
          { id: `${id}-set-1`, weight, reps: 5, completed: true, modifier: "normal" },
          { id: `${id}-set-2`, weight, reps: 5, completed: true, modifier: "normal" },
        ],
      },
    ],
  };
}

function richState(now: number) {
  const days = [24, 18, 13, 9, 6, 3, 1, 0];
  return baseState({
    sleepEntries: days.map((daysAgo, index) =>
      sleep(`sleep-${daysAgo}`, now - daysAgo * DAY, 6.7 + index * 0.2, 5 + (index % 5)),
    ),
    recoveryCheckIns: days.map((daysAgo, index) =>
      check(`check-${daysAgo}`, now - daysAgo * DAY - 1_000, [
        5 + (index % 4),
        5 - (index % 3),
        6 - (index % 4),
        6 + (index % 3),
      ]),
    ),
    workouts: [
      workout("recent-a", now - 6 * DAY, 245),
      workout("recent-b", now - 3 * DAY, 225),
      workout("recent-c", now - DAY, 205),
    ],
    muscleFatigue: { quads: "moderate", hamstrings: "fatigued", calves: "fresh" },
  });
}

async function openRecovery(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
}

async function openDeepDive(page: Page, state: Record<string, unknown>) {
  await seedFitCoreAppState(page, state);
  await openRecovery(page);
  await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recovery Deep Dive", exact: true }),
  ).toBeVisible();
}

test.describe("Recovery Deep Dive premium redesign", () => {
  test("renders rich analytical evidence, training context, body fatigue, and honest wearable disclosure", async ({
    page,
  }, testInfo) => {
    const now = Date.now();
    await openDeepDive(page, richState(now));

    await expect(page.getByRole("heading", { name: "High readiness" })).toBeVisible();
    await expect(page.getByText("2 usable contributors", { exact: true })).toBeVisible();
    await expect(
      page.locator(".recovery-deep-hero__score").getByText(/points versus prior period/),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contributor analysis" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recovery trend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sleep analysis" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Check-in analysis" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Body fatigue" })).toBeVisible();
    await expect(page.getByText("3 muscles recorded", { exact: true })).toBeVisible();
    await expect(page.getByText(/association only, not causation/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Wearable recovery is not connected" }),
    ).toBeVisible();
    await expect(page.getByText(/No HRV, resting heart rate, sleep stages/)).toBeVisible();
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("recovery-deep-rich.png"), fullPage: true });
  });

  test("distinguishes empty, sleep-only, check-in-only, and explicit-zero states", async ({
    page,
  }, testInfo) => {
    const now = Date.now();
    await openDeepDive(page, baseState());
    await expect(page.getByLabel("Readiness unavailable")).toBeVisible();
    await expect(page.getByText("No readiness history in this range")).toBeVisible();
    await expect(page.getByRole("article").getByText("Missing", { exact: true })).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath("recovery-deep-empty.png"), fullPage: true });

    await openDeepDive(page, baseState({ sleepEntries: [sleep("sleep-only", now)] }));
    await expect(page.getByText("1 usable contributors", { exact: true })).toBeVisible();
    await expect(page.getByText("Recovery check-in").first()).toBeVisible();
    await expect(
      page
        .getByRole("article")
        .filter({ hasText: "Recovery check-in" })
        .getByText("Missing", { exact: true }),
    ).toBeVisible();

    await openDeepDive(page, baseState({ recoveryCheckIns: [check("check-only", now)] }));
    await expect(page.getByText("1 usable contributors", { exact: true })).toBeVisible();
    await expect(page.getByText("Sleep", { exact: true }).first()).toBeVisible();

    await openDeepDive(
      page,
      baseState({
        sleepEntries: [sleep("zero-sleep", now, 0, 0)],
        recoveryCheckIns: [check("zero-check", now - 1_000, [0, 0, 0, 0])],
      }),
    );
    await expect(page.getByText("0 h · quality 0/10", { exact: true })).toBeVisible();
    await expect(page.getByText(/Energy 0 · soreness 0 · stress 0 · motivation 0/)).toBeVisible();
    await expect(page.getByText("0.0 h", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
  });

  test("exposes stale and invalid records with correction actions and source evidence", async ({
    page,
  }, testInfo) => {
    const now = Date.now();
    await openDeepDive(
      page,
      baseState({
        sleepEntries: [sleep("stale-sleep", now - 72 * HOUR)],
        recoveryCheckIns: [check("stale-check", now - 72 * HOUR)],
      }),
    );
    await expect(page.getByText("Stale", { exact: true })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Update sleep" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("recovery-deep-stale.png"), fullPage: true });

    await openDeepDive(
      page,
      baseState({
        sleepEntries: [sleep("invalid-sleep", now, -2, 14)],
        recoveryCheckIns: [check("invalid-check", now - 1_000, [12, -1, 14, 20])],
      }),
    );
    await expect(page.getByText("Invalid", { exact: true })).toHaveCount(2);
    await expect(page.getByLabel("Unavailable, low confidence")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open source record" })).toHaveCount(2);
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
    await page.getByRole("button", { name: "Open source record" }).first().click();
    await expect(page.getByRole("heading", { name: /-2 hours/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: testInfo.outputPath("recovery-deep-invalid.png"),
      fullPage: true,
    });
  });

  test("switches ranges and metrics, selects exact points by keyboard, and exposes the data table", async ({
    page,
  }, testInfo) => {
    const now = Date.now();
    await openDeepDive(page, richState(now));

    const range = page.getByRole("group", { name: "Recovery date range" });
    await range.getByRole("button", { name: "30D" }).click();
    await expect(range.getByRole("button", { name: "30D" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(/30 days · exact logged dates/)).toBeVisible();

    const sleepMetrics = page.getByRole("group", { name: "Sleep analysis metric" });
    await sleepMetrics.getByRole("button", { name: "Subjective quality" }).click();
    await expect(sleepMetrics.getByRole("button", { name: "Subjective quality" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const checkMetrics = page.getByRole("group", { name: "Recovery check-in metric" });
    await checkMetrics.getByRole("button", { name: "Stress" }).click();
    await expect(checkMetrics.getByRole("button", { name: "Stress" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(/Higher means more reported stress/)).toBeVisible();

    const readinessChart = page.getByRole("img", { name: /Readiness by logged date/ });
    await readinessChart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Selected date", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous date" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Show readiness data table" }).click();
    const table = page.getByRole("table", {
      name: "Underlying readiness records for the selected range",
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "State" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("recovery-deep-table-selected.png"),
      fullPage: true,
    });
  });

  test("drills into exact source records and preserves local analytical context across Daily navigation", async ({
    page,
  }) => {
    const now = Date.now();
    await openDeepDive(page, richState(now));
    const range = page.getByRole("group", { name: "Recovery date range" });
    await range.getByRole("button", { name: "30D" }).click();
    await page
      .getByRole("group", { name: "Sleep analysis metric" })
      .getByRole("button", { name: "Subjective quality" })
      .click();
    await page
      .getByRole("group", { name: "Recovery check-in metric" })
      .getByRole("button", { name: "Soreness" })
      .click();

    await page.getByRole("button", { name: "Open source record" }).first().click();
    await expect(page.getByRole("heading", { name: /hours · quality/ })).toBeVisible();
    await expect(page.getByText(/Sleep source sleep-0/)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Daily View", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(range.getByRole("button", { name: "30D" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page
        .getByRole("group", { name: "Sleep analysis metric" })
        .getByRole("button", { name: "Subjective quality" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page
        .getByRole("group", { name: "Recovery check-in metric" })
        .getByRole("button", { name: "Soreness" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("shows honest missing dates and insufficient training comparison", async ({ page }) => {
    const now = Date.now();
    await openDeepDive(
      page,
      baseState({
        sleepEntries: [sleep("one-sleep", now - DAY)],
        recoveryCheckIns: [check("one-check", now - DAY - 1_000)],
      }),
    );
    await expect(
      page.locator(".recovery-quality-timeline").getByText("Missing", { exact: true }),
    ).toHaveCount(13);
    await expect(page.getByText(/not enough aligned training and recovery data/)).toBeVisible();
    await expect(
      page.getByText(/No dates contain both a readiness estimate and a workout/),
    ).toBeVisible();
  });

  test("honors reduced motion, hydration identity, reload persistence, and responsive no-overflow", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const state = richState(Date.now());
    const requestId = await seedFitCoreAppState(page, state);
    await expect(page.locator('[data-fitcore-hydrated="true"]')).toHaveAttribute(
      "data-fitcore-seed-request",
      requestId,
    );
    await openRecovery(page);
    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery Deep Dive" })).toBeVisible();

    const transitionDuration = await page
      .locator(".recovery-deep-primary")
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(["0s", "0.00001s", "1e-05s"]).toContain(transitionDuration);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.reload();
    await expect(page.locator('[data-fitcore-hydrated="true"]')).toBeVisible();
    await openRecovery(page);
    await expect(page.getByRole("progressbar", { name: /Readiness/ })).toBeVisible();
    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByText("2 usable contributors", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("recovery-deep-responsive.png"),
      fullPage: true,
    });
  });

  test("uses the responsive analytical composition without changing navigation", async ({
    page,
  }) => {
    await openDeepDive(page, richState(Date.now()));
    const columns = await page
      .locator(".recovery-deep-two-column")
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(test.info().project.name === "desktop-chromium" ? 2 : 1);
    const expand = page.getByRole("button", { name: "Expand navigation" });
    if (await expand.isVisible()) await expand.click();
    await expect(page.getByRole("button", { name: "Recover", exact: true })).toBeVisible();
  });
});
