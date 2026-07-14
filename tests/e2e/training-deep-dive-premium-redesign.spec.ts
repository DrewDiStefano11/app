import { expect, test, type Page } from "@playwright/test";
import {
  FITCORE_DATA_VERSION,
  gotoDashboard,
  seedFitCoreAppState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

const DAY = 86_400_000;

async function openTraining(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
}

async function openDeepDive(page: Page) {
  await openTraining(page);
  await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Training Deep Dive", exact: true }),
  ).toBeVisible();
}

function richTrainingState(now = Date.now()) {
  const workout = (
    id: string,
    name: string,
    daysAgo: number,
    exerciseId: string,
    sets: { id: string; weight: number; reps: number; completed: boolean }[],
    partial = false,
  ) => ({
    id,
    name,
    startedAt: now - daysAgo * DAY,
    endedAt: partial ? undefined : now - daysAgo * DAY + 3_600_000,
    notes: `${name} notes`,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId,
        completed: !partial,
        notes: "Controlled working sets",
        sets: sets.map((set) => ({ ...set, modifier: "normal" as const })),
      },
    ],
  });
  return {
    version: FITCORE_DATA_VERSION,
    onboardingComplete: true,
    profile: {
      goal: "hypertrophy",
      experience: "intermediate",
      daysPerWeek: 4,
      split: "Upper / Lower",
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: "lb",
    },
    workouts: [
      workout("bench-old", "Upper Strength", 24, "bench-press", [
        { id: "bo-1", weight: 165, reps: 8, completed: true },
        { id: "bo-2", weight: 175, reps: 6, completed: true },
      ]),
      workout("squat-a", "Lower Power", 12, "squat", [
        { id: "sq-1", weight: 245, reps: 6, completed: true },
        { id: "sq-2", weight: 255, reps: 5, completed: true },
      ]),
      workout("bench-new", "Upper Strength", 5, "bench-press", [
        { id: "bn-1", weight: 185, reps: 5, completed: true },
        { id: "bn-2", weight: 175, reps: 8, completed: true },
      ]),
      workout(
        "partial-a",
        "Push Day",
        2,
        "overhead-press",
        [{ id: "pa-1", weight: 95, reps: 8, completed: false }],
        true,
      ),
    ],
    activeWorkout: null,
    workoutTemplates: [],
    cardioEntries: [
      { id: "cardio-old", type: "Bike", minutes: 22, distanceMi: 6.2, createdAt: now - 18 * DAY },
      {
        id: "cardio-new",
        type: "Outdoor Run",
        minutes: 31,
        distanceMi: 3.1,
        createdAt: now - 3 * DAY,
      },
    ],
    sleepEntries: [{ id: "sleep-a", hours: 8, quality: 4, createdAt: now - 8 * 3_600_000 }],
    recoveryCheckIns: [
      {
        id: "check-a",
        energy: 4,
        soreness: 2,
        stress: 2,
        motivation: 5,
        createdAt: now - 5 * 3_600_000,
      },
    ],
    prs: [
      {
        id: "pr-old",
        exerciseId: "bench-press",
        type: "weight" as const,
        value: 205,
        weight: 175,
        reps: 6,
        date: now - 24 * DAY,
      },
      {
        id: "pr-new",
        exerciseId: "bench-press",
        type: "weight" as const,
        value: 216,
        weight: 185,
        reps: 5,
        date: now - 5 * DAY,
      },
    ],
    mealEntries: [],
    bodyweightEntries: [],
    goals: [],
  };
}

