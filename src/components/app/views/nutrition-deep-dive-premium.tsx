import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Database,
  Info,
  ListTree,
  Pill,
  Plus,
  Sparkles,
  Table2,
  Target,
  Utensils,
} from "lucide-react";
import {
  ComparisonChart,
  RangeSelector,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
  type RangeKey,
} from "@/components/app/premium-visualization";
import {
  DataQualityBadge,
  EmptyState,
  MetricCard,
  PremiumCard,
  SectionHeader,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";
import { BottomSheet } from "@/components/app/sheet";
import { useStore } from "@/lib/store";
import type { MealEntry, NutritionTargets } from "@/lib/types";

type NutritionMetricId = "calories" | "protein" | "carbs" | "fat";

interface DailyNutritionPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
  meals: MealEntry[];
}

interface MetricDefinition extends ChartSeries {
  id: NutritionMetricId;
}

const DAY = 86_400_000;
const RANGE_DAYS: Partial<Record<RangeKey, number>> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "3m": 90,
};
const RANGE_LABELS: Partial<Record<RangeKey, string>> = {
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "3m": "3 months",
  all: "All history",
};
const METRICS: MetricDefinition[] = [
  { id: "calories", label: "Calories", unit: "kcal", color: "#fb923c", axis: "left" },
  { id: "protein", label: "Protein", unit: "g", color: "#38bdf8", axis: "right" },
  { id: "carbs", label: "Carbohydrates", unit: "g", color: "#fbbf24", axis: "right" },
  { id: "fat", label: "Fat", unit: "g", color: "#fb7185", axis: "right" },
];

const round = (value: number) => Math.round(value);

const finiteTarget = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

const localDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const sourceCategory = (meal: MealEntry) => {
  const source = meal.provenance?.source ?? meal.source;
  if (source === "ai-estimated" || source === "camera") return "AI estimate";
  if (source === "imported") return "Imported";
  if (source === "barcode") return "Barcode";
  if (source === "jarvis" || source === "jarvis-confirmed") return "Jarvis";
  if (source === "edited") return "Edited";
  if (source === "manual") return "Manual";
  return "Source unspecified";
};

const sourceDetail = (meal: MealEntry) => {
  const category = sourceCategory(meal);
  if (category !== "AI estimate") return category;
  const confirmed = meal.provenance?.confirmation === "confirmed" || meal.confirmed === true;
  return confirmed ? "AI estimate · confirmed" : "AI estimate · unconfirmed";
};

function buildDailyPoints(meals: MealEntry[], range: RangeKey): DailyNutritionPoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = days ? new Date().setHours(0, 0, 0, 0) - (days - 1) * DAY : -Infinity;
  const buckets = new Map<string, DailyNutritionPoint>();

  meals
    .filter((meal) => Number.isFinite(meal.createdAt) && meal.createdAt >= cutoff)
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((meal) => {
      const date = localDateKey(meal.createdAt);
      const point = buckets.get(date) ?? {
        date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealCount: 0,
        meals: [],
      };
      point.calories += Number.isFinite(meal.calories) ? meal.calories : 0;
      point.protein += Number.isFinite(meal.protein) ? meal.protein : 0;
      point.carbs += Number.isFinite(meal.carbs) ? meal.carbs : 0;
      point.fat += Number.isFinite(meal.fat) ? meal.fat : 0;
      point.mealCount += 1;
      point.meals.push(meal);
      buckets.set(date, point);
    });

  return [...buckets.values()];
}

function targetState(targets: NutritionTargets) {
  return {
    calories: finiteTarget(targets?.calories),
    protein: finiteTarget(targets?.protein),
    carbs: finiteTarget(targets?.carbs),
    fat: finiteTarget(targets?.fat),
  };
}

