import { expect, test, type Page } from "@playwright/test";
import { addCalendarDays } from "../../src/lib/analytics/date-time";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

const now = new Date(2026, 10, 16, 18).getTime();
const at = (days: number, hour: number) => addCalendarDays(now, days) + hour * 3_600_000;

async function openRecovery(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Recover", exact: true }).click();
}

test("Recovery sleep summaries and history share confirmed recorded sleep", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      sleepEntries: [
        { id: "confirmed", createdAt: at(-2, 9), hours: 7, quality: 7 },
        { id: "earlier", createdAt: at(-2, 7), hours: 6, quality: 6 },
        {
          id: "estimate",
          createdAt: at(-2, 12),
          hours: 11,
          quality: 8,
          provenance: { source: "ai-estimated", confidence: "low", confirmation: "unconfirmed" },
        },
        { id: "future", createdAt: at(1, 8), hours: 12, quality: 9 },
      ],
    }),
  );
  await expectDashboardReady(page);
  await openRecovery(page);
  await expect(page.getByText("7h 0m", { exact: true })).toBeVisible();
  await expect(page.getByText("7.0h", { exact: true })).toBeVisible();
  await expect(page.getByText("12h", { exact: true })).toBeHidden();

  await page.reload();
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  await openRecovery(page);
  await page.getByRole("tab", { name: "Sleep", exact: true }).click();
  const days = page.getByRole("list", { name: "Recorded sleep by day" });
  await expect(days.getByText("7h", { exact: true })).toBeVisible();
  await expect(days.getByText("—", { exact: true })).toHaveCount(6);
});

test("sleep can be logged unrated and rejected writes keep the draft", async ({ page }) => {
  await page.clock.setFixedTime(now);
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  await openRecovery(page);
  await page.getByRole("button", { name: "Sleep", exact: true }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "Log sleep" });
  const hours = sheet.getByRole("textbox", { name: "Hours" });
  await hours.fill("4");
  await expect(sheet.getByRole("combobox", { name: "Sleep quality" })).toHaveValue("0");
  await sheet.getByRole("checkbox", { name: /I confirm the sleep hours/ }).check();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota", "QuotaExceededError");
    };
    window.addEventListener(
      "fitcore-restore-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
  await sheet.getByRole("button", { name: "Save sleep", exact: true }).click();
  await expect(sheet.getByRole("alert")).toContainText("Sleep could not be saved");
  await expect(hours).toHaveValue("4");
  expect((await readPersistedFitCoreState(page)).sleepEntries).toEqual([]);
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore-restore-writes")));
  await sheet.getByRole("button", { name: "Save sleep", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("4h 0m", { exact: true })).toBeVisible();
  expect((await readPersistedFitCoreState(page)).sleepEntries[0]).toMatchObject({
    hours: 4,
    quality: 0,
  });
  await expect(
    page.getByRole("button", { name: "Readiness — Not enough data", exact: true }),
  ).toBeVisible();
});