test.describe("Training Deep Dive premium redesign", () => {
  test("opens from Daily with range context and returns without resetting Daily", async ({
    page,
  }) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openTraining(page);
    await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training Deep Dive" })).toBeVisible();
    await expect(page.getByText("14 days", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Volume and completed work" })).toBeVisible();
    await page.getByRole("button", { name: "Daily View", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Training analytics charts" })).toBeVisible();
  });

  test("shows honest workload, range changes, partial sessions, and filter reset", async ({
    page,
  }, testInfo) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openDeepDive(page);
    await expect(page.getByText("Primary workload", { exact: true })).toBeVisible();
    await expect(page.getByText("lb", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Missing dates are not converted to zero/i)).toBeVisible();
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByLabel("Completion").selectOption("partial");
    await page.keyboard.press("Escape");
    await expect(
      page.getByLabel("Active training filters").getByText("Partial", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("1 matching workout", { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("workload-filtered.png"), fullPage: true });
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("All training entries", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Filters" }).click();
    await page
      .locator(".sheet-surface")
      .getByRole("combobox", { name: "Date range", exact: true })
      .selectOption("7d");
    await page.keyboard.press("Escape");
    await expect(page.getByText("7 days", { exact: true }).first()).toBeVisible();
  });

  test("uses real exercise history and opens exact set and workout entries", async ({
    page,
  }, testInfo) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openDeepDive(page);
    await page.getByLabel("Exercise").selectOption("bench-press");
    await expect(page.getByRole("heading", { name: /Barbell Bench Press/i })).toBeVisible();
    await expect(page.getByText(/185 lb × 5/i).first()).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /velocity|power|injury risk|form score/i }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: /Upper Strength/i })
      .last()
      .click();
    await expect(page.locator(".sheet-title", { hasText: "Workout detail" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Load" })).toBeVisible();
    await expect(page.getByText("Controlled working sets", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("exercise-workout-detail.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
  });

  test("preserves selected muscle, heatmap mode, and side from Daily", async ({
    page,
  }, testInfo) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openTraining(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Strength", exact: true }).click();
    await page.getByRole("button", { name: /Back, \d+ percent intensity/i }).click();
    await page
      .locator(".sheet-surface")
      .getByRole("button", { name: "Analyze in Deep Dive" })
      .click();
    await expect(page.getByRole("heading", { name: "Training Deep Dive" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Strength", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".sheet-title", { hasText: "Back evidence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No matching muscle evidence" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("muscle-context-empty.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Front", exact: true }).click();
    await expect(page.getByLabel("front body muscle heat map")).toBeVisible();
  });

  test("preserves legitimate PRs, workout history, cardio, and honest empty states", async ({
    page,
  }, testInfo) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openDeepDive(page);
    await expect(page.getByText("+11 vs prior", { exact: true })).toBeVisible();
    const history = page.getByRole("table").filter({ hasText: "Workout" }).first();
    await expect(history.getByText("Upper Strength", { exact: true }).first()).toBeVisible();
    await history
      .getByRole("button", { name: /Open Upper Strength workout detail/i })
      .first()
      .click();
    await expect(page.locator(".sheet-title", { hasText: "Workout detail" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("31 min", { exact: true })).toBeVisible();

    await seedMinimalOnboardedState(page);
    await page.reload();
    await openDeepDive(page);
    await expect(
      page.getByRole("heading", { name: "No personal records in this range" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No cardio logged in this view" }),
    ).toBeVisible();
    await expect(page.getByText(/not a measured zero/i).first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("training-empty-evidence.png"),
      fullPage: true,
    });
  });

  test("supports scoped comparison modes, warnings, table, focus, and session-only controls", async ({
    page,
  }, testInfo) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openDeepDive(page);
    await page.getByRole("button", { name: /Repetitions reps/i }).click();
    await expect(
      page.getByText(/Incompatible raw units exceed the two-axis maximum/i),
    ).toBeVisible();
    for (const metric of ["Workout sessions", "Cardio duration", "Logged soreness"]) {
      await page.getByRole("button", { name: new RegExp(metric, "i") }).click();
    }
    await expect(page.getByText(/Complex comparison/i).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("comparison-warning.png"), fullPage: true });
    const display = page.getByLabel("Display").last();
    await display.selectOption("normalized");
    await expect(display).toHaveValue("normalized");
    await display.selectOption("indexed");
    await expect(display).toHaveValue("indexed");
    await display.selectOption("small_multiples");
    await expect(display).toHaveValue("small_multiples");
    await page.getByRole("button", { name: "Underlying data table" }).click();
    await expect(page.getByRole("table").last()).toBeVisible();
    await page.getByRole("button", { name: "Focus" }).last().click();
    await expect(page.locator(".sheet-title", { hasText: /Training comparison/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("comparison-focus.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(page.getByText("Correlation unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText(/Resets after reload/i)).toBeVisible();
  });

  test("is keyboard accessible, reduced-motion safe, and overflow-free at required widths", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openDeepDive(page);
    for (const width of [320, 360, 390, 430, 480, 1280]) {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `no overflow at ${width}px`,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/training-deep-dive-${width}.png`,
        fullPage: true,
      });
    }
    const chart = page.getByRole("img", { name: /Training workload/i }).first();
    await chart.focus();
    await chart.press("ArrowRight");
    await expect(chart.locator("..").getByText("Selected date", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.locator(".sheet-surface")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sheet-title", { hasText: "Training filters" })).not.toBeVisible();
    const motion = await page
      .locator(".training-deep-section")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(motion).toMatch(/0\.00001s|1e-05s|0s/);
  });

  test("keeps Training Daily, Home views, visualization foundation, and active workout intact", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
    await openTraining(page);
    await expect(page.getByRole("button", { name: "Start today's plan" })).toBeVisible();
    await page.getByRole("button", { name: "Start today's plan" }).click();
    await expect(page.getByRole("button", { name: "Finish workout" })).toBeVisible();
    await page.getByRole("button", { name: "Finish workout" }).click();
    await page.keyboard.press("Escape");
  });
});
