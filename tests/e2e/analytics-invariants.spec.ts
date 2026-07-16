import { expect, test } from "@playwright/test";
import {
  bestMuscleToTrainToday,
  bodyweightDelta,
  fitcoreScore,
  muscleMap,
  nutritionAdherenceScore,
  performanceScore,
  progressScore,
  readinessScore,
  recoveryScore,
  todayMealTotals,
  totalVolumeInRange,
  trainingConsistencyScore,
  trainingStreak,
  weeklyVolumeSeries,
  workoutVolume,
  workoutsInRange,
  momentumScore,
  type HeatMode,
} from "../../src/lib/analytics";
import type {
  AppState,
  MealEntry,
  RecoveryCheckIn,
  SleepEntry,
  Workout,
} from "../../src/lib/types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 0, 15, 12);
const realDateNow = Date.now;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectNumbersDeep(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectNumbersDeep);
  return Object.values(value).flatMap(collectNumbersDeep);
}

function expectNoInvalidNumbers(value: unknown) {
  for (const n of collectNumbersDeep(value)) {
    expect(Number.isNaN(n)).toBe(false);
    expect(Number.isFinite(n)).toBe(true);
  }
}

function expectScore(score: number) {
  expectNoInvalidNumbers(score);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
}

function expectUnchangedInput<T>(before: T, after: T) {
  expect(after).toEqual(before);
}

function at(daysAgo: number, hours = 12) {
  return NOW - daysAgo * DAY + (hours - 12) * 60 * 60 * 1000;
}

function makeWorkout(
  id: string,
  daysAgo: number,
  sets = [{ weight: 100, reps: 5, completed: true }],
): Workout {
  return {
    id,
    name: `Workout ${id}`,
    startedAt: at(daysAgo),
    exercises: [
      {
        id: `${id}-exercise`,
        exerciseId: "bench",
        completed: true,
        sets: sets.map((set, index) => ({ id: `${id}-set-${index}`, ...set })),
      },
    ],
  };
}

function makeMeal(id: string, daysAgo: number, overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id,
    name: `Meal ${id}`,
    type: "meal",
    calories: 500,
    protein: 40,
    carbs: 50,
    fat: 15,
    createdAt: at(daysAgo),
    ...overrides,
  };
}

function makeSleep(id: string, daysAgo: number, overrides: Partial<SleepEntry> = {}): SleepEntry {
  return { id, hours: 8, quality: 4, createdAt: at(daysAgo), ...overrides };
}

function makeCheckIn(
  id: string,
  daysAgo: number,
  overrides: Partial<RecoveryCheckIn> = {},
): RecoveryCheckIn {
  return {
    id,
    energy: 4,
    soreness: 2,
    stress: 2,
    motivation: 4,
    createdAt: at(daysAgo),
    ...overrides,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 2,
    onboardingComplete: true,
    profile: {
      goal: "hypertrophy",
      experience: "intermediate",
      daysPerWeek: 4,
      split: "Upper / Lower",
      bodyweightLb: 180,
      targetBodyweightLb: 185,
      units: "lb",
      sleepGoalH: 8,
    },
    personalization: {},
    nutritionTargets: { calories: 2200, protein: 160, carbs: 240, fat: 70 },
    workouts: [],
    activeWorkout: null,
    workoutTemplates: [],
    customExercises: [],
    cardioEntries: [],
    mealEntries: [],
    bodyweightEntries: [],
    sleepEntries: [],
    recoveryCheckIns: [],
    muscleFatigue: {},
    prs: [],
    goals: [],
    progressPhotos: [],
    aiMessages: [],
    reminders: { workout: false, weighIn: false, lunch: false },
    demoMode: false,
    jarvisSettings: {} as AppState["jarvisSettings"],
    jarvisAudit: [],
    jarvisLearning: {},
    userGoalsProfile: {},
    supplementLogs: [],
    dismissedSuggestions: [],
    ...overrides,
  };
}

