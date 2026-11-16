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

test("named warm-up and unilateral sets resolve locally with their reported units", () => {
  const state = structuredClone(defaultState);
  state.activeWorkout = {
    id: "upper-a",
    name: "Upper A",
    startedAt: Date.now(),
    exercises: [
      { id: "barbell-row", exerciseId: "bench-press", completed: false, sets: [] },
      { id: "dumbbell-row", exerciseId: "db-bench", completed: false, sets: [] },
    ],
  };
  expect(interpretJarvisText("Log a warm-up bench set at 135 lb for 8", state)).toEqual({
    tool: "logExerciseSet",
    args: { exerciseEntryId: "barbell-row", weight: 135, reps: 8, modifier: "warmup" },
  });
  expect(
    interpretJarvisText("Log a unilateral set for dumbbell bench at 20 kg for 10", state),
  ).toEqual({
    tool: "logExerciseSet",
    args: { exerciseEntryId: "dumbbell-row", weight: 44.09, reps: 10, modifier: "unilateral" },
  });
  expect(interpretJarvisText("Log a warm-up set at 135 lb for 8", state)).toEqual({
    reply: "Which exercise in your active workout did you mean?",
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

test("training questions distinguish prescribed load from recorded sets", () => {
  const state = structuredClone(defaultState);
  const now = new Date(2026, 10, 16, 12);
  state.activeWorkout = {
    id: "current",
    name: "Upper A",
    startedAt: now.getTime(),
    exercises: [
      {
        id: "bench-row",
        exerciseId: "bench-press",
        completed: false,
        target: { sets: 4, reps: "4", targetWeightLb: 195 },
        sets: [
          { id: "warmup", completed: true, modifier: "warmup", weight: 135, reps: 5 },
          { id: "done", completed: true, weight: 190, reps: 4 },
          { id: "plan", completed: false, weight: 900, reps: 4 },
        ],
      },
    ],
  };
  expect(interpretJarvisText("What's my next prescribed bench weight?", state, now)).toMatchObject({
    reply: "The next working bench set in Upper A is prescribed at 195 lb.",
  });
  expect(
    interpretJarvisText("How many chest sets did I complete this week?", state, now),
  ).toMatchObject({
    reply: "1 completed working set this week for exercises that primarily train chest.",
  });
});

test("leg history excludes workouts containing only planned lower-body rows", () => {
  const state = structuredClone(defaultState);
  const now = new Date(2026, 10, 16, 12);
  state.workouts = [
    {
      id: "planned",
      name: "Unused leg day",
      startedAt: now.getTime() - 1000,
      exercises: [
        {
          id: "plan",
          exerciseId: "squat",
          completed: false,
          sets: [{ id: "s1", completed: false }],
        },
      ],
    },
    {
      id: "actual",
      name: "Lower A",
      startedAt: now.getTime() - 2000,
      exercises: [
        {
          id: "done",
          exerciseId: "squat",
          completed: true,
          sets: [{ id: "s2", completed: true, weight: 225, reps: 4 }],
        },
      ],
    },
  ];
  const result = interpretJarvisText("Show my last three leg workouts.", state, now);
  expect(result && "reply" in result ? result.reply : "").toContain("Lower A");
  expect(result && "reply" in result ? result.reply : "").not.toContain("Unused leg day");
});

test("a meal portion follow-up needs a specific saved meal and compatible units", () => {
  const state = structuredClone(defaultState);
  state.mealEntries = [
    {
      id: "meal-1",
      name: "Dinner",
      type: "dinner",
      createdAt: Date.now(),
      calories: 400,
      protein: 35,
      carbs: 45,
      fat: 5,
      items: [
        { name: "Chicken", qty: "1 portion", calories: 195, protein: 31, carbs: 0, fat: 5 },
        { name: "White rice", qty: "1 cup", calories: 205, protein: 4, carbs: 45, fat: 0 },
      ],
    },
  ];
  const text = "Actually, that was two cups of rice.";
  expect(interpretJarvisText(text, state, new Date())).toMatchObject({
    reply: "Confirm a meal in this Jarvis conversation before correcting its portion.",
  });
  expect(interpretJarvisText(text, state, new Date(), { lastMealId: "meal-1" })).toMatchObject({
    tool: "correctMealPortion",
    args: { id: "meal-1", index: 1, quantity: 2, unit: "cup" },
  });
});

test("known foods with compatible portions resolve to the FitCore nutrition library", () => {
  const state = structuredClone(defaultState);
  const text = "I ate a banana and two slices of whole wheat bread.";
  expect(interpretJarvisText(text, state)).toMatchObject({
    tool: "logReferenceMeal",
    args: {
      calories: 265,
      protein: 9,
      carbs: 55,
      fat: 3,
      items: [
        { name: "Banana", calories: 105 },
        { name: "Whole Wheat Bread", calories: 160 },
      ],
    },
  });
  expect(interpretJarvisText("I ate a banana and a protein shake.", state)).toBeUndefined();
});
