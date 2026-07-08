import { test, expect, Page } from "@playwright/test";

const FATAL_TEXTS = [
  "This page didn't load",
  "Application error",
  "Unhandled Runtime Error",
  "createServerFn(...).validator is not a function",
  "TypeError: createServerFn",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
];

async function checkFatalTexts(page: Page) {
  const bodyText = await page.evaluate(() => document.body.textContent || "");
  for (const text of FATAL_TEXTS) {
    if (bodyText.includes(text)) {
      throw new Error(`Fatal error text found on page: "${text}"`);
    }
  }
}

test.describe("Progress Rich Data Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("should render Progress/Stats safely with rich data and handle navigation/reloads", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    await page.evaluate(
      ({ timestamp, oneDayInMs }) => {
        localStorage.setItem(
          "fitcore.v1",
          JSON.stringify({
            version: 1, // trigger migration intentionally
            onboardingComplete: true,
            profile: {
              name: "Smoke Test",
              goal: "hypertrophy",
              experience: "intermediate",
              daysPerWeek: 5,
              split: "Push / Pull / Legs",
              bodyweightLb: 180,
              targetBodyweightLb: 185,
              units: "lb",
            },
            personalization: { units: { weight: "kg" } }, // trigger migration
            goals: [
              {
                id: "g1",
                type: "weekly_workouts",
                label: "Train 5x per week",
                target: 5,
                current: 1,
              },
            ],
            bodyweightEntries: [
              {
                id: "bw1",
                weightLb: 178,
                date: timestamp - oneDayInMs * 2,
                createdAt: timestamp - oneDayInMs * 2,
              },
              {
                id: "bw2",
                weightLb: 180,
                date: timestamp - oneDayInMs,
                createdAt: timestamp - oneDayInMs,
              },
            ],
            workouts: [
              {
                id: "w1",
                name: "Push Day",
                startedAt: timestamp - oneDayInMs,
                endedAt: timestamp - oneDayInMs + 3600000,
                exercises: [],
              },
            ],
            mealEntries: [
              {
                id: "m1",
                name: "Chicken & Rice",
                mealType: "lunch",
                timestamp: timestamp - oneDayInMs,
                calories: 600,
                protein: 50,
                carbs: 70,
                fat: 15,
                createdAt: timestamp - oneDayInMs,
              },
            ],
            recoveryCheckIns: [
              {
                id: "rc1",
                date: timestamp - oneDayInMs,
                sleepHours: 8,
                sleepQuality: 4,
                energy: 4,
                soreness: 2,
                stress: 3,
                createdAt: timestamp - oneDayInMs,
              },
            ],
            supplementLogs: [],
            jarvisAudit: [],
            recoverySignals: [],
            dismissedSuggestions: [],
            activeWorkout: null,
          }),
        );
      },
      { timestamp: now, oneDayInMs },
    );

    await page.reload();

    // Initial Dashboard sanity check
    await expect(
      page
        .getByText("FitCore Today", { exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible({ timeout: 10000 });
    await checkFatalTexts(page);

    // Scenario A: Progress/Stats renders with rich data
    await page.getByRole("button", { name: "Stats", exact: true }).click();
    await expect(
      page
        .getByRole("heading", { name: "Progress", exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();
    await checkFatalTexts(page);
    expect(pageErrors.length).toBe(0);

    // Scenario B: Main Progress areas render safely
    const bodyText = await page.evaluate(() => document.body.textContent || "");
    // Progress views might include text related to Body, Train, Fuel, Recover
    expect(bodyText.length).toBeGreaterThan(0);
    // At least ensure there's some content so we are not on a blank shell
    expect(bodyText).toContain("Body");
    expect(bodyText).toContain("Train");

    await checkFatalTexts(page);

    // Scenario C: Chart/card interaction smoke
    const bodyTab = page.getByRole("tab", { name: "Body", exact: true });
    if (await bodyTab.isVisible()) {
      await bodyTab.click();
      await checkFatalTexts(page);
    }

    // Scenario D: Reload stability
    await page.reload();
    await expect(
      page
        .getByRole("heading", { name: "Progress", exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();
    await checkFatalTexts(page);

    // We don't care exactly how many there are as long as some of the rich data survived
    // and the view rendered safely, but let's assert they aren't all empty.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem("fitcore.v1") || "{}");
          return {
            hasWorkouts: state.workouts?.length > 0,
            hasWeights: state.bodyweightEntries?.length > 0,
          };
        }),
      )
      .toEqual({ hasWorkouts: true, hasWeights: true });
    await checkFatalTexts(page);

    // Scenario E: Cross-tab safety after Progress
    // We may need to expand navigation on mobile
    const expandNav = page.getByRole("button", { name: /Expand navigation/i });
    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(
      page
        .getByText("FitCore Today", { exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();
    await checkFatalTexts(page);

    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Train", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
    await checkFatalTexts(page);

    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Fuel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nutrition" })).toBeVisible();
    await checkFatalTexts(page);

    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Recover", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recovery" })).toBeVisible();
    await checkFatalTexts(page);

    if (await expandNav.isVisible()) {
      await expandNav.click();
    }
    await page.getByRole("button", { name: "Stats", exact: true }).click();
    await expect(
      page
        .getByRole("heading", { name: "Progress", exact: true })
        .or(page.getByText("FitCore Score", { exact: true })),
    ).toBeVisible();
    await checkFatalTexts(page);

    expect(pageErrors.length).toBe(0);
  });
});
