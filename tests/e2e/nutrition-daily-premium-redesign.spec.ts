import { expect, test, type Page } from "@playwright/test";
import { defaultState } from "../../src/lib/types";
import { FITCORE_STORAGE_KEY } from "./helpers/fitcore-test-state";

const now = () => Date.now();

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

function richState() {
  const createdAt = now();
  return nutritionState({
    mealEntries: [
      {
        id: "meal-breakfast",
        name: "Greek yogurt, berries, toasted oats, and almond butter",
        type: "breakfast",
        calories: 510,
        protein: 38,
        carbs: 61,
        fat: 14,
        createdAt,
      },
      {
        id: "meal-lunch",
        name: "Chicken rice bowl",
        type: "lunch",
        calories: 680,
        protein: 54,
        carbs: 76,
        fat: 18,
        createdAt: createdAt - 3_600_000,
      },
    ],
    supplementLogs: [{ id: "supplement-creatine", name: "Creatine", dose: "5 g", createdAt }],
  });
}

async function seedState(page: Page, state: Record<string, unknown>) {
  await page.goto("/");
  await page.evaluate((key) => window.localStorage.removeItem(key), FITCORE_STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: "Get started", exact: true })).toBeVisible({
    timeout: 10000,
  });
  await page.waitForFunction(
    (key) => window.localStorage.getItem(key) !== null,
    FITCORE_STORAGE_KEY,
  );
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), {
    key: FITCORE_STORAGE_KEY,
    value: state,
  });
  await page.reload();
  await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible({ timeout: 10000 });
}

async function openFuel(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
}

async function openFuelWithState(page: Page, state: Record<string, unknown>) {
  await seedState(page, state);
  await openFuel(page);
}

function mealSheet(page: Page) {
  return page
    .getByRole("heading", { name: "Log Meal", exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'sheet-surface')][1]");
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), FITCORE_STORAGE_KEY);
}

