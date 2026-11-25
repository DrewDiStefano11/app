import { expect, test } from "bun:test";
import { trainingPeriodComparison } from "../../src/lib/analytics/training-periods";
import { defaultState, type Workout } from "../../src/lib/types";

const now = new Date(2026, 10, 25, 12).getTime();
function workout(id: string, days: number, weight = 100): Workout {
  const date = new Date(now); date.setDate(date.getDate() - days);
  return { id, name: id, startedAt: date.getTime() - 3600000, endedAt: date.getTime(), exercises: [{ id: `row-${id}`, exerciseId: "bench-press", completed: true, sets: [{ id: `set-${id}`, weight, reps: 10, completed: true }] }] };
}
const stateWith = (...workouts: Workout[]) => ({ ...structuredClone(defaultState), workouts });

test("equal calendar periods compare actual completed volume and distinct training days", () => {
  const state = stateWith(workout("now", 0, 200), workout("recent", 2, 100), workout("prior", 8, 100));
  const before = JSON.stringify(state), result = trainingPeriodComparison(state, 7, now);
  expect(result.current).toMatchObject({ volume: 3000, sets: 2, sessions: 2, trainingDays: 2, hasData: true });
  expect(result.previous).toMatchObject({ volume: 1000, sessions: 1 });
  expect(result.changePercent).toBe(200);
  expect(result.current.exercises[0]).toMatchObject({ totalVolume: 3000, validSetCount: 2 });
  expect(result.current.muscles.find(group => group.id === "chest")?.currentPeriodVolume).toBe(3000);
  expect(JSON.stringify(state)).toBe(before);
});

test("month view includes older actual records, boundaries follow completion date and missing comparisons stay unavailable", () => {
  const crossing = workout("crossing", 0); crossing.startedAt = new Date(2026, 10, 18, 23).getTime();
  const state = stateWith(crossing, workout("older", 20, 150));
  expect(trainingPeriodComparison(state, 7, now).current.sessions).toBe(1);
  expect(trainingPeriodComparison(state, 30, now).current).toMatchObject({ volume: 2500, sessions: 2 });
  expect(trainingPeriodComparison(state, 7, now).changePercent).toBeNull();
  expect(trainingPeriodComparison(stateWith(), 30, now).current.hasData).toBe(false);
});

test("warmups, planned, future, unfinished and unconfirmed evidence never contributes", () => {
  const clean = workout("clean", 1);
  clean.exercises[0].sets.push({ id: "warmup", weight: 1000, reps: 20, completed: true, modifier: "warmup" });
  const planned = workout("planned", 1); planned.exercises[0].sets[0].completed = false;
  const pending = workout("pending", 1); pending.exercises[0].sets[0].provenance = { source: "jarvis", confidence: "high", confirmation: "unconfirmed" };
  const unfinished = { ...workout("unfinished", 1), endedAt: undefined };
  const state = stateWith(clean, planned, pending, unfinished, workout("future", -1));
  expect(trainingPeriodComparison(state, 7, now).current).toMatchObject({ volume: 1000, sessions: 1, sets: 1 });
});

test("duplicate workout identities are counted only once and custom exercise muscle metadata is retained", () => {
  const one = workout("same", 1), duplicate = workout("same", 2);
  const custom = workout("custom", 3); custom.exercises[0].exerciseId = "custom-row";
  const state = stateWith(one, duplicate, custom);
  state.customExercises = [{ id: "custom-row", name: "Personal row", primary: ["back"], equipment: "cable", category: "compound", isCustom: true, createdAt: now - 86400000 }];
  const result = trainingPeriodComparison(state, 7, now).current;
  expect(result.sessions).toBe(2); expect(result.trainingDays).toBe(2); expect(result.volume).toBe(2000);
  expect(result.exercises.some(exercise => exercise.identity.displayName === "Personal row")).toBe(true);
  expect(result.muscles.find(group => group.id === "back")?.currentPeriodVolume).toBe(1000);
});


test("routine completions use recorded associations in the same eligible current and preceding sessions", () => {
  const assigned = { ...workout("assigned", 1), routineId: "saved-routine", routineDayId: "upper" };
  const prior = { ...workout("prior-routine", 8), routineId: "archived-routine", routineDayId: "old-day" };
  const state = stateWith(assigned, workout("unlinked", 2), prior);
  const before = structuredClone(state);
  const result = trainingPeriodComparison(state, 7, now);
  expect(result.current).toMatchObject({ sessions: 2, routineSessions: 1, sessionsWithoutRoutine: 1 });
  expect(result.previous).toMatchObject({ sessions: 1, routineSessions: 1, sessionsWithoutRoutine: 0 });
  expect(state).toEqual(before);
});

test("routine labels cannot turn warmups, planned/future or unconfirmed records into completed sessions", () => {
  const valid = { ...workout("valid", 1), routineId: "routine", routineDayId: "day" };
  const warmup = { ...workout("warmup", 1), routineId: "routine", routineDayId: "day" }; warmup.exercises[0].sets[0].modifier = "warmup";
  const pending = { ...workout("pending", 1), routineId: "routine", routineDayId: "day" }; pending.exercises[0].sets[0].provenance = { source: "jarvis", confidence: "high", confirmation: "unconfirmed" };
  const future = { ...workout("future", -1), routineId: "routine", routineDayId: "day" };
  expect(trainingPeriodComparison(stateWith(valid, warmup, pending, future), 7, now).current).toMatchObject({ sessions: 1, routineSessions: 1, sessionsWithoutRoutine: 0 });
});

test("duplicate session identities cannot double count routine work or resolve conflicting associations", () => {
  const linked = { ...workout("duplicate", 1), routineId: "routine", routineDayId: "day" };
  const incomplete = { ...workout("incomplete", 2), routineId: "routine" };
  const clean = { ...workout("clean", 3), routineId: "routine", routineDayId: "day" };
  const result = trainingPeriodComparison(stateWith(linked, workout("duplicate", 1), incomplete, clean, { ...clean }), 7, now).current;
  expect(result).toMatchObject({ sessions: 3, routineSessions: 1, sessionsWithoutRoutine: 2 });
  expect(result.routineSessions + result.sessionsWithoutRoutine).toBe(result.sessions);
  const outsideConflict = trainingPeriodComparison(stateWith(linked, workout("duplicate", 8)), 7, now);
  expect(outsideConflict.current.routineSessions).toBe(0);
});
