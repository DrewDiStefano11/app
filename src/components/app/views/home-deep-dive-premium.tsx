import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  Database,
  Dumbbell,
  Expand,
  HeartPulse,
  Info,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Table2,
  Target,
  Utensils,
  X,
} from "lucide-react";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { BottomSheet } from "@/components/app/sheet";
import {
  ChartFocusMode,
  ComparisonChart,
  RangeSelector,
  fitCoreChartPalette,
  type ChartKind,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
  type RangeKey,
} from "@/components/app/premium-visualization";
import {
  DataQualityBadge,
  ExpandableMetricCard,
  MetricCard,
  NeedsMoreDataState,
  PremiumCard,
  SectionHeader,
  SectionTheme,
  StatusBadge,
  UnsupportedState,
  type DataQualityDetails,
} from "@/components/app/premium-ui";
import {
  fitcoreScore,
  momentumScore,
  muscleMap,
  nutritionAdherenceScore,
  readinessScore,
  recoveryScore,
  trainingConsistencyScore,
  workoutVolume,
  type HeatMode,
} from "@/lib/analytics";
import { useStore } from "@/lib/store";
import type { AppState, SectionId } from "@/lib/types";

type MetricDomain = "Home" | "Training" | "Nutrition" | "Recovery" | "Progress";
type MetricId =
  | "volume"
  | "workouts"
  | "cardio"
  | "calories"
  | "protein"
  | "carbs"
  | "sleep"
  | "sleepQuality"
  | "soreness"
  | "energy"
  | "stress"
  | "motivation"
  | "bodyweight";

interface MetricDefinition {
  id: MetricId;
  label: string;
  shortLabel: string;
  unit: string;
  domain: MetricDomain;
  color: string;
  requirement: string;
}

const METRICS: MetricDefinition[] = [
  {
    id: "volume",
    label: "Training volume",
    shortLabel: "Volume",
    unit: "lb",
    domain: "Training",
    color: fitCoreChartPalette[0],
    requirement: "completed weighted sets",
  },
  {
    id: "workouts",
    label: "Workout count",
    shortLabel: "Workouts",
    unit: "sessions",
    domain: "Training",
    color: fitCoreChartPalette[1],
    requirement: "completed workouts",
  },
  {
    id: "cardio",
    label: "Cardio duration",
    shortLabel: "Cardio",
    unit: "min",
    domain: "Training",
    color: fitCoreChartPalette[2],
    requirement: "cardio sessions",
  },
  {
    id: "calories",
    label: "Calories logged",
    shortLabel: "Calories",
    unit: "kcal",
    domain: "Nutrition",
    color: fitCoreChartPalette[3],
    requirement: "meal logs",
  },
  {
    id: "protein",
    label: "Protein logged",
    shortLabel: "Protein",
    unit: "g",
    domain: "Nutrition",
    color: fitCoreChartPalette[4],
    requirement: "meal logs",
  },
  {
    id: "carbs",
    label: "Carbohydrates logged",
    shortLabel: "Carbs",
    unit: "g",
    domain: "Nutrition",
    color: fitCoreChartPalette[5],
    requirement: "meal logs",
  },
  {
    id: "sleep",
    label: "Sleep duration",
    shortLabel: "Sleep",
    unit: "hr",
    domain: "Recovery",
    color: fitCoreChartPalette[6],
    requirement: "sleep logs",
  },
  {
    id: "sleepQuality",
    label: "Sleep quality",
    shortLabel: "Sleep quality",
    unit: "/5",
    domain: "Recovery",
    color: fitCoreChartPalette[7],
    requirement: "sleep logs",
  },
  {
    id: "soreness",
    label: "Soreness",
    shortLabel: "Soreness",
    unit: "/5",
    domain: "Recovery",
    color: "#fb7185",
    requirement: "recovery check-ins",
  },
  {
    id: "energy",
    label: "Recovery energy",
    shortLabel: "Energy",
    unit: "/5",
    domain: "Recovery",
    color: "#2dd4bf",
    requirement: "recovery check-ins",
  },
  {
    id: "stress",
    label: "Stress",
    shortLabel: "Stress",
    unit: "/5",
    domain: "Recovery",
    color: "#f97316",
    requirement: "recovery check-ins",
  },
  {
    id: "motivation",
    label: "Motivation",
    shortLabel: "Motivation",
    unit: "/5",
    domain: "Recovery",
    color: "#38bdf8",
    requirement: "recovery check-ins",
  },
  {
    id: "bodyweight",
    label: "Bodyweight",
    shortLabel: "Bodyweight",
    unit: "lb",
    domain: "Progress",
    color: "#e879f9",
    requirement: "weigh-ins",
  },
];

