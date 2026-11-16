import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { exerciseById, MAX_WORKOUT_TEMPLATE_SETS, type TemplateExercise } from "@/lib/data";
import { uid, useStore } from "@/lib/store";
import type { WorkoutTemplateReference } from "@/lib/types";
import { ExercisePicker } from "./active-workout";
import { BottomSheet } from "./sheet";
import { Card, GhostButton, Input, PrimaryButton, Textarea } from "./ui";

type ExerciseDraft = Omit<TemplateExercise, "sets"> & { key: string; sets: string };

export function WorkoutTemplateEditor({
  template,
  onClose,
}: {
  template: WorkoutTemplateReference | null;
  onClose: () => void;
}) {
  const { state, set } = useStore();
  const [name, setName] = useState(template?.name ?? "");
  const [duration, setDuration] = useState(
    template?.plan?.durationMin ? String(template.plan.durationMin) : "",
  );
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    () =>
      template?.plan?.exercises.map((exercise) => ({
        ...exercise,
        key: uid(),
        sets: String(exercise.sets),
      })) ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const durationMin = Number(duration);
  const valid =
    name.trim().length > 0 &&
    exercises.length > 0 &&
    Number.isInteger(durationMin) &&
    durationMin >= 0 &&
    exercises.every(({ sets }) => {
      const count = Number(sets);
      return Number.isInteger(count) && count > 0 && count <= MAX_WORKOUT_TEMPLATE_SETS;
    });

  const updateExercise = (key: string, patch: Partial<ExerciseDraft>) =>
    setExercises((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const moveExercise = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    setExercises((rows) => {
      if (destination < 0 || destination >= rows.length) return rows;
      const reordered = [...rows];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    const id = template?.id ?? uid();
    const updated: WorkoutTemplateReference = {
      ...template,
      id,
      name: name.trim(),
      templateId: template?.templateId ?? id,
      plan: {
        durationMin,
        exercises: exercises.map(({ key, sets, ...exercise }) => ({
          ...exercise,
          sets: Number(sets),
          reps: exercise.reps.trim(),
          notes: exercise.notes?.trim() || undefined,
        })),
      },
    };
    const saved = set((current) => ({
      ...current,
      workoutTemplates: template
        ? current.workoutTemplates.map((row) => (row.id === id ? updated : row))
        : [...current.workoutTemplates, updated],
    }));
    if (saved) onClose();
    else setSaveFailed(true);
  };

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title={template ? "Edit template" : "New template"}
        height="tall"
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Template name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Estimated minutes (optional)</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          {exercises.map((exercise, index) => {
            const exerciseName =
              exerciseById(exercise.exerciseId)?.name ??
              state.customExercises.find((item) => item.id === exercise.exerciseId)?.name ??
              "Exercise";
            return (
              <Card key={exercise.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold">{exerciseName}</h4>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="grid size-9 place-items-center disabled:opacity-30"
                      aria-label={`Move ${exerciseName} up`}
                      disabled={index === 0}
                      onClick={() => moveExercise(index, -1)}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid size-9 place-items-center disabled:opacity-30"
                      aria-label={`Move ${exerciseName} down`}
                      disabled={index === exercises.length - 1}
                      onClick={() => moveExercise(index, 1)}
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid size-9 place-items-center text-destructive"
                      aria-label={`Remove ${exerciseName}`}
                      onClick={() =>
                        setExercises((rows) => rows.filter((row) => row.key !== exercise.key))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    Sets
                    <Input
                      aria-label={`Sets for ${exerciseName}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_WORKOUT_TEMPLATE_SETS}
                      value={exercise.sets}
                      onChange={(event) =>
                        updateExercise(exercise.key, { sets: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Target reps
                    <Input
                      aria-label={`Target reps for ${exerciseName}`}
                      value={exercise.reps}
                      onChange={(event) =>
                        updateExercise(exercise.key, { reps: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Notes (optional)
                  <Textarea
                    aria-label={`Notes for ${exerciseName}`}
                    rows={2}
                    value={exercise.notes ?? ""}
                    onChange={(event) =>
                      updateExercise(exercise.key, { notes: event.target.value })
                    }
                  />
                </label>
              </Card>
            );
          })}
          <GhostButton type="button" className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={16} />
            Add exercise
          </GhostButton>
          {saveFailed && (
            <p role="alert" className="text-sm text-destructive">
              The template could not be saved. Check storage and retry.
            </p>
          )}
          <PrimaryButton type="submit" className="w-full" disabled={!valid}>
            Save template
          </PrimaryButton>
        </form>
      </BottomSheet>
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        customExercises={state.customExercises}
        onPick={(exerciseId) => {
          setExercises((rows) => [...rows, { key: uid(), exerciseId, sets: "1", reps: "" }]);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