export function NutritionDeepDivePremiumView({
  onOpenDaily,
  onLogMeal,
  onDeleteMeal,
}: {
  onOpenDaily: () => void;
  onLogMeal: () => void;
  onDeleteMeal: (mealId: string) => void;
}) {
  const { state } = useStore();
  const [range, setRange] = useState<RangeKey>("14d");
  const [mode, setMode] = useState<ComparisonMode>("raw");
  const [selectedMetrics, setSelectedMetrics] = useState<NutritionMetricId[]>([
    "calories",
    "protein",
  ]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [drilldownDate, setDrilldownDate] = useState<string>();
  const [tableOpen, setTableOpen] = useState(false);

  const points = useMemo(
    () => buildDailyPoints(state.mealEntries, range),
    [range, state.mealEntries],
  );
  const chartData: ChartPoint[] = useMemo(
    () =>
      points.map(({ meals: _meals, ...point }) => {
        void _meals;
        return point;
      }),
    [points],
  );
  const targets = targetState(state.nutritionTargets);
  const meals = useMemo(() => points.flatMap((point) => point.meals), [points]);
  const supplements = useMemo(() => {
    const days = RANGE_DAYS[range];
    const cutoff = days ? new Date().setHours(0, 0, 0, 0) - (days - 1) * DAY : -Infinity;
    return state.supplementLogs
      .filter((entry) => Number.isFinite(entry.createdAt) && entry.createdAt >= cutoff)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [range, state.supplementLogs]);
  const activeSeries = METRICS.filter((metric) => selectedMetrics.includes(metric.id));
  const activeSelectedDate =
    selectedDate && points.some((point) => point.date === selectedDate)
      ? selectedDate
      : points.at(-1)?.date;
  const rangeLabel = RANGE_LABELS[range] ?? "Selected range";
  const quality: DataQualityDetails = points.length
    ? points.length >= 3
      ? { state: "ready", sampleSize: points.length, sourceCount: meals.length }
      : {
          state: "partial",
          sampleSize: points.length,
          sourceCount: meals.length,
          requiredHistory: 3 - points.length,
          reason: "A trend needs at least three logged days.",
        }
    : { state: "needs_more_data", requiredHistory: 3, sampleSize: 0, sourceCount: 0 };
  const averages = points.length
    ? {
        calories: points.reduce((sum, point) => sum + point.calories, 0) / points.length,
        protein: points.reduce((sum, point) => sum + point.protein, 0) / points.length,
        meals: meals.length / points.length,
      }
    : null;
  const selectedDay = points.find((point) => point.date === drilldownDate);
  const calorieTargetStatus =
    targets.calories == null
      ? "Missing target"
      : targets.calories === 0
        ? "Explicit 0 target"
        : `${round(targets.calories)} kcal`;
  const proteinTargetStatus =
    targets.protein == null
      ? "Missing target"
      : targets.protein === 0
        ? "Explicit 0 target"
        : `${round(targets.protein)}g`;

  const typeCounts = [...new Set(meals.map((meal) => meal.type || "unspecified"))]
    .map((type) => ({
      type,
      count: meals.filter((meal) => (meal.type || "unspecified") === type).length,
    }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  const sourceCounts = [...new Set(meals.map(sourceCategory))]
    .map((source) => ({
      source,
      count: meals.filter((meal) => sourceCategory(meal) === source).length,
    }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
  const unconfirmedAi = meals.filter(
    (meal) =>
      sourceCategory(meal) === "AI estimate" &&
      meal.provenance?.confirmation !== "confirmed" &&
      meal.confirmed !== true,
  ).length;

  const toggleMetric = (id: NutritionMetricId) => {
    setSelectedMetrics((current) => {
      if (current.includes(id))
        return current.length === 1 ? current : current.filter((item) => item !== id);
      return [...current, id];
    });
  };

  return (
    <div className="nutrition-deep-dive-premium" aria-label="Nutrition Deep Dive workspace">
      <header className="nutrition-deep-dive-header">
        <button className="nutrition-deep-dive-back" type="button" onClick={onOpenDaily}>
          <ArrowLeft size={17} aria-hidden="true" /> Daily View
        </button>
        <div className="nutrition-deep-dive-heading">
          <div>
            <p className="eyebrow">Nutrition analysis</p>
            <h1>Nutrition Deep Dive</h1>
            <p>
              Recorded intake, targets, meal patterns, and source quality—without invented history.
            </p>
          </div>
          <div className="nutrition-deep-dive-context" aria-label={`Active range: ${rangeLabel}`}>
            <CalendarDays size={16} aria-hidden="true" />
            <span>Active range</span>
            <strong>{rangeLabel}</strong>
          </div>
        </div>
      </header>

      <main className="nutrition-deep-dive-main">
        <section
          className="nutrition-deep-dive-overview"
          aria-labelledby="nutrition-overview-title"
        >
          <SectionHeader
            eyebrow="Range summary"
            title="What the record can support"
            description="Averages use logged days only. Unlogged dates remain missing rather than becoming zero-intake days."
            action={<DataQualityBadge quality={quality} />}
          />
          <div className="nutrition-deep-dive-summary-grid">
            <MetricCard
              label="Logged days"
              value={points.length || "—"}
              detail={
                points.length
                  ? `${meals.length} meals in ${rangeLabel}`
                  : `No meal history in ${rangeLabel}`
              }
              icon={<CalendarDays size={17} />}
            />
            <MetricCard
              label="Average calories"
              value={averages ? round(averages.calories).toLocaleString() : "—"}
              unit={averages ? "kcal / logged day" : undefined}
              detail={`Current target: ${calorieTargetStatus}`}
              icon={<Target size={17} />}
            />
            <MetricCard
              label="Average protein"
              value={averages ? round(averages.protein) : "—"}
              unit={averages ? "g / logged day" : undefined}
              detail={`Current target: ${proteinTargetStatus}`}
              icon={<ChartNoAxesCombined size={17} />}
            />
            <MetricCard
              label="Meals per logged day"
              value={averages ? averages.meals.toFixed(1) : "—"}
              detail="Frequency describes recorded meals only"
              icon={<Utensils size={17} />}
            />
          </div>
        </section>

        <PremiumCard className="nutrition-range-card" as="section">
          <div>
            <p className="eyebrow">Date window</p>
            <h2>Choose the evidence range</h2>
          </div>
          <RangeSelector
            value={range}
            onChange={setRange}
            supported={["7d", "14d", "30d", "3m", "all"]}
          />
        </PremiumCard>

        <section className="nutrition-trend-section" aria-labelledby="nutrition-trend-title">
          <SectionHeader
            eyebrow="Recorded trends"
            title="Calories and macros"
            description="Select real timestamped metrics. Raw mode uses kcal and gram axes separately."
          />

          <PremiumCard className="nutrition-metric-selector" as="section">
            <div>
              <p className="eyebrow">Visible metrics</p>
              <p id="nutrition-metric-help">
                Keep at least one metric selected. Color is reinforced by labels and units.
              </p>
            </div>
            <div
              role="group"
              aria-label="Nutrition comparison metrics"
              aria-describedby="nutrition-metric-help"
            >
              {METRICS.map((metric) => (
                <button
                  key={metric.id}
                  type="button"
                  aria-pressed={selectedMetrics.includes(metric.id)}
                  onClick={() => toggleMetric(metric.id)}
                >
                  <span style={{ background: metric.color }} aria-hidden="true" />
                  {metric.label}
                  <small>{metric.unit}</small>
                </button>
              ))}
            </div>
          </PremiumCard>

          {points.length ? (
            <>
              {points.length < 3 && (
                <div className="nutrition-data-note" role="status">
                  <Info size={17} aria-hidden="true" />
                  <div>
                    <strong>Exact values are available, but the trend is still partial.</strong>
                    <p>
                      Log nutrition on {3 - points.length} more{" "}
                      {3 - points.length === 1 ? "day" : "days"} before treating movement as a
                      pattern.
                    </p>
                  </div>
                </div>
              )}
              <ComparisonChart
                title="Logged nutrition by day"
                description={`${rangeLabel} · ${points.length} logged ${points.length === 1 ? "day" : "days"} · missing dates omitted`}
                data={chartData}
                series={activeSeries}
                kind="line"
                mode={mode}
                onModeChange={setMode}
                selectedDate={activeSelectedDate}
                onSelectedDateChange={setSelectedDate}
                onOpenEntry={(date) => setDrilldownDate(date)}
                quality={quality}
                animate
              />
              <button
                className="nutrition-table-toggle"
                type="button"
                aria-expanded={tableOpen}
                onClick={() => setTableOpen((current) => !current)}
              >
                <Table2 size={16} aria-hidden="true" />
                {tableOpen ? "Hide underlying data" : "Show underlying data"}
              </button>
              {tableOpen && <NutritionDataTable points={points} targets={targets} />}
            </>
          ) : (
            <EmptyState
              title="No nutrition history in this range"
              message="Log a meal or choose a broader range. No placeholder line or synthetic zero days are shown."
              action={
                <button className="nutrition-inline-action" type="button" onClick={onLogMeal}>
                  <Plus size={15} aria-hidden="true" /> Log Meal
                </button>
              }
            />
          )}
        </section>

        <section className="nutrition-target-section" aria-labelledby="nutrition-target-title">
          <SectionHeader
            eyebrow="Current reference"
            title="Actual versus current targets"
            description="FitCore stores current targets, not target history. These references are not claimed as historical settings."
          />
          <div className="nutrition-target-grid">
            {METRICS.map((metric) => {
              const target = targets[metric.id];
              const average = averages
                ? metric.id === "calories"
                  ? averages.calories
                  : points.reduce((sum, point) => sum + Number(point[metric.id]), 0) / points.length
                : null;
              return (
                <TargetReferenceCard
                  key={metric.id}
                  metric={metric}
                  target={target}
                  average={average}
                />
              );
            })}
          </div>
        </section>

        <div className="nutrition-analysis-grid">
          <section aria-labelledby="meal-pattern-title">
            <SectionHeader
              eyebrow="Meal patterns"
              title="Recorded meal types"
              description="Distribution uses the meal type saved on each entry."
            />
            <PremiumCard className="nutrition-pattern-card">
              {typeCounts.length ? (
                <ul>
                  {typeCounts.map((item) => (
                    <li key={item.type}>
                      <span>{item.type}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nutrition-card-empty">No meal types are recorded in this range.</p>
              )}
            </PremiumCard>
          </section>

          <section aria-labelledby="nutrition-provenance-title">
            <SectionHeader
              eyebrow="Source quality"
              title="Meal provenance"
              description="AI estimates, imports, manual entries, and unspecified legacy sources stay distinct."
            />
            <PremiumCard className="nutrition-provenance-card">
              {sourceCounts.length ? (
                <>
                  <ul>
                    {sourceCounts.map((item) => (
                      <li key={item.source}>
                        <span>{item.source}</span>
                        <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                  {unconfirmedAi > 0 && (
                    <div className="nutrition-ai-warning" role="status">
                      <Sparkles size={16} aria-hidden="true" />
                      {unconfirmedAi} unconfirmed AI{" "}
                      {unconfirmedAi === 1 ? "estimate remains" : "estimates remain"} in this range.
                    </div>
                  )}
                </>
              ) : (
                <p className="nutrition-card-empty">
                  No source metadata is available in this range.
                </p>
              )}
            </PremiumCard>
          </section>

          <section aria-labelledby="supplement-activity-title">
            <SectionHeader
              eyebrow="Supplement activity"
              title="Recorded supplement logs"
              description="Counts reflect stored logs only; no routine completion claim is inferred."
            />
            <PremiumCard className="nutrition-supplement-analysis">
              <div>
                <Pill size={18} aria-hidden="true" />
                <strong>{supplements.length}</strong>
                <span>logs in {rangeLabel}</span>
              </div>
              {supplements.length ? (
                <ul>
                  {supplements.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.name}</span>
                      <small>
                        {entry.dose || "Dose not recorded"} ·{" "}
                        {formatDate(localDateKey(entry.createdAt))}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nutrition-card-empty">No supplement logs in this range.</p>
              )}
            </PremiumCard>
          </section>

          <section aria-labelledby="unsupported-analysis-title">
            <SectionHeader
              eyebrow="Not connected"
              title="Unsupported analysis"
              description="Missing contracts remain visible without fabricated scores."
            />
            <PremiumCard className="nutrition-unsupported-card">
              <UnsupportedRow
                title="Hydration"
                detail="Planned · no stored water totals or target"
              />
              <UnsupportedRow
                title="Micronutrients and fiber trends"
                detail="Not connected · incomplete meal-level coverage"
              />
              <UnsupportedRow
                title="Food quality and metabolic scores"
                detail="Unsupported · no current analytical contract"
              />
              <UnsupportedRow
                title="Nutrition correlations"
                detail="Unsupported · no thresholded correlation contract"
              />
            </PremiumCard>
          </section>
        </div>

        <PremiumCard className="nutrition-deep-dive-actions" as="section">
          <div>
            <p className="eyebrow">Operational logging</p>
            <h2>Keep analysis tied to the daily record</h2>
            <p>
              Deep Dive interprets existing logs. Daily View remains the primary place to log and
              manage meals.
            </p>
          </div>
          <div>
            <button type="button" onClick={onOpenDaily}>
              Daily View <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={onLogMeal}>
              <Plus size={16} aria-hidden="true" /> Log Meal
            </button>
          </div>
        </PremiumCard>
      </main>

      <BottomSheet
        open={!!drilldownDate}
        onClose={() => setDrilldownDate(undefined)}
        title={selectedDay ? `Meals · ${formatDate(selectedDay.date)}` : "Logged meals"}
        height="tall"
      >
        {selectedDay ? (
          <div className="nutrition-day-drilldown">
            <div className="nutrition-day-drilldown__summary" aria-label="Selected day totals">
              <span>{round(selectedDay.calories)} kcal</span>
              <span>P {round(selectedDay.protein)}g</span>
              <span>C {round(selectedDay.carbs)}g</span>
              <span>F {round(selectedDay.fat)}g</span>
            </div>
            <div className="nutrition-day-drilldown__list">
              {selectedDay.meals.map((meal) => (
                <article key={meal.id}>
                  <div>
                    <span>
                      {new Date(meal.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <StatusBadge
                      tone={sourceCategory(meal) === "AI estimate" ? "caution" : "neutral"}
                    >
                      {sourceDetail(meal)}
                    </StatusBadge>
                  </div>
                  <h3>{meal.name}</h3>
                  <p>
                    {round(meal.calories)} kcal · P {round(meal.protein)}g · C {round(meal.carbs)}g
                    · F {round(meal.fat)}g
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDrilldownDate(undefined);
                      onDeleteMeal(meal.id);
                    }}
                    aria-label={`Delete ${meal.name} meal`}
                  >
                    Delete meal
                  </button>
                </article>
              ))}
            </div>
            <button className="nutrition-inline-action" type="button" onClick={onLogMeal}>
              <Plus size={15} aria-hidden="true" /> Log Meal
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

function TargetReferenceCard({
  metric,
  target,
  average,
}: {
  metric: MetricDefinition;
  target: number | null;
  average: number | null;
}) {
  const targetMissing = target == null;
  const targetZero = target === 0;
  const difference = !targetMissing && !targetZero && average != null ? average - target : null;
  const detail = targetMissing
    ? "Missing or invalid target"
    : targetZero
      ? "Explicit zero target"
      : average == null
        ? "No logged-day average"
        : difference === 0
          ? "Average exactly on current target"
          : `${round(Math.abs(difference ?? 0))}${metric.unit} ${difference && difference > 0 ? "over" : "below"} current target`;
  return (
    <PremiumCard className="nutrition-target-card" as="article">
      <div>
        <span style={{ background: metric.color }} aria-hidden="true" />
        <p>{metric.label}</p>
      </div>
      <strong>{targetMissing ? "—" : `${round(target)}${metric.unit}`}</strong>
      <p>{detail}</p>
      <StatusBadge tone={targetMissing ? "neutral" : targetZero ? "caution" : "info"}>
        {targetMissing ? "Unavailable" : targetZero ? "Zero target" : "Current target"}
      </StatusBadge>
    </PremiumCard>
  );
}

function NutritionDataTable({
  points,
  targets,
}: {
  points: DailyNutritionPoint[];
  targets: ReturnType<typeof targetState>;
}) {
  return (
    <div className="nutrition-data-table-wrap" tabIndex={0}>
      <table className="premium-data-table">
        <caption>
          Underlying logged nutrition values. Missing dates are omitted; current targets are
          reference values only.
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Meals</th>
            <th>Calories</th>
            <th>Protein</th>
            <th>Carbs</th>
            <th>Fat</th>
            <th>Calorie difference</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDate(point.date)}</th>
              <td>{point.mealCount}</td>
              <td>{round(point.calories)} kcal</td>
              <td>{round(point.protein)}g</td>
              <td>{round(point.carbs)}g</td>
              <td>{round(point.fat)}g</td>
              <td>
                {targets.calories != null && targets.calories > 0
                  ? `${round(point.calories - targets.calories)} kcal`
                  : targets.calories === 0
                    ? "Explicit 0 target"
                    : "Target unavailable"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnsupportedRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <span>
        <Database size={16} aria-hidden="true" />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <StatusBadge>Not connected</StatusBadge>
    </div>
  );
}
