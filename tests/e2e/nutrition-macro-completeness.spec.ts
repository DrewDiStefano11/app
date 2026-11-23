import { expect, test } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test("Fuel custom foods preserve missing macros and reject partial macro entries", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  await page.getByRole("button", { name: "Custom Entry", exact: true }).click();
  const sheet = page
    .locator(".sheet-surface")
    .filter({ has: page.getByRole("heading", { name: "Log Meal", exact: true }) });
  await sheet.getByPlaceholder("e.g. Post-workout protein bowl").fill("Calorie-only custom bowl");
  await sheet.getByText("Kcal", { exact: true }).locator("..").locator("input").fill("500");
  const protein = sheet.getByText("P", { exact: true }).locator("..").locator("input");
  await protein.fill("20");
  await expect(sheet.getByRole("button", { name: "Add to Daily Log", exact: true })).toBeDisabled();
  await protein.clear();
  await sheet.getByRole("button", { name: "Save as reusable food", exact: true }).click();
  await expect
    .poll(async () => (await readPersistedFitCoreState(page)).savedNutrition?.length)
    .toBe(1);
  expect((await readPersistedFitCoreState(page)).savedNutrition?.[0].meal).toMatchObject({
    calories: 500,
    macroStatus: "unreported",
  });
  await sheet.getByRole("button", { name: "Add to Daily Log", exact: true }).click();
  await expect(sheet).toBeHidden();
  const state = await readPersistedFitCoreState(page);
  expect(state.mealEntries[0]).toMatchObject({ calories: 500, macroStatus: "unreported" });
  expect(state.mealEntries[0].protein).toBeUndefined();
  await expect(page.getByText("Some meals have unreported macros.", { exact: true })).toBeVisible();
});
