import { useState } from "react";
import { Play, Plus, Clock, Flame, Trash2, Trophy, Dumbbell, CalendarDays, BarChart3, ListChecks } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { availableWorkoutTemplates, WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import { weeklyVolumeSeries, muscleMap, MUSCLES } from "@/lib/analytics";
import type { CardioEntry, WorkoutTemplateReference } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Textarea, SectionHeader, SubTabs, PlannedFeatureCard } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { ActiveWorkoutView } from "@/components/app/active-workout";
import { WorkoutTemplateEditor } from "@/components/app/workout-template-editor";
import { BenchProgram } from "@/components/app/bench-program";
import { formatWorkoutTarget } from "@/lib/bench-program";

type TrainingPanel = "templates" | "cardio" | "history" | "performance" | null;


type DeepDiveSubtab = "performance" | "strength" | "library" | "insights";
const DEEP_DIVE_TABS: { id: DeepDiveSubtab; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "strength", label: "Strength" },
  { id: "library", label: "Library" },
  { id: "insights", label: "Insights" },
];

export function TrainingView({
  layoutMode = "daily",
  showActiveWorkout,
  onOpenActive,
  onBackFromWorkout,
}: {
  layoutMode?: LayoutMode;
  showActiveWorkout: boolean;
  onOpenActive: () => void;
  onBackFromWorkout: () => void;
}) {
  const { state } = useStore();
  const [panel, setPanel] = useState<TrainingPanel>(null);
  const [tab, setTab] = useState<DeepDiveSubtab>("performance");

  if (state.activeWorkout && showActiveWorkout) {
    return <ActiveWorkoutView onBack={onBackFromWorkout} />;
  }

  return (
    <div className="pb-24">
      <PageHeader title="Training" subtitle={`${state.profile.split} • ${state.profile.daysPerWeek}d/wk`} />
      {layoutMode === "deepDive" && state.activeWorkout && (
        <div className="px-5 mb-3">
          <PrimaryButton onClick={onOpenActive}><Play size={16} />Resume workout</PrimaryButton>
        </div>
      )}
      {layoutMode === "deepDive" && <>
        <div className="px-5 mb-4"><BenchProgram onStart={onOpenActive} /></div>
        <SubTabs tabs={DEEP_DIVE_TABS} active={tab} onChange={setTab} />
      </>}

      {layoutMode === "daily" ? (
        <DailyTrainingView
          layoutMode={layoutMode}
          onOpenPanel={setPanel}
          onOpenActive={onOpenActive}
        />
      ) : (
        <>
          {tab === "performance" && <PerformanceTab />}
          {tab === "strength" && <StrengthTab />}
          {tab === "library" && <div className="px-5"><TemplatesSection onWorkoutStarted={onOpenActive} /></div>}
          {tab === "insights" && <InsightsTab />}
        </>
      )}

      <BottomSheet open={panel === "templates"} onClose={() => setPanel(null)} title="Programs & templates" height="tall">
        <TemplatesSection onWorkoutStarted={() => { setPanel(null); onOpenActive(); }} />
        <div className="mt-4"><GhostButton onClick={() => setPanel(null)} aria-label="Close programs panel" className="w-full">Close</GhostButton></div>
      </BottomSheet>
      <BottomSheet open={panel === "cardio"} onClose={() => setPanel(null)} title="Cardio & sports" height="tall">
        <CardioSection />
        <div className="mt-4"><GhostButton onClick={() => setPanel(null)} aria-label="Close cardio panel" className="w-full">Close</GhostButton></div>
      </BottomSheet>
      <BottomSheet open={panel === "history"} onClose={() => setPanel(null)} title="Workout history" height="tall">
        <HistorySection />
        <div className="mt-4"><GhostButton onClick={() => setPanel(null)} aria-label="Close history panel" className="w-full">Close</GhostButton></div>
      </BottomSheet>
      <BottomSheet open={panel === "performance"} onClose={() => setPanel(null)} title="Performance" height="tall">
        <PerformanceTab />
        <div className="mt-4"><GhostButton onClick={() => setPanel(null)} aria-label="Close performance panel" className="w-full">Close</GhostButton></div>
      </BottomSheet>
    </div>
  );
}

/* ===================== DAILY VIEW ===================== */

