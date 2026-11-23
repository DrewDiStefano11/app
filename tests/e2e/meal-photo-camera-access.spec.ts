import { expect, test } from "@playwright/test";
import { seedMinimalOnboardedState, expectDashboardReady, readPersistedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });

test("Jarvis composer camera and Fuel Photo Log open native photo choices with preview and consent", async ({ page }) => {
  let providerRequests = 0;
  await page.route("**/_serverFn/**", route => { providerRequests++; return route.abort(); });
  await seedMinimalOnboardedState(page);
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Open AI composer", exact: true }).click();
  const camera = page.getByRole("button", { name: "Add meal photo", exact: true });
  await expect(camera).toBeVisible();
  const bounds = await camera.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await camera.click();
  await expect(page.getByRole("textbox", { name: "Message Jarvis", exact: true })).toBeHidden();
  const review = page.getByRole("region", { name: "Meal photo review" });
  await expect(review).toBeVisible();
  const take = review.getByLabel("Take food photo", { exact: true });
  const choose = review.getByLabel("Upload food photo", { exact: true });
  await expect(take).toHaveAttribute("capture", "environment");
  await expect(take).toHaveAttribute("accept", "image/*");
  await expect(choose).toHaveAttribute("accept", "image/*");
  await expect(choose).not.toHaveAttribute("capture");

  const capturing = page.waitForEvent("filechooser");
  await review.getByText("Take photo", { exact: true }).click();
  const capture = await capturing;
  expect(await capture.element().getAttribute("capture")).toBe("environment");
  const choosing = page.waitForEvent("filechooser");
  await review.getByText("Choose image", { exact: true }).click();
  await (await choosing).setFiles({ name: "synthetic-meal.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await expect(review.getByAltText("Food photo awaiting consent")).toBeVisible();
  await expect(review.getByRole("button", { name: "Estimate meal", exact: true })).toBeDisabled();
  expect(providerRequests).toBe(0);
  expect((await readPersistedFitCoreState(page)).mealEntries).toHaveLength(0);

  await review.getByRole("button", { name: "Discard meal photo", exact: true }).click();
  await page.keyboard.press("Escape");
  const expand = page.getByRole("button", { name: /Expand navigation/ });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Fuel", exact: true }).click();
  await page.getByRole("button", { name: "Log Meal", exact: true }).first().click();
  await page.getByRole("button", { name: "Photo Log", exact: true }).click();
  await expect(review).toBeVisible();
  await expect(review.getByText("Take photo", { exact: true })).toBeVisible();
  await expect(review.getByText("Choose image", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