test.describe("Nutrition Daily premium redesign", () => {
  test("renders exact populated calorie, macro, meal, supplement, and Deep Dive context", async ({
    page,
  }, testInfo) => {
    await openFuelWithState(page, richState());

    await expect(page.getByText("1,260 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText(/remaining today/).first()).toBeVisible();
    await expect(page.getByText("1,190 logged of 2,450 kcal", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Protein", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Carbohydrates", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fat", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Greek yogurt, berries, toasted oats, and almond butter",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("510 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText("Creatine", { exact: true })).toBeVisible();
    await expect(page.getByText("5 g", { exact: true })).toBeVisible();
    await expect(page.getByText("0 fl oz", { exact: false })).toHaveCount(0);
    await expect(page.getByText(/does not display a fabricated water total/i)).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("nutrition-populated.png"), fullPage: true });
    await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Nutrition Deep Dive", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calories and macros" })).toBeVisible();
  });

  test("distinguishes no meals, missing targets, and explicit zero targets", async ({
    page,
  }, testInfo) => {
    await openFuelWithState(page, nutritionState());
    await expect(page.getByText("2,450 kcal", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "No meals logged today" })).toBeVisible();
    await expect(page.getByLabel(/Needs more data/i)).toBeVisible();
    await expect(page.getByText(/Missing meals are not treated as zero intake/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("nutrition-empty.png"), fullPage: true });

    await openFuelWithState(
      page,
      nutritionState({
        nutritionTargets: { calories: null, protein: null, carbs: null, fat: null },
        mealEntries: [
          {
            id: "missing-target-meal",
            name: "Target-free meal",
            type: "lunch",
            calories: 510,
            protein: 31,
            carbs: 58,
            fat: 16,
            createdAt: now(),
          },
        ],
      }),
    );
    await expect(page.getByText("510 kcal", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("logged · target unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText("Target unavailable", { exact: true }).first()).toBeVisible();

    await openFuelWithState(
      page,
      nutritionState({
        nutritionTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        mealEntries: [
          {
            id: "zero-target-meal",
            name: "Zero target context",
            type: "snack",
            calories: 220,
            protein: 18,
            carbs: 22,
            fat: 7,
            createdAt: now(),
          },
        ],
      }),
    );
    await expect(page.getByText("logged · target is 0 kcal", { exact: true })).toBeVisible();
    await expect(page.getByText(/explicit zero target is not treated as missing/i)).toBeVisible();
    await expect(page.getByText("Explicit 0g target", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/NaN|Infinity/)).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("nutrition-zero-target.png"),
      fullPage: true,
    });

    await openFuelWithState(
      page,
      nutritionState({
        mealEntries: [
          {
            id: "at-target-meal",
            name: "Complete target day",
            type: "dinner",
            calories: 2450,
            protein: 175,
            carbs: 285,
            fat: 78,
            createdAt: now(),
          },
        ],
      }),
    );
    await expect(page.getByText("0 kcal", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2,450 logged of 2,450 kcal", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("nutrition-at-target.png"),
      fullPage: true,
    });

    await openFuelWithState(
      page,
      nutritionState({
        mealEntries: [
          {
            id: "over-target-meal",
            name: "Large shared celebration dinner with dessert",
            type: "dinner",
            calories: 2680,
            protein: 132,
            carbs: 320,
            fat: 92,
            createdAt: now(),
          },
        ],
      }),
    );
    await expect(page.getByText("230 kcal", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/over today.s target/i)).toBeVisible();
    await expect(page.getByText("43g remaining", { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("nutrition-over-target.png"),
      fullPage: true,
    });
  });

  test("preserves templates, foods, custom entry, photo entry, and planned barcode state", async ({
    page,
  }, testInfo) => {
    await openFuelWithState(page, nutritionState());
    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
    const sheet = mealSheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Templates", exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Foods Library", exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Custom Entry", exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Barcode, coming soon" })).toBeDisabled();

    await page.evaluate(() => {
      document.body.dataset.photoEntry = "waiting";
      window.addEventListener(
        "fitcore:open-ai",
        () => {
          document.body.dataset.photoEntry = "opened";
        },
        { once: true },
      );
    });
    await sheet.getByRole("button", { name: "Photo Log, AI Estimate" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-photo-entry", "opened");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
    const reopened = mealSheet(page);
    await reopened.getByRole("button", { name: "Foods Library", exact: true }).click();
    await expect(reopened.getByLabel("Search foods library")).toBeVisible();
    await reopened.getByRole("button", { name: "Custom Entry", exact: true }).click();
    await expect(reopened.getByLabel("Meal name")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("nutrition-log-meal.png"), fullPage: true });
  });

  test("saves a custom meal with exact values and persists it after reload", async ({ page }) => {
    await openFuelWithState(page, nutritionState());
    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
    const sheet = mealSheet(page);
    await sheet.getByRole("button", { name: "Custom Entry", exact: true }).click();
    await sheet.getByLabel("Meal name").fill("Post-workout recovery bowl");
    await sheet.getByLabel("Meal type").selectOption("post-workout");
    await sheet.getByLabel("Calories in kilocalories").fill("640");
    await sheet.getByLabel("Protein in grams").fill("48");
    await sheet.getByLabel("Carbohydrates in grams").fill("72");
    await sheet.getByLabel("Fat in grams").fill("16");
    await sheet.getByRole("button", { name: "Add to Daily Log", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Post-workout recovery bowl", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("640 kcal", { exact: true })).toBeVisible();
    await expect
      .poll(async () => (await persistedState(page)).mealEntries?.[0]?.name)
      .toBe("Post-workout recovery bowl");

    await page.reload();
    await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
    await openFuel(page);
    await expect(
      page.getByRole("heading", { name: "Post-workout recovery bowl", exact: true }),
    ).toBeVisible();
  });

  test("keeps deletion behind Cancel and Confirm", async ({ page }, testInfo) => {
    await openFuelWithState(page, richState());
    const deleteBreakfast = page.getByRole("button", {
      name: "Delete Greek yogurt, berries, toasted oats, and almond butter meal",
    });
    await deleteBreakfast.click();
    await expect(page.getByRole("heading", { name: "Delete meal?", exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("nutrition-delete-confirmation.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Greek yogurt, berries, toasted oats, and almond butter",
        exact: true,
      }),
    ).toBeVisible();

    await deleteBreakfast.click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Greek yogurt, berries, toasted oats, and almond butter",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect.poll(async () => (await persistedState(page)).mealEntries?.length).toBe(1);
  });

  test("is keyboard usable, reduced-motion safe, and overflow-free at required widths", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openFuelWithState(page, richState());

    for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `no document overflow at ${width}px`,
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`nutrition-daily-${width}.png`),
        fullPage: true,
      });
    }

    const logMeal = page.getByRole("button", { name: "Log Meal", exact: true }).first();
    await logMeal.focus();
    await expect(logMeal).toBeFocused();
    await logMeal.press("Enter");
    await expect(mealSheet(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mealSheet(page)).not.toBeVisible();
    const transition = await page
      .locator(".nutrition-daily-premium")
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(transition).toMatch(/0s|0\.00001s|1e-05s/);
  });
});
