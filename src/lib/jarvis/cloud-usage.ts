const CLOUD_REQUESTS_KEY = "fitcore.jarvis.cloudTextRequests.v1";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MINUTE_LIMIT = 8;
const DAY_LIMIT = 80;

type RequestStorage = Pick<Storage, "getItem" | "setItem">;

export function reserveJarvisCloudTextRequest(storage: RequestStorage, now = Date.now()) {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(CLOUD_REQUESTS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return "Jarvis could not verify cloud usage for this browser.";
    const used = parsed.filter(
      (time): time is number => typeof time === "number" && time <= now && now - time < DAY,
    );
    if (used.length >= DAY_LIMIT)
      return "Jarvis reached its cloud text limit for this browser. Try again later.";
    if (used.filter((time) => now - time < MINUTE).length >= MINUTE_LIMIT) {
      return "Jarvis has sent several cloud requests in the last minute. Wait a moment and retry.";
    }
    storage.setItem(CLOUD_REQUESTS_KEY, JSON.stringify([...used, now]));
    return undefined;
  } catch {
    return "Jarvis could not verify cloud usage for this browser.";
  }
}
