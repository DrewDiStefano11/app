import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Apple,
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  Play,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { AiInsightStrip } from "@/components/app/ai-insight";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { CountUp } from "@/components/app/count-up";
import { GoalsPanel } from "@/components/app/goals-panel";
import {
  CompactMetricCard,
  HeroSurface,
  NeedsMoreDataState,
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
import {
  bestMuscleToTrainToday,
  fitcoreScore,
  momentumScore,
  muscleMap,
  nutritionAdherenceScore,
  readinessScore,
  recoveryScore,
  todayMealTotals,
  totalVolumeInRange,
  trainingConsistencyScore,
  type HeatMode,
} from "@/lib/analytics";
import { WORKOUT_TEMPLATES } from "@/lib/data";
import { usePersistentState } from "@/lib/persist";
import { isToday, useStore } from "@/lib/store";
import type { AppState } from "@/lib/types";

export type HomeDailyPopup =
  | "volume"
  | "macros"
  | "readiness"
  | "recovery"
  | "momentum"
  | "heatmap"
  | "start"
  | "score"
  | "logmeal"
  | "checkin"
  | "weighin";

export function HomeDailyPremiumView({
  onOpen,
  onOpenMuscle,
  onOpenDeepDive,
  onOpenProgress,
  onResumeWorkout,
}: {
  onOpen: (popup: HomeDailyPopup) => void;
  onOpenMuscle: (muscle: string | null) => void;
  onOpenDeepDive: () => void;
  onOpenProgress: () => void;
  onResumeWorkout: () => void;
}) {
  const { view, state } = useStore();
  const score = useMemo(() => fitcoreScore(view), [view]);
  const training = useMemo(() => trainingConsistencyScore(view), [view]);
  const nutrition = useMemo(() => nutritionAdherenceScore(view), [view]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const momentum = useMemo(() => momentumScore(view), [view]);
  const meals = useMemo(() => todayMealTotals(view), [view]);
  const weekVolume = useMemo(() => totalVolumeInRange(view, 7), [view]);
  const bestMuscle = useMemo(() => bestMuscleToTrainToday(view), [view]);
  const [heatMode] = usePersistentState<HeatMode>("heatmap.mode", "load");
  const heatValues = useMemo(() => muscleMap(view, heatMode), [view, heatMode]);
  const targets = state.nutritionTargets;
  const activeWorkout = state.activeWorkout;
  const pct = (value: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const calorieRawPct =
    targets.calories > 0 ? Math.round((meals.calories / targets.calories) * 100) : 0;
  const caloriePct = pct(meals.calories, targets.calories);

  const assignedWorkout = useMemo(() => {
    const assigned = state.workoutTemplates[0];
    return assigned
      ? WORKOUT_TEMPLATES.find((template) => template.id === assigned.templateId)
      : undefined;
  }, [state.workoutTemplates]);

  const signals = useMemo(
    () => [
      view.workouts.some((workout) => isToday(workout.startedAt) && Boolean(workout.endedAt)),
      view.mealEntries.some((meal) => isToday(meal.createdAt)),
      targets.protein > 0 && meals.protein >= targets.protein,
      view.recoveryCheckIns.some((checkIn) => isToday(checkIn.createdAt)),
      view.bodyweightEntries.some((entry) => isToday(entry.createdAt)),
    ],
    [
      meals.protein,
      targets.protein,
      view.bodyweightEntries,
      view.mealEntries,
      view.recoveryCheckIns,
      view.workouts,
    ],
  );
  const completed = signals.filter(Boolean).length;
  const previousCompleted = useRef(completed);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (completed <= previousCompleted.current) {
      previousCompleted.current = completed;
      return;
    }
    previousCompleted.current = completed;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 1200);
    return () => window.clearTimeout(timer);
  }, [completed]);

  const now = Date.now();
  const hasRecentSleep = view.sleepEntries.some(
    (entry) => now - entry.createdAt <= 48 * 60 * 60 * 1000,
  );
  const hasRecentCheckIn = view.recoveryCheckIns.some(
    (entry) => now - entry.createdAt <= 36 * 60 * 60 * 1000,
  );
  const sourceCount = Number(hasRecentSleep) + Number(hasRecentCheckIn);
  const readinessQuality: DataQualityDetails =
    sourceCount === 2
      ? { state: "ready", confidence: "high", sourceCount }
      : sourceCount === 1
        ? {
            state: "partial",
            confidence: "medium",
            sourceCount,
            reason: hasRecentSleep ? "No recent check-in" : "No recent sleep",
          }
        : {
            state: "needs_more_data",
            confidence: "low",
            requiredHistory: 2,
            reason: "No recent sleep or check-in",
          };
  const readinessDetail =
    sourceCount === 2
      ? "Sleep + check-in"
      : sourceCount === 1
        ? `Estimated · ${hasRecentSleep ? "no recent check-in" : "no recent sleep"}`
        : "Baseline · no recent sleep or check-in";

  const priority = activeWorkout
    ? {
        eyebrow: "Training",
        title: `Resume ${activeWorkout.name}`,
        detail: "Your active session is saved and ready at the next set.",
        label: "Resume workout",
        run: onResumeWorkout,
      }
    : !signals[0]
      ? {
          eyebrow: "Training",
          title: assignedWorkout?.name ?? "Start today's training",
          detail: assignedWorkout
            ? `${assignedWorkout.durationMin} min assigned session`
            : "Choose a workout and begin your first set.",
          label: "Start workout",
          run: () => onOpen("start"),
        }
      : !signals[1]
        ? {
            eyebrow: "Nutrition",
            title: "Log your first meal",
            detail: `${Math.max(0, targets.calories - meals.calories)} calories remain in today's target.`,
            label: "Log meal",
            run: () => onOpen("logmeal"),
          }
        : !signals[2]
          ? {
              eyebrow: "Nutrition",
              title: `Close the ${Math.max(0, Math.round(targets.protein - meals.protein))} g protein gap`,
              detail: "Add a protein-forward meal or snack to move toward today's target.",
              label: "Log protein",
              run: () => onOpen("logmeal"),
            }
          : !signals[3]
            ? {
                eyebrow: "Recovery",
                title: "Complete a recovery check-in",
                detail:
                  "Add energy, soreness, stress, and motivation for today's readiness context.",
                label: "Check in",
                run: () => onOpen("checkin"),
              }
            : !signals[4]
              ? {
                  eyebrow: "Progress",
                  title: "Add today's weigh-in",
                  detail: "One measurement keeps your bodyweight direction current.",
                  label: "Weigh in",
                  run: () => onOpen("weighin"),
                }
              : {
                  eyebrow: "Daily plan",
                  title: "Today's core actions are complete",
                  detail: "Review the score drivers or open Deep Dive for more detail.",
                  label: "Review score",
                  run: () => onOpen("score"),
                };

  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("raw");
  const [comparisonRange, setComparisonRange] = useState<RangeKey>("14d");
  const [comparisonFocusOpen, setComparisonFocusOpen] = useState(false);
  const comparisonData = useMemo<ChartPoint[]>(() => buildComparisonData(view), [view]);
  const comparisonSeries: ChartSeries[] = [
    { id: "volume", label: "Volume", unit: "lb", color: "#a78bfa", axis: "left" },
    { id: "calories", label: "Calories", unit: "kcal", color: "#f59e0b", axis: "right" },
  ];
  const [selectedChart, setSelectedChart] = useState("volume");
  const [pinnedChart, setPinnedChart] = useState<string | undefined>("volume");
  const [suggestedChart, setSuggestedChart] = useState<string | undefined>();
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const recentWeights = [...view.bodyweightEntries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-7);
  const weightChange =
    recentWeights.length > 1
      ? recentWeights.at(-1)!.weightLb - recentWeights[0].weightLb
      : undefined;
  useEffect(() => {
    if (recentWeights.length > 1 && suggestedChart === undefined && !dismissedSuggestion) {
      setSuggestedChart("weight");
    }
  }, [dismissedSuggestion, recentWeights.length, suggestedChart]);
  const scoreDrivers = [
    { label: "Training", value: training },
    { label: "Nutrition", value: nutrition },
    { label: "Recovery", value: recovery },
  ];
  const strongestDriver = [...scoreDrivers].sort((a, b) => b.value - a.value)[0];
  const focusDriver = [...scoreDrivers].sort((a, b) => a.value - b.value)[0];
  const macroRatios = [
    { label: "protein", value: meals.protein, target: targets.protein },
    { label: "carbohydrates", value: meals.carbs, target: targets.carbs },
    { label: "fat", value: meals.fat, target: targets.fat },
  ];
  const macroFocus = [...macroRatios].sort(
    (a, b) => (a.target > 0 ? a.value / a.target : 1) - (b.target > 0 ? b.value / b.target : 1),
  )[0];
  const macroAttention =
    macroFocus.target > 0 && macroFocus.value >= macroFocus.target
      ? "All macro targets met"
      : `${macroFocus.label} needs the most attention`;
  const nutritionStatus =
    meals.calories === 0
      ? "Not started"
      : calorieRawPct > 110
        ? "Above today's target"
        : calorieRawPct >= 80
          ? "Near today's target"
          : "Room remaining";
  const analyticsItems: StackItem[] = [
    {
      id: "volume",
      label: "7-day volume",
      description: "Completed set volume · last 7 days",
      quality: view.workouts.length
        ? { state: "ready" }
        : { state: "needs_more_data", requiredHistory: 1 },
      content: (
        <div className="home-stack-chart">
          <div className="home-stack-value">
            <strong>{Math.round(weekVolume / 1000)}k</strong>
            <span>lb</span>
          </div>
          <VolumeBars view={view} />
          <StackLink onClick={() => onOpen("volume")}>Open volume details</StackLink>
        </div>
      ),
    },
    {
      id: "nutrition",
      label: "Macro status",
      description: "Today's logged macros",
      quality: signals[1] ? { state: "ready" } : { state: "needs_more_data", requiredHistory: 1 },
      content: (
        <div className="space-y-2">
          <MacroBar label="P" value={meals.protein} target={targets.protein} color="#ef4444" />
          <MacroBar label="C" value={meals.carbs} target={targets.carbs} color="#f59e0b" />
          <MacroBar label="F" value={meals.fat} target={targets.fat} color="#22c55e" />
          <StackLink onClick={() => onOpen("macros")}>Open macro details</StackLink>
        </div>
      ),
    },
    {
      id: "momentum",
      label: "Momentum",
      description: "Consistency across your recent logs",
      quality: momentum.hasData
        ? { state: "ready" }
        : { state: "needs_more_data", requiredHistory: 2 },
      content: (
        <StackSummary
          value={momentum.hasData ? momentum.score : "—"}
          title={momentum.label}
          detail={momentum.explanation}
          action="Details"
          onClick={() => onOpen("momentum")}
        />
      ),
    },
    {
      id: "weight",
      label: "Bodyweight direction",
      description: "Most recent recorded weigh-ins",
      suggested: suggestedChart === "weight",
      quality:
        recentWeights.length > 1
          ? { state: "ready" }
          : { state: "needs_more_data", requiredHistory: 2 - recentWeights.length },
      content:
        recentWeights.length > 1 ? (
          <StackSummary
            value={recentWeights.at(-1)!.weightLb}
            title={`${weightChange! > 0 ? "+" : ""}${weightChange!.toFixed(1)} lb`}
            detail={`Change across ${recentWeights.length} recorded weigh-ins.`}
            action="Add entry"
            onClick={() => onOpen("weighin")}
          />
        ) : (
          <p className="home-stack-empty">
            Add {2 - recentWeights.length} more weigh-in{recentWeights.length === 1 ? "" : "s"} to
            show direction.
          </p>
        ),
    },
  ];
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const [selectedMuscle, setSelectedMuscle] = useState<string>();
  const selectMuscle = (muscle: string) => {
    setSelectedMuscle(muscle);
    onOpenMuscle(muscle);
  };
  const openAi = () => window.dispatchEvent(new CustomEvent("fitcore:open-ai"));
  const insight =
    view.workouts.length || view.mealEntries.length
      ? `Readiness is ${readiness}. ${bestMuscle} has the strongest current training signal.`
      : "Log your first workout or turn on Demo Data in Settings to see your full dashboard.";

  return (
    <SectionTheme section="home" className="home-premium-daily">
      <HeroSurface
        eyebrow="FitCore Score"
        value={<CountUp value={score} duration={700} />}
        unit="/ 100"
        status={`${scoreLabel(score)} today`}
        supportingFact={`${completed} of ${signals.length} daily signals complete · ${Math.round(weekVolume / 1000)}k lb this week`}
        className="home-daily-hero"
        action={
          <button className="premium-primary-action" type="button" onClick={() => onOpen("score")}>
            View score details <ChevronRight size={17} />
          </button>
        }
      >
        <div className="home-driver-list" aria-label="FitCore score drivers">
          {scoreDrivers.map((driver) => (
            <div key={driver.label}>
              <span>{driver.label}</span>
              <span className="home-driver-track">
                <i style={{ width: `${driver.value}%` }} />
              </span>
              <b>{driverTone(driver.value)}</b>
            </div>
          ))}
        </div>
        <p className="home-driver-summary">
          <strong>{strongestDriver.label}</strong> is strongest. Focus next on{" "}
          <strong>{focusDriver.label.toLowerCase()}</strong>.
        </p>
      </HeroSurface>

      <section className="home-support-strip" aria-label="Daily support scores">
        <SupportScore
          label="Readiness"
          value={readiness}
          detail={readinessDetail}
          quality={readinessQuality}
          onClick={() => onOpen("readiness")}
        />
        <SupportScore
          label="Recovery"
          value={recovery}
          detail={readinessDetail}
          quality={readinessQuality}
          onClick={() => onOpen("recovery")}
        />
        <SupportScore
          label="Momentum"
          value={momentum.hasData ? momentum.score : "—"}
          detail={momentum.hasData ? momentum.label : "Needs recent logs"}
          quality={
            momentum.hasData ? { state: "ready" } : { state: "needs_more_data", requiredHistory: 2 }
          }
          onClick={() => onOpen("momentum")}
        />
      </section>

      <section
        className={`home-priority${celebrating ? " is-celebrating" : ""}`}
        aria-labelledby="today-priority-title"
      >
        <div className="home-priority__top">
          <StatusBadge tone="info">Today's priority</StatusBadge>
          <span>
            {celebrating ? <Sparkles size={13} /> : <Check size={13} />}
            {completed}/{signals.length} complete
          </span>
        </div>
        <p className="eyebrow mt-4">{priority.eyebrow}</p>
        <h2 id="today-priority-title">{priority.title}</h2>
        <p>{priority.detail}</p>
        <button type="button" className="premium-primary-action" onClick={priority.run}>
          {priority.label}
          <ArrowRight size={17} />
        </button>
      </section>

      <DashboardSection
        eyebrow="Universal comparison"
        title="Training volume vs calories"
        description="Only dates with a recorded workout or meal are shown."
        action={
          <button className="home-text-action" type="button" onClick={onOpenDeepDive}>
            Deep Dive <ChevronRight size={14} />
          </button>
        }
      >
        {comparisonData.length >= 2 ? (
          <ComparisonChart
            compact
            title="14-day logged comparison"
            data={comparisonData}
            series={comparisonSeries}
            mode={comparisonMode}
            onModeChange={setComparisonMode}
            onFocus={() => setComparisonFocusOpen(true)}
            animate={false}
          />
        ) : (
          <NeedsMoreDataState
            message="Log activity on at least two dates to compare training volume with nutrition."
            requiredHistory={Math.max(1, 2 - comparisonData.length)}
          />
        )}
        <button className="home-customize-action" type="button" onClick={onOpenDeepDive}>
          Customize in Deep Dive <Settings size={15} />
        </button>
      </DashboardSection>

      <PinnedAnalyticsStack
        items={analyticsItems}
        selectedId={selectedChart}
        pinnedId={pinnedChart}
        onSelectedIdChange={setSelectedChart}
        onPinChange={setPinnedChart}
        onDismissSuggested={() => {
          setDismissedSuggestion(true);
          setSuggestedChart(undefined);
        }}
        onCustomize={onOpenDeepDive}
        ariaLabel="Home analytics"
      />

      <DashboardSection
        eyebrow={`Muscle ${heatMode} · ${heatMode === "strength" ? "30d" : heatMode === "recovery" ? "3d" : "7d"}`}
        title="Body status"
        description={`${topLoaded(heatValues)} is the strongest current map signal.`}
        action={
          <button
            className="home-text-action"
            type="button"
            aria-label="Open Body Heat Map details"
            onClick={() => onOpen("heatmap")}
          >
            Full analysis <ChevronRight size={14} />
          </button>
        }
      >
        <PremiumCard className="home-body-card">
          <div className="home-body-toggle" aria-label="Body view">
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
          <div className="home-body-map">
            <BodyHeatmap
              values={heatValues}
              mode={heatMode}
              compact
              side={bodySide}
              onSelect={selectMuscle}
            />
          </div>
          <div className="home-body-summary">
            <span>Best training signal</span>
            <strong className="capitalize">{bestMuscle}</strong>
            <small>
              {selectedMuscle ? `${selectedMuscle} selected` : "Tap a muscle for its details."}
            </small>
          </div>
        </PremiumCard>
      </DashboardSection>

      <DashboardSection
        eyebrow="Today"
        title="Nutrition summary"
        action={
          <button className="home-text-action" type="button" onClick={() => onOpen("macros")}>
            Details <ChevronRight size={14} />
          </button>
        }
      >
        <PremiumCard className="home-nutrition-summary">
          <div>
            <span>Calories</span>
            <strong>
              <CountUp value={meals.calories} /> <small>/ {targets.calories}</small>
            </strong>
            <p>{Math.max(0, targets.calories - meals.calories)} kcal remaining</p>
            <small className="home-nutrition-status">
              {nutritionStatus} · {macroAttention}
            </small>
          </div>
          <div
            className="home-nutrition-ring"
            style={{ "--progress": `${caloriePct * 3.6}deg` } as CSSProperties}
          >
            <span>{caloriePct}%</span>
          </div>
          <div className="home-nutrition-bars">
            <MacroBar label="P" value={meals.protein} target={targets.protein} color="#ef4444" />
            <MacroBar label="C" value={meals.carbs} target={targets.carbs} color="#f59e0b" />
            <MacroBar label="F" value={meals.fat} target={targets.fat} color="#22c55e" />
          </div>
          <button type="button" onClick={() => onOpen("logmeal")}>
            Log meal <Plus size={15} />
          </button>
        </PremiumCard>
      </DashboardSection>

      <DashboardSection
        eyebrow="Progress"
        title="Goals & momentum"
        action={
          <button className="home-text-action" type="button" onClick={onOpenProgress}>
            Progress <ChevronRight size={14} />
          </button>
        }
      >
        <PremiumCard className="home-momentum-callout">
          <div>
            <span>Momentum</span>
            <strong>{momentum.hasData ? momentum.score : "—"}</strong>
          </div>
          <p>{momentum.explanation}</p>
          <button type="button" onClick={() => onOpen("momentum")}>
            View details <ChevronRight size={14} />
          </button>
        </PremiumCard>
        <GoalsPanel compact />
      </DashboardSection>

      <div className="home-ai-insight">
        <AiInsightStrip onClick={openAi}>{insight}</AiInsightStrip>
      </div>

      <DashboardSection eyebrow="Log" title="Quick actions">
        <div className="home-quick-grid">
          <QuickAction
            icon={<Play size={20} />}
            label={activeWorkout ? "Resume Workout" : "Start Workout"}
            onClick={activeWorkout ? onResumeWorkout : () => onOpen("start")}
          />
          <QuickAction
            icon={<Plus size={20} />}
            label="Log Meal"
            onClick={() => onOpen("logmeal")}
          />
          <QuickAction
            icon={<Heart size={20} />}
            label="Check In"
            onClick={() => onOpen("checkin")}
          />
          <QuickAction
            icon={<Apple size={20} />}
            label="Weigh In"
            onClick={() => onOpen("weighin")}
          />
        </div>
      </DashboardSection>

      <PremiumCard className="home-deep-dive-access">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>Open Deep Dive</h2>
          <p>
            Inspect longer ranges, chart controls, and detailed drivers without changing today's
            plan.
          </p>
        </div>
        <button className="premium-primary-action" type="button" onClick={onOpenDeepDive}>
          Open Deep Dive <ArrowRight size={17} />
        </button>
      </PremiumCard>

      <ChartFocusMode
        open={comparisonFocusOpen}
        onClose={() => setComparisonFocusOpen(false)}
        title="Training volume vs calories"
        chart={
          <ComparisonChart
            title="14-day logged comparison"
            data={comparisonData}
            series={comparisonSeries}
            mode={comparisonMode}
            onModeChange={setComparisonMode}
            animate={false}
          />
        }
        series={comparisonSeries}
        range={comparisonRange}
        onRangeChange={setComparisonRange}
        mode={comparisonMode}
        onModeChange={setComparisonMode}
        data={comparisonData}
      />
    </SectionTheme>
  );
}

