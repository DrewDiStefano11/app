import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";
import { addCalendarDays } from "../../src/lib/analytics/date-time";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
const now = new Date(2026, 10, 23, 12).getTime();
const at = (ago: number) => addCalendarDays(now, -ago) + 9 * 3600000;

async function analytics(
  page: Page,
  options: { constant?: boolean; sparse?: boolean; old?: boolean } = {},
) {
  await page.clock.install({ time: new Date(now) });
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({ json: { status: "disconnected" } }),
  );
  await page.route("**/api/whoop/records", (route) => route.fulfill({ json: null }));
  const days = Array.from({ length: options.sparse ? 2 : 6 }, (_, index) => index);
  if (options.old) days.push(20, 21, 22, 23, 24, 25);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      mealEntries: days.map((day) => ({
        id: `meal-${day}`,
        name: "Recorded",
        type: "lunch",
        createdAt: at(day),
        calories: 1000 + day * 100,
        protein: 40 + day,
        carbs: 100,
        fat: 30,
      })),
      bodyweightEntries: days.map((day) => ({
        id: `weight-${day}`,
        createdAt: at(day),
        weightLb: options.constant ? 180 : 150 + day,
      })),
      sleepEntries: days.map((day) => ({
        id: `sleep-${day}`,
        createdAt: at(day),
        hours: 9 - day / 20,
        quality: 0,
      })),
    }),
  );
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page.getByLabel("First comparison metric")).toBeVisible();
}

test("Stats calculates a real association, plots its actual paired days and opens an inspectable detail table", async ({
  page,
}) => {
  await analytics(page);
  const summary = page.getByRole("button", { name: "Open metric comparison details", exact: true });
  await expect(summary).toContainText("strong positive association");
  await expect(summary).toContainText("6 paired days");
  await expect(summary).toContainText("r = 1.00");
  await expect(
    page.getByRole("img", { name: "Calories vs Bodyweight scatter plot of 6 paired days" }),
  ).toBeVisible();
  await summary
    .locator("..")
    .screenshot({ path: test.info().outputPath("metric-comparison.png"), animations: "disabled" });
  await summary.click();
  const sheet = page.getByRole("dialog", { name: "Calories vs Bodyweight", exact: true });
  const table = sheet.getByRole("table", { name: "Paired daily measurements", exact: true });
  await expect(table.getByRole("row")).toHaveCount(7);
  await expect(table).toContainText("1,000");
  await expect(table).toContainText("150");
  await sheet.getByRole("button", { name: "Close metric comparison", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open metric comparison details", exact: true }),
  ).toBeFocused();
});

test("metric and date-range controls recalculate using the same recorded history", async ({
  page,
}) => {
  await analytics(page, { old: true });
  const summary = page.getByRole("button", { name: "Open metric comparison details", exact: true });
  await expect(summary).toContainText("12 paired days");
  await page.getByRole("button", { name: "14d", exact: true }).click();
  await expect(summary).toContainText("6 paired days");
  await page.getByRole("button", { name: "90d", exact: true }).click();
  await page.getByLabel("First comparison metric").selectOption("sleep");
  await expect(summary).toContainText("12 paired days");
  await expect(summary).toContainText("strong negative association");
  await page.getByLabel("First comparison metric").selectOption("hrv");
  await expect(summary).toContainText("0 paired days");
  await expect(summary).toContainText("Needs more paired days");
  await page.getByLabel("First comparison metric").selectOption("volume");
  await page.getByLabel("Second comparison metric").selectOption("volume");
  await expect(
    page.getByText("Choose two different metrics to compare.", { exact: true }),
  ).toBeVisible();
  expect(JSON.stringify(await readPersistedFitCoreState(page))).not.toContain("correlation");
});

test("constant series and sparse records remain honestly unavailable rather than displaying fabricated correlations", async ({
  page,
}) => {
  await analytics(page, { constant: true });
  const summary = page.getByRole("button", { name: "Open metric comparison details", exact: true });
  await expect(summary).toContainText("Comparison unavailable");
  await expect(summary).toContainText("6 paired days");
  await expect(summary).not.toContainText("r =");
  await expect(page.getByRole("img", { name: /scatter plot/ })).toHaveCount(0);
  await expect(page.getByText(/zero variance/)).toBeVisible();
});

test("sparse paired days show the actual sample count and the minimum needed", async ({ page }) => {
  await analytics(page, { sparse: true });
  const summary = page.getByRole("button", { name: "Open metric comparison details", exact: true });
  await expect(summary).toContainText("2 paired days · minimum 5");
  await expect(summary).toContainText("Needs more paired days");
  await expect(summary).not.toContainText("r =");
});
