import { expect, test } from "@playwright/test";
import { currentFitCoreState, seedRevisionedFitCoreState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });
test("the navigation composer also expands, keeps unsent text and clears it only after sending", async ({
  page,
}) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.getByRole("button", { name: "Open AI composer", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Message Jarvis", exact: true });
  await expect(field).toHaveJSProperty("tagName", "TEXTAREA");
  const text = "Review today's training and meal records. ".repeat(12);
  await field.fill(text);
  await field.press("Enter");
  await expect(field).toHaveValue(text + "\n");
  expect((await field.boundingBox())!.height).toBeGreaterThan(70);
  await page.getByRole("button", { name: "Close AI composer", exact: true }).click();
  await page.getByRole("button", { name: "Open AI composer", exact: true }).click();
  await expect(field).toHaveValue(text + "\n");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 400 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(() => field.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(400);
  await field.fill("Log creatine");
  await page.getByRole("button", { name: "Send to Jarvis", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Jarvis message", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open AI composer", exact: true }).click();
  await expect(field).toHaveValue("");
});

test("editing a long Jarvis draft preserves its cursor and visible text during expansion", async ({
  page,
}, info) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.getByRole("button", { name: "Open Jarvis", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Jarvis message" });
  const text = Array.from(
    { length: 20 },
    (_, index) => `Line ${index + 1}: Review my saved meals.`,
  ).join("\n");
  await field.fill(text);
  await field.evaluate((element: HTMLTextAreaElement) => {
    element.setSelectionRange(element.value.length, element.value.length);
    element.scrollTop = element.scrollHeight;
  });
  await field.press("!");
  await expect(field).toHaveValue(text + "!");
  await expect(field).toBeFocused();
  expect(await field.evaluate((element: HTMLTextAreaElement) => element.selectionStart)).toBe(
    text.length + 1,
  );
  expect(await field.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  await field.evaluate((element: HTMLTextAreaElement) => {
    const cursor = element.value.indexOf("Line 10:") + 8;
    element.setSelectionRange(cursor, cursor);
  });
  await field.press("x");
  const cursor = text.indexOf("Line 10:") + 8;
  await expect(field).toHaveValue(text.slice(0, cursor) + "x" + text.slice(cursor) + "!");
  expect(await field.evaluate((element: HTMLTextAreaElement) => element.selectionStart)).toBe(
    cursor + 1,
  );
  await page.screenshot({ path: info.outputPath("jarvis-cursor-edit.png") });
});