function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="home-section-block">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      {children}
    </section>
  );
}

function SupportScore({
  label,
  value,
  detail,
  quality,
  onClick,
}: {
  label: string;
  value: number | string;
  detail: string;
  quality: DataQualityDetails;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={`${label} ${value}`}>
      <CompactMetricCard
        label={label}
        value={value}
        unit={typeof value === "number" ? "/ 100" : undefined}
        detail={detail}
        quality={quality}
      />
    </button>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  return (
    <div className="home-macro-bar">
      <div>
        <span>{label}</span>
        <b>
          {Math.round(value)}/{target}g
        </b>
      </div>
      <span>
        <i
          style={{
            width: `${target > 0 ? Math.min(100, (value / target) * 100) : 0}%`,
            background: color,
          }}
        />
      </span>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="home-quick-action press">
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="home-stack-link" type="button" onClick={onClick}>
      {children}
      <ChevronRight size={14} />
    </button>
  );
}

function StackSummary({
  value,
  title,
  detail,
  action,
  onClick,
}: {
  value: ReactNode;
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="home-stack-summary">
      <strong>{value}</strong>
      <div>
        <b>{title}</b>
        <p>{detail}</p>
      </div>
      <button type="button" onClick={onClick}>
        {action}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function VolumeBars({ view }: { view: AppState }) {
  const values = Array.from({ length: 7 }, (_, index) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (6 - index));
    const end = start.getTime() + 86400000;
    return view.workouts
      .filter((workout) => workout.startedAt >= start.getTime() && workout.startedAt < end)
      .reduce(
        (total, workout) =>
          total +
          workout.exercises.reduce(
            (exerciseTotal, exercise) =>
              exerciseTotal +
              exercise.sets.reduce(
                (setTotal, set) =>
                  setTotal + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0),
                0,
              ),
            0,
          ),
        0,
      );
  });
  const max = Math.max(1, ...values);
  return (
    <div className="home-volume-bars" role="img" aria-label="Seven day completed training volume">
      {values.map((value, index) => (
        <span key={index}>
          <i style={{ height: `${value ? Math.max(8, (value / max) * 100) : 3}%` }} />
        </span>
      ))}
    </div>
  );
}

