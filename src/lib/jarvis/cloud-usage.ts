const CLOUD_REQUESTS_KEY = "fitcore.jarvis.cloudTextRequests.v1";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const MINUTE_LIMIT = 8;
const DAY_LIMIT = 80;

type RequestStorage = Pick<Storage, "getItem" | "setItem">;

function reserveRequest(storage: RequestStorage, now: number, key: string, minuteLimit: number, dayLimit: number, label: string) {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return "Jarvis could not verify cloud usage for this browser.";
    const used = parsed.filter(
      (time): time is number => typeof time === "number" && time <= now && now - time < DAY,
    );
    if (used.length >= dayLimit)
      return `Jarvis reached its ${label} limit for this browser. Try again later.`;
    if (used.filter((time) => now - time < MINUTE).length >= minuteLimit) {
      return "Jarvis has sent several cloud requests in the last minute. Wait a moment and retry.";
    }
    storage.setItem(key, JSON.stringify([...used, now]));
    return undefined;
  } catch {
    return "Jarvis could not verify cloud usage for this browser.";
  }
}


export function reserveJarvisCloudTextRequest(storage: RequestStorage, now = Date.now()) {
  return reserveRequest(storage, now, CLOUD_REQUESTS_KEY, MINUTE_LIMIT, DAY_LIMIT, "cloud text");
}

export function reserveJarvisVoiceRequest(storage: RequestStorage, now = Date.now()) {
  return reserveRequest(storage, now, "fitcore.jarvis.voiceRequests.v1", 4, 40, "voice transcription");
}
