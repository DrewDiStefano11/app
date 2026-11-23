import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });
const plate = { name: "Chicken rice and broccoli", mealType: "dinner", recipeServings: 1, servingsEaten: 1, assumptions: ["Estimated portions; cooking oil may be hidden."], question: "Was any oil or sauce added?", items: [
  { id: "chicken", name: "Grilled chicken", quantity: 6, unit: "oz", calories: 280, protein: 52, carbs: 0, fat: 6, evidence: "visible", preparation: "grilled" },
  { id: "rice", name: "White rice", quantity: 1, unit: "cup", calories: 205, protein: 4, carbs: 45, fat: 0, evidence: "visible", preparation: "cooked" },
  { id: "broccoli", name: "Broccoli", quantity: 1, unit: "cup", calories: 55, protein: 4, carbs: 11, fat: 1, evidence: "visible", preparation: "steamed" },
] };
const image = { name: "synthetic-food.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") };
async function start(page: Page) {
  await page.addInitScript(() => localStorage.setItem("fitcore.jarvis.groqApiKey.v1", "synthetic-test-key"));
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: false } }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  await page.getByRole("button", { name: "Meal photo", exact: true }).click();
  await page.getByLabel("Upload food photo").setInputFiles(image);
  await expect(page.getByRole("button", { name: "Estimate meal", exact: true })).toBeDisabled();
}
async function upload(page: Page) {
  await page.getByLabel("Send this photo and meal corrections to Groq").check();
  await page.getByRole("button", { name: "Estimate meal", exact: true }).click();
  await expect(page.getByRole("region", { name: "Meal photo review" })).toBeVisible();
}
test("food photo is independently estimated, conversationally corrected, explicitly saved once and revised in place", async ({ page }, testInfo) => {
  let calls = 0;
  await page.route("**/_serverFn/**", async route => { calls++; await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { ok: true, estimate: plate, model: "qwen/qwen3.8-27b", usage: { promptTokens: 2100, completionTokens: 300 } } }) }); });
  await start(page); await upload(page);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await expect(page.getByText("Was any oil or sauce added?", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Actually the chicken was 8 ounces, remove the broccoli, and add a tablespoon of olive oil.");
  await input.press("Enter");
  const review = page.getByRole("region", { name: "Meal photo review" });
  await expect(review.getByText("698 kcal", { exact: true })).toBeVisible();
  await expect(review.getByText("Olive Oil", { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath("food-photo-review.png"), fullPage: true });
  await input.fill("Looks good, save it."); await input.press("Enter");
  await expect(review.getByRole("button", { name: "Undo saved meal", exact: true })).toBeVisible();
  const first = (await readPersistedFitCoreState(page)).mealEntries[0];
  expect(first).toMatchObject({ calories: 698, protein: 73, carbs: 45, fat: 22, confirmed: true, source: "camera" });
  await input.fill("the rice was 2 cups"); await input.press("Enter");
  await expect(review.getByText("903 kcal", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Save corrected meal", exact: true }).dblclick();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries[0].calories).toBe(903);
  const saved = (await readPersistedFitCoreState(page)).mealEntries;
  expect(saved).toHaveLength(1); expect(saved[0].id).toBe(first.id);
  await review.getByRole("button", { name: "Undo saved meal", exact: true }).click();
  await expect.poll(async () => (await readPersistedFitCoreState(page)).mealEntries[0].calories).toBe(698);
  await page.reload(); expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(1);
});

test("photo rate limit and interrupted response leave ordinary text logging and stored records available", async ({ page }) => {
  await page.route("**/_serverFn/**", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { ok: false, error: "Synthetic Groq limit reached", code: "quota", retryAfterMs: 30000 } }) }));
  await start(page); await upload(page);
  await expect(page.getByText("Synthetic Groq limit reached", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Discard meal photo", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Jarvis message" });
  await input.fill("Log creatine"); await input.press("Enter");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  expect((await readPersistedFitCoreState(page)).supplementLogs).toHaveLength(1);
});
