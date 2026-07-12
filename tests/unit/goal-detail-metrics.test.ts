import assert from "node:assert/strict";
import { test } from "bun:test";

import {
  GOAL_PACE_TOLERANCE_PERCENT,
  getCoreDomainAnalytics,
  getExerciseAndMuscleAnalytics,
  getGoalDetailAnalytics,
  getNutritionDetailAnalytics,
  getRecoveryDetailAnalytics,
} from "../../src/lib/analytics.ts";
import { defaultState, type AppState, type Goal } from "../../src/lib/types.ts";

const NOW = new Date(2026, 2, 7, 18, 0, 0, 0).getTime();

function timestamp(daysAgo: number): number {
  const value = new Date(2026, 2, 7, 12, 0, 0, 0);
  value.setDate(value.getDate() - daysAgo);
  return value.getTime();
}

function goal(id: string, patch: Partial<Goal> = {}): Goal {
  return {
    id,
    type: "bodyweight",
    label: `Goal ${id}`,
    current: 110,
    target: 120,
    ...patch,
  };
}

function weight(id: string, daysAgo: number, weightLb: number) {
  return { id, createdAt: timestamp(daysAgo), weightLb };
}

function makeState(patch: Partial<AppState> = {}): AppState {
  return {
    ...defaultState,
    goals: [],
    bodyweightEntries: [],
    recoveryCheckIns: [],
    recoverySignals: [],
    workouts: [],
    activeWorkout: null,
    mealEntries: [],
    sleepEntries: [],
    customExercises: [],
    ...patch,
  };
}

function analytics(state: AppState) {
  return getGoalDetailAnalytics(state, { now: NOW });
}

function item(result: ReturnType<typeof analytics>, id = "goal") {
  const found = result.goals.find((entry) => entry.id === id);
  assert.ok(found, `expected goal ${id}`);
  return found;
}

function assertSafe(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    if (keyLooksLikeTimestamp(path)) assert.ok(new Date(value).toString() !== "Invalid Date");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafe(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) assertSafe(entry, `${path}.${key}`);
}

function keyLooksLikeTimestamp(path: string): boolean {
  return (
    path.endsWith("At") ||
    path.endsWith("timestamp") ||
    path.endsWith("start") ||
    path.endsWith("end")
  );
}

test("goal requirement 25: no goals returns safe structured output", () => {
  const result = analytics(makeState());
  assert.equal(result.availability.status, "unavailable");
  assert.deepEqual(result.goals, []);
  assert.equal(result.sourceMetadata.includedRecordCount, 0);
  assertSafe(result);
});

test("goal requirement 26: missing linked baseline makes progress unavailable", () => {
  const result = analytics(makeState({ goals: [goal("goal")] }));
  const metric = item(result).progress;
  assert.equal(metric.status, "unavailable");
  assert.equal(metric.value, null);
  assert.ok(metric.reasons.some((reason) => reason.code === "missing_baseline"));
});

test("goal requirement 27: missing current value has an exact reason", () => {
  const result = analytics(
    makeState({
      goals: [goal("goal", { current: Number.NaN })],
      bodyweightEntries: [weight("baseline", 7, 100)],
    }),
  );
  assert.equal(item(result).progress.status, "unavailable");
  assert.ok(
    item(result).progress.reasons.some((reason) => reason.code === "missing_current_value"),
  );
});

test("goal requirement 28: missing target has an exact reason", () => {
  const result = analytics(
    makeState({
      goals: [goal("goal", { target: Number.NaN })],
      bodyweightEntries: [weight("baseline", 7, 100)],
    }),
  );
  assert.equal(item(result).progress.status, "unavailable");
  assert.ok(item(result).progress.reasons.some((reason) => reason.code === "missing_target"));
});

