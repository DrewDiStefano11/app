import { expect, test } from "@playwright/test";
import { gotoDashboard, seedMinimalOnboardedState } from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block" });

test("launch syncs in the background and Settings can sync again", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/whoop/sync", async (route) => {
    expect(route.request().method()).toBe("POST");
    requests++;
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/whoop/status", (route) =>
    route.fulfill({
      json: { status: "connected", lastSyncedAt: "2026-11-16T06:00:00Z" },
    }),
  );
  await seedMinimalOnboardedState(page);
  await gotoDashboard(page);
  await expect.poll(() => requests).toBeGreaterThan(0);
  await page.getByLabel("Settings").click();
  await page.getByRole("tab", { name: "Integrations", exact: true }).click();
  await expect(page.getByText(/^Last synced /)).toBeVisible();
  const sync = page.waitForRequest("**/api/whoop/sync");
  await page.getByRole("button", { name: "Sync Now" }).click();
  expect((await sync).method()).toBe("POST");
  await expect(page.getByText("WHOOP sync complete.")).toBeVisible();
});
