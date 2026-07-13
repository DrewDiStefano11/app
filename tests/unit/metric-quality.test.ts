import assert from "node:assert/strict";
import { test } from "bun:test";

import { evaluateMetricQuality, type MetricQualityInput } from "../../src/lib/analytics.ts";

const complete: MetricQualityInput = {
  status: "ready",
  hasValue: true,
  validRecordCount: 10,
  minimumSampleSize: 3,
  includedRecordCount: 10,
  excludedRecordCount: 0,
  coverageDayCount: 7,
  expectedDayCount: 7,
};

test("Task 12 quality distinguishes absent evidence from explicitly invalid evidence", () => {
  const absent = evaluateMetricQuality({ status: "unavailable", hasValue: false });
  const invalid = evaluateMetricQuality({
    status: "unavailable",
    hasValue: false,
    includedRecordCount: 1,
    invalid: true,
  });
  assert.equal(absent.level, "unavailable");
  assert.equal(absent.score, null);
  assert.equal(invalid.level, "low");
  assert.equal(invalid.score, 0);
});

test("Task 12 complete valid evidence reaches high quality without exceeding one", () => {
  const result = evaluateMetricQuality(complete);
  assert.equal(result.level, "high");
  assert.equal(result.score, 1);
  assert.deepEqual(result.limitingFactors, []);
});

test("Task 12 samples, sparse coverage, and partial periods conservatively limit quality", () => {
  const insufficient = evaluateMetricQuality({ ...complete, validRecordCount: 2 });
  const sparse = evaluateMetricQuality({ ...complete, coverageDayCount: 2 });
  const partial = evaluateMetricQuality({ ...complete, partialPeriod: true });
  assert.ok((insufficient.score ?? 1) <= 0.49);
  assert.ok((sparse.score ?? 1) < 0.5);
  assert.equal(partial.score, 0.79);
  assert.ok(partial.limitingFactors.includes("partial_period"));
});

test("Task 12 exclusions lower quality proportionally", () => {
  const result = evaluateMetricQuality({
    ...complete,
    includedRecordCount: 8,
    excludedRecordCount: 2,
  });
  assert.equal(result.score, 0.8);
  assert.equal(result.evidence.exclusionRatio, 0.2);
  assert.ok(result.limitingFactors.includes("excluded_records"));
});

test("Task 12 missing targets and invalid comparisons cannot receive high quality", () => {
  const target = evaluateMetricQuality({ ...complete, targetRequired: true, targetValid: false });
  const comparison = evaluateMetricQuality({
    ...complete,
    metricKind: "comparison",
    comparisonPeriodValid: false,
  });
  assert.ok((target.score ?? 1) <= 0.49);
  assert.ok((comparison.score ?? 1) <= 0.49);
  assert.ok(target.limitingFactors.includes("missing_target"));
  assert.ok(comparison.limitingFactors.includes("invalid_comparison_period"));
});

test("Task 12 unsupported fields are not measured zero and trend penalties stay kind-specific", () => {
  const unsupported = evaluateMetricQuality({ ...complete, unsupported: true });
  const trendQuality = {
    direction: "unknown" as const,
    codes: ["volatile_trend" as const, "uneven_spacing" as const],
    hasEnoughData: true,
    sampleSize: 10,
    minimumSampleSize: 3,
    coverageDayCount: 7,
    expectedDayCount: 7,
    missingDayCount: 0,
    coverageRatio: 1,
    comparisonComplete: true,
    zeroBaseline: false,
    variability: 2,
    outlierCount: 1,
    reasons: [],
  };
  const point = evaluateMetricQuality({ ...complete, metricKind: "point_in_time", trendQuality });
  const trend = evaluateMetricQuality({ ...complete, metricKind: "time_series", trendQuality });
  assert.equal(unsupported.score, 0);
  assert.equal(point.score, 1);
  assert.ok((trend.score ?? 1) < 1);
});

test("Task 12 quality reasons are stable, deduplicated, and inputs remain immutable", () => {
  const input = { ...complete, partialPeriod: true, excludedRecordCount: 2 };
  const before = JSON.stringify(input);
  const first = evaluateMetricQuality(input);
  const repeated = evaluateMetricQuality(input);
  assert.deepEqual(first, repeated);
  assert.equal(new Set(first.limitingFactors).size, first.limitingFactors.length);
  assert.deepEqual(first.limitingFactors, [...first.limitingFactors].sort());
  assert.equal(JSON.stringify(input), before);
  assert.ok(first.score !== null && first.score >= 0 && first.score <= 1);
});
