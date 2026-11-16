import { describe, expect, test } from "bun:test";
import { exerciseById } from "../../src/lib/data";
import {
  BENCH_PROGRAM,
  benchDayReference,
  benchProgramWeek,
  nextBenchSuggestion,
  scheduledBenchDay,
  workoutForBenchDay,
} from "../../src/lib/bench-program";
import {
  createFitCoreBackupEnvelope,
  inspectFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
} from "../../src/lib/data-backup";
import { parseFitCoreImport } from "../../src/lib/fitcore-data";
import { defaultState, type Workout } from "../../src/lib/types";

describe("the six-day bench program", () => {
  test("uses the local week and repeats after the first Sunday", () => {
    const expected = [
      "Upper A",
      "Lower A",
      "Upper B",
      "Lower B",
      "Upper C",
      "Lower C",
      "Rest Day",
      "Upper A",
    ];
    expect(expected.map((_, i) => scheduledBenchDay(new Date(2026, 10, 16 + i, 12)).name)).toEqual(
      expected,
    );
    expect(benchProgramWeek(new Date(2026, 10, 29, 23))).toBe(2);
    expect(benchProgramWeek(new Date(2026, 10, 30))).toBe(3);
  });

  test("resolves every exercise and keeps special prescriptions", () => {
    for (const day of BENCH_PROGRAM)
      for (const row of day.exercises) {
        expect(exerciseById(row.exerciseId)?.name).toBeTruthy();
      }
    expect(BENCH_PROGRAM.map((day) => day.exercises.length)).toEqual([8, 10, 9, 6, 9, 10, 0]);
    expect(BENCH_PROGRAM[0].exercises[0]).toMatchObject({
      sets: 4,
      reps: "4",
      targetWeightLb: 195,
    });
    expect(BENCH_PROGRAM[4].exercises[0]).toMatchObject({
      sets: 4,
      reps: "6",
      targetWeightLb: 175,
    });
    expect(BENCH_PROGRAM[4].exercises.at(-1)).toMatchObject({
      sets: 2,
      reps: "12",
      optional: true,
    });
    expect(BENCH_PROGRAM[3].exercises.map((row) => row.targetMinutes)).toEqual([
      30,
      20,
      undefined,
      undefined,
      undefined,
      10,
    ]);
    expect(BENCH_PROGRAM[1].exercises[8].reps).toBe("12 per side");
  });

  test("progression suggests five pounds only after all prescribed working sets", () => {
    const day = BENCH_PROGRAM[0];
    const { exerciseId, ...target } = day.exercises[0];
    const session: Workout = {
      id: "finished-heavy-bench",
      templateId: day.id,
      name: day.name,
      startedAt: new Date(2026, 10, 16, 12).getTime(),
      endedAt: new Date(2026, 10, 16, 13).getTime(),
      exercises: [
        {
          id: "bench-exercise",
          exerciseId,
          target,
          completed: true,
          sets: Array.from({ length: 4 }, (_, i) => ({
            id: `set-${i}`,
            weight: 195,
            reps: 4,
            completed: true,
          })),
        },
      ],
    };
    expect(nextBenchSuggestion(day, [session])).toEqual({
      workoutId: session.id,
      rowIndex: 0,
      weightLb: 200,
    });
    expect(nextBenchSuggestion(day, [session], session.id)).toBeUndefined();
    expect(nextBenchSuggestion(BENCH_PROGRAM[2], [session])).toBeUndefined();
    session.exercises[0].sets[0].reps = 3;
    expect(nextBenchSuggestion(day, [session])).toBeUndefined();
  });

  test("backup and import preserve day overrides, active targets, logged minutes and history", () => {
    const day = BENCH_PROGRAM[3];
    const { exerciseId, ...target } = day.exercises[0];
    const session: Workout = {
      id: "timed-session",
      templateId: day.id,
      name: day.name,
      startedAt: new Date(2026, 10, 19, 12).getTime(),
      exercises: [
        {
          id: "duration-exercise",
          exerciseId,
          target,
          completed: false,
          sets: [{ id: "duration-set", durationMin: 28.5, completed: true }],
        },
      ],
    };
    const state = {
      ...structuredClone(defaultState),
      activeWorkout: session,
      workoutTemplates: [benchDayReference(day)],
      workouts: [
        {
          id: "history",
          startedAt: 1794660000000,
          endedAt: 1794663600000,
          name: "Existing workout",
          notes: "Keep",
          exercises: [],
        },
      ],
    };
    const { envelope } = createFitCoreBackupEnvelope(state, {
      exportedAt: "2026-11-19T17:00:00.000Z",
    });
    expect(envelope).not.toBeNull();
    const { json } = serializeFitCoreBackupEnvelope(envelope);
    expect(json).toBeTruthy();
    expect(inspectFitCoreBackupEnvelope(JSON.parse(json!)).status).toBe("valid");
    const restored = parseFitCoreImport(JSON.stringify(state));
    expect(JSON.stringify(restored?.activeWorkout)).toBe(JSON.stringify(session));
    expect(JSON.stringify(restored?.workoutTemplates)).toBe(JSON.stringify(state.workoutTemplates));
    expect(JSON.stringify(restored?.workouts)).toBe(JSON.stringify(state.workouts));
  });

  test("paused bench requires week three and confirmation", () => {
    const technique = BENCH_PROGRAM[2];
    expect(technique.exercises[0]).toMatchObject({
      sets: 3,
      reps: "3",
      targetWeightLb: 155,
      startsWeek: 3,
    });
    expect(workoutForBenchDay(technique, 2, true).exercises).toHaveLength(8);
    expect(workoutForBenchDay(technique, 3, false).exercises).toHaveLength(8);
    expect(workoutForBenchDay(technique, 3, true).exercises).toHaveLength(9);
  });
});
