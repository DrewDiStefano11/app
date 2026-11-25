import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { WhoopSnapshot } from "../../src/lib/whoop/dashboard";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  currentFitCoreState,
  expectDashboardReady,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.use({ serviceWorkers: "block", reducedMotion: "reduce" });
const now = Date.parse("2026-11-19T15:00:00Z");

async function syntheticWhoop(page: Page, initialScore = 80, lifetime = 120000) {
  const control = {
    connected: true,
    version: "synthetic:1",
    lastDeletedAt: null as string | null,
    score: initialScore,
    hrv: 56.45,
    lightHours: 4,
    strain: 11.3,
    syncs: 0,
    denySync: 0,
    retryAfter: "300",
    state: "SCORED",
    lifetime,
    statusFailure: 0,
    holdSync: false,
    holdStatus: false,
    restoreServer: false,
    releaseStatus: null as (() => void) | null,
    releaseSync: null as (() => void) | null,
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
  let serverSnapshot: unknown = null;
  await page.route("**/api/whoop/status", async (route) => {
    if (control.holdStatus)
      await new Promise<void>((resolve) => {
        control.releaseStatus = resolve;
      });
    return control.statusFailure
      ? route.fulfill({ status: control.statusFailure, headers: { "Retry-After": "600" } })
      : control.connected
        ? route.fulfill({
            json: {
              status: "connected",
              version: control.version,
              lastDeletedAt: control.lastDeletedAt,
              lastSyncedAt: new Date(now).toISOString(),
            },
          })
        : route.fulfill({ status: 401 });
  });
  await page.route("**/api/whoop/records", (route) =>
    route.fulfill({
      json: control.restoreServer ? serverSnapshot : null,
      headers: { "Cache-Control": "no-store" },
    }),
  );
  await page.route("**/api/whoop/sync", async (route) => {
    control.syncs++;
    if (control.holdSync)
      await new Promise<void>((resolve) => {
        control.releaseSync = resolve;
      });
    if (!control.connected) return route.fulfill({ status: 401 });
    if (control.denySync)
      return route.fulfill({
        status: control.denySync,
        headers: { "Retry-After": control.retryAfter },
      });
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
  await expect(
    page.getByRole("button", { name: new RegExp(`^Recovery ${control.score}% · WHOOP`) }),
  ).toBeVisible();
  return control;
}

test("valid WHOOP measurements survive a delayed renewal and transient status failure until authorized expiry", async ({
  page,
}) => {
  const control = await syntheticWhoop(page, 80, 300000);
  const value = page.locator(".home-orbit-score--recovery .home-orbit-value");
  await expect(value).toHaveText("80%");
  control.holdSync = true;
  control.score = 83;
  await page.clock.runFor(285000);
  await expect.poll(() => Boolean(control.releaseSync)).toBe(true);
  await expect(value).toHaveText("80%");
  control.holdSync = false;
  control.releaseSync!();
  await expect(value).toHaveText("83%");
  control.statusFailure = 503;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(1000);
  await expect(value).toHaveText("83%");
  await page.clock.runFor(300000);
  await expect(value).not.toHaveText("83%");
  await expect(page.getByRole("button", { name: "Open AI composer", exact: true })).toBeVisible();
});

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

test("provider deletion clears stale measurements and the next automatic renewal restores them", async ({
  page,
}) => {
  const control = await syntheticWhoop(page);
  control.version = "synthetic:2";
  control.lastDeletedAt = await page.evaluate(() => new Date().toISOString());
  control.score = 91;
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.getByRole("button", { name: /^Recovery 80/ })).toHaveCount(0);
  await page.clock.runFor(1000);
  await page.clock.fastForward(120000);
  await expect(page.getByRole("button", { name: /^Recovery 91% · WHOOP/ })).toBeVisible();
});

test("ordinary provider revision retains native fields through replacement and rate limiting", async ({
  page,
}) => {
  const control = await syntheticWhoop(page, 80, 600000);
  control.version = "synthetic:2";
  control.score = 91;
  control.hrv = 63;
  control.holdSync = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: /^Recovery 80% · WHOOP/ })).toBeVisible();
  await page.clock.runFor(120000);
  await expect.poll(() => Boolean(control.releaseSync)).toBe(true);
  await recovery(page);
  await expect(
    page.getByLabel("Health measurements").getByText("56.45 ms", { exact: true }),
  ).toBeVisible();
  control.holdSync = false;
  control.releaseSync!();
  await expect(
    page.getByLabel("Health measurements").getByText("63 ms", { exact: true }),
  ).toBeVisible();
  control.denySync = 429;
  control.retryAfter = "120";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(120000);
  await expect(
    page.getByLabel("Health measurements").getByText("63 ms", { exact: true }),
  ).toBeVisible();
  const menu = page.getByRole("button", { name: /Expand navigation/ });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Recovery 91% · WHOOP/ })).toBeVisible();
});

