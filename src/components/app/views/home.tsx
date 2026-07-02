import { useMemo, useState } from "react";
import { Settings as SettingsIcon, Play, Apple, Heart, Plus } from "lucide-react";
import { Tile, Eyebrow } from "@/components/app/tile";
import { CountUp } from "@/components/app/count-up";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { AiInsightStrip } from "@/components/app/ai-insight";
import { useStore } from "@/lib/store";
import { usePersistentState, GRAPH_PREFS } from "@/lib/persist";
import {
  fitcoreScore, readinessScore, recoveryScore, trainingStreak,
  muscleMap, weeklyVolumeSeries, todayMealTotals, totalVolumeInRange,
  bestMuscleToTrainToday, type HeatMode,
} from "@/lib/analytics";
import { volumeByMuscle, volumeByExercise, volumeByDayOfWeek } from "@/lib/analytics-extra";
import type { AppState } from "@/lib/types";
import type { SectionId } from "@/lib/types";
import { VolumeDetailSheet } from "@/components/app/popups/volume-popup";
import { MacroDetailSheet } from "@/components/app/popups/macro-popup";
import { ReadinessDetailSheet } from "@/components/app/popups/readiness-popup";
import { HeatmapDetailSheet } from "@/components/app/popups/heatmap-popup";
import { StartWorkoutSheet } from "@/components/app/popups/start-workout-popup";
import { MuscleDetailSheet } from "@/components/app/popups/muscle-popup";
import { FitcoreScoreSheet } from "@/components/app/popups/score-popup";
import { LogMealSheet, CheckInSheet, WeighInSheet } from "@/components/app/popups/quick-popups";
import { GoalsPanel } from "@/components/app/goals-panel";

type Popup = null | "volume" | "macros" | "readiness" | "heatmap" | "start" | "score" | "logmeal" | "checkin" | "weighin";


