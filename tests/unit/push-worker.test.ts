import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function worker() {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const shown: unknown[] = [];
  const focused: unknown[] = [];
  const messages: unknown[] = [];
  const opened: unknown[] = [];
  const receipt = new Set<string>();
  const existing = { url: "https://fitcore.test/", focus: async () => { focused.push(true); }, postMessage: (value: unknown) => messages.push(value) };
  const scope = { Notification: { permission: "granted" }, location: { origin: "https://fitcore.test" },
    addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) => { handlers[name] = fn; },
    registration: { showNotification: async (...args: unknown[]) => { shown.push(args); } },
    clients: { matchAll: async () => [existing], openWindow: async (url: string) => { opened.push(url); } } };
  const context: Record<string, unknown> = { self: scope, URL, Set, Date };

  // Dispatch validation and browser-facing behavior independently of IndexedDB.
  // The production browser regression uses real IndexedDB for atomic receipt semantics.
  (scope as typeof scope & { receiptOverride?: unknown }).receiptOverride = async (id: string, _expires: number, remove: boolean) => {
    if (remove) { receipt.delete(id); return false; }
    if (receipt.has(id)) return false;
    receipt.add(id); return true;
  };
  runInNewContext(readFileSync("public/sw.js", "utf8") + "\nnotificationReceipt = (...args) => self.receiptOverride(...args);", context);
  const dispatch = async (name: string, event: object) => {
    let pending: Promise<unknown> | undefined;
    handlers[name]({ ...event, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  };
  return { scope, shown, focused, messages, opened, existing, dispatch };
}
const payload = () => ({ version: 1, id: "reminder:2026-11-25:workout", kind: "workout", issuedAt: Date.now() - 1000, expiresAt: Date.now() + 60000 });

test("push validates contract, expiry and permission before generic delivery; duplicates collapse", async () => {
  const w = worker();
  const send = (data: unknown) => w.dispatch("push", { data: { json: () => data } });
  for (const invalid of [null, {}, { ...payload(), kind: "unknown" }, { ...payload(), expiresAt: Date.now() - 1 }, { ...payload(), expiresAt: Date.now() + 86400001 }, { ...payload(), issuedAt: Date.now() + 999999 }, { ...payload(), id: "https://evil.test" }]) await send(invalid);
  await w.dispatch("push", { data: { json: () => { throw Error("Malformed"); } } });
  expect(w.shown).toHaveLength(0);
  w.scope.Notification.permission = "denied";
  await send(payload());
  expect(w.shown).toHaveLength(0);
  w.scope.Notification.permission = "granted";
  const value = payload();
  await Promise.all([send(value), send(value)]);
  expect(w.shown).toHaveLength(1);
  expect(w.shown[0]).toMatchObject(["FitCore reminder", { data: { section: "training" } }]);
});

test("failed notification delivery releases its receipt for an explicit provider retry", async () => {
  const w = worker();
  const value = payload();
  const send = () => w.dispatch("push", { data: { json: () => value } });
  const show = w.scope.registration.showNotification;
  w.scope.registration.showNotification = async () => { throw Error("OS refused"); };
  await expect(send()).rejects.toThrow("OS refused");
  w.scope.registration.showNotification = show;
  await send();
  expect(w.shown).toHaveLength(1);
});

test("click focuses/messages an existing app without navigation, or opens an allowlisted section", async () => {
  const w = worker();
  let closed = false;
  await w.dispatch("notificationclick", { notification: { close: () => { closed = true; }, data: { section: "nutrition", url: "https://evil.test" } } });
  expect(closed).toBe(true);
  expect(w.messages).toEqual([{ type: "fitcore-notification-open", section: "nutrition" }]);
  expect(w.focused).toHaveLength(1);
  expect(w.opened).toEqual([]);
  w.scope.clients.matchAll = async () => [];
  await w.dispatch("notificationclick", { notification: { close: () => {}, data: { section: "https://evil.test" } } });
  expect(w.opened).toEqual(["/?notification=home"]);
});
