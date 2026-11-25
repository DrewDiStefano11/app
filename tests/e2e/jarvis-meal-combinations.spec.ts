import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";
import type { MealEntry } from "../../src/lib/types";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
function meal(id: string, days: number, name = "Oats"): MealEntry {
  const date = new Date(); date.setDate(date.getDate() - days);
  return { id, name, type: "breakfast", createdAt: date.getTime(), calories: 200, protein: 10, carbs: 30, fat: 5,
    items: [{ name, qty: "40 g", calories: 200, protein: 10, carbs: 30, fat: 5 }] };
}
async function open(page: Page, meals: MealEntry[]) {
  let calls = 0;
  await page.route("**/_serverFn/**", route => { calls++; return route.abort(); });
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, mealEntries: meals, jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  return { calls: () => calls, send: async (text: string) => {
    await page.getByRole("textbox", { name: "Jarvis message" }).fill(text);
    await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
  } };
}

test("explicit whole meal combines both records, retains edited ingredients after a rejected save, and retries once", async ({ page }) => {
  const originals = [meal("original-oats", 1), meal("original-milk", 1, "Milk")];
  const jarvis = await open(page, originals);
  await jarvis.send("repeat all of yesterday's breakfast");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await expect(page.getByLabel("Portion multiplier for Oats")).toHaveValue("1");
  await expect(page.getByLabel("Portion multiplier for Milk")).toHaveValue("1");
  await page.getByLabel("Portion multiplier for Oats").fill("2");
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(2);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); };
    window.addEventListener("restore-writes", () => { Storage.prototype.setItem = write; }, { once: true });
  });
  await save.click();
  await expect(page.getByText(/could not verify the save/)).toBeVisible();
  await expect(page.getByLabel("Portion multiplier for Oats")).toHaveValue("2");
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await save.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries.length).toBe(3);
  const saved = (await readPersistedFitCoreState(page)).mealEntries;
  expect(saved.slice(0, 2)).toMatchObject(originals);
  expect(saved[2]).toMatchObject({ calories: 600, protein: 30, carbs: 90, fat: 15 });
  expect(saved[2].notes).toContain("original-oats");
  expect(saved[2].notes).toContain("original-milk");
  expect(jarvis.calls()).toBe(0);
});

test("usual combinations use repeated complete days and unknown macros block whole-meal aggregation", async ({ page }) => {
  const unknown: MealEntry = { id: "unknown", name: "Unknown-macro bowl", type: "breakfast", createdAt: Date.now(), calories: 150, macroStatus: "unreported" };
  const originals = [...[1, 2, 3].flatMap(day => [meal(`oats-${day}`, day), meal(`milk-${day}`, day, "Milk")]), unknown];
  const jarvis = await open(page, originals);
  const replies = page.locator(".jarvis-layout");
  await jarvis.send("show my frequent meal combinations");
  await expect(replies.getByText(/Oats \+ Milk \(3 distinct days/)).toBeVisible();
  await jarvis.send("repeat my usual breakfast combo");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await jarvis.send("repeat all of today's breakfast");
  await expect(replies.getByText(/At least one entry has unreported macros/)).toBeVisible();
  await expect(save).toHaveCount(0);
  expect((await readPersistedFitCoreState(page)).mealEntries).toMatchObject(originals);
  expect(jarvis.calls()).toBe(0);
});
