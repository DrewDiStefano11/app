import type { AppState, DataProvenance, RecoveryCheckIn, SleepEntry, Workout } from "../types";
import { addCalendarDays, dayKey, startOfDay } from "./date-time";
import {
  calculateWorkoutVolume,
  recordedRecoveryCheckIns,
  recoveryCheckInReadinessScore,
} from "./observed-fitness";
import { clampScore } from "./safe-math";
import { currentWhoopRecovery, recoveryAsOf, selectWhoopEvidence } from "../whoop/evidence";
import type { WhoopSnapshot } from "../whoop/dashboard";

export type ScoreStatus = "unavailable" | "limited" | "stale" | "available";

interface Evidence {
  label: string;
  detail?: string;
  records: { at: number; source: DataProvenance["source"] | "recorded" | "demo" | "whoop" }[];
}

export interface PersonalScore {
  sourceLabel?: "FitCore estimate";
  measurement?: { source: "whoop"; at: string; state: string };
  value: number | null;
  status: ScoreStatus;
  evidenceQuality: "insufficient" | "provisional" | "supported";
  freshness: "none" | "recent" | "stale";
  demo: boolean;
  evidence: Evidence[];
  missing: string[];
  explanation: string;
}

const DAY = 86_400_000;
const FRESH_READINESS_DAYS = 2;
const MAIN_MEALS = ["breakfast", "lunch", "dinner"];
type RecordTime = { at: number; provenance?: DataProvenance };

const isGrounded = (record: RecordTime) =>
  Number.isFinite(record.at) &&
  record.at > 0 &&
  record.provenance?.confirmation !== "unconfirmed" &&
  (record.provenance?.source !== "ai-estimated" || record.provenance.confirmation === "confirmed");
const recent = (record: RecordTime, now: number, days: number) =>
  record.at >= now - days * DAY && record.at <= now;
const range = (number: number, min: number, max: number) =>
  Number.isFinite(number) && number >= min && number <= max;
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function source(label: string, records: RecordTime[], demo: boolean, detail?: string): Evidence {
  return {
    label,
    detail,
    records: records.map(({ at, provenance }) => ({
      at,
      source: demo ? "demo" : (provenance?.source ?? "recorded"),
    })),
  };
}

function metric(
  demo: boolean,
  status: ScoreStatus,
  value: number | null,
  evidence: Evidence[],
  missing: string[],
  explanation: string,
): PersonalScore {
  return {
    value: value == null ? null : clampScore(value),
    status,
    demo,
    evidence: evidence.filter((group) => group.records.length > 0),
    missing,
    explanation,
    evidenceQuality:
      status === "available" ? "supported" : status === "limited" ? "provisional" : "insufficient",
    freshness:
      status === "stale"
        ? "stale"
        : evidence.some((group) => group.records.length > 0)
          ? "recent"
          : "none",
  };
}

function observeReadiness(state: AppState, now: number) {
  const checked = recordedRecoveryCheckIns(state)
    .map((record) => ({ ...record, at: record.createdAt }))
    .filter((record) => isGrounded(record) && record.at <= now);
  const slept = state.sleepEntries
    .map((record) => ({ ...record, at: record.createdAt }))
    .filter(
      (record) =>
        isGrounded(record) &&
        record.at <= now &&
        range(record.hours, 0, 24) &&
        range(record.quality, 1, 10),
    );
  return { checked, slept };
}

