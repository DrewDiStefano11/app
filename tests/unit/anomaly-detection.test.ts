import assert from "node:assert/strict";
import { test } from "bun:test";
import {
  FITCORE_ANOMALY_DETECTION_POLICY,
  evaluateAnomaly,
  type PersonalBaselineResult,
} from "../../src/lib/analytics.ts";

const EVALUATED_AT = "2026-07-13T16:00:00.000Z";

function baseline(patch: Partial<PersonalBaselineResult> = {}): PersonalBaselineResult {
  return {
    policy: "fitcore_personal_baseline_v1",
    status: "ready",
    sampleCount: 20,
    distinctDayCount: 20,
    lookbackDays: 56,
    exclusionDays: 7,
    center: 100,
    mean: 100,
    minimum: 90,
    maximum: 110,
    percentile25: 97,
    percentile75: 103,
    medianAbsoluteDeviation: 2.023,
    robustStandardDeviation: 3,
    latestIncludedAt: "2026-07-05T16:00:00.000Z",
    reasons: [{ code: "baseline_ready", message: "ready" }],
    ...patch,
  };
}

test("Task 14 anomaly policy, statuses, and neutral classifications are exact", () => {
  assert.equal(FITCORE_ANOMALY_DETECTION_POLICY, "fitcore_anomaly_detection_v1");
  const results = [
    evaluateAnomaly(102, baseline(), { absoluteEpsilon: 1, evaluatedAt: EVALUATED_AT }),
    evaluateAnomaly(109, baseline(), { absoluteEpsilon: 1, evaluatedAt: EVALUATED_AT }),
    evaluateAnomaly(115, baseline(), { absoluteEpsilon: 1, evaluatedAt: EVALUATED_AT }),
  ];
  assert.deepEqual(
    results.map((result) => result.classification),
    ["within_expected_range", "outside_expected_range", "far_outside_expected_range"],
  );
  assert.ok(results.every((result) => result.status === "ready"));
  assert.doesNotMatch(
    JSON.stringify(results),
    /warning|medical|healthy|unhealthy|dangerous|critical/i,
  );
});

test("Task 14 anomaly preserves positive and negative signed deviation neutrally", () => {
  const positive = evaluateAnomaly(109, baseline(), { absoluteEpsilon: 1 });
  const negative = evaluateAnomaly(91, baseline(), { absoluteEpsilon: 1 });
  assert.equal(positive.signedDeviation, 9);
  assert.equal(negative.signedDeviation, -9);
  assert.equal(positive.absoluteDeviation, negative.absoluteDeviation);
  assert.equal(positive.classification, "outside_expected_range");
  assert.equal(negative.classification, "outside_expected_range");
});

test("Task 14 anomaly prefers MAD-derived robust standard deviation", () => {
  const result = evaluateAnomaly(106, baseline(), { absoluteEpsilon: 1 });
  assert.equal(result.robustScale, 3);
  assert.equal(result.robustDeviationScore, 2);
  assert.equal(result.lowerExpectedBound, 91);
  assert.equal(result.upperExpectedBound, 109);
  assert.ok(result.reasons.some((reason) => reason.code === "robust_scale_from_mad"));
});

test("Task 14 anomaly uses IQR then epsilon fallbacks for zero-scale baselines", () => {
  const iqr = evaluateAnomaly(
    110,
    baseline({ robustStandardDeviation: 0, percentile25: 96, percentile75: 104 }),
    { absoluteEpsilon: 1 },
  );
  assert.ok(iqr.robustScale !== null && Math.abs(iqr.robustScale - 8 / 1.349) < 1e-12);
  assert.ok(iqr.reasons.some((reason) => reason.code === "robust_scale_from_iqr"));
  const epsilon = evaluateAnomaly(
    104,
    baseline({
      robustStandardDeviation: 0,
      percentile25: 100,
      percentile75: 100,
      medianAbsoluteDeviation: 0,
    }),
    { absoluteEpsilon: 2 },
  );
  assert.equal(epsilon.robustScale, 2);
  assert.equal(epsilon.robustDeviationScore, 2);
  assert.ok(epsilon.reasons.some((reason) => reason.code === "robust_scale_from_epsilon"));
});

test("Task 14 anomaly thresholds are exact at three and five robust units", () => {
  const scores = [2.999, 3, 4.999, 5].map((score) =>
    evaluateAnomaly(100 + score * 3, baseline(), { absoluteEpsilon: 1 }),
  );
  assert.deepEqual(
    scores.map((result) => result.classification),
    [
      "within_expected_range",
      "outside_expected_range",
      "outside_expected_range",
      "far_outside_expected_range",
    ],
  );
});

test("Task 14 anomaly preserves unavailable and insufficient baseline status", () => {
  const unavailable = evaluateAnomaly(100, baseline({ status: "unavailable" }), {
    absoluteEpsilon: 1,
  });
  const insufficient = evaluateAnomaly(100, baseline({ status: "insufficient_data" }), {
    absoluteEpsilon: 1,
  });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(insufficient.status, "insufficient_data");
  assert.equal(unavailable.classification, "unavailable");
  assert.equal(insufficient.classification, "unavailable");
});

test("Task 14 anomaly invalid current, center, and scale values fail safely", () => {
  for (const value of [null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const result = evaluateAnomaly(value, baseline(), { absoluteEpsilon: 1 });
    assert.equal(result.status, "unavailable");
    assert.equal(result.classification, "unavailable");
  }
  const noCenter = evaluateAnomaly(100, baseline({ center: null }), { absoluteEpsilon: 1 });
  assert.equal(noCenter.status, "unavailable");
  const noScale = evaluateAnomaly(
    100,
    baseline({ robustStandardDeviation: 0, percentile25: 100, percentile75: 100 }),
    { absoluteEpsilon: Number.NaN },
  );
  assert.equal(noScale.status, "unavailable");
  assert.ok(noScale.reasons.some((reason) => reason.code === "invalid_robust_scale"));
});

test("Task 14 anomaly is immutable, deterministic, and serializable", () => {
  const input = Object.freeze(baseline());
  const first = evaluateAnomaly(106, input, { absoluteEpsilon: 1, evaluatedAt: EVALUATED_AT });
  const second = evaluateAnomaly(106, input, { absoluteEpsilon: 1, evaluatedAt: EVALUATED_AT });
  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(first.evaluatedAt, EVALUATED_AT);
  Object.values(first).forEach((value) => {
    if (typeof value === "number") assert.equal(Number.isFinite(value), true);
  });
});
