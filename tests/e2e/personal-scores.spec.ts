import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

const now = new Date(2026, 10, 16, 12).getTime();

test("empty profiles show unavailable scores without a readiness graph", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  await expect(
    page.getByRole("button", { name: "FitCore Score — · Not enough data" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Recovery — · Not enough data" })).toBeVisible();
  await page.getByRole("button", { name: "Readiness — · Not enough data" }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "14-day readiness history" });
  await expect(sheet.getByText("No readiness records in the last 14 days.")).toBeVisible();
  await expect(sheet.locator("svg.recharts-surface")).toHaveCount(0);
  await expect(sheet.getByText(/push hard|prime day/i)).toHaveCount(0);
});

test("readiness shows evidence, leaves missing dates blank, and ages out", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      recoveryCheckIns: [
        {
          id: "older",
          createdAt: now - 2 * 86_400_000 - 1000,
          energy: 6,
          motivation: 6,
          soreness: 4,
          stress: 4,
        },
        { id: "today", createdAt: now - 60_000, energy: 6, motivation: 6, soreness: 4, stress: 4 },
      ],
    }),
  );
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Readiness 65 · Limited data" }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "14-day readiness history" });
  await expect(sheet.getByText(/Recovery check-ins · 1 record/)).toBeVisible();
  await sheet.getByText("Daily values and sources").click();
  await expect(sheet.getByText("2026-11-15 · — · Not enough data", { exact: true })).toBeVisible();
  await expect(
    sheet.getByText("2026-11-16 · 65 · Limited data · Recovery check-ins", { exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(now + 4 * 86_400_000);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(sheet.getByText("Earlier records", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Stale", { exact: true })).toBeVisible();
});

test("confirmed check-in replaces the empty state immediately", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Check In", exact: true }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "Daily Check-In" });
  const save = sheet.getByRole("button", { name: "Save check-in", exact: true });
  await expect(save).toBeDisabled();
  await expect(sheet.getByText(/Predicted Readiness|push hard/)).toHaveCount(0);
  await page.clock.setFixedTime(now + 1000);
  await sheet.getByRole("checkbox", { name: /I confirm these ratings/ }).check();
  await save.click();
  await expect(page.getByRole("button", { name: "Readiness 78 · Limited data" })).toBeVisible();
});

test("demo scores are explicitly labeled", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({ onboardingComplete: true, demoMode: true }),
  );
  await expectDashboardReady(page);
  await expect(
    page.getByRole("button", { name: /FitCore Score .* · Demo Data · / }),
  ).toBeVisible();
});

test("sleep requires recorded hours and confirmation", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  const menu = page.getByRole("button", { name: "Expand navigation, current section Home" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await page.getByRole("button", { name: "Sleep", exact: true }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "Log sleep" });
  const save = sheet.getByRole("button", { name: "Save sleep", exact: true });
  await expect(save).toBeDisabled();
  await sheet.getByRole("textbox", { name: "Hours" }).fill("8");
  await expect(save).toBeDisabled();
  await sheet.getByRole("checkbox", { name: /I confirm the sleep hours/ }).check();
  await save.click();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Readiness.*70.*Limited data/i })).toBeVisible();
});
