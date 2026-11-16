import { buildDailyDecision, getWhatChangedSignals } from "../../src/lib/daily-decision";
import { expect, test } from "bun:test";
import { calculatePersonalScores, readinessHistory } from "../../src/lib/analytics/personal-scores";
import { buildAICoachContext } from "../../src/lib/fitcore-data";
import { defaultState, type Workout } from "../../src/lib/types";

const now = new Date(2026, 10, 16, 12).getTime();
const day = 86_400_000;
const check = {
  id: "check",
  createdAt: now - 3_600_000,
  energy: 1,
  motivation: 1,
  soreness: 10,
  stress: 10,
};
const sleep = { id: "sleep", createdAt: now - 7_200_000, hours: 8, quality: 10 };

test("empty and profile-only accounts have unavailable scores", () => {
  const result = calculatePersonalScores({ ...defaultState, onboardingComplete: true }, now);
  for (const metric of Object.values(result)) {
    expect(metric.status).toBe("unavailable");
    expect(metric.value).toBeNull();
  }
});

test("direct observations are provisional alone, and stale observations produce no score", () => {
  const manual = calculatePersonalScores({ ...defaultState, recoveryCheckIns: [check] }, now);
  expect(manual.readiness).toMatchObject({ status: "limited", value: 10 });
  expect(manual.recovery.value).toBeNull();
  const sleepOnly = calculatePersonalScores({ ...defaultState, sleepEntries: [sleep] }, now);
  expect(sleepOnly.readiness).toMatchObject({ status: "limited", value: 100 });
  expect(
    calculatePersonalScores({ ...defaultState, sleepEntries: [sleep] }, now + 5 * day).readiness,
  ).toMatchObject({ status: "stale", value: null });
  expect(
    calculatePersonalScores(
      { ...defaultState, sleepEntries: [sleep], recoveryCheckIns: [check] },
      now,
    ).readiness,
  ).toMatchObject({ status: "available", value: 55 });
});

test("chart days with no direct evidence remain gaps", () => {
  const series = readinessHistory(
    { ...defaultState, recoveryCheckIns: [check, { ...check, createdAt: now - 2 * day }] },
    now,
  );
  expect(series).toHaveLength(14);
  expect(series.slice(-3).map((point) => point.value)).toEqual([10, null, 10]);
});

const liftingSession = (id: string, daysAgo: number, weight: number, reps = 5): Workout => ({
  id,
  name: "Logged workout",
  startedAt: now - daysAgo * day - 3_600_000,
  endedAt: now - daysAgo * day,
  exercises: [
    {
      id: `${id}-exercise`,
      exerciseId: "squat",
      completed: true,
      sets: [{ id: `${id}-set`, weight, reps, completed: true }],
    },
  ],
});

test("no progress appears without matching performed lifts on different days", () => {
  const state = structuredClone(defaultState);
  state.workouts = [liftingSession("one", 1, 100)];
  const single = calculatePersonalScores(state, now);
  expect(single.progress).toMatchObject({ status: "limited", value: null });
  expect(single.recovery.value).toBeNull();
  state.workouts.push(liftingSession("two", 3, 95, 8));
  expect(calculatePersonalScores(state, now).progress.value).toBeNull();
  state.workouts.push(liftingSession("three", 4, 100));
  expect(calculatePersonalScores(state, now).progress.value).toBe(60);
});

test("partial meals do not count as poor nutrition and all supported parts unlock the overall score", () => {
  const state = structuredClone(defaultState);
  state.sleepEntries = [sleep];
  state.recoveryCheckIns = [check];
  state.workouts = [
    liftingSession("current", 1, 105),
    liftingSession("past-a", 4, 100),
    liftingSession("past-b", 6, 100),
  ];
  state.nutritionTargets = { calories: 3000, protein: 180, carbs: 0, fat: 0 };
  const meals = [1, 2, 3].flatMap((offset) =>
    ["breakfast", "lunch", "dinner"].map((type) => ({
      id: `${offset}-${type}`,
      name: type,
      type,
      createdAt: now - offset * day,
      calories: 1000,
      protein: 60,
      carbs: 0,
      fat: 0,
    })),
  );
  state.mealEntries = meals.slice(0, 1);
  const partial = calculatePersonalScores(state, now);
  expect(partial.nutrition).toMatchObject({ status: "limited", value: null });
  expect(partial.recovery.value).toBeGreaterThan(0);
  expect(partial.fitcore.value).toBeNull();
  state.mealEntries = meals;
  const complete = calculatePersonalScores(state, now);
  expect(complete.nutrition.value).toBe(100);
  expect(complete.fitcore.status).toBe("available");
  expect(complete.fitcore.value).toBe(
    Math.round(
      complete.training.value! * 0.35 +
        complete.nutrition.value! * 0.25 +
        complete.recovery.value! * 0.25 +
        complete.progress.value! * 0.15,
    ),
  );
  expect(calculatePersonalScores(state, now + 40 * day).fitcore).toMatchObject({
    status: "stale",
    value: null,
  });
});

test("demo is labeled and AI context receives no synthetic or unavailable numbers", () => {
  const state = {
    ...defaultState,
    demoMode: true,
    recoveryCheckIns: [check],
    sleepEntries: [sleep],
  };
  expect(calculatePersonalScores(state, now).readiness).toMatchObject({ demo: true, value: 55 });
  expect(buildAICoachContext(state, "recovery")).toContain("Demo Data");
  expect(buildAICoachContext(state, "recovery")).not.toContain("Recent recorded workouts:");
  expect(buildAICoachContext(defaultState, "recovery")).toContain("Readiness: Not enough data");
  expect(buildAICoachContext(defaultState, "recovery")).toContain("Recovery: Not enough data");
  expect(buildAICoachContext(defaultState, "recovery")).toContain(
    "Nutrition today: no confirmed meal records",
  );
});

test("pain-only Jarvis notes and a partial meal day cannot create readiness or intensity evidence", () => {
  const at = new Date(2026, 10, 16, 20).getTime();
  const state = {
    ...defaultState,
    recoveryCheckIns: [{ ...check, id: "pain", energy: 5, motivation: 5, stress: 5 }],
    jarvisAudit: [{
      id: "audit",
      tool: "logWorkoutPainOrSoreness",
      status: "logged" as const,
      summary: "Pain note",
      entityIds: ["pain"],
      createdAt: now,
    }],
    workouts: [liftingSession("prior", 10, 100)],
    mealEntries: [{
      id: "breakfast",
      name: "Oatmeal",
      type: "breakfast",
      calories: 150,
      protein: 5,
      carbs: 28,
      fat: 3,
      createdAt: now,
    }],
  };
  expect(calculatePersonalScores(state, at).readiness.value).toBeNull();
  expect(buildDailyDecision(state, at).nutrition.underEatingWarning).toBe(false);
  expect(getWhatChangedSignals(state, at).some((signal) => signal.type === "training_frequency")).toBe(false);
});
