import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarRange,
  ChevronRight,
  Dumbbell,
  Filter,
  HeartPulse,
  History,
  ListFilter,
  RotateCcw,
  Save,
  Scale,
  SlidersHorizontal,
  Table2,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { exerciseById } from "@/lib/data";
import {
  bestMuscleToTrainToday,
  muscleMap,
  readinessScore,
  recoveryScore,
  trainingConsistencyScore,
  trainingStreak,
  workoutVolume,
  type HeatMode,
} from "@/lib/analytics";
import type { AppState, Workout } from "@/lib/types";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { BottomSheet } from "@/components/app/sheet";
import {
  ChartFocusMode,
  ComparisonChart,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
  type RangeKey,
} from "@/components/app/premium-visualization";
import {
  DataQualityBadge,
  HeroSurface,
  PremiumCard,
  SectionHeader,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";

const DAY = 86_400_000;
const RANGE_DAYS: Partial<Record<RangeKey, number>> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  all: 36_500,
};
const RANGE_OPTIONS: { id: RangeKey; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "14d", label: "14 days" },
  { id: "30d", label: "30 days" },
  { id: "3m", label: "3 months" },
  { id: "all", label: "All history" },
];
const HEAT_MODES: { id: HeatMode; label: string }[] = [
  { id: "load", label: "Load" },
  { id: "strength", label: "Strength" },
  { id: "imbalance", label: "Imbalance" },
  { id: "recovery", label: "Recovery" },
];

export type TrainingDeepDiveFocus =
  | "overview"
  | "workload"
  | "consistency"
  | "exercise"
  | "muscles"
  | "records"
  | "history"
  | "cardio"
  | "comparison";

export interface TrainingDeepDiveContext {
  focus?: TrainingDeepDiveFocus;
  range?: RangeKey;
  selectedMuscle?: string | null;
  heatMode?: HeatMode;
  bodySide?: "front" | "back";
  selectedExercise?: string;
  selectedWorkoutId?: string;
}

type CompletionFilter = "all" | "complete" | "partial";
type CategoryFilter = "all" | "strength" | "cardio";

interface Filters {
  completion: CompletionFilter;
  category: CategoryFilter;
  workout: string;
  exercise: string;
  muscle: string;
}

const DEFAULT_FILTERS: Filters = {
  completion: "all",
  category: "all",
  workout: "all",
  exercise: "all",
  muscle: "all",
};

interface WorkloadPoint extends ChartPoint {
  volume: number | null;
  sets: number | null;
  reps: number | null;
  sessions: number | null;
  minutes: number | null;
  soreness: number | null;
}

