import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  CircleAlert,
  Flame,
  Pill,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo } from "react";
import { buildDailyDecision } from "@/lib/daily-decision";
import { isToday, useStore } from "@/lib/store";
import type { MealEntry } from "@/lib/types";
import {
  DataQualityBadge,
  InsightCard,
  PremiumCard,
  SectionHeader,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";

interface NutritionDailyPremiumProps {
  onLogMeal: () => void;
  onDeleteMeal: (mealId: string) => void;
  onOpenDeepDive: () => void;
}

interface MacroSummary {
  label: string;
  shortLabel: string;
  value: number;
  target: number | null;
  unit: "g";
  tone: "protein" | "carbs" | "fat";
}

const finite = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const safePercent = (value: number, target: number | null) => {
  if (target == null || target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export function NutritionDailyPremiumView({
  onLogMeal,
  onDeleteMeal,
  onOpenDeepDive,
}: NutritionDailyPremiumProps) {
  const { state } = useStore();
  const today = useMemo(
    () =>
      state.mealEntries
        .filter((meal) => isToday(meal.createdAt))
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.mealEntries],
  );
  const supplements = useMemo(
    () =>
      state.supplementLogs
        .filter((supplement) => isToday(supplement.createdAt))
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.supplementLogs],
  );
  const totals = useMemo(
    () =>
      today.reduce(
        (sum, meal) => ({
          calories: sum.calories + meal.calories,
          protein: sum.protein + meal.protein,
          carbs: sum.carbs + meal.carbs,
          fat: sum.fat + meal.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [today],
  );

  const calorieTarget = finite(state.nutritionTargets?.calories);
  const macros: MacroSummary[] = [
    {
      label: "Protein",
      shortLabel: "P",
      value: totals.protein,
      target: finite(state.nutritionTargets?.protein),
      unit: "g",
      tone: "protein",
    },
    {
      label: "Carbohydrates",
      shortLabel: "C",
      value: totals.carbs,
      target: finite(state.nutritionTargets?.carbs),
      unit: "g",
      tone: "carbs",
    },
    {
      label: "Fat",
      shortLabel: "F",
      value: totals.fat,
      target: finite(state.nutritionTargets?.fat),
      unit: "g",
      tone: "fat",
    },
  ];

  const calorieDifference = calorieTarget == null ? null : calorieTarget - totals.calories;
  const targetIsSet = calorieTarget != null && calorieTarget > 0;
  const targetIsZero = calorieTarget === 0;
  const unconfirmedEstimates = today.filter(
    (meal) =>
      (meal.source === "camera" ||
        meal.source === "jarvis" ||
        meal.provenance?.source === "ai-estimated") &&
      meal.confirmed !== true,
  ).length;
  const decision = useMemo(() => buildDailyDecision(state), [state]);

  const quality: DataQualityDetails =
    today.length === 0
      ? {
          state: "needs_more_data",
          confidence: "low",
          sourceCount: 0,
          reason: "No meals logged today",
        }
      : targetIsSet
        ? {
            state: unconfirmedEstimates ? "partial" : "ready",
            confidence: unconfirmedEstimates ? "medium" : "high",
            sourceCount: today.length,
            exclusionCount: unconfirmedEstimates,
            reason: unconfirmedEstimates
              ? "Estimated meals need confirmation before guidance can rely on them"
              : undefined,
          }
        : {
            state: "partial",
            confidence: "medium",
            sourceCount: today.length,
            reason: targetIsZero
              ? "Calorie target is explicitly zero"
              : "Calorie target unavailable",
          };

  const calorieHeadline = targetIsSet
    ? `${formatNumber(Math.abs(calorieDifference ?? 0))} kcal`
    : `${formatNumber(totals.calories)} kcal`;
  const calorieStatus = targetIsSet
    ? (calorieDifference ?? 0) >= 0
      ? "remaining today"
      : "over today’s target"
    : targetIsZero
      ? "logged · target is 0 kcal"
      : "logged · target unavailable";
  const heroDetail = targetIsSet
    ? `${formatNumber(totals.calories)} logged of ${formatNumber(calorieTarget)} kcal`
    : targetIsZero
      ? "An explicit zero target is not treated as missing or as completed progress."
      : "Calories are measured from today’s meals; progress is withheld without a usable target.";

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="nutrition-daily-premium">
      <header className="nutrition-daily-header">
        <div>
          <p className="eyebrow">Nutrition daily</p>
          <h1 aria-label="Nutrition">Fuel</h1>
          <p>Exact intake, practical next steps, and today’s meal record.</p>
        </div>
        <div className="nutrition-day-context" aria-label={`Current day: ${todayLabel}`}>
          <CalendarDays size={16} aria-hidden="true" />
          <span>{todayLabel}</span>
        </div>
      </header>

      <main className="nutrition-daily-main">
        <PremiumCard className="nutrition-calorie-hero" as="section">
          <div className="nutrition-calorie-hero__ambient" aria-hidden="true" />
          <div className="nutrition-calorie-hero__content">
            <div className="nutrition-calorie-hero__heading">
              <div>
                <p className="eyebrow">Calorie status</p>
                <div className="nutrition-calorie-hero__value">
                  <strong>{calorieHeadline}</strong>
                  <span>
                    {targetIsSet && <span className="sr-only">kcal </span>}
                    {calorieStatus}
                  </span>
                </div>
              </div>
              <DataQualityBadge quality={quality} compact />
            </div>

            <div
              className="nutrition-calorie-progress"
              role="img"
              aria-label={
                targetIsSet
                  ? `${formatNumber(totals.calories)} of ${formatNumber(calorieTarget)} calories logged`
                  : `${formatNumber(totals.calories)} calories logged; usable calorie target unavailable`
              }
            >
              <span>
                <i style={{ width: `${safePercent(totals.calories, calorieTarget)}%` }} />
              </span>
            </div>
            <p className="nutrition-calorie-hero__detail">{heroDetail}</p>

            <div className="nutrition-calorie-hero__facts" aria-label="Today’s nutrition facts">
              <div>
                <span>Meals</span>
                <strong>{today.length}</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>
                  {calorieTarget == null ? "—" : `${formatNumber(calorieTarget)} kcal`}
                </strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{today.length ? "Today’s log" : "No entries"}</strong>
              </div>
            </div>

            <button className="nutrition-primary-action" type="button" onClick={onLogMeal}>
              <Plus size={18} aria-hidden="true" />
              Log Meal
            </button>
          </div>
        </PremiumCard>

        <section className="nutrition-section nutrition-macro-section" aria-label="Macro progress">
          <SectionHeader
            eyebrow="Today’s targets"
            title="Macro progress"
            description="Logged grams stay exact. Progress geometry appears only for positive targets."
          />
          <div className="nutrition-macro-grid">
            {macros.map((macro) => (
              <MacroProgress key={macro.label} macro={macro} />
            ))}
          </div>
        </section>

        <InsightCard title="Today’s fuel guidance" source="FitCore daily decision">
          <p>{decision.nutrition.recommendation}</p>
          <p className="nutrition-guidance-reason">{decision.nutrition.reason}</p>
          {unconfirmedEstimates > 0 && (
            <div className="nutrition-guidance-warning">
              <CircleAlert size={15} aria-hidden="true" />
              {unconfirmedEstimates} estimated{" "}
              {unconfirmedEstimates === 1 ? "meal needs" : "meals need"} confirmation before
              deterministic guidance can rely on {unconfirmedEstimates === 1 ? "it" : "them"}.
            </div>
          )}
        </InsightCard>

        <section
          className="nutrition-section nutrition-meals-section"
          aria-labelledby="nutrition-meals-title"
        >
          <SectionHeader
            eyebrow="Today’s record"
            title="Meals Today"
            description={
              today.length
                ? `${today.length} ${today.length === 1 ? "meal" : "meals"} logged with exact calories and macros.`
                : "Nothing logged yet. Missing meals are not treated as zero intake."
            }
            action={
              <button className="nutrition-text-action" type="button" onClick={onLogMeal}>
                Add meal <Plus size={14} aria-hidden="true" />
              </button>
            }
          />
          {today.length ? (
            <div className="nutrition-meal-timeline">
              {today.map((meal) => (
                <MealRow key={meal.id} meal={meal} onDelete={() => onDeleteMeal(meal.id)} />
              ))}
            </div>
          ) : (
            <PremiumCard className="nutrition-meals-empty">
              <span className="nutrition-empty-icon">
                <Utensils size={22} aria-hidden="true" />
              </span>
              <div>
                <h3>No meals logged today</h3>
                <p>Log a meal to begin today’s calorie and macro record.</p>
              </div>
              <button type="button" onClick={onLogMeal}>
                Log first meal <ChevronRight size={15} aria-hidden="true" />
              </button>
            </PremiumCard>
          )}
        </section>

        <div className="nutrition-support-grid">
          <PremiumCard className="nutrition-supplement-card" as="section">
            <div className="nutrition-support-heading">
              <span className="nutrition-support-icon">
                <Pill size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Supplements</p>
                <h2>Today’s log</h2>
              </div>
            </div>
            {supplements.length ? (
              <ul>
                {supplements.map((supplement) => (
                  <li key={supplement.id}>
                    <span>{supplement.name}</span>
                    <strong>{supplement.dose || "Taken"}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nutrition-support-empty">No supplements logged today.</p>
            )}
            <small>
              Supplement logging remains available through the current Jarvis action flow.
            </small>
          </PremiumCard>

          <PremiumCard className="nutrition-planned-card" as="section">
            <div className="nutrition-support-heading">
              <span className="nutrition-support-icon">
                <Flame size={17} aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Not connected</p>
                <h2>Hydration</h2>
              </div>
            </div>
            <StatusBadge tone="neutral">Planned</StatusBadge>
            <p>
              Hydration is not stored by the current app, so this view does not display a fabricated
              water total.
            </p>
          </PremiumCard>
        </div>

        <PremiumCard className="nutrition-log-methods" as="section">
          <div>
            <p className="eyebrow">Log methods</p>
            <h2>Use the entry path that fits the meal</h2>
            <p>
              Templates, foods, custom macros, and the current photo-estimate entry remain
              available.
            </p>
          </div>
          <div aria-label="Available meal logging methods">
            <span>
              <Utensils size={14} aria-hidden="true" /> Templates
            </span>
            <span>
              <Sparkles size={14} aria-hidden="true" /> Foods
            </span>
            <span>
              <Plus size={14} aria-hidden="true" /> Custom
            </span>
            <span>
              <Camera size={14} aria-hidden="true" /> Photo estimate
            </span>
          </div>
          <button type="button" onClick={onLogMeal}>
            Open Log Meal <ChevronRight size={15} aria-hidden="true" />
          </button>
        </PremiumCard>

        <PremiumCard className="nutrition-deep-dive-access" as="section">
          <div>
            <p className="eyebrow">Nutrition analysis</p>
            <h2>Explore the underlying history</h2>
            <p>Open Deep Dive for the existing macro, quality, timing, and insight surfaces.</p>
          </div>
          <button className="nutrition-secondary-action" type="button" onClick={onOpenDeepDive}>
            Open Deep Dive <ArrowRight size={16} aria-hidden="true" />
          </button>
        </PremiumCard>
      </main>
    </div>
  );
}

function MacroProgress({ macro }: { macro: MacroSummary }) {
  const targetIsSet = macro.target != null && macro.target > 0;
  const targetIsZero = macro.target === 0;
  const difference = targetIsSet ? (macro.target ?? 0) - macro.value : null;
  const status = targetIsSet
    ? (difference ?? 0) >= 0
      ? `${formatNumber(Math.abs(difference ?? 0))}g remaining`
      : `${formatNumber(Math.abs(difference ?? 0))}g over target`
    : targetIsZero
      ? "Explicit 0g target"
      : "Target unavailable";

  return (
    <PremiumCard className="nutrition-macro-card" as="article">
      <div className="nutrition-macro-card__top">
        <span className="nutrition-macro-symbol" data-tone={macro.tone}>
          {macro.shortLabel}
        </span>
        <StatusBadge tone={targetIsSet ? "info" : "neutral"}>{status}</StatusBadge>
      </div>
      <h3>{macro.label}</h3>
      <div className="nutrition-macro-card__value">
        <strong>{formatNumber(macro.value)}</strong>
        <span>{macro.unit}</span>
        <small>/ {macro.target == null ? "—" : `${formatNumber(macro.target)}${macro.unit}`}</small>
      </div>
      <div
        className="nutrition-macro-card__track"
        role="img"
        aria-label={
          targetIsSet
            ? `${macro.label}: ${formatNumber(macro.value)} of ${formatNumber(macro.target ?? 0)} grams`
            : `${macro.label}: ${formatNumber(macro.value)} grams logged; usable target unavailable`
        }
      >
        <i data-tone={macro.tone} style={{ width: `${safePercent(macro.value, macro.target)}%` }} />
      </div>
    </PremiumCard>
  );
}

function MealRow({ meal, onDelete }: { meal: MealEntry; onDelete: () => void }) {
  const estimated =
    meal.source === "camera" ||
    meal.source === "jarvis" ||
    meal.provenance?.source === "ai-estimated";
  const sourceLabel = estimated
    ? meal.confirmed
      ? "Confirmed estimate"
      : "Estimate · review status unknown"
    : "Logged meal";

  return (
    <PremiumCard className="nutrition-meal-row" as="article">
      <div className="nutrition-meal-time">
        <strong>
          {new Date(meal.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </strong>
        <span>{meal.type}</span>
      </div>
      <div className="nutrition-meal-content">
        <div>
          <h3>{meal.name}</h3>
          <span className="nutrition-meal-source">{sourceLabel}</span>
        </div>
        <div className="nutrition-meal-metrics" aria-label={`${meal.name} nutrition`}>
          <strong>{formatNumber(meal.calories)} kcal</strong>
          <span>P {formatNumber(meal.protein)}g</span>
          <span>C {formatNumber(meal.carbs)}g</span>
          <span>F {formatNumber(meal.fat)}g</span>
        </div>
      </div>
      <button type="button" onClick={onDelete} aria-label={`Delete ${meal.name} meal`}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </PremiumCard>
  );
}
