import type { AppState, RecoveryCheckIn, SleepEntry, Workout } from "../types";
import { dayKey } from "./date-time";
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

export function hasRecordedSleepQuality(entry: SleepEntry): boolean {
  return Number.isFinite(entry.quality) && entry.quality >= 1 && entry.quality <= 10;
}

function manualSleep(entry: SleepEntry): boolean {
  return !entry.provenance || entry.provenance.source === "manual" || entry.provenance.editedBy === "user";
}

export function recordedSleepEntries(state: Pick<AppState, "sleepEntries">, now = Date.now()): SleepEntry[] {
  const latestByDay = new Map<string, SleepEntry>();
  for (const entry of state.sleepEntries) {
    if (
      entry.createdAt <= 0 || entry.createdAt > now ||
      !Number.isFinite(entry.hours) || entry.hours < 0 || entry.hours > 24 ||
      entry.provenance?.confirmation === "unconfirmed" ||
      (entry.provenance?.source === "ai-estimated" && entry.provenance.confirmation !== "confirmed")
    ) continue;

    const day = dayKey(entry.createdAt);
    if (!day) continue;
    const latest = latestByDay.get(day);
    const sourcePriority = latest ? Number(manualSleep(entry)) - Number(manualSleep(latest)) : 0;
    const elapsed = latest ? entry.createdAt - latest.createdAt : 0;
    if (!latest || sourcePriority > 0 || (sourcePriority === 0 &&
      (elapsed > 0 || (elapsed === 0 && entry.id.localeCompare(latest.id) < 0)))) {
      latestByDay.set(day, entry);
    }
  }
  return [...latestByDay.values()].sort((a, b) => a.createdAt - b.createdAt);
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


/** Logged local-day records only; a future timestamp cannot contribute to today's totals. */
export function todayMealEntries(state: Pick<AppState, "mealEntries">, now = Date.now()) {
  const date = dayKey(now);
  return state.mealEntries.filter(meal => Number.isFinite(meal.createdAt) && meal.createdAt > 0 && meal.createdAt <= now && dayKey(meal.createdAt) === date);
}