const PRESETS = [
  {
    name: "Sleep vs Readiness",
    ids: [] as MetricId[],
    missing:
      "Historical readiness is not exposed by the current analytics contract. Continue logging sleep and recovery check-ins; this preset will remain available for a later supported series.",
  },
  { name: "Training Volume vs Soreness", ids: ["volume", "soreness"] as MetricId[] },
  { name: "Calories vs Bodyweight", ids: ["calories", "bodyweight"] as MetricId[] },
  {
    name: "Protein vs Recovery",
    ids: ["protein", "energy"] as MetricId[],
    note: "Recovery uses the recorded energy field from each check-in.",
  },
  {
    name: "Workout Consistency vs Momentum",
    ids: [] as MetricId[],
    missing:
      "Momentum and workout consistency are currently point-in-time scores, not timestamped historical series.",
  },
  {
    name: "Nutrition Consistency vs Goal Progress",
    ids: [] as MetricId[],
    missing:
      "Goal progress has no timestamped history in the current contract. Log meals and update goals to prepare this comparison.",
  },
];

const RANGE_DAYS: Partial<Record<RangeKey, number>> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export function HomeDeepDivePremiumView({
  setPopup,
  setMuscle,
  onNavigate,
  onReturnDaily,
  initialFocus,
}: {
  setPopup: (
    popup: "score" | "readiness" | "recovery" | "momentum" | "volume" | "macros" | "heatmap",
  ) => void;
  setMuscle: (muscle: string | null) => void;
  onNavigate: (section: SectionId) => void;
  onReturnDaily: () => void;
  initialFocus?: "comparison";
}) {
  const { view, state } = useStore();
  const comparisonRef = useRef<HTMLElement>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const [mode, setMode] = useState<ComparisonMode>("raw");
  const [kind, setKind] = useState<ChartKind>("line");
  const [selectedIds, setSelectedIds] = useState<MetricId[]>(["volume", "calories"]);
  const [hiddenIds, setHiddenIds] = useState<MetricId[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [presetMessage, setPresetMessage] = useState<string>();
  const [comparisonName, setComparisonName] = useState("My cross-domain comparison");
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [sessionMessage, setSessionMessage] = useState<string>();
  const [heatMode, setHeatMode] = useState<HeatMode>("load");
  const score = useMemo(() => fitcoreScore(view), [view]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const momentum = useMemo(() => momentumScore(view), [view]);
  const heatValues = useMemo(() => muscleMap(view, heatMode), [view, heatMode]);
  const data = useMemo(() => buildComparisonData(view, range), [view, range]);
  const selectedMetrics = selectedIds.map((id) => METRICS.find((metric) => metric.id === id)!);
  const visibleMetrics = selectedMetrics.filter((metric) => !hiddenIds.includes(metric.id));
  const unitGroups = [...new Set(visibleMetrics.map((metric) => metric.unit))];
  const series = visibleMetrics.map<ChartSeries>((metric) => ({
    id: metric.id,
    label: `${metric.domain} · ${metric.label}`,
    unit: metric.unit,
    color: metric.color,
    axis: unitGroups.indexOf(metric.unit) === 1 ? "right" : "left",
  }));
  const matchedPoints = data.filter(
    (point) => visibleMetrics.filter((metric) => point[metric.id] != null).length >= 2,
  ).length;
  const quality: DataQualityDetails =
    matchedPoints >= 2
      ? {
          state: matchedPoints < 5 ? "partial" : "ready",
          sampleSize: matchedPoints,
          completeness: Math.round((matchedPoints / Math.max(1, data.length)) * 100),
          confidence: matchedPoints >= 5 ? "high" : "medium",
        }
      : {
          state: "needs_more_data",
          requiredHistory: Math.max(1, 2 - matchedPoints),
          sampleSize: matchedPoints,
          reason: "Fewer than two dates contain overlapping selected metrics.",
        };
  const rangeLabel = range === "all" ? "All recorded history" : range.toUpperCase();
  const scoreDrivers = [
    { label: "Training", value: trainingConsistencyScore(view) },
    { label: "Nutrition", value: nutritionAdherenceScore(view) },
    { label: "Recovery", value: recovery },
  ];

  useEffect(() => {
    if (initialFocus !== "comparison") return;
    requestAnimationFrame(() => {
      comparisonRef.current?.scrollIntoView({ block: "start" });
      comparisonRef.current?.querySelector<HTMLElement>("button, select")?.focus();
    });
  }, [initialFocus]);

  const toggleMetric = (id: MetricId) => {
    setPresetMessage(undefined);
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setHiddenIds((current) => current.filter((item) => item !== id));
  };
  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    if (preset.missing) {
      setPresetMessage(`${preset.name}: ${preset.missing}`);
      return;
    }
    setSelectedIds(preset.ids);
    setHiddenIds([]);
    setPresetMessage(preset.note ? `${preset.name}: ${preset.note}` : `${preset.name} applied.`);
    setComparisonName(preset.name);
  };
  const reset = () => {
    setSelectedIds(["volume", "calories"]);
    setHiddenIds([]);
    setMode("raw");
    setKind("line");
    setRange("30d");
    setComparisonName("My cross-domain comparison");
    setPresetMessage(undefined);
  };

  return (
    <SectionTheme section="home" className="home-deep-dive-premium" data-home-deep-dive>
      <section className="deep-dive-command-header" aria-labelledby="home-deep-dive-title">
        <div>
          <button type="button" className="deep-dive-return" onClick={onReturnDaily}>
            <ArrowLeft size={16} /> Daily View
          </button>
          <p className="eyebrow">Home · Analytical command center</p>
          <h2 id="home-deep-dive-title">Home Deep Dive</h2>
          <p>Understand why today matters, what changed, and where your logged signals overlap.</p>
        </div>
        <div className="deep-dive-context">
          <span>Active range</span>
          <strong>{rangeLabel}</strong>
          <DataQualityBadge quality={quality} />
        </div>
      </section>

      <section className="deep-dive-score-grid" aria-label="FitCore score context">
        <PremiumCard className="deep-dive-score-card" as="article">
          <div>
            <p className="eyebrow">Current FitCore Score</p>
            <strong>{score}</strong>
            <span>/100</span>
            <p>
              Point-in-time score from existing training, nutrition, recovery, and progress
              contracts.
            </p>
          </div>
          <button type="button" className="premium-icon-action" onClick={() => setPopup("score")}>
            Explain score <Info size={15} />
          </button>
        </PremiumCard>
        <div className="deep-dive-driver-grid">
          {scoreDrivers.map((driver) => (
            <PremiumCard key={driver.label} className="deep-dive-driver-card">
              <span>{driver.label}</span>
              <strong>{driver.value}</strong>
              <i>
                <b style={{ width: `${driver.value}%` }} />
              </i>
            </PremiumCard>
          ))}
        </div>
      </section>

      <section
        ref={comparisonRef}
        className="deep-dive-builder"
        aria-labelledby="comparison-builder-title"
      >
        <SectionHeader
          eyebrow="Universal comparison"
          title="Build a cross-domain view"
          description="Compare real logged metrics. Missing dates stay missing; no gaps are converted to zero."
          action={
            <button
              type="button"
              className="premium-icon-action"
              onClick={() => setPickerOpen(true)}
            >
              <Plus size={15} /> Metrics
            </button>
          }
        />
        <PremiumCard className="deep-dive-builder-controls">
          <div className="deep-dive-control-row">
            <RangeSelector
              value={range}
              onChange={setRange}
              supported={["7d", "14d", "30d", "3m", "6m", "1y", "all"]}
            />
            <label className="premium-select-label">
              <span>Chart type</span>
              <select
                aria-label="Chart type"
                value={kind}
                onChange={(event) => setKind(event.target.value as ChartKind)}
              >
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="bar">Bar</option>
              </select>
            </label>
            <label className="premium-select-label">
              <span>Display</span>
              <select
                aria-label="Comparison display"
                value={mode}
                onChange={(event) => setMode(event.target.value as ComparisonMode)}
              >
                <option value="raw">Raw values</option>
                <option value="normalized">% change</option>
                <option value="indexed">Indexed to 100</option>
                <option value="small_multiples">Aligned charts</option>
              </select>
            </label>
          </div>
          {mode === "indexed" && (
            <p className="deep-dive-baseline">
              <Target size={14} /> Baseline: first recorded value in the active range.
            </p>
          )}
          <div
            className="deep-dive-selected-series"
            aria-live="polite"
            aria-label={`${selectedIds.length} metrics selected`}
          >
            {selectedMetrics.map((metric) => {
              const hidden = hiddenIds.includes(metric.id);
              return (
                <div key={metric.id} data-hidden={hidden}>
                  <span style={{ background: metric.color }} />
                  <button
                    type="button"
                    aria-pressed={!hidden}
                    onClick={() =>
                      setHiddenIds((current) =>
                        hidden ? current.filter((id) => id !== metric.id) : [...current, metric.id],
                      )
                    }
                  >
                    {hidden ? "Show" : "Hide"} {metric.shortLabel}
                  </button>
                  <small>
                    {metric.domain} · {metric.unit}
                  </small>
                  <button
                    type="button"
                    aria-label={`Remove ${metric.label}`}
                    onClick={() => toggleMetric(metric.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        {selectedIds.length === 0 ? (
          <NeedsMoreDataState
            message="Add at least two metrics to build a comparison."
            requiredHistory={2}
          />
        ) : (
          <>
            {unitGroups.length > 2 && mode === "raw" && (
              <div className="deep-dive-warning" role="alert">
                <BarChart3 size={17} />
                <div>
                  <strong>{unitGroups.length} incompatible raw units selected.</strong>
                  <p>
                    Your selections are preserved. Raw mode uses at most two axes; choose
                    normalized, indexed, or aligned charts for a readable comparison.
                  </p>
                </div>
              </div>
            )}
            {visibleMetrics.length > 5 && (
              <div className="deep-dive-warning" role="status">
                <Settings2 size={17} />
                <div>
                  <strong>{visibleMetrics.length} visible series may be hard to read.</strong>
                  <p>Hide a series or choose aligned charts. Nothing has been removed.</p>
                </div>
              </div>
            )}
            {matchedPoints < 2 ? (
              <NeedsMoreDataState
                message="The selected metrics need at least two overlapping recorded dates. Log the missing source named in the metric picker; unlogged dates will not be synthesized."
                requiredHistory={Math.max(1, 2 - matchedPoints)}
              />
            ) : (
              <ComparisonChart
                title={comparisonName}
                description={`${rangeLabel} · ${modeLabel(mode)} · ${matchedPoints} overlapping dates`}
                data={data}
                series={series}
                kind={kind}
                mode={mode}
                onModeChange={setMode}
                selectedDate={selectedDate}
                onSelectedDateChange={setSelectedDate}
                quality={quality}
                onFocus={() => setFocusOpen(true)}
                animate={false}
              />
            )}
          </>
        )}

        <div className="deep-dive-builder-actions">
          <button type="button" onClick={() => setPickerOpen(true)}>
            <Plus size={15} /> Add metric
          </button>
          <button type="button" onClick={() => setFocusOpen(true)} disabled={matchedPoints < 2}>
            <Expand size={15} /> Focus
          </button>
          <button
            type="button"
            aria-expanded={tableOpen}
            onClick={() => setTableOpen((open) => !open)}
          >
            <Table2 size={15} /> Underlying data
          </button>
          <button type="button" onClick={reset}>
            <RotateCcw size={15} /> Clear / reset
          </button>
        </div>
        {tableOpen && <UnderlyingDataTable data={data} metrics={selectedMetrics} />}
      </section>

      <section className="deep-dive-presets" aria-labelledby="preset-title">
        <SectionHeader
          eyebrow="Starting points"
          title="Comparison presets"
          description="Unavailable presets remain visible and explain what is missing."
        />
        <div className="deep-dive-preset-grid">
          {PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.name}
              onClick={() => applyPreset(preset)}
              data-supported={!preset.missing}
            >
              <span>{preset.name}</span>
              <small>{preset.missing ? "Contract unavailable" : "Use preset"}</small>
            </button>
          ))}
        </div>
        {presetMessage && (
          <p className="deep-dive-preset-message" role="status">
            {presetMessage}
          </p>
        )}
      </section>

      <section className="deep-dive-session" aria-labelledby="session-title">
        <SectionHeader
          eyebrow="This session only"
          title="Recent comparison workspace"
          description="Names and saved views reset on reload; no persistent storage is used."
        />
        <PremiumCard>
          <label>
            <span>Comparison name</span>
            <input
              aria-label="Comparison name"
              value={comparisonName}
              onChange={(event) => setComparisonName(event.target.value)}
            />
          </label>
          <div className="deep-dive-session-actions">
            <button
              type="button"
              onClick={() => {
                setComparisonName(`${comparisonName} copy`);
                setSessionMessage("Duplicated in this session only.");
              }}
            >
              <Copy size={15} /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                setSavedNames((current) => [...current, comparisonName]);
                setSessionMessage("Saved for this session only; it will not persist after reload.");
              }}
            >
              <Save size={15} /> Save this session
            </button>
          </div>
          {sessionMessage && <p role="status">{sessionMessage}</p>}
          {savedNames.length > 0 && (
            <ul aria-label="Session saved comparisons">
              {savedNames.map((name, index) => (
                <li key={`${name}-${index}`}>
                  <Check size={14} /> {name}
                  <small>Session only</small>
                </li>
              ))}
            </ul>
          )}
        </PremiumCard>
      </section>

      <section className="deep-dive-analysis-grid" aria-label="Cross-domain trend overview">
        <SectionHeader eyebrow="Cross-domain overview" title="What your logs can explain" />
        <AnalysisCard
          icon={<Dumbbell />}
          title="Training & workload"
          value={`${view.workouts.length} sessions`}
          detail="Completed set volume, workout count, and cardio duration."
          onClick={() => setPopup("volume")}
        />
        <AnalysisCard
          icon={<HeartPulse />}
          title="Recovery & readiness"
          value={`${view.sleepEntries.length + view.recoveryCheckIns.length} signals`}
          detail={`Readiness ${readiness} · Recovery ${recovery}. Open contributors and recorded check-ins.`}
          onClick={() => setPopup("readiness")}
        />
        <AnalysisCard
          icon={<Utensils />}
          title="Nutrition consistency"
          value={`${view.mealEntries.length} meals`}
          detail="Calories, protein, and carbohydrates remain separated from missing days."
          onClick={() => setPopup("macros")}
        />
        <AnalysisCard
          icon={<Target />}
          title="Bodyweight & Momentum"
          value={momentum.hasData ? `${momentum.score} Momentum` : "Needs logs"}
          detail={`${view.bodyweightEntries.length} weigh-ins · goal progress remains point-in-time.`}
          onClick={() => setPopup("momentum")}
        />
      </section>

      <section className="deep-dive-body" aria-labelledby="body-analysis-title">
        <SectionHeader
          eyebrow="Muscle status"
          title="Body heatmap analysis"
          action={
            <button
              type="button"
              className="premium-icon-action"
              onClick={() => setPopup("heatmap")}
            >
              Full heatmap <Expand size={15} />
            </button>
          }
        />
        <PremiumCard>
          <div className="deep-dive-heat-controls" aria-label="Heatmap mode">
            {(["load", "strength", "recovery", "imbalance"] as HeatMode[]).map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={heatMode === item}
                onClick={() => setHeatMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="deep-dive-heatmaps">
            <BodyHeatmap
              values={heatValues}
              mode={heatMode}
              side="front"
              compact
              onSelect={setMuscle}
            />
            <BodyHeatmap
              values={heatValues}
              mode={heatMode}
              side="back"
              compact
              onSelect={setMuscle}
            />
          </div>
        </PremiumCard>
      </section>

      <section className="deep-dive-evidence" aria-labelledby="evidence-title">
        <SectionHeader eyebrow="Evidence & confidence" title="How to read this dashboard" />
        <ExpandableMetricCard
          label="Data quality"
          value={
            quality.state === "ready"
              ? "Ready"
              : quality.state === "partial"
                ? "Partial"
                : "Needs more data"
          }
          summary={`${matchedPoints} overlapping dates in ${rangeLabel}`}
          defaultExpanded
        >
          Missing means no qualifying record was found for that date. Zero is shown only when a
          recorded source explicitly contains zero. Low-confidence meal estimates remain source
          records, not verified measurements.
        </ExpandableMetricCard>
        <ExpandableMetricCard
          label="Correlation"
          value="Unavailable"
          summary="No supported Analytics Phase 2 correlation contract is present"
        >
          FitCore does not currently expose a thresholded correlation result with sample size,
          confidence, direction, and strength. This view therefore does not calculate one locally.
          Correlation would not prove causation even when a supported result becomes available.
        </ExpandableMetricCard>
        <UnsupportedState message="Historical FitCore Score, readiness, recovery, Momentum, and goal-progress series are not exposed by the current analytics contract. Current values remain visible without being backfilled into fake history." />
      </section>

      <section className="deep-dive-return-card">
        <PremiumCard>
          <div>
            <p className="eyebrow">Today</p>
            <h2>Return to Daily View</h2>
            <p>
              Your comparison remains available in controlled view state until this page reloads.
            </p>
          </div>
          <button type="button" className="premium-primary-action" onClick={onReturnDaily}>
            <ArrowLeft size={16} /> Back to today
          </button>
        </PremiumCard>
      </section>

      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose comparison metrics"
        height="tall"
      >
        <div
          className="deep-dive-metric-picker"
          role="group"
          aria-label="Available comparison metrics"
        >
          <p>
            Select compatible logged series. Your current selection is preserved when warnings
            appear.
          </p>
          {(["Home", "Training", "Nutrition", "Recovery", "Progress"] as MetricDomain[]).map(
            (domain) => (
              <section key={domain}>
                <h4>{domain}</h4>
                {domain === "Home" ? (
                  <p className="deep-dive-unavailable-metric">
                    <Info size={14} /> Current scores have no supported historical series.
                  </p>
                ) : (
                  METRICS.filter((metric) => metric.domain === domain).map((metric) => (
                    <button
                      type="button"
                      key={metric.id}
                      aria-pressed={selectedIds.includes(metric.id)}
                      onClick={() => toggleMetric(metric.id)}
                    >
                      <span style={{ background: metric.color }} />
                      <span>
                        <strong>{metric.label}</strong>
                        <small>
                          {metric.unit} · requires {metric.requirement}
                        </small>
                      </span>
                      <Check size={16} />
                    </button>
                  ))
                )}
              </section>
            ),
          )}
        </div>
      </BottomSheet>

      <ChartFocusMode
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        title={comparisonName}
        chart={
          <ComparisonChart
            title={comparisonName}
            description={`${rangeLabel} · focus mode`}
            data={data}
            series={series}
            kind={kind}
            mode={mode}
            onModeChange={setMode}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            quality={quality}
            animate={false}
          />
        }
        series={series}
        range={range}
        onRangeChange={setRange}
        mode={mode}
        onModeChange={setMode}
        data={data}
        onSave={() => {
          setSavedNames((current) => [...current, comparisonName]);
          setSessionMessage("Saved for this session only; it will not persist after reload.");
        }}
      />
    </SectionTheme>
  );
}

function AnalysisCard({
  icon,
  title,
  value,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <PremiumCard className="deep-dive-analysis-card" as="article">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <strong>{value}</strong>
        <p>{detail}</p>
        <button type="button" onClick={onClick}>
          Open analysis
        </button>
      </div>
    </PremiumCard>
  );
}

function UnderlyingDataTable({
  data,
  metrics,
}: {
  data: ChartPoint[];
  metrics: MetricDefinition[];
}) {
  return (
    <div className="deep-dive-table-wrap" tabIndex={0}>
      <table className="premium-data-table">
        <caption>Underlying logged values; em dash means no record.</caption>
        <thead>
          <tr>
            <th>Date</th>
            {metrics.map((metric) => (
              <th key={metric.id}>
                {metric.shortLabel} ({metric.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              {metrics.map((metric) => (
                <td key={metric.id}>{point[metric.id] == null ? "—" : String(point[metric.id])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function modeLabel(mode: ComparisonMode) {
  return mode === "raw"
    ? "Raw values"
    : mode === "normalized"
      ? "Percentage change"
      : mode === "indexed"
        ? "Indexed baseline"
        : "Aligned charts";
}

function buildComparisonData(state: AppState, range: RangeKey): ChartPoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = days ? Date.now() - days * 86400000 : 0;
  const buckets = new Map<string, ChartPoint & { timestamp: number }>();
  const bucket = (timestamp: number) => {
    const date = new Date(timestamp);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const current = buckets.get(key) ?? {
      date: date.toLocaleDateString([], { month: "short", day: "numeric" }),
      timestamp,
    };
    buckets.set(key, current);
    return current;
  };
  state.workouts
    .filter((item) => item.startedAt >= cutoff)
    .forEach((workout) => {
      const day = bucket(workout.startedAt);
      day.volume = Number(day.volume ?? 0) + workoutVolume(workout);
      day.workouts = Number(day.workouts ?? 0) + 1;
    });
  state.cardioEntries
    .filter((item) => item.createdAt >= cutoff)
    .forEach((entry) => {
      const day = bucket(entry.createdAt);
      day.cardio = Number(day.cardio ?? 0) + entry.minutes;
    });
  state.mealEntries
    .filter((item) => item.createdAt >= cutoff)
    .forEach((meal) => {
      const day = bucket(meal.createdAt);
      day.calories = Number(day.calories ?? 0) + meal.calories;
      day.protein = Number(day.protein ?? 0) + meal.protein;
      day.carbs = Number(day.carbs ?? 0) + meal.carbs;
    });
  state.sleepEntries
    .filter((item) => item.createdAt >= cutoff)
    .forEach((entry) => {
      const day = bucket(entry.createdAt);
      day.sleep = entry.hours;
      day.sleepQuality = entry.quality;
    });
  state.recoveryCheckIns
    .filter((item) => item.createdAt >= cutoff)
    .forEach((entry) => {
      const day = bucket(entry.createdAt);
      day.soreness = entry.soreness;
      day.energy = entry.energy;
      day.stress = entry.stress;
      day.motivation = entry.motivation;
    });
  state.bodyweightEntries
    .filter((item) => item.createdAt >= cutoff)
    .forEach((entry) => {
      bucket(entry.createdAt).bodyweight = entry.weightLb;
    });
  return [...buckets.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ timestamp: _timestamp, ...point }) => point);
}
