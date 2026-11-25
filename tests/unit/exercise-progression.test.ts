import { expect, test } from "bun:test";
import { exerciseProgression, parseProgressionTarget, progressionTargetStatus, recordedExerciseHistory, sessionEstimatedMax } from "../../src/lib/exercise-progression";
import { defaultState, type SetEntry, type Workout } from "../../src/lib/types";
import { runTool } from "../../src/lib/jarvis/tools";
import { interpretJarvisText } from "../../src/lib/jarvis/text-commands";

const now = new Date(2026, 10, 25, 12).getTime();
const target = { sets: 3, reps: "8-12" };
const strength = { sets: 3, reps: "3-5" };
const sets = (reps = 12, weight = 180): SetEntry[] => Array.from({ length: 3 }, (_, i) => ({ id: `set-${i}`, reps, weight, completed: true }));
function workout(id: string, days = 1, reps = 12, weight = 180): Workout {
  const date = new Date(now); date.setDate(date.getDate() - days);
  return { id, name: id, startedAt: date.getTime(), endedAt: date.getTime() + 3600000, exercises: [{ id: `row-${id}`, exerciseId: "bench-press", completed: true, sets: sets(reps, weight) }] };
}
const history = (workouts: Workout[]) => recordedExerciseHistory(workouts, now).get("bench-press") ?? [];

test("history is chronological and immutable, ignores unfinished/future/unconfirmed and nonstandard rows", () => {
  const latest = workout("latest"), older = workout("older", 3, 8, 150);
  latest.exercises[0].sets.unshift({ id: "warmup", completed: true, weight: 45, reps: 20, modifier: "warmup" });
  const unfinished = { ...workout("unfinished", 0), endedAt: undefined };
  const future = workout("future", -1);
  const unconfirmed = { ...workout("pending"), provenance: { source: "jarvis" as const, confidence: "high" as const, confirmation: "unconfirmed" as const } };
  const modified = workout("drop"); modified.exercises[0].exerciseTags = ["drop"];
  const input = [latest, older, unfinished, future, unconfirmed, modified], before = JSON.stringify(input);
  const sessions = history(input);
  expect(sessions.map(s => s.workoutId)).toEqual(["latest", "older"]);
  expect(sessions[0].sets).toHaveLength(3);
  expect(sessions[0].sets[0].weight).toBe(180);
  expect(JSON.stringify(input)).toBe(before);
});

test("hypertrophy increases only after every required working set reaches the top", () => {
  expect(exerciseProgression(history([workout("top")]), target, now)).toMatchObject({ weight: 185, repetitions: 8 });
  expect(exerciseProgression(history([workout("building", 1, 8)]), target, now)).toMatchObject({ weight: 180, repetitions: 9 });
  const short = workout("short"); short.exercises[0].sets.pop();
  expect(exerciseProgression(history([short]), target, now).summary).toContain("fewer than 3");
  const failure = workout("failure"); failure.exercises[0].sets[0].modifier = "failure";
  expect(exerciseProgression(history([failure]), target, now).weight).toBeUndefined();
});

test("strength needs two successful days at the same load; explicit targets are respected", () => {
  const one = workout("one", 1, 5, 225), two = workout("two", 3, 5, 225);
  expect(exerciseProgression(history([one]), strength, now)).toMatchObject({ weight: 225, repetitions: 5 });
  expect(exerciseProgression(history([one, two]), strength, now)).toMatchObject({ weight: 230, repetitions: 3 });
  two.exercises[0].sets = sets(5, 220);
  expect(exerciseProgression(history([one, two]), strength, now).weight).toBe(225);
  expect(exerciseProgression(history([one]), { ...strength, targetWeightLb: 235 }, now).summary).toContain("target is 235");
});

test("target status distinguishes untouched, partially met, missed and completed targets", () => {
  expect(parseProgressionTarget({ sets: 3, reps: "8\u201312" })).toMatchObject({ minimum: 8, maximum: 12 });
  const goal = parseProgressionTarget({ sets: 3, reps: "8-12", targetWeightLb: 180 })!;
  expect(progressionTargetStatus([], goal).status).toBe("pending");
  expect(progressionTargetStatus(sets().slice(0, 1), goal)).toMatchObject({ status: "partial", met: 1 });
  expect(progressionTargetStatus(sets(7), goal)).toMatchObject({ status: "missed", met: 0 });
  expect(progressionTargetStatus(sets(8), goal)).toMatchObject({ status: "completed", met: 3 });
  expect(progressionTargetStatus([], goal, true).status).toBe("missed");
});

test("plateau requires four comparable sessions spanning a week; e1RM stays a bounded estimate", () => {
  const sessions = history([1, 4, 7, 10].map((day, i) => workout(String(i), day, 8)));
  expect(exerciseProgression(sessions, target, now).plateau).toBe(true);
  expect(sessionEstimatedMax(sessions[0])).toBe(228);
  expect(exerciseProgression(sessions.slice(0, 3), target, now).plateau).toBe(false);
  const highReps = history([1, 4, 7, 10].map((day, i) => workout(String(i), day, 15)));
  expect(sessionEstimatedMax(highReps[0])).toBeUndefined();
  expect(exerciseProgression(highReps, { sets: 3, reps: "12-15" }, now).plateau).toBe(false);
  expect(exerciseProgression(history([workout("stale", 30)]), target, now).summary).toContain("30 days ago");
});

test("unsupported targets and absent/bodyweight/planned sets do not create recommendations", () => {
  for (const goal of [{ sets: 0, reps: "8" }, { sets: 3, reps: "AMRAP" }, { sets: 3, reps: "12-8" }, { sets: 3, reps: "8", targetWeightLb: NaN }]) expect(parseProgressionTarget(goal)).toBeUndefined();
  const empty = workout("empty"); empty.exercises[0].sets = sets().map(s => ({ ...s, completed: false }));
  expect(history([empty])).toHaveLength(0);
  const bodyweight = workout("body"); bodyweight.exercises[0].sets = sets(12, 0);
  expect(history([bodyweight])).toHaveLength(0);
  expect(exerciseProgression([], target, now).summary).toContain("Log completed");
});

test("Jarvis uses the shared recorded calculation without writes or arbitrary exercise defaults", () => {
  const state = { ...structuredClone(defaultState), workouts: [workout("recent"), workout("older", 4, 8, 100)] };
  state.activeWorkout = { id: "active", name: "Active", startedAt: now, exercises: [{ id: "bench", exerciseId: "bench-press", sets: [], completed: false, target }] };
  const before = JSON.stringify(state);
  const result = runTool("suggestWorkoutProgression", { exerciseName: "bench" }, { state, set: () => { throw new Error("Suggestion wrote data"); }, settings: state.jarvisSettings, now: new Date(now) });
  expect(result.summary).toContain("185 lb");
  expect(runTool("suggestWorkoutProgression", {}, { state, set: () => false, settings: state.jarvisSettings }).ok).toBe(false);
  expect(interpretJarvisText("suggest progression for bench", state, new Date(now))?.reply).toContain("185 lb");
  expect(JSON.stringify(state)).toBe(before);
});

