import { expect, test } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";
import type { MealEntry } from "../../src/lib/types";

function meal(id: string, name: string, calories: number): MealEntry {
  const date = new Date(); date.setDate(date.getDate() - 1);
  return { id, name, type: "dinner", calories, protein: 20, carbs: 40, fat: 6, createdAt: date.getTime(), items: [{ name, qty: "1 bowl", calories, protein: 20, carbs: 40, fat: 6 }] };
}

test("an unknown Unicode meal never proposes an unrelated recorded food", async ({ page }) => {
  let calls = 0;
  await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  const original = meal("chicken", "鸡肉饭", 350);
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, mealEntries: [original], jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("repeat 寿司 again");
  await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  await expect(page.locator(".jarvis-layout").getByText(/could not find a confirmed recorded meal/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  expect((await readPersistedFitCoreState(page)).mealEntries).toMatchObject([original]);
  expect(calls).toBe(0);
});

test("an exact Unicode name reviews and saves only its matching recorded ingredients", async ({ page }) => {
  const originals = [meal("chicken", "鸡肉饭", 350), meal("sushi", "寿司", 500)];
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, mealEntries: originals, jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("textbox", { name: "Jarvis message" }).fill("repeat 寿司 again");
  await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  await expect(page.getByLabel("Portion multiplier for 寿司")).toBeVisible();
  await expect(page.getByLabel("Portion multiplier for 鸡肉饭")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(3);
  const saved = (await readPersistedFitCoreState(page)).mealEntries;
  expect(saved.slice(0, 2)).toMatchObject(originals);
  expect(saved[2]).toMatchObject({ name: "寿司", calories: 500 });
  expect(saved[2].notes).toContain("recorded meal sushi");
});