function readinessFrom(
  state: AppState,
  checks: (RecoveryCheckIn & RecordTime)[],
  sleeps: (SleepEntry & RecordTime)[],
  older: { checks: RecordTime[]; sleeps: RecordTime[] },
) {
  const demo = state.demoMode;
  const checkComponent = checks.length ? average(checks.map(recoveryCheckInReadinessScore)) : null;
  const sleepComponent = sleeps.length
    ? average(
        sleeps.map(
          (sleep) =>
            Math.min(
              1,
              sleep.hours /
                (range(state.profile.sleepGoalH ?? 0, 1, 24) ? state.profile.sleepGoalH! : 8),
            ) *
            sleep.quality *
            10,
        ),
      )
    : null;
  const estimate = [checkComponent, sleepComponent].filter(
    (value): value is number => value !== null,
  );
  const missing = [
    ...(!checks.length ? ["Record a recent recovery check-in"] : []),
    ...(!sleeps.length ? ["Record recent sleep duration and quality"] : []),
  ];
  const status =
    estimate.length === 2
      ? "available"
      : estimate.length
        ? "limited"
        : older.checks.length || older.sleeps.length
          ? "stale"
          : "unavailable";
  return metric(
    demo,
    status,
    estimate.length ? average(estimate) : null,
    [
      source(
        "Recovery check-ins",
        checks.length || estimate.length ? checks : older.checks,
        demo,
        checkComponent === null
          ? undefined
          : `Check-in component ${Math.round(checkComponent)}/100 from four ratings on a 1–10 scale.`,
      ),
      source(
        "Sleep records",
        sleeps.length || estimate.length ? sleeps : older.sleeps,
        demo,
        sleepComponent === null
          ? undefined
          : `Sleep component ${Math.round(sleepComponent)}/100 from recorded duration and quality.`,
      ),
    ],
    missing,
    "An estimate from the last 48 hours of recorded sleep and self-reported energy, motivation, soreness and stress. Sleep duration is compared with your goal or an 8-hour reference. With both sources, they contribute equally.",
  );
}

function readinessEstimate(state: AppState, now: number) {
  const { checked, slept } = observeReadiness(state, now);
  return readinessFrom(
    state,
    checked.filter((row) => recent(row, now, FRESH_READINESS_DAYS)),
    slept.filter((row) => recent(row, now, FRESH_READINESS_DAYS)),
    { checks: checked, sleeps: slept },
  );
}

export function readinessHistory(
  state: AppState,
  now = Date.now(),
  snapshot?: WhoopSnapshot | null,
) {
  const { checked, slept } = observeReadiness(state, now);
  const summary = state.demoMode ? null : selectWhoopEvidence(snapshot, now);
  return Array.from({ length: 14 }, (_, index) => {
    const date = addCalendarDays(startOfDay(now), index - 13);
    const end = addCalendarDays(date, 1);
    const cutoff = index === 13 ? now : end - 1;
    const row = recoveryAsOf(summary, cutoff);
    const observed =
      index === 13 ||
      [...checked, ...slept].some((record) => record.at >= date && record.at < end) ||
      summary?.history.some(
        (record) => Date.parse(record.at) >= date && Date.parse(record.at) < end,
      );
    const score =
      observed && row
        ? readinessWithWhoop(
            state,
            checked.filter((record) => recent(record, cutoff, FRESH_READINESS_DAYS)),
            row,
          )
        : observed
          ? readinessEstimate(state, cutoff)
          : readinessFrom(state, [], [], { checks: [], sleeps: [] });
    return {
      date: dayKey(date),
      label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ...score,
    };
  });
}

function workoutEvidence(workout: Workout): RecordTime {
  return { at: workout.endedAt ?? workout.startedAt, provenance: workout.provenance };
}

