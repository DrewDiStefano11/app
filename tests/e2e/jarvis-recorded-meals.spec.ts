import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";
import type { MealEntry } from "../../src/lib/types";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
function meal(id: string, days = 1, name = "Overnight oats"): MealEntry {
  const date = new Date(); date.setDate(date.getDate() - days);
  return { id, name, type: "breakfast", calories: 300, protein: 20, carbs: 40, fat: 6, createdAt: date.getTime(), items: [{ name, qty: "1 cup", calories: 300, protein: 20, carbs: 40, fat: 6 }] };
}
async function open(page: Page, meals: MealEntry[]) {
  let providerCalls = 0;
  await page.route("**/_serverFn/**", route => { providerCalls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, mealEntries: meals, jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  return { calls: () => providerCalls, send: async (text: string) => {
    await page.getByRole("textbox", { name: "Jarvis message" }).fill(text);
    await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  } };
}

test("recorded meal review retains edited portions after a failed save and retries exactly once", async ({ page }) => {
  const original = meal("original");
  const jarvis = await open(page, [original]);
  await jarvis.send("log the same breakfast as yesterday");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await expect(page.getByText("Reference nutrition values", { exact: true })).toBeVisible();
  await page.getByLabel("Portion multiplier for Overnight oats").fill("2");
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(1);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); };
    window.addEventListener("restore-writes", () => { Storage.prototype.setItem = write; }, { once: true });
  });
  await save.click();
  await expect(page.getByText(/could not verify the save/)).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(page.getByLabel("Portion multiplier for Overnight oats")).toHaveValue("2");
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await save.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(2);
  const stored = await readPersistedFitCoreState(page);
  expect(stored.mealEntries.find(m => m.id === original.id)).toMatchObject(original);
  const copied = stored.mealEntries.find(m => m.id !== original.id)!;
  expect(copied).toMatchObject({ calories: 600, protein: 40, carbs: 80, fat: 12 });
  expect(copied.notes).toContain("recorded meal original");
  expect(jarvis.calls()).toBe(0);
});

test("historical ambiguity carries a local numbered choice into explicit review", async ({ page }) => {
  const jarvis = await open(page, [meal("oats"), meal("eggs", 1, "Egg bowl")]);
  await jarvis.send("same breakfast as yesterday");
  await expect(page.getByText(/Which recorded meal for yesterday/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await jarvis.send("1");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(2);
  await save.click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(3);
  expect(jarvis.calls()).toBe(0);
});

test("history suggestions and usual servings use actual distinct days; repeat preserves unknown macros", async ({ page }) => {
  const unknown: MealEntry = { id: "unknown", name: "Calorie only bowl", type: "lunch", calories: 450, macroStatus: "unreported", createdAt: Date.now() };
  const jarvis = await open(page, [meal("a", 1), meal("b", 2), meal("c", 3), unknown]);
  await jarvis.send("show my frequent meals");
  await expect(page.getByText(/Overnight oats: 3 distinct days/)).toBeVisible();
  await jarvis.send("log my usual breakfast");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await jarvis.send("repeat my last meal");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await save.click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(5);
  const stored = (await readPersistedFitCoreState(page)).mealEntries.find(m => m.id !== "unknown" && m.name === unknown.name)!;
  expect(stored).toMatchObject({ calories: 450, macroStatus: "unreported" });
  expect(stored).not.toHaveProperty("protein");
  expect(stored.notes).toContain("recorded meal unknown");
  expect(jarvis.calls()).toBe(0);
});
