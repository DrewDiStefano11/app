import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calculator,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  History,
  ListChecks,
  Play,
  Plus,
  Repeat2,
  Sparkles,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { MuscleDetailSheet } from "@/components/app/popups/muscle-popup";
import {
  CompactMetricCard,
  DataQualityBadge,
  PremiumCard,
  SectionHeader,
  SectionTheme,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";
import {
  ChartFocusMode,
  ComparisonChart,
  PinnedAnalyticsStack,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
  type RangeKey,
  type StackItem,
} from "@/components/app/premium-visualization";
import { BottomSheet } from "@/components/app/sheet";
import type { TrainingDeepDiveContext } from "@/components/app/views/training-deep-dive-premium";
import {
  bestMuscleToTrainToday,
  muscleMap,
  readinessScore,
  recoveryScore,
  totalVolumeInRange,
  trainingConsistencyScore,
  trainingStreak,
  weeklyVolumeSeries,
  workoutVolume,
  type HeatMode,
} from "@/lib/analytics";
import { WORKOUT_TEMPLATES, exerciseById } from "@/lib/data";
import { isToday, uid, useStore } from "@/lib/store";
import type { AppState, Workout } from "@/lib/types";

export type TrainingDailyPanel = "templates" | "cardio" | "history" | "performance";

const DAY = 86_400_000;
const HEAT_MODES: { id: HeatMode; label: string }[] = [
  { id: "load", label: "Load" },
  { id: "strength", label: "Strength" },
  { id: "imbalance", label: "Imbalance" },
  { id: "recovery", label: "Recovery" },
];

export function TrainingDailyPremiumView({
  onOpenPanel,
  onOpenActive,
  onOpenDeepDive,
}: {
  onOpenPanel: (panel: TrainingDailyPanel) => void;
  onOpenActive: () => void;
  onOpenDeepDive: (context?: TrainingDeepDiveContext) => void;
}) {
  const { state, view, set } = useStore();
  const [selectedChart, setSelectedChart] = useState("volume");
  const [pinnedChart, setPinnedChart] = useState<string | undefined>("volume");
  const [suggestionVisible, setSuggestionVisible] = useState(true);
  const [focusOpen, setFocusOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("14d");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("raw");
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const [heatMode, setHeatMode] = useState<HeatMode>("load");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const active = state.activeWorkout;
  const recommendation = useMemo(() => bestMuscleToTrainToday(view), [view]);
  const heatValues = useMemo(() => muscleMap(view, heatMode), [view, heatMode]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const consistency = useMemo(() => trainingConsistencyScore(view), [view]);
  const streak = useMemo(() => trainingStreak(view), [view]);
  const volume7d = useMemo(() => totalVolumeInRange(view, 7), [view]);
  const weekWorkouts = view.workouts.filter((workout) => workout.startedAt > Date.now() - 7 * DAY);
  const todayWorkouts = view.workouts.filter((workout) => isToday(workout.startedAt));
  const weekCardio = view.cardioEntries.filter((entry) => entry.createdAt > Date.now() - 7 * DAY);
  const lastWorkout = [...view.workouts].sort((a, b) => b.startedAt - a.startedAt)[0];
  const topPr = [...view.prs].sort((a, b) => b.date - a.date)[0];
  const assigned = state.workoutTemplates[0]
    ? WORKOUT_TEMPLATES.find((template) => template.id === state.workoutTemplates[0].templateId)
    : WORKOUT_TEMPLATES[0];

  const recentSleep = view.sleepEntries.some(
    (entry) => Date.now() - entry.createdAt <= 48 * 60 * 60 * 1000,
  );
  const recentCheckIn = view.recoveryCheckIns.some(
    (entry) => Date.now() - entry.createdAt <= 36 * 60 * 60 * 1000,
  );
  const recoverySources = Number(recentSleep) + Number(recentCheckIn);
  const hasTrainingHistory = view.workouts.length > 0;
  const recommendationQuality: DataQualityDetails =
    recoverySources === 2 && hasTrainingHistory
      ? { state: "ready", confidence: "high", sourceCount: 3 }
      : recoverySources > 0 || hasTrainingHistory
        ? {
            state: "partial",
            confidence: "medium",
            sourceCount: recoverySources + Number(hasTrainingHistory),
            reason: recommendationMissingCopy(recentSleep, recentCheckIn, hasTrainingHistory),
          }
        : {
            state: "needs_more_data",
            confidence: "low",
            requiredHistory: 2,
            reason: "No recent recovery signals or completed workouts",
          };
  const readinessQuality: DataQualityDetails =
    recoverySources === 2
      ? { state: "ready", confidence: "high", sourceCount: 2 }
      : recoverySources === 1
        ? { state: "partial", confidence: "medium", sourceCount: 1 }
        : { state: "needs_more_data", confidence: "low", requiredHistory: 2 };

  const startBlank = () => {
    set((current) => ({
      ...current,
      activeWorkout: { id: uid(), name: "Workout", startedAt: Date.now(), exercises: [] },
    }));
    onOpenActive();
  };
  const startAssigned = () => {
    if (!assigned) return startBlank();
    set((current) => ({
      ...current,
      activeWorkout: {
        id: uid(),
        name: assigned.name,
        startedAt: Date.now(),
        templateId: assigned.id,
        exercises: assigned.exercises.map((exercise) => ({
          id: uid(),
          exerciseId: exercise.exerciseId,
          completed: false,
          sets: Array.from({ length: exercise.sets }, () => ({
            id: uid(),
            modifier: "normal" as const,
            completed: false,
          })),
        })),
      },
    }));
    onOpenActive();
  };

  const volumeData = useMemo(() => buildVolumeData(view, 14), [view]);
  const frequencyData = useMemo(() => buildFrequencyData(view, 28), [view]);
  const cardioData = useMemo(() => buildCardioData(view, 14), [view]);
  const volumeSeries: ChartSeries[] = [
    { id: "volume", label: "Completed volume", unit: "lb", color: "#8b5cf6" },
  ];
  const chartQuality: DataQualityDetails = hasTrainingHistory
    ? volumeData.length >= 2
      ? { state: "ready", confidence: "high", sampleSize: volumeData.length }
      : { state: "partial", confidence: "low", sampleSize: volumeData.length }
    : { state: "needs_more_data", requiredHistory: 2, sampleSize: 0 };

  const charts: StackItem[] = [
    {
      id: "volume",
      label: "Weekly volume",
      description: "Completed working-set load · 14 days · lb",
      quality: chartQuality,
      content: (
        <TrainingChartSummary
          value={hasTrainingHistory ? formatCompact(volume7d) : "—"}
          unit="lb / 7d"
          detail={
            hasTrainingHistory
              ? `${weekWorkouts.length} completed sessions in range`
              : "Complete a workout to begin the volume series."
          }
          data={volumeData}
          metric="volume"
          onFocus={() => setFocusOpen(true)}
        />
      ),
    },
    {
      id: "frequency",
      label: "Workout frequency",
      description: "Completed sessions · 4 weeks · workouts",
      quality: hasTrainingHistory
        ? { state: "ready", sampleSize: view.workouts.length }
        : chartQuality,
      content: (
        <TrainingChartSummary
          value={weekWorkouts.length}
          unit="workouts / 7d"
          detail={`${consistency}% of the ${state.profile.daysPerWeek}-day schedule target`}
          data={frequencyData}
          metric="sessions"
          onFocus={() => onOpenDeepDive({ focus: "consistency", range })}
        />
      ),
    },
    {
      id: "consistency",
      label: "Consistency & streak",
      description: "Schedule adherence · current week",
      quality: hasTrainingHistory ? { state: "ready", confidence: "high" } : chartQuality,
      content: (
        <div className="training-consistency-chart">
          <div
            className="training-consistency-ring"
            style={
              { "--progress": `${Math.min(100, consistency) * 3.6}deg` } as React.CSSProperties
            }
          >
            <strong>{hasTrainingHistory ? `${consistency}%` : "—"}</strong>
            <span>consistency</span>
          </div>
          <div>
            <strong>{streak} day streak</strong>
            <p>
              {hasTrainingHistory
                ? `${weekWorkouts.length} of ${state.profile.daysPerWeek} scheduled sessions logged.`
                : "Log a completed workout to establish consistency."}
            </p>
            <button type="button" onClick={() => onOpenDeepDive({ focus: "consistency", range })}>
              Open breakdown <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ),
    },
    ...(suggestionVisible && view.cardioEntries.length
      ? [
          {
            id: "cardio",
            label: "Cardio duration",
            description: "Suggested from recent cardio logs · 14 days · min",
            suggested: true,
            quality: {
              state: cardioData.length >= 2 ? "ready" : "partial",
              sampleSize: cardioData.length,
            } as DataQualityDetails,
            content: (
              <TrainingChartSummary
                value={weekCardio.reduce((sum, entry) => sum + entry.minutes, 0)}
                unit="min / 7d"
                detail={`${weekCardio.length} cardio session${weekCardio.length === 1 ? "" : "s"} logged.`}
                data={cardioData}
                metric="minutes"
                onFocus={() => onOpenPanel("cardio")}
              />
            ),
          },
        ]
      : []),
  ];

  const activeProgress = active ? summarizeActiveWorkout(active) : null;

  return (
    <SectionTheme section="training" className="training-command-center">
      <header className="training-command-header">
        <div>
          <p className="eyebrow">Daily training command</p>
          <h1 className="training-command-title">Training</h1>
          <div className="training-context-row">
            <StatusBadge tone={active ? "info" : todayWorkouts.length ? "success" : "neutral"}>
              {active
                ? "Workout active"
                : todayWorkouts.length
                  ? "Trained today"
                  : "Ready to train"}
            </StatusBadge>
            <span>{state.profile.split}</span>
            <span>{state.profile.daysPerWeek}d schedule</span>
          </div>
        </div>
        <Dumbbell size={26} aria-hidden="true" />
      </header>

      <main className="training-command-main">
        <PremiumCard className="training-hero" as="section">
          <div className="training-hero-glow" aria-hidden="true" />
          {active && activeProgress ? (
            <div className="relative z-10">
              <div className="training-hero-topline">
                <p className="eyebrow">Active workout</p>
                <StatusBadge tone="info">Workout in progress</StatusBadge>
              </div>
              <h2>{active.name}</h2>
              <p className="training-hero-copy">
                Started {formatTime(active.startedAt)} · {active.exercises.length} exercises ·{" "}
                {activeProgress.completedSets} of {activeProgress.totalSets} sets complete
              </p>
              <div
                className="training-active-progress"
                role="progressbar"
                aria-label={`${activeProgress.completedSets} of ${activeProgress.totalSets} workout sets complete`}
                aria-valuemin={0}
                aria-valuemax={activeProgress.totalSets || 1}
                aria-valuenow={activeProgress.completedSets}
              >
                <span style={{ width: `${activeProgress.percent}%` }} />
              </div>
              <div className="training-next-set">
                <span>Next action</span>
                <strong>{activeProgress.currentExercise}</strong>
                <small>{activeProgress.lastSet}</small>
              </div>
              <button
                className="premium-primary-action training-hero-primary"
                type="button"
                onClick={onOpenActive}
              >
                <Play size={18} /> Resume workout
              </button>
              <button
                className="training-secondary-action"
                type="button"
                onClick={() => onOpenPanel("history")}
              >
                Review workout history
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              <div className="training-hero-topline">
                <p className="eyebrow">Recommended next workout</p>
                <DataQualityBadge quality={recommendationQuality} />
              </div>
              <div className="training-recommendation-kicker">
                <Sparkles size={16} /> Existing training + recovery signals
              </div>
              <h2>{assigned?.name ?? `Train ${capitalize(recommendation)}`}</h2>
              <p className="training-hero-copy">
                {assigned
                  ? `${assigned.exercises.length} exercises · about ${assigned.durationMin} min · ${assigned.goal}`
                  : `No workout is assigned. ${capitalize(recommendation)} has the strongest available signal.`}
              </p>
              <div className="training-evidence" aria-label="Recommendation evidence">
                <Evidence
                  label="Muscle signal"
                  value={hasTrainingHistory ? capitalize(recommendation) : "Limited"}
                />
                <Evidence label="Recovery inputs" value={`${recoverySources} of 2 recent`} />
                <Evidence
                  label="Recent workload"
                  value={hasTrainingHistory ? `${formatCompact(volume7d)} lb` : "Not logged"}
                />
              </div>
              <p className="training-data-note">
                {recommendationQuality.state === "ready"
                  ? "Recommendation uses completed training history, recent sleep, and a recovery check-in."
                  : recommendationQuality.state === "partial"
                    ? `Partial recommendation: ${recommendationQuality.reason}. Log the missing signal to improve it.`
                    : "Needs more data: log a completed workout and recovery inputs. You can still choose a template or start manually."}
              </p>
              <button
                className="premium-primary-action training-hero-primary"
                type="button"
                onClick={assigned ? startAssigned : startBlank}
              >
                <Play size={18} /> {assigned ? "Start today's plan" : "Start Workout"}
              </button>
              <div className="training-hero-links">
                <button type="button" onClick={startBlank}>
                  <Plus size={15} /> Blank workout
                </button>
                <button type="button" onClick={() => onOpenPanel("templates")}>
                  <ListChecks size={15} /> Choose template
                </button>
              </div>
            </div>
          )}
        </PremiumCard>

        <section className="training-section-block" aria-label="Training status">
          <SectionHeader eyebrow="Current context" title="Current status" />
          <div className="training-support-strip">
            <CompactMetricCard
              label="Readiness"
              value={recoverySources ? readiness : "—"}
              unit={recoverySources ? "/ 100" : undefined}
              detail={
                recoverySources
                  ? recoverySources === 2
                    ? "Recent sleep + check-in"
                    : "One recent input"
                  : "No recent inputs"
              }
              quality={readinessQuality}
            />
            <CompactMetricCard
              label="Recovery"
              value={recoverySources || hasTrainingHistory ? recovery : "—"}
              unit={recoverySources || hasTrainingHistory ? "/ 100" : undefined}
              detail={hasTrainingHistory ? "Recent load context" : "No workload history"}
              quality={recommendationQuality}
            />
            <CompactMetricCard
              label="Consistency"
              value={hasTrainingHistory ? consistency : "—"}
              unit={hasTrainingHistory ? "%" : undefined}
              detail={`${streak} day streak`}
              quality={
                hasTrainingHistory
                  ? { state: "ready" }
                  : { state: "needs_more_data", requiredHistory: 1 }
              }
            />
          </div>
        </section>

        <section className="training-section-block">
          <SectionHeader
            eyebrow="Workload"
            title="Workload analytics"
            description="Swipe or use arrow keys. Pinning is session-only in Phase A."
            action={
              <button
                className="training-text-action"
                type="button"
                onClick={() => onOpenDeepDive({ focus: "workload", range })}
              >
                Deep Dive <ChevronRight size={14} />
              </button>
            }
          />
          <PinnedAnalyticsStack
            items={charts}
            selectedId={selectedChart}
            pinnedId={pinnedChart}
            onSelectedIdChange={setSelectedChart}
            onPinChange={setPinnedChart}
            onDismissSuggested={() => setSuggestionVisible(false)}
            ariaLabel="Training analytics charts"
          />
        </section>

        <section className="training-section-block">
          <SectionHeader
            eyebrow={`Muscle ${heatMode}`}
            title="Muscle balance & load"
            description={
              hasTrainingHistory
                ? `${capitalize(topSignal(heatValues))} is the strongest current ${heatMode} signal.`
                : "Complete a workout before treating the map as measured muscle history."
            }
            action={
              <button
                className="training-text-action"
                type="button"
                onClick={() => onOpenPanel("performance")}
              >
                Open training analytics <ChevronRight size={14} />
              </button>
            }
          />
          <PremiumCard className="training-body-card">
            <div className="training-body-controls">
              <div role="group" aria-label="Body view">
                <button
                  type="button"
                  aria-pressed={bodySide === "front"}
                  onClick={() => setBodySide("front")}
                >
                  Front
                </button>
                <button
                  type="button"
                  aria-pressed={bodySide === "back"}
                  onClick={() => setBodySide("back")}
                >
                  Back
                </button>
              </div>
              <div role="group" aria-label="Muscle map mode">
                {HEAT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={heatMode === mode.id}
                    onClick={() => setHeatMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="training-body-layout">
              <div className="training-body-figure">
                <BodyHeatmap
                  key={bodySide}
                  values={heatValues}
                  mode={heatMode}
                  side={bodySide}
                  compact
                  selected={selectedMuscle}
                  onSelect={setSelectedMuscle}
                />
              </div>
              <div className="training-body-summary">
                <span>Selected muscle</span>
                <strong>{selectedMuscle ? capitalize(selectedMuscle) : "Tap the map"}</strong>
                <p>
                  {hasTrainingHistory
                    ? "Open a muscle for volume, last trained, strength, recovery, imbalance, and recommendations."
                    : "No measured imbalance is shown without completed training history."}
                </p>
                {selectedMuscle && (
                  <div className="training-body-summary__actions">
                    <button type="button" onClick={() => setSelectedMuscle(selectedMuscle)}>
                      Muscle details <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenDeepDive({
                          focus: "muscles",
                          range,
                          selectedMuscle,
                          heatMode,
                          bodySide,
                        })
                      }
                    >
                      Analyze in Deep Dive <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </PremiumCard>
        </section>

        <div className="training-two-column">
          <section className="training-section-block">
            <SectionHeader eyebrow="This week" title="Weekly progress" />
            <PremiumCard className="training-week-card">
              <div
                className="training-week-progress"
                role="progressbar"
                aria-label={`${weekWorkouts.length} of ${state.profile.daysPerWeek} scheduled workouts completed`}
                aria-valuemin={0}
                aria-valuemax={state.profile.daysPerWeek}
                aria-valuenow={Math.min(weekWorkouts.length, state.profile.daysPerWeek)}
              >
                <strong>
                  {weekWorkouts.length}
                  <small> / {state.profile.daysPerWeek}</small>
                </strong>
                <span>schedule sessions</span>
                <i>
                  <b
                    style={{
                      width: `${Math.min(100, (weekWorkouts.length / Math.max(1, state.profile.daysPerWeek)) * 100)}%`,
                    }}
                  />
                </i>
              </div>
              <div className="training-week-stats">
                <MetricLine label="Completed sets" value={countCompletedSets(weekWorkouts)} />
                <MetricLine
                  label="Weekly volume"
                  value={hasTrainingHistory ? `${formatCompact(volume7d)} lb` : "—"}
                />
                <MetricLine
                  label="Current streak"
                  value={`${streak} day${streak === 1 ? "" : "s"}`}
                />
              </div>
              <p>
                {hasTrainingHistory
                  ? "Based on completed workouts in the last seven days and your profile schedule."
                  : "No weekly goal result is inferred yet. Complete a workout to begin."}
              </p>
            </PremiumCard>
          </section>

          <section className="training-section-block">
            <SectionHeader
              eyebrow="Plan & repeat"
              title="Templates & recent"
              action={
                <button
                  className="training-text-action"
                  type="button"
                  onClick={() => onOpenPanel("templates")}
                >
                  View all <ChevronRight size={14} />
                </button>
              }
            />
            <PremiumCard className="training-plan-card">
              <button type="button" onClick={() => onOpenPanel("templates")}>
                <span>
                  <ListChecks size={18} />
                  <b>{WORKOUT_TEMPLATES.length} starter templates</b>
                </span>
                <small>Preview exercises or start from a program.</small>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => onOpenPanel("history")}>
                <span>
                  <History size={18} />
                  <b>{lastWorkout?.name ?? "No recent workout"}</b>
                </span>
                <small>
                  {lastWorkout
                    ? `${new Date(lastWorkout.startedAt).toLocaleDateString()} · ${lastWorkout.exercises.length} exercises`
                    : "Completed sessions will appear here."}
                </small>
                <ChevronRight size={16} />
              </button>
            </PremiumCard>
          </section>
        </div>

        <div className="training-two-column">
          <section className="training-section-block">
            <SectionHeader eyebrow="Achievements" title="Personal records" />
            <PremiumCard className="training-pr-card">
              {topPr ? (
                <>
                  <Trophy size={22} />
                  <div>
                    <span>Recent PR · {new Date(topPr.date).toLocaleDateString()}</span>
                    <strong>{exerciseById(topPr.exerciseId)?.name ?? "Recorded exercise"}</strong>
                    <p>
                      {topPr.weight ?? topPr.value} lb{topPr.reps ? ` × ${topPr.reps}` : ""} ·
                      estimated best {topPr.value}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Trophy size={22} />
                  <div>
                    <span>No personal records yet</span>
                    <strong>Build your first benchmark</strong>
                    <p>Finish a workout with weight and reps logged. No demo record is shown.</p>
                  </div>
                </>
              )}
              <button type="button" onClick={() => onOpenPanel("performance")}>
                Open records <ChevronRight size={14} />
              </button>
              <button type="button" onClick={() => onOpenDeepDive({ focus: "records", range })}>
                Analyze records <ChevronRight size={14} />
              </button>
            </PremiumCard>
          </section>

          <section className="training-section-block">
            <SectionHeader eyebrow="Conditioning" title="Cardio status" />
            <PremiumCard className="training-cardio-card">
              <Flame size={22} />
              <div>
                <strong>
                  {weekCardio.length
                    ? `${weekCardio.reduce((sum, entry) => sum + entry.minutes, 0)} min this week`
                    : "No cardio logged this week"}
                </strong>
                <p>
                  {weekCardio.length
                    ? `${weekCardio.length} session${weekCardio.length === 1 ? "" : "s"} · only entered metrics are included.`
                    : "Log duration and any optional distance, heart rate, or calories you actually measured."}
                </p>
              </div>
              <button type="button" onClick={() => onOpenPanel("cardio")}>
                Open cardio <ChevronRight size={14} />
              </button>
              <button type="button" onClick={() => onOpenDeepDive({ focus: "cardio", range })}>
                Analyze cardio <ChevronRight size={14} />
              </button>
            </PremiumCard>
          </section>
        </div>

        <section className="training-section-block">
          <SectionHeader eyebrow="Shortcuts" title="Tools" />
          <div className="training-tools-grid">
            <Tool
              icon={<Plus size={19} />}
              label="Build workout"
              detail="Build manually"
              onClick={startBlank}
            />
            <Tool
              icon={<ListChecks size={19} />}
              label="Templates"
              detail="Choose a program"
              onClick={() => onOpenPanel("templates")}
            />
            <Tool
              icon={<History size={19} />}
              label="Workout history"
              detail="Review completed"
              onClick={() => onOpenPanel("history")}
            />
            <Tool
              icon={<Flame size={19} />}
              label="Cardio"
              detail="Log a session"
              onClick={() => onOpenPanel("cardio")}
            />
            <Tool
              icon={<Wrench size={19} />}
              label="Custom exercises"
              detail="Available in workout"
              onClick={() => setToolsOpen(true)}
            />
            <Tool
              icon={<Calculator size={19} />}
              label="Plate calculator"
              detail="Available per exercise"
              onClick={() => setToolsOpen(true)}
            />
          </div>
        </section>

        <section className="training-section-block">
          <SectionHeader eyebrow="Latest" title="Recent activity" />
          <PremiumCard className="training-activity-card">
            {lastWorkout ? (
              <ActivityLine
                icon={<Dumbbell size={17} />}
                title={lastWorkout.name}
                detail={`${new Date(lastWorkout.startedAt).toLocaleDateString()} · ${formatCompact(workoutVolume(lastWorkout))} lb volume`}
              />
            ) : (
              <ActivityLine
                icon={<Clock3 size={17} />}
                title="No completed workouts"
                detail="Your latest completed training will appear here."
              />
            )}
            {view.cardioEntries.length ? (
              <ActivityLine
                icon={<Flame size={17} />}
                title={view.cardioEntries[view.cardioEntries.length - 1].type}
                detail={`${view.cardioEntries[view.cardioEntries.length - 1].minutes} min cardio`}
              />
            ) : null}
          </PremiumCard>
        </section>

        <PremiumCard className="training-deep-dive-access">
          <div>
            <p className="eyebrow">Explore</p>
            <h2>Open Deep Dive</h2>
            <p>
              Inspect performance, strength, templates, and existing insights without changing
              today’s workout.
            </p>
          </div>
          <button
            className="premium-primary-action"
            type="button"
            onClick={() => onOpenDeepDive({ focus: "overview", range })}
          >
            Open Deep Dive <ArrowRight size={17} />
          </button>
        </PremiumCard>
      </main>

      <ChartFocusMode
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        title="Training volume · 14 days"
        chart={
          <ComparisonChart
            title="Completed training volume"
            description="Exact logged working-set volume by workout date."
            data={volumeData}
            series={volumeSeries}
            kind="bar"
            mode={comparisonMode}
            onModeChange={setComparisonMode}
            quality={chartQuality}
            animate={false}
          />
        }
        series={volumeSeries}
        range={range}
        onRangeChange={setRange}
        mode={comparisonMode}
        onModeChange={setComparisonMode}
        data={volumeData}
      />
      <MuscleDetailSheet
        muscle={selectedMuscle}
        onClose={() => setSelectedMuscle(null)}
        action={
          selectedMuscle ? (
            <button
              type="button"
              className="premium-primary-action w-full"
              onClick={() =>
                onOpenDeepDive({
                  focus: "muscles",
                  range,
                  selectedMuscle,
                  heatMode,
                  bodySide,
                })
              }
            >
              Analyze in Deep Dive <ChevronRight size={15} />
            </button>
          ) : undefined
        }
      />
      <BottomSheet
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        title="Workout tools"
        height="auto"
      >
        <div className="space-y-3">
          <p className="text-sm leading-6 text-white/55">
            Custom exercise creation and the plate calculator remain inside the active workout flow,
            where they can be attached to the correct exercise and set.
          </p>
          <button
            className="premium-primary-action w-full"
            type="button"
            onClick={() => {
              setToolsOpen(false);
              if (active) onOpenActive();
              else startBlank();
            }}
          >
            {active ? "Resume Workout" : "Start Blank Workout"}
          </button>
        </div>
      </BottomSheet>
    </SectionTheme>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function MetricLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Tool({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="training-tool" type="button" onClick={onClick}>
      <span>{icon}</span>
      <b>{label}</b>
      <small>{detail}</small>
    </button>
  );
}
function ActivityLine({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function TrainingChartSummary({
  value,
  unit,
  detail,
  data,
  metric,
  onFocus,
}: {
  value: ReactNode;
  unit: string;
  detail: string;
  data: ChartPoint[];
  metric: string;
  onFocus: () => void;
}) {
  const values = data.map((point) => Number(point[metric] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="training-chart-summary">
      <div>
        <strong>{value}</strong>
        <span>{unit}</span>
        <p>{detail}</p>
      </div>
      <div
        className="training-mini-bars"
        role="img"
        aria-label={`${unit} chart with ${data.length} recorded points`}
      >
        {values.length ? (
          values.map((item, index) => (
            <i key={index} style={{ height: `${item ? Math.max(8, (item / max) * 100) : 3}%` }} />
          ))
        ) : (
          <span>No recorded data</span>
        )}
      </div>
      <button type="button" onClick={onFocus}>
        <BarChart3 size={15} /> Focus & data
      </button>
    </div>
  );
}

function summarizeActiveWorkout(workout: Workout) {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completed = sets.filter((set) => set.completed);
  const current =
    workout.exercises.find((exercise) => !exercise.completed) ??
    workout.exercises[workout.exercises.length - 1];
  const last = completed[completed.length - 1];
  return {
    completedSets: completed.length,
    totalSets: sets.length,
    percent: sets.length ? Math.round((completed.length / sets.length) * 100) : 0,
    currentExercise: current
      ? (exerciseById(current.exerciseId)?.name ?? "Current exercise")
      : "Add your first exercise",
    lastSet: last
      ? `Most recent: ${last.weight ?? "—"} lb × ${last.reps ?? "—"}${last.modifier && last.modifier !== "normal" ? ` · ${last.modifier}` : ""}`
      : "No sets logged yet",
  };
}

function buildVolumeData(state: AppState, days: number): ChartPoint[] {
  const cutoff = Date.now() - days * DAY;
  return [...state.workouts]
    .filter((workout) => workout.startedAt >= cutoff)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((workout) => ({
      date: new Date(workout.startedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      volume: workoutVolume(workout) || null,
    }));
}
function buildFrequencyData(state: AppState, days: number): ChartPoint[] {
  const weeks = Array.from({ length: 4 }, (_, index) => ({
    start: Date.now() - (4 - index) * 7 * DAY,
    end: Date.now() - (3 - index) * 7 * DAY,
  }));
  return weeks.map((week) => ({
    date: new Date(week.end).toLocaleDateString([], { month: "short", day: "numeric" }),
    sessions:
      state.workouts.filter(
        (workout) => workout.startedAt >= week.start && workout.startedAt < week.end,
      ).length || null,
  }));
}
function buildCardioData(state: AppState, days: number): ChartPoint[] {
  const cutoff = Date.now() - days * DAY;
  return [...state.cardioEntries]
    .filter((entry) => entry.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((entry) => ({
      date: new Date(entry.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      minutes: entry.minutes,
    }));
}
function countCompletedSets(workouts: Workout[]) {
  return workouts.reduce(
    (total, workout) =>
      total +
      workout.exercises.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal + exercise.sets.filter((set) => set.completed).length,
        0,
      ),
    0,
  );
}
function recommendationMissingCopy(sleep: boolean, checkIn: boolean, history: boolean) {
  const missing = [
    !history && "completed training history",
    !sleep && "recent sleep",
    !checkIn && "a recent recovery check-in",
  ].filter(Boolean);
  return missing.join(", ");
}
function topSignal(values: Record<string, number>) {
  return Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "muscle";
}
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.round(value),
  );
}
function formatTime(value: number) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
