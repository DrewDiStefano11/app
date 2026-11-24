import { spawn } from "node:child_process";
import { devices, expect, test, type Page } from "@playwright/test";
import {
  currentFitCoreState,
  expectDashboardReady,
  seedRevisionedFitCoreState,
} from "./helpers/fitcore-test-state";

test.skip(process.env.FITCORE_TEST_PRODUCTION_BUILD !== "1", "Requires the built Vercel artifact");

// This fixture serves the built Vercel API. Only the external provider/Neon HTTP
// transport are replaced; consent, authorization, SQL and encrypted disk storage run unchanged.
async function startArchiveServer() {
  const child = spawn(process.execPath, ["tests/e2e/helpers/whoop-archive-server.mjs"], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let output = "";
  const ready = new Promise<{ origin: string; accessKey: string }>((resolve, reject) => {
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
      const line = output.split(/\r?\n/).find((line) => line.startsWith("ARCHIVE_TEST_READY "));
      if (line) resolve(JSON.parse(line.slice("ARCHIVE_TEST_READY ".length)));
    });
    child.on("error", reject);
    child.on("exit", (code) => reject(new Error("Archive artifact host exited: " + code)));
  });
  const timeout = setTimeout(() => child.kill(), 40000);
  try {
    return { ...(await ready), child };
  } catch (error) {
    child.kill();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function section(page: Page, name: string) {
  const menu = page.getByRole("button", { name: /Expand navigation/ });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name, exact: true }).click();
}

test("encrypted SQL archive restores in a new browser process before WHOOP responds and survives failed refresh", async ({
  playwright,
  browserName,
}, testInfo) => {
  test.setTimeout(150000);
  const server = await startArchiveServer();
  const engine = playwright[browserName];
  const profile =
    browserName === "webkit"
      ? devices["iPhone 13"]
      : { viewport: { width: 390, height: 844 }, isMobile: true };
  let browser = await engine.launch();
  const options = {
    ...profile,
    baseURL: server.origin,
    ignoreHTTPSErrors: true,
    serviceWorkers: "block" as const,
    reducedMotion: "reduce" as const,
  };
  const controlContext = await playwright.request.newContext({
    baseURL: server.origin,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { "X-Synthetic-Control": "test-only" },
  });
  const control = async (change: object = {}) => {
    const response = await controlContext.post("/__test/control", { data: change });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  try {
    let context = await browser.newContext(options);
    let page = await context.newPage();
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        workouts: [],
        mealEntries: [],
        sleepEntries: [],
        checkIns: [],
      }),
    );
    await page.goto("/integrations/whoop");
    await page.getByLabel("FitCore integration access key").fill(server.accessKey);
    await page.getByRole("button", { name: "Unlock WHOOP settings" }).click();
    await expect(page.getByText("Connected to WHOOP", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Authorize private WHOOP history" }).click();
    await expect(
      page.getByText("Private history enabled and synchronized.", { exact: true }),
    ).toBeVisible();
    await expect.poll(async () => (await control()).count).toBe(4);
    const settings = page.getByRole("region", { name: "Private WHOOP history" });
    await expect(
      settings.getByText(/Authorized .*Personal display, history and fitness analysis/),
    ).toBeVisible();
    await expect(settings.getByRole("link", { name: "Export WHOOP history" })).toBeVisible();
    await page.goto("/");
    await expectDashboardReady(page);
    await expect(page.getByRole("button", { name: /^Recovery 80% · WHOOP/ })).toBeVisible();
    const stored = await context.storageState({ indexedDB: true });
    expect(JSON.stringify(stored)).not.toContain("recovery_score");
    expect(JSON.stringify(stored)).not.toContain("hrv_rmssd_milli");
    await browser.close(); // Ends every page/context and the actual engine process.
    const before = await control({ mode: "hold", resetCooldown: true, reopenDatabase: true });
    expect(before.archiveEnabled).toBe(true);
    expect(before.temporaryCacheEnabled).toBe(false);
    expect(before.count).toBe(4);

    browser = await engine.launch();
    context = await browser.newContext({ ...options, storageState: stored });
    page = await context.newPage();
    await page.clock.install();
    const heldSync = page.waitForRequest((request) => request.url().endsWith("/api/whoop/sync"));
    await page.goto("/");
    await expectDashboardReady(page);
    await expect(page.getByRole("button", { name: /^Recovery 80% · WHOOP/ })).toBeVisible();
    await heldSync;
    await section(page, "Recover");
    await expect(
      page.getByLabel("Health measurements").getByText("56.45 ms", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Health measurements").getByText("51 bpm", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "WHOOP last synced" })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("archive-restored-before-provider.png"),
      fullPage: true,
    });
    await section(page, "Home");
    const fresh = page.waitForResponse(
      (response) => response.url().endsWith("/api/whoop/sync") && response.status() === 204,
    );
    await control({ mode: "success", score: 90 });
    await fresh;
    await expect(page.getByRole("button", { name: /^Recovery 90% · WHOOP/ })).toBeVisible();
    expect((await control()).count).toBe(4);
    const saved = await (await page.request.get(server.origin + "/api/whoop/records")).json();

    await control({ mode: "failure", resetCooldown: true });
    const failed = page.waitForResponse(
      (response) => response.url().endsWith("/api/whoop/sync") && response.status() === 502,
    );
    await page.clock.fastForward(121000);
    await failed;
    await expect(page.getByRole("button", { name: /^Recovery 90% · WHOOP/ })).toBeVisible();
    const afterFailure = await (
      await page.request.get(server.origin + "/api/whoop/records")
    ).json();
    expect(afterFailure.lastSyncedAt).toBe(saved.lastSyncedAt);
    expect(afterFailure.records).toEqual(saved.records);
    expect((await control()).count).toBe(4);

    // Archive-only activation must process signed deletions without enabling cron.
    const deletion = await control({ deleteSleep: true, mode: "hold" });
    expect(deletion.deletionStatus).toBe(204);
    expect(deletion.count).toBe(2);
    await page.reload();
    await expectDashboardReady(page);
    await expect(page.getByRole("button", { name: /^Recovery 90% · WHOOP/ })).toHaveCount(0);

    await page.goto("/integrations/whoop");
    await page.getByRole("button", { name: "Withdraw storage consent" }).click();
    await page.getByRole("button", { name: "Keep history" }).click();
    expect((await control()).count).toBe(2);
    await page.getByRole("button", { name: "Withdraw storage consent" }).click();
    await page.getByRole("button", { name: "Delete WHOOP history" }).click();
    await expect(
      page.getByRole("button", { name: "Authorize private WHOOP history" }),
    ).toBeVisible();
    expect((await control()).count).toBe(0);
    expect(await (await page.request.get(server.origin + "/api/whoop/records")).json()).toBeNull();
  } finally {
    await browser.close();
    await controlContext.dispose();
    server.child.kill();
  }
});

