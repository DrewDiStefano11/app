import type { TemplateExercise, WorkoutTemplate } from "./data";
import type { Workout, WorkoutTemplateReference } from "./types";

export const BENCH_PROGRAM_ID = "bench-strength-upper-lower-v1";
export const BENCH_PROGRAM_NAME = "6-Day Upper/Lower Split — Bench Strength";
export const BENCH_PHASE_WEEKS = 12;
export const BENCH_GOALS_LB = [255, 285, 315] as const;
export const PROGRAM_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface BenchDay extends WorkoutTemplate {
  durationLabel?: string;
}

const dipsNote =
  "If shoulder discomfort occurs, dips may be replaced with equivalent cable-pushdown sets.";
const lowerNote = "Lower-body exercise selections are provisional.";
const reps = (
  exerciseId: string,
  sets: number,
  repetitions: number | string,
  options: Partial<TemplateExercise> = {},
): TemplateExercise => ({ exerciseId, sets, reps: String(repetitions), ...options });
const minutes = (exerciseId: string, targetMinutes: number): TemplateExercise => ({
  exerciseId,
  sets: 1,
  reps: "",
  targetMinutes,
});
const abs = () => [
  reps("reverse-crunches", 2, 15),
  reps("slow-bicycle-crunches", 2, "12 per side"),
  reps("long-arm-crunches", 2, 15),
];
const day = (
  key: string,
  name: string,
  goal: string,
  durationMin: number,
  durationLabel: string | undefined,
  exercises: TemplateExercise[],
  notes?: string,
): BenchDay => ({
  id: `${BENCH_PROGRAM_ID}-${key}`,
  name,
  goal,
  durationMin,
  durationLabel,
  exercises,
  notes,
});

export const BENCH_PROGRAM: readonly BenchDay[] = [
  day("upper-a", "Upper A", "Heavy Bench + Chest + Back + Arms", 90, "75–90 min", [
    reps("bench-press", 4, 4, { targetWeightLb: 195 }),
    reps("chest-supported-t-bar-row", 3, 8),
    reps("wide-grip-lat-pulldown", 3, 10),
    reps("incline-chest-press-machine", 2, 10),
    reps("pec-deck", 2, 12),
    reps("single-arm-cable-lateral-raise", 2, 15),
    reps("ez-bar-preacher-curl", 4, 10),
    reps("single-arm-cable-pushdown", 4, 12),
  ]),
  day(
    "lower-a",
    "Lower A",
    "Leg Strength + Abs",
    90,
    "70–90 min",
    [
      reps("leg-press", 3, 10),
      reps("hack-squat", 2, 10),
      reps("seated-curl", 3, 12),
      reps("leg-ext", 2, 12),
      reps("hip-abductor-machine", 2, 15),
      reps("hip-adductor-machine", 2, 15),
      reps("leg-press-calf-raises", 3, 12),
      ...abs(),
    ],
    lowerNote,
  ),
  day("upper-b", "Upper B", "Bench Technique + Back + Shoulders + Arms", 90, "75–90 min", [
    reps("light-paused-bench-press", 3, 3, { targetWeightLb: 155, startsWeek: 3 }),
    reps("wide-grip-lat-pulldown", 3, 8),
    reps("single-arm-cable-row", 3, 10),
    reps("reverse-pec-deck", 3, 15),
    reps("cable-lat-raise", 3, 15),
    reps("bayesian-cable-curls", 3, 10),
    reps("single-arm-preacher-curl-machine", 2, 12),
    reps("overhead-cable-triceps-extension", 2, 12),
    reps("parallel-bar-dips", 2, 8, { notes: dipsNote }),
  ]),
  day(
    "lower-b",
    "Lower B",
    "Hiking Conditioning + Abs + Mobility",
    75,
    "70–75 min",
    [
      minutes("stairs", 30),
      minutes("incline-treadmill", 20),
      ...abs(),
      minutes("full-body-mobility", 10),
    ],
    lowerNote,
  ),
  day("upper-c", "Upper C", "Bench Volume + Chest + Back + Arms", 85, "70–85 min", [
    reps("bench-press", 4, 6, { targetWeightLb: 175 }),
    reps("pec-deck", 2, 12),
    reps("chest-supported-row", 2, 10),
    reps("lat-pulldown", 2, 10),
    reps("cable-lat-raise", 2, 15),
    reps("single-arm-preacher-curls", 3, 12),
    reps("rope-triceps-pushdowns", 2, 12),
    reps("parallel-bar-dips", 2, 8, { notes: dipsNote }),
    reps("reverse-curls", 2, 12, { optional: true }),
  ]),
  day(
    "lower-c",
    "Lower C",
    "Leg Hypertrophy + Abs",
    90,
    "70–90 min",
    [
      reps("leg-press", 3, 10),
      reps("half-squat", 2, 10),
      reps("leg-ext", 2, 15),
      reps("single-leg-curl-machine", 3, 12),
      reps("seated-calf", 3, 15),
      reps("hip-adductor-machine", 2, 15),
      reps("hip-abductor-machine", 2, 15),
      ...abs(),
    ],
    lowerNote,
  ),
  day("rest", "Rest Day", "Optional light walking and mobility", 0, undefined, []),
];

