import { expect, test } from "bun:test";
import { defaultState } from "../../src/lib/types";
import { getLogsByType, getRecentActivity } from "../../src/lib/fitcore-data";

test("activity projects performed sets rather than blank planned rows without changing workout history", () => {
  const state = structuredClone(defaultState);
  state.workouts = [
    {
      id: "saved-workout",
      name: "Bench session",
      startedAt: Date.now() - 120000,
      endedAt: Date.now() - 60000,
      exercises: [
        {
          id: "bench",
          exerciseId: "bench-press",
          completed: false,
          sets: [
            { id: "real", weight: 185, reps: 8, completed: true },
            { id: "blank", completed: false },
            { id: "flag-only", completed: true },
            { id: "incomplete", weight: 225, reps: 4, completed: false },
            { id: "warmup", weight: 135, reps: 5, completed: true, modifier: "warmup" },
          ],
        },
        {
          id: "planned-back",
          exerciseId: "db-row",
          completed: false,
          sets: [{ id: "planned", completed: false }],
        },
        {
          id: "bodyweight",
          exerciseId: "pull-up",
          completed: false,
          sets: [{ id: "body", reps: 10, completed: true }],
        },
        {
          id: "cardio",
          exerciseId: "treadmill",
          completed: false,
          sets: [
            { id: "time", durationMin: 20, completed: true },
            { id: "distance", distanceMi: 1, completed: true },
          ],
        },
      ],
    },
  ];
  const original = structuredClone(state);
  expect(getLogsByType(state, "workout_set").map((row) => row.id)).toEqual([
    "real",
    "warmup",
    "body",
    "time",
    "distance",
  ]);
  expect(getLogsByType(state, "workout_exercise").map((row) => row.id)).not.toContain(
    "planned-back",
  );
  const activity = getRecentActivity(state, 99);
  expect(activity.filter((row) => row.type === "workout_set")).toHaveLength(5);
  expect(activity.filter((row) => row.type === "workout_session")).toHaveLength(1);
  expect(activity.find((row) => row.id === "body")?.metrics).not.toHaveProperty("weight");
  expect(activity.find((row) => row.id === "time")?.metrics).toMatchObject({ durationMin: 20 });
  expect(activity.find((row) => row.id === "distance")?.metrics).toMatchObject({ distanceMi: 1 });
  expect(state).toEqual(original);
  expect(getLogsByType(JSON.parse(JSON.stringify(state)), "workout_set")).toEqual(
    getLogsByType(state, "workout_set"),
  );
});

test("future and explicitly unconfirmed records are not presented as recent saved activity", () => {
  const state = structuredClone(defaultState),
    now = Date.now();
  state.mealEntries = [
    {
      id: "future",
      name: "Future meal",
      type: "dinner",
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 15,
      createdAt: now + 3600000,
    },
    {
      id: "draft",
      name: "Unconfirmed estimate",
      type: "dinner",
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 15,
      createdAt: now - 1000,
      provenance: { source: "ai-estimated", confidence: "low", confirmation: "unconfirmed" },
    },
  ];
  expect(getRecentActivity(state)).toHaveLength(0);
});

test("confirmed Jarvis audit activity remains visible while unconfirmed suggestions stay out", () => {
  const state = structuredClone(defaultState);
  state.jarvisAudit = [
    {
      id: "confirmed-supplement",
      tool: "logSupplement",
      summary: "Logged creatine",
      status: "logged",
      entityIds: ["supplement"],
      createdAt: Date.now() - 1000,
    },
    {
      id: "unconfirmed-suggestion",
      tool: "suggestNutritionAction",
      summary: "Consider a meal",
      status: "suggested",
      createdAt: Date.now() - 500,
    },
  ];
  expect(getRecentActivity(state).map((row) => row.id)).toEqual(["ai:confirmed-supplement"]);
});

test("correcting a saved set changes its projected event in place", () => {
  const state = structuredClone(defaultState);
  state.workouts = [
    {
      id: "workout",
      name: "Bench",
      startedAt: Date.now() - 120000,
      endedAt: Date.now(),
      exercises: [
        {
          id: "bench",
          exerciseId: "bench-press",
          completed: false,
          sets: [
            { id: "set", weight: 185, reps: 8, completed: true },
            { id: "plan", completed: false },
          ],
        },
      ],
    },
  ];
  state.workouts[0].exercises[0].sets[0] = { id: "set", weight: 195, reps: 6, completed: true };
  const events = getLogsByType(state, "workout_set");
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ id: "set", metrics: { weight: 195, reps: 6 } });
});
