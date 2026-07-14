import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  FITCORE_METRIC_TRUST_POLICY_VERSION,
  evaluateMetricFreshness,
  evaluateMetricQuality,
  evaluateMetricTrust,
  normalizeMetricProvenance,
  type MetricTrustInput,
} from "../../src/lib/analytics.ts";

const NOW = Date.UTC(2026, 6, 13);
const provenance = normalizeMetricProvenance({ sourceType: "manual", sourceIds: ["record-1"] });

function input(patch: Partial<MetricTrustInput> = {}): MetricTrustInput {
  return {
    metricId: "metric.test",
    metricStatus: "ready",
    hasValue: true,
    confidence: { level: "high", score: 90 },
    quality: evaluateMetricQuality({
      status: "ready",
      hasValue: true,
      validRecordCount: 3,
      minimumSampleSize: 1,
      includedRecordCount: 3,
    }),
    freshness: evaluateMetricFreshness({ collection: "workouts", now: NOW, lastLoggedAt: NOW }),
    provenance,
    ...patch,
  };
}

test("Task 12 trust distinguishes unavailable from explicitly invalid assessed data", () => {
  const unavailable = evaluateMetricTrust(
    input({
      metricStatus: "unavailable",
      hasValue: false,
      quality: evaluateMetricQuality({ status: "unavailable", hasValue: false }),
    }),
  );
  const invalid = evaluateMetricTrust(
    input({
      quality: evaluateMetricQuality({
        status: "unavailable",
        hasValue: false,
        includedRecordCount: 1,
        invalid: true,
      }),
      freshness: evaluateMetricFreshness({
        collection: "workouts",
        now: NOW,
        lastLoggedAt: NOW + 1,
      }),
    }),
  );
  assert.equal(unavailable.score, null);
  assert.equal(unavailable.level, "unavailable");
  assert.equal(invalid.score, 0);
  assert.equal(invalid.level, "low");
});

test("Task 12 trust never exceeds confidence, quality, freshness, traceability, or dependencies", () => {
  const result = evaluateMetricTrust(
    input({
      confidence: { level: "medium", score: 65 },
      quality: { ...input().quality, score: 0.7, level: "medium" },
      freshness: { ...input().freshness, score: 0.6, state: "aging" },
      provenance: { ...provenance, traceabilityScore: 0.55 },
      dependencies: [{ id: "dependency", status: "assessed", score: 0.4 }],
    }),
  );
  assert.equal(result.score, 0.4);
  assert.deepEqual(result.dependencyLimit.limitingDependencyIds, ["dependency"]);
});

test("Task 12 unknown freshness and provenance apply conservative caps", () => {
  const unknownFreshness = evaluateMetricTrust(
    input({ freshness: evaluateMetricFreshness({ collection: "workouts", now: NOW }) }),
  );
  const unknownProvenance = evaluateMetricTrust(input({ provenance: null }));
  assert.ok((unknownFreshness.score ?? 1) <= 0.49);
  assert.ok((unknownProvenance.score ?? 1) <= 0.49);
  assert.ok(unknownFreshness.limitingFactors.includes("unknown_freshness"));
  assert.ok(unknownProvenance.limitingFactors.includes("unknown_provenance"));
});

test("Task 12 stale and needs-more-data metrics cannot receive medium trust", () => {
  const stale = evaluateMetricTrust(
    input({
      freshness: evaluateMetricFreshness({
        collection: "workouts",
        now: NOW,
        lastLoggedAt: NOW - 15 * 24 * 60 * 60 * 1000,
      }),
    }),
  );
  const needs = evaluateMetricTrust(input({ metricStatus: "needs_more_data" }));
  assert.equal(stale.level, "low");
  assert.equal(needs.level, "low");
  assert.ok((stale.score ?? 1) <= 0.49);
  assert.ok((needs.score ?? 1) <= 0.49);
});

test("Task 12 low and unavailable dependencies limit derived trust deterministically", () => {
  const result = evaluateMetricTrust(
    input({
      dependencies: [
        { id: "z", status: "unresolved", score: null },
        { id: "b", status: "assessed", score: 0.3 },
        { id: "a", status: "assessed", score: 0.3 },
      ],
    }),
  );
  assert.ok((result.score ?? 1) <= 0.3);
  assert.deepEqual(result.dependencyLimit.limitingDependencyIds, ["a", "b", "z"]);
  assert.ok(result.limitingFactors.includes("dependency_unavailable"));
});

test("Task 12 trust thresholds map exact boundaries and policy version is stable", () => {
  const at = (score: number) =>
    evaluateMetricTrust(input({ confidence: { level: "high", score } }));
  assert.equal(at(0.49).level, "low");
  assert.equal(at(0.5).level, "medium");
  assert.equal(at(0.79).level, "medium");
  assert.equal(at(0.8).level, "high");
  assert.equal(at(1).policyVersion, FITCORE_METRIC_TRUST_POLICY_VERSION);
});

test("Task 12 trust reasons are deterministic, deduplicated, and input remains immutable", () => {
  const value = input({ metricStatus: "needs_more_data", provenance: null });
  const before = JSON.stringify(value);
  const first = evaluateMetricTrust(value);
  assert.deepEqual(first, evaluateMetricTrust(value));
  assert.deepEqual(first.limitingFactors, [...new Set(first.limitingFactors)].sort());
  assert.equal(JSON.stringify(value), before);
});
