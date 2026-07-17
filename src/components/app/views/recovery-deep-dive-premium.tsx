import {
  Activity,
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Dumbbell,
  Info,
  Moon,
  RefreshCw,
  Table2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { muscleMap } from "@/lib/analytics";
import type { FatigueLevel, RecoveryCheckIn, SleepEntry, Workout } from "@/lib/types";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { BottomSheet } from "@/components/app/sheet";
import {
  DataQualityBadge,
  PremiumCard,
  SectionHeader,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";
import {
  ComparisonChart,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
} from "@/components/app/premium-visualization";
import {
  averageFinite,
  buildRecoveryTimeline,
  calculateRecoveryReadiness,
  isRecoveryNumber,
  recoveryDateKey,
  recoveryReadinessStatus,
  recoveryRecommendation,
  workoutCompletedSets,
  workoutVolume,
  type RecoveryDataState,
  type RecoveryTimelinePoint,
} from "@/components/app/views/recovery-analytics";

type RecoveryRange = "7d" | "14d" | "30d" | "90d";
type SleepMetric = "hours" | "quality";
type CheckMetric = "energy" | "soreness" | "stress" | "motivation";

export interface RecoveryDeepDiveContext {
  range: RecoveryRange;
  selectedDate?: string;
  sleepMetric: SleepMetric;
  checkMetric: CheckMetric;
}

interface RecoveryDeepDivePremiumProps {
  context: RecoveryDeepDiveContext;
  onContextChange: (context: RecoveryDeepDiveContext) => void;
  onBack: () => void;
  onLogSleep: () => void;
  onLogCheckIn: () => void;
  onUpdateFatigue: () => void;
}

const RANGE_DAYS: Record<RecoveryRange, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
const RANGE_LABELS: Record<RecoveryRange, string> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "90d": "90 days",
};
const CHECK_METRICS: Array<{
  id: CheckMetric;
  label: string;
  direction: string;
  color: string;
}> = [
  { id: "energy", label: "Energy", direction: "Higher is generally positive", color: "#34d399" },
  {
    id: "soreness",
    label: "Soreness",
    direction: "Higher means more user-reported soreness",
    color: "#fb7185",
  },
  {
    id: "stress",
    label: "Stress",
    direction: "Higher means more reported stress",
    color: "#f59e0b",
  },
  {
    id: "motivation",
    label: "Motivation",
    direction: "Higher is generally positive",
    color: "#38bdf8",
  },
];
const FATIGUE_LABELS: Record<FatigueLevel, string> = {
  fresh: "Fresh",
  moderate: "Moderate",
  fatigued: "Fatigued",
  very: "Very fatigued",
};
const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

const formatDateTime = (timestamp?: number) =>
  timestamp
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(timestamp))
    : "No source record";

