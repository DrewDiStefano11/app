import { expect, test, type Page } from "@playwright/test";
import {
  expectDashboardReady,
  readPersistedFitCoreState,
  seedMinimalOnboardedState,
} from "./helpers/fitcore-test-state";

async function openTraining(page: Page) {
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const expand = nav.getByRole("button", { name: "Expand navigation" });
  if (await expand.isVisible()) await expand.click();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
}

async function openLibrary(page: Page) {
  await expectDashboardReady(page);
  await openTraining(page);
  await page.getByRole("button", { name: "Exercise library", exact: true }).press("Enter");
  return page.getByRole("dialog", { name: "Exercise library", exact: true });
}

test("browse the exercise library by muscle and equipment without starting a workout", async ({ page }) => {
  await seedMinimalOnboardedState(page);
  const before = await readPersistedFitCoreState(page);
  const library = await openLibrary(page);
  const search = library.getByRole("searchbox", { name: "Search exercises" });

  await search.fill("barbell chest");
  await library.getByRole("button", { name: /^Barbell Bench Press/ }).click();
  await expect(library.getByText("Plant feet", { exact: true })).toBeVisible();
  await expect(library.getByText("triceps, shoulders", { exact: true })).toBeVisible();
  await expect(library.getByRole("button", { name: /^Dumbbell Bench Press/ })).toBeHidden();
  await search.fill("no matching equipment here");
  await expect(library.getByText("No exercises match your search.")).toBeVisible();
  expect(await readPersistedFitCoreState(page)).toEqual(before);
  await library.getByRole("button", { name: "Close exercise library", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(library.getByRole("button", { name: "New custom exercise", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(library.getByRole("button", { name: "Close exercise library", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Exercise library", exact: true })).toBeFocused();
});

test("save a custom exercise from Training and reuse it after relaunch", async ({ page }) => {
  await seedMinimalOnboardedState(page);
  const library = await openLibrary(page);
  await library.getByRole("button", { name: "New custom exercise", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New custom exercise", exact: true });
  await expect(form).toBeFocused();
  const name = form.getByPlaceholder("e.g. Landmine Press");
  await name.fill("Garage cable press");
  await form.getByLabel("Equipment", { exact: true }).selectOption("cable");
  await form.getByLabel("Notes (optional)").fill("Use the single handle.");

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("Synthetic write failure", "QuotaExceededError"); };
    window.addEventListener("fitcore-test-enable-writes", () => { Storage.prototype.setItem = original; }, { once: true });
  });
  const save = form.getByRole("button", { name: "Save exercise", exact: true });
  await save.click();
  await expect(form.getByRole("alert")).toContainText("Exercise could not be saved");
  await expect(name).toHaveValue("Garage cable press");
  await page.evaluate(() => window.dispatchEvent(new Event("fitcore-test-enable-writes")));
  await save.click();
  await expect(library.getByText("Use the single handle.", { exact: true })).toBeVisible();

  const persisted = await readPersistedFitCoreState(page);
  expect(persisted.activeWorkout).toBeNull();
  expect(persisted.customExercises).toHaveLength(1);
  expect(persisted.customExercises[0]).toMatchObject({ name: "Garage cable press", equipment: "cable" });

  await page.reload();
  const reopened = await openLibrary(page);
  await reopened.getByRole("button", { name: "Custom only", exact: true }).click();
  await expect(reopened.getByRole("button", { name: /^Garage cable press/ })).toBeVisible();
  await expect(reopened.getByRole("button", { name: /^Barbell Bench Press/ })).toBeHidden();
  await reopened.getByRole("button", { name: "Close exercise library", exact: true }).click();

  await page.getByRole("button", { name: "Blank workout", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const picker = page.locator(".sheet-surface");
  await picker.getByPlaceholder("Search exercise or muscle…").fill("garage cable");
  await picker.getByRole("button", { name: /^Garage cable press/ }).click();
  expect((await readPersistedFitCoreState(page)).activeWorkout?.exercises[0].exerciseId)
    .toBe(persisted.customExercises[0].id);
});

test("open the exercise library in Deep Dive without replacing workout templates", async ({ page }) => {
  await seedMinimalOnboardedState(page);
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  await openTraining(page);
  await page.getByRole("tab", { name: "Library", exact: true }).click();
  await expect(page.getByRole("button", { name: "New template", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exercise library", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Exercise library", exact: true })).toBeVisible();
});