test("historical import resumes from its encrypted SQL checkpoint after browser and database reopening", async ({
  playwright,
  browserName,
}, testInfo) => {
  test.setTimeout(120000);
  const server = await startArchiveServer();
  const engine = playwright[browserName];
  const options = {
    ...(browserName === "webkit"
      ? devices["iPhone 13"]
      : { viewport: { width: 390, height: 844 }, isMobile: true }),
    baseURL: server.origin,
    ignoreHTTPSErrors: true,
    serviceWorkers: "block" as const,
  };
  let browser = await engine.launch();
  const controlContext = await playwright.request.newContext({
    baseURL: server.origin,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { "X-Synthetic-Control": "test-only" },
  });
  const control = async (data = {}) => {
    const response = await controlContext.post("/__test/control", { data });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  try {
    let context = await browser.newContext(options);
    let page = await context.newPage();
    await seedRevisionedFitCoreState(
      page,
      currentFitCoreState({
        onboardingComplete: true,
        workouts: [],
        mealEntries: [],
        sleepEntries: [],
        checkIns: [],
      }),
    );
    await page.goto("/integrations/whoop");
    await page.getByLabel("FitCore integration access key").fill(server.accessKey);
    await page.getByRole("button", { name: "Unlock WHOOP settings" }).click();
    await page.getByRole("button", { name: "Authorize private WHOOP history" }).click();
    await expect(
      page.getByText("Private history enabled and synchronized.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Import available WHOOP history" }).click();
    await expect(
      page.getByText("recovery: 1 provider records processed across 1 pages · In progress", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pause historical import" }).click();
    await expect(page.getByRole("button", { name: "Resume historical import" })).toBeVisible();
    const stored = await context.storageState({ indexedDB: true });
    expect(JSON.stringify(stored)).not.toContain("recovery_score");
    await browser.close();
    await control({ reopenDatabase: true });
    browser = await engine.launch();
    context = await browser.newContext({ ...options, storageState: stored });
    page = await context.newPage();
    await page.goto("/integrations/whoop");
    await expect(
      page.getByText("recovery: 1 provider records processed across 1 pages · In progress", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Resume historical import" }).click();
    await expect(
      page.getByText("All available authorized history imported.", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    expect((await control()).count).toBe(8);
    const snapshot = await (await page.request.get(server.origin + "/api/whoop/records")).json();
    const historical = snapshot.records.filter(
      (record: { created_at: string }) => record.created_at === "2018-02-03T08:00:00.000Z",
    );
    expect(historical).toHaveLength(4);
    expect(
      historical.find((record: { kind: string }) => record.kind === "recovery").score
        .recovery_score,
    ).toBe(75);
    const progress = await (
      await page.request.get(server.origin + "/api/whoop/archive-import")
    ).json();
    expect(progress.progress.find((row: { kind: string }) => row.kind === "recovery").pages).toBe(
      2,
    );
    await page.screenshot({
      path: testInfo.outputPath("historical-import-complete.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
    await controlContext.dispose();
    server.child.kill();
  }
});