test("goal requirements 29-30: increase and decrease progress are direction-aware", () => {
  const increase = analytics(
    makeState({
      goals: [goal("goal", { current: 110, target: 120 })],
      bodyweightEntries: [weight("baseline", 14, 100), weight("current", 0, 110)],
    }),
  );
  assert.equal(item(increase).progress.value?.direction, "increase");
  assert.equal(item(increase).progress.value?.displayProgressPercent, 50);

  const decrease = analytics(
    makeState({
      goals: [goal("goal", { current: 190, target: 180 })],
      bodyweightEntries: [weight("baseline", 14, 200), weight("current", 0, 190)],
    }),
  );
  assert.equal(item(decrease).progress.value?.direction, "decrease");
  assert.equal(item(decrease).progress.value?.displayProgressPercent, 50);
});

test("goal requirement 31: movement away from target never becomes positive display progress", () => {
  const result = analytics(
    makeState({
      goals: [goal("goal", { current: 90, target: 120 })],
      bodyweightEntries: [weight("baseline", 14, 100), weight("current", 0, 90)],
    }),
  );
  assert.ok((item(result).progress.value?.rawProgressPercent ?? 0) < 0);
  assert.equal(item(result).progress.value?.displayProgressPercent, 0);
  assert.equal(item(result).currentWeeklyPace.value?.movement, "away_from_target");
});

test("goal requirements 32-33: equal or passed targets are safe and deterministic", () => {
  const equal = analytics(
    makeState({
      goals: [goal("goal", { current: 100, target: 100 })],
      bodyweightEntries: [weight("baseline", 7, 100)],
    }),
  );
  assert.equal(item(equal).progress.value?.direction, "none");
  assert.equal(item(equal).progress.value?.displayProgressPercent, 100);
  assert.equal(item(equal).analyticalStatus, "completed");

  const passed = analytics(
    makeState({
      goals: [goal("goal", { current: 125, target: 120 })],
      bodyweightEntries: [weight("baseline", 14, 100), weight("current", 0, 125)],
    }),
  );
  assert.equal(item(passed).progress.value?.rawProgressPercent, 125);
  assert.equal(item(passed).progress.value?.displayProgressPercent, 100);
  assert.equal(item(passed).progress.value?.reachedTarget, true);
});

test("goal requirements 34-35: absent persisted deadlines keep risk unavailable even if runtime extras exist", () => {
  const extraDeadline = {
    ...goal("goal"),
    deadline: timestamp(10),
  } as Goal & { deadline: number };
  const result = analytics(
    makeState({ goals: [extraDeadline], bodyweightEntries: [weight("baseline", 7, 100)] }),
  );
  assert.equal(item(result).deadlineRisk.status, "unavailable");
  assert.equal(item(result).deadlineRisk.deadline, null);
  assert.ok(item(result).deadlineRisk.reasons.some((reason) => reason.code === "missing_deadline"));
  assert.equal(item(result).neededWeeklyPace.status, "unavailable");
});

test("goal requirement 36: one historical observation cannot calculate velocity", () => {
  const result = analytics(
    makeState({ goals: [goal("goal")], bodyweightEntries: [weight("one", 0, 110)] }),
  );
  assert.equal(item(result).currentWeeklyPace.status, "needs_more_data");
  assert.equal(item(result).currentWeeklyPace.value, null);
  assert.ok(
    item(result).currentWeeklyPace.reasons.some(
      (reason) => reason.code === "insufficient_goal_history",
    ),
  );
});

test("goal requirement 37: two valid dated observations calculate weekly pace", () => {
  const result = analytics(
    makeState({
      goals: [goal("goal", { current: 110, target: 120 })],
      bodyweightEntries: [weight("old", 7, 100), weight("new", 0, 110)],
    }),
  );
  const pace = item(result).currentWeeklyPace;
  assert.equal(pace.status, "ready");
  assert.equal(pace.value?.totalObservedChange, 10);
  assert.equal(pace.value?.elapsedDays, 7);
  assert.equal(pace.value?.weeklyPace, 10);
  assert.equal(pace.value?.unit, "lb/week");
});