export function TrainingDeepDivePremiumView({
  context,
  onReturnDaily,
}: {
  context?: TrainingDeepDiveContext;
  onReturnDaily: () => void;
}) {
  const { view } = useStore();
  const [range, setRange] = useState<RangeKey>(context?.range ?? "30d");
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    exercise: context?.selectedExercise ?? "all",
    muscle: context?.selectedMuscle ?? "all",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("raw");
  const [comparisonMetrics, setComparisonMetrics] = useState(["volume", "sets"]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [focusOpen, setFocusOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState(context?.selectedExercise ?? "");
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(
    context?.selectedWorkoutId ?? null,
  );
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(
    context?.selectedMuscle ?? null,
  );
  const [heatMode, setHeatMode] = useState<HeatMode>(context?.heatMode ?? "load");
  const [bodySide, setBodySide] = useState<"front" | "back">(context?.bodySide ?? "front");
  const [sessionName, setSessionName] = useState("Training comparison");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const days = RANGE_DAYS[range] ?? 30;
  const cutoff = Date.now() - days * DAY;
  const rangeWorkouts = useMemo(
    () => view.workouts.filter((workout) => range === "all" || workout.startedAt >= cutoff),
    [cutoff, range, view.workouts],
  );
  const workoutNames = useMemo(
    () => [...new Set(rangeWorkouts.map((workout) => workout.name))].sort(),
    [rangeWorkouts],
  );
  const exerciseIds = useMemo(
    () => [
      ...new Set(
        rangeWorkouts.flatMap((workout) => workout.exercises.map((item) => item.exerciseId)),
      ),
    ],
    [rangeWorkouts],
  );
  const exerciseOptions = useMemo(
    () =>
      exerciseIds
        .map((id) => ({ id, name: exerciseById(id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exerciseIds],
  );

  useEffect(() => {
    if (!selectedExercise && exerciseOptions[0]) setSelectedExercise(exerciseOptions[0].id);
  }, [exerciseOptions, selectedExercise]);

  useEffect(() => {
    const focus = context?.focus ?? "overview";
    const target = sectionRefs.current[focus];
    if (!target || focus === "overview") return;
    const id = window.setTimeout(
      () => target.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
    return () => window.clearTimeout(id);
  }, [context?.focus]);

  const filteredWorkouts = useMemo(
    () =>
      rangeWorkouts.filter((workout) => {
        if (filters.category === "cardio") return false;
        if (filters.completion === "complete" && !workout.endedAt) return false;
        if (filters.completion === "partial" && workout.endedAt) return false;
        if (filters.workout !== "all" && workout.name !== filters.workout) return false;
        if (
          filters.exercise !== "all" &&
          !workout.exercises.some((item) => item.exerciseId === filters.exercise)
        )
          return false;
        if (
          filters.muscle !== "all" &&
          !workout.exercises.some((item) => {
            const exercise = exerciseById(item.exerciseId);
            return [...(exercise?.primary ?? []), ...(exercise?.secondary ?? [])].includes(
              filters.muscle as never,
            );
          })
        )
          return false;
        return true;
      }),
    [filters, rangeWorkouts],
  );
  const rangeCardio = useMemo(
    () =>
      view.cardioEntries.filter(
        (entry) =>
          (range === "all" || entry.createdAt >= cutoff) && filters.category !== "strength",
      ),
    [cutoff, filters.category, range, view.cardioEntries],
  );
  const activeFilterLabels = activeFilters(filters, workoutNames, exerciseOptions);
  const hasTraining = rangeWorkouts.length > 0;
  const hasFilteredTraining = filteredWorkouts.length > 0;
  const recentSleep = view.sleepEntries.some(
    (entry) => Date.now() - entry.createdAt <= 48 * 60 * 60 * 1000,
  );
  const recentCheckIn = view.recoveryCheckIns.some(
    (entry) => Date.now() - entry.createdAt <= 36 * 60 * 60 * 1000,
  );
  const evidenceCount = Number(hasTraining) + Number(recentSleep) + Number(recentCheckIn);
  const recommendation = bestMuscleToTrainToday(view);
  const readiness = readinessScore(view);
  const recovery = recoveryScore(view);
  const consistency = trainingConsistencyScore(view);
  const streak = trainingStreak(view);
  const quality: DataQualityDetails =
    filteredWorkouts.length >= 3
      ? { state: "ready", confidence: "high", sampleSize: filteredWorkouts.length }
      : filteredWorkouts.length
        ? {
            state: "partial",
            confidence: "low",
            sampleSize: filteredWorkouts.length,
            reason: "Fewer than three workouts match this view",
          }
        : { state: "needs_more_data", requiredHistory: 2, sampleSize: 0 };

  const workloadData = useMemo(
    () => buildWorkloadData(filteredWorkouts, rangeCardio, view, cutoff, range),
    [cutoff, filteredWorkouts, range, rangeCardio, view],
  );
  const workloadSeries = metricSeries(comparisonMetrics);
  const totalVolume = filteredWorkouts.reduce((sum, workout) => sum + workoutVolume(workout), 0);
  const completedSets = filteredWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.exercises.reduce(
        (inner, item) => inner + item.sets.filter((set) => set.completed).length,
        0,
      ),
    0,
  );
  const totalReps = filteredWorkouts.reduce(
    (sum, workout) =>
      sum +
      workout.exercises.reduce(
        (inner, item) =>
          inner +
          item.sets.reduce((setSum, set) => setSum + (set.completed ? (set.reps ?? 0) : 0), 0),
        0,
      ),
    0,
  );
  const volumeComparison = compareActualWindows(view.workouts, days);
  const muscleDistribution = useMemo(
    () => distributionForWorkouts(filteredWorkouts),
    [filteredWorkouts],
  );
  const heatValues = useMemo(() => muscleMap(view, heatMode), [heatMode, view]);
  const selectedMuscleEvidence = selectedMuscle
    ? muscleDistribution.find((item) => item.name === selectedMuscle)
    : undefined;
  const exerciseData = useMemo(
    () => buildExerciseData(filteredWorkouts, selectedExercise),
    [filteredWorkouts, selectedExercise],
  );
  const exerciseSeries: ChartSeries[] = [
    { id: "load", label: "Best logged load", unit: "lb", color: "#8b5cf6", axis: "left" },
    { id: "reps", label: "Repetitions", unit: "reps", color: "#22d3ee", axis: "right" },
  ];
  const rangePrs = view.prs
    .filter((record) => range === "all" || record.date >= cutoff)
    .sort((a, b) => b.date - a.date);
  const rangeLabel = RANGE_OPTIONS.find((item) => item.id === range)?.label ?? range;
  const uniqueUnits = new Set(workloadSeries.map((item) => item.unit));

  const changeRange = (next: RangeKey) => {
    setRange(next);
    setSelectedDate(undefined);
  };
  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const toggleMetric = (id: string) => {
    setComparisonMetrics((current) =>
      current.includes(id)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const openEntry = (date: string) => {
    setEntryDate(date);
  };

  return (
    <div className="training-deep-dive" aria-label="Training Deep Dive workspace">
      <header
        className="training-deep-header"
        ref={(node) => void (sectionRefs.current.overview = node)}
      >
        <button type="button" className="training-deep-back" onClick={onReturnDaily}>
          <ArrowLeft size={17} /> Daily View
        </button>
        <div className="training-deep-heading-row">
          <div>
            <p className="eyebrow">Training intelligence</p>
            <h1>Training Deep Dive</h1>
            <p>Evidence behind your direction, performance changes, and next adjustment.</p>
          </div>
          <div className="training-deep-context" aria-live="polite">
            <CalendarRange size={16} />
            <span>Active range</span>
            <strong>{rangeLabel}</strong>
          </div>
        </div>
        <div className="training-deep-initial-grid">
          <HeroSurface
            eyebrow="Primary workload"
            value={hasFilteredTraining ? formatNumber(totalVolume) : "—"}
            unit={hasFilteredTraining ? "lb" : undefined}
            status={hasFilteredTraining ? "Measured workload" : "No measured workload"}
            supportingFact={
              hasFilteredTraining
                ? `${completedSets} completed sets across ${filteredWorkouts.length} matching workout${filteredWorkouts.length === 1 ? "" : "s"}.`
                : hasTraining
                  ? "No workouts match the active filters. Reset filters to restore the range."
                  : "Complete a workout with logged sets to establish a workload trend."
            }
          >
            <div className="mt-4 training-deep-hero-meta">
              <DataQualityBadge quality={quality} />
              <StatusBadge tone="info">{rangeLabel}</StatusBadge>
            </div>
          </HeroSurface>
          <PremiumCard className="training-direction-card">
            <div className="training-direction-card__head">
              <div>
                <p className="eyebrow">Recommendation evidence</p>
                <h2>{capitalize(recommendation)} direction</h2>
              </div>
              <DataQualityBadge
                quality={
                  evidenceCount === 3
                    ? { state: "ready", confidence: "high", sourceCount: 3 }
                    : evidenceCount
                      ? { state: "partial", confidence: "medium", sourceCount: evidenceCount }
                      : { state: "needs_more_data", requiredHistory: 3 }
                }
              />
            </div>
            <p>
              This uses the existing FitCore recommendation contract. It is training guidance, not a
              medical or injury assessment.
            </p>
            <div className="training-evidence-list">
              <EvidenceRow
                label="Completed training history"
                available={hasTraining}
                detail={`${rangeWorkouts.length} in range`}
              />
              <EvidenceRow
                label="Recent sleep"
                available={recentSleep}
                detail={recentSleep ? `${readiness}% readiness context` : "Log sleep"}
              />
              <EvidenceRow
                label="Recent recovery check-in"
                available={recentCheckIn}
                detail={recentCheckIn ? `${recovery}% recovery context` : "Complete a check-in"}
              />
            </div>
          </PremiumCard>
        </div>
      </header>

      <section className="training-filter-bar" aria-label="Training analysis controls">
        <div className="training-range-control" role="group" aria-label="Training date range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={range === option.id}
              onClick={() => changeRange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="training-filter-button"
          onClick={() => setFilterOpen(true)}
        >
          <Filter size={16} /> Filters{" "}
          {activeFilterLabels.length ? `(${activeFilterLabels.length})` : ""}
        </button>
        <div
          className="training-active-filters"
          aria-live="polite"
          aria-label="Active training filters"
        >
          {activeFilterLabels.length ? (
            <>
              {activeFilterLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
              <button type="button" onClick={resetFilters}>
                <RotateCcw size={13} /> Reset
              </button>
            </>
          ) : (
            <span>All training entries</span>
          )}
        </div>
      </section>

      <main className="training-deep-main">
        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.workload = node)}
          aria-labelledby="training-workload-heading"
        >
          <SectionHeader
            eyebrow="Workload"
            title="Volume and completed work"
            description="Only logged workout dates appear. Missing dates are not converted to zero."
            action={<DataQualityBadge quality={quality} compact />}
          />
          <div className="training-metric-strip">
            <AnalyticMetric
              label="Volume"
              value={hasFilteredTraining ? formatNumber(totalVolume) : "—"}
              unit="lb"
            />
            <AnalyticMetric
              label="Completed sets"
              value={hasFilteredTraining ? completedSets : "—"}
              unit="sets"
            />
            <AnalyticMetric
              label="Repetitions"
              value={hasFilteredTraining ? totalReps : "—"}
              unit="reps"
            />
            <AnalyticMetric
              label="Sessions"
              value={hasFilteredTraining ? filteredWorkouts.length : "—"}
              unit="workouts"
            />
          </div>
          {hasFilteredTraining ? (
            <ComparisonChart
              title="Training workload"
              description={`${rangeLabel} · exact logged dates · volume (lb) and completed sets`}
              data={workloadData}
              series={metricSeries(["volume", "sets"])}
              kind="area"
              mode={comparisonMode}
              onModeChange={setComparisonMode}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onOpenEntry={openEntry}
              onFocus={() => setFocusOpen(true)}
              quality={quality}
              annotations={rangePrs
                .slice(0, 3)
                .map((record) => ({ date: dateLabel(record.date), label: "PR" }))}
            />
          ) : (
            <DataState
              quality={quality}
              title={
                hasTraining
                  ? "No workouts match these filters"
                  : "No workload history in this range"
              }
              description={
                hasTraining
                  ? "Reset filters or choose a broader range."
                  : "Log at least two completed workouts to establish a trend."
              }
            />
          )}
          <PremiumCard className="training-period-context">
            <div>
              <span>Current period</span>
              <strong>
                {volumeComparison.current == null
                  ? "—"
                  : `${formatNumber(volumeComparison.current)} lb`}
              </strong>
            </div>
            <div>
              <span>Previous comparable period</span>
              <strong>
                {volumeComparison.previous == null
                  ? "Unavailable"
                  : `${formatNumber(volumeComparison.previous)} lb`}
              </strong>
            </div>
            <p>
              {volumeComparison.previous == null
                ? "A previous-period comparison is withheld until both windows contain logged workouts."
                : `${volumeComparison.delta! >= 0 ? "+" : ""}${volumeComparison.delta}% versus the prior logged window. More workload is not automatically better.`}
            </p>
          </PremiumCard>
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.consistency = node)}
          aria-labelledby="training-consistency-heading"
        >
          <SectionHeader
            eyebrow="Consistency"
            title="Frequency and training rhythm"
            description="Logged sessions and gaps are shown without inventing a target schedule."
          />
          <div className="training-consistency-layout">
            <PremiumCard className="training-score-panel">
              <div
                className="training-score-ring"
                style={{ "--score": `${consistency * 3.6}deg` } as React.CSSProperties}
              >
                <strong>{hasTraining ? `${consistency}%` : "—"}</strong>
                <span>existing score</span>
              </div>
              <div>
                <p>Current streak</p>
                <strong>
                  {streak} day{streak === 1 ? "" : "s"}
                </strong>
                <span>
                  {view.profile.daysPerWeek} days/week is the profile schedule, not a universal
                  recommendation.
                </span>
              </div>
            </PremiumCard>
            <PremiumCard className="training-frequency-list">
              <h3>Range evidence</h3>
              <EvidenceMetric
                label="Training days"
                value={hasTraining ? uniqueTrainingDays(rangeWorkouts) : "Missing"}
              />
              <EvidenceMetric
                label="Completed sessions"
                value={rangeWorkouts.filter((workout) => workout.endedAt).length}
              />
              <EvidenceMetric
                label="Partial sessions"
                value={rangeWorkouts.filter((workout) => !workout.endedAt).length}
              />
              <EvidenceMetric
                label="Median gap"
                value={
                  rangeWorkouts.length >= 2
                    ? `${medianGap(rangeWorkouts)} days`
                    : "Needs 2 sessions"
                }
              />
            </PremiumCard>
          </div>
          {!hasTraining && (
            <DataState
              quality={{ state: "needs_more_data", requiredHistory: 2 }}
              title="No workouts logged"
              description="This is missing history, not a measured zero-frequency result. Complete a workout to begin the range."
            />
          )}
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.exercise = node)}
          aria-labelledby="training-exercise-heading"
        >
          <SectionHeader
            eyebrow="Exercise performance"
            title="Logged load and repetitions"
            description="No estimated strength, velocity, power, fatigue, form, or injury metric is calculated here."
          />
          <PremiumCard className="training-exercise-controls">
            <label htmlFor="training-exercise-select">Exercise</label>
            <select
              id="training-exercise-select"
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
            >
              {exerciseOptions.length ? (
                exerciseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))
              ) : (
                <option value="">No logged exercises</option>
              )}
            </select>
            <span>
              {exerciseData.length} logged session{exerciseData.length === 1 ? "" : "s"} in the
              active view
            </span>
          </PremiumCard>
          {exerciseData.length >= 2 ? (
            <ComparisonChart
              title={exerciseById(selectedExercise)?.name ?? "Exercise history"}
              description={`${rangeLabel} · best logged load (lb) versus completed repetitions`}
              data={exerciseData}
              series={exerciseSeries}
              kind="line"
              mode={comparisonMode}
              onModeChange={setComparisonMode}
              onOpenEntry={openEntry}
              quality={{ state: "ready", sampleSize: exerciseData.length, confidence: "high" }}
            />
          ) : (
            <DataState
              quality={{
                state: exerciseData.length ? "partial" : "needs_more_data",
                sampleSize: exerciseData.length,
                requiredHistory: 2,
              }}
              title={
                exerciseData.length
                  ? "One logged exercise session"
                  : "No exercise history in this view"
              }
              description="At least two logged sessions are required before a trend is drawn. Exact sets remain available below."
            />
          )}
          <ExerciseEntries
            workouts={filteredWorkouts}
            exerciseId={selectedExercise}
            onOpenWorkout={setSelectedWorkout}
          />
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.muscles = node)}
          aria-labelledby="training-muscles-heading"
        >
          <SectionHeader
            eyebrow="Muscle evidence"
            title="Distribution, balance, and body context"
            description="Range distribution is based on logged working volume. The heatmap preserves the existing all-history analytics contract."
          />
          <div className="training-muscle-grid">
            <PremiumCard className="training-muscle-distribution">
              <h3>Volume distribution · {rangeLabel}</h3>
              {muscleDistribution.length ? (
                muscleDistribution.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedMuscle(item.name)}
                    aria-label={`${capitalize(item.name)}, ${formatNumber(item.volume)} pounds, ${item.percent} percent of distributed volume`}
                  >
                    <span>
                      <strong>{capitalize(item.name)}</strong>
                      <small>
                        {item.sets} sets · last{" "}
                        {item.lastTrained
                          ? new Date(item.lastTrained).toLocaleDateString()
                          : "unknown"}
                      </small>
                    </span>
                    <span className="training-muscle-bar">
                      <i style={{ width: `${item.percent}%` }} />
                      <b>{item.percent}%</b>
                    </span>
                  </button>
                ))
              ) : (
                <p className="training-empty-copy">
                  No muscle volume is available for the active filters.
                </p>
              )}
              {muscleDistribution.length < 2 && (
                <div className="training-honesty-note" role="status">
                  Imbalance is not interpreted without distribution across at least two muscle
                  groups.
                </div>
              )}
            </PremiumCard>
            <PremiumCard className="training-deep-heatmap">
              <div className="training-deep-heatmap__header">
                <div>
                  <p className="eyebrow">Interactive body map</p>
                  <h3>{capitalize(heatMode)} evidence</h3>
                </div>
                <StatusBadge tone="neutral">All-history contract</StatusBadge>
              </div>
              <div className="training-heat-controls">
                <div role="group" aria-label="Body side">
                  {(["front", "back"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      aria-pressed={bodySide === side}
                      onClick={() => setBodySide(side)}
                    >
                      {capitalize(side)}
                    </button>
                  ))}
                </div>
                <div role="group" aria-label="Heatmap mode">
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
              <BodyHeatmap
                key={bodySide}
                values={heatValues}
                mode={heatMode}
                side={bodySide}
                onSelect={setSelectedMuscle}
                selected={selectedMuscle}
              />
              <p className="training-heat-caption">
                Select a labeled muscle region for exact range evidence. Color is never the only
                identifier.
              </p>
            </PremiumCard>
          </div>
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.records = node)}
          aria-labelledby="training-records-heading"
        >
          <SectionHeader
            eyebrow="Achievements"
            title="Personal-record progression"
            description="Only stored PR entries appear. Prior improvement is withheld when no earlier stored record exists."
          />
          {rangePrs.length ? (
            <div className="training-pr-timeline">
              {rangePrs.map((record) => {
                const prior = [...view.prs]
                  .filter(
                    (candidate) =>
                      candidate.exerciseId === record.exerciseId && candidate.date < record.date,
                  )
                  .sort((a, b) => b.date - a.date)[0];
                return (
                  <PremiumCard key={record.id} className="training-pr-card">
                    <Trophy size={20} />
                    <div>
                      <span>{new Date(record.date).toLocaleDateString()}</span>
                      <h3>{exerciseById(record.exerciseId)?.name ?? record.exerciseId}</h3>
                      <p>
                        {record.weight != null ? `${record.weight} lb` : `${record.value}`}{" "}
                        {record.reps != null ? `× ${record.reps} reps` : ""} · {record.type}
                      </p>
                    </div>
                    <div>
                      <strong>{record.value}</strong>
                      <span>
                        {prior
                          ? `${record.value - prior.value >= 0 ? "+" : ""}${record.value - prior.value} vs prior`
                          : "Prior record unavailable"}
                      </span>
                    </div>
                  </PremiumCard>
                );
              })}
            </div>
          ) : (
            <DataState
              quality={{ state: "needs_more_data", sampleSize: 0 }}
              title="No personal records in this range"
              description="No achievement is invented. Finish workouts with supported weight-and-repetition entries to create legitimate records."
            />
          )}
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.history = node)}
          aria-labelledby="training-history-heading"
        >
          <SectionHeader
            eyebrow="Underlying history"
            title="Workout entries"
            description="Individual workouts, notes, exercises, and exact sets remain accessible."
          />
          <WorkoutHistoryTable workouts={filteredWorkouts} onOpen={setSelectedWorkout} />
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.cardio = node)}
          aria-labelledby="training-cardio-heading"
        >
          <SectionHeader
            eyebrow="Cardio"
            title="Session evidence"
            description="Only stored duration, distance, and explicitly logged fields are shown."
          />
          {rangeCardio.length ? (
            <div className="training-cardio-layout">
              <PremiumCard className="training-cardio-summary">
                <HeartPulse size={22} />
                <div>
                  <span>Total duration</span>
                  <strong>{rangeCardio.reduce((sum, item) => sum + item.minutes, 0)} min</strong>
                  <p>
                    {rangeCardio.length} logged session{rangeCardio.length === 1 ? "" : "s"} ·{" "}
                    {rangeLabel}
                  </p>
                </div>
              </PremiumCard>
              <div className="training-cardio-entries">
                {[...rangeCardio]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((entry) => (
                    <PremiumCard key={entry.id}>
                      <div>
                        <strong>{entry.type}</strong>
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p>
                        {entry.minutes} min
                        {entry.distanceMi != null ? ` · ${entry.distanceMi} mi` : ""}
                      </p>
                      {entry.notes && <small>{entry.notes}</small>}
                    </PremiumCard>
                  ))}
              </div>
              {rangeCardio.length < 2 && (
                <DataState
                  quality={{ state: "partial", sampleSize: rangeCardio.length, requiredHistory: 2 }}
                  title="Limited cardio history"
                  description="One session is available, so no cardio trend or pace claim is shown. Log another cardio session for a comparison."
                />
              )}
            </div>
          ) : (
            <DataState
              quality={{ state: "needs_more_data", sampleSize: 0 }}
              title="No cardio logged in this view"
              description="This is missing cardio history, not a measured zero. Use the Training Daily cardio pathway to log a session."
            />
          )}
        </section>

        <section
          className="training-deep-section"
          ref={(node) => void (sectionRefs.current.comparison = node)}
          aria-labelledby="training-comparison-heading"
        >
          <SectionHeader
            eyebrow="Training comparison"
            title={sessionName}
            description="A Training-scoped use of the shared comparison system. Configuration and names are session-only in Phase A."
          />
          <PremiumCard className="training-comparison-builder">
            <div className="training-comparison-builder__header">
              <div>
                <SlidersHorizontal size={18} />
                <strong>Visible metrics</strong>
              </div>
              <span>{comparisonMetrics.length} selected</span>
            </div>
            <div className="training-metric-picker">
              {METRICS.map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  aria-pressed={comparisonMetrics.includes(metric.id)}
                  onClick={() => toggleMetric(metric.id)}
                >
                  {comparisonMetrics.includes(metric.id) ? <X size={13} /> : <Target size={13} />}
                  {metric.label}
                  <small>{metric.unit}</small>
                </button>
              ))}
            </div>
            <div className="training-session-actions">
              <button
                type="button"
                onClick={() =>
                  setSessionName((name) =>
                    name === "Training comparison"
                      ? "My training comparison"
                      : "Training comparison",
                  )
                }
              >
                Rename session view
              </button>
              <button type="button" onClick={() => setComparisonMetrics((items) => [...items])}>
                <Save size={14} /> Save for session
              </button>
              <span>Resets after reload · not added to a persistent chart library</span>
            </div>
          </PremiumCard>
          {comparisonMode === "raw" && uniqueUnits.size > 2 && (
            <div className="premium-chart-warning" role="alert">
              Incompatible raw units exceed the two-axis maximum. Hide a metric or use normalized,
              indexed, or aligned mode.
            </div>
          )}
          {comparisonMetrics.length > 5 && (
            <div className="premium-chart-warning" role="status">
              Complex comparison: more than five visible series can reduce readability. No selection
              was discarded.
            </div>
          )}
          <ComparisonChart
            title={sessionName}
            description={`${rangeLabel} · exact logged entries · two raw axes maximum`}
            data={workloadData}
            series={workloadSeries}
            mode={comparisonMode}
            onModeChange={setComparisonMode}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            onOpenEntry={openEntry}
            onFocus={() => setFocusOpen(true)}
            quality={quality}
          />
          <button
            type="button"
            className="training-table-toggle"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((open) => !open)}
          >
            <Table2 size={16} /> Underlying data table
          </button>
          {tableOpen && <UnderlyingTable data={workloadData} series={workloadSeries} />}
          <PremiumCard className="training-correlation-note">
            <Scale size={18} />
            <div>
              <strong>Correlation unavailable</strong>
              <p>
                The current analytics contract does not provide sample size, confidence, direction,
                strength, range, and threshold metadata. No local coefficient or causal claim is
                calculated.
              </p>
            </div>
          </PremiumCard>
        </section>

        <section
          className="training-deep-section training-data-quality"
          aria-labelledby="training-quality-heading"
        >
          <SectionHeader
            eyebrow="Evidence"
            title="Data quality and confidence"
            description="The workspace distinguishes missing history, true logged values, partial ranges, and unsupported analysis."
          />
          <div className="training-quality-grid">
            <QualityItem
              title="Training history"
              quality={quality}
              detail={`${filteredWorkouts.length} matching workout entries`}
            />
            <QualityItem
              title="Recommendation"
              quality={
                evidenceCount === 3
                  ? { state: "ready", sourceCount: 3 }
                  : { state: "partial", sourceCount: evidenceCount }
              }
              detail={`${evidenceCount} of 3 available evidence sources`}
            />
            <QualityItem
              title="Exercise trend"
              quality={
                exerciseData.length >= 2
                  ? { state: "ready", sampleSize: exerciseData.length }
                  : {
                      state: "needs_more_data",
                      sampleSize: exerciseData.length,
                      requiredHistory: 2,
                    }
              }
              detail="Requires two logged sessions for the selected exercise"
            />
            <QualityItem
              title="Correlation"
              quality={{ state: "unsupported" }}
              detail="Required contract metadata is unavailable"
            />
          </div>
        </section>

        <button type="button" className="training-return-action" onClick={onReturnDaily}>
          <ArrowLeft size={17} /> Return to Training Daily View
        </button>
      </main>

      <BottomSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Training filters"
        height="tall"
      >
        <FilterControls
          range={range}
          onRangeChange={changeRange}
          filters={filters}
          onChange={setFilters}
          workoutNames={workoutNames}
          exercises={exerciseOptions}
          onReset={resetFilters}
        />
      </BottomSheet>
      <BottomSheet
        open={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        title="Workout detail"
        height="tall"
      >
        <WorkoutDetail workout={view.workouts.find((workout) => workout.id === selectedWorkout)} />
      </BottomSheet>
      <BottomSheet
        open={!!selectedMuscle}
        onClose={() => setSelectedMuscle(null)}
        title={selectedMuscle ? `${capitalize(selectedMuscle)} evidence` : "Muscle evidence"}
        height="tall"
      >
        <MuscleEvidence
          muscle={selectedMuscle}
          evidence={selectedMuscleEvidence}
          mode={heatMode}
          allHistoryValue={selectedMuscle ? heatValues[selectedMuscle] : undefined}
          rangeLabel={rangeLabel}
          workouts={filteredWorkouts}
          onOpenWorkout={(id) => {
            setSelectedMuscle(null);
            setSelectedWorkout(id);
          }}
        />
      </BottomSheet>
      <BottomSheet
        open={!!entryDate}
        onClose={() => setEntryDate(null)}
        title={entryDate ? `Entries · ${entryDate}` : "Logged entries"}
        height="tall"
      >
        <DateEntries
          date={entryDate}
          workouts={filteredWorkouts}
          cardio={rangeCardio}
          onOpenWorkout={(id) => {
            setEntryDate(null);
            setSelectedWorkout(id);
          }}
        />
      </BottomSheet>
      <ChartFocusMode
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        title={`${sessionName} · ${rangeLabel}`}
        range={range}
        onRangeChange={changeRange}
        mode={comparisonMode}
        onModeChange={setComparisonMode}
        series={workloadSeries}
        data={workloadData}
        onSave={() => undefined}
        chart={
          <ComparisonChart
            title={sessionName}
            description={`${rangeLabel} · focus view`}
            data={workloadData}
            series={workloadSeries}
            mode={comparisonMode}
            onModeChange={setComparisonMode}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            onOpenEntry={openEntry}
            quality={quality}
          />
        }
      />
    </div>
  );
}

