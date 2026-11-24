import type { WhoopSnapshot } from "./dashboard";
import { createWhoopSyncCoordinator } from "./sync-coordinator";

export const whoopApi = "/api/whoop";
export const whoopSnapshotChanged = "fitcore:whoop-snapshot-changed";

type Change = "updated" | "clear";
let initialized = false;
let pageHidden = false;
let channel: BroadcastChannel | undefined;

function receiveChange(change: Change) {
  window.dispatchEvent(new CustomEvent(whoopSnapshotChanged, { detail: change }));
}

const coordinator = createWhoopSyncCoordinator({
  now: () => Date.now(),
  isOnline: () => navigator.onLine,
  setTimer(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
  },
  status: (signal) => fetch(whoopApi + "/status", { cache: "no-store", signal }),
  records: (signal) => fetch(whoopApi + "/records", { cache: "no-store", signal }),
  sync: (mode, signal) =>
    fetch(whoopApi + "/sync", {
      method: "POST",
      cache: "no-store",
      headers: { "X-FitCore-Whoop-Sync": mode },
      signal,
    }),
  onChange: receiveChange,
  onSync: () => channel?.postMessage("updated"),
  onAuthorizationLost: () => channel?.postMessage("clear"),
});

function foreground() {
  return !pageHidden && document.visibilityState === "visible";
}

function recheckForeground() {
  coordinator.setForeground(foreground());
  void coordinator.revalidate();
}

function initializeLiveDisplay() {
  if (initialized) return;
  initialized = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(whoopSnapshotChanged);
    channel.addEventListener("message", ({ data }) => {
      if (data === "clear" || data === "session") coordinator.invalidate();
      if (data === "updated") receiveChange("updated");
      if (data === "updated" || data === "session") recheckForeground();
    });
  }
  window.addEventListener("pagehide", () => {
    pageHidden = true;
    coordinator.setForeground(false);
  });
  window.addEventListener("pageshow", () => {
    pageHidden = false;
    recheckForeground();
  });
  window.addEventListener("focus", recheckForeground);
  window.addEventListener("online", recheckForeground);
  window.addEventListener("offline", recheckForeground);
  document.addEventListener("visibilitychange", recheckForeground);
  coordinator.setForeground(foreground());
}

export function startWhoopRefresh() {
  initializeLiveDisplay();
  coordinator.start();
  return () => coordinator.stop();
}

export function notifyWhoopSessionChanged() {
  initializeLiveDisplay();
  coordinator.invalidate();
  channel?.postMessage("session");
  recheckForeground();
}

export function announceWhoopSnapshot(change: Change) {
  initializeLiveDisplay();
  if (change === "clear") coordinator.invalidate();
  else receiveChange(change);
  channel?.postMessage(change);
}

export async function refreshWhoopArchive() {
  initializeLiveDisplay();
  await coordinator.revalidate();
  announceWhoopSnapshot("updated");
}

export function subscribeToWhoopChanges(onChange: (change: Change) => void) {
  initializeLiveDisplay();
  const listener = (event: Event) => onChange((event as CustomEvent<Change>).detail);
  window.addEventListener(whoopSnapshotChanged, listener);
  return () => window.removeEventListener(whoopSnapshotChanged, listener);
}

export function requestWhoopSync(mode: "automatic" | "manual" = "manual"): Promise<Response> {
  initializeLiveDisplay();
  coordinator.setForeground(foreground());
  return coordinator.requestSync(mode);
}

export function getWhoopSnapshot(): WhoopSnapshot | null {
  return typeof document !== "undefined" ? coordinator.getSnapshot() : null;
}

export function getWhoopRefreshing() {
  return typeof document !== "undefined" && foreground() && coordinator.getRefreshing();
}

export async function readWhoopSnapshot(signal: AbortSignal): Promise<WhoopSnapshot | null> {
  return signal.aborted ? null : getWhoopSnapshot();
}
