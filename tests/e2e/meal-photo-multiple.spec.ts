import { expect, test, type Page } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
const estimate = { name: "Consolidated meal", mealType: "lunch", recipeServings: 1, servingsEaten: 1, items: [{ id: "rice", name: "Rice", quantity: 1, unit: "cup", calories: 200, protein: 4, carbs: 44, fat: 0, evidence: "visible", preparation: "cooked" }], assumptions: ["Photos 1 and 2 show the same rice; count once. Photo 2 includes the label."], question: "Are these views of the same plate?" };
const consent = "Send selected photos, context and meal corrections to Groq";
async function start(page: Page, fuel = false) {
  await page.addInitScript(() => localStorage.setItem("fitcore.jarvis.groqApiKey.v1", "synthetic-test-key"));
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true, jarvisSettings: { allowCloudText: false } }));
  if (fuel) {
    await page.getByRole("button", { name: "Fuel", exact: true }).click();
    await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
    await page.getByRole("button", { name: "Photo Log", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
    await page.getByRole("button", { name: "Meal photo", exact: true }).click();
  }
  return page.getByRole("region", { name: "Meal photo review" });
}
for (const fuel of [false, true]) {
  test(`${fuel ? "Fuel" : "Jarvis"} combines library and camera images, replaces/removes and rejects invalid batches atomically`, async ({ page }) => {
    let calls = 0;
    await page.route("**/_serverFn/**", async route => {
      calls++;
      const body = route.request().postData() ?? "";
      expect(body.match(/data:image\/jpeg;base64,/g)).toHaveLength(2);
      expect(body).toContain("Same plate; label in photo 2");
      await route.fulfill({ json: { result: calls === 1 ? { ok: false, code: "provider_error", error: "Synthetic provider failure" } : { ok: true, estimate } } });
    });
    const review = await start(page, fuel);
    const choose = review.getByLabel("Upload food photo", { exact: true });
    await expect(choose).toHaveAttribute("multiple", "");
    await choose.setInputFiles([photo("angle.png"), photo("label.png")]);
    await expect(review.getByText("2 of 3 photos selected", { exact: true })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))); // Native camera/background transition.
    await review.getByLabel("Take food photo", { exact: true }).setInputFiles(photo("component.png"));
    await expect(review.getByText("3 of 3 photos selected", { exact: true })).toBeVisible();
    await expect(choose).toBeDisabled();
    await review.getByLabel("Replace food photo 1", { exact: true }).setInputFiles(photo("better-angle.png"));
    await expect(review.getByText("3 of 3 photos selected", { exact: true })).toBeVisible();
    await review.getByRole("button", { name: "Remove photo 3", exact: true }).click();
    await review.getByRole("button", { name: "Remove photo 2", exact: true }).click();
    await choose.setInputFiles([photo("valid.png"), { name: "bad.jpg", mimeType: "image/jpeg", buffer: Buffer.from("unreadable") }]);
    await expect(review.getByRole("alert")).toContainText("could not be opened");
    await expect(review.getByText("1 of 3 photos selected", { exact: true })).toBeVisible();
    await choose.setInputFiles(photo("label.png"));
    await expect(review.getByText("2 of 3 photos selected", { exact: true })).toBeVisible();
    await review.getByLabel("Meal context (optional)").fill("Same plate; label in photo 2");
    await review.getByLabel(consent).check();
    await review.getByRole("button", { name: "Analyze Photos", exact: true }).click();
    await expect(review.getByRole("alert")).toHaveText("Synthetic provider failure");
    await expect(review.getByAltText("Food photo 2 awaiting consent")).toBeVisible();
    await expect(review.getByLabel("Meal context (optional)")).toHaveValue("Same plate; label in photo 2");
    await review.getByRole("button", { name: "Analyze Photos", exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect(review.getByText("200 kcal", { exact: true })).toBeVisible();
    expect(calls).toBe(2);
    expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
    await page.getByRole("textbox", { name: "Jarvis message" }).fill("the rice was 2 cups");
    await page.getByRole("button", { name: "Send message to Jarvis", exact: true }).click();
    await expect(review.getByText("400 kcal", { exact: true })).toBeVisible();
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException("Synthetic quota", "QuotaExceededError"); };
      window.addEventListener("restore-writes", () => { Storage.prototype.setItem = write; }, { once: true });
    });
    await review.getByRole("button", { name: "Confirm and save meal", exact: true }).click();
    await expect(review.getByRole("alert")).toContainText("could not verify the save");
    await expect(review.getByText("400 kcal", { exact: true })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
    await review.getByRole("button", { name: "Confirm and save meal", exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect(review.getByRole("button", { name: "Meal saved", exact: true })).toBeDisabled();
    const stored = await readPersistedFitCoreState(page);
    expect(stored.mealEntries).toHaveLength(1);
    expect(stored.mealEntries[0]).toMatchObject({ calories: 400, protein: 8, carbs: 88, fat: 0 });
    expect(JSON.stringify(stored)).not.toContain("data:image");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("interrupted multi-photo analysis keeps attachments and context, ignores late responses and retries once", async ({ page }) => {
  let calls = 0;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/_serverFn/**", async route => {
    calls++;
    if (calls === 1) await held;
    await route.fulfill({ json: { result: { ok: true, estimate } } }).catch(() => {});
  });
  const review = await start(page);
  await review.getByLabel("Upload food photo", { exact: true }).setInputFiles([photo("angle.png"), photo("label.png")]);
  await expect(review.getByText("2 of 3 photos selected", { exact: true })).toBeVisible();
  await review.getByLabel("Meal context (optional)").fill("Same rice, two angles");
  await review.getByLabel(consent).check();
  await review.getByRole("button", { name: "Analyze Photos", exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(review.getByAltText("Food photo 2 awaiting consent")).toBeVisible();
  await expect(review.getByLabel("Meal context (optional)")).toHaveValue("Same rice, two angles");
  await expect(review.getByRole("button", { name: "Analyze Photos", exact: true })).toBeEnabled();
  release();
  await review.getByRole("button", { name: "Analyze Photos", exact: true }).click();
  await expect(review.getByText("200 kcal", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
});
