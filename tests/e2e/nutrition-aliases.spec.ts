import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
async function library(page: Page) {
  const expand = page.getByRole("button", { name: "Expand navigation", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await page.getByRole("button", { name: "Food library", exact: true }).click();
}
async function writesFail(page: Page) {
  await page.evaluate(() => { const write = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); }; window.addEventListener("restore-writes", () => { Storage.prototype.setItem = write; }, { once: true }); });
}
async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Jarvis message", exact: true }).fill(text);
  await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
}

test("custom aliases survive rejected creation, reload and confirmed quantity-aware Jarvis reuse", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: false } }));
  await library(page);
  await page.getByRole("button", { name: "Add Food", exact: true }).click();
  const form = page.locator(".sheet-surface").filter({ has: page.getByRole("heading", { name: "Add Custom Food", exact: true }) });
  await form.getByLabel("Food name", { exact: true }).fill("Personal oats");
  await form.getByLabel("Aliases (optional)", { exact: true }).fill("morning bowl, PB oats");
  await form.getByLabel("Calories (kcal)", { exact: true }).fill("350");
  await form.getByLabel("Protein (g)", { exact: true }).fill("20");
  await form.getByLabel("Carbs (g)", { exact: true }).fill("45");
  await form.getByLabel("Fat (g)", { exact: true }).fill("10");
  await form.getByLabel("Serving amount", { exact: true }).fill("1");
  await writesFail(page);
  await form.getByRole("button", { name: "Add to Library", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Could not save");
  await expect(form.getByLabel("Aliases (optional)", { exact: true })).toHaveValue("morning bowl, PB oats");
  expect((await readPersistedFitCoreState(page)).savedNutrition?.length ?? 0).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await form.getByRole("button", { name: "Add to Library", exact: true }).click();
  await expect(form).toBeHidden();
  await page.reload();
  expect((await readPersistedFitCoreState(page)).savedNutrition?.[0].aliases).toEqual(["morning bowl", "PB oats"]);
  await library(page);
  await page.getByPlaceholder(/^Search foods/).fill("PB oats");
  await expect(page.getByText("Personal oats", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit Personal oats", exact: true }).click();
  const edit = page.locator(".sheet-surface").filter({ has: page.getByRole("heading", { name: "Edit Saved Food", exact: true }) });
  await expect(edit.getByLabel("Aliases (optional)", { exact: true })).toHaveValue("morning bowl, PB oats");
  await edit.getByLabel("Aliases (optional)", { exact: true }).fill("morning bowl, PB oats, porridge");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit).toBeHidden();
  expect((await readPersistedFitCoreState(page)).savedNutrition).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await send(page, "log two servings of PB oats");
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(1);
  expect((await readPersistedFitCoreState(page)).mealEntries[0]).toMatchObject({ name: "Personal oats", calories: 700, protein: 40, carbs: 90, fat: 20 });
});

test("overlapping aliases ask for clarification and unreported saved nutrients remain unknown", async ({ page }) => {
  let calls = 0; await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: false }, savedNutrition: [
    { id: "a", kind: "food", aliases: ["morning bowl"], servingLabel: "1 cup", meal: { id: "a-meal", name: "Oats A", type: "breakfast", createdAt: Date.now(), calories: 350, protein: 20, carbs: 45, fat: 10 } },
    { id: "b", kind: "food", aliases: ["morning bowl"], servingLabel: "1 cup", meal: { id: "b-meal", name: "Oats B", type: "breakfast", createdAt: Date.now(), calories: 500, protein: 30, carbs: 60, fat: 15 } },
    { id: "unknown", kind: "food", aliases: ["banana"], meal: { id: "unknown-meal", name: "Calorie-only bowl", type: "snack", createdAt: Date.now(), calories: 200, macroStatus: "unreported" } },
  ] }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await send(page, "log morning bowl");
  await expect(page.getByText(/I found multiple matches/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await send(page, "log saved banana");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(1);
  const saved = (await readPersistedFitCoreState(page)).mealEntries[0];
  expect(saved).toMatchObject({ calories: 200, macroStatus: "unreported" }); expect(saved).not.toHaveProperty("protein"); expect(calls).toBe(0);
});
