import { useState } from "react";
import { Play, Plus, Clock, Search, BookOpen, Dumbbell } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import {
  Card,
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  SectionHeader,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { ActiveWorkoutView } from "@/components/app/active-workout";
import type { CardioEntry } from "@/lib/types";

export function TrainingView() {
  const { state, set } = useStore();
  const [resumeActive, setResumeActive] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPrograms, setShowPrograms] = useState(false);

  if (state.activeWorkout && resumeActive) {
    return <ActiveWorkoutView onMinimize={() => setResumeActive(false)} />;
  }

  const active = state.activeWorkout;
  const todays = state.workouts.filter((w) => isToday(w.startedAt));
  const planExercises = state.workoutTemplates[0]
    ? WORKOUT_TEMPLATES.find((t) => t.id === state.workoutTemplates[0].templateId)
    : WORKOUT_TEMPLATES[0];

  const handleStartBlank = () => {
    set((s) => ({
      ...s,
      activeWorkout: { id: uid(), name: "Workout", startedAt: Date.now(), exercises: [] },
    }));
    setResumeActive(true);
  };

  const handleStartPlan = () => {
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
    setResumeActive(true);
  };

  const handleStartTemplate = (tid: string) => {
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
    setShowTemplates(false);
    setResumeActive(true);
  };

  const lastWorkout = state.workouts[state.workouts.length - 1];
  const recentCardio = state.cardioEntries.filter((c) => c.createdAt > Date.now() - 30 * 86400000);

  return (
    <div className="pb-24">
      <PageHeader
        title="Training"
        subtitle={`${state.profile.split} • ${state.profile.daysPerWeek}d/wk`}
      />

      <div className="px-5 space-y-5 mt-2">
        {/* 1. Hero Card */}
        {active ? (
          <div className="card-elev p-5 section-gradient ring-section">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Active Workout
            </span>
            <h2 className="text-2xl font-bold mt-1">{active.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {active.exercises.length > 0 ? (
                <>
                  Current:{" "}
                  {exerciseById(
                    active.exercises.find((e) => !e.completed)?.exerciseId ||
                      active.exercises[active.exercises.length - 1].exerciseId,
                  )?.name || "Workout"}
                </>
              ) : (
                "No exercises yet"
              )}
            </p>
            <div className="mt-4">
              <PrimaryButton onClick={() => setResumeActive(true)} className="w-full">
                <Play size={16} /> Resume Workout
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="card-elev p-5 section-gradient ring-section">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Today</span>
            <h2 className="text-2xl font-bold mt-1">
              {todays.length ? "Trained ✓" : "Ready to lift"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {todays.length
                ? `${todays.length} workout logged`
                : planExercises
                  ? `Plan: ${planExercises.name}`
                  : "No workout planned yet"}
            </p>
            <div className="flex gap-2 mt-4">
              {planExercises && !todays.length ? (
                <PrimaryButton onClick={handleStartPlan} className="flex-1">
                  <Play size={16} /> Start today&apos;s plan
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={() => setShowTemplates(true)} className="flex-1">
                  <BookOpen size={16} /> Choose Template
                </PrimaryButton>
              )}
              <GhostButton onClick={handleStartBlank}>
                <Plus size={16} /> Blank
              </GhostButton>
            </div>
          </div>
        )}

        {/* 2. Today's Plan Card */}
        {planExercises && !todays.length && !active && (
          <div>
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
          </div>
        )}

        {/* 3 & 4. Programs & Templates compact shortcuts */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col justify-between" onClick={() => setShowPrograms(true)}>
            <div>
              <p className="font-semibold text-sm">Programs</p>
              <p className="text-xs text-muted-foreground">Active program</p>
            </div>
            <button
              className="mt-3 text-xs font-semibold text-left"
              style={{ color: "var(--section)" }}
            >
              View
            </button>
          </Card>
          <Card className="flex flex-col justify-between" onClick={() => setShowTemplates(true)}>
            <div>
              <p className="font-semibold text-sm">Templates</p>
              <p className="text-xs text-muted-foreground">{WORKOUT_TEMPLATES.length} templates</p>
            </div>
            <button
              className="mt-3 text-xs font-semibold text-left"
              style={{ color: "var(--section)" }}
            >
              View
            </button>
          </Card>
        </div>

        {/* 5. Recent Workout History preview */}
        <div>
          <SectionHeader title="Recent Workout" />
          {lastWorkout ? (
            <Card>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{lastWorkout.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastWorkout.startedAt).toLocaleDateString()} •{" "}
                    {lastWorkout.exercises.length} exercises
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {lastWorkout.endedAt
                    ? `${Math.round((lastWorkout.endedAt - lastWorkout.startedAt) / 60000)}m`
                    : "—"}
                </span>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={<Clock size={16} />}
              title="No history"
              description="Completed workouts will appear here."
            />
          )}
        </div>

        {/* 6. Sports/Activities card (only if recently used) */}
        {recentCardio.length > 0 && (
          <div>
            <SectionHeader title="Sports & Activities" />
            <Card className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">Recent Activity</p>
                <p className="text-xs text-muted-foreground">
                  {recentCardio.length} sessions in last 30d
                </p>
              </div>
              <button
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--surface-2)]"
                style={{ color: "var(--section)" }}
              >
                View
              </button>
            </Card>
          </div>
        )}

        {/* 7. Exercise Library access */}
        <div>
          <SectionHeader title="Library" />
          <Card className="flex items-center gap-2 text-muted-foreground">
            <Search size={16} />
            <span className="text-sm">Search Exercise Library...</span>
          </Card>
        </div>

        {/* Future Deep Dive note */}
        <div className="mt-6 text-center text-xs text-muted-foreground px-4">
          Training Deep Dive (History, Progression, Sports, Safety) coming soon.
        </div>
      </div>

      {/* Basic Sheets for Shortcuts */}
      <BottomSheet
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Starter Templates"
        height="tall"
      >
        <p className="text-sm text-muted-foreground mb-3">
          {WORKOUT_TEMPLATES.length} templates available
        </p>
        <div className="space-y-2">
          {WORKOUT_TEMPLATES.map((t) => (
            <Card key={t.id} onClick={() => handleStartTemplate(t.id)}>
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
                    handleStartTemplate(t.id);
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
      </BottomSheet>

      <BottomSheet
        open={showPrograms}
        onClose={() => setShowPrograms(false)}
        title="Programs"
        height="auto"
      >
        <EmptyState
          icon={<Dumbbell size={22} />}
          title="Programs coming soon"
          description="Full program progression and calendar logic belongs in Training Deep Dive."
        />
      </BottomSheet>
    </div>
  );
}