function buildComparisonData(view: AppState): ChartPoint[] {
  const cutoff = Date.now() - 14 * 86400000;
  const days = new Map<string, { timestamp: number; volume: number; calories: number }>();
  const getDay = (timestamp: number) => {
    const date = new Date(timestamp);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const day = days.get(key) ?? { timestamp, volume: 0, calories: 0 };
    days.set(key, day);
    return day;
  };
  view.workouts
    .filter((workout) => workout.startedAt >= cutoff && workout.startedAt <= Date.now())
    .forEach((workout) => {
      const day = getDay(workout.startedAt);
      day.volume += workout.exercises.reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal +
          exercise.sets.reduce(
            (setTotal, set) =>
              setTotal + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0),
            0,
          ),
        0,
      );
    });
  view.mealEntries
    .filter((meal) => meal.createdAt >= cutoff && meal.createdAt <= Date.now())
    .forEach((meal) => {
      getDay(meal.createdAt).calories += meal.calories;
    });
  return [...days.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((day) => ({
      date: new Date(day.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
      volume: day.volume || null,
      calories: day.calories || null,
    }));
}

function scoreLabel(score: number) {
  if (score >= 80) return "Elite";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Building";
  return "Foundation";
}

function driverTone(value: number) {
  if (value >= 70) return "Strong";
  if (value >= 45) return "Building";
  return "Focus";
}

function topLoaded(map: Record<string, number>) {
  const [top, value] = Object.entries(map).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!top || !value) return "No recorded load";
  if (["quads", "hamstrings", "glutes", "calves"].includes(top)) return "Lower body";
  if (["chest", "triceps", "shoulders"].includes(top)) return "Push";
  if (["back", "biceps"].includes(top)) return "Pull";
  return top;
}
