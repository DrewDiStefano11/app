import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Apple,
  Check,
  ChevronRight,
  ChevronDown,
  Flame,
  Heart,
  Play,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Info,
  BarChart2,
  TrendingUp,
  Activity,
  Zap,
  Lock,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AiInsightStrip } from "@/components/app/ai-insight";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { CountUp } from "@/components/app/count-up";
import { GoalsPanel } from "@/components/app/goals-panel";
import { HeatmapDetailSheet } from "@/components/app/popups/heatmap-popup";
import { MacroDetailSheet } from "@/components/app/popups/macro-popup";
import { MomentumDetailSheet } from "@/components/app/popups/momentum-popup";
import { MuscleDetailSheet } from "@/components/app/popups/muscle-popup";
import { CheckInSheet, LogMealSheet, WeighInSheet } from "@/components/app/popups/quick-popups";
import { ReadinessDetailSheet } from "@/components/app/popups/readiness-popup";
import { FitcoreScoreSheet } from "@/components/app/popups/score-popup";
import { StartWorkoutSheet } from "@/components/app/popups/start-workout-popup";
import { VolumeDetailSheet } from "@/components/app/popups/volume-popup";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { ViewModeToggle } from "@/components/app/shared/view-mode-toggle";
import { Eyebrow, Tile } from "@/components/app/tile";
import {
  bestMuscleToTrainToday,
  fitcoreScore,
  momentumScore,
  muscleMap,
  readinessScore,
  recoveryScore,
  todayMealTotals,
  totalVolumeInRange,
  trainingConsistencyScore,
  trainingStreak,
  nutritionAdherenceScore,
  type HeatMode,
} from "@/lib/analytics";
import { volumeByDayOfWeek, volumeByExercise, volumeByMuscle } from "@/lib/analytics-extra";
import { WORKOUT_TEMPLATES } from "@/lib/data";
import { GRAPH_PREFS, usePersistentState } from "@/lib/persist";
import { isToday, useStore } from "@/lib/store";
import type { AppState, SectionId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Popup =
  | null
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

export function HomeView({
  onNavigate,
  onOpenSettings,
  layoutMode,
  onLayoutModeChange,
}: {
  onNavigate: (section: SectionId) => void;
  onOpenSettings: () => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
}) {
  const { view, state } = useStore();
  const name = (state.profile as { name?: string }).name ?? "ATHLETE";
  const streak = useMemo(() => trainingStreak(view), [view]);
  const weekVol = useMemo(() => totalVolumeInRange(view, 7), [view]);

  const [popup, setPopup] = useState<Popup>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  return (
    <div className="home-command-center pb-2">
      <header className="home-command-header">
        <div className="min-w-0">
          <Eyebrow>Command Center</Eyebrow>
          <h1 className="home-command-title">
            Good Morning, <span>{name}</span>
          </h1>
          <div className="home-status-strip">
            <span className="home-status-chip">
              <Flame size={12} />
              {streak}d streak
            </span>
            <button onClick={() => setPopup("volume")} className="home-status-chip press">
              Week vol <CountUp value={Math.round(weekVol / 1000)} />k
            </button>
            {state.demoMode && (
              <span className="home-status-chip home-status-chip--demo">Demo</span>
            )}
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="home-settings-button press"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
          <span className="home-settings-dot" />
        </button>
      </header>

      <div className="space-y-4 px-4">
        <ViewModeToggle mode={layoutMode} onModeChange={onLayoutModeChange} />

        {layoutMode === "daily" ? (
          <HomeDailyView setPopup={setPopup} setMuscle={setMuscle} onNavigate={onNavigate} />
        ) : (
          <HomeDeepDive setPopup={setPopup} setMuscle={setMuscle} onNavigate={onNavigate} />
        )}
      </div>

      <VolumeDetailSheet open={popup === "volume"} onClose={() => setPopup(null)} />
      <MacroDetailSheet open={popup === "macros"} onClose={() => setPopup(null)} />
      <ReadinessDetailSheet
        open={popup === "readiness"}
        onClose={() => setPopup(null)}
        focus="readiness"
      />
      <ReadinessDetailSheet
        open={popup === "recovery"}
        onClose={() => setPopup(null)}
        focus="recovery"
      />
      <MomentumDetailSheet
        open={popup === "momentum"}
        onClose={() => setPopup(null)}
        momentum={momentumScore(view)}
      />
      <HeatmapDetailSheet open={popup === "heatmap"} onClose={() => setPopup(null)} />
      <StartWorkoutSheet
        open={popup === "start"}
        onClose={() => setPopup(null)}
        onStarted={() => onNavigate("training")}
      />
      <FitcoreScoreSheet open={popup === "score"} onClose={() => setPopup(null)} />
      <LogMealSheet open={popup === "logmeal"} onClose={() => setPopup(null)} />
      <CheckInSheet open={popup === "checkin"} onClose={() => setPopup(null)} />
      <WeighInSheet open={popup === "weighin"} onClose={() => setPopup(null)} />
      <MuscleDetailSheet muscle={muscle} onClose={() => setMuscle(null)} />
    </div>
  );
}

function HomeDailyView({
  setPopup,
  setMuscle,
  onNavigate,
}: {
  setPopup: (p: Popup) => void;
  setMuscle: (m: string | null) => void;
  onNavigate: (section: SectionId) => void;
}) {
  const { view, state } = useStore();

  const score = useMemo(() => fitcoreScore(view), [view]);
  const trainingDriver = useMemo(() => trainingConsistencyScore(view), [view]);
  const nutritionDriver = useMemo(() => nutritionAdherenceScore(view), [view]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const momentum = useMemo(() => momentumScore(view), [view]);

  const [heatMode] = usePersistentState<HeatMode>("heatmap.mode", "load");
  const loadMap = useMemo(() => muscleMap(view, heatMode), [view, heatMode]);
  const [volumeMode] = usePersistentState<string>(GRAPH_PREFS.volumeMode, "total");
  const meals = useMemo(() => todayMealTotals(view), [view]);
  const weekVol = useMemo(() => totalVolumeInRange(view, 7), [view]);
  const lastWeekVol = useMemo(() => totalVolumeInRange(view, 14) - weekVol, [view, weekVol]);
  const volDelta = lastWeekVol > 0 ? Math.round(((weekVol - lastWeekVol) / lastWeekVol) * 100) : 0;
  const bestMuscle = useMemo(() => bestMuscleToTrainToday(view), [view]);
  const targets = state.nutritionTargets;
  const kcalPct =
    targets.calories > 0 ? Math.min(100, Math.round((meals.calories / targets.calories) * 100)) : 0;
  const proteinPct =
    targets.protein > 0 ? Math.min(100, Math.round((meals.protein / targets.protein) * 100)) : 0;
  const carbsPct =
    targets.carbs > 0 ? Math.min(100, Math.round((meals.carbs / targets.carbs) * 100)) : 0;
  const fatPct = targets.fat > 0 ? Math.min(100, Math.round((meals.fat / targets.fat) * 100)) : 0;
  const hasAnyData = view.workouts.length > 0 || view.mealEntries.length > 0;
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const assignedWorkout = useMemo(() => {
    const assigned = state.workoutTemplates[0];
    return assigned
      ? WORKOUT_TEMPLATES.find((template) => template.id === assigned.templateId)
      : undefined;
  }, [state.workoutTemplates]);

  const dailyTargets = useMemo(
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
  const completedToday = dailyTargets.filter(Boolean).length;
  const previousCompleted = useRef(completedToday);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (completedToday <= previousCompleted.current) {
      previousCompleted.current = completedToday;
      return;
    }
    previousCompleted.current = completedToday;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 1600);
    return () => window.clearTimeout(timer);
  }, [completedToday]);

  const strongestOrbit = [
    { id: "readiness", value: readiness },
    { id: "recovery", value: recovery },
    { id: "momentum", value: momentum.hasData ? momentum.score : -1 },
  ].sort((a, b) => b.value - a.value)[0].id;

  const scoreDrivers = [
    { label: "Training", value: trainingDriver },
    { label: "Nutrition", value: nutritionDriver },
    { label: "Recovery", value: recovery },
  ];

  const openAi = () => window.dispatchEvent(new CustomEvent("fitcore:open-ai"));
  const selectMuscle = (nextMuscle: string) => {
    setSelectedMuscle(nextMuscle);
    setMuscle(nextMuscle);
  };

  const insight = !hasAnyData
    ? "Log your first workout or turn on Demo Data in Settings to see your full dashboard."
    : readiness >= 80
      ? `Readiness is ${readiness}. Prime day for a heavy ${bestMuscle} session.`
      : readiness >= 60
        ? `Readiness is ${readiness}. Solid day — train ${bestMuscle} at moderate intensity.`
        : `Readiness is low (${readiness}). Prioritize recovery and skill work today.`;

  return (
    <>
      <section className="home-orbit-hero" aria-label="FitCore status">
        <span
          className={`home-score-connector home-score-connector--${strongestOrbit}`}
          aria-hidden="true"
        />
        <button
          onClick={() => setPopup("score")}
          className="home-score-panel press"
          aria-label={`FitCore Score ${score}`}
        >
          <span className="home-score-kicker">FitCore Score</span>
          <span className="home-score-value">
            <CountUp value={score} duration={1100} delay={80} />
          </span>
          <span className="home-score-label">{scoreLabel(score)}</span>
          <span className="home-score-drivers" aria-label="FitCore score drivers">
            <span className="home-score-drivers__title">Score drivers</span>
            {scoreDrivers.map((driver) => (
              <span className="home-score-driver" key={driver.label}>
                <span>{driver.label}</span>
                <span className="home-score-driver__track" aria-hidden="true">
                  <span style={{ width: `${driver.value}%` }} />
                </span>
                <b>{driverTone(driver.value)}</b>
              </span>
            ))}
          </span>
          <span className="home-score-progress" aria-hidden="true">
            <span style={{ width: `${score}%` }} />
          </span>
          <span className="home-score-trend">
            <b className={volDelta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
              {volDelta >= 0 ? "↑" : "↓"} {Math.abs(volDelta)}%
            </b>
            vs last week
          </span>
        </button>

        <div className="home-orbit-field" aria-label="Daily status scores">
          <span className="home-orbit-line home-orbit-line--shared" />
          <OrbitalScore
            label="Readiness"
            value={readiness}
            color="var(--recovery)"
            className="home-orbit-score--readiness"
            onClick={() => setPopup("readiness")}
            countDelay={180}
          />
          <OrbitalScore
            label="Recovery"
            value={recovery}
            color="var(--success)"
            className="home-orbit-score--recovery"
            onClick={() => setPopup("recovery")}
            countDelay={320}
          />
          <OrbitalScore
            label="Momentum"
            value={momentum.score}
            displayValue={momentum.hasData ? undefined : "—"}
            color="var(--momentum)"
            className="home-orbit-score--momentum"
            onClick={() => setPopup("momentum")}
            countDelay={460}
          />
        </div>
      </section>

      <section className={`home-today-section${celebrating ? " is-celebrating" : ""}`}>
        <div className="home-section-heading">
          <span>Today</span>
          <span className="home-today-completion">
            {celebrating ? <Sparkles size={11} aria-hidden="true" /> : <Check size={11} />}
            {completedToday} of {dailyTargets.length} complete
          </span>
        </div>
        <div className="home-today-grid">
          <Tile
            delay={80}
            onClick={() => setPopup("heatmap")}
            className="home-section-card home-section-card--muscle"
          >
            <div className="flex h-full flex-col">
              <Eyebrow color="rgb(74 222 128)">
                Muscle {heatMode === "load" ? "Load" : heatMode} ·{" "}
                {heatMode === "strength" ? "30d" : heatMode === "recovery" ? "3d" : "7d"}
              </Eyebrow>
              <div className="mt-2 flex flex-1 items-end justify-between gap-2">
                <div className="min-w-0 pb-1">
                  <h2 className="font-display text-[1.7rem] uppercase leading-none">
                    {topLoaded(loadMap)}
                  </h2>
                  <p className="mt-1 font-display text-xl uppercase text-white/35">
                    {heatMode === "recovery"
                      ? "Most recovered"
                      : heatMode === "imbalance"
                        ? "Biggest gap"
                        : "Most worked"}
                  </p>
                  <p className="mt-3 text-[11px] text-white/50">
                    Best today:{" "}
                    <span className="font-bold capitalize text-white">{bestMuscle}</span>
                  </p>
                </div>
                <div className="home-muscle-map">
                  <div className="home-muscle-figure">
                    <BodyHeatmap
                      values={loadMap}
                      mode={heatMode}
                      compact
                      side="front"
                      selected={selectedMuscle}
                      onSelect={selectMuscle}
                    />
                    <span>Front</span>
                  </div>
                  <div className="home-muscle-figure">
                    <BodyHeatmap
                      values={loadMap}
                      mode={heatMode}
                      compact
                      side="back"
                      selected={selectedMuscle}
                      onSelect={selectMuscle}
                    />
                    <span>Back</span>
                  </div>
                </div>
              </div>
              <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-white/35">
                Tap to expand →
              </span>
            </div>
          </Tile>

          <Tile
            delay={120}
            onClick={() => setPopup("macros")}
            className="home-section-card home-section-card--macros"
          >
            <Eyebrow color="var(--nutrition)">Macros</Eyebrow>
            <div className="mt-2 font-display text-4xl leading-none">
              <CountUp value={meals.calories} />
              <span className="ml-1 text-xs font-bold uppercase text-white/30">
                / {targets.calories}
              </span>
            </div>
            <div className="mt-5 space-y-2">
              <MacroBar
                label="P"
                value={meals.protein}
                target={targets.protein}
                pct={proteinPct}
                color="rgb(239 68 68)"
              />
              <MacroBar
                label="C"
                value={meals.carbs}
                target={targets.carbs}
                pct={carbsPct}
                color="rgb(245 158 11)"
              />
              <MacroBar
                label="F"
                value={meals.fat}
                target={targets.fat}
                pct={fatPct}
                color="rgb(34 197 94)"
              />
            </div>
            <div className="mt-3 text-[9px] font-bold uppercase tracking-widest text-white/35">
              {kcalPct}% of daily goal
            </div>
          </Tile>

          <GoalsPanel compact />

          <Tile
            delay={200}
            onClick={() => setPopup("volume")}
            className="home-section-card home-section-card--volume"
          >
            <Eyebrow color="var(--success)">
              Volume · {volumeMode === "total" ? "7d" : volumeMode}
            </Eyebrow>
            <div className="mt-2 font-display text-4xl leading-none">
              <CountUp value={Math.round(weekVol / 1000)} />
              <span className="ml-1 text-xs font-bold uppercase text-white/30">k lb</span>
            </div>
            <div className="mt-6 h-20">
              <VolumePreview view={view} mode={volumeMode} />
            </div>
            <div
              className="mt-3 text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: volDelta >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              {volDelta >= 0 ? "↑" : "↓"} {Math.abs(volDelta)}% trend
            </div>
          </Tile>

          <div className="home-momentum-summary home-momentum-summary--grid">
            <div>
              <span className="eyebrow text-[var(--momentum)]">Momentum</span>
              <p className="mt-2 font-display text-2xl uppercase text-white/90">{momentum.label}</p>
            </div>
            <div className="home-momentum-grid-score">
              <span>{momentum.hasData ? momentum.score : "—"}</span>
              <small>/ 100</small>
            </div>
            <p className="line-clamp-3 text-[11px] leading-relaxed text-white/45">
              {momentum.explanation}
            </p>
            <button
              className="home-summary-arrow press"
              onClick={() => setPopup("momentum")}
              aria-label="Open Momentum Score details"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <button
        onClick={openAi}
        className="home-ai-insight animate-tile-in press"
        style={{ animationDelay: "260ms" }}
      >
        <AiInsightStrip>
          {insight.split(bestMuscle)[0]}
          <span className="font-bold capitalize text-[var(--section)]">
            {insight.includes(bestMuscle) ? bestMuscle : ""}
          </span>
          {insight.split(bestMuscle)[1] ?? ""}
        </AiInsightStrip>
      </button>

      <button
        onClick={() => setPopup("start")}
        className="home-start-button animate-tile-in press"
        style={{ animationDelay: "300ms" }}
      >
        <span className="home-start-glint" />
        <Play size={21} className="relative fill-white" />
        <span className="home-start-copy">
          <span className="font-display text-2xl uppercase tracking-wide">Start Workout</span>
          {assignedWorkout && (
            <span>
              {assignedWorkout.name} · {assignedWorkout.durationMin} min
            </span>
          )}
        </span>
      </button>

      <div className="grid grid-cols-3 gap-3 pb-2">
        <QuickAction
          icon={<Plus size={21} />}
          label="Log Meal"
          onClick={() => setPopup("logmeal")}
        />
        <QuickAction
          icon={<Heart size={21} />}
          label="Check In"
          onClick={() => setPopup("checkin")}
        />
        <QuickAction
          icon={<Apple size={21} />}
          label="Weigh In"
          onClick={() => setPopup("weighin")}
        />
      </div>
    </>
  );
}

function HomeDeepDive({
  setPopup,
  setMuscle,
  onNavigate,
}: {
  setPopup: (p: Popup) => void;
  setMuscle: (m: string | null) => void;
  onNavigate: (section: SectionId) => void;
}) {
  const { view, state } = useStore();

  const score = useMemo(() => fitcoreScore(view), [view]);
  const trainingDriver = useMemo(() => trainingConsistencyScore(view), [view]);
  const nutritionDriver = useMemo(() => nutritionAdherenceScore(view), [view]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const momentum = useMemo(() => momentumScore(view), [view]);

  const scoreDrivers = [
    { label: "Training", value: trainingDriver },
    { label: "Nutrition", value: nutritionDriver },
    { label: "Recovery", value: recovery },
  ];

  // Dummy cross-app analysis items that link to popups or act as placeholders
  const analysisItems = [
    {
      label: "Training Load vs Recovery",
      placeholder: "Needs more data to compare",
      icon: <Activity size={14} className="text-[var(--recovery)]" />,
    },
    {
      label: "Nutrition vs Bodyweight",
      placeholder: "Not enough recent logs",
      icon: <Apple size={14} className="text-[var(--nutrition)]" />,
    },
    {
      label: "Sleep vs Performance",
      placeholder: "Planned",
      icon: <Zap size={14} className="text-[var(--momentum)]" />,
    },
    {
      label: "Consistency vs Momentum",
      placeholder: "Trending Up",
      icon: <TrendingUp size={14} className="text-[var(--success)]" />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-4">
      {/* Dense Score Summary */}
      <section className="rounded-[var(--radius-card)] border border-[var(--section)]/25 bg-[linear-gradient(135deg,var(--section-soft),transparent_70%)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow color="var(--section)">App-wide Status Report</Eyebrow>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-4xl leading-none text-white">{score}</span>
              <span className="text-sm font-bold text-white/60">{scoreLabel(score)}</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/70 max-w-[240px]">
              Your overall FitCore score reflects your readiness, adherence to nutrition, and
              training consistency.
            </p>
          </div>
          <button
            onClick={() => setPopup("score")}
            className="rounded-full border border-[var(--section)]/30 bg-[var(--section)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--section)] press"
          >
            Explain
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {scoreDrivers.map((driver) => (
            <div key={driver.label} className="rounded-xl border border-white/5 bg-black/20 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                {driver.label}
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-lg font-bold tabular-nums text-white">{driver.value}</p>
                <p className="text-[10px] text-white/40">/100</p>
              </div>
              <p className="text-[9px] text-[var(--section)] font-bold mt-1 uppercase">
                {driverTone(driver.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cross-App Comparison Grid */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Layers size={14} className="text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
            Cross-App Insights
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {analysisItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-3 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center gap-1.5">
                {item.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 leading-tight">
                  {item.label}
                </span>
              </div>
              <div className="mt-auto pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/40 font-medium flex items-center gap-1">
                  <Lock size={10} /> {item.placeholder}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Expandable Analytics Sections using existing components or simple UI */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1 px-1">
          <BarChart2 size={14} className="text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
            Deep Dive Metrics
          </h3>
        </div>

        <button
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left press"
          onClick={() => setPopup("readiness")}
        >
          <div>
            <p className="text-sm font-bold text-white">Readiness Analysis</p>
            <p className="text-xs text-white/50 mt-0.5">
              View your recovery score contributors and detailed readiness data.
            </p>
          </div>
          <ChevronRight size={18} className="text-white/30" />
        </button>

        <button
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left press"
          onClick={() => setPopup("momentum")}
        >
          <div>
            <p className="text-sm font-bold text-white">Momentum Trend</p>
            <p className="text-xs text-white/50 mt-0.5">
              Current momentum is {momentum.hasData ? momentum.score : "—"}. See what's driving your
              consistency.
            </p>
          </div>
          <ChevronRight size={18} className="text-white/30" />
        </button>

        <button
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-left press"
          onClick={() => setPopup("volume")}
        >
          <div>
            <p className="text-sm font-bold text-white">Training Volume</p>
            <p className="text-xs text-white/50 mt-0.5">
              Explore your 7-day, 30-day, and exercise-specific volume load.
            </p>
          </div>
          <ChevronRight size={18} className="text-white/30" />
        </button>
      </section>

      {/* AI Coach Placeholders */}
      <section className="rounded-[var(--radius-card)] border border-border border-dashed bg-card/50 p-4 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[var(--section)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
            AI Coach Summary
          </h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          AI will correlate your training load, macro adherence, and sleep quality to provide
          actionable next steps.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Planned
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border border-dashed bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-[var(--recovery)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
            Wearable Integrations
          </h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          Apple Watch & Whoop data will sync here for deeper readiness explanations.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Planned
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border border-dashed bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
            Dashboard Modular Customization
          </h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          You will be able to add, remove, and reorder dashboard cards later.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
          Planned
        </div>
      </section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared UI Components
// -----------------------------------------------------------------------------

function OrbitalScore({
  label,
  value,
  displayValue,
  color,
  className,
  onClick,
  countDelay,
}: {
  label: string;
  value: number;
  displayValue?: string;
  color: string;
  className: string;
  onClick: () => void;
  countDelay?: number;
}) {
  const size = 78;
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(1, value / 100);
  return (
    <button
      onClick={onClick}
      className={`home-orbit-score ${className} press`}
      style={{ "--orbit-color": color } as CSSProperties}
      aria-label={`${label} ${displayValue ?? value}`}
    >
      <span className="home-orbit-label">{label}</span>
      <span className="home-orbit-ring">
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent)}
            strokeLinecap="round"
            className="home-orbit-ring__value"
          />
        </svg>
        <span className="home-orbit-value">
          {displayValue ?? <CountUp value={value} delay={countDelay} duration={820} />}
        </span>
        <span className="home-orbit-glint" aria-hidden="true" />
      </span>
    </button>
  );
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

function MacroBar({
  label,
  value,
  target,
  pct,
  color,
}: {
  label: string;
  value: number;
  target: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold tabular-nums">
        <span className="text-white/40">{label}</span>
        <span className="text-white/80">
          {Math.round(value)}/{target}g
        </span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
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
    <button onClick={onClick} className="home-quick-action press">
      <span>{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function topLoaded(map: Record<string, number>): string {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] === 0) return "No Data";
  const top = sorted[0][0];
  if (["quads", "hamstrings", "glutes", "calves"].includes(top)) return "Lower Body";
  if (["chest", "triceps", "shoulders"].includes(top)) return "Push";
  if (["back", "biceps"].includes(top)) return "Pull";
  return top.charAt(0).toUpperCase() + top.slice(1);
}

function VolumePreview({ view, mode }: { view: AppState; mode: string }) {
  if (mode === "muscle") {
    const top = volumeByMuscle(view, 30).slice(0, 4);
    if (top.length === 0) return <EmptyMini />;
    const max = top[0].volume;
    return (
      <div className="flex h-full flex-col justify-center space-y-1.5">
        {top.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-12 truncate text-[9px] font-bold uppercase tracking-wider text-white/40">
              {item.name}
            </span>
            <MiniBar value={item.volume} max={max} />
          </div>
        ))}
      </div>
    );
  }
  if (mode === "exercise") {
    const top = volumeByExercise(view, 30).slice(0, 3);
    if (top.length === 0) return <EmptyMini />;
    const max = top[0].volume;
    return (
      <div className="flex h-full flex-col justify-center space-y-1.5">
        {top.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-20 truncate text-[9px] font-bold text-white/60">{item.name}</span>
            <MiniBar value={item.volume} max={max} />
          </div>
        ))}
      </div>
    );
  }
  if (mode === "day") {
    const days = volumeByDayOfWeek(view, 30);
    const max = Math.max(...days.map((day) => day.volume), 1);
    return (
      <div className="flex h-full items-end gap-1 pt-2">
        {days.map((day, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(6, (day.volume / max) * 100)}%`,
                minHeight: day.volume > 0 ? "4px" : "2px",
                background: day.volume > 0 ? "var(--success)" : "rgba(255,255,255,0.06)",
              }}
            />
            <span className="text-[8px] font-bold uppercase text-white/30">{day.label[0]}</span>
          </div>
        ))}
      </div>
    );
  }

  const values = Array.from({ length: 7 }, (_, index) => {
    const day = 6 - index;
    const start = Date.now() - (day + 1) * 86400000;
    const end = Date.now() - day * 86400000;
    return view.workouts
      .filter((workout) => workout.startedAt >= start && workout.startedAt < end)
      .reduce((sum, workout) => {
        return (
          sum +
          workout.exercises.reduce(
            (exerciseSum, exercise) =>
              exerciseSum +
              exercise.sets.reduce(
                (setSum, set) =>
                  setSum + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0),
                0,
              ),
            0,
          )
        );
      }, 0);
  });
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-full items-end gap-1 pt-1">
      {values.map((value, index) => (
        <div key={index} className="flex h-full flex-1 items-end">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max(8, (value / max) * 100)}%`,
              minHeight: value > 0 ? "4px" : "2px",
              background:
                value > 0
                  ? index === values.length - 1
                    ? "var(--section)"
                    : "color-mix(in oklab, var(--section) 40%, transparent)"
                  : "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full bg-[var(--success)]"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );
}

function EmptyMini() {
  return (
    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white/30">
      No data
    </div>
  );
}
