import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { exerciseById } from "@/lib/data";
import type { WorkoutTemplateReference } from "@/lib/types";
import {
  BENCH_GOALS_LB,
  BENCH_PHASE_WEEKS,
  BENCH_PROGRAM,
  BENCH_PROGRAM_NAME,
  PROGRAM_WEEKDAYS,
  benchDayReference,
  benchProgramWeek,
  configuredBenchDay,
  formatWorkoutTarget,
  nextBenchSuggestion,
  scheduledBenchDay,
  workoutForBenchDay,
} from "@/lib/bench-program";
import { Card, GhostButton, Input, PrimaryButton, Select } from "./ui";
import { WorkoutTemplateEditor } from "./workout-template-editor";

export function BenchProgram({ onStart }: { onStart: () => void }) {
  const { state, set, startWorkout } = useStore();
  const [date, setDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editor, setEditor] = useState<WorkoutTemplateReference | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [confirmedProgression, setConfirmedProgression] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    const refresh = () => setDate(new Date());
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const week = benchProgramWeek(date);
  const defaultDay = selectedDay === null ? scheduledBenchDay(date) : BENCH_PROGRAM[selectedDay];
  const previous = state.workoutTemplates.find((row) => row.id === defaultDay.id);
  const day = configuredBenchDay(defaultDay, state.workoutTemplates);
  const comfortable = previous?.pausedBenchConfirmed ?? false;
  const hasDelayedRow = day.exercises.some((row) => (row.startsWeek ?? Infinity) <= week);
  const suggestion =
    week <= BENCH_PHASE_WEEKS
      ? nextBenchSuggestion(day, state.workouts, previous?.reviewedBenchWorkoutId)
      : undefined;
  const proposal = recommendation ?? String(suggestion?.weightLb ?? "");
  const rest = defaultDay === BENCH_PROGRAM[6];

  const saveReference = (
    update: (reference: WorkoutTemplateReference) => WorkoutTemplateReference,
  ) => {
    const saved = set((current) => {
      const existing = current.workoutTemplates.find((row) => row.id === day.id);
      const latestDay = configuredBenchDay(defaultDay, current.workoutTemplates);
      const reference = update(benchDayReference(latestDay, existing));
      return {
        ...current,
        workoutTemplates: [
          ...current.workoutTemplates.filter((row) => row.id !== reference.id),
          reference,
        ],
      };
    });
    setSaveFailed(!saved);
    return saved;
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">{BENCH_PROGRAM_NAME}</h2>
      <p className="text-xs text-muted-foreground">
        {week <= BENCH_PHASE_WEEKS
          ? `Bench strength phase · Week ${week} of ${BENCH_PHASE_WEEKS}`
          : "Weekly split"}
      </p>
      <Select
        aria-label="Program day"
        value={selectedDay ?? "today"}
        onChange={(event) => {
          setSelectedDay(event.target.value === "today" ? null : Number(event.target.value));
          setRecommendation(null);
          setConfirmedProgression(null);
          setSaveFailed(false);
        }}
      >
        <option value="today">Today · {PROGRAM_WEEKDAYS[(date.getDay() + 6) % 7]}</option>
        {PROGRAM_WEEKDAYS.map((weekday, index) => (
          <option key={weekday} value={index}>
            {weekday}
          </option>
        ))}
      </Select>

      <div>
        <h3 className="font-semibold">{day.name}</h3>
        <p className="text-sm text-muted-foreground">
          {day.goal}
          {day.durationLabel && ` · ${day.durationLabel}`}
        </p>
      </div>

      {!rest && (
        <>
          {!state.activeWorkout && (
            <PrimaryButton
              className="w-full"
              onClick={() => {
                if (startWorkout(workoutForBenchDay(day, week, comfortable))) onStart();
                else setSaveFailed(true);
              }}
            >
              Start {day.name}
            </PrimaryButton>
          )}
          <ol className="space-y-2 text-sm">
            {day.exercises.map((row, index) => (
              <li key={`${row.exerciseId}-${index}`} className="flex items-start gap-2">
                <span className="w-5 shrink-0 text-muted-foreground">{index + 1}.</span>
                <div className="flex-1">
                  <p>
                    {exerciseById(row.exerciseId)?.name ??
                      state.customExercises.find((exercise) => exercise.id === row.exerciseId)
                        ?.name ??
                      "Exercise"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWorkoutTarget(row)}
                    {row.optional && " · Optional"}
                    {row.startsWeek && week < row.startsWeek && ` · Starts Week ${row.startsWeek}`}
                    {row.startsWeek &&
                      week >= row.startsWeek &&
                      !comfortable &&
                      " · Confirm two comfortable weeks"}
                  </p>
                  {row.notes && <p className="text-xs text-muted-foreground">{row.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
          {day.notes && <p className="text-xs text-muted-foreground">{day.notes}</p>}
          {hasDelayedRow && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={comfortable}
                onChange={(event) => {
                  const pausedBenchConfirmed = event.target.checked;
                  saveReference((reference) => ({ ...reference, pausedBenchConfirmed }));
                }}
              />
              Two weeks of Monday and Friday benching felt comfortable
            </label>
          )}
          <GhostButton onClick={() => setEditor(benchDayReference(day, previous))}>
            Edit {day.name}
          </GhostButton>
        </>
      )}

      {suggestion && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm">
            All prescribed bench reps were logged. If your technique was controlled and you had
            about 1–2 reps left, consider adding 5 lb.
          </p>
          <Input
            aria-label="Next bench target in pounds"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={proposal}
            onChange={(event) => setRecommendation(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmedProgression === suggestion.workoutId}
              onChange={(event) =>
                setConfirmedProgression(event.target.checked ? suggestion.workoutId : null)
              }
            />
            My technique was controlled and I had about 1–2 reps left
          </label>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              disabled={
                confirmedProgression !== suggestion.workoutId ||
                !proposal ||
                !Number.isFinite(Number(proposal)) ||
                Number(proposal) <= 0
              }
              onClick={() =>
                saveReference((reference) => ({
                  ...reference,
                  reviewedBenchWorkoutId: suggestion.workoutId,
                  plan: reference.plan && {
                    ...reference.plan,
                    exercises: reference.plan.exercises.map((row, index) =>
                      index === suggestion.rowIndex
                        ? { ...row, targetWeightLb: Number(proposal) }
                        : row,
                    ),
                  },
                }))
              }
            >
              Apply target
            </PrimaryButton>
            <GhostButton
              onClick={() =>
                saveReference((reference) => ({
                  ...reference,
                  reviewedBenchWorkoutId: suggestion.workoutId,
                }))
              }
            >
              Keep current target
            </GhostButton>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Bench 1RM · Initial estimate {BENCH_GOALS_LB[0]} lb · Goals {BENCH_GOALS_LB[1]} lb and{" "}
        {BENCH_GOALS_LB[2]} lb
      </p>
      {saveFailed && (
        <p role="alert" className="text-sm text-destructive">
          Could not save. Check storage and retry.
        </p>
      )}
      {editor && <WorkoutTemplateEditor template={editor} onClose={() => setEditor(null)} />}
    </Card>
  );
}
