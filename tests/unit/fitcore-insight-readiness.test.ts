import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  FITCORE_ANALYTICS_PRESENTATION_CATALOG,
  FITCORE_INSIGHT_MINIMUMS,
  getFitCoreAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0).getTime();

function timestamp(daysAgo: number): number {
  const date = new Date(2026, 2, 7, 12, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
}

function state(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    recoveryCheckIns: [],
    recoverySignals: [],
    bodyweightEntries: [],
    goals: [],
    customExercises: [],
    sleepEntries: [],
    ...patch,
  };
}

function correlatedState(constant = false): AppState {
  const days = Array.from(
    { length: FITCORE_INSIGHT_MINIMUMS.correlationSamples },
    (_, index) => index,
  );
  return state({
    mealEntries: days.map((day) => ({
      id: `meal-${day}`,
      name: `Meal ${day}`,
      createdAt: timestamp(day),
      calories: constant ? 500 : 500 + day * 100,
      protein: constant ? 40 : 40 + day * 5,
      carbs: 50,
      fat: 15,
    })),
    recoveryCheckIns: days.map((day) => ({
      id: `recovery-${day}`,
      createdAt: timestamp(day),
      energy: constant ? 7 : 5 + day,
      soreness: constant ? 3 : 7 - day,
      stress: constant ? 4 : 6 - day,
      motivation: constant ? 7 : 5 + day,
    })),
    bodyweightEntries: days.map((day) => ({
      id: `weight-${day}`,
      createdAt: timestamp(day),
      weightLb: constant ? 180 : 180 + day,
    })),
  });
}

function assertSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${path} must be finite`);
  if (Array.isArray(value))
    return value.forEach((item, index) => assertSafe(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => assertSafe(item, `${path}.${key}`));
}

test("Task 10 requirements 1-4: empty state returns stable honest readiness", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  assert.equal(result.insightReadiness.items.length, 10);
  assert.equal(result.insightReadiness.readyCount, 0);
  assert.equal(result.insightReadiness.needsMoreDataCount, 7);
  assert.equal(result.insightReadiness.unavailableCount, 3);
  for (const item of result.insightReadiness.items) {
    if (item.status === "unavailable") assert.ok(item.reason.length > 0);
  }
});

test("Task 10 requirements 5-7: correlation readiness requires real minimum overlap", () => {
  const sparse = getFitCoreAnalytics(
    correlatedState().mealEntries.length
      ? state({
          mealEntries: correlatedState().mealEntries.slice(0, 1),
          recoveryCheckIns: correlatedState().recoveryCheckIns.slice(0, 1),
        })
      : state(),
    { now: NOW },
  );
  assert.equal(
    sparse.correlations.find((item) => item.id === "correlation.protein.recovery_readiness")
      ?.status,
    "needs_more_data",
  );
  const ready = getFitCoreAnalytics(correlatedState(), { now: NOW });
  assert.equal(
    ready.correlations.find((item) => item.id === "correlation.protein.recovery_readiness")?.status,
    "ready",
  );
  assert.equal(
    ready.insightReadiness.items.find((item) => item.id === "insight.protein.recovery_readiness")
      ?.status,
    "ready",
  );
});

test("Task 10 requirement 8: zero variance cannot create a ready correlation", () => {
  const result = getFitCoreAnalytics(correlatedState(true), { now: NOW });
  const correlation = result.correlations.find(
    (item) => item.id === "correlation.protein.recovery_readiness",
  );
  assert.equal(correlation?.status, "unavailable");
  assert.equal(correlation?.coefficient, null);
});

test("Task 10 requirements 9-11: priority, confidence, and IDs are stable", () => {
  const first = getFitCoreAnalytics(correlatedState(), { now: NOW }).insightReadiness.items;
  const second = getFitCoreAnalytics(correlatedState(), { now: NOW }).insightReadiness.items;
  assert.deepEqual(
    first.map(({ id, priority, confidence }) => ({ id, priority, confidence })),
    second.map(({ id, priority, confidence }) => ({ id, priority, confidence })),
  );
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
});

test("Task 10 requirements 12-14: related correlations and source metadata resolve", () => {
  const result = getFitCoreAnalytics(correlatedState(), { now: NOW });
  const correlationIds = new Set(result.correlations.map((item) => item.id));
  const approvedMetricIds = new Set(
    FITCORE_ANALYTICS_PRESENTATION_CATALOG.map((item) => item.sourceMetricId),
  );
  for (const item of result.insightReadiness.items) {
    if (item.relatedCorrelationId) assert.ok(correlationIds.has(item.relatedCorrelationId));
    assert.ok(item.source.sourceMetricIds.length > 0);
    assert.ok(
      item.source.sourceMetricIds.some(
        (id) => approvedMetricIds.has(id) || id.startsWith("progress.bodyweight"),
      ),
    );
  }
});

test("Task 10 requirements 15-18: ranges and sample sizes remain safe", () => {
  const result = getFitCoreAnalytics(correlatedState(), { now: NOW });
  for (const item of result.insightReadiness.items) {
    assert.ok(Number.isInteger(item.source.sampleSize));
    assert.ok(item.source.sampleSize >= 0);
    assert.ok(
      item.source.dateRange === null || item.source.dateRange.start <= item.source.dateRange.end,
    );
  }
  assertSafe(result);
});

test("Task 10 requirements 19-22: no fake or causal insight is emitted", () => {
  const result = getFitCoreAnalytics(state(), { now: NOW });
  for (const item of result.insightReadiness.items) {
    if (item.relatedCorrelationId) assert.equal(item.source.causationWarning, true);
    if (item.status !== "ready" && item.relatedCorrelationId) {
      const correlation = result.correlations.find(
        (entry) => entry.id === item.relatedCorrelationId,
      );
      assert.notEqual(correlation?.coefficient, 0);
    }
  }
  const text = result.insightReadiness.items
    .map((item) => `${item.title} ${item.reason}`)
    .join(" ")
    .toLowerCase();
  for (const phrase of [
    "causes",
    "makes you",
    "leads to",
    "perform better when",
    "perform worse when",
  ]) {
    assert.equal(text.includes(phrase), false);
  }
});

test("Task 10 requirements 23-26: aggregate fields are present and serializable", () => {
  for (const input of [state(), correlatedState()]) {
    const result = getFitCoreAnalytics(input, { now: NOW });
    assert.ok(Array.isArray(result.correlations));
    assert.ok(Array.isArray(result.insightReadiness.items));
    assert.doesNotThrow(() => JSON.stringify(result));
  }
});

test("Task 10 requirements 27-28: state is immutable and repeated output is equal", () => {
  const input = correlatedState();
  const before = JSON.stringify(input);
  const first = getFitCoreAnalytics(input, { now: NOW });
  const second = getFitCoreAnalytics(input, { now: NOW });
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(first, second);
});

test("Task 10 requirement 29: goal deadline risk remains honestly unavailable", () => {
  const input = state({
    goals: [{ id: "goal", type: "bodyweight", label: "Goal", current: 180, target: 175 }],
  });
  const item = getFitCoreAnalytics(input, { now: NOW }).insightReadiness.items.find(
    (entry) => entry.id === "insight.goal.deadline_risk",
  );
  assert.equal(item?.status, "unavailable");
  assert.match(item?.reason ?? "", /deadline/i);
});

test("Task 10 requirement 30: unsupported muscle mapping stays unavailable", () => {
  const item = getFitCoreAnalytics(state(), { now: NOW }).insightReadiness.items.find(
    (entry) => entry.id === "insight.muscle_group.load_imbalance",
  );
  assert.equal(item?.status, "unavailable");
  assert.match(item?.reason ?? "", /mapping/i);
});
