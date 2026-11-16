import type { WhoopSnapshot } from "./dashboard";

export const whoopApi = "/api/whoop";
export const whoopSnapshotChanged = "fitcore:whoop-snapshot-changed";

export function announceWhoopSnapshot(change: "updated" | "clear") {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(whoopSnapshotChanged);
    channel.postMessage(change);
    channel.close();
    return;
  }
  window.dispatchEvent(new CustomEvent(whoopSnapshotChanged, { detail: change }));
}

export async function requestWhoopSync() {
  const response = await fetch(whoopApi + "/sync", { method: "POST", cache: "no-store" });
  if (response.ok) announceWhoopSnapshot("updated");
  else if (response.status === 401 || response.status === 403) announceWhoopSnapshot("clear");
  return response;
}

export async function readWhoopSnapshot(signal: AbortSignal): Promise<WhoopSnapshot | null> {
  const response = await fetch(whoopApi + "/records", { cache: "no-store", signal });
  return response.ok ? response.json() : null;
}