for (const permission of ["authorized", "expired", "revoked"] as const) {
  test(`new browser process handles ${permission} server evidence and refreshes only when authorized`, async ({
    playwright,
    browserName,
    baseURL,
  }) => {
    // Two isolated engine launches, IndexedDB export/import and gated-route teardown
    // need more headroom than a single-page interaction on shared CI runners.
    test.setTimeout(60_000);
    const engine = playwright[browserName];
    const profile =
      browserName === "webkit"
        ? devices["iPhone 13"]
        : { viewport: { width: 390, height: 844 }, isMobile: true };
    const initialBrowser = await engine.launch();
    let saved: WhoopSnapshot & { version: string };
    let storageState: Awaited<
      ReturnType<import("@playwright/test").BrowserContext["storageState"]>
    >;
    try {
      const context = await initialBrowser.newContext({
        ...profile,
        baseURL,
        serviceWorkers: "block",
      });
      const initialPage = await context.newPage();
      const firstSync = initialPage.waitForResponse(
        (response) => response.url().endsWith("/api/whoop/sync") && response.status() === 200,
      );
      await syntheticWhoop(initialPage, 80, 600000);
      saved = await (await firstSync).json();
      storageState = await context.storageState({ indexedDB: true });
      expect(JSON.stringify(storageState)).not.toContain("recovery_score");
      expect(JSON.stringify(storageState)).not.toContain("hrv_rmssd_milli");
    } finally {
      // Close the entire engine process, including every JavaScript context.
      await initialBrowser.close();
    }
    const restartedBrowser = await engine.launch();
    let releaseStatus = () => {};
    let releaseSync = () => {};
    const statusGate = new Promise<void>((resolve) => {
      releaseStatus = resolve;
    });
    const syncGate = new Promise<void>((resolve) => {
      releaseSync = resolve;
    });
    let restartedContext: BrowserContext | undefined;
    try {
      const context = await restartedBrowser.newContext({
        ...profile,
        baseURL,
        storageState: storageState!,
        serviceWorkers: "block",
      });
      restartedContext = context;
      const restarted = await context.newPage();
      const restartedAt =
        permission === "expired" ? Date.parse(saved.accessExpiresAt) + 1 : now + 30000;
      await restarted.clock.install({ time: new Date(restartedAt) });
      await restarted.route("**/api/whoop/status", async (route) => {
        await statusGate;
        await route.fulfill(
          permission === "revoked"
            ? { status: 403 }
            : { json: { status: "connected", version: saved.version, lastDeletedAt: null } },
        );
      });
      let recordsRead = false;
      await restarted.route("**/api/whoop/records", async (route) => {
        recordsRead = true;
        await route.fulfill(
          permission === "revoked"
            ? { status: 403 }
            : { json: saved, headers: { "Cache-Control": "no-store" } },
        );
      });
      let syncing = false;
      await restarted.route("**/api/whoop/sync", async (route) => {
        syncing = true;
        await syncGate;
        await route.fulfill({
          json: {
            ...saved,
            lastSyncedAt: new Date(restartedAt).toISOString(),
            accessExpiresAt: new Date(restartedAt + 600000).toISOString(),
            records: saved.records.map((record) =>
              record.kind === "recovery"
                ? { ...record, score: { ...record.score, recovery_score: 91, hrv_rmssd_milli: 63 } }
                : record,
            ),
          },
          headers: { "Cache-Control": "no-store" },
        });
      });
      await restarted.goto("/");
      await expectDashboardReady(restarted);
      await expect.poll(() => recordsRead).toBe(true);
      const value = restarted.locator(".home-orbit-score--recovery .home-orbit-value");
      if (permission === "authorized") await expect(value).toHaveText("80%");
      else
        await expect(restarted.getByRole("button", { name: /^Recovery 80% · WHOOP/ })).toHaveCount(
          0,
        );
      releaseStatus();
      if (permission === "revoked") {
        await restarted.clock.runFor(120000);
        expect(syncing).toBe(false);
      } else {
        await expect.poll(() => syncing).toBe(true);
        if (permission === "authorized") await expect(value).toHaveText("80%");
        releaseSync();
        await expect(value).toHaveText("91%");
        await recovery(restarted);
        await expect(
          restarted.getByLabel("Health measurements").getByText("63 ms", { exact: true }),
        ).toBeVisible();
      }
      const persisted = JSON.stringify(await context.storageState({ indexedDB: true }));
      expect(persisted).not.toContain("recovery_score");
      expect(persisted).not.toContain("hrv_rmssd_milli");
      expect(await restarted.evaluate(() => JSON.stringify(sessionStorage))).not.toContain(
        "recovery_score",
      );
      expect(await restarted.evaluate(() => caches.keys())).toEqual([]);
    } finally {
      releaseStatus();
      releaseSync();
      // A revoked records response can abort the still-gated status request.
      // Drain its route callback before terminating WebKit's network process.
      await restartedContext?.unrouteAll({ behavior: "wait" });
      await restartedContext?.close();
      await restartedBrowser.close();
    }
  });
}

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

