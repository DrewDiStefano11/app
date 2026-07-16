import { expect, test, type Page } from "@playwright/test";
import { defaultState } from "../../src/lib/types";
import { seedFitCoreAppState } from "./helpers/fitcore-test-state";

const DAY = 86_400_000;

function meal(
  id: string,
  name: string,
  daysAgo: number,
  values: { calories: number; protein: number; carbs: number; fat: number },
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name,
    type: daysAgo % 2 ? "dinner" : "breakfast",
    createdAt: Date.now() - daysAgo * DAY - 2 * 3_600_000,
    ...values,
    ...extra,
  };
}

function nutritionState(overrides: Record<string, unknown> = {}) {
  return {
    ...defaultState,
    onboardingComplete: true,
    demoMode: false,
    profile: { ...defaultState.profile, name: "Drew" },
    nutritionTargets: { calories: 2450, protein: 175, carbs: 285, fat: 78 },
    mealEntries: [],
    supplementLogs: [],
    ...overrides,
  };
}

function richNutritionState() {
  return nutritionState({
    mealEntries: [
      meal(
        "day-20",
        "Historical meal outside the default range",
        20,
        { calories: 1200, protein: 80, carbs: 140, fat: 36 },
        { type: "lunch" },
      ),
      meal(
        "day-4-a",
        "Greek yogurt, berries, toasted oats, almond butter, and chia seeds",
        4,
        { calories: 900, protein: 65, carbs: 110, fat: 22 },
        { type: "breakfast", source: "manual" },
      ),
      meal(
        "day-4-b",
        "Chicken rice bowl",
        4,
        { calories: 900, protein: 70, carbs: 105, fat: 24 },
        {
          type: "lunch",
          source: "imported",
          provenance: { source: "imported", confidence: "high", confirmation: "not-required" },
        },
      ),
      meal(
        "day-2",
        "Exact target day",
        2,
        { calories: 2450, protein: 175, carbs: 285, fat: 78 },
        { type: "dinner", source: "manual" },
      ),
      meal(
        "day-0",
        "Camera estimated post-workout plate",
        0,
        { calories: 2600, protein: 132, carbs: 330, fat: 91 },
        {
          type: "post-workout",
          source: "camera",
          confirmed: false,
          confidence: "medium",
          provenance: { source: "ai-estimated", confidence: "medium", confirmation: "unconfirmed" },
        },
      ),
    ],
    supplementLogs: [
      { id: "creatine", name: "Creatine", dose: "5 g", createdAt: Date.now() - DAY },
      { id: "vitamin-d", name: "Vitamin D", dose: "2,000 IU", createdAt: Date.now() - 3 * DAY },
    ],
  });
}

async function seedState(page: Page, state: Record<string, unknown>) {
  await seedFitCoreAppState(page, state);
  await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
}

async function openFuel(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
}

async function openDeepDive(page: Page, state: Record<string, unknown>) {
  await seedState(page, state);
  await openFuel(page);
  await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nutrition Deep Dive", exact: true }),
  ).toBeVisible();
}

