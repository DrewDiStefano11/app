import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_MEANINGFUL_CHANGE_POLICY,
  MEANINGFUL_CHANGE_WINDOW_PRIORITY,
  evaluateMeaningfulChange,
  type RollingTrendDirection,
  type RollingTrendStatus,
  type RollingTrendWindow,
  type RollingTrendWindowResult,
} from "../../src/lib/analytics.ts";

const END = Date.UTC(2026, 6, 13, 16);
const DAYS: Record<RollingTrendWindow, number> = { days_7: 7, days_28: 28, days_90: 90 };

function windowResult(
  window: RollingTrendWindow,
  direction: RollingTrendDirection,
  status: RollingTrendStatus = direction === "unavailable" ? "unavailable" : "ready",
): RollingTrendWindowResult {
  const days = DAYS[window];
  const currentStart = END - days * 86_400_000;
  const previousStart = currentStart - days * 86_400_000;
  const ready = status === "ready";
  return {
    window,
    status,
    direction: ready ? direction : "unavailable",
    currentSampleCount: ready ? 10 : 0,
    previousSampleCount: ready ? 10 : 0,
    currentValue: ready
      ? direction === "decreasing"
        ? 90
        : direction === "increasing"
          ? 110
          : 100
      : null,
    previousValue: ready ? 100 : null,
    absoluteChange: ready
      ? direction === "decreasing"
        ? -10
        : direction === "increasing"
          ? 10
          : 0
      : null,
    relativeChange: ready
      ? direction === "decreasing"
        ? -0.1
        : direction === "increasing"
          ? 0.1
          : 0
      : null,
    slopePerDay: ready
      ? direction === "decreasing"
        ? -1
        : direction === "increasing"
          ? 1
          : 0
      : null,
    threshold: ready ? 3 : null,
    currentStartAt: new Date(currentStart).toISOString(),
    currentEndAt: new Date(END).toISOString(),
    previousStartAt: new Date(previousStart).toISOString(),
    previousEndAt: new Date(currentStart).toISOString(),
    reasons: [],
  };
}

test("Task 14 meaningful-change policy and canonical window priority are exact", () => {
  assert.equal(FITCORE_MEANINGFUL_CHANGE_POLICY, "fitcore_meaningful_change_v1");
  assert.deepEqual(MEANINGFUL_CHANGE_WINDOW_PRIORITY, ["days_7", "days_28", "days_90"]);
  const result = evaluateMeaningfulChange([]);
  assert.equal(result.status, "unavailable");
  assert.equal(result.classification, "unavailable");
});

test("Task 14 all stable windows produce no meaningful change", () => {
  const result = evaluateMeaningfulChange([
    windowResult("days_90", "stable"),
    windowResult("days_7", "stable"),
    windowResult("days_28", "stable"),
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.classification, "no_meaningful_change");
  assert.equal(result.primaryWindow, "days_7");
  assert.deepEqual(result.supportingWindows, ["days_28", "days_90"]);
});

test("Task 14 a single short-term increase remains meaningful with stable longer windows", () => {
  const result = evaluateMeaningfulChange([
    windowResult("days_7", "increasing"),
    windowResult("days_28", "stable"),
    windowResult("days_90", "stable"),
  ]);
  assert.equal(result.classification, "meaningful_increase");
  assert.equal(result.primaryWindow, "days_7");
  assert.deepEqual(result.supportingWindows, ["days_28", "days_90"]);
  assert.ok(result.reasons.some((reason) => reason.code === "short_term_change_only"));
});

test("Task 14 agreeing windows produce deterministic increases and decreases", () => {
  const increase = evaluateMeaningfulChange([
    windowResult("days_28", "increasing"),
    windowResult("days_7", "increasing"),
    windowResult("days_90", "stable"),
  ]);
  assert.equal(increase.classification, "meaningful_increase");
  assert.equal(increase.primaryWindow, "days_7");
  assert.deepEqual(increase.supportingWindows, ["days_28"]);
  assert.ok(increase.reasons.some((reason) => reason.code === "multiple_windows_agree"));
  assert.ok(increase.reasons.some((reason) => reason.code === "longer_term_support"));

  const decrease = evaluateMeaningfulChange([
    windowResult("days_7", "decreasing"),
    windowResult("days_28", "decreasing"),
  ]);
  assert.equal(decrease.classification, "meaningful_decrease");
  assert.deepEqual(decrease.supportingWindows, ["days_28"]);
});

test("Task 14 directly opposing ready windows remain mixed", () => {
  const result = evaluateMeaningfulChange([
    windowResult("days_7", "increasing"),
    windowResult("days_28", "decreasing"),
    windowResult("days_90", "stable"),
  ]);
  assert.equal(result.classification, "mixed_direction");
  assert.equal(result.primaryWindow, null);
  assert.deepEqual(result.conflictingWindows, ["days_7", "days_28"]);
  assert.ok(result.reasons.some((reason) => reason.code === "opposing_windows"));
});

test("Task 14 unavailable windows are ignored and insufficient-only input stays insufficient", () => {
  const ignored = evaluateMeaningfulChange([
    windowResult("days_7", "increasing"),
    windowResult("days_28", "unavailable"),
  ]);
  assert.equal(ignored.classification, "meaningful_increase");
  assert.deepEqual(ignored.supportingWindows, []);
  const insufficient = evaluateMeaningfulChange([
    windowResult("days_7", "unavailable", "insufficient_data"),
    windowResult("days_28", "unavailable"),
  ]);
  assert.equal(insufficient.status, "insufficient_data");
  assert.equal(insufficient.classification, "unavailable");
});

test("Task 14 respects Task 13 direction instead of recalculating it from numbers", () => {
  const contradictory = {
    ...windowResult("days_7", "decreasing"),
    currentValue: 120,
    previousValue: 100,
    absoluteChange: 20,
    relativeChange: 0.2,
    slopePerDay: 2,
  };
  const result = evaluateMeaningfulChange([contradictory]);
  assert.equal(result.classification, "meaningful_decrease");
  assert.equal(result.absoluteChange, 20);
});

test("Task 14 meaningful change is deterministic, immutable, and serializable", () => {
  const input = Object.freeze([
    Object.freeze(windowResult("days_90", "stable")),
    Object.freeze(windowResult("days_28", "increasing")),
    Object.freeze(windowResult("days_7", "increasing")),
  ]);
  const first = evaluateMeaningfulChange(input);
  const second = evaluateMeaningfulChange([...input].reverse());
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.doesNotMatch(JSON.stringify(first), /improving|worsening|good|bad|warning|medical/i);
});
