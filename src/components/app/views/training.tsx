import { useState } from "react";
import { Play, Plus, Clock, Flame, ListChecks, Trash2, Check, Timer, X, Activity, Trophy, BarChart3 } from "lucide-react";
import { useStore, uid, e1RM, isToday } from "@/lib/store";
import { EXERCISES, WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import { weeklyVolumeSeries, muscleMap, MUSCLES } from "@/lib/analytics";
import type { Workout, WorkoutExercise, SetEntry, CardioEntry } from "@/lib/types";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Textarea, SubTabs, SectionHeader } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const SET_MODS: SetEntry["modifier"][] = ["normal","warmup","drop","failure","partials","unilateral","paused","tempo"];
type Tab = "today" | "workouts" | "performance";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "workouts", label: "Workouts" },
  { id: "performance", label: "Performance" },
];

export function TrainingView() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>("today");

  if (state.activeWorkout) return <ActiveWorkoutView />;

  return (
    <div className="pb-24">
      <PageHeader title="Training" subtitle={`${state.profile.split} • ${state.profile.daysPerWeek}d/wk`} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "today" && <TodayTab onJump={setTab} />}
      {tab === "workouts" && <WorkoutsTab />}
      {tab === "performance" && <PerformanceTab />}
    </div>
  );
}

/* ===================== TODAY ===================== */