test.describe("Nutrition Deep Dive premium redesign", () => {
  test("opens from the unchanged Daily View and returns without replacing logging", async ({
    page,
  }) => {
    await seedState(page, richNutritionState());
    await openFuel(page);
    await expect(page.getByText(/Exact intake, practical next steps/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Meal", exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nutrition Deep Dive" })).toBeVisible();
    await expect(page.getByText("14 days", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calories and macros" })).toBeVisible();

    await page.getByRole("button", { name: "Daily View", exact: true }).first().click();
    await expect(page.getByText(/Exact intake, practical next steps/)).toBeVisible();
  });

  test("distinguishes empty, insufficient, missing-target, and explicit-zero states", async ({
    page,
  }, testInfo) => {
    await openDeepDive(
      page,
      nutritionState({
        nutritionTargets: { calories: null, protein: null, carbs: null, fat: null },
      }),
    );
    await expect(page.getByText("No nutrition history in this range")).toBeVisible();
    await expect(page.getByText(/Current target: Missing target/).first()).toBeVisible();
    await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("nutrition-deep-dive-empty.png"),
      fullPage: true,
    });

    await openDeepDive(
      page,
      nutritionState({
        nutritionTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealEntries: [
          meal("one-day", "One recorded meal", 0, {
            calories: 700,
            protein: 45,
            carbs: 80,
            fat: 21,
          }),
        ],
      }),
    );
    await expect(page.getByText(/Current target: Explicit 0 target/).first()).toBeVisible();
    await expect(page.getByText(/trend is still partial/i)).toBeVisible();
    await expect(page.getByText("700 kcal", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("nutrition-deep-dive-one-day-zero-target.png"),
      fullPage: true,
    });
  });

  test("shows exact trend, range, target, metric, table, and selected-day values", async ({
    page,
  }, testInfo) => {
    await openDeepDive(page, richNutritionState());
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2600 kcal", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "30D", exact: true }).click();
    await expect(page.getByText("30 days", { exact: true })).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();

    const metricControls = page.getByRole("group", { name: "Nutrition comparison metrics" });
    await metricControls.getByRole("button", { name: "Carbohydrates g", exact: true }).click();
    await expect(
      metricControls.getByRole("button", { name: "Carbohydrates g", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await metricControls.getByRole("button", { name: "Fat g", exact: true }).click();

    const chart = page.getByRole("img", { name: /Logged nutrition by day/ });
    await chart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Selected date", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show underlying data" }).click();
    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader", { name: "Calorie difference" })).toBeVisible();
    await expect(table.getByText("150 kcal", { exact: true })).toBeVisible();
    await expect(table.getByText("0 kcal", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("nutrition-deep-dive-populated-table.png"),
      fullPage: true,
    });
  });

  test("drills into meals and keeps AI, imported, and supplement evidence explicit", async ({
    page,
  }, testInfo) => {
    await openDeepDive(page, richNutritionState());
    await expect(page.getByText("AI estimate", { exact: true })).toBeVisible();
    await expect(page.getByText("Imported", { exact: true })).toBeVisible();
    await expect(page.getByText(/1 unconfirmed AI estimate remains/)).toBeVisible();
    await expect(page.getByText("Creatine", { exact: true })).toBeVisible();
    await expect(page.getByText("Vitamin D", { exact: true })).toBeVisible();
    await expect(page.getByText(/no stored water totals or target/i)).toBeVisible();

    await page.getByRole("button", { name: "Open logged entry" }).click();
    const drilldown = page.getByRole("dialog", { name: /Meals/ });
    await expect(
      drilldown.getByRole("heading", { name: "Camera estimated post-workout plate" }),
    ).toBeVisible();
    await expect(drilldown.getByText("AI estimate · unconfirmed", { exact: true })).toBeVisible();
    await expect(drilldown.getByText("2600 kcal", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("nutrition-deep-dive-day-drilldown.png") });
    await page.keyboard.press("Escape");
    await expect(drilldown).not.toBeVisible();
  });

  test("preserves Log Meal, reload persistence, and deletion Cancel and Confirm", async ({
    page,
  }) => {
    await openDeepDive(page, richNutritionState());
    await page.getByRole("button", { name: "Log Meal", exact: true }).last().click();
    const logSheet = page.getByRole("dialog", { name: "Log Meal" });
    await logSheet.getByRole("button", { name: "Custom Entry" }).click();
    await logSheet.getByLabel("Meal name").fill("Deep Dive custom meal");
    await logSheet.getByLabel("Calories in kilocalories").fill("444");
    await logSheet.getByLabel("Protein in grams").fill("33");
    await logSheet.getByLabel("Carbohydrates in grams").fill("48");
    await logSheet.getByLabel("Fat in grams").fill("12");
    await logSheet.getByRole("button", { name: "Add to Daily Log" }).click();

    await page.reload();
    await openFuel(page);
    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await page.getByRole("button", { name: "Open logged entry" }).click();
    const drilldown = page.getByRole("dialog", { name: /Meals/ });
    await expect(drilldown.getByRole("heading", { name: "Deep Dive custom meal" })).toBeVisible();
    await drilldown.getByRole("button", { name: "Delete Deep Dive custom meal meal" }).click();
    const confirm = page
      .getByRole("heading", { name: "Delete meal?", exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Open logged entry" }).click();
    const reopenedDrilldown = page.getByRole("dialog", { name: /Meals/ });
    await expect(
      reopenedDrilldown.getByRole("heading", { name: "Deep Dive custom meal" }),
    ).toBeVisible();
    await reopenedDrilldown
      .getByRole("button", { name: "Delete Deep Dive custom meal meal" })
      .click();
    await confirm.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Deep Dive custom meal", { exact: true })).toHaveCount(0);
  });

  test("is responsive, overflow-free, keyboard-visible, and reduced-motion safe", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openDeepDive(page, richNutritionState());
    for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.getByRole("heading", { name: "Nutrition Deep Dive" })).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`nutrition-deep-dive-${width}.png`),
        fullPage: width === 320 || width === 390 || width === 1280,
      });
    }
    const range = page.getByRole("button", { name: "30D", exact: true });
    await range.focus();
    await expect(range).toBeFocused();
    await expect(page.locator(".nutrition-deep-dive-premium")).toHaveCSS("overflow-x", "visible");
    expect(await page.locator("text=/NaN|Infinity/").count()).toBe(0);
  });
});
