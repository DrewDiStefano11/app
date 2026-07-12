import assert from "node:assert/strict";
import test from "node:test";

import {
  clampPercent,
  clampScore,
  safeAverage,
  safeMax,
  safeMin,
  safeNumber,
  safePercentChange,
  safeRatio,
  safeSum,
} from "../../src/lib/analytics/safe-math.ts";

test("safeAverage returns zero for an empty array", () => {
  assert.equal(safeAverage([]), 0);
});

test("safeRatio returns a stable fallback for a zero denominator", () => {
  assert.equal(safeRatio(25, 0), 0);
  assert.equal(safeRatio(25, 0, 7), 7);
});

test("safePercentChange returns null for a zero baseline", () => {
  assert.equal(safePercentChange(25, 0), null);
});

test("score and percent clamping stays within zero and one hundred", () => {
  assert.equal(clampScore(100.6), 100);
  assert.equal(clampScore(-0.6), 0);
  assert.equal(clampScore(49.6), 50);
  assert.equal(clampPercent(120.5), 100);
  assert.equal(clampPercent(-2.5), 0);
  assert.equal(clampPercent(42.5), 42.5);
});

test("invalid numbers never escape safe numeric helpers", () => {
  assert.equal(safeNumber(Number.NaN), 0);
  assert.equal(safeNumber(Number.POSITIVE_INFINITY, Number.NaN), 0);
  assert.equal(clampScore(Number.NEGATIVE_INFINITY), 0);
  assert.equal(safeRatio(Number.POSITIVE_INFINITY, 2), 0);
  assert.equal(safePercentChange(Number.NaN, 5), null);
});

test("safeSum and safeAverage ignore invalid values", () => {
  const values = [10, Number.NaN, 5, Number.POSITIVE_INFINITY, undefined];
  assert.equal(safeSum(values), 15);
  assert.equal(safeAverage(values), 7.5);
});

test("safe min and max return stable empty fallbacks", () => {
  assert.equal(safeMin([]), 0);
  assert.equal(safeMax([], 12), 12);
  assert.equal(safeMin([Number.NaN, 3, -2]), -2);
  assert.equal(safeMax([Number.POSITIVE_INFINITY, 3, -2]), 3);
});

test("safePercentChange calculates finite changes from nonzero baselines", () => {
  assert.equal(safePercentChange(125, 100), 25);
  assert.equal(safePercentChange(75, 100), -25);
  assert.equal(safePercentChange(-75, -100), 25);
});
