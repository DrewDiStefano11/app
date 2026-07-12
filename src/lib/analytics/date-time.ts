import { safeNumber } from "./safe-math";

export const DAY_MS = 86_400_000;

export interface DateRange {
  /** Inclusive local timestamp boundary. */
  start: number;
  /** Exclusive local timestamp boundary. */
  end: number;
}

export interface DailySeriesPoint<T> {
  dayKey: string;
  timestamp: number;
  value: T;
}

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function isValidTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && !Number.isNaN(new Date(value).getTime())
  );
}

function normalizedTimestamp(value: unknown): number {
  return isValidTimestamp(value) ? value : 0;
}

/** Returns the local calendar-day boundary for a timestamp. */
export function startOfDay(timestamp = Date.now()): number {
  const date = new Date(normalizedTimestamp(timestamp));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Adds local calendar days without assuming every day is exactly 24 hours. */
export function addCalendarDays(timestamp: number, days: number): number {
  const date = new Date(startOfDay(timestamp));
  date.setDate(date.getDate() + Math.trunc(safeNumber(days)));
  return date.getTime();
}

/** Returns a stable local YYYY-MM-DD key, or an empty key for an invalid timestamp. */
export function dayKey(timestamp: unknown): string {
  if (!isValidTimestamp(timestamp)) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds a local calendar-day range ending after today. `daysBefore` offsets
 * the range into the past, allowing adjacent current/previous windows.
 */
export function calendarDaysWindow(days: number, now = Date.now(), daysBefore = 0): DateRange {
  const count = Math.max(0, Math.trunc(safeNumber(days)));
  const offset = Math.max(0, Math.trunc(safeNumber(daysBefore)));
  const end = addCalendarDays(startOfDay(now), 1 - offset);
  return { start: addCalendarDays(end, -count), end };
}

export function todayWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(1, now);
}

export function yesterdayWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(1, now, 1);
}

export function last7DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(7, now);
}

export function previous7DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(7, now, 7);
}

export function last14DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(14, now);
}

export function last30DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(30, now);
}

export function previous30DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(30, now, 30);
}

export function last90DaysWindow(now = Date.now()): DateRange {
  return calendarDaysWindow(90, now);
}

/** Monday is the default week start; callers may explicitly choose Sunday (0). */
export function currentWeekWindow(now = Date.now(), weekStartsOn: WeekdayIndex = 1): DateRange {
  const today = startOfDay(now);
  const weekday = new Date(today).getDay();
  const daysSinceStart = (weekday - weekStartsOn + 7) % 7;
  const start = addCalendarDays(today, -daysSinceStart);
  return { start, end: addCalendarDays(start, 7) };
}

export function previousWeekWindow(now = Date.now(), weekStartsOn: WeekdayIndex = 1): DateRange {
  const current = currentWeekWindow(now, weekStartsOn);
  return { start: addCalendarDays(current.start, -7), end: current.start };
}

/** Covers stored epoch timestamps through the end of the current local day. */
export function allTimeWindow(now = Date.now()): DateRange {
  return { start: 0, end: addCalendarDays(startOfDay(now), 1) };
}

export function dateRangeContains(range: DateRange, timestamp: unknown): boolean {
  return (
    isValidTimestamp(timestamp) &&
    Number.isFinite(range.start) &&
    Number.isFinite(range.end) &&
    range.start <= range.end &&
    timestamp >= range.start &&
    timestamp < range.end
  );
}

/** Returns a new, stable array; invalid timestamps sort after valid entries. */
export function sortDatedEntries<T>(
  entries: readonly T[],
  getTimestamp: (entry: T) => unknown,
  direction: "asc" | "desc" = "asc",
): T[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return entries
    .map((entry, index) => ({ entry, index, timestamp: getTimestamp(entry) }))
    .sort((a, b) => {
      const aTimestamp = isValidTimestamp(a.timestamp) ? a.timestamp : null;
      const bTimestamp = isValidTimestamp(b.timestamp) ? b.timestamp : null;
      if (aTimestamp !== null && bTimestamp !== null && aTimestamp !== bTimestamp) {
        return (aTimestamp - bTimestamp) * multiplier;
      }
      if ((aTimestamp === null) !== (bTimestamp === null)) return aTimestamp === null ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

/** Invalid timestamps are omitted instead of being assigned to a fabricated day. */
export function groupLogsByDay<T>(
  entries: readonly T[],
  getTimestamp: (entry: T) => unknown,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const entry of sortDatedEntries(entries, getTimestamp)) {
    const key = dayKey(getTimestamp(entry));
    if (!key) continue;
    (groups[key] ??= []).push(entry);
  }
  return groups;
}

/**
 * Produces one point per local calendar day. Callers explicitly choose the
 * missing value (for example zero for additive volume or null for unknowns).
 */
export function fillMissingDays<T>(
  range: DateRange,
  valuesByDay: Readonly<Record<string, T>>,
  missingValue: T | ((key: string, timestamp: number) => T),
): DailySeriesPoint<T>[] {
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start >= range.end) {
    return [];
  }

  const points: DailySeriesPoint<T>[] = [];
  for (
    let timestamp = startOfDay(range.start);
    timestamp < range.end;
    timestamp = addCalendarDays(timestamp, 1)
  ) {
    const key = dayKey(timestamp);
    const hasValue = Object.prototype.hasOwnProperty.call(valuesByDay, key);
    const value = hasValue
      ? valuesByDay[key]
      : typeof missingValue === "function"
        ? (missingValue as (key: string, timestamp: number) => T)(key, timestamp)
        : missingValue;
    points.push({ dayKey: key, timestamp, value });
  }
  return points;
}

/** Difference between local calendar dates, independent of daylight-saving day length. */
export function calendarDayDifference(later: number, earlier: number): number {
  if (!isValidTimestamp(later) || !isValidTimestamp(earlier)) return 0;
  const laterDate = new Date(startOfDay(later));
  const earlierDate = new Date(startOfDay(earlier));
  const laterUtc = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
  const earlierUtc = Date.UTC(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate(),
  );
  return Math.round((laterUtc - earlierUtc) / DAY_MS);
}
