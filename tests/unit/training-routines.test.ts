import { describe, expect, test } from "bun:test";
import { plannedRoutineDay } from "../../src/lib/training-routines";
import { defaultState, type TrainingRoutine, type Workout } from "../../src/lib/types";
import {
  createFitCoreBackupEnvelope,
  serializeFitCoreBackupEnvelope,
} from "../../src/lib/data-backup";
import { validateFitCoreDataIntegrity } from "../../src/lib/data-integrity";

const weekdays: TrainingRoutine = {
  id: "week",
  name: "Training week",
  mode: "weekly",
  days: [
    { id: "monday", templateId: "push", weekday: 1 },
    { id: "thursday", templateId: "pull", weekday: 4 },
    { id: "sunday", templateId: "legs", weekday: 0 },
  ],
};

const rotation: TrainingRoutine = {
  id: "cycle",
  name: "A–B",
  mode: "rotation",
  days: [
    { id: "day-a", templateId: "push" },
    { id: "day-b", templateId: "pull" },
  ],
};

describe("scheduled routines", () => {
  test("round-trips assignments in backup bytes and rejects duplicate weekdays", () => {
    const state = structuredClone(defaultState);
    state.personalization.trainingRoutine = structuredClone(weekdays);
    state.workouts = [
      {
        id: "saved",
        name: "Push Day",
        startedAt: 10,
        endedAt: 20,
        exercises: [],
        routineId: weekdays.id,
        routineDayId: weekdays.days[0].id,
      },
    ];
    const { envelope } = createFitCoreBackupEnvelope(state, {
      exportedAt: "2026-11-16T12:00:00.000Z",
    });
    const { json } = serializeFitCoreBackupEnvelope(envelope);
    expect(json).toBeTruthy();
    const restored = JSON.parse(json!).payload;
    expect(restored.personalization.trainingRoutine).toEqual(weekdays);
    expect(restored.workouts[0].routineDayId).toBe("monday");
    state.personalization.trainingRoutine.days[1].weekday = 1;
    expect(validateFitCoreDataIntegrity(state).status).toBe("invalid");
  });

  test("resolves weekdays against the local calendar and leaves unassigned days free", () => {
    expect(plannedRoutineDay(weekdays, new Date(2026, 10, 16, 23), [])?.id).toBe("monday");
    expect(plannedRoutineDay(weekdays, new Date(2026, 10, 17, 0), [])).toBeUndefined();
    expect(plannedRoutineDay(weekdays, new Date(2026, 10, 19, 12), [])?.id).toBe("thursday");
    expect(plannedRoutineDay(weekdays, new Date(2026, 10, 22, 12), [])?.id).toBe("sunday");
    expect(plannedRoutineDay(weekdays, new Date(2026, 10, 23, 0), [])?.id).toBe("monday");
  });

  test("rotates after a durably finished scheduled session and ignores unrelated or unsaved sessions", () => {
    const session = (id: string, routineId: string, dayId: string, endedAt?: number): Workout => ({
      id,
      name: id,
      startedAt: 1,
      endedAt,
      exercises: [],
      routineId,
      routineDayId: dayId,
    });
    const date = new Date(2026, 10, 16, 12);
    const first = session("completed-a", rotation.id, "day-a", 2);
    const second = session("completed-b", rotation.id, "day-b", 3);
    const other = session("other-routine", "other", "day-b", 4);
    const inProgress = session("in-progress", rotation.id, "day-b");
    expect(plannedRoutineDay(rotation, date, [])?.id).toBe("day-a");
    expect(plannedRoutineDay(rotation, date, [first, other, inProgress])?.id).toBe("day-b");
    expect(plannedRoutineDay(rotation, date, [second, first, other])?.id).toBe("day-a");
    const edited = { ...rotation, days: [{ id: "new-day", templateId: "legs" }] };
    expect(plannedRoutineDay(edited, date, [first, second])?.id).toBe("new-day");
  });
});
