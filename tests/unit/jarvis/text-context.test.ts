import { expect, test } from "bun:test";
import { interpretJarvisText, type JarvisTextContext } from "../../../src/lib/jarvis/text-commands";
import { defaultState } from "../../../src/lib/types";

test("bare workout values use the exercise open when Jarvis was invoked", () => {
  const state = structuredClone(defaultState);
  state.activeWorkout = {
    id: "upper-a",
    name: "Upper A",
    startedAt: Date.now(),
    exercises: [
      { id: "bench-row", exerciseId: "bench-press", completed: false, sets: [] },
      { id: "db-row", exerciseId: "db-bench", completed: false, sets: [] },
    ],
  };
  expect(interpretJarvisText("195 for 4", state)).toMatchObject({
    reply: "Which exercise in your active workout did you mean?",
  });
  const context: JarvisTextContext = {
    focusedExercise: { workoutId: "upper-a", exerciseEntryId: "bench-row" },
  };
  expect(interpretJarvisText("195 for 4", state, new Date(), context)).toMatchObject({
    tool: "logExerciseSet",
    args: { exerciseEntryId: "bench-row", weight: 195, reps: 4 },
  });
});

test("a reps-only reply can complete an explicitly requested same-weight repeat", () => {
  const state = structuredClone(defaultState);
  state.activeWorkout = {
    id: "upper-a",
    name: "Upper A",
    startedAt: Date.now(),
    exercises: [
      {
        id: "bench-row",
        exerciseId: "bench-press",
        completed: false,
        sets: [{ id: "set-1", completed: true, weight: 195, reps: 4 }],
      },
    ],
  };
  state.jarvisAudit = [
    {
      id: "audit-1",
      tool: "logExerciseSet",
      status: "logged",
      summary: "Logged bench",
      patch: { workoutId: "upper-a", exerciseEntryId: "bench-row" },
      entityIds: ["set-1"],
      createdAt: Date.now(),
    },
  ];
  const context: JarvisTextContext = {};
  const request = interpretJarvisText(
    "I did another set with the same weight.",
    state,
    new Date(),
    context,
  );
  expect(request).toMatchObject({ reply: "How many reps at 195 lb?" });
  if (request && "nextContext" in request && request.nextContext)
    Object.assign(context, request.nextContext);
  expect(interpretJarvisText("5", state, new Date(), context)).toMatchObject({
    tool: "logExerciseSet",
    args: { exerciseEntryId: "bench-row", weight: 195, reps: 5 },
  });
});

test("bench history carries verified dates through a follow-up and comparison", () => {
  const state = structuredClone(defaultState);
  state.workouts = [
    {
      id: "monday",
      name: "Upper A",
      startedAt: new Date(2026, 10, 9, 12).getTime(),
      exercises: [
        {
          id: "bench-monday",
          exerciseId: "bench-press",
          completed: true,
          sets: [
            { id: "m-1", completed: true, weight: 190, reps: 5 },
            { id: "planned", completed: false, weight: 900, reps: 1 },
          ],
        },
      ],
    },
    {
      id: "friday",
      name: "Upper A",
      startedAt: new Date(2026, 10, 13, 12).getTime(),
      exercises: [
        {
          id: "bench-friday",
          exerciseId: "bench-press",
          completed: true,
          sets: [{ id: "f-1", completed: true, weight: 195, reps: 4 }],
        },
      ],
    },
  ];
  const now = new Date(2026, 10, 16, 12);
  const initial = interpretJarvisText("How much did I bench last Monday?", state, now);
  expect(initial && "reply" in initial ? initial.reply : undefined).toContain("190 lb × 5");
  const initialContext = initial?.nextContext;
  const followUp = interpretJarvisText("What about Friday?", state, now, initialContext);
  expect(followUp && "reply" in followUp ? followUp.reply : undefined).toContain("195 lb × 4");
  const comparison = interpretJarvisText("Compare the two.", state, now, followUp?.nextContext);
  const text = comparison && "reply" in comparison ? comparison.reply : "";
  expect(text).toContain("190 lb × 5");
  expect(text).toContain("195 lb × 4");
  expect(text).not.toContain("900");
});

test("sleep duration waits for a reported quality instead of inventing one", () => {
  const state = structuredClone(defaultState);
  const first = interpretJarvisText("I slept seven and a half hours.", state);
  expect(first).toMatchObject({
    reply: "You reported 7.5 hours. How would you rate your sleep quality from 1 to 10?",
  });
  expect(interpretJarvisText("8/10", state, new Date(), first?.nextContext)).toMatchObject({
    tool: "logSleep",
    args: { hours: 7.5, quality: 8 },
  });
});

test("an explicit bodyweight correction targets one saved date", () => {
  const state = structuredClone(defaultState);
  state.bodyweightEntries = [
    { id: "yesterday", weightLb: 182.6, createdAt: new Date(2026, 10, 15, 12).getTime() },
    { id: "today", weightLb: 181.8, createdAt: new Date(2026, 10, 16, 12).getTime() },
  ];
  expect(
    interpretJarvisText("Correct yesterday's weight to 183.", state, new Date(2026, 10, 16, 12)),
  ).toMatchObject({ tool: "updateBodyWeight", args: { id: "yesterday", weightLb: 183 } });
});
