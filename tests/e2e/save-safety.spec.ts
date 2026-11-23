import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  seedRevisionedFitCoreState,
  readPersistedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
async function blockWrites(page: Page) {
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Synthetic quota", "QuotaExceededError");
    };
    window.addEventListener(
      "restore-writes",
      () => {
        Storage.prototype.setItem = write;
      },
      { once: true },
    );
  });
}
test("Home rejected meal save retains the draft and retries exactly once", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.getByRole("button", { name: "Log Meal", exact: true }).click();
  const sheet = page
    .locator(".sheet-surface")
    .filter({ has: page.getByRole("heading", { name: "Log Meal", exact: true }) });
  await sheet.getByPlaceholder("e.g. Chicken & rice").fill("Retry bowl");
  await sheet.getByText("Cal", { exact: true }).locator("..").locator("input").fill("500");
  await blockWrites(page);
  await sheet.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(sheet.getByRole("alert")).toContainText("Meal could not be saved");
  await expect(sheet.getByPlaceholder("e.g. Chicken & rice")).toHaveValue("Retry bowl");
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await sheet.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  const meals = (await readPersistedFitCoreState(page)).mealEntries;
  expect(meals).toHaveLength(1);
  expect(meals[0]).toMatchObject({ name: "Retry bowl", calories: 500, macroStatus: "unreported" });
});

test("progress photos are bounded locally and rejected saves retain the preview for retry", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  // A large, high-detail synthetic image exercises actual decoding and compression.
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 2000;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(2000, 2000);
    let seed = 7;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels.data[i] = seed & 255;
      pixels.data[i + 1] = (seed >>> 8) & 255;
      pixels.data[i + 2] = (seed >>> 16) & 255;
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await page.getByText("Add Update", { exact: true }).click();
  await page.getByRole("button", { name: "Add New Photo", exact: true }).click();
  const sheet = page
    .locator(".sheet-surface")
    .filter({ has: page.getByRole("heading", { name: "Add progress photo", exact: true }) });
  await sheet
    .locator('input[type="file"]')
    .setInputFiles({
      name: "synthetic.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(sheet.getByRole("button", { name: "Save photo", exact: true })).toBeEnabled();
  const preview = sheet.getByAltText("New progress photo preview");
  const compressed = await preview.getAttribute("src");
  expect(compressed!.length).toBeLessThanOrEqual(40000);
  expect(compressed).toMatch(/^data:image\/jpeg;base64,/);
  await blockWrites(page);
  await sheet.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(sheet.getByRole("alert")).toContainText("Photo could not be saved");
  await expect(preview).toHaveAttribute("src", compressed!);
  expect((await readPersistedFitCoreState(page)).progressPhotos).toHaveLength(0);
  await page.evaluate(() => window.dispatchEvent(new Event("restore-writes")));
  await sheet.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(sheet).toBeHidden();
  await page.reload();
  expect((await readPersistedFitCoreState(page)).progressPhotos).toHaveLength(1);
});