test("goal requirement 38: duplicate timestamps resolve without zero-time division", () => {
  const result = analytics(
    makeState({
      goals: [goal("goal")],
      bodyweightEntries: [weight("a", 7, 100), weight("b", 7, 105), weight("c", 0, 110)],
    }),
  );
  assert.equal(item(result).currentWeeklyPace.status, "ready");
  assert.equal(item(result).currentWeeklyPace.sampleSize, 2);
  assertSafe(result);
});

test("goal requirements 39-40: needed pace is unavailable without deadline but completed goals need zero", () => {
  const incomplete = analytics(
    makeState({ goals: [goal("goal")], bodyweightEntries: [weight("baseline", 7, 100)] }),
  );
  assert.equal(item(incomplete).neededWeeklyPace.status, "unavailable");
  assert.ok(
    item(incomplete).neededWeeklyPace.reasons.some((reason) => reason.code === "missing_deadline"),
  );

  const completed = analytics(
    makeState({
      goals: [goal("goal", { current: 120, target: 120 })],
      bodyweightEntries: [weight("baseline", 7, 100), weight("current", 0, 120)],
    }),
  );
  assert.equal(item(completed).neededWeeklyPace.status, "ready");
  assert.equal(item(completed).neededWeeklyPace.value?.weeklyPace, 0);
  assert.equal(item(completed).neededWeeklyPace.value?.remainingChange, 0);
});

test("goal requirements 41-42: away or zero pace cannot produce a projection", () => {
  const away = analytics(
    makeState({
      goals: [goal("goal", { current: 90, target: 120 })],
      bodyweightEntries: [weight("old", 7, 100), weight("new", 0, 90)],
    }),
  );
  assert.equal(item(away).projection.status, "unavailable");
  assert.ok(
    item(away).projection.reasons.some((reason) => reason.code === "pace_away_from_target"),
  );

  const zero = analytics(
    makeState({
      goals: [goal("goal", { current: 100, target: 120 })],
      bodyweightEntries: [weight("old", 7, 100), weight("new", 0, 100)],
    }),
  );
  assert.equal(item(zero).projection.status, "unavailable");
  assert.ok(item(zero).projection.reasons.some((reason) => reason.code === "zero_velocity"));
});

