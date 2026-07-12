import assert from "node:assert/strict";
import test from "node:test";

import { todayMealTotals, weeklyVolumeSeries, withinDays } from "../../src/lib/analytics.ts";
import { compareWindows, setsSeries, volumeSeries } from "../../src/lib/analytics-extra.ts";
import {
  addCalendarDays,
  allTimeWindow,
  calendarDayDifference,
  calendarDaysWindow,
  currentWeekWindow,
  dateRangeContains,
  dayKey,
  fillMissingDays,
  groupLogsByDay,
  last14DaysWindow,
  last30DaysWindow,
  last7DaysWindow,
  last90DaysWindow,
  previous30DaysWindow,
  previous7DaysWindow,
  previousWeekWindow,
  sortDatedEntries,
  startOfDay,
  todayWindow,
  yesterdayWindow,
  type DateRange,
} from "../../src/lib/analytics/date-time.ts";
import type { AppState } from "../../src/lib/types.ts";

const localTime = (year: number, month: number, date: number, hours = 0, minutes = 0): number =>
  new Date(year, month, date, hours, minutes).getTime();

const NOW = localTime(2026, 0, 15, 15, 45);

function assertFiniteDeep(value: unknown): void {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertFiniteDeep(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertFiniteDeep(item);
  }
}

test("fixed now produces deterministic local day keys and day starts", () => {
  assert.equal(startOfDay(NOW), localTime(2026, 0, 15));
  assert.equal(dayKey(NOW), "2026-01-15");
  assert.equal(dayKey(Number.NaN), "");
});

test("today and yesterday use adjacent half-open calendar boundaries", () => {
  const today = todayWindow(NOW);
  const yesterday = yesterdayWindow(NOW);

  assert.deepEqual(today, {
    start: localTime(2026, 0, 15),
    end: localTime(2026, 0, 16),
  });
  assert.deepEqual(yesterday, {
    start: localTime(2026, 0, 14),
    end: localTime(2026, 0, 15),
  });
  assert.equal(yesterday.end, today.start);
  assert.equal(dateRangeContains(today, today.start), true);
  assert.equal(dateRangeContains(today, today.end - 1), true);
  assert.equal(dateRangeContains(today, today.end), false);
});

test("last seven and previous seven windows are complete and non-overlapping", () => {
  const current = last7DaysWindow(NOW);
  const previous = previous7DaysWindow(NOW);

  assert.deepEqual(current, {
    start: localTime(2026, 0, 9),
    end: localTime(2026, 0, 16),
  });
  assert.deepEqual(previous, {
    start: localTime(2026, 0, 2),
    end: localTime(2026, 0, 9),
  });
  assert.equal(previous.end, current.start);
  assert.equal(withinDays(current.start, 7, NOW), true);
  assert.equal(withinDays(previous.end - 1, 7, NOW), false);
});

test("last thirty and previous thirty windows are adjacent calendar ranges", () => {
  const current = last30DaysWindow(NOW);
  const previous = previous30DaysWindow(NOW);

  assert.deepEqual(current, {
    start: localTime(2025, 11, 17),
    end: localTime(2026, 0, 16),
  });
  assert.deepEqual(previous, {
    start: localTime(2025, 10, 17),
    end: localTime(2025, 11, 17),
  });
  assert.equal(previous.end, current.start);
});

test("remaining named windows and Monday-based week windows stay deterministic", () => {
  assert.deepEqual(last14DaysWindow(NOW), calendarDaysWindow(14, NOW));
  assert.deepEqual(last90DaysWindow(NOW), calendarDaysWindow(90, NOW));
  assert.deepEqual(currentWeekWindow(NOW), {
    start: localTime(2026, 0, 12),
    end: localTime(2026, 0, 19),
  });
  assert.deepEqual(previousWeekWindow(NOW), {
    start: localTime(2026, 0, 5),
    end: localTime(2026, 0, 12),
  });
  assert.deepEqual(allTimeWindow(NOW), {
    start: 0,
    end: localTime(2026, 0, 16),
  });
});

test("grouping logs by day sorts valid entries and omits invalid timestamps", () => {
  const entries = [
    { id: "late", at: localTime(2026, 0, 13, 20) },
    { id: "invalid", at: Number.POSITIVE_INFINITY },
    { id: "next", at: localTime(2026, 0, 15, 8) },
    { id: "early", at: localTime(2026, 0, 13, 7) },
  ];

  const grouped = groupLogsByDay(entries, (entry) => entry.at);
  assert.deepEqual(Object.keys(grouped), ["2026-01-13", "2026-01-15"]);
  assert.deepEqual(
    grouped["2026-01-13"].map((entry) => entry.id),
    ["early", "late"],
  );
  assert.equal(
    Object.values(grouped)
      .flat()
      .some((entry) => entry.id === "invalid"),
    false,
  );
});

