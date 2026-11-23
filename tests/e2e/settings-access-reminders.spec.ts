import { expect, test } from "@playwright/test";
import { currentFitCoreState, expectDashboardReady, readPersistedFitCoreState, seedRevisionedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ reducedMotion: "reduce", serviceWorkers: "block" });

test("Settings opens from every main section and Done returns to that section", async ({ page }) => {
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

test("Reminder preferences show their saved times and truthfully disclose notifications are not scheduled", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, reminders: { weighIn: true }, personalization: { reminders: { weighInTime: "07:30" } } }));
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
  await expect(page.getByText("Notifications planned", { exact: true })).toBeVisible();
  await expect(page.getByText("FitCore does not schedule or send notifications yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("Weigh-in · 07:30", { exact: true })).toBeVisible();
  await expect(page.getByText("Weigh-in 9 PM", { exact: true })).toBeHidden();
  const reminder = page.getByLabel("Toggle weighIn reminder", { exact: true });
  await reminder.uncheck();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).reminders.weighIn).toBe(false);
  await page.reload();
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
  await expect(reminder).not.toBeChecked();
  await expect(page.getByText("Weigh-in · 07:30", { exact: true })).toBeVisible();
});
