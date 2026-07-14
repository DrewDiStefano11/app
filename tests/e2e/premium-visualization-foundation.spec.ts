import { expect, test } from "@playwright/test";

test.describe("premium visualization foundation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visualization-lab");
    await expect(page.getByRole("heading", { name: "Premium foundation" })).toBeVisible();
    await expect(page.locator("[data-hydrated='true']")).toBeAttached();
  });

  test("supports stack navigation, pin safety, suggestion dismissal, and accessible reordering", async ({
    page,
  }) => {
    await expect(page.getByText("Readiness rhythm · 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next chart" }).click();
    await expect(page.getByText("Sleep consistency · 2 of 3")).toBeVisible();
    await expect(page.getByText("Pinned", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Sleep consistency", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Pinned", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Customize analytics" }).first().click();
    await expect(page.getByRole("heading", { name: "Customize analytics" })).toBeVisible();
    await page.getByRole("button", { name: "Move Training volume up" }).click();
    await expect(
      page.locator(".sheet-root .premium-foundation-card").first().getByText("Training volume"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close Customize analytics" }).click();
  });

  test("toggles series, normalizes data, navigates dates by keyboard, and opens focus mode", async ({
    page,
  }) => {
    const sleepToggle = page.getByRole("button", { name: /Sleep hr/ }).first();
    await sleepToggle.click();
    await expect(sleepToggle).toHaveAttribute("aria-pressed", "false");
    await sleepToggle.click();

    const display = page.getByLabel("Display").first();
    await display.selectOption("normalized");
    await expect(display).toHaveValue("normalized");

    const chart = page.getByRole("img", { name: /Sleep vs readiness/ }).first();
    await chart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Sat", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Focus" }).click();
    await expect(
      page.locator(".sheet-root").getByRole("heading", { name: "Sleep vs readiness" }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/premium-foundation-focus-mode.png",
      fullPage: true,
    });
    await expect(page.getByRole("button", { name: "Save chart" })).toBeVisible();
    await page.getByRole("button", { name: "Data table" }).click();
    await expect(page.getByRole("columnheader", { name: "Readiness" })).toBeVisible();
    await page.getByRole("button", { name: "Close Sleep vs readiness" }).click();
    await expect(page.locator(".sheet-root")).not.toBeVisible();
  });

  test("renders honest quality states and remains overflow-safe", async ({ page }) => {
    await expect(page.getByText("Needs more data", { exact: true })).toBeVisible();
    await expect(page.getByText("Update needed", { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/Log three more recovery check-ins/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const transition = await page
      .locator(".premium-stack__item")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(["1e-05s", "0.00001s"]).toContain(transition.split(",")[0]);
  });
});

for (const width of [320, 360, 390, 430, 480]) {
  test(`has no page overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/visualization-lab");
    await expect(page.getByRole("heading", { name: "Premium foundation" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.screenshot({
      path: `test-results/premium-foundation-${testInfo.project.name}-${width}.png`,
      fullPage: true,
    });
  });
}
