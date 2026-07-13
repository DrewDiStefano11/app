import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  RECOVERY_HIGH_SORENESS_THRESHOLD,
  RECOVERY_LOW_READINESS_THRESHOLD,
  getRecoveryDetailAnalytics,
  recoveryDetailReadinessScore,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState, type RecoveryCheckIn } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0, 0).getTime();

function timestamp(daysAgo: number, hour = 12): number {
  const value = new Date(2026, 2, 7, hour, 0, 0, 0);
  value.setDate(value.getDate() - daysAgo);
  return value.getTime();
}

function checkIn(
  id: string,
  daysAgo: number,
  patch: Partial<RecoveryCheckIn> = {},
): RecoveryCheckIn {
  return {
    id,
    createdAt: timestamp(daysAgo),
    energy: 7,
    soreness: 3,
    stress: 3,
    motivation: 8,
    ...patch,
  };
}

function makeState(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    recoveryCheckIns: [],
    recoverySignals: [],
    sleepEntries: [],
    muscleFatigue: {},
    goals: [],
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    bodyweightEntries: [],
    ...patch,
  };
}

function analytics(state: AppState, days = 7) {
  return getRecoveryDetailAnalytics(state, { now: NOW, days });
}

function assertSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafe(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assertSafe(item, `${path}.${key}`);
    if (typeof item === "number" && key.toLowerCase().includes("count")) {
      assert.ok(item >= 0, `${path}.${key} must be nonnegative`);
    }
    if (typeof item === "number" && key.toLowerCase().includes("percent")) {
      assert.ok(item >= 0 && item <= 100, `${path}.${key} must be a valid percent`);
    }
  }
}

test("recovery requirements 1 and 23: empty recovery is structured and numerically safe", () => {
  const result = analytics(makeState());
  assert.equal(result.availability.status, "unavailable");
  assert.equal(result.trends.soreness.status, "unavailable");
  assert.equal(result.consistency.status, "unavailable");
  assert.equal(result.warningConditions.highSoreness.daysSinceLatest.value, null);
  assertSafe(result);
});

test("recovery requirements 2-3: one sparse check-in cannot claim a trend", () => {
  const result = analytics(makeState({ recoveryCheckIns: [checkIn("one", 0)] }));
  for (const field of ["soreness", "energy", "motivation", "stress", "readiness"] as const) {
    assert.equal(result.trends[field].status, "needs_more_data");
    assert.equal(result.trends[field].value?.hasEnoughData, false);
    assert.equal(result.trends[field].trendQuality?.direction, "unknown");
  }
});

test("recovery requirement 4: valid soreness observations calculate an observed trend", () => {
  const result = analytics(
    makeState({
      recoveryCheckIns: [
        checkIn("old", 3, { soreness: 2 }),
        checkIn("middle", 2, { soreness: 4 }),
        checkIn("new", 1, { soreness: 6 }),
      ],
    }),
  );
  assert.equal(result.trends.soreness.status, "ready");
  assert.equal(result.trends.soreness.value?.latestValue, 6);
  assert.equal(result.trends.soreness.value?.previousValue, 4);
  assert.equal(result.trends.soreness.value?.magnitude, 2);
  assert.equal(result.trends.soreness.value?.direction, "up");
});

test("recovery requirement 5: high-soreness threshold is inclusive and named", () => {
  const result = analytics(
    makeState({
      recoveryCheckIns: [
        checkIn("below", 3, { soreness: RECOVERY_HIGH_SORENESS_THRESHOLD - 1 }),
        checkIn("at", 2, { soreness: RECOVERY_HIGH_SORENESS_THRESHOLD }),
        checkIn("above", 1, { soreness: RECOVERY_HIGH_SORENESS_THRESHOLD + 1 }),
      ],
    }),
  );
  assert.equal(result.warningConditions.highSoreness.threshold, RECOVERY_HIGH_SORENESS_THRESHOLD);
  assert.equal(result.warningConditions.highSoreness.comparison, "at_or_above");
  assert.equal(result.warningConditions.highSoreness.count.value, 2);
});

