import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  currentFitCoreState,
  expectDashboardReady,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
const now = Date.parse("2026-11-19T15:00:00Z");

async function syntheticWhoop(page: Page, initialScore = 80) {
  const control = {
    connected: true,
    version: "synthetic:1",
    score: initialScore,
    hrv: 56.45,
    lightHours: 4,
    strain: 11.3,
    syncs: 0,
    denySync: 0,
    state: "SCORED",
    lifetime: 120000,
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
      score_state: control.state,
      calibrating: false,
    };
    return {
      version: control.version,
      lastSyncedAt: new Date(current).toISOString(),
      accessExpiresAt: new Date(current + control.lifetime).toISOString(),
      records: [
        {
          ...base,
          kind: "recovery",
          id: "1",
          cycle_id: "1",
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
          cycle_id: "1",
          nap: false,
          start: new Date(now - 8 * 3600000).toISOString(),
          end: at,
          score: {
            sleep_performance_percentage: 91,
            respiratory_rate: 14.2,
            stage_summary: {
              total_light_sleep_time_milli: control.lightHours * 3600000,
              total_slow_wave_sleep_time_milli: 3600000,
              total_rem_sleep_time_milli: 2 * 3600000,
              total_awake_time_milli: 600000,
              total_no_data_time_milli: 0,
            },
          },
        },
        {
          ...base,
          kind: "cycle",
          id: "1",
          start: at,
          step_count: 8234,
          score: { strain: control.strain },
        },
        {
          ...base,
          kind: "workout",
          id: "activity-1",
          start: at,
          end: new Date(now - 1800000).toISOString(),
          sport_name: "Synthetic WHOOP Cycling",
          score: { strain: 8.4, average_heart_rate: 136, max_heart_rate: 165 },
        },
      ],
    };
  };
  await page.route("**/api/whoop/status", (route) =>
    control.connected
      ? route.fulfill({
          json: {
            status: "connected",
            version: control.version,
            lastSyncedAt: new Date(now).toISOString(),
          },
        })
      : route.fulfill({ status: 401 }),
  );
  await page.route("**/api/whoop/records", (route) => route.fulfill({ json: null }));
  await page.route("**/api/whoop/sync", async (route) => {
    control.syncs++;
    if (!control.connected) return route.fulfill({ status: 401 });
    if (control.denySync)
      return route.fulfill({ status: control.denySync, headers: { "Retry-After": "300" } });
    return route.fulfill({ json: await snapshot(), headers: { "Cache-Control": "no-store" } });
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
  await expect(
    page.getByRole("button", { name: new RegExp(`^Recovery ${control.score}% · WHOOP`) }),
  ).toBeVisible();
  return control;
}

async function recovery(page: Page) {
  const menu = page.getByRole("button", { name: /Expand navigation/ });
  if (await menu.isVisible()) await menu.click();
  await page.clock.runFor(1000);
  await page.getByRole("button", { name: "Recover", exact: true }).click();
}

async function evidence(page: Page, name: string) {
  const folder = process.env.FITCORE_WHOOP_EVIDENCE_DIR;
  if (!folder) return;
  await mkdir(folder, { recursive: true });
  await page.clock.runFor(1000);
  await page.screenshot({
    path: join(folder, `${test.info().project.name}-${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

test("native Home, Recovery and Sleep use one source, exact units and unique nights without persisting WHOOP", async ({
  page,
}) => {
  await syntheticWhoop(page, 80.5);
  await expect(page.locator(".home-orbit-score--recovery .home-orbit-value")).toHaveText("80.5%");
  await expect(page.getByRole("heading", { name: "WHOOP daily status" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Readiness 79/ })).toBeVisible();
  await page.clock.runFor(1000);
  await evidence(page, "native-home");
  await page.getByRole("button", { name: /^Readiness 79/ }).click();
  const sheet = page.locator(".sheet-surface").filter({ hasText: "14-day readiness history" });
  await expect(sheet.getByText(/70% WHOOP Recovery/)).toBeVisible();
  await sheet.getByRole("button", { name: "Close score details" }).click();
  await recovery(page);
  const health = page.getByLabel("Health measurements");
  await expect(health.getByText("56.45 ms", { exact: true })).toBeVisible();
  await expect(health.getByText("51 bpm", { exact: true })).toBeVisible();
  await expect(health.getByText("11.3", { exact: true })).toBeVisible();
  await expect(health.getByText("8234", { exact: true })).toBeVisible();
  await expect(page.getByText("7h 0m", { exact: true })).toBeVisible();
  await expect(page.getByText("8.0h", { exact: true })).toBeVisible();
  const sleep = page.getByLabel("Sleep measurements");
  await expect(sleep.getByText("91%", { exact: true })).toBeVisible();
  await expect(sleep.getByText("2h 0m", { exact: true })).toBeVisible();
  await expect(sleep.getByText("1h 0m", { exact: true })).toBeVisible();
  await expect(sleep.getByText("14.2 breaths/min", { exact: true })).toBeVisible();
  await evidence(page, "native-recovery");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Synthetic WHOOP Cycling",
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("56.45");
  const menu = page.getByRole("button", { name: /Expand navigation/ });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Deep Dive", exact: true }).click();
  await recovery(page);
  await page.getByText("Recent WHOOP recovery", { exact: true }).click();
  await page.getByText(/Synthetic WHOOP Cycling ·/).click();
  await expect(page.getByText("136 bpm", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Sleep", exact: true }).click();
  await expect(page.getByText("8.0h", { exact: true })).toBeVisible();
  await expect(page.getByText("Manual quality", { exact: true })).toBeVisible();
  await evidence(page, "native-sleep-history");
});

test("foreground renewals update native fields for over 30 minutes without manual refresh or navigation", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  for (let index = 1; index <= 16; index++) {
    const before = control.syncs;
    control.score = 80 + (index % 10);
    await page.clock.runFor(1000);
    await page.clock.fastForward(120000);
    await expect.poll(() => control.syncs).toBeGreaterThan(before);
    await expect(
      page.getByRole("button", { name: new RegExp(`^Recovery ${control.score}% · WHOOP`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(`^Readiness ${Math.round(0.7 * control.score + 0.3 * 75)} ·`),
      }),
    ).toBeVisible();
  }
  await recovery(page);
  const before = control.syncs;
  control.score = 97;
  control.hrv = 64.9;
  control.lightHours = 2;
  control.strain = 12.7;
  await page.clock.runFor(1000);
  await page.clock.fastForward(120000);
  await expect.poll(() => control.syncs).toBeGreaterThan(before);
  await expect(page.getByRole("button", { name: /^Recovery97|^Recovery 97/ })).toBeVisible();
  await expect(
    page.getByLabel("Health measurements").getByText("64.9 ms", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Health measurements").getByText("12.7", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5h 0m", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh WHOOP" })).toHaveCount(0);
});

test("expiry removes measured scores during rate limiting and automatically recovers at eligibility", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  control.denySync = 429;
  const limited = page.waitForResponse(
    (response) => response.url().endsWith("/api/whoop/sync") && response.status() === 429,
  );
  await page.clock.runFor(1000);
  await page.clock.fastForward(121000);
  await expect.poll(() => control.syncs).toBe(2);
  await limited;
  await page.clock.runFor(1000);
  await expect(page.getByRole("button", { name: /^Recovery 80/ })).toHaveCount(0);
  const before = control.syncs;
  await page.clock.fastForward(250000);
  expect(control.syncs).toBe(before);
  control.denySync = 0;
  control.score = 88;
  await page.clock.fastForward(51000);
  await expect(page.getByRole("button", { name: /^Recovery 88% · WHOOP/ })).toBeVisible();
});

test("lock clears every native WHOOP field and stops renewals without changing manual records", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  await recovery(page);
  await expect(page.getByText("56.45 ms", { exact: true })).toBeVisible();
  control.connected = false;
  await page.evaluate(() => {
    const channel = new BroadcastChannel("fitcore:whoop-snapshot-changed");
    channel.postMessage("clear");
    channel.close();
  });
  await expect(page.getByText("56.45 ms", { exact: true })).toHaveCount(0);
  await expect(page.getByText("7h 0m", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2h 0m", { exact: true })).toBeVisible();
  const before = control.syncs;
  await page.clock.fastForward(600000);
  expect(control.syncs).toBe(before);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain("manual-today");
});

test("changed provider revision clears stale measurements and the next automatic renewal restores them", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  control.version = "synthetic:2";
  control.score = 91;
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.getByRole("button", { name: /^Recovery 80/ })).toHaveCount(0);
  await page.clock.runFor(1000);
  await page.clock.fastForward(120000);
  await expect(page.getByRole("button", { name: /^Recovery 91% · WHOOP/ })).toBeVisible();
});

test("pending wearable scores remain unavailable and do not invent manual sleep quality", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  control.state = "PENDING_SCORE";
  await page.clock.runFor(1000);
  await page.clock.fastForward(120000);
  await expect(page.getByRole("button", { name: /^Recovery — · WHOOP · Pending/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Readiness —/ })).toBeVisible();
  await recovery(page);
  await expect(page.getByText("56.45 ms", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2h 0m", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Sleep measurements").getByText("91%", { exact: true })).toHaveCount(
    0,
  );
});

for (const action of ["Lock WHOOP settings", "Disconnect WHOOP"]) {
  test(`${action} stops native renewals and preserves manual entries`, async ({ page }) => {
    const control = await syntheticWhoop(page);
    await page.route("**/api/whoop/session", (route) => {
      control.connected = false;
      return route.fulfill({ status: 204 });
    });
    await page.route("**/api/whoop/disconnect", (route) => {
      control.connected = false;
      return route.fulfill({ json: { revoked: true } });
    });
    await page.getByLabel("Settings", { exact: true }).click();
    await page.getByRole("tab", { name: "Integrations", exact: true }).click();
    await page.getByRole("button", { name: action, exact: true }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Recovery 80/ })).toHaveCount(0);
    const before = control.syncs;
    await page.clock.fastForward(600000);
    expect(control.syncs).toBe(before);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain("manual-today");
  });
}
