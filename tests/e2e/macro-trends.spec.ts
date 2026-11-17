import { expect, test } from "@playwright/test";
import { addCalendarDays } from "../../src/lib/analytics/date-time";
import {
  currentFitCoreState,
  expectDashboardReady,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("Nutrition macro trends show logged nutrients and preserve missing dates", async ({
  page,
}) => {
  const now = Date.now();
  const meal = (id: string, daysAgo: number, protein: number) => ({
    id,
    name: id,
    type: "lunch",
    createdAt: addCalendarDays(now, -daysAgo) + 12 * 3_600_000,
    calories: 350,
    protein,
    carbs: 25,
    fat: 10,
  });
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      mealEntries: [meal("Monday meal", 4, 20), meal("Wednesday meal", 2, 40)],
    }),
  );
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Fuel", exact: true }).click();
  const trends = page.getByRole("region", { name: "Macro trends" });
  await expect(trends.getByText("Logged calories by date")).toBeVisible();
  await trends.getByRole("combobox", { name: "Nutrient", exact: true }).selectOption("protein");
  await expect(trends.getByText("Logged protein by date")).toBeVisible();
  await trends.getByText("Recorded values by date").click();
  await expect(
    trends.getByRole("listitem").filter({ hasText: "20 g · 1 logged day" }),
  ).toBeVisible();
  await expect(
    trends.getByRole("listitem").filter({ hasText: "40 g · 1 logged day" }),
  ).toBeVisible();
  await expect(trends.getByRole("listitem").filter({ hasText: "—" })).toHaveCount(5);
  await trends.getByRole("button", { name: "weekly", exact: true }).click();
  await expect(trends.getByText("Average protein per logged day")).toBeVisible();
  await expect(
    trends.getByRole("listitem").filter({ hasText: "30 g · 2 logged days" }),
  ).toBeVisible();
});
