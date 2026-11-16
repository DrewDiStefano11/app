export const whoopApi = "/api/whoop";

export async function requestWhoopSync() {
  return fetch(whoopApi + "/sync", { method: "POST", cache: "no-store" });
}
