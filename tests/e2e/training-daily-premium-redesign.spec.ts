import { expect, test, type Page } from "@playwright/test";
import {
  FITCORE_DATA_VERSION,
  gotoDashboard,
  seedFitCoreAppState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
}

function richTrainingState(now = Date.now()) {
  const completedSet = (id: string, weight: number, reps: number) => ({
    id,
    weight,
    reps,
    modifier: "normal" as const,
    completed: true,
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
      {
        id: "workout-a",
        name: "Upper Strength",
        startedAt: now - 6 * 86_400_000,
        endedAt: now - 6 * 86_400_000 + 3_600_000,
        exercises: [
          {
            id: "exercise-a",
            exerciseId: "bench-press",
            completed: true,
            sets: [completedSet("set-a", 185, 5), completedSet("set-b", 175, 7)],
          },
        ],
      },
      {
        id: "workout-b",
        name: "Lower Power",
        startedAt: now - 2 * 86_400_000,
        endedAt: now - 2 * 86_400_000 + 3_000_000,
        exercises: [
          {
            id: "exercise-b",
            exerciseId: "squat",
            completed: true,
            sets: [completedSet("set-c", 255, 5), completedSet("set-d", 245, 6)],
          },
        ],
      },
    ],
    activeWorkout: null,
    workoutTemplates: [],
    cardioEntries: [
      { id: "cardio-a", type: "Bike", minutes: 24, createdAt: now - 86_400_000 },
      { id: "cardio-b", type: "Outdoor Run", minutes: 31, createdAt: now - 4 * 86_400_000 },
    ],
    sleepEntries: [{ id: "sleep-a", hours: 8, quality: 4, createdAt: now - 10 * 3_600_000 }],
    recoveryCheckIns: [
      {
        id: "check-a",
        energy: 4,
        soreness: 2,
        stress: 2,
        motivation: 5,
        createdAt: now - 6 * 3_600_000,
      },
    ],
    prs: [
      {
        id: "pr-a",
        exerciseId: "bench-press",
        type: "1rm",
        value: 216,
        weight: 185,
        reps: 5,
        date: now - 2 * 86_400_000,
      },
    ],
    mealEntries: [],
    bodyweightEntries: [],
    goals: [],
  };
}