test("sparse chart series requires an explicit missing value", () => {
  const range: DateRange = {
    start: localTime(2026, 0, 13),
    end: localTime(2026, 0, 16),
  };
  const series = fillMissingDays<number | null>(range, { "2026-01-13": 4, "2026-01-15": 9 }, null);

  assert.deepEqual(
    series.map(({ dayKey: key, value }) => ({ dayKey: key, value })),
    [
      { dayKey: "2026-01-13", value: 4 },
      { dayKey: "2026-01-14", value: null },
      { dayKey: "2026-01-15", value: 9 },
    ],
  );
});

test("dated sorting is stable and places invalid timestamps last", () => {
  const entries = [
    { id: "invalid-a", at: Number.NaN },
    { id: "old", at: localTime(2026, 0, 10) },
    { id: "new", at: localTime(2026, 0, 12) },
    { id: "invalid-b", at: Number.POSITIVE_INFINITY },
  ];

  assert.deepEqual(
    sortDatedEntries(entries, (entry) => entry.at, "desc").map((entry) => entry.id),
    ["new", "old", "invalid-a", "invalid-b"],
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["invalid-a", "old", "new", "invalid-b"],
  );
});

test("calendar arithmetic stays day-based and all returned timestamps are finite", () => {
  const beforeDaylightShift = localTime(2026, 2, 7, 18);
  const twoDaysLater = addCalendarDays(beforeDaylightShift, 2);
  assert.equal(dayKey(twoDaysLater), "2026-03-09");
  assert.equal(calendarDayDifference(twoDaysLater, beforeDaylightShift), 2);

  const outputs = [
    todayWindow(NOW),
    yesterdayWindow(NOW),
    last7DaysWindow(NOW),
    previous7DaysWindow(NOW),
    last14DaysWindow(NOW),
    last30DaysWindow(NOW),
    previous30DaysWindow(NOW),
    last90DaysWindow(NOW),
    currentWeekWindow(NOW),
    previousWeekWindow(NOW),
    allTimeWindow(NOW),
    calendarDaysWindow(Number.NaN, NOW),
    fillMissingDays(last7DaysWindow(NOW), {}, 0),
  ];
  for (const output of outputs) assertFiniteDeep(output);
});

test("today meal totals use the supplied calendar day instead of a rolling 24 hours", () => {
  const state = {
    mealEntries: [
      {
        id: "yesterday",
        name: "Late meal",
        type: "meal",
        calories: 900,
        protein: 50,
        carbs: 80,
        fat: 30,
        createdAt: localTime(2026, 0, 14, 23, 59),
      },
      {
        id: "today",
        name: "Breakfast",
        type: "meal",
        calories: 500,
        protein: 40,
        carbs: 55,
        fat: 15,
        createdAt: localTime(2026, 0, 15),
      },
      {
        id: "tomorrow",
        name: "Future meal",
        type: "meal",
        calories: 700,
        protein: 45,
        carbs: 70,
        fat: 20,
        createdAt: localTime(2026, 0, 16),
      },
    ],
  } as AppState;

  assert.deepEqual(todayMealTotals(state, NOW), {
    calories: 500,
    protein: 40,
    carbs: 55,
    fat: 15,
  });
});

test("shared workout chart helpers use the supplied calendar windows", () => {
  const workout = (id: string, startedAt: number, weight: number, reps: number) => ({
    id,
    name: id,
    startedAt,
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "bench",
        completed: true,
        sets: [{ id: `${id}-set`, weight, reps, completed: true }],
      },
    ],
  });
  const state = {
    workouts: [
      workout("current-start", localTime(2026, 0, 9), 100, 1),
      workout("today", localTime(2026, 0, 15, 12), 50, 2),
      workout("previous", localTime(2026, 0, 8, 12), 25, 4),
    ],
  } as AppState;

  const weekly = weeklyVolumeSeries(state, 7, NOW);
  const generic = volumeSeries(state, 7, "day", NOW);
  const sets = setsSeries(state, 7, NOW);

  assert.equal(weekly.length, 7);
  assert.equal(generic.length, 7);
  assert.equal(sets.length, 7);
  assert.equal(weekly.filter((point) => point.volume > 0).length, 2);
  assert.deepEqual(
    generic.map((point) => point.ts),
    Array.from({ length: 7 }, (_, index) => localTime(2026, 0, 9 + index)),
  );
  assert.equal(
    sets.reduce((sum, point) => sum + point.sets, 0),
    2,
  );
  assert.deepEqual(compareWindows(state, 7, NOW), {
    current: 200,
    previous: 100,
    deltaPct: 100,
  });
  assertFiniteDeep([weekly, generic, sets, compareWindows(state, 7, NOW)]);
});