test("recovery requirement 6: derived low-readiness threshold is inclusive", () => {
  const atThreshold = checkIn("at", 2, { energy: 5, motivation: 5, soreness: 6, stress: 6 });
  assert.equal(recoveryDetailReadinessScore(atThreshold), RECOVERY_LOW_READINESS_THRESHOLD);
  const result = analytics(
    makeState({
      recoveryCheckIns: [
        checkIn("below", 3, { energy: 1, motivation: 1, soreness: 10, stress: 10 }),
        atThreshold,
        checkIn("above", 1, { energy: 10, motivation: 10, soreness: 1, stress: 1 }),
      ],
    }),
  );
  assert.equal(result.warningConditions.lowReadiness.comparison, "at_or_below");
  assert.equal(result.warningConditions.lowReadiness.count.value, 2);
});

test("recovery requirements 7-8: threshold recency uses injected local calendar days", () => {
  const result = analytics(
    makeState({
      recoveryCheckIns: [
        checkIn("sore", 3, { soreness: 8 }),
        checkIn("low", 2, { energy: 1, motivation: 1, soreness: 6, stress: 10 }),
      ],
    }),
  );
  assert.equal(result.warningConditions.highSoreness.daysSinceLatest.value, 3);
  assert.equal(result.warningConditions.lowReadiness.daysSinceLatest.value, 2);
});

test("recovery requirement 9: no qualifying threshold observation has an exact reason", () => {
  const result = analytics(
    makeState({ recoveryCheckIns: [checkIn("normal", 0, { soreness: 2 })] }),
  );
  assert.equal(result.warningConditions.highSoreness.daysSinceLatest.status, "unavailable");
  assert.ok(
    result.warningConditions.highSoreness.daysSinceLatest.reasons.some(
      (reason) => reason.code === "no_high_soreness_observation",
    ),
  );
});

test("recovery requirements 10-12: invalid/future timestamps and fields are isolated", () => {
  const result = analytics(
    makeState({
      recoveryCheckIns: [
        checkIn("invalid-time", 0, { createdAt: Number.NaN }),
        checkIn("future", 0, { createdAt: timestamp(0, 23) }),
        checkIn("partial", 1, { energy: Number.NaN, soreness: 8 }),
        checkIn("valid", 2, { energy: 6, soreness: 4 }),
      ],
    }),
  );
  assert.equal(result.trends.energy.sampleSize, 1);
  assert.equal(result.trends.soreness.sampleSize, 2);
  assert.equal(result.warningConditions.highSoreness.count.value, 1);
  assert.ok(result.sourceMetadata.exclusions.some((item) => item.code === "invalid_timestamp"));
  assert.ok(result.sourceMetadata.exclusions.some((item) => item.code === "future_timestamp"));
  assert.notEqual(result.trends.soreness.confidence, "high");
});

test("recovery requirements 13-14: duplicate IDs and reversed inputs are deterministic", () => {
  const records = [
    checkIn("duplicate", 2, { soreness: 8 }),
    checkIn("duplicate", 2, { soreness: 4 }),
    checkIn("other", 1, { soreness: 6 }),
  ];
  const forward = analytics(makeState({ recoveryCheckIns: records }));
  const reverse = analytics(makeState({ recoveryCheckIns: [...records].reverse() }));
  assert.equal(forward.sourceMetadata.includedRecordCount, 2);
  assert.equal(JSON.stringify(forward), JSON.stringify(reverse));
  assert.ok(forward.sourceMetadata.excludedRecordCount >= 1);
});

