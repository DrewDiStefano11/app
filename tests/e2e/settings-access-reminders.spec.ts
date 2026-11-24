import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ reducedMotion: "reduce", serviceWorkers: "block" });

test("Settings opens from every main section and Done returns to that section", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  for (const section of ["Train", "Fuel", "Recover", "Stats"] as const) {
    const expand = page.getByRole("button", { name: /Expand navigation/ });
    if (await expand.isVisible()) await expand.click();
    await page.getByRole("button", { name: section, exact: true }).click();
    const heading = page.getByRole("heading", { level: 1 }).first();
    const sectionTitle = await heading.innerText();
    if (await expand.isVisible()) await expand.click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("heading", { name: sectionTitle, exact: true })).toBeVisible();
  }
});

test("Reminder preferences show their saved times and truthfully disclose notifications are not scheduled", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      reminders: { weighIn: true },
      personalization: { reminders: { weighInTime: "07:30" } },
    }),
  );
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
  await expect(page.getByText("In-app reminders available", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "In-app reminders appear on Home while FitCore is open. Push notifications are not enabled.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Weigh-in · 07:30", { exact: true })).toBeVisible();
  await expect(page.getByText("Weigh-in 9 PM", { exact: true })).toBeHidden();
  const reminder = page.getByLabel("Toggle weighIn reminder", { exact: true });
  await reminder.uncheck();
  await expect
    .poll(async () => (await readPersistedFitCoreState(page)).reminders.weighIn)
    .toBe(false);
  await page.reload();
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
  await expect(reminder).not.toBeChecked();
  await expect(page.getByText("Weigh-in · 07:30", { exact: true })).toBeVisible();
});

test("opt-in Home reminders use saved times, retain a dismissal after reopening and return on the next local date", async ({
  page,
}, testInfo) => {
  const today = new Date(2026, 10, 24, 13);
  await page.clock.install({ time: today });
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      bodyweightEntries: [],
      mealEntries: [],
      reminders: { workout: false, weighIn: true, lunch: true },
    }),
  );
  await expectDashboardReady(page);
  await expect(page.getByRole("region", { name: "In-app reminders" })).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Enable in-app reminders", { exact: true }).check();
  await page.getByLabel("Weigh-in reminder time", { exact: true }).fill("08:45");
  await expect
    .poll(
      async () => (await readPersistedFitCoreState(page)).personalization.reminders?.weighInTime,
    )
    .toBe("08:45");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const reminders = page.getByRole("region", { name: "In-app reminders" });
  await expect(reminders.getByText("Weigh-in · due 08:45", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("home-in-app-reminders.png") });
  await reminders
    .getByRole("button", { name: "Dismiss weigh-in reminder for today", exact: true })
    .click();
  await expect(reminders.getByText(/Weigh-in · due/)).toHaveCount(0);
  await expect(reminders.getByRole("button", { name: "Log lunch", exact: true })).toBeVisible();
  await page.reload();
  await expectDashboardReady(page);
  await expect(reminders.getByText(/Weigh-in · due/)).toHaveCount(0);
  await page.clock.setSystemTime(new Date(2026, 10, 25, 13));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(reminders.getByText("Weigh-in · due 08:45", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota", "QuotaExceededError");
    };
    window.addEventListener(
      "restore-reminder-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
  await reminders
    .getByRole("button", { name: "Dismiss weigh-in reminder for today", exact: true })
    .click();
  await expect(reminders.getByText(/Could not save this dismissal/)).toBeVisible();
  await expect(reminders.getByText("Weigh-in · due 08:45", { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("restore-reminder-writes")));
  await reminders.getByRole("button", { name: "Log weigh-in", exact: true }).click();
  const weighIn = page.getByRole("dialog", { name: /weigh/i });
  await expect(weighIn).toBeVisible();
  await weighIn.getByRole("spinbutton").fill("181.4");
  await weighIn.getByRole("button", { name: "Save weigh-in", exact: true }).click();
  await expect(weighIn).not.toBeVisible();
  await expect(reminders.getByText(/Weigh-in · due/)).toHaveCount(0);
  await expect
    .poll(async () => (await readPersistedFitCoreState(page)).bodyweightEntries.length)
    .toBe(1);
});