const formatDelta = (current: number | null, previous: number | null, unit = "") => {
  if (current == null || previous == null) return "No comparable prior period";
  const delta = current - previous;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${unit} versus prior period`;
};

const qualityForPoints = (points: RecoveryTimelinePoint[]): DataQualityDetails => {
  const usable = points.filter((point) => point.readiness != null);
  if (!usable.length) return { state: "needs_more_data", confidence: "low", sampleSize: 0 };
  if (usable.some((point) => point.state === "invalid"))
    return { state: "unavailable", confidence: "low", sampleSize: usable.length };
  if (usable.some((point) => point.state === "unavailable"))
    return { state: "unavailable", confidence: "low", sampleSize: usable.length };
  if (usable.some((point) => point.state === "stale"))
    return { state: "stale", confidence: "medium", sampleSize: usable.length };
  return usable.length >= 3
    ? { state: "ready", confidence: "high", sampleSize: usable.length }
    : { state: "partial", confidence: "medium", sampleSize: usable.length, requiredHistory: 3 };
};

export function RecoveryDeepDivePremiumView({
  context,
  onContextChange,
  onBack,
  onLogSleep,
  onLogCheckIn,
  onUpdateFatigue,
}: RecoveryDeepDivePremiumProps) {
  const { state } = useStore();
  const [chartMode, setChartMode] = useState<ComparisonMode>("raw");
  const [sleepChartMode, setSleepChartMode] = useState<ComparisonMode>("raw");
  const [checkChartMode, setCheckChartMode] = useState<ComparisonMode>("raw");
  const [tableOpen, setTableOpen] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");
  const [sourceDate, setSourceDate] = useState<string>();
  const now = Date.now();
  const days = RANGE_DAYS[context.range];
  const cutoff = now - days * 86_400_000;
  const previousCutoff = now - days * 2 * 86_400_000;
  const timeline = useMemo(
    () => buildRecoveryTimeline(state.sleepEntries, state.recoveryCheckIns, days, now),
    [days, now, state.recoveryCheckIns, state.sleepEntries],
  );
  const twoPeriodTimeline = useMemo(
    () => buildRecoveryTimeline(state.sleepEntries, state.recoveryCheckIns, days * 2, now),
    [days, now, state.recoveryCheckIns, state.sleepEntries],
  );
  const previousTimeline = twoPeriodTimeline.filter(
    (point) => point.timestamp >= previousCutoff && point.timestamp < cutoff,
  );
  const lastSleep = [...state.sleepEntries].sort((a, b) => b.createdAt - a.createdAt)[0];
  const lastCheck = [...state.recoveryCheckIns].sort((a, b) => b.createdAt - a.createdAt)[0];
  const current = calculateRecoveryReadiness(lastSleep, lastCheck, now);
  const currentAverage = averageFinite(timeline.map((point) => point.readiness));
  const previousAverage = averageFinite(previousTimeline.map((point) => point.readiness));
  const lastUpdated = Math.max(lastSleep?.createdAt ?? 0, lastCheck?.createdAt ?? 0);
  const selectedDate = timeline.some((point) => point.date === context.selectedDate)
    ? context.selectedDate
    : timeline.at(-1)?.date;
  const chartPoints: ChartPoint[] = timeline
    .filter((point) => point.readiness != null)
    .map((point) => ({ date: point.date, readiness: point.readiness }));
  const chartSeries: ChartSeries[] = [
    { id: "readiness", label: "Readiness", unit: "%", color: "#34d399" },
  ];
  const rangeSleeps = state.sleepEntries
    .filter((entry) => entry.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt);
  const usableSleeps = rangeSleeps.filter(
    (entry) =>
      isRecoveryNumber(entry.hours) &&
      isRecoveryNumber(entry.quality) &&
      entry.hours >= 0 &&
      entry.hours <= 24 &&
      entry.quality >= 0 &&
      entry.quality <= 10,
  );
  const invalidSleeps = rangeSleeps.length - usableSleeps.length;
  const sleepAverage = averageFinite(usableSleeps.map((entry) => entry.hours));
  const qualityAverage = averageFinite(usableSleeps.map((entry) => entry.quality));
  const sleepSpread = usableSleeps.length
    ? Math.max(...usableSleeps.map((entry) => entry.hours)) -
      Math.min(...usableSleeps.map((entry) => entry.hours))
    : null;
  const sleepChartData: ChartPoint[] = usableSleeps.map((entry) => ({
    date: recoveryDateKey(entry.createdAt),
    value: context.sleepMetric === "hours" ? entry.hours : entry.quality,
  }));
  const rangeChecks = state.recoveryCheckIns
    .filter((entry) => entry.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt);
  const usableChecks = rangeChecks.filter((entry) =>
    [entry.energy, entry.soreness, entry.stress, entry.motivation].every(
      (value) => isRecoveryNumber(value) && value >= 0 && value <= 10,
    ),
  );
  const invalidChecks = rangeChecks.length - usableChecks.length;
  const activeCheckMetric = CHECK_METRICS.find((metric) => metric.id === context.checkMetric)!;
  const checkAverage = averageFinite(usableChecks.map((entry) => entry[context.checkMetric]));
  const checkChartData: ChartPoint[] = usableChecks.map((entry) => ({
    date: recoveryDateKey(entry.createdAt),
    value: entry[context.checkMetric],
  }));
  const rangeWorkouts = state.workouts.filter((workout) => workout.startedAt >= cutoff);
  const workoutByDate = new Map<string, Workout[]>();
  rangeWorkouts.forEach((workout) => {
    const key = recoveryDateKey(workout.startedAt);
    workoutByDate.set(key, [...(workoutByDate.get(key) ?? []), workout]);
  });
  const aligned = timeline
    .filter((point) => point.readiness != null && workoutByDate.has(point.date))
    .map((point) => {
      const workouts = workoutByDate.get(point.date)!;
      return {
        date: point.date,
        readiness: point.readiness!,
        volume: workouts.reduce((sum, workout) => sum + workoutVolume(workout), 0),
        sets: workouts.reduce((sum, workout) => sum + workoutCompletedSets(workout).length, 0),
        workouts: workouts.length,
      };
    });
  const alignedAverageVolume = averageFinite(aligned.map((point) => point.volume));
  const alignedAverageReadiness = averageFinite(aligned.map((point) => point.readiness));
  const highVolumeLowReadiness = aligned.filter(
    (point) =>
      alignedAverageVolume != null &&
      alignedAverageReadiness != null &&
      point.volume > alignedAverageVolume &&
      point.readiness < alignedAverageReadiness,
  ).length;
  const trainingSummary =
    aligned.length >= 2
      ? `Higher-than-average logged volume occurred alongside lower-than-average readiness on ${highVolumeLowReadiness} of ${aligned.length} aligned days. Association only, not causation.`
      : "There is not enough aligned training and recovery data to describe a reliable pattern.";
  const fatigue = MUSCLES.filter((muscle) => state.muscleFatigue[muscle] != null);
  const bodyValues = muscleMap(state, "recovery");
  const sourcePoint = timeline.find((point) => point.date === sourceDate);

  const updateContext = (updates: Partial<RecoveryDeepDiveContext>) =>
    onContextChange({ ...context, ...updates });
  const primaryAction =
    current.sleepInvalid || current.sleepStale || !lastSleep
      ? onLogSleep
      : current.checkInvalid || current.checkStale || !lastCheck
        ? onLogCheckIn
        : () => document.getElementById("recovery-trend")?.scrollIntoView({ behavior: "smooth" });
  const primaryLabel =
    current.sleepInvalid || current.sleepStale || !lastSleep
      ? "Update sleep"
      : current.checkInvalid || current.checkStale || !lastCheck
        ? "Complete check-in"
        : "Inspect readiness trend";

  return (
    <div className="recovery-deep-dive-premium">
      <header className="recovery-deep-header">
        <button type="button" className="recovery-deep-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Daily View
        </button>
        <div>
          <p className="eyebrow">Recovery analysis</p>
          <h1>Recovery Deep Dive</h1>
          <p>Readiness history, exact contributor records, and careful training context.</p>
        </div>
        <div className="recovery-deep-range" role="group" aria-label="Recovery date range">
          {(Object.keys(RANGE_DAYS) as RecoveryRange[]).map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={context.range === range}
              onClick={() => updateContext({ range, selectedDate: undefined })}
            >
              {range === "90d" ? "90D" : range.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="recovery-deep-main">
        <PremiumCard className="recovery-deep-hero" as="section">
          <div className="recovery-deep-hero__copy">
            <div className="recovery-deep-hero__heading">
              <div>
                <p className="eyebrow">Current readiness</p>
                <h2>{recoveryReadinessStatus(current.score)}</h2>
              </div>
              <DataQualityBadge quality={current.quality} />
            </div>
            <p className="recovery-deep-explanation">{recoveryRecommendation(current)}</p>
            <div className="recovery-deep-hero__facts">
              <span>
                <strong>{current.parts}</strong> usable contributors
              </span>
              <span>
                <strong>{current.quality.confidence}</strong> confidence
              </span>
              <span>
                <strong>{formatDateTime(lastUpdated)}</strong> last updated
              </span>
            </div>
            <button type="button" className="recovery-deep-primary" onClick={primaryAction}>
              {primaryLabel} <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div
            className="recovery-deep-hero__score"
            aria-label={
              current.score == null ? "Readiness unavailable" : `Readiness ${current.score} percent`
            }
          >
            <strong>{current.score ?? "—"}</strong>
            {current.score != null && <span>%</span>}
            <small>{formatDelta(currentAverage, previousAverage, " points")}</small>
          </div>
        </PremiumCard>

        <section aria-labelledby="recovery-contributor-analysis-title">
          <SectionHeader
            eyebrow="Current evidence"
            title="Contributor analysis"
            description="Contributors are shown separately and are not described as causes."
          />
          <div className="recovery-deep-contributors">
            <ContributorAnalysisCard
              title="Sleep"
              icon={<Moon size={18} aria-hidden="true" />}
              entry={lastSleep}
              value={
                lastSleep && isRecoveryNumber(lastSleep.hours)
                  ? `${lastSleep.hours} h · quality ${lastSleep.quality}/10`
                  : "Unavailable"
              }
              contribution={current.sleepScore}
              invalid={current.sleepInvalid}
              stale={current.sleepStale}
              recentAverage={
                sleepAverage == null
                  ? "No recent average"
                  : `${sleepAverage.toFixed(1)} h recent average`
              }
              onOpen={() => lastSleep && setSourceDate(recoveryDateKey(lastSleep.createdAt))}
              onUpdate={onLogSleep}
            />
            <ContributorAnalysisCard
              title="Recovery check-in"
              icon={<Activity size={18} aria-hidden="true" />}
              entry={lastCheck}
              value={
                lastCheck
                  ? `Energy ${lastCheck.energy} · soreness ${lastCheck.soreness} · stress ${lastCheck.stress} · motivation ${lastCheck.motivation}`
                  : "Unavailable"
              }
              contribution={current.checkInScore}
              invalid={current.checkInvalid}
              stale={current.checkStale}
              recentAverage={
                checkAverage == null
                  ? "No recent average"
                  : `${activeCheckMetric.label} ${checkAverage.toFixed(1)}/10 recent average`
              }
              onOpen={() => lastCheck && setSourceDate(recoveryDateKey(lastCheck.createdAt))}
              onUpdate={onLogCheckIn}
            />
          </div>
        </section>

        <section id="recovery-trend" aria-labelledby="recovery-trend-title">
          <SectionHeader
            eyebrow="Readiness history"
            title="Recovery trend"
            description={`${RANGE_LABELS[context.range]} · exact logged dates · missing dates are not interpolated`}
          />
          {chartPoints.length ? (
            <>
              <ComparisonChart
                title="Readiness by logged date"
                description={`${chartPoints.length} scored dates · current versus prior period shown above`}
                data={chartPoints}
                series={chartSeries}
                mode={chartMode}
                onModeChange={setChartMode}
                selectedDate={selectedDate}
                onSelectedDateChange={(date) => updateContext({ selectedDate: date })}
                onOpenEntry={setSourceDate}
                quality={qualityForPoints(timeline)}
                animate
              />
              <button
                type="button"
                className="recovery-deep-table-toggle"
                aria-expanded={tableOpen}
                onClick={() => setTableOpen((open) => !open)}
              >
                <Table2 size={16} aria-hidden="true" />{" "}
                {tableOpen ? "Hide readiness data table" : "Show readiness data table"}
              </button>
              {tableOpen && <RecoveryDataTable points={timeline} onOpen={setSourceDate} />}
            </>
          ) : (
            <PremiumCard className="recovery-deep-empty" as="section">
              <CircleAlert size={21} aria-hidden="true" />
              <div>
                <h3>No readiness history in this range</h3>
                <p>
                  Log sleep or complete a check-in. No placeholder line or synthetic zero day is
                  shown.
                </p>
              </div>
              <button type="button" onClick={onLogSleep}>
                Log sleep
              </button>
            </PremiumCard>
          )}
        </section>

        <div className="recovery-deep-two-column">
          <section aria-labelledby="sleep-analysis-title">
            <SectionHeader
              eyebrow="Sleep evidence"
              title="Sleep analysis"
              description={`${usableSleeps.length} usable records · ${invalidSleeps} invalid · profile goal ${state.profile.sleepGoalH ?? "missing"} h`}
            />
            <PremiumCard className="recovery-deep-control-card">
              <div role="group" aria-label="Sleep analysis metric">
                {(["hours", "quality"] as SleepMetric[]).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    aria-pressed={context.sleepMetric === metric}
                    onClick={() => updateContext({ sleepMetric: metric })}
                  >
                    {metric === "hours" ? "Duration" : "Subjective quality"}
                  </button>
                ))}
              </div>
              <div className="recovery-deep-metric-strip">
                <span>
                  <small>Average duration</small>
                  <strong>{sleepAverage == null ? "—" : `${sleepAverage.toFixed(1)} h`}</strong>
                </span>
                <span>
                  <small>Average quality</small>
                  <strong>
                    {qualityAverage == null ? "—" : `${qualityAverage.toFixed(1)}/10`}
                  </strong>
                </span>
                <span>
                  <small>Recent spread</small>
                  <strong>{sleepSpread == null ? "—" : `${sleepSpread.toFixed(1)} h`}</strong>
                </span>
              </div>
            </PremiumCard>
            {sleepChartData.length ? (
              <ComparisonChart
                title={
                  context.sleepMetric === "hours" ? "Sleep duration" : "Subjective sleep quality"
                }
                description="User-entered sleep records only; no stages or wearable estimates"
                data={sleepChartData}
                series={[
                  {
                    id: "value",
                    label: context.sleepMetric === "hours" ? "Duration" : "Quality",
                    unit: context.sleepMetric === "hours" ? "h" : "/10",
                    color: "#38bdf8",
                  },
                ]}
                mode={sleepChartMode}
                onModeChange={setSleepChartMode}
                selectedDate={selectedDate}
                onSelectedDateChange={(date) => updateContext({ selectedDate: date })}
                onOpenEntry={setSourceDate}
                quality={
                  usableSleeps.length >= 3
                    ? { state: "ready", sampleSize: usableSleeps.length }
                    : { state: "partial", sampleSize: usableSleeps.length }
                }
                animate
              />
            ) : (
              <InlineMissing copy="No usable sleep records in this range." />
            )}
          </section>

          <section aria-labelledby="check-analysis-title">
            <SectionHeader
              eyebrow="Check-in evidence"
              title="Check-in analysis"
              description={`${usableChecks.length} usable records · ${invalidChecks} invalid · values remain on their entered 0–10 direction`}
            />
            <PremiumCard className="recovery-deep-control-card">
              <div role="group" aria-label="Recovery check-in metric">
                {CHECK_METRICS.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    aria-pressed={context.checkMetric === metric.id}
                    onClick={() => updateContext({ checkMetric: metric.id })}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
              <p className="recovery-direction-note">
                <Info size={15} aria-hidden="true" /> {activeCheckMetric.direction}. Values are not
                silently reversed.
              </p>
            </PremiumCard>
            {checkChartData.length ? (
              <ComparisonChart
                title={`${activeCheckMetric.label} by check-in date`}
                description={`${checkAverage?.toFixed(1) ?? "—"}/10 recent average · exact source values`}
                data={checkChartData}
                series={[
                  {
                    id: "value",
                    label: activeCheckMetric.label,
                    unit: "/10",
                    color: activeCheckMetric.color,
                  },
                ]}
                mode={checkChartMode}
                onModeChange={setCheckChartMode}
                selectedDate={selectedDate}
                onSelectedDateChange={(date) => updateContext({ selectedDate: date })}
                onOpenEntry={setSourceDate}
                quality={
                  usableChecks.length >= 3
                    ? { state: "ready", sampleSize: usableChecks.length }
                    : { state: "partial", sampleSize: usableChecks.length }
                }
                animate
              />
            ) : (
              <InlineMissing copy="No usable recovery check-ins in this range." />
            )}
          </section>
        </div>

        <section aria-labelledby="body-fatigue-title">
          <SectionHeader
            eyebrow="User-reported state"
            title="Body fatigue"
            description="This map reflects manually logged fatigue. It does not measure tissue recovery."
          />
          <div className="recovery-body-analysis">
            <PremiumCard className="recovery-body-map">
              <div className="recovery-body-side" role="group" aria-label="Body map side">
                {(["front", "back"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={side === value}
                    onClick={() => setSide(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <BodyHeatmap values={bodyValues} mode="recovery" side={side} compact />
            </PremiumCard>
            <PremiumCard className="recovery-fatigue-evidence">
              <div className="recovery-fatigue-heading">
                <div>
                  <p className="eyebrow">Current snapshot</p>
                  <h3>
                    {fatigue.length ? `${fatigue.length} muscles recorded` : "No fatigue recorded"}
                  </h3>
                </div>
                <button type="button" onClick={onUpdateFatigue}>
                  Update
                </button>
              </div>
              {fatigue.length ? (
                <ul>
                  {fatigue.map((muscle) => (
                    <li key={muscle}>
                      <span>{muscle}</span>
                      <StatusBadge
                        tone={
                          state.muscleFatigue[muscle] === "fresh"
                            ? "success"
                            : state.muscleFatigue[muscle] === "moderate"
                              ? "caution"
                              : "danger"
                        }
                      >
                        {FATIGUE_LABELS[state.muscleFatigue[muscle]!]}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No current muscle status is available. Missing status is not labeled fresh.</p>
              )}
              <small>
                Latest muscle-update timestamp is not stored. Recent training exposure is shown
                separately and is not mapped to tissue recovery.
              </small>
            </PremiumCard>
          </div>
        </section>

        <section aria-labelledby="training-recovery-title">
          <SectionHeader
            eyebrow="Exploratory comparison"
            title="Training and recovery"
            description="Real workout and recovery dates are aligned without a causal claim."
          />
          <PremiumCard className="recovery-training-summary">
            <div>
              <Dumbbell size={20} aria-hidden="true" />
              <p>{trainingSummary}</p>
            </div>
            <div className="recovery-deep-metric-strip">
              <span>
                <small>Workouts</small>
                <strong>{rangeWorkouts.length}</strong>
              </span>
              <span>
                <small>Aligned days</small>
                <strong>{aligned.length}</strong>
              </span>
              <span>
                <small>Completed sets</small>
                <strong>
                  {rangeWorkouts.reduce(
                    (sum, workout) => sum + workoutCompletedSets(workout).length,
                    0,
                  )}
                </strong>
              </span>
            </div>
          </PremiumCard>
          {aligned.length ? (
            <ComparisonChart
              title="Training volume alongside readiness"
              description={`${aligned.length} aligned dates · raw volume and readiness axes · association only`}
              data={aligned.map((point) => ({
                date: point.date,
                readiness: point.readiness,
                volume: point.volume,
              }))}
              series={[
                { id: "readiness", label: "Readiness", unit: "%", color: "#34d399", axis: "left" },
                {
                  id: "volume",
                  label: "Training volume",
                  unit: "lb",
                  color: "#a78bfa",
                  axis: "right",
                },
              ]}
              mode={chartMode}
              onModeChange={setChartMode}
              selectedDate={selectedDate}
              onSelectedDateChange={(date) => updateContext({ selectedDate: date })}
              onOpenEntry={setSourceDate}
              quality={
                aligned.length >= 3
                  ? { state: "ready", sampleSize: aligned.length }
                  : { state: "partial", sampleSize: aligned.length }
              }
              animate
            />
          ) : (
            <InlineMissing copy="No dates contain both a readiness estimate and a workout in this range." />
          )}
        </section>

        <section aria-labelledby="quality-timeline-title">
          <SectionHeader
            eyebrow="Evidence completeness"
            title="Data-quality timeline"
            description="The most recent dates explain usable, partial, missing, stale, and invalid evidence."
          />
          <QualityTimeline
            timeline={timeline}
            days={Math.min(days, 14)}
            now={now}
            onOpen={setSourceDate}
          />
        </section>

        <PremiumCard className="recovery-wearable-disclosure" as="section">
          <Clock3 size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">Unavailable signals</p>
            <h2>Wearable recovery is not connected</h2>
            <p>
              No HRV, resting heart rate, sleep stages, strain, respiratory rate, or sleep
              efficiency is estimated in this analysis.
            </p>
          </div>
          <StatusBadge tone="neutral">Not supported</StatusBadge>
        </PremiumCard>
      </main>

      <BottomSheet
        open={!!sourceDate}
        onClose={() => setSourceDate(undefined)}
        title={`Source records · ${sourceDate ?? ""}`}
        height="tall"
      >
        <SourceRecord
          point={sourcePoint}
          workouts={sourceDate ? (workoutByDate.get(sourceDate) ?? []) : []}
        />
      </BottomSheet>
    </div>
  );
}

function ContributorAnalysisCard({
  title,
  icon,
  entry,
  value,
  contribution,
  invalid,
  stale,
  recentAverage,
  onOpen,
  onUpdate,
}: {
  title: string;
  icon: ReactNode;
  entry?: SleepEntry | RecoveryCheckIn;
  value: string;
  contribution: number | null;
  invalid: boolean;
  stale: boolean;
  recentAverage: string;
  onOpen: () => void;
  onUpdate: () => void;
}) {
  const state = invalid ? "Invalid" : stale ? "Stale" : contribution != null ? "Usable" : "Missing";
  return (
    <PremiumCard className="recovery-analysis-contributor" as="article">
      <div className="recovery-analysis-contributor__heading">
        <span>{icon}</span>
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{value}</h3>
        </div>
        <StatusBadge
          tone={
            invalid ? "danger" : stale ? "caution" : contribution != null ? "success" : "neutral"
          }
        >
          {state}
        </StatusBadge>
      </div>
      <div className="recovery-analysis-contributor__facts">
        <span>
          <small>Contribution</small>
          <strong>
            {contribution == null ? "Unavailable" : `${Math.round(contribution)} points`}
          </strong>
        </span>
        <span>
          <small>Recent context</small>
          <strong>{recentAverage}</strong>
        </span>
        <span>
          <small>Source time</small>
          <strong>{formatDateTime(entry?.createdAt)}</strong>
        </span>
      </div>
      <p>
        {contribution == null
          ? "This contributor was unavailable."
          : contribution >= 70
            ? "This contributor was available and contributed positively."
            : "This contributor reduced the available readiness estimate."}
      </p>
      <div className="recovery-analysis-contributor__actions">
        <button type="button" disabled={!entry} onClick={onOpen}>
          Open source record
        </button>
        <button type="button" onClick={onUpdate}>
          <RefreshCw size={15} aria-hidden="true" /> Update
        </button>
      </div>
    </PremiumCard>
  );
}

function RecoveryDataTable({
  points,
  onOpen,
}: {
  points: RecoveryTimelinePoint[];
  onOpen: (date: string) => void;
}) {
  return (
    <div className="recovery-data-table-wrap">
      <table className="recovery-data-table">
        <caption>Underlying readiness records for the selected range</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Readiness</th>
            <th>Sleep</th>
            <th>Check-in</th>
            <th>Sources</th>
            <th>State</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              <td>{point.readiness ?? "—"}</td>
              <td>{point.sleep == null ? "Missing" : `${point.sleep} h`}</td>
              <td>{point.checkIn ? "Recorded" : "Missing"}</td>
              <td>{point.sourceCount}</td>
              <td>{point.state.replaceAll("_", " ")}</td>
              <td>
                <button type="button" onClick={() => onOpen(point.date)}>
                  Inspect
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualityTimeline({
  timeline,
  days,
  now,
  onOpen,
}: {
  timeline: RecoveryTimelinePoint[];
  days: number;
  now: number;
  onOpen: (date: string) => void;
}) {
  const byDate = new Map(timeline.map((point) => [point.date, point]));
  const dates = Array.from({ length: days }, (_, index) =>
    recoveryDateKey(now - (days - index - 1) * 86_400_000),
  );
  return (
    <PremiumCard className="recovery-quality-timeline">
      <ul>
        {dates.map((date) => {
          const point = byDate.get(date);
          const state: RecoveryDataState = point?.state ?? "needs_more_data";
          return (
            <li key={date} data-state={state}>
              <button
                type="button"
                onClick={() => point && onOpen(date)}
                disabled={!point}
                aria-label={`${date}: ${point ? state.replaceAll("_", " ") : "missing day"}`}
              >
                <span>{date.slice(5)}</span>
                <strong>
                  {point
                    ? state === "needs_more_data"
                      ? "Missing"
                      : state.replaceAll("_", " ")
                    : "Missing"}
                </strong>
                <small>
                  {point
                    ? `${point.sourceCount} source${point.sourceCount === 1 ? "" : "s"}`
                    : "0 sources"}
                </small>
              </button>
            </li>
          );
        })}
      </ul>
    </PremiumCard>
  );
}

function SourceRecord({ point, workouts }: { point?: RecoveryTimelinePoint; workouts: Workout[] }) {
  if (!point && !workouts.length)
    return <InlineMissing copy="No source record is available for this date." />;
  return (
    <div className="recovery-source-record">
      <p className="recovery-source-note">
        Exact user-entered and calculated evidence. Missing values remain missing.
      </p>
      {point?.sleepEntry && (
        <PremiumCard>
          <p className="eyebrow">Sleep source</p>
          <h3>
            {point.sleepEntry.hours} hours · quality {point.sleepEntry.quality}/10
          </h3>
          <p>{formatDateTime(point.sleepEntry.createdAt)}</p>
          <small>{point.sleepEntry.notes || "No notes"}</small>
        </PremiumCard>
      )}
      {point?.checkIn && (
        <PremiumCard>
          <p className="eyebrow">Check-in source</p>
          <h3>
            Energy {point.checkIn.energy} · soreness {point.checkIn.soreness} · stress{" "}
            {point.checkIn.stress} · motivation {point.checkIn.motivation}
          </h3>
          <p>{formatDateTime(point.checkIn.createdAt)}</p>
          <small>{point.checkIn.notes || "No notes"}</small>
        </PremiumCard>
      )}
      {workouts.map((workout) => (
        <PremiumCard key={workout.id}>
          <p className="eyebrow">Training source</p>
          <h3>{workout.name}</h3>
          <p>
            {workoutCompletedSets(workout).length} completed sets ·{" "}
            {workoutVolume(workout).toLocaleString()} lb volume
          </p>
          <small>{formatDateTime(workout.startedAt)}</small>
        </PremiumCard>
      ))}
    </div>
  );
}

function InlineMissing({ copy }: { copy: string }) {
  return (
    <PremiumCard className="recovery-inline-missing">
      <CircleAlert size={18} aria-hidden="true" />
      <p>{copy}</p>
    </PremiumCard>
  );
}
