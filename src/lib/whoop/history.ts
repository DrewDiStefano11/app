import type { WhoopSnapshot } from "./dashboard";
import { selectWhoopEvidence } from "./evidence";
import { addCalendarDays, calendarDaysWindow, dayKey, startOfDay } from "../analytics/date-time";

export const WHOOP_HISTORY_METRICS = {
  hrv: { label: "HRV", unit: "ms" },
  rhr: { label: "Resting heart rate", unit: "bpm" },
  recovery: { label: "WHOOP recovery", unit: "%" },
  sleepHours: { label: "Sleep duration", unit: "h" },
  sleepPerformance: { label: "Sleep performance", unit: "%" },
  strain: { label: "WHOOP strain", unit: "strain" },
} as const;
export type WhoopHistoryMetric = keyof typeof WHOOP_HISTORY_METRICS;
export type WhoopHistoryPoint = { date: string; timestamp: number; at: string; value: number };

/** One latest eligible observation per current-device local date, with no gap filling. */
export function whoopDailyHistory(
  snapshot: WhoopSnapshot | null | undefined,
  metric: WhoopHistoryMetric,
  days: number,
  now = Date.now(),
) {
  const summary = selectWhoopEvidence(snapshot, now);
  const range = calendarDaysWindow(days, now);
  const observations =
    metric === "hrv" || metric === "rhr" || metric === "recovery"
      ? (summary?.history ?? []).map((row) => ({
          id: row.id,
          at: row.at,
          state: row.state,
          value: metric === "hrv" ? row.hrvMs : metric === "rhr" ? row.restingHeartRate : row.score,
        }))
      : metric === "strain"
        ? (summary?.cycleHistory ?? []).map((row) => ({ ...row, value: row.strain }))
        : (summary?.sleepHistory ?? []).map((row) => ({
            ...row,
            value:
              metric === "sleepPerformance"
                ? row.performance
                : row.asleepMs === null
                  ? null
                  : row.asleepMs / 3600000,
          }));
  const dates = new Map<string, WhoopHistoryPoint>();
  // Selectors already order newest observations first. Keep that stable tie policy.
  for (const row of observations) {
    const at = Date.parse(row.at);
    if (
      row.state !== "scored" ||
      row.value === null ||
      !Number.isFinite(row.value) ||
      row.value < 0 ||
      ((metric === "recovery" || metric === "sleepPerformance") && row.value > 100) ||
      (metric === "sleepHours" && row.value > 24) ||
      !Number.isFinite(at) ||
      at < range.start ||
      at > now
    )
      continue;
    const date = dayKey(at);
    if (!dates.has(date))
      dates.set(date, { date, timestamp: startOfDay(at), at: row.at, value: row.value });
  }
  return [...dates.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/** Preserve actual x spacing and break lines over unobserved days. */
export function whoopHistoryChartPoints(points: WhoopHistoryPoint[]) {
  return points.flatMap((point, index) => {
    const previous = points[index - 1];
    const nextDay = previous ? addCalendarDays(previous.timestamp, 1) : point.timestamp;
    return nextDay < point.timestamp ? [{ timestamp: nextDay, value: null }, point] : [point];
  });
}

export function allHistoryDays(timestamps: number[], now = Date.now()) {
  const first = timestamps.reduce(
    (earliest, at) =>
      Number.isFinite(at) && at > 0 && at <= now ? Math.min(earliest, at) : earliest,
    now,
  );
  const calendar = (at: number) => {
    const date = new Date(at);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.max(1, Math.round((calendar(now) - calendar(first)) / 86400000) + 1);
}
