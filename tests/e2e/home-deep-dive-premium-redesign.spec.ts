import { expect, test, type Page } from "@playwright/test";
import { buildDemoState } from "../../src/lib/demo-data";
import { defaultState } from "../../src/lib/types";
import { FITCORE_STORAGE_KEY } from "./helpers/fitcore-test-state";

async function openHome(page: Page, rich = true) {
  const state = rich
    ? buildDemoState({ ...defaultState, onboardingComplete: true, demoMode: true })
    : {
        ...defaultState,
        onboardingComplete: true,
        workouts: [],
        mealEntries: [],
        sleepEntries: [],
        recoveryCheckIns: [],
        bodyweightEntries: [],
        cardioEntries: [],
      };
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: FITCORE_STORAGE_KEY,
    value: state,
  });
  await page.reload();
  await expect(page.getByText("FitCore Score", { exact: true })).toBeVisible();
}

async function openDeepDive(page: Page) {
  await page.getByRole("button", { name: "Open Deep Dive", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Home Deep Dive" })).toBeVisible();
}

test.describe("Home Deep Dive premium redesign", () => {
  test("preserves Daily View continuity and focuses the comparison builder", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "Customize in Deep Dive" }).click();
    await expect(page.getByRole("heading", { name: "Home Deep Dive" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Build a cross-domain view" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Metrics", exact: true })).toBeFocused();

    await page.locator(".deep-dive-return").click();
    await expect(
      page.getByLabel("Daily View or Deep Dive").getByRole("button", { name: "Daily View" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Training volume vs calories" })).toBeVisible();
  });

  test("builds, edits, and inspects a real multi-domain comparison", async ({ page }, testInfo) => {
    await openHome(page);
    await openDeepDive(page);

    await expect(page.getByLabel("2 metrics selected")).toBeVisible();
    await expect(page.getByRole("img", { name: /My cross-domain comparison/ })).toBeVisible();
    await page.getByRole("button", { name: "Hide Volume" }).click();
    await expect(page.getByRole("button", { name: "Show Volume" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.getByRole("button", { name: "Show Volume" }).click();
    await page.getByRole("button", { name: "Remove Calories logged" }).click();
    await expect(page.getByLabel("1 metrics selected")).toBeVisible();

    const metricsTrigger = page.getByRole("button", { name: "Add metric" });
    await metricsTrigger.click();
    const picker = page.getByRole("dialog", { name: "Choose comparison metrics" });
    await picker.getByRole("button", { name: /Calories logged/ }).click();
    await picker.getByRole("button", { name: /Protein logged/ }).click();
    await picker.getByRole("button", { name: /Sleep duration/ }).click();
    await picker.getByRole("button", { name: /Soreness/ }).click();
    await picker.getByRole("button", { name: /Bodyweight/ }).click();
    await picker.getByRole("button", { name: "Close Choose comparison metrics" }).click();
    await expect(metricsTrigger).toBeFocused();
    await expect(page.getByText(/visible series may be hard to read/)).toBeVisible();
    await expect(page.getByText(/incompatible raw units selected/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("builder-complexity-warning.png") });

    await page.getByLabel("Comparison display").selectOption("normalized");
    await expect(page.getByLabel("Comparison display")).toHaveValue("normalized");
    await page.getByLabel("Comparison display").selectOption("indexed");
    await expect(page.getByText(/Baseline: first recorded value/)).toBeVisible();
    await page.getByLabel("Comparison display").selectOption("small_multiples");
    await expect(page.getByLabel("Comparison display")).toHaveValue("small_multiples");

    await page.getByRole("button", { name: "Underlying data" }).click();
    await expect(
      page.getByRole("table").filter({ hasText: "Underlying logged values" }),
    ).toBeVisible();
    await expect(page.getByRole("table").getByText("—").first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("underlying-data-table.png") });
  });

  test("supports presets, honest unsupported states, and session-only actions", async ({
    page,
  }, testInfo) => {
    await openHome(page);
    await openDeepDive(page);

    await page.getByRole("button", { name: /Training Volume vs Soreness/ }).click();
    await expect(page.getByLabel("Comparison name")).toHaveValue("Training Volume vs Soreness");
    await expect(page.getByText("Training Volume vs Soreness applied.")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("preset-comparison.png") });

    await page.getByRole("button", { name: /Sleep vs Readiness/ }).click();
    await expect(page.getByText(/Historical readiness is not exposed/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Correlation Unavailable/ })).toBeVisible();
    await expect(
      page.getByText(/No supported Analytics Phase 2 correlation contract/),
    ).toBeVisible();

    await page.getByLabel("Comparison name").fill("Recovery workload review");
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByLabel("Comparison name")).toHaveValue("Recovery workload review copy");
    await page.getByRole("button", { name: "Save this session" }).click();
    await expect(page.getByText(/will not persist after reload/)).toBeVisible();
    await expect(page.getByLabel("Session saved comparisons")).toContainText("Session only");

    await page.getByRole("button", { name: "Clear / reset" }).click();
    await expect(page.getByLabel("2 metrics selected")).toBeVisible();
    await expect(page.getByLabel("Comparison name")).toHaveValue("My cross-domain comparison");
  });

  test("opens focus mode, exposes exact values, and closes with Escape", async ({
    page,
  }, testInfo) => {
    await openHome(page);
    await openDeepDive(page);
    const chart = page.getByRole("img", { name: /My cross-domain comparison/ }).first();
    await chart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Selected date").first()).toBeVisible();
    await page.getByRole("button", { name: "Focus", exact: true }).first().click();
    const focus = page.getByRole("dialog", { name: "My cross-domain comparison" });
    await expect(focus).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("comparison-focus-mode.png") });
    await focus.getByRole("button", { name: "Data table" }).click();
    await expect(
      focus.getByRole("columnheader", { name: /Training · Training volume/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(focus).not.toBeVisible();
  });

  test("renders explanatory insufficient-data states without synthetic zeroes", async ({
    page,
  }, testInfo) => {
    await openHome(page, false);
    await openDeepDive(page);
    await expect(page.getByText("A clearer trend is taking shape").first()).toBeVisible();
    await expect(page.getByText(/unlogged dates will not be synthesized/)).toBeVisible();
    await expect(page.getByText(/Historical FitCore Score/)).toBeVisible();
    await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("insufficient-data-state.png"),
      fullPage: true,
    });
  });

  test("is responsive, overflow-safe, keyboard-visible, and reduced-motion safe", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHome(page);
    await openDeepDive(page);
    for (const width of [320, 360, 390, 430, 480, 1280]) {
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`home-deep-dive-${width}.png`),
        fullPage: width === 1280,
      });
    }
    const returnButton = page.locator(".deep-dive-return");
    await returnButton.focus();
    await expect(returnButton).toBeFocused();
    expect(
      await page
        .locator(".home-deep-dive-premium")
        .evaluate((element) => getComputedStyle(element).animationDuration),
    ).toMatch(/0|1e-05/);
    await page.screenshot({ path: testInfo.outputPath("keyboard-focus-reduced-motion.png") });
  });
});
