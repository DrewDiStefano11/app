import { useState } from "react";
import {
  Play,
  Plus,
  Clock,
  Flame,
  Trash2,
  Trophy,
  Dumbbell,
  CalendarDays,
  BarChart3,
  ListChecks,
} from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import { weeklyVolumeSeries, muscleMap, MUSCLES } from "@/lib/analytics";
import type { CardioEntry } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import {
  Card,
  StatCard,
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Chip,
  Input,
  Label,
  Select,
  Textarea,
  SectionHeader,
  SubTabs,
  PlannedFeatureCard,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { ActiveWorkoutView } from "@/components/app/active-workout";

type TrainingPanel = "templates" | "cardio" | "history" | "performance" | null;
type TrainingDeepDiveSubtab = "performance" | "strength" | "library" | "insights";

export function TrainingView({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const { state } = useStore();
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);

  // If there's an active workout, we may show it regardless of layoutMode
  if (state.activeWorkout && showActiveWorkout) return <ActiveWorkoutView />;

  const isDeepDive = layoutMode === "deepDive";

  return (
    <div
      className="pb-24"
      style={{ "--section": "var(--blue-500, #3b82f6)" } as React.CSSProperties}
    >
      <PageHeader
        title="Training"
        subtitle={`${state.profile.split} • ${state.profile.daysPerWeek}d/wk`}
      />
      {isDeepDive ? (
        <TrainingDeepDiveView onOpenActive={() => setShowActiveWorkout(true)} />
      ) : (
        <TrainingDailyView onOpenActive={() => setShowActiveWorkout(true)} />
      )}
    </div>
  );
}

function TrainingDeepDiveView({ onOpenActive }: { onOpenActive: () => void }) {
  const [tab, setTab] = useState<TrainingDeepDiveSubtab>("performance");
  const TRAINING_DEEP_DIVE_TABS: { id: TrainingDeepDiveSubtab; label: string }[] = [
    { id: "performance", label: "Performance" },
    { id: "strength", label: "Strength" },
    { id: "library", label: "Library" },
    { id: "insights", label: "Insights" },
  ];

  return (
    <>
      <SubTabs tabs={TRAINING_DEEP_DIVE_TABS} active={tab} onChange={setTab} />
      {tab === "performance" && <PerformanceTab />}
      {tab === "strength" && <StrengthTab />}
      {tab === "library" && <LibraryTab onWorkoutStarted={onOpenActive} />}
      {tab === "insights" && <InsightsTab />}
    </>
  );
}

/* ===================== DAILY VIEW ===================== */

function TrainingDailyView({ onOpenActive }: { onOpenActive: () => void }) {
  const { state, set } = useStore();
  const [panel, setPanel] = useState<TrainingPanel>(null);
  const todays = state.workouts.filter((w) => isToday(w.startedAt));
  const lastWorkout = state.workouts[state.workouts.length - 1];
  const planExercises = state.workoutTemplates[0]
    ? WORKOUT_TEMPLATES.find((t) => t.id === state.workoutTemplates[0].templateId)
    : WORKOUT_TEMPLATES[0];
  const weekWorkouts = state.workouts.filter((w) => w.startedAt > Date.now() - 7 * 86400000);
  const weekCardio = state.cardioEntries.filter((c) => c.createdAt > Date.now() - 7 * 86400000);
  const weekCardioMin = weekCardio.reduce((a, c) => a + c.minutes, 0);

  const series = weeklyVolumeSeries(state, 7);
  const total7 = series.reduce((a, s) => a + s.volume, 0);

  const startBlank = () => {
    set((s) => ({
      ...s,
      activeWorkout: { id: uid(), name: "Workout", startedAt: Date.now(), exercises: [] },
    }));
    onOpenActive();
  };
  const startPlan = () => {
    if (!planExercises) return;
    const t = planExercises;
    set((s) => ({
      ...s,
      activeWorkout: {
        id: uid(),
        name: t.name,
        startedAt: Date.now(),
        templateId: t.id,
        exercises: t.exercises.map((te) => ({
          id: uid(),
          exerciseId: te.exerciseId,
          completed: false,
          sets: Array.from({ length: te.sets }, () => ({
            id: uid(),
            modifier: "normal" as const,
            completed: false,
          })),
        })),
      },
    }));
    onOpenActive();
  };

  return (
    <div className="px-5 space-y-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Daily view
            </span>
            <h2 className="text-2xl font-bold mt-1">
              {state.activeWorkout
                ? "Workout in progress"
                : todays.length
                  ? "Training logged today"
                  : "Ready to train"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {state.activeWorkout
                ? `${state.activeWorkout.name} started ${new Date(state.activeWorkout.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : todays.length
                  ? `${todays.length} workout${todays.length === 1 ? "" : "s"} logged today`
                  : planExercises
                    ? `Plan: ${planExercises.name}`
                    : "Choose a template or start blank."}
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--section)" }}
          >
            <Dumbbell size={22} className="text-white" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {state.activeWorkout ? (
            <PrimaryButton onClick={onOpenActive} className="flex-1">
              <Play size={16} />
              Resume workout
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={planExercises ? startPlan : startBlank} className="flex-1">
              <Play size={16} />
              {planExercises ? "Start today's plan" : "Start workout"}
            </PrimaryButton>
          )}
          <GhostButton onClick={startBlank}>
            <Plus size={16} />
            Blank
          </GhostButton>
        </div>
      </div>

      <section>
        <SectionHeader title="Quick start" />
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={startBlank} className="justify-start">
            <Plus size={16} />
            Blank workout
          </GhostButton>
          <GhostButton onClick={() => setPanel("templates")} className="justify-start">
            <ListChecks size={16} />
            Templates
          </GhostButton>
          {state.activeWorkout && (
            <GhostButton onClick={onOpenActive} className="justify-start col-span-2">
              <Play size={16} />
              Resume active workout
            </GhostButton>
          )}
        </div>
      </section>

      {planExercises && (
        <>
          <SectionHeader title="Today's assigned workout" />
          <Card>
            <p className="font-semibold">{planExercises.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {planExercises.exercises.length} exercises • ~{planExercises.durationMin} min
            </p>
            <div className="mt-3 space-y-1">
              {planExercises.exercises.slice(0, 4).map((te, i) => (
                <div key={i} className="text-xs text-muted-foreground flex justify-between">
                  <span>{exerciseById(te.exerciseId)?.name}</span>
                  <span className="tabular-nums">
                    {te.sets}×{te.reps}
                  </span>
                </div>
              ))}
              {planExercises.exercises.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{planExercises.exercises.length - 4} more
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {!planExercises && (
        <>
          <SectionHeader title="Today's assigned workout" />
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="No plan assigned"
            description="Pick a starter template or start blank for today's session."
          />
        </>
      )}

      <section>
        <SectionHeader
          title="Programs & templates"
          action={
            <button
              onClick={() => setPanel("templates")}
              className="text-xs font-semibold text-muted-foreground"
            >
              View all
            </button>
          }
        />
        <Card onClick={() => setPanel("templates")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{WORKOUT_TEMPLATES.length} starter templates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose a plan, preview exercises, or start from a template.
              </p>
            </div>
            <ListChecks size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      {lastWorkout && (
        <>
          <SectionHeader title="Last workout" />
          <Card onClick={() => setPanel("history")}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{lastWorkout.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastWorkout.startedAt).toLocaleDateString()} •{" "}
                  {lastWorkout.exercises.length} exercises
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {lastWorkout.endedAt
                  ? `${Math.round((lastWorkout.endedAt - lastWorkout.startedAt) / 60000)}m`
                  : "—"}
              </span>
            </div>
          </Card>
        </>
      )}

      {!lastWorkout && (
        <>
          <SectionHeader title="Recent history" />
          <EmptyState
            icon={<Clock size={22} />}
            title="No workout history"
            description="Finished workouts will show up here with volume and exercise detail."
          />
        </>
      )}

      <section>
        <SectionHeader
          title="Cardio & sports"
          action={
            <button
              onClick={() => setPanel("cardio")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Open
            </button>
          }
        />
        <Card onClick={() => setPanel("cardio")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{weekCardioMin} min this week</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {weekCardio.length} cardio session{weekCardio.length === 1 ? "" : "s"} logged.
              </p>
            </div>
            <Flame size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Weekly Volume Summary" />
        <Card onClick={() => setPanel("performance")}>
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold">{Math.round(total7 / 1000)}k lb</p>
            <span className="text-xs text-muted-foreground">7d volume</span>
          </div>
          {total7 > 0 ? (
            <div className="flex items-end gap-1 h-12">
              {series.map((s, i) => {
                const max = Math.max(1, ...series.map((x) => x.volume));
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${(s.volume / max) * 100}%`,
                      background: "var(--section)",
                      minHeight: s.volume ? 4 : 0,
                      opacity: s.volume ? 0.85 : 0.15,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Complete workouts to see volume.</p>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Training Status" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Consistency"
            value={`${weekWorkouts.length}/${state.profile.daysPerWeek}`}
            sub="workouts"
            accent
          />
          <PlannedFeatureCard
            title="Soreness"
            status="Coming later"
            description="Muscle soreness warning."
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Next Best Action" />
        <PlannedFeatureCard
          title="AI Coach Suggestion"
          status="Coming later"
          description="A short top training suggestion."
        />
      </section>

      <BottomSheet
        open={panel === "templates"}
        onClose={() => setPanel(null)}
        title="Programs & templates"
        height="tall"
      >
        <TemplatesSection onWorkoutStarted={() => setPanel(null)} />
      </BottomSheet>
      <BottomSheet
        open={panel === "cardio"}
        onClose={() => setPanel(null)}
        title="Cardio & sports"
        height="tall"
      >
        <CardioSection />
      </BottomSheet>
      <BottomSheet
        open={panel === "history"}
        onClose={() => setPanel(null)}
        title="Workout history"
        height="tall"
      >
        <HistorySection />
      </BottomSheet>
      <BottomSheet
        open={panel === "performance"}
        onClose={() => setPanel(null)}
        title="Weekly Volume details"
      >
        <div className="space-y-3">
          <p className="text-sm">
            This graph shows your total workout volume (weight × reps) over the last 7 days.
          </p>
          <p className="text-sm text-muted-foreground">
            Use this to track your overall workload and ensure you are progressively overloading
            without overtraining.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

function TemplatesSection({ onWorkoutStarted }: { onWorkoutStarted?: () => void }) {
  const { set } = useStore();
  const [detail, setDetail] = useState<string | null>(null);
  const startTemplate = (tid: string) => {
    const t = WORKOUT_TEMPLATES.find((x) => x.id === tid);
    if (!t) return;
    set((s) => ({
      ...s,
      activeWorkout: {
        id: uid(),
        name: t.name,
        startedAt: Date.now(),
        templateId: t.id,
        exercises: t.exercises.map((te) => ({
          id: uid(),
          exerciseId: te.exerciseId,
          completed: false,
          sets: Array.from({ length: te.sets }, () => ({
            id: uid(),
            modifier: "normal" as const,
            completed: false,
          })),
        })),
      },
    }));
    onWorkoutStarted?.();
  };
  const active = detail ? WORKOUT_TEMPLATES.find((t) => t.id === detail) : null;
  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">
        {WORKOUT_TEMPLATES.length} starter templates
      </p>
      <div className="space-y-2">
        {WORKOUT_TEMPLATES.map((t) => (
          <Card key={t.id} onClick={() => setDetail(t.id)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.goal} • {t.durationMin} min • {t.exercises.length} exercises
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startTemplate(t.id);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: "var(--section)" }}
              >
                Start
              </button>
            </div>
          </Card>
        ))}
      </div>
      <BottomSheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={active?.name}
        height="tall"
      >
        {active && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {active.goal} • {active.durationMin} min
            </p>
            <div className="space-y-1.5">
              {active.exercises.map((te, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--surface-2)] flex justify-between">
                  <span className="text-sm font-medium">
                    {exerciseById(te.exerciseId)?.name ?? te.exerciseId}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {te.sets}×{te.reps}
                  </span>
                </div>
              ))}
            </div>
            <PrimaryButton
              className="w-full mt-4"
              onClick={() => {
                startTemplate(active.id);
                setDetail(null);
              }}
            >
              <Play size={16} />
              Start workout
            </PrimaryButton>
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
  const week = state.cardioEntries.filter((c) => c.createdAt > Date.now() - 7 * 86400000);
  const weekMin = week.reduce((a, c) => a + c.minutes, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          label="This week"
          value={`${weekMin}m`}
          sub={`${week.length} session${week.length === 1 ? "" : "s"}`}
          accent
        />
        <StatCard label="All time" value={state.cardioEntries.length} sub="entries" />
      </div>
      <PrimaryButton className="w-full" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Log cardio
      </PrimaryButton>
      <SectionHeader title="Recent" />
      {state.cardioEntries.length === 0 ? (
        <EmptyState
          icon={<Flame size={22} />}
          title="No cardio yet"
          description="Treadmill, bike, stairs — log it here."
        />
      ) : (
        <div className="space-y-2">
          {[...state.cardioEntries]
            .reverse()
            .slice(0, 12)
            .map((c) => (
              <Card key={c.id}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{c.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()} • {c.minutes}m
                      {c.distanceMi ? ` • ${c.distanceMi}mi` : ""}
                      {c.calories ? ` • ${c.calories} kcal` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDel(c.id)}
                    aria-label="Delete entry"
                    className="text-muted-foreground"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}
      <CardioSheet open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({ ...s, cardioEntries: s.cardioEntries.filter((x) => x.id !== confirmDel) }));
          setConfirmDel(null);
        }}
        title="Delete cardio entry?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}

function HistorySection() {
  const { state, set } = useStore();
  const [filter, setFilter] = useState<"all" | "7d" | "30d">("all");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const now = Date.now();
  const filtered = [...state.workouts]
    .reverse()
    .filter((w) =>
      filter === "all"
        ? true
        : filter === "7d"
          ? w.startedAt > now - 7 * 86400000
          : w.startedAt > now - 30 * 86400000,
    );
  const w = detail ? state.workouts.find((x) => x.id === detail) : null;
  return (
    <>
      <div className="flex gap-2 mb-3">
        {(["all", "7d", "30d"] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="No workouts"
          description="Completed workouts will appear here."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((wk) => {
            const vol = wk.exercises.reduce(
              (a, ex) => a + ex.sets.reduce((s, st) => s + (st.weight ?? 0) * (st.reps ?? 0), 0),
              0,
            );
            return (
              <Card key={wk.id} onClick={() => setDetail(wk.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{wk.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(wk.startedAt).toLocaleString()} • {wk.exercises.length} ex •{" "}
                      {Math.round(vol)}lb vol
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {wk.endedAt ? `${Math.round((wk.endedAt - wk.startedAt) / 60000)}m` : "—"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <BottomSheet open={!!w} onClose={() => setDetail(null)} title={w?.name} height="tall">
        {w && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {new Date(w.startedAt).toLocaleString()}
            </p>
            <div className="space-y-2">
              {w.exercises.map((ex) => (
                <Card key={ex.id}>
                  <p className="font-semibold text-sm">{exerciseById(ex.exerciseId)?.name}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {ex.sets.map((st, i) => (
                      <div key={st.id}>
                        Set {i + 1}: {st.weight ?? "—"}lb × {st.reps ?? "—"}{" "}
                        {st.completed ? "✓" : ""}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            <button
              onClick={() => setConfirmDel(w.id)}
              className="w-full mt-4 px-4 py-3 rounded-xl border border-destructive text-destructive text-sm font-medium"
            >
              Delete workout
            </button>
          </>
        )}
      </BottomSheet>
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== confirmDel) }));
          setConfirmDel(null);
          setDetail(null);
        }}
        title="Delete workout?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}

/* ===================== DEEP DIVE TABS ===================== */

function StrengthTab() {
  const { state } = useStore();
  const allPRs = [...state.prs].sort((a, b) => b.value - a.value);
  const topPR = allPRs[0];
  const recent = Date.now() - 14 * 86400000;
  const [detail, setDetail] = useState<string | null>(null);

  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Personal records" />
      {allPRs.length === 0 ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="No PRs yet"
          description="Finish workouts with weight + reps logged. Est 1RM = weight × (1 + reps/30)."
        />
      ) : (
        <>
          {topPR && (
            <Card className="mb-2 ring-section" onClick={() => setDetail("top-pr")}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Top lift
                  </p>
                  <p className="font-semibold">{exerciseById(topPR.exerciseId)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {topPR.weight}lb × {topPR.reps}
                  </p>
                </div>
                <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--section)" }}>
                  {topPR.value}
                </p>
              </div>
            </Card>
          )}
          <div className="space-y-2">
            {allPRs.slice(0, 5).map((p) => {
              const isNew = p.date > recent;
              return (
                <Card key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{exerciseById(p.exerciseId)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.weight}lb × {p.reps} • {new Date(p.date).toLocaleDateString()}
                        {isNew ? " • NEW" : ""}
                      </p>
                    </div>
                    <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>
                      {p.value}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionHeader title="Strength Analysis" />
      <div className="grid grid-cols-1 gap-3">
        <PlannedFeatureCard
          title="Estimated 1RM trend"
          status="Planned"
          description="Track estimated 1RM changes over time for main lifts."
        />
        <PlannedFeatureCard
          title="Strength balance by movement pattern"
          status="Planned"
          description="Push vs Pull, Upper vs Lower balance analysis."
        />
        <PlannedFeatureCard
          title="Rep range strength profile"
          status="Coming later"
          description="Analyze performance across different rep ranges."
        />
        <PlannedFeatureCard
          title="Weak point detection"
          status="Coming later"
          description="Identify sticking points or relative weak points in lifts."
        />
      </div>

      <BottomSheet open={detail === "top-pr"} onClose={() => setDetail(null)} title="Estimated 1RM">
        <div className="space-y-3">
          <p className="text-sm">
            This value represents your estimated 1 Rep Max based on your best recorded set.
          </p>
          <p className="text-sm text-muted-foreground">Calculation: Weight × (1 + Reps/30).</p>
        </div>
      </BottomSheet>
    </div>
  );
}

function LibraryTab({ onWorkoutStarted }: { onWorkoutStarted: () => void }) {
  const [sub, setSub] = useState<"exercises" | "programs" | "history">("exercises");

  return (
    <div className="px-5 space-y-4">
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        <Chip active={sub === "exercises"} onClick={() => setSub("exercises")}>
          Exercises
        </Chip>
        <Chip active={sub === "programs"} onClick={() => setSub("programs")}>
          Programs
        </Chip>
        <Chip active={sub === "history"} onClick={() => setSub("history")}>
          History
        </Chip>
      </div>

      {sub === "exercises" && (
        <>
          <SectionHeader title="Exercise Library" />
          <PlannedFeatureCard
            title="Exercise database"
            status="Coming later"
            description="Browse all exercises, filter by muscle group, and view volume history and 1RM trends per exercise. Includes substitution suggestions and form guides."
          />
          <PlannedFeatureCard
            title="Custom exercises"
            status="Planned"
            description="Create custom exercises and manage equipment profiles."
          />
        </>
      )}

      {sub === "programs" && (
        <>
          <SectionHeader title="Program Library" />
          <TemplatesSection onWorkoutStarted={onWorkoutStarted} />

          <div className="mt-4">
            <SectionHeader title="Advanced Programming" />
            <div className="grid grid-cols-1 gap-3">
              <PlannedFeatureCard
                title="Program builder"
                status="Planned"
                description="Build multi-week programs with undulating periodization."
              />
              <PlannedFeatureCard
                title="Progression models"
                status="Planned"
                description="Set specific linear, step, or wave progression logic for lifts."
              />
            </div>
          </div>
        </>
      )}

      {sub === "history" && (
        <>
          <SectionHeader title="Exercise History" />
          <HistorySection />
        </>
      )}
    </div>
  );
}

function InsightsTab() {
  const [detail, setDetail] = useState<string | null>(null);

  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Training Suggestions" />
      <div className="grid grid-cols-1 gap-3">
        <PlannedFeatureCard
          title="AI Coach Training Analysis"
          status="Coming later"
          description="Personalized feedback on your training volume, consistency, and progressive overload."
        />
        <PlannedFeatureCard
          title="Progression Recommendation"
          status="Coming later"
          description="Suggested weight or rep increases for upcoming sessions based on recent performance."
        />
        <PlannedFeatureCard
          title="Fatigue Risk & Deloads"
          status="Coming later"
          description="Warnings when high volume and poor recovery suggest a deload week is needed."
        />
      </div>

      <SectionHeader title="Correlations" />
      <div className="grid grid-cols-1 gap-3">
        <PlannedFeatureCard
          title="Training Volume vs Soreness"
          status="Not connected yet"
          description="How your total training volume impacts your reported muscle soreness."
        />
        <PlannedFeatureCard
          title="Sleep vs Performance"
          status="Not connected yet"
          description="Correlation between your sleep quality and your ability to hit PRs or high volumes."
        />
        <PlannedFeatureCard
          title="Nutrition vs Performance"
          status="Not connected yet"
          description="How macro adherence and caloric intake affect your training output."
        />
      </div>

      <SectionHeader title="Education" />
      <div className="grid grid-cols-1 gap-3">
        <Card onClick={() => setDetail("progressive-overload")}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Progressive Overload</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The key to continuous strength gains.
              </p>
            </div>
            <ListChecks size={16} className="text-muted-foreground" />
          </div>
        </Card>
        <Card onClick={() => setDetail("volume-landmarks")}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Volume Landmarks</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Understanding MEV, MAV, and MRV.
              </p>
            </div>
            <ListChecks size={16} className="text-muted-foreground" />
          </div>
        </Card>
      </div>

      <BottomSheet
        open={detail === "progressive-overload"}
        onClose={() => setDetail(null)}
        title="Progressive Overload"
      >
        <div className="space-y-3">
          <p className="text-sm">
            Progressive overload is the gradual increase of stress placed upon the body during
            exercise training.
          </p>
          <p className="text-sm text-muted-foreground">
            This can be achieved by lifting heavier weights, doing more reps, increasing the number
            of sets, or decreasing rest time between sets. Without progressive overload, your
            muscles will adapt to the current stress and stop growing.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={detail === "volume-landmarks"}
        onClose={() => setDetail(null)}
        title="Volume Landmarks"
      >
        <div className="space-y-3">
          <p className="text-sm">
            Volume landmarks help you optimize your training by understanding how much work you need
            to do to progress without overtraining.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              <strong>MEV (Minimum Effective Volume):</strong> The least amount of training required
              to make progress.
            </li>
            <li>
              <strong>MAV (Maximum Adaptive Volume):</strong> The sweet spot where you make the best
              gains.
            </li>
            <li>
              <strong>MRV (Maximum Recoverable Volume):</strong> The maximum volume your body can
              recover from. Going above this leads to overtraining.
            </li>
          </ul>
        </div>
      </BottomSheet>
    </div>
  );
}

function PerformanceTab() {
  const { state } = useStore();
  const series = weeklyVolumeSeries(state, 14);
  const total14 = series.reduce((a, s) => a + s.volume, 0);
  const avg = Math.round(total14 / 14);
  const allPRs = [...state.prs].sort((a, b) => b.value - a.value);
  const topPR = allPRs[0];
  const recent = Date.now() - 14 * 86400000;
  const balance = muscleMap(state, "load");

  const max = Math.max(1, ...series.map((s) => s.volume));

  return (
    <div className="px-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="14d vol" value={`${Math.round(total14 / 1000)}k`} sub="lb" accent />
        <StatCard label="Daily avg" value={`${Math.round(avg / 1000)}k`} sub="lb" />
        <StatCard label="PRs" value={state.prs.length} sub="all time" />
      </div>

      <SectionHeader title="Volume trend (14d)" />
      <Card>
        {total14 === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Complete workouts to see volume trends.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {series.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${(s.volume / max) * 100}%`,
                  background: "var(--section)",
                  minHeight: s.volume ? 4 : 0,
                  opacity: s.volume ? 0.85 : 0.15,
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Muscle balance (7d)" />
      <Card>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {MUSCLES.map((m) => (
            <div key={m}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-muted-foreground">{m}</span>
                <span className="tabular-nums">{Math.round((balance[m] ?? 0) * 100)}%</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full"
                  style={{ width: `${(balance[m] ?? 0) * 100}%`, background: "var(--section)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <SectionHeader title="Personal records" />
      {allPRs.length === 0 ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="No PRs yet"
          description="Finish workouts with weight + reps logged. Est 1RM = weight × (1 + reps/30)."
        />
      ) : (
        <>
          {topPR && (
            <Card className="mb-2 ring-section">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Top lift
                  </p>
                  <p className="font-semibold">{exerciseById(topPR.exerciseId)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {topPR.weight}lb × {topPR.reps}
                  </p>
                </div>
                <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--section)" }}>
                  {topPR.value}
                </p>
              </div>
            </Card>
          )}
          <div className="space-y-2">
            {allPRs.slice(0, 12).map((p) => {
              const isNew = p.date > recent;
              return (
                <Card key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{exerciseById(p.exerciseId)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.weight}lb × {p.reps} • {new Date(p.date).toLocaleDateString()}
                        {isNew ? " • NEW" : ""}
                      </p>
                    </div>
                    <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>
                      {p.value}
                    </p>
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
      id: uid(),
      type,
      minutes: Number(minutes) || 0,
      distanceMi: distance ? Number(distance) : undefined,
      calories: calories ? Number(calories) : undefined,
      heartRate: hr ? Number(hr) : undefined,
      incline: incline ? Number(incline) : undefined,
      notes: notes || undefined,
      createdAt: Date.now(),
    };
    set((s) => ({ ...s, cardioEntries: [...s.cardioEntries, c] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log cardio" height="tall">
      <div className="space-y-3">
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "Treadmill Walk",
              "Incline Walk",
              "Outdoor Run",
              "Bike",
              "Stairmaster",
              "Rowing Machine",
              "Elliptical",
              "Custom",
            ].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Min</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div>
            <Label>Dist (mi)</Label>
            <Input
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div>
            <Label>Cal</Label>
            <Input
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Avg HR</Label>
            <Input inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} />
          </div>
          <div>
            <Label>Incline %</Label>
            <Input
              inputMode="decimal"
              value={incline}
              onChange={(e) => setIncline(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <PrimaryButton onClick={submit} className="w-full">
          Save cardio
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
