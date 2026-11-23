import {
  benchProgramWeek,
  configuredBenchDay,
  scheduledBenchDay,
  workoutForBenchDay,
} from "../bench-program";
import type { WorkoutTemplate } from "../data";
import { activeRoutineSession } from "../training-routines";
import type { AppState, Workout } from "../types";

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function jarvisScheduledWorkout(
  state: AppState,
  date: Date,
):
  | { template: WorkoutTemplate; assignment?: Pick<Workout, "routineId" | "routineDayId"> }
  | undefined {
  const custom = activeRoutineSession(state, date);
  if (custom) {
    return custom.template && custom.day
      ? {
          template: custom.template,
          assignment: { routineId: custom.routine.id, routineDayId: custom.day.id },
        }
      : undefined;
  }
  const day = configuredBenchDay(scheduledBenchDay(date), state.workoutTemplates);
  if (!day.exercises.length) return undefined;
  const confirmed =
    state.workoutTemplates.find((row) => row.id === day.id)?.pausedBenchConfirmed ?? false;
  const template = workoutForBenchDay(day, benchProgramWeek(date), confirmed);
  return template.exercises.length ? { template } : undefined;
}