function DailyTrainingView({
  layoutMode,
  onOpenPanel,
  onOpenActive,
}: {
  layoutMode: LayoutMode;
  onOpenPanel: (panel: Exclude<TrainingPanel, null>) => void;
  onOpenActive: () => void;
}) {
  const { state, startWorkout } = useStore();
  const todays = state.workouts.filter(w => isToday(w.startedAt));
  const lastWorkout = state.workouts[state.workouts.length - 1];

  const weekWorkouts = state.workouts.filter(w => w.startedAt > Date.now() - 7*86400000);
  const weekCardio = state.cardioEntries.filter(c => c.createdAt > Date.now() - 7*86400000);
  const weekCardioMin = weekCardio.reduce((a, c) => a + c.minutes, 0);
  const topPR = [...state.prs].sort((a, b) => b.value - a.value)[0];
  const isDeepDive = layoutMode === "deepDive";

  const startBlank = () => {
    if (startWorkout()) onOpenActive();
  };


  return (
    <div className="px-5 space-y-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Daily view</span>
            <h2 className="text-2xl font-bold mt-1">{state.activeWorkout ? "Workout in progress" : todays.length ? "Training logged today" : "Ready to train"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {state.activeWorkout
                ? `${state.activeWorkout.name} started ${new Date(state.activeWorkout.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : todays.length
                  ? `${todays.length} workout${todays.length === 1 ? "" : "s"} logged today`
                  : "Choose a workout below."}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--section)" }}>
            <Dumbbell size={22} className="text-white" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {state.activeWorkout ? (
            <PrimaryButton onClick={onOpenActive} className="flex-1">
              <Play size={16} />Resume workout
            </PrimaryButton>
          ) : null}
        </div>
      </div>

      <BenchProgram onStart={onOpenActive} />
      <section>
        <SectionHeader title="Quick start" />
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={startBlank} className="justify-start">
            <Plus size={16} />Blank workout
          </GhostButton>
          <GhostButton onClick={() => onOpenPanel("templates")} className="justify-start">
            <ListChecks size={16} />Templates
          </GhostButton>
          {state.activeWorkout && (
            <GhostButton onClick={onOpenActive} className="justify-start col-span-2">
              <Play size={16} />Resume active workout
            </GhostButton>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Programs & templates" action={<button onClick={() => onOpenPanel("templates")} className="text-xs font-semibold text-muted-foreground">View all</button>} />
        <Card onClick={() => onOpenPanel("templates")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{WORKOUT_TEMPLATES.length} starter templates</p>
              <p className="text-xs text-muted-foreground mt-0.5">Choose a plan, preview exercises, or start from a template.</p>
            </div>
            <ListChecks size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      {lastWorkout && (
        <>
          <SectionHeader title="Last workout" />
          <Card onClick={() => onOpenPanel("history")}>
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

      {!lastWorkout && (
        <>
          <SectionHeader title="Recent history" />
          <EmptyState icon={<Clock size={22} />} title="No workout history" description="Finished workouts will show up here with volume and exercise detail." />
        </>
      )}

      <section>
        <SectionHeader title="Cardio & sports" action={<button onClick={() => onOpenPanel("cardio")} className="text-xs font-semibold text-muted-foreground">Open</button>} />
        <Card onClick={() => onOpenPanel("cardio")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{weekCardioMin} min this week</p>
              <p className="text-xs text-muted-foreground mt-0.5">{weekCardio.length} cardio session{weekCardio.length === 1 ? "" : "s"} logged.</p>
            </div>
            <Flame size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Performance & progression" action={<button onClick={() => onOpenPanel("performance")} className="text-xs font-semibold text-muted-foreground">Open</button>} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="7d workouts" value={weekWorkouts.length} sub={`${state.profile.daysPerWeek} planned`} accent />
          <StatCard label="PRs" value={state.prs.length} sub={topPR ? exerciseById(topPR.exerciseId)?.name ?? "top lift" : "all time"} />
        </div>
        {isDeepDive && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Cardio min" value={weekCardioMin} sub={`${weekCardio.length} sessions`} />
            <StatCard label="History" value={state.workouts.length} sub="completed workouts" />
          </div>
        )}
        <Card className="mt-3" onClick={() => onOpenPanel("performance")}>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} style={{ color: "var(--section)" }} />
            <div>
              <p className="font-semibold">Open training analytics</p>
              <p className="text-xs text-muted-foreground mt-0.5">Volume trend, muscle balance, and personal records remain available.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function ActiveWorkoutSubtab({ onOpenActive }: { onOpenActive: () => void }) {
  const { state } = useStore();
  return (
    <div className="px-5 space-y-4">
      {state.activeWorkout ? (
        <Card className="ring-section">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Workout</p>
          <h2 className="mt-1 text-2xl font-bold">{state.activeWorkout.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Started {new Date(state.activeWorkout.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {state.activeWorkout.exercises.length} exercises
          </p>
          <PrimaryButton className="mt-4 w-full" onClick={onOpenActive}>
            <Play size={16} />Resume workout
          </PrimaryButton>
        </Card>
      ) : (
        <EmptyState icon={<Play size={22} />} title="No active workout" description="Start from a blank workout or a template, then this subtab becomes your live session home." />
      )}
    </div>
  );
}

function LogWorkoutSubtab({
  onOpenTemplates,
  onOpenActive,
}: {
  onOpenTemplates: () => void;
  onOpenActive: () => void;
}) {
  const { startWorkout } = useStore();
  const startBlank = () => {
    if (startWorkout()) onOpenActive();
  };
  return (
    <div className="px-5 space-y-4">
      <Card className="ring-section">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Log Workout</p>
        <h2 className="mt-1 text-xl font-bold">Start a session or use a template</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Existing workout logging opens the same active workout flow. Display mode changes do not reset logged data.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <PrimaryButton onClick={startBlank}><Plus size={16} />Blank</PrimaryButton>
          <GhostButton onClick={onOpenTemplates}><ListChecks size={16} />Templates</GhostButton>
        </div>
      </Card>
      <PlannedFeatureCard
        title="Advanced workout import"
        status="Planned"
        description="Past workout import and richer set notes will live here once they are connected."
      />
    </div>
  );
}

function ExercisesSubtab() {
  return (
    <div className="px-5 space-y-4">
      <PlannedFeatureCard
        title="Exercise library"
        status="Coming later"
        description="Exercise details, equipment, muscle groups, and substitutions are reserved for this subtab. Current template exercises remain available in Programs."
        actionLabel="Library coming later"
      />
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

function TemplatesSection({ onWorkoutStarted }: { onWorkoutStarted?: () => void }) {
  const { state, startWorkout } = useStore();
  const templates = availableWorkoutTemplates(state.workoutTemplates);
  const [detail, setDetail] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ template: WorkoutTemplateReference | null } | null>(null);
  const editableTemplates = new Map(state.workoutTemplates.filter(template => template.plan)
    .map(template => [template.id, template]));
  const startTemplate = (tid: string) => {
    const t = templates.find(x => x.id === tid); if (!t) return;
    if (startWorkout(t)) onWorkoutStarted?.();
  };
  const active = detail ? templates.find(t => t.id === detail) : null;
  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm text-muted-foreground">{WORKOUT_TEMPLATES.length} starter templates</p>
        <GhostButton onClick={() => setEditor({ template: null })}>
          <Plus size={16} />New template
        </GhostButton>
      </div>
      <div className="space-y-2">
        {templates.map(t => {
          const editable = editableTemplates.get(t.id);
          return (
          <Card key={t.id} onClick={() => setDetail(t.id)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.goal}{t.durationMin > 0 && ` • ${t.durationMin} min`} • {t.exercises.length} exercises
                </p>
              </div>
              <div className="flex gap-1">
                {editable && (
                  <GhostButton aria-label={`Edit ${t.name}`}
                    onClick={event => { event.stopPropagation(); setEditor({ template: editable }); }}>
                    Edit
                  </GhostButton>
                )}
                <button onClick={(e) => { e.stopPropagation(); startTemplate(t.id); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--section)" }}>Start</button>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={active?.name} height="tall">
        {active && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {active.goal}{active.durationMin > 0 && ` • ${active.durationMin} min`}
            </p>
            <div className="space-y-1.5">
              {active.exercises.map((te, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] flex justify-between">
                  <span className="text-sm font-medium">
                    {exerciseById(te.exerciseId)?.name ??
                      state.customExercises.find(exercise => exercise.id === te.exerciseId)?.name ??
                      "Exercise"}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatWorkoutTarget(te)}
                  </span>
                </div>
              ))}
            </div>
            <PrimaryButton className="w-full mt-4" onClick={() => { startTemplate(active.id); setDetail(null); }}><Play size={16} />Start workout</PrimaryButton>
          </>
        )}
      </BottomSheet>
      {editor && <WorkoutTemplateEditor template={editor.template} onClose={() => setEditor(null)} />}
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
            {w.notes && <p className="text-sm whitespace-pre-wrap mb-3">{w.notes}</p>}
            <div className="space-y-2">
              {w.exercises.map(ex => (
                <Card key={ex.id}>
                  <p className="font-semibold text-sm">
                    {exerciseById(ex.exerciseId)?.name ??
                      state.customExercises.find(custom => custom.id === ex.exerciseId)?.name ??
                      "Exercise"}
                  </p>
                  {ex.target && <p className="text-xs text-muted-foreground">Target {formatWorkoutTarget(ex.target)}{ex.target.optional && " · Optional"}</p>}
                  {ex.notes && <p className="text-xs whitespace-pre-wrap mt-1">{ex.notes}</p>}
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {ex.sets.map((st, i) => <div key={st.id}>Set {i+1}: {ex.target?.targetMinutes != null
                      ? st.durationMin == null ? "—" : `${st.durationMin} min`
                      : st.weight == null && st.reps != null ? `${st.reps} reps` : `${st.weight ?? "—"}lb × ${st.reps ?? "—"}`
                    } {st.completed ? "✓" : ""}</div>)}
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


/* ===================== DEEP DIVE TABS ===================== */
function StrengthTab() {
  const { state } = useStore();
  const allPRs = [...state.prs].sort((a,b) => b.value - a.value);
  return (
    <div className="px-5">
      <SectionHeader title="Strength & Personal Records" />
      {allPRs.length === 0 ? (
        <EmptyState icon={<Trophy size={22} />} title="No PRs yet" description="Finish workouts with weight + reps logged." />
      ) : (
        <div className="space-y-2">
          {allPRs.map(p => (
            <Card key={p.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{exerciseById(p.exerciseId)?.name}</p>
                  <p className="text-xs text-muted-foreground">{p.weight}lb × {p.reps}</p>
                </div>
                <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>{p.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightsTab() {
  return (
    <div className="px-5">
      <SectionHeader title="Training Insights" />
      <PlannedFeatureCard
        title="Educational Content"
        status="Planned"
        description="Honest available insights and educational content will appear here based on your training history."
      />
    </div>
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
