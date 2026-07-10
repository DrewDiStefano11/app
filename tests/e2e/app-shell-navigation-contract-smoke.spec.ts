import { test, expect } from "@playwright/test";
import { seedMinimalOnboardedState, gotoDashboard } from "./helpers/fitcore-test-state";

test.describe("App-shell navigation contract", () => {
  test.beforeEach(async ({ page }) => {
    await seedMinimalOnboardedState(page);
    await gotoDashboard(page);
  });

  test("bottom navigation contract", async ({ page }) => {
    // The canonical tabs
    // Note: The prompt asks to check exactly for labels Home, Training, Fuel/Nutrition, Recovery, Progress
    // We expect these exact names to fail if they are missing
    const homeTab = page.locator("nav").getByRole("button", { name: "Home", exact: true });
    const trainTab = page.locator("nav").getByRole("button", { name: "Training", exact: true });
    const fuelTab = page
      .locator("nav")
      .getByRole("button", { name: "Fuel/Nutrition", exact: true });
    const recoverTab = page.locator("nav").getByRole("button", { name: "Recovery", exact: true });
    const statsTab = page.locator("nav").getByRole("button", { name: "Progress", exact: true });

    // It is expected that this will fail since the app currently renders Train, Fuel, Recover, Stats
    // That is a legitimate defect exposed by the contract. We must leave the test strict.
    await expect(homeTab).toBeVisible();
    await expect(trainTab).toBeVisible();
    await expect(fuelTab).toBeVisible();
    await expect(recoverTab).toBeVisible();
    await expect(statsTab).toBeVisible();

    // Settings does not appear in the bottom navigation
    const settingsTab = page.getByRole("button", {
      name: "Settings",
      exact: true,
    });
    await expect(page.locator("nav").filter({ has: settingsTab })).toHaveCount(0);

    // Each bottom-tab control is keyboard reachable
    await page.keyboard.press("Tab");

    // Selecting a tab renders the intended screen and has selected-state semantics
    await trainTab.click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // According to the prompt: "selected-state semantics are available through the existing UI contract". We will assert aria-current or equivalent if it exists, otherwise it will fail as intended by the contract.
    await expect(trainTab).toHaveAttribute("aria-current", "page");
    await expect(homeTab).not.toHaveAttribute("aria-current", "page");

    await fuelTab.click();
    await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
    await expect(fuelTab).toHaveAttribute("aria-current", "page");

    await recoverTab.click();
    await expect(page.getByRole("heading", { name: "Recovery", exact: true })).toBeVisible();
    await expect(recoverTab).toHaveAttribute("aria-current", "page");

    await statsTab.click();
    await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();
    await expect(statsTab).toHaveAttribute("aria-current", "page");

    await homeTab.click();
    await expect(
      page.getByRole("button", {
        name: "Settings",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Command Center", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(homeTab).toHaveAttribute("aria-current", "page");

    // No duplicate visible bottom-tab controls exist
    await expect(homeTab).toHaveCount(1);
    await expect(trainTab).toHaveCount(1);
    await expect(fuelTab).toHaveCount(1);
    await expect(recoverTab).toHaveCount(1);
    await expect(statsTab).toHaveCount(1);

    // Switching repeatedly between tabs does not render duplicate views
    await trainTab.click();
    await fuelTab.click();
    await trainTab.click();
    await fuelTab.click();
    await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toHaveCount(0);

    // Bottom navigation remains clickable after ordinary screen interaction
    await homeTab.click();
    await expect(
      page.getByRole("button", {
        name: "Settings",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Command Center", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("Settings entry and return", async ({ page }) => {
    // From Home: locate the real Settings control and activate it
    const settingsBtn = page.getByRole("button", {
      name: "Settings",
      exact: true,
    });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Verify the title is exactly Settings
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    // Verify Settings is still absent from the bottom navigation
    await expect(
      page.locator("nav").getByRole("button", { name: "Settings", exact: true }),
    ).toHaveCount(0);

    // Activate Done
    await page.getByRole("button", { name: "Done", exact: true }).click();

    // Verify the user returns correctly (previously selected bottom-tab state is preserved)
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).not.toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Settings",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Command Center", {
        exact: true,
      }),
    ).toBeVisible();

    // Verify no invisible overlay remains
    await expect(page.locator(".sheet-root")).toHaveCount(0);

    // Verify normal navigation is immediately usable
    const trainTab = page.locator("nav").getByRole("button", { name: "Training", exact: true });

    // Not using if statement. If the button is covered by expand navigation, the test should fail as a real defect if it expects the tab to be exactly "Training".
    await trainTab.click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();
  });

  test("Layout-mode switching contract", async ({ page }) => {
    // Verify the real global display-mode control exposes Daily View and Deep Dive
    const dailyViewBtn = page.getByRole("button", {
      name: "Daily View",
      exact: true,
    });
    const deepDiveBtn = page.getByRole("button", {
      name: "Deep Dive",
      exact: true,
    });

    await expect(dailyViewBtn).toBeVisible();
    await expect(deepDiveBtn).toBeVisible();

    // Clearly indicates the active choice through existing semantics
    await expect(dailyViewBtn).toHaveAttribute("aria-pressed", "true");
    await expect(deepDiveBtn).toHaveAttribute("aria-pressed", "false");

    // Switches between the two modes
    await deepDiveBtn.click();
    await expect(dailyViewBtn).toHaveAttribute("aria-pressed", "false");
    await expect(deepDiveBtn).toHaveAttribute("aria-pressed", "true");

    // Does not navigate to a different bottom tab
    await expect(
      page.getByRole("button", {
        name: "Settings",
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText("Command Center", {
        exact: true,
      }),
    ).toBeVisible();
    const homeTab = page.locator("nav").getByRole("button", { name: "Home", exact: true });

    await expect(page.getByRole("heading", { name: "Training", exact: true })).toHaveCount(0);

    // Does not reset the selected bottom tab unexpectedly
    const trainTab = page.locator("nav").getByRole("button", { name: "Training", exact: true });

    await trainTab.click();
    await expect(page.getByRole("heading", { name: "Training", exact: true })).toBeVisible();

    // Verify mode persisted to next tab
    await expect(deepDiveBtn).toHaveAttribute("aria-pressed", "true");

    // Remains functional after opening and closing Settings
    await homeTab.click(); // Back to home where toggles are
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();

    await expect(deepDiveBtn).toHaveAttribute("aria-pressed", "true");
    await dailyViewBtn.click();
    await expect(dailyViewBtn).toHaveAttribute("aria-pressed", "true");
  });
});
