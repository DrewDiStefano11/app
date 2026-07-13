import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  METRIC_FRESHNESS_POLICIES,
  evaluateMetricFreshness,
  type MetricFreshnessInput,
} from "../../src/lib/analytics.ts";

const NOW = Date.UTC(2026, 6, 13, 16);

test("Task 12 freshness policies honor exact fresh and aging boundaries", () => {
  for (const collection of [
    "recovery_check_ins",
    "meal_entries",
    "workouts",
    "bodyweight_entries",
    "goals",
    "profile",
  ] as const) {
    const policy = METRIC_FRESHNESS_POLICIES[collection];
    assert.notEqual(policy.freshThroughMs, null);
    assert.notEqual(policy.agingThroughMs, null);
    const fresh = policy.freshThroughMs as number;
    const aging = policy.agingThroughMs as number;
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW - fresh + 1 }).state,
      "fresh",
    );
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW - fresh }).state,
      "fresh",
    );
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW - fresh - 1 }).state,
      "aging",
    );
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW - aging }).state,
      "aging",
    );
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW - aging - 1 }).state,
      "stale",
    );
    assert.equal(evaluateMetricFreshness({ collection, now: NOW }).state, "unknown");
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, lastLoggedAt: NOW + 1 }).state,
      "invalid",
    );
    assert.equal(
      evaluateMetricFreshness({
        collection,
        now: NOW,
        lastLoggedAt: NOW,
        staleReasonCodes: ["stale_data"],
      }).state,
      "stale",
    );
    assert.equal(
      evaluateMetricFreshness({ collection, now: NOW, latestIncludedAt: NOW - 1 }).state,
      "fresh",
    );
  }
});

test("Task 12 freshness uses fallback timestamps and treats missing and future timestamps honestly", () => {
  const fallback = evaluateMetricFreshness({
    collection: "workouts",
    now: NOW,
    lastLoggedAt: null,
    latestIncludedAt: NOW - 1000,
  });
  assert.equal(fallback.state, "fresh");
  assert.equal(fallback.sourceTimestamp, NOW - 1000);
  const missing = evaluateMetricFreshness({ collection: "workouts", now: NOW });
  assert.equal(missing.state, "unknown");
  assert.equal(missing.score, null);
  assert.equal(missing.ageMs, null);
  const future = evaluateMetricFreshness({
    collection: "workouts",
    now: NOW,
    lastLoggedAt: NOW + 1,
  });
  assert.equal(future.state, "invalid");
  assert.equal(future.score, 0);
});

test("Task 12 approved stale reasons force the stale score cap", () => {
  const result = evaluateMetricFreshness({
    collection: "recovery_check_ins",
    now: NOW,
    lastLoggedAt: NOW,
    staleReasonCodes: ["stale_recovery_data"],
  });
  assert.equal(result.state, "stale");
  assert.equal(result.score, 0.25);
});

test("Task 12 derived freshness inherits the weakest dependency", () => {
  const fresh = evaluateMetricFreshness({ collection: "workouts", now: NOW, lastLoggedAt: NOW });
  const stale = evaluateMetricFreshness({
    collection: "meal_entries",
    now: NOW,
    lastLoggedAt: NOW - 4 * 24 * 60 * 60 * 1000,
  });
  const derived = evaluateMetricFreshness({
    collection: "derived_metrics",
    now: NOW,
    dependencyFreshness: [fresh, stale],
  });
  assert.equal(derived.state, "stale");
  assert.equal(derived.score, 0.25);
  assert.ok(derived.reasons.some((item) => item.code === "dependency_freshness_inherited"));
});

test("Task 12 freshness is deterministic and does not mutate input", () => {
  const input: MetricFreshnessInput = {
    collection: "goals",
    now: NOW,
    latestIncludedAt: NOW - 1000,
    staleReasonCodes: [],
  };
  const before = JSON.stringify(input);
  assert.deepEqual(evaluateMetricFreshness(input), evaluateMetricFreshness(input));
  assert.equal(JSON.stringify(input), before);
});
