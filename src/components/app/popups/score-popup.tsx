import { useMemo } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import {
  fitcoreScore,
  trainingConsistencyScore,
  nutritionAdherenceScore,
  recoveryScore,
  progressScore,
  bestMuscleToTrainToday,
} from "@/lib/analytics";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

export function FitcoreScoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view } = useStore();
  const score = useMemo(() => fitcoreScore(view), [view]);
  const t = useMemo(() => trainingConsistencyScore(view), [view]);
  const n = useMemo(() => nutritionAdherenceScore(view), [view]);
  const r = useMemo(() => recoveryScore(view), [view]);
  const p = useMemo(() => progressScore(view), [view]);
  const best = useMemo(() => bestMuscleToTrainToday(view), [view]);

  const parts = [
    {
      id: "train",
      label: "Training Consistency",
      value: t,
      weight: 35,
      hint: "Workouts logged vs. weekly target",
    },
    {
      id: "nutri",
      label: "Nutrition Adherence",
      value: n,
      weight: 25,
      hint: "Calorie & protein targets hit",
    },
    {
      id: "recov",
      label: "Recovery & Readiness",
      value: r,
      weight: 25,
      hint: "Sleep, check-ins, training load",
    },
    {
      id: "prog",
      label: "Progress Trend",
      value: p,
      weight: 15,
      hint: "Volume growth vs. previous block",
    },
  ];
  const positives = parts.filter((x) => x.value >= 70);
  const negatives = parts.filter((x) => x.value < 50);

  const tier =
    score >= 80 ? "Elite" : score >= 65 ? "Strong" : score >= 45 ? "Building" : "Foundation";
  const tierTone =
    score >= 80
      ? "text-green-400"
      : score >= 65
        ? "text-[var(--section)]"
        : score >= 45
          ? "text-amber-400"
          : "text-red-300";

  const insight = buildInsight(score, parts, best);

  return (
    <BottomSheet open={open} onClose={onClose} title="FitCore Score" height="tall">
      <div className="space-y-4">
        {/* Score header */}
        <div className="tile p-5 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            FitCore Score
          </div>
          <div className="font-display text-7xl leading-none mt-2 text-white">{score}</div>
          <div className={`text-[11px] mt-1 font-bold uppercase tracking-widest ${tierTone}`}>
            {tier}
          </div>
          <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: "var(--section)",
                boxShadow: "0 0 14px var(--section)",
              }}
            />
          </div>
        </div>

        {/* AI-style insight */}
        <div
          className="tile p-4 border"
          style={{ borderColor: "color-mix(in oklab, var(--section) 25%, transparent)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-[var(--section)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--section)]">
              Why this score
            </span>
          </div>
          <p className="text-sm text-white/85 leading-relaxed">{insight}</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-1">
            Breakdown
          </div>
          {parts.map((part) => (
            <div key={part.id} className="tile p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{part.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {part.hint} · {part.weight}% weight
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ToneIcon value={part.value} />
                  <span className="font-display text-2xl tabular-nums text-white">
                    {part.value}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${part.value}%`,
                    background:
                      part.value >= 70
                        ? "rgb(74 222 128)"
                        : part.value >= 45
                          ? "var(--section)"
                          : "rgb(248 113 113)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Positives & negatives */}
        <div className="grid grid-cols-2 gap-3">
          <div className="tile p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={12} className="text-green-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-green-400">
                Strengths
              </span>
            </div>
            {positives.length === 0 ? (
              <p className="text-xs text-white/40">Build a streak to unlock strengths.</p>
            ) : (
              <ul className="space-y-1">
                {positives.map((x) => (
                  <li key={x.id} className="text-xs text-white/80">
                    • {x.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="tile p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown size={12} className="text-red-400" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">
                Lowering score
              </span>
            </div>
            {negatives.length === 0 ? (
              <p className="text-xs text-white/40">Nothing dragging the score down.</p>
            ) : (
              <ul className="space-y-1">
                {negatives.map((x) => (
                  <li key={x.id} className="text-xs text-white/80">
                    • {x.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Next action */}
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">
            Suggested next action
          </div>
          <p className="text-sm text-white/90">{nextAction(parts, best)}</p>
        </div>
      </div>
    </BottomSheet>
  );
}

function ToneIcon({ value }: { value: number }) {
  if (value >= 70) return <TrendingUp size={14} className="text-green-400" />;
  if (value >= 45) return <Minus size={14} className="text-white/40" />;
  return <TrendingDown size={14} className="text-red-400" />;
}

type Part = { id: string; label: string; value: number; weight: number; hint: string };

function buildInsight(score: number, parts: Part[], best: string): string {
  const top = [...parts].sort((a, b) => b.value - a.value)[0];
  const low = [...parts].sort((a, b) => a.value - b.value)[0];

  if (score >= 80) {
    return `Your FitCore Score is ${score} because ${top.label.toLowerCase()} is firing (${top.value}). Keep volume on ${best} steady — you're in elite territory.`;
  }
  if (score >= 60) {
    return `Your FitCore Score is ${score}. ${top.label} is strong (${top.value}), but ${low.label.toLowerCase()} is lagging at ${low.value}. Today, focus a moderate ${best} session and address the gap.`;
  }
  if (score >= 40) {
    return `Your FitCore Score is ${score}. You're building momentum on ${top.label.toLowerCase()}, but ${low.label.toLowerCase()} (${low.value}) is holding you back. One clean week and this jumps fast.`;
  }
  return `Your FitCore Score is ${score} — early days. Log a workout, a meal, and a recovery check-in to unlock a real reading. Start with ${best}.`;
}

function nextAction(parts: Part[], best: string): string {
  const low = [...parts].sort((a, b) => a.value - b.value)[0];
  switch (low.id) {
    case "train":
      return `Log a 45-min ${best} session today to lift training consistency.`;
    case "nutri":
      return `Hit your protein target — add a high-protein meal or shake.`;
    case "recov":
      return `Prioritize 7.5+ hrs sleep tonight and log a recovery check-in.`;
    case "prog":
      return `Add one extra working set on your main lift this week.`;
    default:
      return `Train ${best} today and log it to keep the streak alive.`;
  }
}
