import { expect, test } from "bun:test";
import { lastWorkoutByType, recentCompletedWorkoutHistory } from "../../../src/lib/jarvis/workout-history";
import { runTool } from "../../../src/lib/jarvis/tools";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { defaultState, type Workout } from "../../../src/lib/types";

const now = new Date("2026-11-25T12:00:00Z");
const workout = (id: string, age: number): Workout => ({ id, name: `Push ${id}`, startedAt: now.getTime() - age - 60000, endedAt: now.getTime() - age, exercises: [] });

test("latest completed workout follows finish chronology independently of imported array/start order", () => {
  const state = structuredClone(defaultState);
  const latest = workout("latest", 60000); latest.startedAt -= 1000000;
  state.workouts = [latest, workout("older", 120000)];
  const before = structuredClone(state);
  expect(lastWorkoutByType(state, " PUSH ", now).data?.id).toBe("latest");
  expect(lastWorkoutByType({ ...state, workouts: [...state.workouts].reverse() }, "push", now).data?.id).toBe("latest");
  expect(state).toEqual(before);
});

test("active, unfinished, future, invalid and unconfirmed sessions cannot replace recorded history", () => {
  const state = structuredClone(defaultState);
  const unfinished = workout("unfinished", 1); delete unfinished.endedAt;
  const invalid = workout("invalid", 1); invalid.startedAt = NaN;
  const unconfirmed = workout("pending", 1); unconfirmed.provenance = { source: "jarvis", confidence: "high", confirmation: "unconfirmed" };
  const active = workout("active", 1); state.activeWorkout = active;
  state.workouts = [workout("valid", 60000), unfinished, invalid, unconfirmed, active, workout("future", -60000)];
  expect(lastWorkoutByType(state, "push", now).data?.id).toBe("valid");
  expect(lastWorkoutByType(state, "pull", now).data).toBeNull();
});

test("missing type asks instead of silently selecting any workout; custom/timed records remain intact", () => {
  const state = structuredClone(defaultState);
  const custom = workout("custom", 60000); custom.name = "Élan Mobility";
  custom.exercises = [{ id: "row", exerciseId: "custom-hold", completed: true, sets: [{ id: "timed", durationMin: 3, completed: true }] }];
  state.workouts = [custom];
  expect(lastWorkoutByType(state, undefined, now)).toMatchObject({ ok: false, data: null });
  expect(lastWorkoutByType(state, "élan mobility", now).data).toEqual(custom);
});

test("the direct tool and deterministic local question share results and never write", () => {
  const state = structuredClone(defaultState); state.workouts = [workout("latest", 60000)];
  const result = runTool("getLastWorkoutByType", { workoutType: "push" }, { state, now, settings: state.jarvisSettings, set: () => { throw Error("History must not write"); } });
  expect(result.data).toMatchObject({ id: "latest" });
  expect(interpretJarvisText("What was my last push workout?", state, now)).toMatchObject({ reply: result.summary });
});


test("recent history uses completed dates, excludes pending/future records and returns a chronological copy", () => {
  const state = structuredClone(defaultState);
  const recent = workout("recent", 1000); recent.startedAt -= 2 * 86400000;
  const yesterday = workout("yesterday", 86400000);
  const pending = workout("pending", 2000); pending.provenance = { source: "jarvis", confidence: "high", confirmation: "unconfirmed" };
  state.workouts = [yesterday, workout("old", 3 * 86400000), recent, workout("future", -1000), pending];
  const before = structuredClone(state);
  expect(recentCompletedWorkoutHistory(state, 1, now).data.map(row => row.id)).toEqual(["recent", "yesterday"]);
  expect(state).toEqual(before);
  const result = runTool("getWorkoutHistory", { days: 1 }, { state, now, settings: state.jarvisSettings, set: () => { throw Error("History must not write"); } });
  expect(result.data).toEqual([recent, yesterday]);
});

test("history day bounds remain finite and never expand to unlimited or future records", () => {
  const state = structuredClone(defaultState); state.workouts = [workout("recent", 1000), workout("too-old", 91 * 86400000)];
  expect(recentCompletedWorkoutHistory(state, 10000, now).data.map(row => row.id)).toEqual(["recent"]);
  expect(recentCompletedWorkoutHistory(state, Infinity, now).data.map(row => row.id)).toEqual(["recent"]);
});
