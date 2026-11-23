import { expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  readPersistedFitCoreState,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });

const now = Date.parse("2026-11-20T15:00:00Z");

type WhoopControl = {
  connected: boolean;
  failRefresh: boolean;
  denySync: number;
  score: number;
  hrv: number;
  strain: number;
  syncs: number;
  version: string;
};

// Trigger a foreground revalidate so the sync coordinator attempts a refresh.
async function nudgeForeground(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(500);
}

async function waitForRefreshToSettle(page: Page) {
  const expand = page.getByRole("button", { name: /Expand navigation/ });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Recover", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "WHOOP updated" })).toBeVisible();
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
}

async function syntheticWhoopContinuity(page: Page, initialScore = 80): Promise<WhoopControl> {
  const control: WhoopControl = {
    connected: true,
    failRefresh: false,
    denySync: 0,
    score: initialScore,
    hrv: 56.45,
    strain: 11.3,
    syncs: 0,
    version: "synthetic-continuity:1",
  };
  await page.clock.install({ time: new Date(now) });
  const snapshot = async () => {
    const current = await page.evaluate(() => Date.now());
    const at = new Date(now - 3600000).toISOString();
    const base = {
      source: "whoop",
      user_id: "1",
      created_at: at,
      updated_at: at,
      score_state: "SCORED",
      calibrating: false,
    };
    return {
      version: control.version,
      lastSyncedAt: new Date(current).toISOString(),
      accessExpiresAt: new Date(current + 600000).toISOString(),
      records: [
        {
          ...base,
          kind: "recovery",
          id: "rec-1",
          cycle_id: "cyc-1",
          sleep_id: "sleep-1",
          score: {
            recovery_score: control.score,
            hrv_rmssd_milli: control.hrv,
            resting_heart_rate: 51,
          },
        },
        {
          ...base,
          kind: "sleep",
          id: "sleep-1",
          cycle_id: "cyc-1",
          nap: false,
          start: new Date(now - 8 * 3600000).toISOString(),
          end: at,
          score: {
            sleep_performance_percentage: 91,
            respiratory_rate: 14.2,
            stage_summary: {
              total_light_sleep_time_milli: 14400000,
              total_slow_wave_sleep_time_milli: 3600000,
              total_rem_sleep_time_milli: 7200000,
              total_awake_time_milli: 600000,
              total_no_data_time_milli: 0,
            },
          },
        },
        {
          ...base,
          kind: "cycle",
          id: "cyc-1",
          start: at,
          step_count: 8234,
          score: { strain: control.strain },
        },
      ],
    };
  };
  let serverSnapshot: unknown = null;
  await page.route("**/api/whoop/status", async (route) => {
    return control.connected
      ? route.fulfill({
          json: {
            status: "connected",
            version: control.version,
            lastSyncedAt: new Date(now).toISOString(),
          },
        })
      : route.fulfill({ status: 401 });
  });
  await page.route("**/api/whoop/records", (route) => route.fulfill({ json: null }));
  await page.route("**/api/whoop/sync", async (route) => {
    control.syncs++;
    if (!control.connected) return route.fulfill({ status: 401 });
    if (control.failRefresh) return route.fulfill({ status: 502 });
    if (control.denySync)
      return route.fulfill({ status: control.denySync, headers: { "Retry-After": "300" } });
    serverSnapshot = await snapshot();
    return route.fulfill({ json: serverSnapshot, headers: { "Cache-Control": "no-store" } });
  });
  await seedRevisionedFitCoreState(
    page,
    currentFitCoreState({
      onboardingComplete: true,
      recoveryCheckIns: [
        { id: "check", createdAt: now - 60000, energy: 7, motivation: 7, soreness: 3, stress: 3 },
      ],
      sleepEntries: [
        { id: "manual-today", createdAt: now - 60000, hours: 2, quality: 2 },
        { id: "manual-before", createdAt: now - 86400000, hours: 9, quality: 8 },
      ],
    }),
  );
  await expectDashboardReady(page);
  // Initial foreground sync publishes the snapshot; recovery button proves it.
  await nudgeForeground(page);
  await expect(
    page.getByRole("button", { name: new RegExp(`^Recovery ${control.score}% · WHOOP`) }),
  ).toBeVisible();
  return control;
}

test.describe("WHOOP sync continuity", () => {
  test("valid authorized recovery data survives a failed refresh and is replaced on success", async ({
    page,
  }) => {
    const control = await syntheticWhoopContinuity(page, 80);

    // Authorized snapshot is displayed on Home.
    await expect(
      page.getByRole("button", { name: /^Recovery 80% · WHOOP/ }),
    ).toBeVisible();
    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("80%");

    // The ten-minute lease renews 15 seconds before expiry, not at the
    // two-minute minimum cooldown. Observe the actual failed response.
    control.failRefresh = true;
    const failedRefresh = page.waitForResponse((response) =>
      response.url().endsWith("/api/whoop/sync") && response.status() === 502,
    );
    await page.clock.fastForward(585000);
    await failedRefresh;
    await waitForRefreshToSettle(page);

    // Valid authorized data must NOT be blanked by a failed refresh.
    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("80%");
    await expect(
      page.getByRole("button", { name: /^Recovery 80% · WHOOP/ }),
    ).toBeVisible();

    // Wait out the failure cooldown, then trigger a refresh that succeeds with new data.
    control.failRefresh = false;
    control.score = 90;
    control.hrv = 64.9;
    const recovered = page.waitForResponse((response) =>
      response.url().endsWith("/api/whoop/sync") && response.status() === 200,
    );
    await page.clock.fastForward(121000);
    await recovered;

    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("90%");
    await expect(
      page.getByRole("button", { name: /^Recovery 90% · WHOOP/ }),
    ).toBeVisible();
  });

  test("timestamps are preserved across an interrupted refresh (no regression to empty)", async ({
    page,
  }) => {
    const control = await syntheticWhoopContinuity(page, 80);
    const before = await readPersistedFitCoreState(page);

    await expect(
      page.getByRole("button", { name: /^Recovery 80% · WHOOP/ }),
    ).toBeVisible();
    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("80%");

    // Observe a failed scheduled renewal, then a successful retry.
    control.failRefresh = true;
    const failedRefresh = page.waitForResponse((response) =>
      response.url().endsWith("/api/whoop/sync") && response.status() === 502,
    );
    await page.clock.fastForward(585000);
    await failedRefresh;
    await waitForRefreshToSettle(page);

    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("80%");

    control.failRefresh = false;
    control.score = 90;
    const recovered = page.waitForResponse((response) =>
      response.url().endsWith("/api/whoop/sync") && response.status() === 200,
    );
    await page.clock.fastForward(121000);
    await recovered;

    await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("90%");

    // Manual records are never touched by WHOOP sync interruptions.
    const state = await readPersistedFitCoreState(page);
    expect(state.sleepEntries).toEqual(before.sleepEntries);
  });
});