for (const away of [30000, 300000]) {
  test(`WHOOP survives iPhone-style hide/resume after ${away / 1000} seconds before status completes`, async ({
    page,
  }) => {
    const control = await syntheticWhoop(page, 80, 600000);
    const value = page.locator(".home-orbit-score--recovery .home-orbit-value");
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });
    await page.clock.runFor(away);
    control.holdStatus = true;
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(value).toHaveText("80%");
    await expect.poll(() => Boolean(control.releaseStatus)).toBe(true);
    expect(control.syncs).toBe(1);
    control.holdStatus = false;
    control.releaseStatus!();
    if (away === 300000) await expect.poll(() => control.syncs).toBe(2);
  });
}

test("offline return retains valid WHOOP evidence, reconnect refreshes, and expiry never extends", async ({
  page,
}) => {
  const control = await syntheticWhoop(page, 80, 600000);
  const value = page.locator(".home-orbit-score--recovery .home-orbit-value");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("pagehide"));
  });
  await page.clock.runFor(300000);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(value).toHaveText("80%");
  expect(control.syncs).toBe(1);
  control.score = 87;
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
  });
  await expect(value).toHaveText("87%");
  control.statusFailure = 503;
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
  await page.clock.runFor(600000);
  await expect(value).not.toHaveText("87%");
});

test("cold JS startup restores the authorized server snapshot before status and fresh sync", async ({
  page,
}) => {
  const control = await syntheticWhoop(page, 80, 600000);
  control.restoreServer = true;
  control.holdStatus = true;
  control.holdSync = true;
  control.score = 91;
  await page.reload();
  const value = page.locator(".home-orbit-score--recovery .home-orbit-value");
  await expect(value).toHaveText("80%");
  await expect.poll(() => Boolean(control.releaseStatus)).toBe(true);
  expect(control.syncs).toBe(1);
  control.holdStatus = false;
  control.releaseStatus!();
  await expect.poll(() => Boolean(control.releaseSync)).toBe(true);
  await expect(value).toHaveText("80%");
  control.holdSync = false;
  control.releaseSync!();
  await expect(value).toHaveText("91%");
  const stored = await page.evaluate(() =>
    JSON.stringify({ local: localStorage, session: sessionStorage }),
  );
  expect(stored).not.toContain("hrv_rmssd_milli");
  expect(stored).not.toContain("recovery_score");
});

test("cold live-only restart automatically restores after the server's remaining cooldown", async ({
  page,
}) => {
  const control = await syntheticWhoop(page, 80, 600000);
  control.denySync = 409;
  control.retryAfter = "10";
  control.holdSync = true;
  control.releaseSync = null;
  await page.reload();
  await expect.poll(() => Boolean(control.releaseSync)).toBe(true);
  await recovery(page);
  await expect(page.getByRole("status").filter({ hasText: "WHOOP refreshing" })).toBeVisible();
  const conflict = page.waitForResponse(
    (response) => response.url().endsWith("/api/whoop/sync") && response.status() === 409,
  );
  control.holdSync = false;
  control.releaseSync!();
  await conflict;
  await expect(page.getByRole("status").filter({ hasText: "WHOOP refreshing" })).toBeHidden();
  expect(control.syncs).toBe(2);
  control.denySync = 0;
  control.score = 91;
  await page.clock.runFor(8000);
  expect(control.syncs).toBe(2);
  await page.clock.runFor(3000);
  await expect.poll(() => control.syncs).toBe(3);
  const expand = page.getByRole("button", { name: /Expand navigation/ });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Recovery 91% · WHOOP/ })).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.stringify({ local: localStorage, session: sessionStorage }),
  );
  expect(stored).not.toContain("hrv_rmssd_milli");
  expect(stored).not.toContain("recovery_score");
});
