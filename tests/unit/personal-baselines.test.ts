import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_PERSONAL_BASELINE_POLICY,
  PERSONAL_BASELINE_POLICIES,
  calculatePersonalBaseline,
} from "../../src/lib/analytics.ts";

const NOW = Date.UTC(2026, 2, 10);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

test("Task 13 baseline policy constants are exact and conservative", () => {
  assert.equal(FITCORE_PERSONAL_BASELINE_POLICY, "fitcore_personal_baseline_v1");
  assert.deepEqual(PERSONAL_BASELINE_POLICIES.daily, {
    lookbackDays: 56,
    exclusionDays: 7,
    minimumDistinctDays: 7,
  });
  assert.deepEqual(PERSONAL_BASELINE_POLICIES.sparse_event, {
    lookbackDays: 112,
    exclusionDays: 7,
    minimumDistinctDays: 5,
  });
});

test("Task 13 baseline calculates deterministic robust statistics", () => {
  const points = [1, 2, 3, 4, 5, 6, 7].map((value, index) => ({
    timestamp: iso(8 + index),
    value,
  }));
  const result = calculatePersonalBaseline(points, { evaluationAt: new Date(NOW).toISOString() });
  assert.equal(result.status, "ready");
  assert.equal(result.center, 4);
  assert.equal(result.mean, 4);
  assert.equal(result.minimum, 1);
  assert.equal(result.maximum, 7);
  assert.equal(result.percentile25, 2.5);
  assert.equal(result.percentile75, 5.5);
  assert.equal(result.medianAbsoluteDeviation, 2);
  assert.equal(result.robustStandardDeviation, 2.9652);
});

test("Task 13 median and MAD resist a single extreme outlier", () => {
  const values = [1, 1, 1, 1, 1, 1, 100];
  const result = calculatePersonalBaseline(
    values.map((value, index) => ({ timestamp: iso(8 + index), value })),
    { evaluationAt: new Date(NOW).toISOString() },
  );
  assert.equal(result.center, 1);
  assert.equal(result.medianAbsoluteDeviation, 0);
  assert.equal(Number.isFinite(result.mean ?? Number.NaN), true);
  assert.equal("recommendation" in result, false);
});

test("Task 13 baseline excludes the recent interval and future points", () => {
  const historical = [1, 2, 3, 4, 5, 6, 7].map((value, index) => ({
    timestamp: iso(8 + index),
    value,
  }));
  const first = calculatePersonalBaseline(historical, {
    evaluationAt: new Date(NOW).toISOString(),
  });
  const withExcluded = calculatePersonalBaseline(
    [...historical, { timestamp: iso(1), value: 999 }, { timestamp: iso(-1), value: 999 }],
    { evaluationAt: new Date(NOW).toISOString() },
  );
  assert.equal(first.center, withExcluded.center);
  assert.ok(withExcluded.reasons.some((reason) => reason.code === "outside_baseline_window"));
  assert.ok(withExcluded.reasons.some((reason) => reason.code === "future_point_excluded"));
});

test("Task 13 baseline excludes malformed values while preserving zero and negative values", () => {
  const points = [0, -1, 1, 2, 3, 4, 5].map((value, index) => ({
    timestamp: iso(8 + index),
    value,
  }));
  const input: readonly unknown[] = [
    ...points,
    { timestamp: "bad", value: 1 },
    { timestamp: iso(20), value: Number.NaN },
    { timestamp: iso(21), value: Infinity },
    { timestamp: iso(22), value: -Infinity },
  ];
  const frozen = Object.freeze(
    input.map((point) => (typeof point === "object" && point ? Object.freeze(point) : point)),
  );
  const result = calculatePersonalBaseline(frozen, { evaluationAt: new Date(NOW).toISOString() });
  assert.equal(result.status, "ready");
  assert.equal(result.minimum, -1);
  assert.ok(result.reasons.some((reason) => reason.code === "invalid_timestamp_excluded"));
  assert.ok(result.reasons.some((reason) => reason.code === "non_finite_value_excluded"));
});

test("Task 13 unavailable and insufficient baselines never fabricate zero statistics", () => {
  const unavailable = calculatePersonalBaseline([], { evaluationAt: new Date(NOW).toISOString() });
  const insufficient = calculatePersonalBaseline([{ timestamp: iso(8), value: 0 }], {
    evaluationAt: new Date(NOW).toISOString(),
  });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(insufficient.status, "insufficient_data");
  for (const result of [unavailable, insufficient]) assert.equal(result.center, null);
});

test("Task 13 baseline input order and duplicate aggregation are deterministic and serializable", () => {
  const points = [1, 2, 3, 4, 5, 6, 7].map((value, index) => ({
    timestamp: iso(8 + index),
    value,
    sourceId: `id-${index}`,
  }));
  points.push({ timestamp: points[0].timestamp, value: 3, sourceId: "duplicate" });
  const first = calculatePersonalBaseline(points, { evaluationAt: new Date(NOW).toISOString() });
  const reversed = calculatePersonalBaseline([...points].reverse(), {
    evaluationAt: new Date(NOW).toISOString(),
  });
  assert.deepEqual(first, reversed);
  assert.ok(first.reasons.some((reason) => reason.code === "duplicate_timestamp_aggregated"));
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(JSON.stringify(first).includes("Infinity"), false);
});