test.describe("analytics invariants", () => {
  test.beforeEach(() => {
    Date.now = () => NOW;
  });

  test.afterEach(() => {
    Date.now = realDateNow;
  });

  test("empty input analytics return finite bounded values", () => {
    const state = makeState();
    const before = deepClone(state);

    const results = [
      workoutsInRange(state, 7),
      totalVolumeInRange(state, 7),
      trainingConsistencyScore(state),
      nutritionAdherenceScore(state),
      readinessScore(state),
      recoveryScore(state),
      progressScore(state),
      fitcoreScore(state),
      performanceScore(state),
      weeklyVolumeSeries(state, 7),
      todayMealTotals(state),
      trainingStreak(state),
      bodyweightDelta(state, 30),
      momentumScore(state),
      bestMuscleToTrainToday(state),
    ];

    for (const result of results) expectNoInvalidNumbers(result);
    for (const score of [
      trainingConsistencyScore(state),
      nutritionAdherenceScore(state),
      readinessScore(state),
      recoveryScore(state),
      progressScore(state),
      fitcoreScore(state),
      performanceScore(state),
      momentumScore(state).score,
    ]) {
      expectScore(score);
    }
    expect(weeklyVolumeSeries(state, 7)).toHaveLength(7);
    expect(momentumScore(state).label).toBe("Not Enough Data");
    expectUnchangedInput(before, state);
  });

  test("zero and missing boundary values do not produce NaN or Infinity", () => {
    const state = makeState({
      profile: { ...makeState().profile, daysPerWeek: 0, sleepGoalH: 0 },
      nutritionTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      workouts: [
        makeWorkout("zero", 1, [{ weight: 0, reps: 0, completed: true }, { completed: true }]),
      ],
      mealEntries: [makeMeal("zero", 0, { calories: 0, protein: 0, carbs: 0, fat: 0 })],
      sleepEntries: [makeSleep("zero", 0, { hours: 0, quality: 0 })],
      recoveryCheckIns: [
        makeCheckIn("zero", 0, { energy: 0, soreness: 0, stress: 0, motivation: 0 }),
      ],
      bodyweightEntries: [{ id: "bw", weightLb: 180, createdAt: at(0) }],
    });
    const before = deepClone(state);

    const outputs = [
      workoutVolume(state.workouts[0]),
      trainingConsistencyScore(state),
      nutritionAdherenceScore(state),
      readinessScore(state),
      recoveryScore(state),
      fitcoreScore(state),
      momentumScore(state),
      muscleMap(state, "load"),
      muscleMap(state, "strength"),
      muscleMap(state, "recovery"),
    ];

    for (const output of outputs) expectNoInvalidNumbers(output);
    for (const score of [
      trainingConsistencyScore(state),
      nutritionAdherenceScore(state),
      readinessScore(state),
      recoveryScore(state),
      fitcoreScore(state),
      momentumScore(state).score,
    ]) {
      expectScore(score);
    }
    expectUnchangedInput(before, state);
  });

  test("malformed negative and oversized signals remain finite and score-bounded", () => {
    const state = makeState({
      workouts: [makeWorkout("negative", 1, [{ weight: -100, reps: 5, completed: true }])],
      mealEntries: [makeMeal("negative", 0, { calories: -500, protein: -30, carbs: -10, fat: -5 })],
      sleepEntries: [makeSleep("oversized", 0, { hours: 30, quality: 10 })],
      recoveryCheckIns: [
        makeCheckIn("oversized", 0, { energy: 10, soreness: -5, stress: -5, motivation: 10 }),
      ],
      bodyweightEntries: [
        { id: "bw-1", weightLb: 185, createdAt: at(6) },
        { id: "bw-2", weightLb: 170, createdAt: at(0) },
      ],
    });

    for (const score of [
      nutritionAdherenceScore(state),
      readinessScore(state),
      recoveryScore(state),
      progressScore(state),
      fitcoreScore(state),
      momentumScore(state).score,
    ]) {
      expectScore(score);
    }
    expectNoInvalidNumbers(momentumScore(state));
  });

  test("date order, sparse weeks, same-day data, and duplicate dates stay stable", () => {
    const workouts = [
      makeWorkout("same-day-a", 1, [{ weight: 135, reps: 5, completed: true }]),
      makeWorkout("sparse", 6, [{ weight: 95, reps: 8, completed: true }]),
      makeWorkout("same-day-b", 1, [{ weight: 155, reps: 3, completed: true }]),
      makeWorkout("older", 20, [{ weight: 185, reps: 2, completed: true }]),
    ];
    const meals = [
      makeMeal("dup-a", 1, { createdAt: at(1, 8), protein: 80 }),
      makeMeal("dup-b", 1, { createdAt: at(1, 20), protein: 90 }),
      makeMeal("sparse", 6, { protein: 120 }),
    ];
    const base = makeState({
      workouts,
      mealEntries: meals,
      bodyweightEntries: [
        { id: "old", weightLb: 181, createdAt: at(14) },
        { id: "new", weightLb: 183, createdAt: at(0) },
        { id: "dup", weightLb: 182, createdAt: at(0) },
      ],
    });
    const reversed = makeState({
      workouts: [...workouts].reverse(),
      mealEntries: [...meals].reverse(),
      bodyweightEntries: [...base.bodyweightEntries].reverse(),
    });

    expect(totalVolumeInRange(base, 7)).toBe(totalVolumeInRange(reversed, 7));
    expect(trainingConsistencyScore(base)).toBe(trainingConsistencyScore(reversed));
    expect(nutritionAdherenceScore(base)).toBe(nutritionAdherenceScore(reversed));
    expect(todayMealTotals(base)).toEqual(todayMealTotals(reversed));
    expect(trainingStreak(base)).toBe(trainingStreak(reversed));
    expect(bodyweightDelta(base, 30)).toBe(bodyweightDelta(reversed, 30));
    expectNoInvalidNumbers(weeklyVolumeSeries(base, 7));
    expect(weeklyVolumeSeries(base, 7).filter((point) => point.volume > 0)).toHaveLength(2);
  });

  test("representative derived summaries are coherent and non-mutating", () => {
    const state = makeState({
      workouts: [
        makeWorkout("recent", 1, [
          { weight: 100, reps: 10, completed: true },
          { weight: 120, reps: 5, completed: true },
          { weight: 200, reps: 1, completed: false },
        ]),
        makeWorkout("prior", 10, [{ weight: 90, reps: 8, completed: true }]),
      ],
      mealEntries: [
        makeMeal("today", 0, { calories: 800, protein: 70, carbs: 90, fat: 20 }),
        makeMeal("yesterday", 1, { calories: 700, protein: 60, carbs: 80, fat: 18 }),
      ],
      sleepEntries: [makeSleep("sleep", 0)],
      recoveryCheckIns: [makeCheckIn("check", 0)],
      bodyweightEntries: [
        { id: "bw-1", weightLb: 180, createdAt: at(12) },
        { id: "bw-2", weightLb: 181.5, createdAt: at(0) },
      ],
    });
    const before = deepClone(state);

    expect(workoutVolume(state.workouts[0])).toBe(1600);
    expect(totalVolumeInRange(state, 14)).toBe(2320);
    expect(todayMealTotals(state)).toEqual({ calories: 800, protein: 70, carbs: 90, fat: 20 });
    expect(bodyweightDelta(state, 30)).toBe(1.5);
    expect(bestMuscleToTrainToday(state)).not.toEqual("");

    const momentum = momentumScore(state);
    expect(momentum.hasData).toBe(true);
    expect(momentum.factors.length).toBeGreaterThan(0);
    for (const factor of momentum.factors) {
      expect(factor.label).not.toEqual("");
      expect(factor.detail).not.toEqual("");
      expectScore(factor.score);
    }
    expectScore(momentum.score);

    for (const mode of ["load", "strength", "recovery", "imbalance"] satisfies HeatMode[]) {
      const map = muscleMap(state, mode);
      expect(Object.keys(map).length).toBeGreaterThan(0);
      for (const value of Object.values(map)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }

    expectUnchangedInput(before, state);
  });
});