function trainingEvidence(state: AppState, now: number) {
  return state.workouts.filter(
    (workout) =>
      workout.endedAt != null &&
      isGrounded(workoutEvidence(workout)) &&
      workout.endedAt <= now &&
      workout.exercises.some((exercise) =>
        exercise.sets.some(
          (set) =>
            set.completed &&
            [set.reps, set.durationMin, set.distanceMi].some(
              (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
            ),
        ),
      ),
  );
}

function trainingScore(state: AppState, all: Workout[], now: number) {
  const logged = all.filter((workout) => recent(workoutEvidence(workout), now, 7));
  const days = new Set(logged.map((workout) => dayKey(workoutEvidence(workout).at))).size;
  const goal = state.profile.daysPerWeek;
  const available = days >= 2 && range(goal, 1, 7);
  return metric(
    state.demoMode,
    available ? "available" : days ? "limited" : all.length ? "stale" : "unavailable",
    available ? (days / goal) * 100 : null,
    [source("Completed workout days", (days ? logged : all).map(workoutEvidence), state.demoMode)],
    available
      ? []
      : ["Log completed sets on at least two days in the past week and set a weekly workout goal"],
    "Logged workout days in the past seven days as a share of the weekly goal. Unrecorded workouts cannot be counted.",
  );
}

export function calculateNutritionAdherence(state: AppState, now: number) {
  const recorded = state.mealEntries
    .map((meal) => ({ ...meal, at: meal.createdAt }))
    .filter(
      (meal) =>
        isGrounded(meal) &&
        meal.confirmed !== false &&
        meal.at <= now &&
        Number.isFinite(meal.calories) &&
        meal.calories > 0 &&
        Number.isFinite(meal.protein) &&
        meal.protein >= 0,
    );
  const oldestDay = addCalendarDays(now, -7);
  const today = startOfDay(now);
  const current = recorded.filter((meal) => meal.at >= oldestDay && meal.at < today);
  const byDay = new Map<string, typeof current>();
  for (const meal of current) {
    const key = dayKey(meal.at);
    const group = byDay.get(key);
    if (group) group.push(meal);
    else byDay.set(key, [meal]);
  }
  const complete = [...byDay.values()].filter((rows) =>
    MAIN_MEALS.every((type) => rows.some((meal) => meal.type.toLowerCase() === type)),
  );
  const { calories, protein } = state.nutritionTargets;
  const available = complete.length >= 3 && calories > 0 && protein > 0;
  const value = available
    ? average(
        complete.map((meals) => {
          const cal = meals.reduce((total, meal) => total + meal.calories, 0);
          const pro = meals.reduce((total, meal) => total + meal.protein, 0);
          return (
            (1 - Math.min(1, Math.abs(cal - calories) / calories) + Math.min(1, pro / protein)) * 50
          );
        }),
      )
    : null;
  const entries = available ? complete.flat() : recorded.filter((meal) => meal.at >= oldestDay);
  const evidence = entries.length ? entries : recorded;
  const status = available
    ? "available"
    : entries.length
      ? "limited"
      : recorded.length
        ? "stale"
        : "unavailable";
  const score = metric(
    state.demoMode,
    status,
    value,
    [source("Recorded meals", evidence, state.demoMode)],
    available
      ? []
      : [
          "Record breakfast, lunch and dinner on three recent days and set calorie and protein targets",
        ],
    "An estimate of calorie and protein target adherence on days with all three main meals recorded. Partial days and today are excluded.",
  );
  return { score, entries, completeDays: complete.length };
}

function recoveryEstimate(state: AppState, readiness: PersonalScore, all: Workout[], now: number) {
  const loaded = all.filter((workout) => calculateWorkoutVolume(workout) > 0);
  const current = loaded.filter((workout) => recent(workoutEvidence(workout), now, 3));
  const previous = loaded.filter(
    (workout) =>
      recent(workoutEvidence(workout), now, 28) && !recent(workoutEvidence(workout), now, 3),
  );
  const priorDays = new Set(previous.map((workout) => dayKey(workoutEvidence(workout).at))).size;
  const enough = current.length > 0 && priorDays >= 2 && readiness.status === "available";
  const previousVolume = previous.reduce(
    (sum, workout) => sum + calculateWorkoutVolume(workout),
    0,
  );
  const currentVolume = current.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
  const baselineVolume = (previousVolume * 3) / 25;
  const ratio = enough ? currentVolume / baselineVolume : 0;
  const load = Math.max(0, Math.min(100, 100 - (Math.min(1.5, ratio) - 0.7) * 80));
  const status = enough
    ? "available"
    : readiness.freshness === "recent" || current.length
      ? "limited"
      : readiness.status === "stale" || loaded.length
        ? "stale"
        : "unavailable";
  const result = metric(
    state.demoMode,
    status,
    enough ? readiness.value! * 0.6 + load * 0.4 : null,
    [
      ...readiness.evidence,
      source(
        "Recent loaded workouts",
        current.map(workoutEvidence),
        state.demoMode,
        enough
          ? `${Math.round(currentVolume)} lb of logged volume. Load component ${Math.round(load)}/100.`
          : undefined,
      ),
      source(
        "Earlier loaded workouts",
        previous.map(workoutEvidence),
        state.demoMode,
        enough
          ? `Prior logged volume averaged ${Math.round(baselineVolume)} lb per three days.`
          : undefined,
      ),
    ],
    [
      ...readiness.missing,
      ...(current.length ? [] : ["Log a loaded workout in the last three days"]),
      ...(priorDays >= 2
        ? []
        : ["Log loaded workouts on two earlier days within the last 28 days"]),
    ],
    "A training and self-report estimate. Once supported, readiness contributes 60% and recent logged lifting volume compared with earlier logged volume contributes 40%.",
  );
  return { ...result, sourceLabel: "FitCore estimate" as const };
}

function progressEstimate(state: AppState, all: Workout[], now: number) {
  const observations = new Map<
    string,
    Map<string, { at: number; lift: number; workout: Workout }>
  >();
  for (const workout of all) {
    const at = workoutEvidence(workout).at;
    if (!recent(workoutEvidence(workout), now, 28)) continue;
    for (const exercise of workout.exercises)
      for (const set of exercise.sets) {
        if (
          !set.completed ||
          set.modifier === "warmup" ||
          set.modifier === "partials" ||
          !range(set.weight ?? 0, 0.01, Infinity) ||
          !range(set.reps ?? 0, 1, Infinity)
        )
          continue;
        const key = JSON.stringify([exercise.exerciseId, set.reps, set.modifier ?? "normal"]);
        const previous = observations.get(key) ?? new Map();
        const date = dayKey(at);
        const day = previous.get(date);
        if (!day || set.weight! > day.lift) previous.set(date, { at, lift: set.weight!, workout });
        observations.set(key, previous);
      }
  }
  const inputs = new Map<string, Workout>();
  const changes: number[] = [];
  for (const records of observations.values()) {
    const [latest, previous] = [...records.values()].sort((a, b) => b.at - a.at);
    if (!previous || !recent(workoutEvidence(latest.workout), now, 14)) continue;
    changes.push((latest.lift - previous.lift) / previous.lift);
    for (const row of [previous, latest]) inputs.set(row.workout.id, row.workout);
  }
  const relevant = all.filter((workout) => recent(workoutEvidence(workout), now, 14));
  return metric(
    state.demoMode,
    changes.length
      ? "available"
      : relevant.length
        ? "limited"
        : all.length
          ? "stale"
          : "unavailable",
    changes.length ? 60 + average(changes) * 200 : null,
    [
      source(
        changes.length
          ? "Comparable strength sessions"
          : relevant.length
            ? "Recent workouts"
            : "Earlier workouts",
        (changes.length ? [...inputs.values()] : relevant.length ? relevant : all.slice(-5)).map(
          workoutEvidence,
        ),
        state.demoMode,
      ),
    ],
    changes.length
      ? []
      : ["Repeat a weighted exercise with the same repetitions and set type on two different days"],
    "Compares logged loads at matching repetition counts and set types. A value of 60 represents unchanged comparable loads.",
  );
}

function combined(
  demo: boolean,
  factors: { label: string; score: PersonalScore; weight: number }[],
  explanation: string,
) {
  const supported = factors.every(({ score }) => score.status === "available");
  const recentEvidence = factors.some(({ score }) => score.freshness === "recent");
  return metric(
    demo,
    supported
      ? "available"
      : recentEvidence
        ? "limited"
        : factors.some(({ score }) => score.status === "stale")
          ? "stale"
          : "unavailable",
    supported ? factors.reduce((sum, { score, weight }) => sum + score.value! * weight, 0) : null,
    factors.flatMap(({ score }) => score.evidence),
    factors.filter(({ score }) => score.status !== "available").map(({ label }) => label),
    explanation,
  );
}

function whoopScore(
  state: AppState,
  row: NonNullable<ReturnType<typeof currentWhoopRecovery>>,
): PersonalScore {
  const measured = row.state === "scored" && row.score !== null && row.score <= 100;
  return {
    ...metric(
      state.demoMode,
      measured ? "available" : "unavailable",
      null,
      [
        {
          label: "WHOOP Recovery",
          records: [{ at: Date.parse(row.at), source: "whoop" }],
          detail: "Official WHOOP Recovery; no FitCore recalculation.",
        },
      ],
      measured ? [] : [`WHOOP Recovery is ${row.state === "scored" ? "unavailable" : row.state}.`],
      "The original WHOOP Recovery measurement, reported on the date shown. FitCore does not recreate WHOOP Recovery.",
    ),
    value: measured ? row.score : null,
    measurement: { source: "whoop", at: row.at, state: row.state },
  };
}

function readinessWithWhoop(
  state: AppState,
  checks: (RecoveryCheckIn & RecordTime)[],
  row: NonNullable<ReturnType<typeof currentWhoopRecovery>>,
): PersonalScore {
  const measured = whoopScore(state, row);
  const check = checks.length ? average(checks.map(recoveryCheckInReadinessScore)) : null;
  const supported = measured.value !== null && check !== null;
  return metric(
    state.demoMode,
    supported ? "available" : "limited",
    supported ? measured.value! * 0.7 + check! * 0.3 : null,
    [...measured.evidence, source("Recovery check-ins", checks, state.demoMode)],
    [...measured.missing, ...(check === null ? ["Record a recent recovery check-in"] : [])],
    "FitCore Readiness = 70% WHOOP Recovery + 30% recent subjective check-in score. Both are required. Check-ins average energy, motivation, reversed soreness and reversed stress on a 1–10 scale. Sleep, HRV and heart rate are not added again because WHOOP Recovery already reflects wearable recovery evidence. This is a FitCore heuristic, not a WHOOP score.",
  );
}

export function calculateRecoveryEstimate(
  state: AppState,
  now = Date.now(),
  snapshot?: WhoopSnapshot | null,
) {
  const row = state.demoMode ? null : currentWhoopRecovery(snapshot, now);
  return row
    ? whoopScore(state, row)
    : recoveryEstimate(state, readinessEstimate(state, now), trainingEvidence(state, now), now);
}

export function calculatePersonalScores(
  state: AppState,
  now = Date.now(),
  snapshot?: WhoopSnapshot | null,
) {
  const manualReadiness = readinessEstimate(state, now);
  const row = state.demoMode ? null : currentWhoopRecovery(snapshot, now);
  const readiness = row
    ? readinessWithWhoop(
        state,
        observeReadiness(state, now).checked.filter((check) =>
          recent(check, now, FRESH_READINESS_DAYS),
        ),
        row,
      )
    : manualReadiness;
  const workouts = trainingEvidence(state, now);
  const training = trainingScore(state, workouts, now);
  const { score: nutrition } = calculateNutritionAdherence(state, now);
  const recovery = row
    ? whoopScore(state, row)
    : recoveryEstimate(state, manualReadiness, workouts, now);
  const progress = progressEstimate(state, workouts, now);
  const performance = combined(
    state.demoMode,
    [
      { label: "Training consistency", score: training, weight: 0.5 },
      { label: "Comparable training progress", score: progress, weight: 0.5 },
    ],
    "An equal blend of training consistency and comparable strength progress. Both must have enough records.",
  );
  const fitcore = combined(
    state.demoMode,
    [
      { label: "Training consistency", score: training, weight: 0.35 },
      { label: "Nutrition adherence", score: nutrition, weight: 0.25 },
      { label: "Recovery", score: recovery, weight: 0.25 },
      { label: "Comparable training progress", score: progress, weight: 0.15 },
    ],
    "An estimate combining training consistency (35%), nutrition adherence (25%), recovery (25%) and comparable training progress (15%). All four are required.",
  );
  return { readiness, recovery, training, nutrition, progress, performance, fitcore };
}

export function scoreStatusLabel(metric: PersonalScore): string {
  if (metric.measurement) {
    const { state, at } = metric.measurement;
    return `WHOOP · ${metric.value !== null ? "Measured" : state === "pending" ? "Pending" : state === "calibrating" ? "Calibrating" : "Unavailable"} · ${new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  if (metric.sourceLabel && metric.value !== null)
    return metric.demo ? "Demo Data · FitCore estimate" : metric.sourceLabel;
  const status = {
    unavailable: "Not enough data",
    limited: "Limited data",
    stale: "Stale",
    available: "Calculated estimate",
  }[metric.status];
  return metric.demo ? `Demo Data · ${status}` : status;
}
