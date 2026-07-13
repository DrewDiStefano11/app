import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_ROLLING_TREND_POLICY,
  ROLLING_TREND_WINDOWS,
  calculateRollingTrend,
  type PersonalBaselineResult,
} from "../../src/lib/analytics.ts";

const NOW = Date.UTC(2026, 2, 10);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();
function series(previous: number, current: number) {
  return [8, 9, 10, 11, 12, 13, 14]
    .map((day) => ({ timestamp: iso(day), value: previous }))
    .concat([1, 2, 3, 4, 5, 6, 7].map((day) => ({ timestamp: iso(day), value: current })));
}
const options = { evaluationAt: new Date(NOW).toISOString(), absoluteEpsilon: 0.1 };
const seven = (points: readonly unknown[], patch = {}) =>
  calculateRollingTrend(points, { ...options, ...patch }).windows[0];

test("Task 13 rolling policy and windows are exact with equal UTC intervals", () => {
  assert.equal(FITCORE_ROLLING_TREND_POLICY, "fitcore_rolling_trend_v1");
  assert.deepEqual(ROLLING_TREND_WINDOWS, {
    days_7: { days: 7, minimumSamples: 3 },
    days_28: { days: 28, minimumSamples: 7 },
    days_90: { days: 90, minimumSamples: 14 },
  });
  const result = seven(series(10, 20));
  assert.equal(
    Date.parse(result.currentEndAt) - Date.parse(result.currentStartAt),
    Date.parse(result.previousEndAt) - Date.parse(result.previousStartAt),
  );
  assert.equal(result.currentStartAt, result.previousEndAt);
});

test("Task 13 rolling trends classify increasing, decreasing, and stable movement neutrally", () => {
  assert.equal(seven(series(10, 20)).direction, "increasing");
  assert.equal(seven(series(20, 10)).direction, "decreasing");
  assert.equal(seven(series(10, 10.2)).direction, "stable");
  for (const forbidden of ["improving", "worsening", "good", "bad"])
    assert.equal(JSON.stringify(seven(series(10, 20))).includes(forbidden), false);
});

test("Task 13 ready baseline changes the conservative direction threshold", () => {
  const baseline: PersonalBaselineResult = {
    policy: "fitcore_personal_baseline_v1",
    status: "ready",
    sampleCount: 7,
    distinctDayCount: 7,
    lookbackDays: 56,
    exclusionDays: 7,
    center: 100,
    mean: 100,
    minimum: 90,
    maximum: 110,
    percentile25: 95,
    percentile75: 105,
    medianAbsoluteDeviation: 10,
    robustStandardDeviation: 14.826,
    latestIncludedAt: iso(8),
    reasons: [],
  };
  const fallback = seven(series(100, 106));
  const baselineAware = seven(series(100, 106), { baseline });
  assert.equal(fallback.direction, "increasing");
  assert.equal(baselineAware.direction, "stable");
  assert.ok(baselineAware.reasons.some((reason) => reason.code === "baseline_threshold_used"));
});

test("Task 13 previous zero has null relative change and never infinity", () => {
  const result = seven(series(0, 2));
  assert.equal(result.relativeChange, null);
  assert.equal(JSON.stringify(result).includes("Infinity"), false);
});

test("Task 13 slope is finite for a known line and null without two timestamps", () => {
  const previous = [8, 9, 10].map((day) => ({ timestamp: iso(day), value: 1 }));
  const current = [7, 6, 5].map((day, index) => ({ timestamp: iso(day), value: index * 2 }));
  assert.equal(seven([...previous, ...current]).slopePerDay, 2);
  assert.equal(seven([{ timestamp: iso(1), value: 1 }]).slopePerDay, null);
});

test("Task 13 each window enforces current and previous sample minimums", () => {
  const result = calculateRollingTrend(series(10, 20).slice(0, 4), options);
  result.windows.forEach((window) => {
    assert.notEqual(window.status, "ready");
    assert.equal(window.direction, "unavailable");
  });
});

test("Task 13 preserves recorded zero, does not fill missing days, and handles malformed duplicates", () => {
  const points: readonly unknown[] = Object.freeze([
    ...series(0, 0),
    Object.freeze({ timestamp: iso(1), value: 2, sourceId: "duplicate" }),
    Object.freeze({ timestamp: "bad", value: 1 }),
    Object.freeze({ timestamp: iso(2), value: Number.NaN }),
    Object.freeze({ timestamp: iso(-1), value: 3 }),
  ]);
  const result = seven(points);
  assert.equal(result.currentSampleCount, 7);
  assert.ok(result.reasons.some((reason) => reason.code === "duplicate_timestamp_aggregated"));
  assert.ok(result.reasons.some((reason) => reason.code === "invalid_timestamp_excluded"));
  assert.ok(result.reasons.some((reason) => reason.code === "non_finite_value_excluded"));
  assert.ok(result.reasons.some((reason) => reason.code === "future_point_excluded"));
});
