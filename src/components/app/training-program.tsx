import { useState, type FormEvent } from "react";
import { useLocalCalendarDate } from "@/hooks/use-local-calendar-date";
import { availableWorkoutTemplates, type WorkoutTemplate } from "@/lib/data";
import { PROGRAM_WEEKDAYS } from "@/lib/bench-program";
import { uid, useStore } from "@/lib/store";
import { activeRoutineSession } from "@/lib/training-routines";
import type { TrainingRoutine, TrainingRoutineDay } from "@/lib/types";
import { BenchProgram } from "./bench-program";
import { BottomSheet } from "./sheet";
import { Card, GhostButton, Input, PrimaryButton, Select } from "./ui";

const localWeekdays = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabel = (day: number) => PROGRAM_WEEKDAYS[(day + 6) % 7];

export function TrainingProgram({ onStart }: { onStart: () => void }) {
  const { state, set, startWorkout } = useStore();
  const date = useLocalCalendarDate();
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const saved = state.personalization.trainingRoutine;
  const session = activeRoutineSession(state, date, selected || undefined);
  const templates = availableWorkoutTemplates(state.workoutTemplates);

  const save = (trainingRoutine: TrainingRoutine) => {
    const committed = set((current) => ({
      ...current,
      personalization: { ...current.personalization, trainingRoutine },
    }));
    setError(committed ? "" : "The routine could not be saved. Try again.");
    if (committed) setSelected("");
    return committed;
  };

  return (
    <>
      {session ? (
        <Card className="space-y-3">
          <h2 className="font-bold">{session.routine.name}</h2>
          <label className="block space-y-1 text-sm">
            <span>Routine day</span>
            <Select
              aria-label="Routine day"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">
                {session.routine.mode === "weekly" ? "Today" : "Next in rotation"}
              </option>
              {session.routine.days.map((day, index) => (
                <option key={day.id} value={day.id}>
                  {day.weekday == null ? `Day ${index + 1}` : weekdayLabel(day.weekday)} ·{" "}
                  {templates.find((template) => template.id === day.templateId)?.name ??
                    "Unavailable template"}
                </option>
              ))}
            </Select>
          </label>
          {session.day && session.template ? (
            <>
              <p className="font-semibold">{session.template.name}</p>
              <p className="text-sm text-muted-foreground">
                {session.template.exercises.length} exercises
              </p>
              {!state.activeWorkout && (
                <PrimaryButton
                  className="w-full"
                  onClick={() => {
                    if (!session.day || !session.template) return;
                    if (
                      startWorkout(session.template, {
                        routineId: session.routine.id,
                        routineDayId: session.day.id,
                      })
                    )
                      onStart();
                    else setError("The workout could not be started. Try again.");
                  }}
                >
                  Start {session.template.name}
                </PrimaryButton>
              )}
            </>
          ) : (
            <p>
              {session.day
                ? "This workout template is unavailable. Edit the routine to replace it."
                : "Rest Day"}
            </p>
          )}
        </Card>
      ) : (
        <BenchProgram onStart={onStart} />
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton
          onClick={() => {
            setError("");
            setEditing(true);
          }}
        >
          {saved ? "Edit custom routine" : "Create custom routine"}
        </GhostButton>
        {saved && (
          <GhostButton onClick={() => save({ ...saved, enabled: !saved.enabled })}>
            {saved.enabled ? "Use Bench Strength program" : "Use custom routine"}
          </GhostButton>
        )}
      </div>
      {error && !editing && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {editing && (
        <RoutineEditor
          routine={saved}
          templates={templates}
          error={error}
          onClose={() => {
            setError("");
            setEditing(false);
          }}
          onSave={(value) => {
            if (save(value)) setEditing(false);
          }}
        />
      )}
    </>
  );
}

function RoutineEditor({
  routine,
  templates,
  error,
  onClose,
  onSave,
}: {
  routine?: TrainingRoutine;
  templates: WorkoutTemplate[];
  error: string;
  onClose: () => void;
  onSave: (value: TrainingRoutine) => void;
}) {
  const [name, setName] = useState(routine?.name ?? "");
  const [mode, setMode] = useState<TrainingRoutine["mode"]>(routine?.mode ?? "weekly");
  const [weekly, setWeekly] = useState(() =>
    localWeekdays.map(
      (weekday) =>
        routine?.days.find((day) => day.weekday === weekday) ?? {
          id: uid(),
          weekday,
          templateId: "",
        },
    ),
  );
  const [rotation, setRotation] = useState<TrainingRoutineDay[]>(() =>
    routine?.mode === "rotation" ? routine.days : [{ id: uid(), templateId: "" }],
  );
  const days = mode === "weekly" ? weekly.filter((day) => day.templateId) : rotation;
  const valid =
    name.trim() &&
    days.length > 0 &&
    days.every((day) => templates.some((template) => template.id === day.templateId));

  const move = (index: number, direction: -1 | 1) => {
    setRotation((rows) => {
      const reordered = [...rows];
      const next = index + direction;
      [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
      return reordered;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSave({ id: routine?.id ?? uid(), name: name.trim(), mode, days, enabled: true });
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={routine ? "Edit custom routine" : "Create custom routine"}
      height="tall"
    >
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>Routine name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Schedule type</span>
          <Select
            value={mode}
            onChange={(event) => setMode(event.target.value as TrainingRoutine["mode"])}
          >
            <option value="weekly">Days of the week</option>
            <option value="rotation">Flexible rotation</option>
          </Select>
        </label>
        {mode === "rotation" && (
          <p className="text-xs text-muted-foreground">
            Finishing a scheduled workout moves the rotation to its next day.
          </p>
        )}
        {(mode === "weekly" ? weekly : rotation).map((day, index) => (
          <div key={day.id} className="space-y-1">
            <label className="block space-y-1 text-sm">
              <span>{day.weekday == null ? `Day ${index + 1}` : weekdayLabel(day.weekday)}</span>
              <Select
                aria-label={day.weekday == null ? `Day ${index + 1}` : weekdayLabel(day.weekday)}
                value={day.templateId}
                onChange={(event) => {
                  const templateId = event.target.value;
                  const update = (rows: TrainingRoutineDay[]) =>
                    rows.map((row) => (row.id === day.id ? { ...row, templateId } : row));
                  if (mode === "weekly") setWeekly(update);
                  else setRotation(update);
                }}
              >
                <option value="">{mode === "weekly" ? "Rest Day" : "Choose a workout"}</option>
                {day.templateId &&
                  !templates.some((template) => template.id === day.templateId) && (
                    <option value={day.templateId}>Unavailable template</option>
                  )}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </label>
            {mode === "rotation" && (
              <div className="flex flex-wrap gap-2">
                <GhostButton
                  type="button"
                  aria-label={`Move day ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </GhostButton>
                <GhostButton
                  type="button"
                  aria-label={`Move day ${index + 1} down`}
                  disabled={index === rotation.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </GhostButton>
                <GhostButton
                  type="button"
                  aria-label={`Remove day ${index + 1}`}
                  disabled={rotation.length === 1}
                  onClick={() => setRotation((rows) => rows.filter((row) => row.id !== day.id))}
                >
                  Remove
                </GhostButton>
              </div>
            )}
          </div>
        ))}
        {mode === "rotation" && (
          <GhostButton
            type="button"
            onClick={() => setRotation((rows) => [...rows, { id: uid(), templateId: "" }])}
          >
            Add training day
          </GhostButton>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" className="w-full" disabled={!valid}>
          Save and use routine
        </PrimaryButton>
      </form>
    </BottomSheet>
  );
}
