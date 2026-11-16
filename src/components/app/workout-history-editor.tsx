import { useState, type FormEvent } from "react";
import { Card, GhostButton, Input, PrimaryButton, Textarea } from "@/components/app/ui";
import { exerciseById, tracksWorkoutMinutes } from "@/lib/data";
import { markProvenanceEdited } from "@/lib/fitcore-data";
import type { CustomExercise, SetEntry, Workout } from "@/lib/types";

const SET_FIELDS = [
  { key: "weight", label: "weight (lb)" },
  { key: "reps", label: "reps" },
  { key: "durationMin", label: "duration (min)" },
  { key: "distanceMi", label: "distance (mi)" },
] as const;

function updateSet(set: SetEntry, form: FormData, prefix: string, editedAt: number): SetEntry {
  const next = { ...set, completed: form.has(`${prefix}-completed`) };
  for (const { key } of SET_FIELDS) {
    const value = form.get(`${prefix}-${key}`);
    if (typeof value === "string") next[key] = value === "" ? undefined : Number(value);
  }

  const changed =
    next.completed !== set.completed || SET_FIELDS.some(({ key }) => next[key] !== set[key]);
  return changed
    ? { ...next, provenance: markProvenanceEdited(set.provenance, { editedBy: "user", editedAt }) }
    : set;
}

function editedNotes(input: FormDataEntryValue | null, original?: string) {
  const value = String(input ?? "");
  const displayed = original?.replace(/\r\n?/g, "\n") ?? "";
  return value === displayed ? original : value || undefined;
}

export function WorkoutHistoryEditor({
  workout: initialWorkout,
  customExercises,
  onSave,
  onCancel,
}: {
  workout: Workout;
  customExercises: readonly CustomExercise[];
  onSave: (original: Workout, corrected: Workout) => boolean;
  onCancel: () => void;
}) {
  const [workout] = useState(initialWorkout);
  const [failed, setFailed] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nameInput = event.currentTarget.elements.namedItem("workout-name");
    if (!(nameInput instanceof HTMLInputElement)) return;
    const displayedName = workout.name.replace(/[\r\n]/g, "");
    const name = nameInput.value === displayedName ? workout.name : nameInput.value.trim();
    if (!name) {
      nameInput.setCustomValidity("Enter a workout name.");
      nameInput.reportValidity();
      return;
    }
    const notes = editedNotes(form.get("workout-notes"), workout.notes);
    const editedAt = Date.now();
    const exercises = workout.exercises.map((exercise, exerciseIndex) => {
      const sets = exercise.sets.map((set, setIndex) =>
        updateSet(set, form, `${exerciseIndex}-${setIndex}`, editedAt),
      );
      const notes = editedNotes(form.get(`exercise-${exerciseIndex}-notes`), exercise.notes);
      if (notes === exercise.notes && sets.every((set, index) => set === exercise.sets[index]))
        return exercise;
      return {
        ...exercise,
        notes,
        sets,
        provenance:
          notes === exercise.notes
            ? exercise.provenance
            : markProvenanceEdited(exercise.provenance, { editedBy: "user", editedAt }),
      };
    });
    if (
      name === workout.name &&
      notes === workout.notes &&
      exercises.every((exercise, index) => exercise === workout.exercises[index])
    ) {
      onCancel();
      return;
    }
    setFailed(
      !onSave(workout, {
        ...workout,
        name,
        notes,
        exercises,
        provenance:
          name === workout.name && notes === workout.notes
            ? workout.provenance
            : markProvenanceEdited(workout.provenance, { editedBy: "user", editedAt }),
      }),
    );
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className="block text-sm">
        Workout name
        <Input
          name="workout-name"
          required
          defaultValue={workout.name}
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
      </label>
      <label className="block text-sm">
        Workout notes
        <Textarea
          name="workout-notes"
          aria-label="Workout notes"
          defaultValue={workout.notes}
          rows={3}
        />
      </label>
      {workout.exercises.map((exercise, exerciseIndex) => {
        const info =
          exerciseById(exercise.exerciseId) ??
          customExercises.find((item) => item.id === exercise.exerciseId);
        const timed = tracksWorkoutMinutes(info);
        const distance = info && "tracking" in info && info.tracking === "distance";
        return (
          <Card key={exerciseIndex}>
            <fieldset className="space-y-2">
              <legend className="font-semibold text-sm">{info?.name ?? "Exercise"}</legend>
              <label className="block text-sm">
                Exercise notes
                <Textarea
                  name={`exercise-${exerciseIndex}-notes`}
                  aria-label="Exercise notes"
                  rows={2}
                  defaultValue={exercise.notes}
                />
              </label>
              {exercise.sets.map((set, setIndex) => {
                const prefix = `${exerciseIndex}-${setIndex}`;
                const visible = {
                  weight: (!timed && !distance) || set.weight != null,
                  reps: (!timed && !distance) || set.reps != null,
                  durationMin: timed || set.durationMin != null,
                  distanceMi: distance || set.distanceMi != null,
                };
                return (
                  <fieldset key={prefix} className="border-t border-border pt-2">
                    <legend className="text-xs font-medium">Set {setIndex + 1}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {SET_FIELDS.filter(({ key }) => visible[key]).map(({ key, label }) => (
                        <label key={key} className="text-xs">
                          {label}
                          <Input
                            name={`${prefix}-${key}`}
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Set ${setIndex + 1} ${label}`}
                            defaultValue={set[key]}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input
                        name={`${prefix}-completed`}
                        type="checkbox"
                        defaultChecked={set.completed}
                      />
                      Set completed
                    </label>
                  </fieldset>
                );
              })}
            </fieldset>
          </Card>
        );
      })}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Workout changes could not be saved. Your edits are still here.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onCancel}>Cancel changes</GhostButton>
        <PrimaryButton type="submit">Save changes</PrimaryButton>
      </div>
    </form>
  );
}
