import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  gotoDashboard,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test("local text saves confirmed weigh-in, sleep and supplement records", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await gotoDashboard(page);
  await page.getByRole("button", { name: "Open AI composer" }).click();
  await page.getByRole("textbox", { name: "Message Jarvis" }).fill("I weigh 182.6 pounds today.");
  await page.getByRole("button", { name: "Send to Jarvis" }).click();

  const input = page.getByPlaceholder("Talk to Jarvis...");
  const send = async (text: string) => {
    await input.fill(text);
    await input.press("Enter");
  };
  const save = page.getByRole("button", { name: "Save", exact: true });
  await save.click();
  await expect(page.getByText("Logged 182.6 lb")).toBeVisible();

  await send("I slept seven and a half hours.");
  await expect(
    page.getByText("You reported 7.5 hours. How would you rate your sleep quality from 1 to 10?"),
  ).toBeVisible();
  expect((await readPersistedFitCoreState(page)).sleepEntries).toEqual([]);
  await send("8/10");
  await save.click();
  await expect(page.getByText("Logged 7.5 hours of sleep, quality 8/10.")).toBeVisible();

  await send("Log 5 grams of creatine.");
  await save.click();
  await expect(page.getByText(/Logged creatine/)).toBeVisible();
  const saved = await readPersistedFitCoreState(page);
  expect(saved.bodyweightEntries).toMatchObject([{ weightLb: 182.6 }]);
  expect(saved.sleepEntries).toMatchObject([
    { hours: 7.5, quality: 8, provenance: { confirmation: "confirmed" } },
  ]);
  expect(saved.supplementLogs).toMatchObject([{ name: "creatine", dose: "5 grams" }]);
});
