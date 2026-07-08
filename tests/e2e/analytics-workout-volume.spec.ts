import { test, expect } from "@playwright/test";
import { workoutVolume } from "../../src/lib/analytics";
import type { Workout } from "../../src/lib/types";

test.describe("workoutVolume analytics utility", () => {
  const baseWorkout: Workout = {
    id: "workout-1",
    name: "Test Workout",
    startedAt: Date.now(),
    exercises: [],
  };

  test("calculates volume for completed sets with weight and reps", () => {
    const workout: Workout = {
      ...baseWorkout,
      exercises: [
        {
          id: "ex-1",
          exerciseId: "bench",
          completed: true,
          sets: [
            { id: "set-1", weight: 100, reps: 5, completed: true },
            { id: "set-2", weight: 100, reps: 5, completed: true },
          ],
        },
      ],
    };

    expect(workoutVolume(workout)).toBe(1000);
  });

  test("ignores incomplete sets", () => {
    const workout: Workout = {
      ...baseWorkout,
      exercises: [
        {
          id: "ex-1",
          exerciseId: "squat",
          completed: true,
          sets: [
            { id: "set-1", weight: 200, reps: 5, completed: true }, // 1000
            { id: "set-2", weight: 200, reps: 5, completed: false }, // 0
          ],
        },
      ],
    };

    expect(workoutVolume(workout)).toBe(1000);
  });

  test("handles missing or zero weight and reps", () => {
    const workout: Workout = {
      ...baseWorkout,
      exercises: [
        {
          id: "ex-1",
          exerciseId: "deadlift",
          completed: true,
          sets: [
            { id: "set-1", weight: 100, reps: 0, completed: true }, // 0
            { id: "set-2", weight: 0, reps: 5, completed: true }, // 0
            { id: "set-3", reps: 5, completed: true }, // missing weight -> 0
            { id: "set-4", weight: 100, completed: true }, // missing reps -> 0
            { id: "set-5", completed: true }, // missing both -> 0
          ],
        },
      ],
    };

    expect(workoutVolume(workout)).toBe(0);
  });

  test("sums correctly across multiple exercises and sets", () => {
    const workout: Workout = {
      ...baseWorkout,
      exercises: [
        {
          id: "ex-1",
          exerciseId: "bench",
          completed: true,
          sets: [
            { id: "set-1", weight: 100, reps: 5, completed: true }, // 500
            { id: "set-2", weight: 100, reps: 5, completed: true }, // 500
          ],
        },
        {
          id: "ex-2",
          exerciseId: "squat",
          completed: true,
          sets: [
            { id: "set-3", weight: 200, reps: 5, completed: true }, // 1000
            { id: "set-4", weight: 200, reps: 5, completed: false }, // 0
            { id: "set-5", weight: 225, reps: 2, completed: true }, // 450
          ],
        },
      ],
    };

    expect(workoutVolume(workout)).toBe(2450);
  });

  test("returns 0 for empty exercise list", () => {
    const workout: Workout = {
      ...baseWorkout,
      exercises: [],
    };

    expect(workoutVolume(workout)).toBe(0);
  });
});
