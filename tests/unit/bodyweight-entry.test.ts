import { expect, test } from "bun:test";
import { defaultState } from "../../src/lib/types";
import { parseBodyweightLb, recordManualBodyweight } from "../../src/lib/bodyweight-entry";

test("manual bodyweight validation matches the existing 40–700 lb Jarvis range", () => {
  for (const value of [
    "",
    " ",
    "-5",
    "0",
    "39.9",
    "700.1",
    "99999",
    "Infinity",
    "NaN",
    "0xB4",
    "1e2",
    "181 lb",
  ])
    expect(parseBodyweightLb(value)).toBeUndefined();
  expect(parseBodyweightLb("40")).toBe(40);
  expect(parseBodyweightLb("700")).toBe(700);
  expect(parseBodyweightLb(" 181.4 ")).toBe(181.4);
});

test("a valid manual weigh-in updates record, profile and weight goals together without mutating other data", () => {
  const state = structuredClone(defaultState);
  state.goals = [
    { id: "weight", type: "bodyweight", label: "Weight", current: 180, target: 175 },
    { id: "training", type: "weekly_workouts", label: "Training", current: 1, target: 3 },
  ];
  const before = structuredClone(state);
  const next = recordManualBodyweight(state, {
    id: "weigh-in",
    weightLb: 181.4,
    notes: "Morning",
    createdAt: Date.now(),
  });
  expect(next.bodyweightEntries).toHaveLength(1);
  expect(next.bodyweightEntries[0]).toMatchObject({ weightLb: 181.4, notes: "Morning" });
  expect(next.profile.bodyweightLb).toBe(181.4);
  expect(next.goals.map((goal) => goal.current)).toEqual([181.4, 1]);
  expect(next.mealEntries).toBe(state.mealEntries);
  expect(state).toEqual(before);
  for (const weightLb of [-5, 99999, Infinity, NaN]) {
    expect(recordManualBodyweight(state, { id: "invalid", weightLb, createdAt: Date.now() })).toBe(
      state,
    );
  }
});
