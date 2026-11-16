import { describe, expect, test } from "bun:test";
import { workoutPersonalRecords } from "../../src/lib/analytics/training-detail-metrics";
import { replaceSavedWorkout } from "../../src/lib/fitcore-data";
import { defaultState, type Workout } from "../../src/lib/types";

const now = Date.UTC(2026, 10, 16, 18);
const original: Workout = {
  id: "reviewed",
  name: "Strength session",
  startedAt: now - 3_600_000,
  endedAt: now,
  exercises: [
    {
      id: "bench-row",
      exerciseId: "bench-press",
      completed: true,
      sets: [{ id: "verified-set", weight: 150, reps: 5, completed: true }],
    },
  ],
};

describe("saved workout corrections", () => {
  test("a stale review cannot overwrite or delete a newer saved workout", () => {
    const revised = { ...original, notes: "Another update won" };
    const state = { ...defaultState, workouts: [revised] };

    expect(replaceSavedWorkout(state, original, { ...original, name: "Stale draft" })).toBe(state);
    expect(replaceSavedWorkout(state, original)).toBe(state);
    expect(replaceSavedWorkout(state, structuredClone(revised)).workouts).toEqual([]);
  });

  test("historical records require eligible completed sets and workouts", () => {
    const verified = original.exercises[0].sets[0];
    const session = {
      ...original,
      exercises: [
        {
          ...original.exercises[0],
          sets: [
            verified,
            { ...verified, id: "partial", weight: 300, modifier: "partials" as const },
            { ...verified, id: "warmup", weight: 300, modifier: "warmup" as const },
            { ...verified, id: "unsupported", weight: 300, reps: 15 },
            {
              ...verified,
              id: "unconfirmed",
              weight: 300,
              provenance: {
                source: "ai-estimated" as const,
                confidence: "low" as const,
                confirmation: "unconfirmed" as const,
              },
            },
          ],
        },
      ],
    };
    const unfinished = { ...original, id: "unfinished", endedAt: undefined };
    const future = { ...original, id: "future", endedAt: now + 1 };
    expect(workoutPersonalRecords([unfinished, future, session], [], { now })).toEqual([
      expect.objectContaining({
        exerciseId: "bench-press",
        weight: 150,
        reps: 5,
        value: 175,
        date: now,
      }),
    ]);
    expect(workoutPersonalRecords([unfinished, future], [], { now })).toEqual([]);
    expect(workoutPersonalRecords([unfinished], [], { now, includeActive: true })).toHaveLength(1);
  });
});