export function benchProgramWeek(date: Date) {
  const start = Date.UTC(2026, 10, 16);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.floor((current - start) / (7 * 86_400_000)) + 1);
}

export const scheduledBenchDay = (date: Date) => BENCH_PROGRAM[(date.getDay() + 6) % 7];

export function configuredBenchDay(
  day: BenchDay,
  references: WorkoutTemplateReference[],
): BenchDay {
  const custom = references.find((row) => row.id === day.id);
  if (!custom?.plan) return day;
  const durationMin = custom.plan.durationMin;
  const durationLabel =
    durationMin === day.durationMin
      ? day.durationLabel
      : durationMin
        ? `${durationMin} min`
        : undefined;
  return { ...day, ...custom.plan, name: custom.name, durationLabel };
}

export function benchDayReference(
  day: BenchDay,
  previous?: WorkoutTemplateReference,
): WorkoutTemplateReference {
  return {
    ...previous,
    id: day.id,
    templateId: day.id,
    name: day.name,
    plan: { durationMin: day.durationMin, exercises: day.exercises },
  };
}

export function nextBenchSuggestion(day: BenchDay, workouts: Workout[], reviewedId?: string) {
  if (day.id !== BENCH_PROGRAM[0].id && day.id !== BENCH_PROGRAM[4].id) return;
  const rowIndex = day.exercises.findIndex(
    (row) => row.exerciseId === "bench-press" && row.targetWeightLb != null,
  );
  if (rowIndex < 0) return;
  const latest = workouts.reduce<Workout | undefined>((latest, workout) => {
    if (workout.templateId !== day.id || workout.endedAt == null) return latest;
    return !latest || workout.endedAt >= (latest.endedAt ?? 0) ? workout : latest;
  }, undefined);
  if (
    !latest ||
    latest.id === reviewedId ||
    benchProgramWeek(new Date(latest.startedAt)) > BENCH_PHASE_WEEKS
  )
    return;
  const bench = latest.exercises.find((row) => row.exerciseId === "bench-press" && row.target);
  const target = bench?.target;
  if (
    !bench ||
    !target?.targetWeightLb ||
    target.targetWeightLb !== day.exercises[rowIndex].targetWeightLb
  )
    return;
  const reps = Number(target.reps);
  const weightLb = target.targetWeightLb;
  if (!Number.isInteger(reps) || reps < 1) return;
  const sets = bench.sets.filter(
    (set) =>
      set.modifier !== "warmup" &&
      set.modifier !== "failure" &&
      set.modifier !== "partials" &&
      set.completed &&
      (set.reps ?? 0) >= reps &&
      (set.weight ?? 0) >= weightLb,
  );
  if (sets.length < target.sets) return;
  return { workoutId: latest.id, rowIndex, weightLb: weightLb + 5 };
}

export function formatWorkoutTarget(row: Omit<TemplateExercise, "exerciseId">) {
  if (row.targetMinutes != null) return `${row.targetMinutes} min`;
  const weight = row.targetWeightLb != null ? ` at ${row.targetWeightLb} lb` : "";
  return row.reps ? `${row.sets} × ${row.reps}${weight}` : `${row.sets} sets${weight}`;
}

export function workoutForBenchDay(day: BenchDay, week: number, comfortable: boolean): BenchDay {
  return {
    ...day,
    exercises: day.exercises.filter(
      (row) => !row.startsWeek || (week >= row.startsWeek && comfortable),
    ),
  };
}
