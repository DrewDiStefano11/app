import type { AppState } from "../types";
import { addCalendarDays, dayKey, startOfDay } from "../analytics/date-time";
import { getWhoopDashboard, type WhoopSnapshot } from "./dashboard";

/** Pure, transient selection. Never writes imported observations into AppState. */
export function selectWhoopEvidence(snapshot: WhoopSnapshot | null | undefined, now = Date.now()) {
  if (
    !snapshot ||
    !(Date.parse(snapshot.accessExpiresAt) > now) ||
    !Number.isFinite(Date.parse(snapshot.lastSyncedAt)) ||
    Date.parse(snapshot.lastSyncedAt) > now
  )
    return null;
  return getWhoopDashboard(
    snapshot.records,
    (at) => Number.isFinite(Date.parse(at)) && Date.parse(at) <= now,
  );
}

export function currentWhoopRecovery(snapshot: WhoopSnapshot | null | undefined, now = Date.now()) {
  return recoveryAsOf(selectWhoopEvidence(snapshot, now), now);
}

export function recoveryAsOf(summary: ReturnType<typeof selectWhoopEvidence>, now: number) {
  const recovery = summary?.history.find((row) => Date.parse(row.at) <= now);
  if (!recovery || Date.parse(recovery.at) < now - 48 * 3600000) return null;
  return {
    ...recovery,
    score:
      recovery.state === "scored" && recovery.score !== null && recovery.score <= 100
        ? recovery.score
        : null,
  };
}

export type SleepObservation = {
  date: string;
  id: string;
  at: number;
  hours: number;
  quality: number | null;
  source: "whoop" | "manual";
};

export function selectSleepEvidence(
  state: AppState,
  snapshot?: WhoopSnapshot | null,
  now = Date.now(),
) {
  if (state.demoMode) snapshot = null;
  const first = addCalendarDays(startOfDay(now), -6);
  const nights = new Map<string, SleepObservation>();
  const validManual = state.sleepEntries.filter(
    (row) =>
      Number.isFinite(row.createdAt) &&
      row.createdAt > 0 &&
      row.createdAt <= now &&
      Number.isFinite(row.hours) &&
      row.hours >= 0 &&
      row.hours <= 24 &&
      row.provenance?.confirmation !== "unconfirmed" &&
      (row.provenance?.source !== "ai-estimated" || row.provenance.confirmation === "confirmed"),
  );
  const manualIds = new Map<string, (typeof validManual)[number]>();
  for (const row of validManual) {
    if (!manualIds.has(row.id) || manualIds.get(row.id)!.createdAt < row.createdAt)
      manualIds.set(row.id, row);
  }
  const manualNights = new Map<string, SleepObservation>();
  for (const row of [...manualIds.values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  )) {
    const date = dayKey(row.createdAt);
    const observation: SleepObservation = {
      date,
      id: row.id,
      at: row.createdAt,
      hours: row.hours,
      quality:
        Number.isFinite(row.quality) && row.quality >= 1 && row.quality <= 10 ? row.quality : null,
      source: "manual",
    };
    nights.set(date, observation);
    manualNights.set(date, observation);
  }
  // getWhoopDashboard resolves corrected IDs and excludes naps/unknown nap classification.
  for (const row of [...(selectWhoopEvidence(snapshot, now)?.sleepHistory ?? [])].reverse()) {
    const at = Date.parse(row.at);
    if (
      row.end === null ||
      row.asleepMs === null ||
      row.asleepMs < 0 ||
      row.asleepMs > 24 * 3600000 ||
      row.state !== "scored"
    )
      continue;
    const date = dayKey(at);
    const previous = nights.get(date);
    if (
      previous?.source === "whoop" &&
      (previous.at > at || (previous.at === at && previous.id.localeCompare(row.id) > 0))
    )
      continue;
    nights.set(date, {
      date,
      id: row.id,
      at,
      hours: row.asleepMs / 3600000,
      quality: null,
      source: "whoop",
    });
  }
  const allNights = [...nights.values()].sort((a, b) => a.at - b.at);
  const sorted = allNights.filter((row) => row.at >= first);
  const history = Array.from({ length: 7 }, (_, index) => {
    const at = addCalendarDays(startOfDay(now), index - 6);
    return { date: dayKey(at), at, observation: nights.get(dayKey(at)) ?? null };
  });
  const qualities = [...manualNights.values()].flatMap((row) =>
    row.at >= first && row.quality !== null ? [row.quality] : [],
  );
  return {
    allNights,
    nights: sorted,
    history,
    last: allNights.at(-1) ?? null,
    averageHours: sorted.length
      ? sorted.reduce((sum, row) => sum + row.hours, 0) / sorted.length
      : null,
    manualQuality: qualities.length
      ? qualities.reduce((sum, value) => sum + value, 0) / qualities.length
      : null,
  };
}
