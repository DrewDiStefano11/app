import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Plus, Check, X, Trash2, Timer as TimerIcon, ChevronUp, ChevronDown,
  GripVertical, Calculator, Pencil, Sparkles,
} from "lucide-react";
import { useStore, uid, e1RM } from "@/lib/store";
import { DEFAULT_REST_SECONDS, restTimerAfterSet } from "@/lib/active-workout-state";
import { applyWorkoutPersonalRecords, workoutPersonalRecords } from "@/lib/workout-personal-records";
import { EXERCISES, MAX_WORKOUT_TEMPLATE_SETS, exerciseById, tracksWorkoutMinutes, type Exercise, type MuscleGroup } from "@/lib/data";
import { BENCH_PROGRAM_ID, formatWorkoutTarget } from "@/lib/bench-program";
import type {
  AppState, Workout, WorkoutExercise, SetEntry, CustomExercise, Goal,
} from "@/lib/types";
import {
  Card, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Textarea,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const MODS: NonNullable<SetEntry["modifier"]>[] = [
  "warmup", "drop", "failure", "partials", "unilateral", "paused",
];
const MOD_COLORS: Record<string, string> = {
  warmup: "#f59e0b",
  drop: "#ec4899",
  failure: "#ef4444",
  partials: "#8b5cf6",
  unilateral: "#06b6d4",
  paused: "#3b82f6",
  tempo: "#10b981",
};

const ALL_MUSCLES: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "quads", "hamstrings", "glutes", "calves", "core", "cardio",
];

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Deterministic demo previous-set numbers seeded by exercise id. */
function makeDemoPrevSets(exerciseId: string, count: number): SetEntry[] {
  let h = 0;
  for (let i = 0; i < exerciseId.length; i++) h = (h * 31 + exerciseId.charCodeAt(i)) | 0;
  const base = 45 + (Math.abs(h) % 18) * 10; // 45–225 lb-ish
  const reps = 8 + (Math.abs(h >> 3) % 5); // 8–12 reps
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: `demo-prev-${exerciseId}-${i}`,
    modifier: "normal",
    completed: true,
    weight: base + i * 5,
    reps: Math.max(4, reps - i),
  }));
}

/* ===================== Main view ===================== */

