import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("Home Daily Heatmap Polish", () => {
  test("heatmap card polish, interactions, and mode descriptions", async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);

    // 1. Home is visible
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByText("Command Center")).toBeVisible();

    // 2. Daily View is active
    const dailyViewBtn = page.getByRole("button", { name: /daily view/i });
    await expect(dailyViewBtn).toHaveAttribute("aria-pressed", "true");

    // 3. Home heatmap card is visible
    const heatmapCard = page.getByRole("button", {
      name: "Open Body Heat Map details",
      exact: true,
    });
    await expect(heatmapCard).toHaveCount(1);
    await heatmapCard.scrollIntoViewIfNeeded();
    await expect(heatmapCard).toBeVisible();
    await expect(heatmapCard).toBeEnabled();

    // 4. "Tap to expand" is absent
    await expect(page.getByText("Tap to expand →")).not.toBeVisible();

    // 5. Opening card shows Body Heat Map
    await heatmapCard.click();
    const heatmapSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Body Heat Map", exact: true }),
    });
    await expect(heatmapSheet).toHaveCount(1);
    await expect(heatmapSheet).toBeVisible();
    await expect(
      heatmapSheet.getByRole("heading", { name: "Body Heat Map", exact: true }),
    ).toBeVisible();

    // 6. Exactly four modes
    const modes = ["Load", "Strength", "Imbalance", "Recovery"];
    for (const mode of modes) {
      await expect(page.getByRole("button", { name: mode, exact: true })).toBeVisible();
    }

    // 7 & 8 & 9. Mode selection, aria-pressed, descriptions, Strength color
    const MODE_DESCRIPTIONS = {
      Load: "Recent training volume and muscle stress over the last 7 days.",
      Strength: "Relative strength contribution by muscle over the last 30 days.",
      Imbalance: "Highlights muscles trained above or below your overall distribution.",
      Recovery: "Estimates which muscles are ready based on recent training load.",
    };

    for (const [mode, desc] of Object.entries(MODE_DESCRIPTIONS)) {
      const btn = page.getByRole("button", { name: mode, exact: true });
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText(desc, { exact: true })).toBeVisible();

      if (mode === "Strength") {
        await expect(page.locator(".heatmap-scale")).toHaveAttribute("data-mode", "strength");
      }
    }

    // 10. Front and Back maps remain present
    await expect(page.getByText("Front", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Back", { exact: true }).first()).toBeVisible();

    // 11 & 12. Muscle interaction and safe close
    const chestRegion = heatmapSheet.locator('.body-heatmap-region[aria-label*="Chest"]').first();
    await chestRegion.click();

    // Bottom sheets are portaled, target the last active sheet
    const muscleSheet = page.locator(".sheet-root").filter({
      has: page.getByRole("heading", { name: "Chest", exact: true }),
    });
    await expect(muscleSheet).toBeVisible();
    const chestHeading = muscleSheet.getByRole("heading", { name: "Chest", exact: true });
    await expect(chestHeading).toBeVisible();

    // Close muscle sheet
    const closeBtn = muscleSheet.getByRole("button").filter({ has: page.locator("svg") });
    await closeBtn.click();
    await expect(muscleSheet).not.toBeVisible();

    // Heatmap sheet is now the active one
    await expect(heatmapSheet).toBeVisible();

    // 13. Close heatmap sheet
    const heatmapCloseBtn = heatmapSheet.getByRole("button").filter({ has: page.locator("svg") });
    await heatmapCloseBtn.click();
    await expect(heatmapSheet).not.toBeVisible();

    // 14. Home navigation remains usable
    const settingsBtn = page.getByRole("button", { name: "Settings", exact: true });
    await settingsBtn.click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