test.describe("Training Daily premium redesign", () => {
  test("shows an honest recommended state and keeps all primary paths available", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
    await openTraining(page);

    await expect(page.getByRole("heading", { name: "Push Day" })).toBeVisible();
    await expect(page.getByText("Recommended next workout", { exact: true })).toBeVisible();
    await expect(page.getByText("Needs more data", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("No recent inputs", { exact: true })).toBeVisible();
    await expect(page.getByText("Baseline", { exact: false })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Start today's plan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume workout", exact: true })).toHaveCount(0);
    await page.screenshot({ path: "test-results/training-missing-data.png", fullPage: true });

    for (const name of [
      "Templates",
      "Workout history",
      "Cardio",
      "Custom exercises",
      "Plate calculator",
    ]) {
      await expect(page.getByRole("button", { name: new RegExp(name, "i") }).last()).toBeVisible();
    }

    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Performance" })).toBeVisible();
  });

  test("labels a partial recommendation without inventing missing recovery data", async ({
    page,
  }) => {
    await seedFitCoreAppState(page, { ...richTrainingState(), recoveryCheckIns: [] });
    await page.goto("/");
    await openTraining(page);

    await expect(page.getByText("Partial recommendation", { exact: false })).toBeVisible();
    await expect(page.getByText("Partial data", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1 of 2 recent", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "test-results/training-partial-recommendation.png",
      fullPage: true,
    });
  });

  test("makes the active workout dominant, survives reload, and resumes the real session", async ({
    page,
  }) => {
    await seedFitCoreAppState(page, {
      ...richTrainingState(),
      activeWorkout: {
        id: "active-a",
        name: "Long Active Workout Name That Must Wrap Safely",
        startedAt: Date.now() - 420_000,
        exercises: [
          {
            id: "active-exercise",
            exerciseId: "bench-press",
            completed: false,
            sets: [
              { id: "active-set-a", weight: 185, reps: 5, modifier: "warmup", completed: true },
              { id: "active-set-b", modifier: "normal", completed: false },
            ],
          },
        ],
      },
    });
    await page.goto("/");

    await expect(page.getByText("Workout in progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume workout", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start today's plan/i })).toHaveCount(0);
    await page.screenshot({ path: "test-results/training-active-workout.png", fullPage: true });
    await expect(page.getByRole("progressbar", { name: /workout sets complete/i })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await page.reload();
    await expect(page.getByRole("button", { name: "Resume workout", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume workout", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Long Active Workout Name That Must Wrap Safely" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish workout" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discard workout" })).toBeVisible();
  });

  test("keeps analytics pinning controlled and exposes focus data", async ({ page }) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openTraining(page);

    const stack = page.getByRole("region", { name: "Training analytics charts" });
    await expect(stack).toBeVisible();
    await expect(stack.getByLabel(/Weekly volume, pinned/)).toBeVisible();
    await stack.getByRole("button", { name: "Next chart" }).click();
    await expect(stack).toHaveAttribute("data-active-chart", "frequency");
    await stack.focus();
    await page.screenshot({ path: "test-results/training-keyboard-focus.png", fullPage: true });
    await stack.press("ArrowRight");
    await expect(stack).toHaveAttribute("data-active-chart", "consistency");
    await stack.getByRole("button", { name: "Show Cardio duration" }).click();
    await expect(stack.getByLabel(/Cardio duration, suggested/)).toBeVisible();
    await stack.getByRole("button", { name: "Pin" }).last().click();
    await expect(stack.getByLabel(/Cardio duration, pinned, suggested/)).toBeVisible();
    await page.screenshot({ path: "test-results/training-pinned-suggested.png", fullPage: true });
    await stack.getByRole("button", { name: "Dismiss" }).click();
    await expect(stack.getByLabel(/Cardio duration/)).toHaveCount(0);
    await expect(stack.getByRole("article", { name: /Weekly volume/ })).toBeVisible();

    await stack.getByRole("button", { name: "Show Weekly volume" }).click();
    await stack
      .getByRole("article", { name: /Weekly volume/ })
      .getByRole("button", { name: "Focus & data" })
      .click();
    await expect(
      page.locator(".sheet-title", { hasText: "Training volume · 14 days" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Data table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({
      path: "test-results/training-analytics-focus-data.png",
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.locator(".sheet-title", { hasText: "Training volume · 14 days" }),
    ).not.toBeVisible();
  });

  test("preserves body modes, front/back state, muscle details, weekly progress, PRs, and cardio", async ({
    page,
  }) => {
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openTraining(page);

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByLabel("back body muscle heat map")).toBeVisible();
    await page.getByRole("button", { name: "Strength", exact: true }).click();
    await expect(page.getByRole("button", { name: "Strength", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: /Back, \d+ percent intensity/i }).click();
    await expect(page.locator(".sheet-title", { hasText: "Back" })).toBeVisible();
    await expect(page.getByText("Last Trained", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/training-muscle-detail.png", fullPage: true });
    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("progressbar", { name: /scheduled workouts completed/i }),
    ).toBeVisible();
    await expect(page.getByText("Recent PR", { exact: false })).toBeVisible();
    await expect(page.getByText("55 min this week", { exact: true })).toBeVisible();
    await expect(page.getByText("2 of 4", { exact: false })).toBeVisible();
    await page.screenshot({ path: "test-results/training-weekly-pr-cardio.png", fullPage: true });
  });

  test("keeps exercise addition, reordering, modifiers, notes, plate loading, and completion", async ({
    page,
  }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
    await openTraining(page);
    await page.getByText("Blank workout", { exact: true }).click();

    await page.getByRole("button", { name: "Add" }).click();
    await page
      .locator(".sheet-surface")
      .getByRole("button", { name: /Bench Press/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Exercise", exact: true }).click();
    await page.locator(".sheet-surface").getByRole("button", { name: /Squat/i }).first().click();
    await expect(page.getByRole("button", { name: "Move down" }).first()).toBeEnabled();
    await page.getByRole("button", { name: "Move down" }).first().click();

    await page.getByRole("button", { name: /Barbell Bench Press.*Chest/i }).click();

    await page.getByRole("button", { name: "warmup", exact: true }).first().click();
    await page.getByRole("button", { name: "Set tag", exact: true }).first().click();
    const firstExercise = page
      .locator(".card-elev")
      .filter({ hasText: /Bench Press/i })
      .first();
    await firstExercise.locator('input[type="number"]').nth(0).fill("135");
    await firstExercise.locator('input[type="number"]').nth(1).fill("8");
    await firstExercise.getByText("+ Add note", { exact: true }).click();
    await firstExercise.getByPlaceholder("Exercise notes…").fill("Controlled tempo");
    await expect(firstExercise.getByRole("button", { name: "Plate calculator" })).toBeVisible();
    await firstExercise.getByRole("button", { name: "Plate calculator" }).click();
    await expect(page.locator(".sheet-title", { hasText: "Plate calculator" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(firstExercise.getByPlaceholder("Exercise notes…")).toHaveValue("Controlled tempo");

    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect(page.locator(".sheet-title", { hasText: "Finish workout" })).toBeVisible();
    await page.locator(".sheet-surface").getByRole("button", { name: "Confirm & save" }).click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  });

  test("has no page overflow at required widths and honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedFitCoreAppState(page, richTrainingState());
    await page.goto("/");
    await openTraining(page);

    for (const width of [320, 360, 390, 430, 480, 1280]) {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `no overflow at ${width}px`,
      ).toBe(true);
      await page.screenshot({ path: `test-results/training-daily-${width}.png`, fullPage: true });
    }
    const motion = await page
      .locator(".premium-stack__item")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(motion).toMatch(/0\.00001s|1e-05s|0s/);
  });
});