export function ActiveWorkoutView({ onBack }: { onBack: () => void }) {
  const { state, set, persistenceRequiresReload } = useStore();
  const w = state.activeWorkout!;
  const now = useNow(1000);
  const restRemaining = Math.max(0, Math.ceil(((w.restEndsAt ?? 0) - Math.max(now, Date.now())) / 1000));

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [exercisePicker, setExercisePicker] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState<string | null>(null);
  const [plateFor, setPlateFor] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    apply: (state: AppState, workout: Workout) => AppState;
    onDiscard?: () => void;
  } | null>(null);

  // Compose lookup so custom exercises behave like real ones inside the workout.
  const lookup = useMemo(() => {
    const map = new Map<string, Exercise | CustomExercise>();
    for (const e of EXERCISES) map.set(e.id, e);
    for (const c of state.customExercises) map.set(c.id, c as unknown as Exercise);
    return map;
  }, [state.customExercises]);
  const findEx = (id: string) => lookup.get(id);

  // Auto-derive which card is "active": first non-completed exercise.
  const activeId = useMemo(
    () => w.exercises.find(e => !e.completed)?.id ?? null,
    [w.exercises],
  );

  const isOpen = (we: WorkoutExercise) => {
    const manual = openMap[we.id];
    if (manual !== undefined) return manual;
    return we.id === activeId; // default: only active expands
  };
  const toggleOpen = (id: string) =>
    setOpenMap(m => ({ ...m, [id]: !(m[id] ?? id === activeId) }));

  const commitEdit = (edit: NonNullable<typeof pendingEdit>) => {
    const saved = set(s => s.activeWorkout?.id === w.id ? edit.apply(s, s.activeWorkout) : s);
    setPendingEdit(saved ? null : edit);
    return saved;
  };

  const updateActive = (fn: (w: Workout) => Workout, onDiscard?: () => void) =>
    !pendingEdit && commitEdit({
      apply: (s, activeWorkout) => ({ ...s, activeWorkout: fn(activeWorkout) }),
      onDiscard,
    });

  const backToTraining = () => {
    const notesChanged = draftNotes !== null && draftNotes !== (w.notes ?? "");
    if (!notesChanged || updateActive(
      workout => ({ ...workout, notes: draftNotes || undefined }),
      () => setDraftNotes(null),
    )) {
      onBack();
    }
  };

  const updateExercise = (
    id: string, edit: (exercise: WorkoutExercise) => WorkoutExercise, editedSetId?: string,
  ) => updateActive(workout => {
    const current = workout.exercises.find(exercise => exercise.id === id);
    if (!current) return workout;
    const next = edit(current);
    const editedSet = editedSetId ? next.sets.find(set => set.id === editedSetId) : undefined;
    const previousSet = editedSetId ? current.sets.find(set => set.id === editedSetId) : undefined;
    return {
      ...workout,
      ...restTimerAfterSet(workout, current, previousSet, editedSet, Date.now()),
      exercises: workout.exercises.map(exercise => exercise.id === id ? next : exercise),
    };
  });

  const moveExercise = (id: string, dir: -1 | 1) =>
    updateActive(w => {
      const arr = [...w.exercises];
      const i = arr.findIndex(x => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return w;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...w, exercises: arr };
    });

  const addExercise = (exerciseId: string) => {
    const ex = findEx(exerciseId);
    if (!ex) return;
    const we: WorkoutExercise = {
      id: uid(), exerciseId, completed: false, exerciseTags: [],
      sets: Array.from({ length: ("defaultSets" in ex ? ex.defaultSets : 3) || 3 }, () => ({
        id: uid(), modifier: "normal", completed: false,
      })),
    };
    updateActive(w => ({ ...w, exercises: [...w.exercises, we] }));
    setExercisePicker(false);
  };

  const addCustom = (c: CustomExercise) => {
    if (pendingEdit) return;
    const we: WorkoutExercise = {
      id: uid(), exerciseId: c.id, completed: false, exerciseTags: [],
      sets: Array.from({ length: 3 }, () => ({ id: uid(), modifier: "normal", completed: false })),
    };
    commitEdit({
      apply: (s, workout) => ({
        ...s,
        customExercises: [...s.customExercises, c],
        activeWorkout: { ...workout, exercises: [...workout.exercises, we] },
      }),
    });
    setCustomOpen(false);
    // open the newly added card by default
    setOpenMap(m => ({ ...m, [we.id]: true }));
  };

  const toggleExerciseComplete = (id: string) => {
    if (updateExercise(id, e => ({ ...e, completed: !e.completed }))) {
      // The next active card expands when this one is completed.
      setOpenMap(m => ({ ...m, [id]: false }));
    }
  };

  return (
    <div className="pb-32">
      {/* Header with real timer */}
      <div className="sticky top-0 z-10 glass border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <button type="button" onClick={backToTraining} aria-label="Back to Training"
            disabled={!!pendingEdit} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-2)] disabled:opacity-40">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">In progress</p>
            <h2 className="text-base font-bold truncate">{w.name}</h2>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
            <TimerIcon size={14} style={{ color: "var(--section)" }} />
            <span className="font-mono tabular-nums text-sm font-bold">{fmtTime(now - w.startedAt)}</span>
          </div>
          <button type="button" aria-label="Open Jarvis"
            onClick={() => {
              const expanded = w.exercises.filter(isOpen);
              window.dispatchEvent(new CustomEvent("fitcore:open-jarvis", {
                detail: expanded.length === 1 ? { workoutId: w.id, exerciseEntryId: expanded[0].id } : undefined,
              }));
            }}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-muted-foreground">
            <Sparkles size={18} />
          </button>
          <button onClick={() => setConfirmCancel(true)} aria-label="Discard workout"
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="flex min-h-10 items-center justify-between gap-2 px-5 pb-2 text-sm">
          {restRemaining > 0 ? (
            <>
              <span className="flex items-center gap-2 text-muted-foreground">
                Rest <span role="timer" aria-label="Rest timer" className="font-mono tabular-nums text-foreground">
                  {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}
                </span>
              </span>
              <GhostButton className="py-1 text-xs" disabled={!!pendingEdit}
                onClick={() => updateActive(workout => {
                  const next = { ...workout };
                  delete next.restEndsAt;
                  return next;
                })}>Stop rest timer</GhostButton>
            </>
          ) : (
            <>
              {w.restEndsAt != null && <span role="status" className="text-muted-foreground">Rest complete</span>}
              <GhostButton className="ml-auto py-1 text-xs" disabled={!!pendingEdit}
                onClick={() => updateActive(workout => ({ ...workout, restEndsAt: Date.now() + DEFAULT_REST_SECONDS * 1000 }))}>
                <TimerIcon size={14} />Start rest timer
              </GhostButton>
            </>
          )}
        </div>
        {pendingEdit && (
          <div role="alert" className="px-5 pb-3 text-sm">
            <h3 className="font-semibold text-destructive">Workout edit could not be saved</h3>
            {persistenceRequiresReload && <p>Reload FitCore to resume with the latest saved values.</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <PrimaryButton onClick={() => commitEdit(pendingEdit)} disabled={persistenceRequiresReload}>
                Retry edit
              </PrimaryButton>
              <GhostButton onClick={() => {
                pendingEdit.onDiscard?.();
                setPendingEdit(null);
              }}>Keep saved values</GhostButton>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 mt-3 space-y-2.5">
        {w.exercises.length === 0 && (
          <EmptyState title="No exercises yet" description="Add your first exercise to start logging sets."
            action={
              <div className="flex gap-2">
                <PrimaryButton onClick={() => setExercisePicker(true)}><Plus size={16} />Add</PrimaryButton>
                <GhostButton onClick={() => setCustomOpen(true)}>Custom</GhostButton>
              </div>
            } />
        )}

        {w.exercises.map((we, idx) => (
          <ExerciseCard
            key={we.id}
            we={we}
            exercise={findEx(we.exerciseId)}
            isActive={we.id === activeId}
            isOpen={isOpen(we)}
            canMoveUp={idx > 0}
            canMoveDown={idx < w.exercises.length - 1}
            previousWorkout={state.workouts.slice().reverse().find(pw => pw.exercises.some(pe => pe.exerciseId === we.exerciseId))}
            demoMode={state.demoMode}
            programExercise={w.templateId?.startsWith(`${BENCH_PROGRAM_ID}-`) ?? false}
            onToggle={() => toggleOpen(we.id)}
            onMove={dir => moveExercise(we.id, dir)}
            onDelete={() => updateActive(w => ({ ...w, exercises: w.exercises.filter(x => x.id !== we.id) }))}
            onComplete={() => toggleExerciseComplete(we.id)}
            onChange={(edit, setId) => updateExercise(we.id, edit, setId)}
            onOpenPlate={() => setPlateFor(we.id)}
          />
        ))}

        {w.exercises.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <GhostButton onClick={() => setExercisePicker(true)}><Plus size={16} />Exercise</GhostButton>
            <GhostButton onClick={() => setCustomOpen(true)}><Sparkles size={14} />Custom</GhostButton>
          </div>
        )}
      </div>

      {/* Sticky finish bar */}
      <div className="fixed left-0 right-0 bottom-0 z-20 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3"
        style={{ background: "linear-gradient(to top, var(--bg) 70%, transparent)" }}>
        <div className="max-w-[480px] mx-auto flex gap-2">
          <GhostButton className="flex-1" onClick={() => setConfirmCancel(true)}>Discard</GhostButton>
          <PrimaryButton className="flex-[2]" onClick={() => setFinishOpen(true)} disabled={!!pendingEdit}>
            <Check size={16} />Finish workout
          </PrimaryButton>
        </div>
      </div>

      <ExercisePicker open={exercisePicker} onClose={() => setExercisePicker(false)}
        customExercises={state.customExercises} onPick={addExercise} />

      <CustomExerciseSheet open={customOpen} onClose={() => setCustomOpen(false)} onSave={addCustom} />

      <PlateCalculatorSheet
        open={!!plateFor}
        onClose={() => setPlateFor(null)}
      />

      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)}
        onConfirm={() => set(s => ({ ...s, activeWorkout: null }))}
        title="Discard workout?" message="All sets and notes from this session will be lost. This can't be undone."
        confirmLabel="Discard" destructive />

      <FinishWorkoutSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        notes={draftNotes ?? w.notes ?? ""}
        onNotesChange={setDraftNotes}
        elapsedMs={now - w.startedAt}
        findEx={findEx}
      />
    </div>
  );
}

