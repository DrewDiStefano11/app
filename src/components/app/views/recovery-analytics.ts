import type { RecoveryCheckIn, SleepEntry, Workout } from "@/lib/types";

export const RECOVERY_SLEEP_STALE_MS = 48 * 60 * 60 * 1_000;
export const RECOVERY_CHECK_IN_STALE_MS = 36 * 60 * 60 * 1_000;

export type RecoveryDataState =
  | "ready"
  | "partial"
  | "needs_more_data"
  | "stale"
  | "unavailable"
  | "invalid";

export interface RecoveryQuality {
  state: Exclude<RecoveryDataState, "invalid">;
  confidence: "high" | "medium" | "low";
  sourceCount: number;
  reason?: string;
}

export interface RecoverySnapshot {
  score: number | null;
  sleepScore: number | null;
  checkInScore: number | null;
  parts: number;
  sleepInvalid: boolean;
  checkInvalid: boolean;
  sleepStale: boolean;
  checkStale: boolean;
  quality: RecoveryQuality;
}

export interface RecoveryTimelinePoint {
  date: string;
  timestamp: number;
  readiness: number | null;
  sleep: number | null;
  sleepQuality: number | null;
  energy: number | null;
  soreness: number | null;
  stress: number | null;
  motivation: number | null;
  state: RecoveryDataState;
  sourceCount: number;
  sleepEntry?: SleepEntry;
  checkIn?: RecoveryCheckIn;
}

export const isRecoveryNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function recoverySleepContribution(entry?: SleepEntry) {
  if (!entry) return null;
  if (!isRecoveryNumber(entry.hours) || !isRecoveryNumber(entry.quality)) return null;
  if (entry.hours < 0 || entry.hours > 24 || entry.quality < 0 || entry.quality > 10) return null;
  return Math.min(100, (entry.hours / 8) * 50 + entry.quality * 5);
}

export function recoveryCheckInContribution(entry?: RecoveryCheckIn) {
  if (!entry) return null;
  if (
    !isRecoveryNumber(entry.energy) ||
    !isRecoveryNumber(entry.soreness) ||
    !isRecoveryNumber(entry.stress) ||
    !isRecoveryNumber(entry.motivation)
  )
    return null;
  if (
    [entry.energy, entry.soreness, entry.stress, entry.motivation].some(
      (value) => value < 0 || value > 10,
    )
  )
    return null;
  return (entry.energy + (10 - entry.soreness) + (10 - entry.stress) + entry.motivation) * 2.5;
}

export function calculateRecoveryReadiness(
  sleep?: SleepEntry,
  checkIn?: RecoveryCheckIn,
  now = Date.now(),
): RecoverySnapshot {
  const sleepScore = recoverySleepContribution(sleep);
  const checkInScore = recoveryCheckInContribution(checkIn);
  const scores = [sleepScore, checkInScore].filter((value): value is number => value != null);
  const sleepInvalid = !!sleep && sleepScore == null;
  const checkInvalid = !!checkIn && checkInScore == null;
  const sleepStale = sleepScore != null && now - sleep!.createdAt > RECOVERY_SLEEP_STALE_MS;
  const checkStale = checkInScore != null && now - checkIn!.createdAt > RECOVERY_CHECK_IN_STALE_MS;
  const parts = scores.length;
  const quality: RecoveryQuality =
    sleepInvalid || checkInvalid
      ? {
          state: "unavailable",
          confidence: "low",
          sourceCount: parts,
          reason: "Latest recovery values are invalid",
        }
      : sleepStale || checkStale
        ? {
            state: "stale",
            confidence: parts === 2 ? "medium" : "low",
            sourceCount: parts,
            reason: "One or more readiness contributors need a current entry",
          }
        : parts === 2
          ? { state: "ready", confidence: "high", sourceCount: 2 }
          : parts === 1
            ? {
                state: "partial",
                confidence: "medium",
                sourceCount: 1,
                reason: "One of two readiness contributors is usable",
              }
            : {
                state: "needs_more_data",
                confidence: "low",
                sourceCount: 0,
                reason: "No usable readiness contributor is available",
              };

  return {
    score: parts ? Math.round(scores.reduce((sum, value) => sum + value, 0) / parts) : null,
    sleepScore,
    checkInScore,
    parts,
    sleepInvalid,
    checkInvalid,
    sleepStale,
    checkStale,
    quality,
  };
}

export function recoveryReadinessStatus(score: number | null) {
  if (score == null) return "Readiness unavailable";
  if (score >= 75) return "High readiness";
  if (score >= 60) return "Solid readiness";
  if (score >= 40) return "Reduced readiness";
  return "Low readiness";
}

export function recoveryRecommendation(snapshot: RecoverySnapshot) {
  if (snapshot.score == null) return "Add sleep or a daily check-in to get a recommendation.";
  if (snapshot.sleepStale || snapshot.checkStale)
    return "Your latest usable entries are older, so update them before relying on today's score.";
  if (snapshot.score >= 75) return "Great recovery — train hard today.";
  if (snapshot.score >= 60) return "Solid recovery — follow your normal training plan.";
  if (snapshot.score >= 40) return "Consider reducing training volume or intensity by about 20%.";
  return "Prioritize rest, mobility, or light cardio today.";
}

export function recoveryDateKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function latestByDate<T extends { createdAt: number }>(records: T[], cutoff: number) {
  const map = new Map<string, T>();
  records
    .filter((record) => record.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((record) => map.set(recoveryDateKey(record.createdAt), record));
  return map;
}

export function buildRecoveryTimeline(
  sleeps: SleepEntry[],
  checkIns: RecoveryCheckIn[],
  days: number,
  now = Date.now(),
) {
  const cutoff = now - days * 86_400_000;
  const sleepByDate = latestByDate(sleeps, cutoff);
  const checkByDate = latestByDate(checkIns, cutoff);
  const dates = [...new Set([...sleepByDate.keys(), ...checkByDate.keys()])].sort();

  return dates.map((date): RecoveryTimelinePoint => {
    const sleepEntry = sleepByDate.get(date);
    const checkIn = checkByDate.get(date);
    const snapshot = calculateRecoveryReadiness(sleepEntry, checkIn, now);
    return {
      date,
      timestamp: Math.max(sleepEntry?.createdAt ?? 0, checkIn?.createdAt ?? 0),
      readiness: snapshot.score,
      sleep: sleepEntry && isRecoveryNumber(sleepEntry.hours) ? sleepEntry.hours : null,
      sleepQuality: sleepEntry && isRecoveryNumber(sleepEntry.quality) ? sleepEntry.quality : null,
      energy: checkIn && isRecoveryNumber(checkIn.energy) ? checkIn.energy : null,
      soreness: checkIn && isRecoveryNumber(checkIn.soreness) ? checkIn.soreness : null,
      stress: checkIn && isRecoveryNumber(checkIn.stress) ? checkIn.stress : null,
      motivation: checkIn && isRecoveryNumber(checkIn.motivation) ? checkIn.motivation : null,
      state: snapshot.sleepInvalid || snapshot.checkInvalid ? "invalid" : snapshot.quality.state,
      sourceCount: snapshot.parts,
      sleepEntry,
      checkIn,
    };
  });
}

export function averageFinite(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => isRecoveryNumber(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

export function workoutCompletedSets(workout: Workout) {
  return workout.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed);
}

export function workoutVolume(workout: Workout) {
  return workoutCompletedSets(workout).reduce(
    (sum, set) =>
      sum +
      (isRecoveryNumber(set.weight) && isRecoveryNumber(set.reps) ? set.weight * set.reps : 0),
    0,
  );
}
