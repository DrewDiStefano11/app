import type { AppState, RecoveryCheckIn, Workout } from "../types";
import { clampScore, safeNumber, safeRatio, safeSum } from "./safe-math";

export function calculateSetVolume(weight: unknown, repetitions: unknown): number {
  if (
    typeof weight !== "number" ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    typeof repetitions !== "number" ||
    !Number.isFinite(repetitions) ||
    repetitions < 0
  )
    return 0;
  return safeNumber(weight * repetitions);
}

export function calculateWorkoutVolume(workout: Workout): number {
  const values: number[] = [];
  for (const exercise of workout.exercises)
    for (const set of exercise.sets) {
      if (set.completed) values.push(calculateSetVolume(set.weight, set.reps));
    }
  return safeSum(values);
}

export function recordedRecoveryCheckIns(state: AppState): RecoveryCheckIn[] {
  const painNotes = new Set(
    state.jarvisAudit
      .filter((entry) => entry.tool === "logWorkoutPainOrSoreness")
      .flatMap((entry) => entry.entityIds ?? []),
  );
  return state.recoveryCheckIns.filter(
    (entry) =>
      !painNotes.has(entry.id) &&
      entry.provenance?.confirmation !== "unconfirmed" &&
      (entry.provenance?.source !== "ai-estimated" || entry.provenance.confirmation === "confirmed") &&
      [entry.energy, entry.motivation, entry.stress, entry.soreness].every(
        (rating) => Number.isFinite(rating) && rating >= 1 && rating <= 10,
      ),
  );
}

/** Callers must first verify all four ratings are on the stored 1–10 scale. */
export function recoveryCheckInReadinessScore(checkIn: RecoveryCheckIn): number {
  return clampScore(
    safeRatio(
      checkIn.energy + checkIn.motivation + (11 - checkIn.soreness) + (11 - checkIn.stress),
      40,
    ) * 100,
  );
}