test("recovery requirements 15-16: same-day check-ins count once and missing days stay missing", () => {
  const sameDayLater = checkIn("later", 0, { createdAt: timestamp(0, 16) });
  const result = analytics(
    makeState({ recoveryCheckIns: [checkIn("earlier", 0), sameDayLater, checkIn("prior", 2)] }),
  );
  assert.equal(result.consistency.value?.totalValidCheckIns, 3);
  assert.equal(result.consistency.value?.distinctLoggedDays, 2);
  assert.equal(result.consistency.value?.unloggedDays, 5);
  assert.deepEqual(result.consistency.value?.loggedDayKeys.length, 2);
});

test("recovery requirements 17-18: absent structured pain and body-area observations are unavailable", () => {
  const result = analytics(makeState({ recoveryCheckIns: [checkIn("check", 0)] }));
  assert.equal(result.signals.painFlagCount.status, "unavailable");
  assert.equal(result.signals.bodyAreaSoreness.status, "unavailable");
  assert.ok(
    result.signals.bodyAreaSoreness.reasons.some((reason) => reason.code === "field_not_persisted"),
  );
});

test("recovery requirement 19: structured body-area soreness frequency is exact and stable", () => {
  const result = analytics(
    makeState({
      recoverySignals: [
        {
          id: "z",
          sourceLogId: "s",
          kind: "soreness",
          bodyArea: "quads",
          severity: 5,
          notes: "",
          createdAt: timestamp(1),
          source: "manual",
        },
        {
          id: "a",
          sourceLogId: "s",
          kind: "soreness",
          bodyArea: "quads",
          severity: 6,
          notes: "",
          createdAt: timestamp(2),
          source: "manual",
        },
        {
          id: "b",
          sourceLogId: "s",
          kind: "soreness",
          bodyArea: "hamstrings",
          severity: 4,
          notes: "",
          createdAt: timestamp(1),
          source: "manual",
        },
        {
          id: "pain",
          sourceLogId: "s",
          kind: "pain",
          bodyArea: "shoulder",
          severity: 4,
          notes: "",
          createdAt: timestamp(1),
          source: "manual",
        },
      ],
    }),
  );
  assert.equal(result.signals.painFlagCount.value, 1);
  assert.equal(result.signals.sorenessFlagCount.value, 3);
  assert.deepEqual(result.signals.bodyAreaSoreness.frequencies[0], {
    bodyArea: "quads",
    observationCount: 2,
    sourceSignalIds: ["a", "z"],
  });
});

test("recovery requirement 20: wearable-only values require real synchronization", () => {
  const result = analytics(makeState());
  assert.equal(result.wearableOnly.length, 8);
  for (const metric of result.wearableOnly) {
    assert.equal(metric.status, "unavailable");
    assert.equal(metric.value, null);
    assert.ok(metric.reasons.some((reason) => reason.code === "needs_wearable_sync"));
  }
});

test("recovery requirements 21-22: completeness and confidence reflect partial field coverage", () => {
  const result = analytics(
    makeState({
      recoveryCheckIns: [checkIn("partial", 1, { motivation: 20 }), checkIn("valid", 0)],
    }),
  );
  assert.equal(result.completeness.hasCheckIns, true);
  assert.equal(result.completeness.hasFatigueField, false);
  assert.equal(result.completeness.hasCompleteFieldCoverage, false);
  assert.equal(result.completeness.hasWearableData, false);
  assert.equal(result.completeness.hasExcludedOrInvalidRecords, true);
  assert.notEqual(result.trends.motivation.confidence, "high");
  assert.equal(result.trends.fatigue.status, "unavailable");
});

test("recovery requirement 24: recovery inputs remain immutable", () => {
  const state = makeState({
    recoveryCheckIns: [checkIn("b", 0), checkIn("a", 1)],
    recoverySignals: [
      {
        id: "signal",
        sourceLogId: "x",
        kind: "pain",
        severity: 3,
        notes: "",
        createdAt: timestamp(0),
        source: "manual",
      },
    ],
  });
  const before = structuredClone(state);
  analytics(state);
  assert.deepEqual(state, before);
});
