import { expect, test } from "@playwright/test";
import { currentFitCoreState, expectDashboardReady, seedRevisionedFitCoreState } from "./helpers/fitcore-test-state";

declare global {
  interface Window { notificationTestState: { permission: string; requests: number; shown: number; subscribed: boolean; removeFails: boolean }; }
}
test.use({ serviceWorkers: "block" });

async function mockNotifications(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const status = { permission: "default", requests: 0, shown: 0, subscribed: true, removeFails: true };
    Object.assign(window, { notificationTestState: status });
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    Object.defineProperty(window, "PushManager", { value: class {}, configurable: true });
    Object.defineProperty(window, "Notification", { configurable: true, value: {
      get permission() { return status.permission; },
      requestPermission: async () => { status.requests++; return status.permission; },
    } });
    const subscription = { expirationTime: Date.now() - 1, unsubscribe: async () => {
      if (status.removeFails) return false;
      status.subscribed = false; return true;
    } };
    const registration = { active: {}, pushManager: { getSubscription: async () => status.subscribed ? subscription : null },
      showNotification: async () => { status.shown++; } };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
      register: async () => registration, getRegistration: async () => registration,
      addEventListener: () => {}, removeEventListener: () => {}, controller: null,
    } });
  });
}

async function openSettings(page: import("@playwright/test").Page) {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await expectDashboardReady(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Preferences", exact: true }).click();
}

test("test notifications require an explicit gesture, disclose scheduling limits and recover from dismissed permission", async ({ page }) => {
  await mockNotifications(page);
  await openSettings(page);
  const region = page.getByRole("region", { name: "Device notifications" });
  await expect(region.getByText(/Scheduled push reminders are not enabled/)).toBeVisible();
  expect(await page.evaluate(() => window.notificationTestState.requests)).toBe(0);
  await region.getByRole("button", { name: "Send test notification" }).click();
  await expect(region.getByRole("status")).toContainText("permission was not granted");
  expect(await page.evaluate(() => window.notificationTestState.shown)).toBe(0);
  await page.evaluate(() => { window.notificationTestState.permission = "granted"; });
  await region.getByRole("button", { name: "Send test notification" }).click();
  await expect(region.getByRole("status")).toHaveText("Test notification sent. Scheduled push reminders remain off.");
  expect(await page.evaluate(() => window.notificationTestState.shown)).toBe(1);
});

test("expired browser subscriptions remain visible after failed removal and can be removed on retry", async ({ page }) => {
  await mockNotifications(page);
  await openSettings(page);
  const region = page.getByRole("region", { name: "Device notifications" });
  await expect(region.getByText(/expired push subscription/)).toBeVisible();
  const remove = region.getByRole("button", { name: "Remove device subscription" });
  await remove.click();
  await expect(region.getByRole("status")).toContainText("Could not remove");
  await expect(remove).toBeVisible();
  await page.evaluate(() => { window.notificationTestState.removeFails = false; });
  await remove.click();
  await expect(region.getByRole("status")).toContainText("subscription was removed");
  await expect(remove).toHaveCount(0);
  await expect(region.getByText(/No push subscription/)).toBeVisible();
});

test("push receipts persist atomically in real browser storage and a failed display permits retry", async ({ page, request }) => {
  await openSettings(page);
  const source = await (await request.get("/sw.js")).text();
  const results = await page.evaluate(async source => {
    const handlers: Record<string, (event: { data: { json: () => unknown }; waitUntil: (promise: Promise<unknown>) => void }) => void> = {};
    let shown = 0;
    let rejectDisplay = false;
    const scope = { Notification: { permission: "granted" },
      addEventListener: (name: string, handler: (event: { data: { json: () => unknown }; waitUntil: (promise: Promise<unknown>) => void }) => void) => { handlers[name] = handler; },
      registration: { showNotification: async () => { if (rejectDisplay) throw Error("Blocked"); shown++; } } };
    new Function("self", "indexedDB", source)(scope, indexedDB);
    const send = async (id: string) => {
      let pending: Promise<unknown> | undefined;
      handlers.push({ data: { json: () => ({ version: 1, id, kind: "workout", issuedAt: Date.now() - 1000, expiresAt: Date.now() + 60000 }) }, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
      await pending;
    };
    const id = `browser-${crypto.randomUUID()}`;
    await Promise.all([send(id), send(id)]);
    const afterConcurrent = shown;
    // New script scope simulates worker restart, retaining real IndexedDB receipts.
    new Function("self", "indexedDB", source)(scope, indexedDB);
    await send(id);
    const afterRestart = shown;
    rejectDisplay = true;
    try { await send(`${id}-retry`); } catch { /* Retriable display failure. */ }
    rejectDisplay = false;
    await send(`${id}-retry`);
    return { afterConcurrent, afterRestart, afterRetry: shown };
  }, source);
  expect(results).toEqual({ afterConcurrent: 1, afterRestart: 1, afterRetry: 2 });
});

test("notification deep links open the intended section without creating records", async ({ page }) => {
  await seedRevisionedFitCoreState(page, currentFitCoreState({ onboardingComplete: true }));
  await page.goto("/?notification=nutrition");
  await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/notification=/);
});
