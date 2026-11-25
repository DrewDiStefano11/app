import { expect, test } from "bun:test";
import { lastExercisePerformance } from "../../../src/lib/jarvis/exercise-history";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { runTool } from "../../../src/lib/jarvis/tools";
import { defaultState, type SetEntry, type Workout } from "../../../src/lib/types";

const now = new Date("2026-11-25T12:00:00Z");
function workout(id: string, age: number, sets: Partial<SetEntry>[] = [{ weight: 185, reps: 8 }], exerciseId = "bench-press"): Workout {
  const end = now.getTime() - age * 60_000;
  return { id, name: id, startedAt: end - 60_000, endedAt: end,
    exercises: [{ id: `${id}-row`, exerciseId, completed: true,
      sets: sets.map((set, index) => ({ id: `${id}-${index}`, completed: true, ...set })) }] };
}
const unconfirmed = { source: "jarvis", confidence: "high", confirmation: "unconfirmed" } as const;

test("latest means finished chronology, independent of array order and start time", () => {
  const state = structuredClone(defaultState);
  const latest = workout("latest", 2);
  latest.startedAt -= 1_000_000;
  state.workouts = [latest, workout("older", 5)];
  const before = structuredClone(state);
  for (const rows of [state.workouts, [...state.workouts].reverse()]) {
    expect(lastExercisePerformance({ ...state, workouts: rows }, "bench", now).data?.workoutId).toBe("latest");
  }
  expect(state).toEqual(before);
});

test("unfinished, active, future, invalid and unconfirmed sessions cannot replace recorded history", () => {
  const state = structuredClone(defaultState);
  const unfinished = workout("unfinished", 1); delete unfinished.endedAt;
  const invalid = workout("invalid", 1); invalid.startedAt = NaN;
  const reversed = workout("reversed", 1); reversed.startedAt = reversed.endedAt! + 1;
  const unreviewed = workout("unreviewed", 1); unreviewed.provenance = unconfirmed;
  const active = workout("active", 1); state.activeWorkout = active;
  state.workouts = [workout("valid", 10), unfinished, invalid, reversed, unreviewed, active, workout("future", -1)];
  expect(lastExercisePerformance(state, "Barbell Bench Press", now).data?.workoutId).toBe("valid");
});

test("only actual completed valid working sets count; modifiers and all matching rows remain visible", () => {
  const state = structuredClone(defaultState);
  const recent = workout("recent", 1, [
    { weight: 300, reps: 1, modifier: "warmup" }, { weight: 185, reps: 8, completed: false },
    { weight: 190, reps: 8, provenance: unconfirmed }, { weight: NaN, reps: 8 }, { weight: -1, reps: 8 },
    { weight: 200 }, { weight: 190, reps: 6, modifier: "failure" },
  ]);
  recent.exercises.push({ id: "second", exerciseId: "bench-press", completed: false, sets: [{ id: "actual", weight: 180, reps: 5, completed: true }] });
  recent.exercises.push({ id: "unconfirmed", exerciseId: "bench-press", completed: true, provenance: unconfirmed, sets: [{ id: "bad", weight: 400, reps: 8, completed: true }] });
  state.workouts = [recent];
  const result = lastExercisePerformance(state, "bench-press", now);
  expect(result.data?.sets).toHaveLength(2);
  expect(result.summary).toContain("190 lb × 6 · (failure), 180 lb × 5");
});

test("bodyweight, timed and distance sets retain reported units and never invent reps or load", () => {
  const state = structuredClone(defaultState);
  state.customExercises = [{ id: "custom-circuit", name: "My Circuit", primary: [], equipment: "bodyweight", category: "cardio", isCustom: true, createdAt: 1 }];
  state.workouts = [workout("circuit", 1, [{ reps: 12 }, { durationMin: 2.5 }, { durationMin: 10, distanceMi: 1.2 }], "custom-circuit")];
  const result = lastExercisePerformance(state, "My Circuit", now);
  expect(result.summary).toContain("12 reps, 2.5 min, 10 min · 1.2 mi");
  expect(result.summary).not.toMatch(/undefined|\?|lb|×/);
  expect(result.data?.sets[0].weight).toBeUndefined();
});

test("missing and ambiguous exercise names ask instead of defaulting to bench", () => {
  const state = structuredClone(defaultState);
  state.workouts = [workout("bench", 1)];
  expect(lastExercisePerformance(state, undefined, now)).toMatchObject({ ok: false, data: null });
  expect(lastExercisePerformance(state, "made up", now).data).toBeNull();
  state.customExercises = [{ id: "custom-bench", name: "Barbell Bench Press", primary: [], equipment: "barbell", category: "compound", isCustom: true, createdAt: 1 }];
  expect(lastExercisePerformance(state, "Barbell Bench Press", now).summary).toContain("More than one exercise");
  expect(lastExercisePerformance(state, "bench-press", now).data?.workoutId).toBe("bench");
});

test("tool and local exact-name question share verified read-only results", () => {
  const state = structuredClone(defaultState);
  state.workouts = [workout("valid", 1)];
  const result = runTool("getLastExercisePerformance", { exerciseName: "bench" }, { state, now, settings: state.jarvisSettings, set: () => { throw new Error("History must never write"); } });
  expect(result.summary).toContain("185 lb × 8");
  expect(interpretJarvisText("Show my last bench performance", state, now)).toMatchObject({ reply: result.summary });
});