/* ===================== Exercise Card ===================== */

function ExerciseCard({
  we, exercise, isActive, isOpen, canMoveUp, canMoveDown,
  previousWorkout, demoMode, programExercise, onToggle, onMove, onDelete, onComplete, onChange, onOpenPlate,
}: {
  we: WorkoutExercise;
  exercise: Exercise | CustomExercise | undefined;
  isActive: boolean;
  isOpen: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  previousWorkout: Workout | undefined;
  demoMode: boolean;
  programExercise: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onComplete: () => void;
  onChange: (fn: (e: WorkoutExercise) => WorkoutExercise, editedSetId?: string) => void;
  onOpenPlate: () => void;
}) {
  const tags = we.exerciseTags ?? [];
  const hasStrengthResults = we.sets.some(set => set.weight != null || set.reps != null);
  const duration = !hasStrengthResults && (we.target?.targetMinutes != null ||
    tracksWorkoutMinutes(exercise) || we.sets.some(set => set.durationMin != null));
  const bodyweight = programExercise && !duration && exercise?.equipment === "bodyweight" &&
    we.sets.every(set => set.weight == null);
  const isDone = (s: SetEntry) => duration ? Boolean(s.durationMin && s.durationMin > 0)
    : s.reps != null && (bodyweight || s.weight != null);
  const workingSets = we.sets.filter(s => isDone(s) && s.modifier !== "warmup");
  const warmupSets = we.sets.filter(s => isDone(s) && s.modifier === "warmup");
  const volume = workingSets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const reps = workingSets.reduce((a, s) => a + (s.reps ?? 0), 0);
  const topSet = workingSets.reduce<SetEntry | null>(
    (best, s) => (s.weight && (!best || (s.weight ?? 0) > (best.weight ?? 0)) ? s : best), null,
  );

  const prevEx = previousWorkout?.exercises.find(pe => pe.exerciseId === we.exerciseId);
  const realPrevSets = prevEx?.sets.filter(s => s.weight != null && s.reps != null && s.modifier !== "warmup") ?? [];
  const prevSets = realPrevSets.length > 0
    ? realPrevSets
    : demoMode ? makeDemoPrevSets(we.exerciseId, we.sets.length) : [];
  const prevTop = prevSets.reduce<SetEntry | null>(
    (best, s) => (s.weight && (!best || (s.weight ?? 0) > (best.weight ?? 0)) ? s : best), null,
  );
  const prevVol = prevSets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);

  const isBarbell = exercise?.equipment === "barbell";
  const [armedTag, setArmedTag] = useState<NonNullable<SetEntry["modifier"]> | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const setExerciseTag = (m: NonNullable<SetEntry["modifier"]>) =>
    onChange(e => {
      const has = (e.exerciseTags ?? []).includes(m);
      const next = has
        ? (e.exerciseTags ?? []).filter(t => t !== m)
        : [...(e.exerciseTags ?? []), m];
      return { ...e, exerciseTags: next };
    });

  const applyTagToSet = (setId: string) => {
    if (!armedTag) return;
    onChange(e => ({
      ...e,
      sets: e.sets.map(s => s.id === setId
        ? { ...s, modifier: s.modifier === armedTag ? "normal" : armedTag }
        : s),
    }));
  };

  return (
    <div
      className="card-elev overflow-hidden transition-all"
      style={isActive ? { boxShadow: "0 0 0 2px var(--section), 0 10px 30px -10px color-mix(in oklab, var(--section) 50%, transparent)" } : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col -my-1">
          <button onClick={() => onMove(-1)} disabled={!canMoveUp}
            className="p-0.5 text-muted-foreground disabled:opacity-30" aria-label="Move up">
            <ChevronUp size={14} />
          </button>
          <GripVertical size={12} className="text-muted-foreground/40 mx-auto" />
          <button onClick={() => onMove(1)} disabled={!canMoveDown}
            className="p-0.5 text-muted-foreground disabled:opacity-30" aria-label="Move down">
            <ChevronDown size={14} />
          </button>
        </div>
        <button onClick={onToggle} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{exercise?.name ?? "Exercise"}</p>
            {isActive && (
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded text-white"
                style={{ background: "var(--section)" }}>Active</span>
            )}
            {we.completed && (
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Done</span>
            )}
          </div>
          {we.target && <p className="text-xs text-muted-foreground">Target {formatWorkoutTarget(we.target)}{we.target.optional && " · Optional"}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-muted-foreground capitalize truncate">
              {exercise?.primary.join(", ")}
              {we.completed && (duration
                ? ` · ${workingSets.reduce((sum, set) => sum + (set.durationMin ?? 0), 0)} min logged`
                : ` · ${workingSets.length} sets · ${Math.round(volume)}lb · ${reps} reps`)}
              {we.completed && topSet && ` · top ${topSet.weight}×${topSet.reps}`}
            </p>
            {tags.length > 0 && tags.map(t => (
              <span key={t} className="text-[9px] uppercase font-bold px-1 rounded"
                style={{ background: `${MOD_COLORS[t]}22`, color: MOD_COLORS[t] }}>{t}</span>
            ))}
          </div>
        </button>
        <button onClick={onToggle} className="p-1 text-muted-foreground" aria-label="Toggle">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 border-t border-border/60 pt-3 space-y-3">
          {we.target?.notes && <p className="text-xs text-muted-foreground">{we.target.notes}</p>}
          {/* Previous performance summary — subtle */}
          {prevSets.length > 0 && (
            <div className="text-[11px] text-muted-foreground/70 px-1">
              <span className="uppercase tracking-wider mr-1">Last{realPrevSets.length === 0 ? " (sample)" : ""}:</span>
              {prevTop && <span>best {prevTop.weight}×{prevTop.reps}</span>}
              {prevVol > 0 && <span> · vol {Math.round(prevVol)}lb</span>}
            </div>
          )}

          {/* Tags — arm one, then tap a set # to apply, or tap All */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1 flex items-center justify-between">
              <span>{armedTag ? `Tap a set # to mark as ${armedTag}` : "Tags"}</span>
              {armedTag && (
                <button onClick={() => { setExerciseTag(armedTag); setArmedTag(null); }}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md"
                  style={{ background: MOD_COLORS[armedTag], color: "white" }}>
                  Apply to all
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
              {MODS.map(m => {
                const armed = armedTag === m;
                const onExercise = tags.includes(m);
                return (
                  <button key={m} onClick={() => setArmedTag(armed ? null : m)}
                    className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border transition-all"
                    style={armed
                      ? { background: MOD_COLORS[m], borderColor: MOD_COLORS[m], color: "white", boxShadow: `0 0 0 2px ${MOD_COLORS[m]}55` }
                      : onExercise
                        ? { background: `${MOD_COLORS[m]}22`, borderColor: MOD_COLORS[m], color: MOD_COLORS[m] }
                        : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sets */}
          <div className="space-y-1.5">
            <div className="flex items-center text-[10px] uppercase tracking-wider text-muted-foreground px-1">
              <span className="w-7">#</span>
              {duration ? <span className="flex-1">Actual minutes</span> : <>
                {!bodyweight && <span className="flex-1">Weight</span>}
                <span className="w-20">{we.target?.reps.includes("per side") ? "Reps / side" : "Reps"}</span>
              </>}
            </div>
            {we.sets.map((st, i) => (
              <SetRow key={st.id} index={i} st={st}
                prev={prevSets[i]}
                done={isDone(st)}
                duration={duration}
                bodyweight={bodyweight}
                armedTag={armedTag}
                onArmedApply={() => applyTagToSet(st.id)}
                onChange={(patch) => onChange(e => ({
                  ...e,
                  sets: e.sets.map(s => {
                    if (s.id !== st.id) return s;
                    const next = { ...s, ...patch };
                    next.completed = isDone(next);
                    return next;
                  }),
                }), st.id)}
                onDelete={() => onChange(e => ({ ...e, sets: e.sets.filter(s => s.id !== st.id) }))}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <GhostButton className="flex-1 py-2 text-xs"
              onClick={() => onChange(e => ({ ...e, sets: [...e.sets, { id: uid(), modifier: "normal", completed: false }] }))}>
              <Plus size={14} />Add set
            </GhostButton>
            {isBarbell && (
              <GhostButton className="py-2 text-xs" onClick={onOpenPlate} aria-label="Plate calculator">
                <Calculator size={14} />
              </GhostButton>
            )}
            <button onClick={onDelete} aria-label="Remove exercise"
              className="px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-destructive">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Notes — collapsed by default */}
          {notesOpen ? (
            <Textarea rows={3} autoFocus placeholder="Exercise notes…" value={we.notes ?? ""}
              onChange={event => {
                const notes = event.currentTarget.value;
                onChange(x => ({ ...x, notes }));
              }}
              onBlur={() => { if (!we.notes) setNotesOpen(false); }}
              className="text-sm" />
          ) : (
            <button onClick={() => setNotesOpen(true)}
              className="w-full text-left text-xs text-muted-foreground px-3 py-2 rounded-lg border border-dashed border-border hover:border-[var(--section)] hover:text-foreground transition-colors truncate">
              {we.notes ? we.notes : "+ Add note"}
            </button>
          )}

          {/* Complete toggle */}
          <button onClick={onComplete}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: we.completed ? "var(--surface-2)" : "var(--section)", color: we.completed ? "var(--muted-foreground)" : undefined }}>
            {we.completed ? "Reopen exercise" : "Mark exercise complete"}
          </button>

          {warmupSets.length > 0 && !we.completed && (
            <p className="text-[10px] text-muted-foreground/70 text-center">
              {warmupSets.length} warmup set{warmupSets.length === 1 ? "" : "s"} won't count toward working volume.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== Set row ===================== */

function SetRow({ index, st, prev, done, duration, bodyweight, armedTag, onArmedApply, onChange, onDelete }: {
  done: boolean;
  duration: boolean;
  bodyweight: boolean;
  index: number; st: SetEntry;
  prev?: SetEntry;
  armedTag: NonNullable<SetEntry["modifier"]> | null;
  onArmedApply: () => void;
  onChange: (patch: Partial<SetEntry>) => void;
  onDelete: () => void;
}) {
  const [tagOpen, setTagOpen] = useState(false);
  const m = st.modifier && st.modifier !== "normal" ? st.modifier : null;
  const color = m ? MOD_COLORS[m] : undefined;
  const isWarmup = m === "warmup";
  const doneColor = done ? (isWarmup ? "#f59e0b" : "var(--section)") : undefined;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { if (armedTag) onArmedApply(); else setTagOpen(o => !o); }}
          className="w-7 h-9 rounded-md text-[11px] font-bold tabular-nums flex items-center justify-center transition-all"
          style={m
            ? { background: color, color: "white" }
            : done
              ? { background: doneColor, color: "white" }
              : armedTag
                ? { background: "transparent", color: MOD_COLORS[armedTag], border: `1.5px dashed ${MOD_COLORS[armedTag]}` }
                : { background: "var(--surface-2)", color: "var(--muted-foreground)" }}
          aria-label="Set tag">
          {index + 1}
        </button>
        {duration ? <input type="number" inputMode="decimal" min={0} step="any"
          aria-label={`Actual minutes for set ${index + 1}`}
          value={st.durationMin ?? ""} onChange={e => onChange({ durationMin: e.target.value ? Number(e.target.value) : undefined })}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border text-sm" /> : <>
        {!bodyweight && <input type="number" inputMode="decimal" placeholder={prev?.weight != null ? String(prev.weight) : "lb"}
          value={st.weight ?? ""} onChange={e => onChange({ weight: e.target.value ? Number(e.target.value) : undefined })}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />}
        <input type="number" inputMode="numeric" placeholder={prev?.reps != null ? String(prev.reps) : "reps"}
          value={st.reps ?? ""} onChange={e => onChange({ reps: e.target.value ? Number(e.target.value) : undefined })}
          className="w-20 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />
        </>}
      </div>
      {!duration && st.durationMin != null && <p className="ml-9 text-xs text-muted-foreground">{st.durationMin} min logged</p>}
      {tagOpen && (
        <div className="flex flex-wrap gap-1 mt-1.5 pl-9">
          <button onClick={() => { onChange({ modifier: "normal" }); setTagOpen(false); }}
            className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-border text-muted-foreground">
            Normal
          </button>
          {MODS.map(mod => (
            <button key={mod} onClick={() => { onChange({ modifier: mod }); setTagOpen(false); }}
              className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border"
              style={{ background: `${MOD_COLORS[mod]}22`, borderColor: MOD_COLORS[mod], color: MOD_COLORS[mod] }}>
              {mod}
            </button>
          ))}
          <button onClick={() => { onDelete(); setTagOpen(false); }}
            className="ml-auto text-[10px] uppercase font-bold px-2 py-1 rounded-md border border-destructive text-destructive">
            <Trash2 size={12} className="inline -mt-0.5" /> Remove set
          </button>
        </div>
      )}
    </div>
  );
}

/* ===================== Exercise picker (built-in + custom) ===================== */

export function ExercisePicker({ open, onClose, customExercises, onPick }: {
  open: boolean; onClose: () => void;
  customExercises: CustomExercise[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const all = useMemo(
    () => [...customExercises.map(c => ({ ...c, isCustom: true as const })), ...EXERCISES.map(e => ({ ...e, isCustom: false as const }))],
    [customExercises],
  );
  const filtered = all.filter(e =>
    !q || e.name.toLowerCase().includes(q.toLowerCase())
    || e.primary.some(p => String(p).toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <BottomSheet open={open} onClose={onClose} title="Add exercise" height="tall">
      <Input placeholder="Search exercise or muscle…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      <div className="mt-3 space-y-1.5 max-h-[60dvh] overflow-y-auto">
        {filtered.map(e => (
          <button key={e.id} onClick={() => onPick(e.id)}
            className="w-full text-left p-3 rounded-xl bg-[var(--surface-2)] hover:ring-1 hover:ring-[var(--section)]">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{e.name}</p>
              {e.isCustom && <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">Custom</span>}
            </div>
            <p className="text-xs text-muted-foreground capitalize">{e.primary.join(", ")} · {e.equipment}</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No matches.</p>
        )}
      </div>
    </BottomSheet>
  );
}

/* ===================== Custom exercise sheet ===================== */

function CustomExerciseSheet({ open, onClose, onSave }: {
  open: boolean; onClose: () => void; onSave: (c: CustomExercise) => void;
}) {
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState<MuscleGroup>("chest");
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState("dumbbell");
  const [category, setCategory] = useState<CustomExercise["category"]>("compound");
  const [tracking, setTracking] = useState<NonNullable<CustomExercise["tracking"]>>("weight_reps");
  const [notes, setNotes] = useState("");

  const reset = () => { setName(""); setPrimary("chest"); setSecondary([]); setEquipment("dumbbell"); setCategory("compound"); setTracking("weight_reps"); setNotes(""); };

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: "custom-" + uid(),
      name: name.trim(),
      primary: [primary],
      secondary,
      equipment,
      category,
      tracking,
      notes: notes || undefined,
      isCustom: true,
      createdAt: Date.now(),
    });
    reset();
  };

  return (
    <BottomSheet open={open} onClose={() => { onClose(); reset(); }} title="New custom exercise" height="tall">
      <div className="space-y-3">
        <div><Label>Name</Label><Input placeholder="e.g. Landmine Press" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Primary muscle</Label>
            <Select value={primary} onChange={e => setPrimary(e.target.value as MuscleGroup)}>
              {ALL_MUSCLES.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div><Label>Equipment</Label>
            <Select value={equipment} onChange={e => setEquipment(e.target.value)}>
              {["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band", "other"].map(o => <option key={o}>{o}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Secondary muscles</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ALL_MUSCLES.filter(m => m !== primary).map(m => {
              const on = secondary.includes(m);
              return (
                <Chip key={m} active={on} onClick={() => setSecondary(s => on ? s.filter(x => x !== m) : [...s, m])}>{m}</Chip>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Type</Label>
            <Select value={category} onChange={e => setCategory(e.target.value as CustomExercise["category"])}>
              <option value="compound">strength / compound</option>
              <option value="isolation">isolation</option>
              <option value="cardio">cardio</option>
            </Select>
          </div>
          <div><Label>Tracking</Label>
            <Select value={tracking} onChange={e => setTracking(e.target.value as typeof tracking)}>
              <option value="weight_reps">weight × reps</option>
              <option value="bodyweight">bodyweight reps</option>
              <option value="time">time</option>
              <option value="distance">distance</option>
            </Select>
          </div>
        </div>
        <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <PrimaryButton onClick={save} disabled={!name.trim()} className="w-full">Add to workout</PrimaryButton>
        <p className="text-[11px] text-muted-foreground text-center">
          Saved to your exercise library — reuse it in future workouts.
        </p>
      </div>
    </BottomSheet>
  );
}

/* ===================== Plate calculator ===================== */

const PLATES = [45, 35, 25, 15, 10, 5, 2.5];

function platesPerSide(target: number, bar: number) {
  let remain = (target - bar) / 2;
  if (remain <= 0) return [] as number[];
  const out: number[] = [];
  for (const p of PLATES) {
    while (remain >= p - 0.001) { out.push(p); remain -= p; }
  }
  return out;
}

function PlateCalculatorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [target, setTarget] = useState("135");
  const [bar, setBar] = useState("45");
  const t = Number(target) || 0;
  const b = Number(bar) || 0;
  const plates = platesPerSide(t, b);
  const total = b + plates.reduce((a, p) => a + p, 0) * 2;

  return (
    <BottomSheet open={open} onClose={onClose} title="Plate calculator">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Target (lb)</Label><Input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></div>
          <div><Label>Bar (lb)</Label><Input inputMode="decimal" value={bar} onChange={e => setBar(e.target.value)} /></div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: "var(--surface-2)" }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Per side</p>
          {plates.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Target ≤ bar — no plates needed.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {plates.map((p, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md text-sm font-bold tabular-nums"
                  style={{ background: "var(--section-soft)", color: "var(--section)" }}>{p}</span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">Total loaded: <span className="tabular-nums font-semibold text-foreground">{total} lb</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[95, 135, 185, 225, 275, 315].map(v => (
            <Chip key={v} active={t === v} onClick={() => setTarget(String(v))}>{v}</Chip>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

/* ===================== Finish workout sheet ===================== */

type SaveMode = "workout_only" | "update_template" | "save_as_new";

function FinishWorkoutSheet({ open, onClose, notes, onNotesChange, elapsedMs, findEx }: {
  open: boolean; onClose: () => void; elapsedMs: number;
  notes: string; onNotesChange: (notes: string) => void;
  findEx: (id: string) => Exercise | CustomExercise | undefined;
}) {
  const { state, set, persistenceRequiresReload } = useStore();
  const w = state.activeWorkout!;
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveMode>("workout_only");
  const [newTemplateName, setNewTemplateName] = useState(w?.name ?? "Workout");
  const savedTemplate = state.workoutTemplates.find(
    (template) => template.id === w?.templateId && template.plan && !template.id.startsWith(`${BENCH_PROGRAM_ID}-`),
  );
  const setCount = w?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0;
  const canSaveTemplate = setCount > 0 && setCount <= MAX_WORKOUT_TEMPLATE_SETS;

  // Stats
  const workingSets = w?.exercises.flatMap(e => e.sets.filter(s => s.completed && s.modifier !== "warmup")) ?? [];
  const totalSets = workingSets.length;
  const totalVolume = Math.round(workingSets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0));
  const totalReps = workingSets.reduce((a, s) => a + (s.reps ?? 0), 0);
  const requiredExercises = w?.exercises.filter(e => !e.target?.optional) ?? [];
  const completedEx = requiredExercises.filter(e => e.completed).length;
  const muscles = new Set<string>();
  w?.exercises.forEach(e => findEx(e.exerciseId)?.primary.forEach(m => muscles.add(m)));

  // PR detection
  const newPRs = useMemo(() => w ? workoutPersonalRecords(w, state.prs) : [], [w, state.prs]);

  // Note → metric suggestions
  const suggestions = useMemo(() => extractNoteSuggestions(notes), [notes]);

  const confirmSave = () => {
    // Update PRs
    const prs = applyWorkoutPersonalRecords(state.prs, newPRs, uid, Date.now());

    // Goals — bump weekly_workouts goals
    const goals: Goal[] = state.goals.map(g => g.type === "weekly_workouts" ? { ...g, current: Math.min(g.target, g.current + 1) } : g);

    // Apply note-driven fatigue updates if the user didn't dismiss them
    const muscleFatigue = { ...state.muscleFatigue };
    for (const s of suggestions) {
      if (s.muscle) muscleFatigue[s.muscle] = s.level;
    }

    const saved = set(s => {
      if (s.activeWorkout?.id !== w.id || s.workouts.some(workout => workout.id === w.id)) {
        return s;
      }
      let workoutTemplates = s.workoutTemplates;
      if (canSaveTemplate && saveMode !== "workout_only") {
        const plan = {
          durationMin: savedTemplate?.plan?.durationMin ?? Math.max(1, Math.round(elapsedMs / 60_000)),
          exercises: s.activeWorkout.exercises
            .filter(exercise => exercise.sets.length > 0)
            .map(exercise => ({ reps: "", ...exercise.target, exerciseId: exercise.exerciseId, sets: exercise.sets.length })),
        };
        if (saveMode === "save_as_new" && newTemplateName.trim()) {
          const id = uid();
          workoutTemplates = [...workoutTemplates, { id, templateId: id, name: newTemplateName.trim(), plan }];
        } else if (saveMode === "update_template" && savedTemplate) {
          workoutTemplates = workoutTemplates.map(template =>
            template.id === savedTemplate.id ? { ...template, plan } : template,
          );
        }
      }
      const completed = { ...s.activeWorkout, endedAt: Date.now(), notes: notes || undefined };
      delete completed.restEndsAt;
      delete completed.restLoggedSetKeys;
      return {
        ...s,
        workouts: [...s.workouts, completed],
        workoutTemplates,
        activeWorkout: null,
        prs,
        goals,
        muscleFatigue,
      };
    });
    if (saved) onClose();
    else setSaveFailed(true);
  };

  if (!w) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Finish workout" height="tall">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Time" value={fmtTime(elapsedMs)} mono />
          <Stat label="Exercises" value={`${completedEx}/${requiredExercises.length}`} />
          <Stat label="Sets" value={String(totalSets)} />
          <Stat label="Volume" value={`${totalVolume.toLocaleString()} lb`} accent />
          <Stat label="Reps" value={String(totalReps)} />
          <Stat label="Muscles" value={String(muscles.size)} />
        </div>

        {newPRs.length > 0 && (
          <Card className="ring-section">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">New PRs</p>
            <div className="mt-1 space-y-1">
              {newPRs.map(pr => (
                <p key={pr.exerciseId} className="text-sm">
                  <span className="font-semibold">{findEx(pr.exerciseId)?.name}</span>
                  <span className="text-muted-foreground"> · est {pr.est} ({pr.weight}×{pr.reps})</span>
                </p>
              ))}
            </div>
          </Card>
        )}

        {/* Notes */}
        <div>
          <Label>Workout notes (optional)</Label>
          <Textarea rows={3} placeholder="How did it feel? Pain, energy, sleep…"
            value={notes} onChange={e => onNotesChange(e.target.value)} />
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {suggestions.map((s, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">
                  <Sparkles size={10} className="inline -mt-0.5 mr-1" style={{ color: "var(--section)" }} />
                  {s.summary}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Template save options */}
        <div>
          <Label>Save options</Label>
          <div className="mt-1 space-y-1.5">
            <SaveOption value="workout_only" current={saveMode} onPick={setSaveMode}
              title="Save workout only" desc="Add to history, update stats and PRs." />
            {canSaveTemplate && savedTemplate && (
              <SaveOption value="update_template" current={saveMode} onPick={setSaveMode}
                title="Save & update template" desc="Apply changes to the original template." />
            )}
            {canSaveTemplate && (
              <SaveOption value="save_as_new" current={saveMode} onPick={setSaveMode}
                title="Save as new template" desc="Reuse this workout layout later." />
            )}
          </div>
          {canSaveTemplate && saveMode === "save_as_new" && (
            <Input className="mt-2" placeholder="Template name" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
          )}
        </div>

        {(saveFailed || persistenceRequiresReload) && (
          <p role="alert" className="text-sm text-destructive">
            Workout could not be saved. Your workout and notes are still here.{" "}
            {persistenceRequiresReload
              ? "Copy your notes before reloading, then reopen the workout."
              : "Try saving again."}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <GhostButton className="flex-1" onClick={onClose}>
            <Pencil size={14} />Back to edit
          </GhostButton>
          <PrimaryButton className="flex-[2]" onClick={confirmSave}
            disabled={persistenceRequiresReload || (canSaveTemplate && saveMode === "save_as_new" && !newTemplateName.trim())}>
            <Check size={16} />Confirm & save
          </PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}

function Stat({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="p-2.5 rounded-xl" style={{ background: accent ? "var(--section-soft)" : "var(--surface-2)" }}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${mono ? "font-mono" : ""}`}
        style={accent ? { color: "var(--section)" } : undefined}>{value}</p>
    </div>
  );
}

function SaveOption({ value, current, onPick, title, desc }: {
  value: SaveMode; current: SaveMode; onPick: (v: SaveMode) => void; title: string; desc: string;
}) {
  const active = current === value;
  return (
    <button onClick={() => onPick(value)}
      className="w-full text-left p-3 rounded-xl border transition-colors"
      style={active
        ? { borderColor: "var(--section)", background: "var(--section-soft)" }
        : { borderColor: "var(--border)", background: "var(--surface-2)" }}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

/* ===================== Note → suggestion parser ===================== */

const MUSCLE_KEYWORDS: { match: RegExp; muscle: string }[] = [
  { match: /\bshoulder/i, muscle: "shoulders" },
  { match: /\b(chest|pec)/i, muscle: "chest" },
  { match: /\bback\b/i, muscle: "back" },
  { match: /\b(bicep|arm)/i, muscle: "biceps" },
  { match: /\b(tricep)/i, muscle: "triceps" },
  { match: /\b(quad|knee)/i, muscle: "quads" },
  { match: /\b(hamstring)/i, muscle: "hamstrings" },
  { match: /\b(glute)/i, muscle: "glutes" },
  { match: /\b(calf|calves)/i, muscle: "calves" },
  { match: /\b(core|abs|abdominal)/i, muscle: "core" },
  { match: /\blegs?\b/i, muscle: "quads" },
];

function extractNoteSuggestions(text: string): { muscle?: string; level: "fresh" | "moderate" | "fatigued" | "very"; summary: string }[] {
  if (!text) return [];
  const out: { muscle?: string; level: "fresh" | "moderate" | "fatigued" | "very"; summary: string }[] = [];
  const lower = text.toLowerCase();
  const heavySignals = /(pain|hurt|injur|tight|very sore|extremely sore)/i.test(text);
  const moderateSignals = /(sore|tired|fatigue|low energy|bad sleep|poor sleep|exhausted)/i.test(text);
  if (!heavySignals && !moderateSignals) return [];
  for (const { match, muscle } of MUSCLE_KEYWORDS) {
    if (match.test(text)) {
      const level = heavySignals ? "very" : "fatigued";
      out.push({ muscle, level, summary: `Will flag ${muscle} as ${level} from your note.` });
    }
  }
  if (out.length === 0) {
    out.push({
      level: moderateSignals ? "fatigued" : "very",
      summary: lower.includes("sleep")
        ? "AI will factor poor sleep into recovery context."
        : "AI will factor low recovery into upcoming sessions.",
    });
  }
  return out;
}
