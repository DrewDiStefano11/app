import type { WhoopSnapshot } from "./dashboard";

export const whoopApi = "/api/whoop";
export const whoopSnapshotChanged = "fitcore:whoop-snapshot-changed";

type Change = "updated" | "clear";
let liveSnapshot: (WhoopSnapshot & { version: string }) | null = null;
let liveExpiry: number | undefined;
let displayRevision = 0;
let initialized = false;
let channel: BroadcastChannel | undefined;

function clearLiveSnapshot() {
  window.clearTimeout(liveExpiry);
  liveSnapshot = null;
  displayRevision++;
}

function receiveChange(change: Change) {
  window.dispatchEvent(new CustomEvent(whoopSnapshotChanged, { detail: change }));
}

function initializeLiveDisplay() {
  if (initialized) return;
  initialized = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(whoopSnapshotChanged);
    channel.addEventListener("message", ({ data }) => {
      if (data !== "updated" && data !== "clear") return;
      clearLiveSnapshot();
      receiveChange(data);
    });
  }
  window.addEventListener("pagehide", clearLiveSnapshot);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") clearLiveSnapshot();
  });
}

export function announceWhoopSnapshot(change: Change) {
  initializeLiveDisplay();
  if (change === "clear") clearLiveSnapshot();
  receiveChange(change);
  channel?.postMessage(change);
}

export function subscribeToWhoopChanges(onChange: (change: Change) => void) {
  initializeLiveDisplay();
  const listener = (event: Event) => onChange((event as CustomEvent<Change>).detail);
  window.addEventListener(whoopSnapshotChanged, listener);
  return () => window.removeEventListener(whoopSnapshotChanged, listener);
}

export async function requestWhoopSync() {
  initializeLiveDisplay();
  const revision = displayRevision;
  const response = await fetch(whoopApi + "/sync", { method: "POST", cache: "no-store" });
  if (response.ok) {
    const live = response.status === 200 ? await response.json() : null;
    if (displayRevision === revision && document.visibilityState === "visible") {
      clearLiveSnapshot();
      const remaining = live ? Date.parse(live.accessExpiresAt) - Date.now() : 0;
      if (remaining > 0) {
        liveSnapshot = live;
        liveExpiry = window.setTimeout(() => {
          clearLiveSnapshot();
          receiveChange("updated");
        }, remaining);
      }
      announceWhoopSnapshot("updated");
    }
  } else if (response.status === 401 || response.status === 403) announceWhoopSnapshot("clear");
  return response;
}

export async function readWhoopSnapshot(signal: AbortSignal): Promise<WhoopSnapshot | null> {
  if (liveSnapshot) {
    const candidate = liveSnapshot;
    const response = await fetch(whoopApi + "/status", { cache: "no-store", signal });
    const status = response.ok ? await response.json() : null;
    if (candidate !== liveSnapshot || signal.aborted) return null;
    if (
      status?.version === candidate.version &&
      Date.parse(candidate.accessExpiresAt) > Date.now()
    ) {
      return candidate;
    }
    clearLiveSnapshot();
  }
  const response = await fetch(whoopApi + "/records", { cache: "no-store", signal });
  return response.ok ? response.json() : null;
}