export function HomeView({ onNavigate, onOpenSettings }: {
  onNavigate: (s: SectionId) => void;
  onOpenSettings: () => void;
}) {
  const { view, state } = useStore();
  const name = (state.profile as { name?: string }).name ?? "ATHLETE";

  const score = useMemo(() => fitcoreScore(view), [view]);
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const streak = useMemo(() => trainingStreak(view), [view]);
  const [heatMode] = usePersistentState<HeatMode>("heatmap.mode", "load");
  const loadMap = useMemo(() => muscleMap(view, heatMode), [view, heatMode]);
  const [volumeMode] = usePersistentState<string>(GRAPH_PREFS.volumeMode, "total");
  const series = useMemo(() => weeklyVolumeSeries(view, 7), [view]);
  const meals = useMemo(() => todayMealTotals(view), [view]);
  const weekVol = useMemo(() => totalVolumeInRange(view, 7), [view]);
  const lastWeekVol = useMemo(() => totalVolumeInRange(view, 14) - weekVol, [view, weekVol]);
  const volDelta = lastWeekVol > 0 ? Math.round(((weekVol - lastWeekVol) / lastWeekVol) * 100) : 0;
  const bestMuscle = useMemo(() => bestMuscleToTrainToday(view), [view]);

  const targets = state.nutritionTargets;
  const kcalPct = targets.calories > 0 ? Math.min(100, Math.round((meals.calories / targets.calories) * 100)) : 0;
  const proteinPct = targets.protein > 0 ? Math.min(100, Math.round((meals.protein / targets.protein) * 100)) : 0;
  const carbsPct = targets.carbs > 0 ? Math.min(100, Math.round((meals.carbs / targets.carbs) * 100)) : 0;
  const fatPct = targets.fat > 0 ? Math.min(100, Math.round((meals.fat / targets.fat) * 100)) : 0;

  const hasAnyData = view.workouts.length > 0 || view.mealEntries.length > 0;
  const [popup, setPopup] = useState<Popup>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const openAi = () => window.dispatchEvent(new CustomEvent("fitcore:open-ai"));

  const insight = !hasAnyData
    ? "Log your first workout or turn on Demo Data in Settings to see your full dashboard."
    : readiness >= 80
      ? `Readiness is ${readiness}. Prime day for a heavy ${bestMuscle} session.`
      : readiness >= 60
        ? `Readiness is ${readiness}. Solid day — train ${bestMuscle} at moderate intensity.`
        : `Readiness is low (${readiness}). Prioritize recovery and skill work today.`;

  return (
    <div className="pb-2">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-end justify-between">
        <div>
          <Eyebrow>Command Center</Eyebrow>
          <h1 className="font-display text-5xl leading-none mt-1 uppercase tracking-tight">
            Good Morning, <span className="text-[var(--section)]">{name}</span>
          </h1>
        </div>
        <button
          onClick={onOpenSettings}
          className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center press relative"
          aria-label="Settings"
        >
          <SettingsIcon size={18} className="text-white/70" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--section)] border-2 border-[var(--background)] shimmer-dot" />
        </button>
      </header>

      {/* Streak strip */}
      <div className="px-6 pb-3 flex items-center gap-2 text-[11px]">
        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 font-bold uppercase tracking-wider text-white/60">
          🔥 {streak}d streak
        </span>
        <button onClick={() => setPopup("volume")}
          className="px-2 py-1 rounded-full bg-white/5 border border-white/10 font-bold uppercase tracking-wider text-white/60 press">
          Week vol <CountUp value={Math.round(weekVol / 1000)} />k
        </button>
        {state.demoMode && (
          <span className="ml-auto px-2 py-1 rounded-full font-bold uppercase tracking-wider"
            style={{ background: "var(--section-soft)", color: "var(--section)" }}>
            Demo
          </span>
        )}
      </div>

      <div className="px-5 space-y-3">
        {/* Score + Readiness row */}
        <div className="grid grid-cols-2 gap-3">
          <Tile hero accent delay={0} onClick={() => setPopup("score")} className="glow-section">
            <Eyebrow color="var(--section)">FitCore Score</Eyebrow>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-display text-6xl leading-none text-white">
                <CountUp value={score} />
              </span>
              <span className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {score >= 80 ? "Elite" : score >= 65 ? "Strong" : score >= 45 ? "Building" : "Foundation"}
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${score}%`,
                  background: "var(--section)",
                  boxShadow: "0 0 12px var(--section)",
                }}
              />
            </div>
            <div className="mt-3 text-[10px] text-white/50 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className={volDelta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                {volDelta >= 0 ? "↑" : "↓"} {Math.abs(volDelta)}%
              </span>
              <span className="opacity-60">vs last week</span>
            </div>
          </Tile>

          <Tile delay={60} onClick={() => setPopup("readiness")}>
            <div className="h-full grid grid-cols-2 gap-4 items-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <RingScore value={readiness} color="var(--recovery)" size={76} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Readiness
                </span>
              </div>
              <div className="flex flex-col items-center justify-center gap-2">
                <RingScore value={recovery} color="var(--success)" size={76} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Recovery
                </span>
              </div>
            </div>
          </Tile>
        </div>

        {/* Body Heat Map preview */}
        <Tile delay={120} onClick={() => setPopup("heatmap")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Eyebrow color="rgb(74 222 128)">Muscle {heatMode === "load" ? "Load" : heatMode === "strength" ? "Strength" : heatMode === "imbalance" ? "Imbalance" : "Recovery"} · {heatMode === "strength" ? "30d" : heatMode === "recovery" ? "3d" : "7d"}</Eyebrow>
              <h2 className="font-display text-2xl leading-tight mt-1 uppercase">
                {topLoaded(loadMap)}<br/>
                <span className="text-white/50">{heatMode === "recovery" ? "Most recovered" : heatMode === "imbalance" ? "Biggest gap" : "Most worked"}</span>
              </h2>
              <p className="text-xs text-white/50 mt-2">Best today: <span className="text-white capitalize font-bold">{bestMuscle}</span></p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-2 font-bold">Tap to expand →</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <div className="flex flex-col items-center">
                <div className="w-16 h-28">
                  <BodyHeatmap values={loadMap} mode={heatMode} compact side="front"
                    onSelect={(m) => { setMuscle(m); }} />
                </div>
                <span className="text-[8px] text-white/40 uppercase tracking-wider font-bold mt-0.5">Front</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-28">
                  <BodyHeatmap values={loadMap} mode={heatMode} compact side="back"
                    onSelect={(m) => { setMuscle(m); }} />
                </div>
                <span className="text-[8px] text-white/40 uppercase tracking-wider font-bold mt-0.5">Back</span>
              </div>
            </div>
          </div>
        </Tile>

        {/* Macros + Volume row */}
        <div className="grid grid-cols-2 gap-3">
          <Tile delay={180} onClick={() => setPopup("macros")}>
            <Eyebrow color="var(--nutrition)">Macros</Eyebrow>
            <div className="font-display text-3xl mt-1 leading-none">
              <CountUp value={meals.calories} />
              <span className="text-xs text-white/30 font-bold uppercase ml-1">
                / {targets.calories}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
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
            <div className="mt-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
              {kcalPct}% of daily goal
            </div>
          </Tile>

          <Tile delay={240} onClick={() => setPopup("volume")}>
            <Eyebrow color="var(--success)">
              Volume ·{" "}
              {volumeMode === "muscle"
                ? "Muscle"
                : volumeMode === "exercise"
                  ? "Exercise"
                  : volumeMode === "day"
                    ? "Day"
                    : "7d"}
            </Eyebrow>
            <div className="font-display text-3xl mt-1 leading-none">
              <CountUp value={Math.round(weekVol / 1000)} />
              <span className="text-xs text-white/30 font-bold uppercase ml-1">k lb</span>
            </div>
            <div className="mt-3 h-16">
              <VolumePreview view={view} mode={volumeMode} />
            </div>
            <div
              className="mt-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={{ color: volDelta >= 0 ? "var(--success)" : "var(--danger)" }}
            >
              <span>
                {volDelta >= 0 ? "↑" : "↓"} {Math.abs(volDelta)}%
              </span>
              <span className="opacity-60">trend</span>
            </div>
          </Tile>
        </div>

        {/* Goals panel */}
        <GoalsPanel />

        {/* AI insight — opens AI sheet */}
        <button onClick={openAi} style={{ animationDelay: "420ms" }} className="animate-tile-in w-full text-left press">
          <AiInsightStrip>
            {insight.split(bestMuscle)[0]}
            <span className="text-[var(--section)] font-bold capitalize">{insight.includes(bestMuscle) ? bestMuscle : ""}</span>
            {insight.split(bestMuscle)[1] ?? ""}
          </AiInsightStrip>
        </button>

        {/* Start workout CTA — opens popup */}
        <button
          onClick={() => setPopup("start")}
          style={{ animationDelay: "480ms" }}
          className="animate-tile-in w-full h-16 rounded-2xl flex items-center justify-center gap-3 press relative overflow-hidden"
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, var(--section) 0%, color-mix(in oklab, var(--section) 60%, black) 100%)" }} />
          <Play size={20} className="relative text-white fill-white" />
          <span className="relative font-display text-2xl tracking-wide uppercase text-white">Start Workout</span>
        </button>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 pt-1 pb-4">
          <QuickAction
            icon={<Plus size={20} />}
            label="Log Meal"
            onClick={() => setPopup("logmeal")}
          />
          <QuickAction
            icon={<Heart size={20} />}
            label="Check In"
            onClick={() => setPopup("checkin")}
          />
          <QuickAction
            icon={<Apple size={20} />}
            label="Weigh In"
            onClick={() => setPopup("weighin")}
          />
        </div>
      </div>

      {/* Popups */}
      <VolumeDetailSheet open={popup === "volume"} onClose={() => setPopup(null)} />
      <MacroDetailSheet open={popup === "macros"} onClose={() => setPopup(null)} />
      <ReadinessDetailSheet open={popup === "readiness"} onClose={() => setPopup(null)} />
      <HeatmapDetailSheet open={popup === "heatmap"} onClose={() => setPopup(null)} />
      <StartWorkoutSheet open={popup === "start"} onClose={() => setPopup(null)} onStarted={() => onNavigate("training")} />
      <FitcoreScoreSheet open={popup === "score"} onClose={() => setPopup(null)} />
      <LogMealSheet open={popup === "logmeal"} onClose={() => setPopup(null)} />
      <CheckInSheet open={popup === "checkin"} onClose={() => setPopup(null)} />
      <WeighInSheet open={popup === "weighin"} onClose={() => setPopup(null)} />
      <MuscleDetailSheet muscle={muscle} onClose={() => setMuscle(null)} />
    </div>
  );
}

function RingScore({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl leading-none" style={{ color }}>
          <CountUp value={value} />
        </span>
      </div>
    </div>
  );
}

function MacroBar({ label, value, target, pct, color }: { label: string; value: number; target: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold tabular-nums">
        <span className="text-white/40">{label}</span>
        <span className="text-white/80">{Math.round(value)}/{target}g</span>
      </div>
      <div className="h-1 mt-0.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press h-16 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1 text-white/70 shadow-sm"
    >
      <div className="text-[var(--section)]">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function topLoaded(map: Record<string, number>): string {
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] === 0) return "No Data";
  const top = sorted[0][0];
  if (["quads","hamstrings","glutes","calves"].includes(top)) return "Lower Body";
  if (["chest","triceps","shoulders"].includes(top)) return "Push";
  if (["back","biceps"].includes(top)) return "Pull";
  return top.charAt(0).toUpperCase() + top.slice(1);
}

function VolumePreview({ view, mode }: { view: AppState; mode: string }) {
  if (mode === "muscle") {
    const top = volumeByMuscle(view, 30).slice(0, 4);
    if (top.length === 0) return <EmptyMini />;
    const max = top[0].volume;
    return (
      <div className="space-y-1.5 h-full flex flex-col justify-center">
        {top.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider w-12 truncate">
              {d.name}
            </span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.volume / max) * 100}%`, background: "var(--success)" }}
              />
            </div>
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
      <div className="space-y-1.5 h-full flex flex-col justify-center">
        {top.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="text-[9px] text-white/60 font-bold truncate w-20">{d.name}</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.volume / max) * 100}%`, background: "var(--success)" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (mode === "day") {
    const days = volumeByDayOfWeek(view, 30);
    const max = Math.max(...days.map((d) => d.volume), 1);
    return (
      <div className="flex items-end gap-1 h-full pt-2">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max(6, (d.volume / max) * 100)}%`,
                minHeight: d.volume > 0 ? "4px" : "2px",
                background: d.volume > 0 ? "var(--success)" : "rgba(255,255,255,0.06)",
              }}
            />
            <span className="text-[8px] text-white/30 font-bold uppercase">{d.label[0]}</span>
          </div>
        ))}
      </div>
    );
  }
  // total / default
  const series = (function () {
    const out = [];
    const DAY = 86400000;
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const start = now - (i + 1) * DAY;
      const end = now - i * DAY;
      const vol = view.workouts
        .filter((w) => w.startedAt >= start && w.startedAt < end)
        .reduce(
          (s, w) =>
            s +
            w.exercises.reduce(
              (a, ex) =>
                a +
                ex.sets.reduce(
                  (b, st) =>
                    b + (st.completed && st.weight && st.reps ? st.weight * st.reps : 0),
                  0,
                ),
              0,
            ),
          0,
        );
      out.push(vol);
    }
    return out;
  })();
  const max = Math.max(...series, 1);
  return (
    <div className="flex items-end gap-1 h-full pt-1">
      {series.map((v, i) => {
        const isLast = i === series.length - 1;
        const hasVol = v > 0;
        return (
          <div key={i} className="flex-1 h-full flex items-end">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max(8, (v / max) * 100)}%`,
                minHeight: hasVol ? "4px" : "2px",
                background: hasVol
                  ? isLast
                    ? "var(--section)"
                    : "color-mix(in oklab, var(--section) 40%, transparent)"
                  : "rgba(255,255,255,0.06)",
                boxShadow: isLast && hasVol ? "0 0 12px var(--section)" : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function EmptyMini() {
  return <div className="h-full flex items-center justify-center text-[10px] text-white/30 font-bold uppercase tracking-wider">No data</div>;
}