function TodayTab({ onJump }: { onJump: (t: Tab) => void }) {
  const { state, set } = useStore();
  const todays = state.workouts.filter(w => isToday(w.startedAt));
  const lastWorkout = state.workouts[state.workouts.length - 1];
  const planExercises = state.workoutTemplates[0]
    ? WORKOUT_TEMPLATES.find(t => t.id === state.workoutTemplates[0].templateId)
    : WORKOUT_TEMPLATES[0];

  const startBlank = () => set(s => ({ ...s, activeWorkout: { id: uid(), name: "Workout", startedAt: Date.now(), exercises: [] } }));
  const startPlan = () => {
    if (!planExercises) return;
    const t = planExercises;
    set(s => ({ ...s, activeWorkout: {
      id: uid(), name: t.name, startedAt: Date.now(), templateId: t.id,
      exercises: t.exercises.map(te => ({ id: uid(), exerciseId: te.exerciseId, completed: false,
        sets: Array.from({ length: te.sets }, () => ({ id: uid(), modifier: "normal" as const, completed: false })) })),
    }}));
  };

  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Today</span>
            <h2 className="text-2xl font-bold mt-1">{todays.length ? "Trained ✓" : "Ready to lift"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {todays.length ? `${todays.length} workout logged` : planExercises ? `Plan: ${planExercises.name}` : "Pick a template"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--section)" }}>
            <Activity size={22} className="text-white" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <PrimaryButton onClick={planExercises ? startPlan : () => onJump("workouts")} className="flex-1">
            <Play size={16} />{planExercises ? "Start today's plan" : "Start workout"}
          </PrimaryButton>
          <GhostButton onClick={startBlank}><Plus size={16} />Blank</GhostButton>
        </div>
      </div>

      {planExercises && !todays.length && (
        <>
          <SectionHeader title="Today's assigned workout" />
          <Card>
            <p className="font-semibold">{planExercises.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{planExercises.exercises.length} exercises • ~{planExercises.durationMin} min</p>
            <div className="mt-3 space-y-1">
              {planExercises.exercises.slice(0, 4).map((te, i) => (
                <div key={i} className="text-xs text-muted-foreground flex justify-between">
                  <span>{exerciseById(te.exerciseId)?.name}</span>
                  <span className="tabular-nums">{te.sets}×{te.reps}</span>
                </div>
              ))}
              {planExercises.exercises.length > 4 && (
                <p className="text-xs text-muted-foreground">+{planExercises.exercises.length - 4} more</p>
              )}
            </div>
          </Card>
        </>
      )}

      {lastWorkout && (
        <>
          <SectionHeader title="Last workout" />
          <Card onClick={() => onJump("workouts")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{lastWorkout.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(lastWorkout.startedAt).toLocaleDateString()} • {lastWorkout.exercises.length} exercises</p>
              </div>
              <span className="text-sm text-muted-foreground">{lastWorkout.endedAt ? `${Math.round((lastWorkout.endedAt - lastWorkout.startedAt)/60000)}m` : "—"}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ===================== WORKOUTS ===================== */

function WorkoutsTab() {
  const [sub, setSub] = useState<"templates" | "cardio" | "history">("templates");
  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        <Chip active={sub === "templates"} onClick={() => setSub("templates")}>Templates</Chip>
        <Chip active={sub === "cardio"} onClick={() => setSub("cardio")}>Cardio</Chip>
        <Chip active={sub === "history"} onClick={() => setSub("history")}>History</Chip>
      </div>
      {sub === "templates" && <TemplatesSection />}
      {sub === "cardio" && <CardioSection />}
      {sub === "history" && <HistorySection />}
    </div>
  );
}

function TemplatesSection() {
  const { set } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  const startTemplate = (tid: string) => {
    const t = WORKOUT_TEMPLATES.find(x => x.id === tid); if (!t) return;
    set(s => ({ ...s, activeWorkout: {
      id: uid(), name: t.name, startedAt: Date.now(), templateId: t.id,
      exercises: t.exercises.map(te => ({ id: uid(), exerciseId: te.exerciseId, completed: false,
        sets: Array.from({ length: te.sets }, () => ({ id: uid(), modifier: "normal" as const, completed: false })) })),
    }}));
  };
  const active = detail ? WORKOUT_TEMPLATES.find(t => t.id === detail) : null;
  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">{WORKOUT_TEMPLATES.length} starter templates</p>
      <div className="space-y-2">
        {WORKOUT_TEMPLATES.map(t => (
          <Card key={t.id} onClick={() => setDetail(t.id)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.goal} • {t.durationMin} min • {t.exercises.length} exercises</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); startTemplate(t.id); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--section)" }}>Start</button>
            </div>
          </Card>
        ))}
      </div>
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={active?.name} height="tall">
        {active && (
          <>
            <p className="text-sm text-muted-foreground mb-3">{active.goal} • {active.durationMin} min</p>
            <div className="space-y-1.5">
              {active.exercises.map((te, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] flex justify-between">
                  <span className="text-sm font-medium">{exerciseById(te.exerciseId)?.name ?? te.exerciseId}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{te.sets}×{te.reps}</span>
                </div>
              ))}
            </div>
            <PrimaryButton className="w-full mt-4" onClick={() => { startTemplate(active.id); setDetail(null); }}><Play size={16} />Start workout</PrimaryButton>
          </>
        )}
      </BottomSheet>
    </>
  );
}

function CardioSection() {
  const { state, set } = useStore();
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const week = state.cardioEntries.filter(c => c.createdAt > Date.now() - 7*86400000);
  const weekMin = week.reduce((a, c) => a + c.minutes, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="This week" value={`${weekMin}m`} sub={`${week.length} session${week.length === 1 ? "" : "s"}`} accent />
        <StatCard label="All time" value={state.cardioEntries.length} sub="entries" />
      </div>
      <PrimaryButton className="w-full" onClick={() => setOpen(true)}><Plus size={16} />Log cardio</PrimaryButton>
      <SectionHeader title="Recent" />
      {state.cardioEntries.length === 0 ? (
        <EmptyState icon={<Flame size={22} />} title="No cardio yet" description="Treadmill, bike, stairs — log it here." />
      ) : (
        <div className="space-y-2">
          {[...state.cardioEntries].reverse().slice(0, 12).map(c => (
            <Card key={c.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{c.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()} • {c.minutes}m{c.distanceMi ? ` • ${c.distanceMi}mi` : ""}{c.calories ? ` • ${c.calories} kcal` : ""}</p>
                </div>
                <button onClick={() => setConfirmDel(c.id)} aria-label="Delete entry" className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <CardioSheet open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { set(s => ({ ...s, cardioEntries: s.cardioEntries.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }} title="Delete cardio entry?" message="This can't be undone." confirmLabel="Delete" destructive />
    </>
  );
}

function HistorySection() {
  const { state, set } = useStore();
  const [filter, setFilter] = useState<"all" | "7d" | "30d">("all");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const now = Date.now();
  const filtered = [...state.workouts].reverse().filter(w =>
    filter === "all" ? true : filter === "7d" ? w.startedAt > now - 7*86400000 : w.startedAt > now - 30*86400000
  );
  const w = detail ? state.workouts.find(x => x.id === detail) : null;
  return (
    <>
      <div className="flex gap-2 mb-3">
        {(["all","7d","30d"] as const).map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<Clock size={22} />} title="No workouts" description="Completed workouts will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map(wk => {
            const vol = wk.exercises.reduce((a, ex) => a + ex.sets.reduce((s, st) => s + (st.weight ?? 0) * (st.reps ?? 0), 0), 0);
            return (
              <Card key={wk.id} onClick={() => setDetail(wk.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{wk.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(wk.startedAt).toLocaleString()} • {wk.exercises.length} ex • {Math.round(vol)}lb vol</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{wk.endedAt ? `${Math.round((wk.endedAt - wk.startedAt)/60000)}m` : "—"}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <BottomSheet open={!!w} onClose={() => setDetail(null)} title={w?.name} height="tall">
        {w && (
          <>
            <p className="text-xs text-muted-foreground mb-3">{new Date(w.startedAt).toLocaleString()}</p>
            <div className="space-y-2">
              {w.exercises.map(ex => (
                <Card key={ex.id}>
                  <p className="font-semibold text-sm">{exerciseById(ex.exerciseId)?.name}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {ex.sets.map((st, i) => <div key={st.id}>Set {i+1}: {st.weight ?? "—"}lb × {st.reps ?? "—"} {st.completed ? "✓" : ""}</div>)}
                  </div>
                </Card>
              ))}
            </div>
            <button onClick={() => setConfirmDel(w.id)} className="w-full mt-4 px-4 py-3 rounded-xl border border-destructive text-destructive text-sm font-medium">Delete workout</button>
          </>
        )}
      </BottomSheet>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { set(s => ({ ...s, workouts: s.workouts.filter(x => x.id !== confirmDel) })); setConfirmDel(null); setDetail(null); }}
        title="Delete workout?" message="This can't be undone." confirmLabel="Delete" destructive />
    </>
  );
}

/* ===================== PERFORMANCE ===================== */

function PerformanceTab() {
  const { state } = useStore();
  const series = weeklyVolumeSeries(state, 14);
  const total14 = series.reduce((a, s) => a + s.volume, 0);
  const avg = Math.round(total14 / 14);
  const allPRs = [...state.prs].sort((a,b) => b.value - a.value);
  const topPR = allPRs[0];
  const recent = Date.now() - 14*86400000;
  const balance = muscleMap(state, "load");

  const max = Math.max(1, ...series.map(s => s.volume));

  return (
    <div className="px-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="14d vol" value={`${Math.round(total14/1000)}k`} sub="lb" accent />
        <StatCard label="Daily avg" value={`${Math.round(avg/1000)}k`} sub="lb" />
        <StatCard label="PRs" value={state.prs.length} sub="all time" />
      </div>

      <SectionHeader title="Volume trend (14d)" />
      <Card>
        {total14 === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Complete workouts to see volume trends.</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {series.map((s, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${(s.volume / max) * 100}%`, background: "var(--section)", minHeight: s.volume ? 4 : 0, opacity: s.volume ? 0.85 : 0.15 }} />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Muscle balance (7d)" />
      <Card>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {MUSCLES.map(m => (
            <div key={m}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-muted-foreground">{m}</span>
                <span className="tabular-nums">{Math.round((balance[m] ?? 0) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full" style={{ width: `${(balance[m] ?? 0) * 100}%`, background: "var(--section)" }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionHeader title="Personal records" />
      {allPRs.length === 0 ? (
        <EmptyState icon={<Trophy size={22} />} title="No PRs yet" description="Finish workouts with weight + reps logged. Est 1RM = weight × (1 + reps/30)." />
      ) : (
        <>
          {topPR && (
            <Card className="mb-2 ring-section">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top lift</p>
                  <p className="font-semibold">{exerciseById(topPR.exerciseId)?.name}</p>
                  <p className="text-xs text-muted-foreground">{topPR.weight}lb × {topPR.reps}</p>
                </div>
                <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--section)" }}>{topPR.value}</p>
              </div>
            </Card>
          )}
          <div className="space-y-2">
            {allPRs.slice(0, 12).map(p => {
              const isNew = p.date > recent;
              return (
                <Card key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{exerciseById(p.exerciseId)?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.weight}lb × {p.reps} • {new Date(p.date).toLocaleDateString()}{isNew ? " • NEW" : ""}</p>
                    </div>
                    <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>{p.value}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ===================== ACTIVE / SHEETS ===================== */

function CardioSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [type, setType] = useState("Treadmill Walk");
  const [minutes, setMinutes] = useState("30");
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const [hr, setHr] = useState("");
  const [incline, setIncline] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => {
    const c: CardioEntry = {
      id: uid(), type, minutes: Number(minutes) || 0,
      distanceMi: distance ? Number(distance) : undefined,
      calories: calories ? Number(calories) : undefined,
      heartRate: hr ? Number(hr) : undefined,
      incline: incline ? Number(incline) : undefined,
      notes: notes || undefined,
      createdAt: Date.now(),
    };
    set(s => ({ ...s, cardioEntries: [...s.cardioEntries, c] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log cardio" height="tall">
      <div className="space-y-3">
        <div><Label>Type</Label><Select value={type} onChange={e => setType(e.target.value)}>
          {["Treadmill Walk","Incline Walk","Outdoor Run","Bike","Stairmaster","Rowing Machine","Elliptical","Custom"].map(o => <option key={o}>{o}</option>)}
        </Select></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Min</Label><Input type="number" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} /></div>
          <div><Label>Dist (mi)</Label><Input inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} /></div>
          <div><Label>Cal</Label><Input inputMode="numeric" value={calories} onChange={e => setCalories(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Avg HR</Label><Input inputMode="numeric" value={hr} onChange={e => setHr(e.target.value)} /></div>
          <div><Label>Incline %</Label><Input inputMode="decimal" value={incline} onChange={e => setIncline(e.target.value)} /></div>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
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
    const ex = exerciseById(exerciseId); if (!ex) return;
    const we: WorkoutExercise = { id: uid(), exerciseId, completed: false,
      sets: Array.from({ length: 3 }, () => ({ id: uid(), modifier: "normal", completed: false })) };
    updateActive(w => ({ ...w, exercises: [...w.exercises, we] }));
    setExercisePicker(false); setSearch("");
  };

  const finish = () => {
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
    set(s => ({ ...s,
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
    <div className="pb-24">
      <div className="sticky top-0 z-10 glass border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">In progress</p>
          <h2 className="text-lg font-bold flex items-center gap-2"><Timer size={16} style={{ color: "var(--section)" }} />{w.name} • {elapsed}m</h2>
        </div>
        <button onClick={() => setConfirmCancel(true)} aria-label="Cancel workout" className="p-2 rounded-lg hover:bg-[var(--surface-2)]"><X size={18} /></button>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {w.exercises.length === 0 && (
          <EmptyState title="No exercises yet" description="Add your first exercise to start logging sets." action={<PrimaryButton onClick={() => setExercisePicker(true)}><Plus size={16} />Add exercise</PrimaryButton>} />
        )}
        {w.exercises.map(we => {
          const ex = exerciseById(we.exerciseId);
          return (
            <Card key={we.id} className={we.completed ? "opacity-60" : ""}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{ex?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ex?.primary.join(", ")}</p>
                </div>
                <button onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.filter(x => x.id !== we.id) }))} aria-label="Delete entry" className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-2">
                {we.sets.map((st, i) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-muted-foreground tabular-nums">{i+1}</span>
                    <input type="number" inputMode="decimal" placeholder="lb"
                      value={st.weight ?? ""} onChange={e => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, weight: e.target.value ? Number(e.target.value) : undefined } : s) } : x) }))}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />
                    <input type="number" inputMode="numeric" placeholder="reps"
                      value={st.reps ?? ""} onChange={e => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, reps: e.target.value ? Number(e.target.value) : undefined } : s) } : x) }))}
                      className="w-20 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-border outline-none focus:border-[var(--section)] text-sm tabular-nums" />
                    <button onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: x.sets.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s) } : x) }))}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border ${st.completed ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
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
                  <GhostButton className="flex-1 py-2 text-sm" onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, sets: [...x.sets, { id: uid(), modifier: "normal", completed: false }] } : x) }))}><Plus size={14} />Add set</GhostButton>
                  <GhostButton className="flex-1 py-2 text-sm" onClick={() => updateActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? { ...x, completed: !x.completed } : x) }))}>{we.completed ? "Reopen" : "Complete"}</GhostButton>
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