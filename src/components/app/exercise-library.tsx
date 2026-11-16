import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EXERCISES, filterExerciseCatalog } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { CustomExercise } from "@/lib/types";
import { CustomExerciseSheet } from "./active-workout";
import { BottomSheet } from "./sheet";
import { GhostButton, Input } from "./ui";

export function ExerciseLibrarySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [query, setQuery] = useState("");
  const [customOnly, setCustomOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const catalog = useMemo(() =>
    [...state.customExercises, ...EXERCISES].sort((left, right) => left.name.localeCompare(right.name)),
    [state.customExercises],
  );
  const shown = open && !creating
    ? filterExerciseCatalog(customOnly ? catalog.filter((exercise) => "isCustom" in exercise) : catalog, query)
    : [];

  const close = () => {
    setQuery("");
    setCustomOnly(false);
    setSelectedId(null);
    onClose();
  };

  const saveCustom = (exercise: CustomExercise) => {
    if (!set((current) => ({ ...current, customExercises: [...current.customExercises, exercise] }))) {
      return false;
    }
    setQuery(exercise.name);
    setSelectedId(exercise.id);
    setCreating(false);
    return true;
  };

  return (
    <>
      <BottomSheet open={open && !creating} onClose={close} title="Exercise library"
        height="tall" closeLabel="Close exercise library" manageFocus>
        <Input type="search" aria-label="Search exercises" placeholder="Search by name, muscle or equipment"
          value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="my-3 flex flex-wrap gap-2">
          <GhostButton aria-pressed={customOnly} onClick={() => setCustomOnly((current) => !current)}>
            Custom only
          </GhostButton>
          <GhostButton onClick={() => setCreating(true)}><Plus size={16} />New custom exercise</GhostButton>
        </div>
        {shown.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {customOnly && !query.trim() ? "No custom exercises yet." : "No exercises match your search."}
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map((exercise) => {
              const expanded = selectedId === exercise.id;
              return (
                <li key={exercise.id} className="rounded-xl border border-border bg-[var(--surface-2)]">
                  <button type="button" aria-expanded={expanded}
                    className="w-full rounded-xl p-3 text-left"
                    onClick={() => setSelectedId(expanded ? null : exercise.id)}>
                    <span className="block text-sm font-semibold">{exercise.name}</span>
                    <span className="block text-xs capitalize text-muted-foreground">
                      {exercise.primary.join(", ")} · {exercise.equipment}
                      {"isCustom" in exercise ? " · Custom" : ""}
                    </span>
                  </button>
                  {expanded && (
                    <div className="space-y-2 border-t border-border px-3 py-3 text-sm">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="capitalize">{exercise.category}</dd>
                        {Boolean(exercise.secondary?.length) && (
                          <>
                            <dt className="text-muted-foreground">Secondary muscles</dt>
                            <dd>{exercise.secondary?.join(", ")}</dd>
                          </>
                        )}
                      </dl>
                      {"cues" in exercise && Boolean(exercise.cues?.length) && (
                        <ul className="list-disc space-y-1 pl-4">
                          {exercise.cues?.map((cue) => <li key={cue}>{cue}</li>)}
                        </ul>
                      )}
                      {"notes" in exercise && exercise.notes && (
                        <p className="whitespace-pre-wrap">{exercise.notes}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>
      <CustomExerciseSheet open={open && creating} onClose={() => setCreating(false)}
        onSave={saveCustom} submitLabel="Save exercise" />
    </>
  );
}