test("goal requirement 43: valid toward-target pace produces a deterministic projection", () => {
  const state = makeState({
    goals: [goal("goal", { current: 120, target: 140 })],
    bodyweightEntries: [weight("old", 14, 100), weight("middle", 7, 110), weight("new", 0, 120)],
  });
  const first = analytics(state);
  const second = analytics(state);
  assert.equal(item(first).projection.status, "ready");
  assert.equal(item(first).projection.value?.state, "projected");
  assert.equal(
    item(first).projection.value?.projectedCompletionAt,
    timestamp(-14) - 12 * 60 * 60 * 1000,
  );
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("goal requirements 44-45: deadline statuses stay unavailable without schema support and completed is never behind", () => {
  const incomplete = analytics(
    makeState({ goals: [goal("goal")], bodyweightEntries: [weight("baseline", 7, 100)] }),
  );
  assert.equal(item(incomplete).deadlineRisk.tolerancePercent, GOAL_PACE_TOLERANCE_PERCENT);
  assert.equal(item(incomplete).analyticalStatus, "unavailable");
  assert.equal(item(incomplete).deadlineRisk.status, "unavailable");

  const completed = analytics(
    makeState({
      goals: [goal("goal", { current: 125, target: 120 })],
      bodyweightEntries: [weight("baseline", 7, 100), weight("current", 0, 125)],
    }),
  );
  assert.equal(item(completed).analyticalStatus, "completed");
  assert.equal(item(completed).deadlineRisk.status, "completed");
});

test("goal requirements 46-47: sparse and stale histories remain low confidence", () => {
  const sparse = analytics(
    makeState({
      goals: [goal("goal")],
      bodyweightEntries: [weight("old", 7, 100), weight("new", 0, 110)],
    }),
  );
  assert.equal(item(sparse).currentWeeklyPace.confidence, "low");

  const stale = analytics(
    makeState({
      goals: [goal("goal", { current: 110, target: 120 })],
      bodyweightEntries: [weight("old", 60, 100), weight("new", 40, 110)],
    }),
  );
  assert.equal(item(stale).currentWeeklyPace.confidence, "low");
  assert.ok(
    item(stale).currentWeeklyPace.reasons.some(
      (reason) => reason.code === "stale_goal_measurement",
    ),
  );
});

test("goal requirement 48: unsupported goal units and history linkage are unavailable", () => {
  const result = analytics(
    makeState({ goals: [goal("goal", { type: "lift", current: 200, target: 225 })] }),
  );
  assert.equal(item(result).progress.status, "unavailable");
  assert.ok(item(result).progress.reasons.some((reason) => reason.code === "incompatible_units"));
  assert.ok(
    item(result).progress.reasons.some((reason) => reason.code === "uncertain_goal_linkage"),
  );
});

test("goal requirements 49-52: duplicate goals, input order, repetition, and sources are deterministic", () => {
  const goals = [
    goal("z", { current: 110 }),
    goal("a", { current: 105 }),
    goal("a", { current: 115 }),
  ];
  const measurements = [weight("z-weight", 7, 100), weight("a-weight", 0, 110)];
  const forward = analytics(makeState({ goals, bodyweightEntries: measurements }));
  const reversed = analytics(
    makeState({ goals: [...goals].reverse(), bodyweightEntries: [...measurements].reverse() }),
  );
  const repeated = analytics(makeState({ goals, bodyweightEntries: measurements }));
  assert.equal(forward.goals.length, 2);
  assert.deepEqual(forward.sourceMetadata.entryIds, ["a", "z"]);
  assert.equal(
    new Set(forward.sourceMetadata.entryIds).size,
    forward.sourceMetadata.entryIds.length,
  );
  assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
  assert.equal(JSON.stringify(forward), JSON.stringify(repeated));
});

test("goal requirements 53-54: missing reasons and completeness are exact", () => {
  const result = analytics(makeState({ goals: [goal("goal", { type: "habit" })] }));
  const goalResult = item(result);
  assert.ok(goalResult.reasons.some((reason) => reason.code === "missing_baseline"));
  assert.ok(goalResult.reasons.some((reason) => reason.code === "missing_deadline"));
  assert.equal(goalResult.completeness.hasGoalRecord, true);
  assert.equal(goalResult.completeness.hasBaseline, false);
  assert.equal(goalResult.completeness.hasDeadline, false);
  assert.equal(goalResult.completeness.hasMeasurementHistory, false);
  assert.equal(goalResult.completeness.deadlineRiskReady, false);
  assert.equal(goalResult.completeness.hasCertainSourceLinkage, false);
});

test("goal requirements 55-56: inputs remain immutable and outputs contain no invalid values", () => {
  const state = makeState({
    goals: [goal("goal")],
    bodyweightEntries: [weight("old", 7, 100), weight("new", 0, 110)],
  });
  const before = structuredClone(state);
  const result = analytics(state);
  assert.deepEqual(state, before);
  assertSafe(result);
});

test("compatibility requirements 57-62 and 64: Tasks 1-6 APIs and empty imports remain safe", () => {
  const state = makeState();
  assert.ok(getCoreDomainAnalytics(state, NOW));
  assert.ok(getExerciseAndMuscleAnalytics(state, { now: NOW }));
  assert.ok(getNutritionDetailAnalytics(state, { now: NOW }));
  assert.ok(getRecoveryDetailAnalytics(state, { now: NOW }));
  assert.ok(getGoalDetailAnalytics(state, { now: NOW }));
});