const METRICS = [
  { id: "volume", label: "Training volume", unit: "lb", color: "#8b5cf6", axis: "left" as const },
  { id: "sets", label: "Completed sets", unit: "sets", color: "#22d3ee", axis: "right" as const },
  { id: "reps", label: "Repetitions", unit: "reps", color: "#34d399", axis: "right" as const },
  {
    id: "sessions",
    label: "Workout sessions",
    unit: "workouts",
    color: "#f472b6",
    axis: "right" as const,
  },
  {
    id: "minutes",
    label: "Cardio duration",
    unit: "min",
    color: "#60a5fa",
    axis: "right" as const,
  },
  {
    id: "soreness",
    label: "Logged soreness",
    unit: "score",
    color: "#f59e0b",
    axis: "right" as const,
  },
];

function metricSeries(ids: string[]): ChartSeries[] {
  return ids.map((id) => METRICS.find((item) => item.id === id)).filter(Boolean) as ChartSeries[];
}

function DataState({
  quality,
  title,
  description,
}: {
  quality: DataQualityDetails;
  title: string;
  description: string;
}) {
  return (
    <PremiumCard className="premium-state-surface">
      <DataQualityBadge quality={quality} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-white/50">{description}</p>
    </PremiumCard>
  );
}

function EvidenceRow({
  label,
  available,
  detail,
}: {
  label: string;
  available: boolean;
  detail: string;
}) {
  return (
    <div>
      <span data-available={available}>{available ? "Available" : "Missing"}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function AnalyticMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <PremiumCard>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </PremiumCard>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QualityItem({
  title,
  quality,
  detail,
}: {
  title: string;
  quality: DataQualityDetails;
  detail: string;
}) {
  return (
    <PremiumCard>
      <div>
        <strong>{title}</strong>
        <DataQualityBadge quality={quality} compact />
      </div>
      <p>{detail}</p>
    </PremiumCard>
  );
}

function FilterControls({
  range,
  onRangeChange,
  filters,
  onChange,
  workoutNames,
  exercises,
  onReset,
}: {
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  filters: Filters;
  onChange: (filters: Filters) => void;
  workoutNames: string[];
  exercises: { id: string; name: string }[];
  onReset: () => void;
}) {
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });
  return (
    <div className="training-filter-sheet">
      <label>
        Date range
        <select value={range} onChange={(event) => onRangeChange(event.target.value as RangeKey)}>
          {RANGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Category
        <select
          value={filters.category}
          onChange={(event) => update("category", event.target.value as CategoryFilter)}
        >
          <option value="all">Strength and cardio</option>
          <option value="strength">Strength only</option>
          <option value="cardio">Cardio only</option>
        </select>
      </label>
      <label>
        Completion
        <select
          value={filters.completion}
          onChange={(event) => update("completion", event.target.value as CompletionFilter)}
        >
          <option value="all">Completed and partial</option>
          <option value="complete">Completed workouts</option>
          <option value="partial">Partial workouts</option>
        </select>
      </label>
      <label>
        Workout
        <select value={filters.workout} onChange={(event) => update("workout", event.target.value)}>
          <option value="all">All workouts</option>
          {workoutNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Exercise
        <select
          value={filters.exercise}
          onChange={(event) => update("exercise", event.target.value)}
        >
          <option value="all">All exercises</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Muscle group
        <select value={filters.muscle} onChange={(event) => update("muscle", event.target.value)}>
          <option value="all">All muscle groups</option>
          {[
            "chest",
            "back",
            "shoulders",
            "biceps",
            "triceps",
            "core",
            "quads",
            "hamstrings",
            "glutes",
            "calves",
          ].map((muscle) => (
            <option key={muscle} value={muscle}>
              {capitalize(muscle)}
            </option>
          ))}
        </select>
      </label>
      <div className="training-filter-sheet__actions">
        <button type="button" onClick={onReset}>
          <RotateCcw size={15} /> Reset filters
        </button>
      </div>
    </div>
  );
}

function ExerciseEntries({
  workouts,
  exerciseId,
  onOpenWorkout,
}: {
  workouts: Workout[];
  exerciseId: string;
  onOpenWorkout: (id: string) => void;
}) {
  const entries = workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((item) => item.exerciseId === exerciseId)
        .map((item) => ({ workout, item })),
    )
    .sort((a, b) => b.workout.startedAt - a.workout.startedAt);
  return (
    <PremiumCard className="training-exercise-entries">
      <h3>Exact set entries</h3>
      {entries.length ? (
        entries.map(({ workout, item }) => (
          <button type="button" key={item.id} onClick={() => onOpenWorkout(workout.id)}>
            <span>
              <strong>{new Date(workout.startedAt).toLocaleDateString()}</strong>
              <small>{workout.name}</small>
            </span>
            <span>
              {item.sets
                .filter((set) => set.completed)
                .map((set) => `${set.weight ?? "—"} lb × ${set.reps ?? "—"}`)
                .join(" · ") || "No completed sets"}
            </span>
            <ChevronRight size={16} />
          </button>
        ))
      ) : (
        <p className="training-empty-copy">
          No exact set entries match the selected exercise and filters.
        </p>
      )}
    </PremiumCard>
  );
}

function WorkoutHistoryTable({
  workouts,
  onOpen,
}: {
  workouts: Workout[];
  onOpen: (id: string) => void;
}) {
  if (!workouts.length)
    return (
      <DataState
        quality={{ state: "needs_more_data", sampleSize: 0 }}
        title="No workout history matches this view"
        description="Choose a broader range or reset filters. No missing session is presented as a zero."
      />
    );
  return (
    <div className="training-history-table-wrap">
      <table className="training-history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Workout</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Exercises</th>
            <th>Sets</th>
            <th>Volume</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...workouts]
            .sort((a, b) => b.startedAt - a.startedAt)
            .map((workout) => {
              const sets = workout.exercises.reduce(
                (sum, item) => sum + item.sets.filter((set) => set.completed).length,
                0,
              );
              const duration = workout.endedAt
                ? Math.max(1, Math.round((workout.endedAt - workout.startedAt) / 60_000))
                : null;
              return (
                <tr key={workout.id}>
                  <td>{new Date(workout.startedAt).toLocaleDateString()}</td>
                  <td>
                    <strong>{workout.name}</strong>
                    {workout.notes && <small>{workout.notes}</small>}
                  </td>
                  <td>{workout.endedAt ? "Completed" : "Partial"}</td>
                  <td>{duration == null ? "—" : `${duration} min`}</td>
                  <td>{workout.exercises.length}</td>
                  <td>{sets}</td>
                  <td>{formatNumber(workoutVolume(workout))} lb</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onOpen(workout.id)}
                      aria-label={`Open ${workout.name} workout detail`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function WorkoutDetail({ workout }: { workout?: Workout }) {
  if (!workout) return <p className="training-empty-copy">Workout entry is unavailable.</p>;
  return (
    <div className="training-workout-detail">
      <div className="training-workout-detail__summary">
        <h3>{workout.name}</h3>
        <p>
          {new Date(workout.startedAt).toLocaleString()} ·{" "}
          {workout.endedAt ? "Completed" : "Partial"}
        </p>
        <strong>{formatNumber(workoutVolume(workout))} lb logged volume</strong>
        {workout.notes && <blockquote>{workout.notes}</blockquote>}
      </div>
      {workout.exercises.map((item) => (
        <PremiumCard key={item.id}>
          <h4>{exerciseById(item.exerciseId)?.name ?? item.exerciseId}</h4>
          {item.notes && <p>{item.notes}</p>}
          <table>
            <thead>
              <tr>
                <th>Set</th>
                <th>Load</th>
                <th>Reps</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {item.sets.map((set, index) => (
                <tr key={set.id}>
                  <td>{index + 1}</td>
                  <td>{set.weight == null ? "—" : `${set.weight} lb`}</td>
                  <td>{set.reps ?? "—"}</td>
                  <td>{set.modifier ?? "normal"}</td>
                  <td>{set.completed ? "Completed" : "Not completed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PremiumCard>
      ))}
    </div>
  );
}

function MuscleEvidence({
  muscle,
  evidence,
  mode,
  allHistoryValue,
  rangeLabel,
  workouts,
  onOpenWorkout,
}: {
  muscle: string | null;
  evidence?: ReturnType<typeof distributionForWorkouts>[number];
  mode: HeatMode;
  allHistoryValue?: number;
  rangeLabel: string;
  workouts: Workout[];
  onOpenWorkout: (id: string) => void;
}) {
  if (!muscle) return null;
  const supporting = workouts
    .filter((workout) =>
      workout.exercises.some((item) => {
        const exercise = exerciseById(item.exerciseId);
        return [...(exercise?.primary ?? []), ...(exercise?.secondary ?? [])].includes(
          muscle as never,
        );
      }),
    )
    .sort((a, b) => b.startedAt - a.startedAt);
  return (
    <div className="training-muscle-evidence">
      <div className="training-muscle-evidence__metrics">
        <AnalyticMetric
          label="Range volume"
          value={evidence ? formatNumber(evidence.volume) : "—"}
          unit="lb"
        />
        <AnalyticMetric label="Completed sets" value={evidence?.sets ?? "—"} unit="sets" />
        <AnalyticMetric
          label="Distribution"
          value={evidence ? `${evidence.percent}%` : "—"}
          unit={rangeLabel}
        />
        <AnalyticMetric
          label={`${capitalize(mode)} signal`}
          value={allHistoryValue == null ? "—" : `${Math.round(allHistoryValue * 100)}%`}
          unit="existing all-history contract"
        />
      </div>
      {evidence ? (
        <p>
          This range contains {supporting.length} supporting workout
          {supporting.length === 1 ? "" : "s"}. Distribution is descriptive; it does not diagnose
          weakness, injury, or overtraining.
        </p>
      ) : (
        <DataState
          quality={{ state: "needs_more_data" }}
          title="No matching muscle evidence"
          description="No logged workout in this filtered range contributes to this muscle."
        />
      )}
      {supporting.map((workout) => (
        <button key={workout.id} type="button" onClick={() => onOpenWorkout(workout.id)}>
          <History size={15} />
          <span>
            <strong>{workout.name}</strong>
            <small>{new Date(workout.startedAt).toLocaleDateString()}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      ))}
    </div>
  );
}

function DateEntries({
  date,
  workouts,
  cardio,
  onOpenWorkout,
}: {
  date: string | null;
  workouts: Workout[];
  cardio: AppState["cardioEntries"];
  onOpenWorkout: (id: string) => void;
}) {
  if (!date) return null;
  const matchingWorkouts = workouts.filter((workout) => dateLabel(workout.startedAt) === date);
  const matchingCardio = cardio.filter((entry) => dateLabel(entry.createdAt) === date);
  return (
    <div className="training-date-entries">
      {matchingWorkouts.map((workout) => (
        <button key={workout.id} type="button" onClick={() => onOpenWorkout(workout.id)}>
          <Dumbbell size={17} />
          <span>
            <strong>{workout.name}</strong>
            <small>
              {formatNumber(workoutVolume(workout))} lb · {workout.exercises.length} exercises
            </small>
          </span>
          <ChevronRight size={15} />
        </button>
      ))}
      {matchingCardio.map((entry) => (
        <PremiumCard key={entry.id}>
          <HeartPulse size={17} />
          <div>
            <strong>{entry.type}</strong>
            <small>
              {entry.minutes} min{entry.distanceMi != null ? ` · ${entry.distanceMi} mi` : ""}
            </small>
          </div>
        </PremiumCard>
      ))}
      {!matchingWorkouts.length && !matchingCardio.length && (
        <p className="training-empty-copy">
          No underlying entry is available for this selected date.
        </p>
      )}
    </div>
  );
}

function UnderlyingTable({ data, series }: { data: ChartPoint[]; series: ChartSeries[] }) {
  return (
    <div className="training-underlying-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {series.map((item) => (
              <th key={item.id}>
                {item.label} ({item.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              {series.map((item) => (
                <td key={item.id}>
                  {point[item.id] == null ? "Missing" : Number(point[item.id]).toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildWorkloadData(
  workouts: Workout[],
  cardio: AppState["cardioEntries"],
  state: AppState,
  cutoff: number,
  range: RangeKey,
): WorkloadPoint[] {
  const map = new Map<string, WorkloadPoint>();
  const get = (timestamp: number) => {
    const date = dateLabel(timestamp);
    const existing = map.get(date) ?? {
      date,
      __index: timestamp,
      volume: null,
      sets: null,
      reps: null,
      sessions: null,
      minutes: null,
      soreness: null,
    };
    existing.__index = Math.min(Number(existing.__index), timestamp);
    map.set(date, existing);
    return existing;
  };
  workouts.forEach((workout) => {
    const point = get(workout.startedAt);
    point.volume = (point.volume ?? 0) + workoutVolume(workout);
    point.sets =
      (point.sets ?? 0) +
      workout.exercises.reduce(
        (sum, item) => sum + item.sets.filter((set) => set.completed).length,
        0,
      );
    point.reps =
      (point.reps ?? 0) +
      workout.exercises.reduce(
        (sum, item) =>
          sum + item.sets.reduce((inner, set) => inner + (set.completed ? (set.reps ?? 0) : 0), 0),
        0,
      );
    point.sessions = (point.sessions ?? 0) + 1;
  });
  cardio.forEach((entry) => {
    const point = get(entry.createdAt);
    point.minutes = (point.minutes ?? 0) + entry.minutes;
  });
  state.recoveryCheckIns
    .filter((entry) => range === "all" || entry.createdAt >= cutoff)
    .forEach((entry) => {
      const point = get(entry.createdAt);
      point.soreness = entry.soreness;
    });
  return [...map.values()].sort((a, b) => Number(a.__index) - Number(b.__index));
}

function buildExerciseData(workouts: Workout[], exerciseId: string): ChartPoint[] {
  return workouts
    .flatMap((workout) => {
      const items = workout.exercises.filter((item) => item.exerciseId === exerciseId);
      if (!items.length) return [];
      const completed = items.flatMap((item) => item.sets.filter((set) => set.completed));
      const loads = completed
        .map((set) => set.weight)
        .filter((value): value is number => value != null);
      return [
        {
          date: dateLabel(workout.startedAt),
          __index: workout.startedAt,
          load: loads.length ? Math.max(...loads) : null,
          reps: completed.reduce((sum, set) => sum + (set.reps ?? 0), 0) || null,
        },
      ];
    })
    .sort((a, b) => Number(a.__index) - Number(b.__index));
}

function distributionForWorkouts(workouts: Workout[]) {
  const map = new Map<string, { volume: number; sets: number; lastTrained: number }>();
  workouts.forEach((workout) =>
    workout.exercises.forEach((item) => {
      const exercise = exerciseById(item.exerciseId);
      if (!exercise) return;
      const volume = item.sets.reduce(
        (sum, set) => sum + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0),
        0,
      );
      const sets = item.sets.filter((set) => set.completed).length;
      exercise.primary.forEach((muscle) => {
        const current = map.get(muscle) ?? { volume: 0, sets: 0, lastTrained: 0 };
        current.volume += volume;
        current.sets += sets;
        current.lastTrained = Math.max(current.lastTrained, workout.startedAt);
        map.set(muscle, current);
      });
      (exercise.secondary ?? []).forEach((muscle) => {
        const current = map.get(muscle) ?? { volume: 0, sets: 0, lastTrained: 0 };
        current.volume += volume * 0.4;
        current.sets += sets;
        current.lastTrained = Math.max(current.lastTrained, workout.startedAt);
        map.set(muscle, current);
      });
    }),
  );
  const total = [...map.values()].reduce((sum, item) => sum + item.volume, 0);
  return [...map.entries()]
    .map(([name, item]) => ({
      name,
      volume: Math.round(item.volume),
      sets: item.sets,
      lastTrained: item.lastTrained,
      percent: total ? Math.round((item.volume / total) * 100) : 0,
    }))
    .filter((item) => item.volume > 0)
    .sort((a, b) => b.volume - a.volume);
}

function activeFilters(
  filters: Filters,
  _workouts: string[],
  exercises: { id: string; name: string }[],
) {
  const labels: string[] = [];
  if (filters.category !== "all")
    labels.push(filters.category === "strength" ? "Strength only" : "Cardio only");
  if (filters.completion !== "all")
    labels.push(filters.completion === "complete" ? "Completed" : "Partial");
  if (filters.workout !== "all") labels.push(filters.workout);
  if (filters.exercise !== "all")
    labels.push(exercises.find((item) => item.id === filters.exercise)?.name ?? filters.exercise);
  if (filters.muscle !== "all") labels.push(capitalize(filters.muscle));
  return labels;
}

function compareActualWindows(workouts: Workout[], days: number) {
  const now = Date.now();
  const currentEntries = workouts.filter((workout) => workout.startedAt >= now - days * DAY);
  const previousEntries = workouts.filter(
    (workout) => workout.startedAt < now - days * DAY && workout.startedAt >= now - 2 * days * DAY,
  );
  const current = currentEntries.length
    ? currentEntries.reduce((sum, workout) => sum + workoutVolume(workout), 0)
    : null;
  const previous = previousEntries.length
    ? previousEntries.reduce((sum, workout) => sum + workoutVolume(workout), 0)
    : null;
  return {
    current,
    previous,
    delta: current != null && previous ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

function uniqueTrainingDays(workouts: Workout[]) {
  return new Set(workouts.map((workout) => new Date(workout.startedAt).toDateString())).size;
}
function medianGap(workouts: Workout[]) {
  const sorted = [...workouts].map((workout) => workout.startedAt).sort((a, b) => a - b);
  const gaps = sorted
    .slice(1)
    .map((value, index) => Math.round((value - sorted[index]) / DAY))
    .sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 0;
}
function dateLabel(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}
