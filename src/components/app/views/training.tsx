import { useState } from "react";
import { Play, Plus, Clock, Flame, Trophy, ListChecks, Trash2, Check, Timer, X, Activity } from "lucide-react";
import { useStore, uid, e1RM, isToday } from "@/lib/store";
import { EXERCISES, WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import type { Workout, WorkoutExercise, SetEntry, CardioEntry } from "@/lib/types";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Textarea } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const SET_MODS: SetEntry["modifier"][] = ["normal","warmup","drop","failure","partials","unilateral","paused","tempo"];

export function TrainingView() {
  const { state, set } = useStore();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);

  const todays = state.workouts.filter(w => isToday(w.startedAt));
  const weekVolume = state.workouts
    .filter(w => w.startedAt > Date.now() - 7*86400000)
    .reduce((a, w) => a + w.exercises.reduce((aa, ex) => aa + ex.sets.reduce((s, st) => s + (st.weight ?? 0) * (st.reps ?? 0), 0), 0), 0);

  const startBlank = () => {
    const w: Workout = { id: uid(), name: "Workout", startedAt: Date.now(), exercises: [] };
    set(s => ({ ...s, activeWorkout: w }));
  };
  const startTemplate = (tid: string) => {
    const t = WORKOUT_TEMPLATES.find(x => x.id === tid);
    if (!t) return;
    const w: Workout = {
      id: uid(), name: t.name, startedAt: Date.now(), templateId: t.id,
      exercises: t.exercises.map(te => ({
        id: uid(), exerciseId: te.exerciseId, completed: false,
        sets: Array.from({ length: te.sets }, () => ({ id: uid(), reps: undefined, weight: undefined, modifier: "normal" as const, completed: false })),
      })),
    };
    set(s => ({ ...s, activeWorkout: w }));
    setTemplatesOpen(false);
  };

  if (state.activeWorkout) return <ActiveWorkoutView />;

  const lastWorkout = state.workouts[state.workouts.length - 1];

  return (
    <div className="pb-6">
      <PageHeader title="Training" subtitle={`${state.profile.split} • ${state.profile.daysPerWeek}d/wk`} />

      <div className="px-5">
        <div className="card-elev p-5 section-gradient ring-section">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Today</span>
              <h2 className="text-2xl font-bold mt-1">{todays.length ? "Trained ✓" : "Ready to lift"}</h2>
              <p className="text-sm text-muted-foreground mt-1">{todays.length ? `${todays.length} workout logged` : "Pick a template or go blank"}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--section)" }}>
              <Activity size={22} className="text-white" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={() => setTemplatesOpen(true)} className="flex-1"><Play size={16} />Start Workout</PrimaryButton>
            <GhostButton onClick={startBlank}><Plus size={16} />Blank</GhostButton>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatCard label="Workouts" value={state.workouts.length} />
          <StatCard label="This Wk" value={state.workouts.filter(w => w.startedAt > Date.now() - 7*86400000).length} />
          <StatCard label="Volume" value={`${Math.round(weekVolume/1000)}k`} sub="lb / 7d" />
        </div>

        <h3 className="font-semibold mt-6 mb-2 px-1">Quick actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction icon={<ListChecks size={18} />} label="Templates" onClick={() => setTemplatesOpen(true)} />
          <QuickAction icon={<Clock size={18} />} label="History" onClick={() => setHistoryOpen(true)} />
          <QuickAction icon={<Flame size={18} />} label="Log cardio" onClick={() => setCardioOpen(true)} />
          <QuickAction icon={<Trophy size={18} />} label="PRs" onClick={() => { /* in progress section */ }} />
        </div>

        {lastWorkout && (
          <>
            <h3 className="font-semibold mt-6 mb-2 px-1">Last workout</h3>
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{lastWorkout.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(lastWorkout.startedAt).toLocaleDateString()} • {lastWorkout.exercises.length} exercises</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {lastWorkout.endedAt ? `${Math.round((lastWorkout.endedAt - lastWorkout.startedAt)/60000)}m` : "—"}
                </span>
              </div>
            </Card>
          </>
        )}

        <h3 className="font-semibold mt-6 mb-2 px-1">Goals</h3>
        <div className="space-y-3">
          {state.goals.map(g => (
            <Card key={g.id}>
              <div className="flex justify-between text-sm mb-2"><span className="font-medium">{g.label}</span><span className="text-muted-foreground tabular-nums">{g.current}/{g.target}</span></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full" style={{ width: `${Math.min(100, (g.current/g.target)*100)}%`, background: "var(--section)" }} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Workout templates" height="tall">
        <div className="space-y-2">
          {WORKOUT_TEMPLATES.map(t => (
            <Card key={t.id} onClick={() => startTemplate(t.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.goal} • {t.durationMin} min • {t.exercises.length} exercises</p>
                </div>
                <Play size={18} style={{ color: "var(--section)" }} />
              </div>
            </Card>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Workout history" height="tall">
        {state.workouts.length === 0 ? (
          <EmptyState title="No workouts yet" description="Your completed workouts will show up here." />
        ) : (
          <div className="space-y-2">
            {[...state.workouts].reverse().map(w => (
              <Card key={w.id}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.startedAt).toLocaleString()} • {w.exercises.length} exercises</p>
                  </div>
                  <button onClick={() => set(s => ({ ...s, workouts: s.workouts.filter(x => x.id !== w.id) }))} className="text-muted-foreground"><Trash2 size={16} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </BottomSheet>

      <CardioSheet open={cardioOpen} onClose={() => setCardioOpen(false)} />
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-elev p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--section-soft)", color: "var(--section)" }}>{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function CardioSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [type, setType] = useState("Treadmill Walk");
  const [minutes, setMinutes] = useState("30");
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const submit = () => {
    const c: CardioEntry = {
      id: uid(), type, minutes: Number(minutes) || 0,
      distanceMi: distance ? Number(distance) : undefined,
      calories: calories ? Number(calories) : undefined,
      createdAt: Date.now(),
    };
    set(s => ({ ...s, cardioEntries: [...s.cardioEntries, c] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log cardio">
      <div className="space-y-3">
        <div><Label>Type</Label><Select value={type} onChange={e => setType(e.target.value)}>
          {["Treadmill Walk","Incline Walk","Outdoor Run","Bike","Stairmaster","Rowing Machine","Elliptical","Other"].map(o => <option key={o}>{o}</option>)}
        </Select></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Minutes</Label><Input type="number" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} /></div>
          <div><Label>Distance</Label><Input inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} placeholder="mi" /></div>
          <div><Label>Calories</Label><Input inputMode="numeric" value={calories} onChange={e => setCalories(e.target.value)} /></div>
        </div>
        <PrimaryButton onClick={submit} className="w-full">Save cardio</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function ActiveWorkoutView() {
  const { state, set } = useStore();
  const w = state.activeWorkout!;
  const [exercisePicker, setExercisePicker] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [search, setSearch] = useState("");
  const elapsed = Math.round((Date.now() - w.startedAt) / 60000);

  const updateActive = (fn: (w: Workout) => Workout) =>
    set(s => ({ ...s, activeWorkout: fn(s.activeWorkout!) }));

  const addExercise = (exerciseId: string) => {
    const ex = exerciseById(exerciseId);
    if (!ex) return;
    const we: WorkoutExercise = {
      id: uid(), exerciseId, completed: false,
      sets: Array.from({ length: 3 }, () => ({ id: uid(), modifier: "normal", completed: false })),
    };
    updateActive(w => ({ ...w, exercises: [...w.exercises, we] }));
    setExercisePicker(false);
    setSearch("");
  };

  const finish = () => {
    // Compute PRs
    const newPRs = [...state.prs];
    w.exercises.forEach(we => {
      we.sets.forEach(st => {
        if (st.completed && st.weight && st.reps) {
          const est = e1RM(st.weight, st.reps);
          const prev = state.prs.find(p => p.exerciseId === we.exerciseId && p.type === "1rm");
          if (!prev || est > prev.value) {
            const idx = newPRs.findIndex(p => p.exerciseId === we.exerciseId && p.type === "1rm");
            const entry = { id: uid(), exerciseId: we.exerciseId, type: "1rm" as const, value: est, weight: st.weight, reps: st.reps, date: Date.now() };
            if (idx >= 0) newPRs[idx] = entry; else newPRs.push(entry);
          }
        }
      });
    });
    set(s => ({
      ...s,
      workouts: [...s.workouts, { ...w, endedAt: Date.now() }],
      activeWorkout: null,
      prs: newPRs,
      goals: s.goals.map(g => g.type === "weekly_workouts" ? { ...g, current: Math.min(g.target, g.current + 1) } : g),
    }));
  };

  const filteredExercises = EXERCISES.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.primary.some(p => p.includes(search.toLowerCase()))
  );

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 glass border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">In progress</p>
          <h2 className="text-lg font-bold flex items-center gap-2"><Timer size={16} style={{ color: "var(--section)" }} />{w.name} • {elapsed}m</h2>
        </div>
        <button onClick={() => setConfirmCancel(true)} className="p-2 rounded-lg hover:bg-[var(--surface-2)]"><X size={18} /></button>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {w.exercises.length === 0 && (
          <EmptyState title="No exercises yet" description="Add your first exercise to start logging sets." action={<PrimaryButton onClick={() => setExercisePicker(true)}><Plus size={16} />Add exercise</PrimaryButton>} />
        )}
        {w.exercises.map((we, idx) => {
          const ex = exerciseById(we.exerciseId);
          return (
            <Card key={we.id} className={we.completed ? "opacity-60" : ""}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{ex?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ex?.primary.join(", ")}</p>
                </div>
                <button onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.filter(x => x.id !== we.id) }))} className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-2">
                {we.sets.map((st, i) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-muted-foreground tabular-nums">{i+1}</span>
                    <input type="number" inputMode="decimal" placeholder="lb"
                      value={st.weight ?? ""} onChange={e => updateActive(w => ({
                        ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, weight: e.target.value ? Number(e.target.value) : undefined } : s) } : x)
                      }))}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />
                    <input type="number" inputMode="numeric" placeholder="reps"
                      value={st.reps ?? ""} onChange={e => updateActive(w => ({
                        ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, reps: e.target.value ? Number(e.target.value) : undefined } : s) } : x)
                      }))}
                      className="w-20 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />
                    <button onClick={() => updateActive(w => ({
                      ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) } : x)
                    }))} className={`w-10 h-10 rounded-lg flex items-center justify-center border ${st.completed ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                      style={st.completed ? { background: "var(--section)" } : undefined}>
                      <Check size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SET_MODS.slice(0, 4).map(m => (
                    <button key={m} onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map((s, si) => si === x.sets.length - 1 ? { ...s, modifier: m } : s) } : x) }))}
                      className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground capitalize">{m}</button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <GhostButton className="flex-1 py-2 text-sm" onClick={() => updateActive(w => ({
                    ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: [...x.sets, { id: uid(), modifier: "normal", completed: false }] } : x)
                  }))}><Plus size={14} />Add set</GhostButton>
                  <GhostButton className="flex-1 py-2 text-sm" onClick={() => updateActive(w => ({
                    ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, completed: !x.completed } : x)
                  }))}>{we.completed ? "Reopen" : "Complete"}</GhostButton>
                </div>
              </div>
            </Card>
          );
        })}

        {w.exercises.length > 0 && (
          <GhostButton className="w-full" onClick={() => setExercisePicker(true)}><Plus size={16} />Add exercise</GhostButton>
        )}

        <PrimaryButton className="w-full mt-4" onClick={() => setConfirmFinish(true)}>Finish workout</PrimaryButton>
      </div>

      <BottomSheet open={exercisePicker} onClose={() => setExercisePicker(false)} title="Add exercise" height="tall">
        <Input placeholder="Search exercise or muscle..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="mt-3 space-y-1.5 max-h-[55dvh] overflow-y-auto">
          {filteredExercises.map(e => (
            <button key={e.id} onClick={() => addExercise(e.id)} className="w-full text-left p-3 rounded-xl bg-[var(--surface-2)] hover:ring-1 hover:ring-[var(--section)]">
              <p className="font-medium text-sm">{e.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{e.primary.join(", ")} • {e.equipment}</p>
            </button>
          ))}
        </div>
      </BottomSheet>

      <ConfirmDialog open={confirmFinish} onClose={() => setConfirmFinish(false)} onConfirm={finish}
        title="Finish workout?" message="This will save your workout and update PRs." confirmLabel="Finish" />
      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)}
        onConfirm={() => set(s => ({ ...s, activeWorkout: null }))}
        title="Discard workout?" message="Your current sets will be lost." confirmLabel="Discard" destructive />
    </div>
  );
}
