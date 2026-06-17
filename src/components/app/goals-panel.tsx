import { useMemo, useState } from "react";
import { Target, Settings2, Check } from "lucide-react";
import { Tile, Eyebrow } from "@/components/app/tile";
import { BottomSheet } from "@/components/app/sheet";
import { useStore } from "@/lib/store";
import { usePersistentState } from "@/lib/persist";
import { workoutsInRange, todayMealTotals, totalVolumeInRange } from "@/lib/analytics";

type GoalKey =
  | "weekly_workouts"
  | "protein"
  | "calories"
  | "weight"
  | "steps"
  | "sleep"
  | "volume";

interface GoalRow {
  key: GoalKey;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  /** Format display value (e.g. with commas, decimals). */
  fmt?: (n: number) => string;
  /** When true, smaller current vs target is "ahead". (e.g. weight cut) */
  inverse?: boolean;
}

const STORE_KEY = "home.goals.selected";
const DEFAULT_SELECTED: GoalKey[] = ["weekly_workouts", "protein", "weight"];
const MAX_GOALS = 5;

const ALL_GOALS: { key: GoalKey; label: string; description: string }[] = [
  { key: "weekly_workouts", label: "Weekly Workouts", description: "Sessions this week" },
  { key: "protein", label: "Protein", description: "Today vs target" },
  { key: "calories", label: "Calories", description: "Today vs target" },
  { key: "weight", label: "Bodyweight", description: "Current vs target" },
  { key: "steps", label: "Steps", description: "Today vs goal" },
  { key: "sleep", label: "Sleep", description: "Last night vs goal" },
  { key: "volume", label: "Training Volume", description: "7-day total vs target" },
];

const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toFixed(1);

export function GoalsPanel() {
  const { view, state } = useStore();
  const [selected, setSelected] = usePersistentState<GoalKey[]>(STORE_KEY, DEFAULT_SELECTED);
  const [open, setOpen] = useState(false);

  const rows = useMemo<GoalRow[]>(() => {
    const meals = todayMealTotals(view);
    const t = state.nutritionTargets;
    const weekWorkouts = workoutsInRange(view, 7).length;
    const weekVol = totalVolumeInRange(view, 7);
    const latestBw = [...view.bodyweightEntries].sort((a, b) => b.createdAt - a.createdAt)[0]?.weightLb
      ?? state.profile.bodyweightLb;
    const targetBw = state.profile.targetBodyweightLb;
    const latestSleep = [...view.sleepEntries].sort((a, b) => b.createdAt - a.createdAt)[0]?.hours ?? 0;
    const sleepGoal = state.profile.sleepGoalH ?? 8;
    const stepGoal = state.profile.stepGoal ?? 10000;

    const map: Record<GoalKey, GoalRow> = {
      weekly_workouts: {
        key: "weekly_workouts", label: "Weekly Workouts",
        current: weekWorkouts, target: state.profile.daysPerWeek || 5,
        unit: "workouts", color: "rgb(167 139 250)", fmt: fmtInt,
      },
      protein: {
        key: "protein", label: "Protein",
        current: meals.protein, target: t.protein, unit: "g",
        color: "rgb(239 68 68)", fmt: fmtInt,
      },
      calories: {
        key: "calories", label: "Calories",
        current: meals.calories, target: t.calories, unit: "kcal",
        color: "rgb(245 158 11)", fmt: fmtInt,
      },
      weight: {
        key: "weight", label: "Bodyweight",
        current: latestBw, target: targetBw, unit: state.profile.units ?? "lb",
        color: "rgb(96 165 250)", fmt: fmt1, inverse: targetBw < latestBw,
      },
      steps: {
        key: "steps", label: "Steps",
        current: 0, target: stepGoal, unit: "steps",
        color: "rgb(34 197 94)", fmt: fmtInt,
      },
      sleep: {
        key: "sleep", label: "Sleep",
        current: latestSleep, target: sleepGoal, unit: "h",
        color: "rgb(125 211 252)", fmt: fmt1,
      },
      volume: {
        key: "volume", label: "Training Volume",
        current: weekVol, target: 25000, unit: "lb",
        color: "rgb(74 222 128)", fmt: fmtInt,
      },
    };
    return selected.slice(0, MAX_GOALS).map(k => map[k]).filter(Boolean);
  }, [view, state, selected]);

  const toggle = (k: GoalKey) => {
    setSelected(prev => {
      if (prev.includes(k)) return prev.filter(x => x !== k);
      if (prev.length >= MAX_GOALS) return prev;
      return [...prev, k];
    });
  };

  return (
    <>
      <Tile delay={300}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[var(--section)]" />
            <Eyebrow color="var(--section)">Goals</Eyebrow>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="press flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60 px-2 py-1 rounded-full bg-white/5 border border-white/10"
          >
            <Settings2 size={11} /> Customize
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-white/70">No goals selected.</p>
            <button
              onClick={() => setOpen(true)}
              className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--section)] press"
            >
              + Add goals
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map(r => <GoalRowItem key={r.key} row={r} />)}
          </div>
        )}
      </Tile>

      <CustomizeGoalsSheet
        open={open}
        onClose={() => setOpen(false)}
        selected={selected}
        onToggle={toggle}
      />
    </>
  );
}

function GoalRowItem({ row }: { row: GoalRow }) {
  const { current, target, color, label, unit, fmt = fmtInt, inverse } = row;
  const safeTarget = target || 1;
  const rawPct = (current / safeTarget) * 100;
  const pct = Math.max(0, Math.min(100, rawPct));
  const status = statusFor(rawPct, inverse);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 truncate">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-white/90">
          {fmt(current)}<span className="text-white/40"> / {fmt(target)} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 mt-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: status.color }}>
        {status.label}
      </div>
    </div>
  );
}

function statusFor(pct: number, inverse?: boolean): { label: string; color: string } {
  const p = inverse ? 200 - pct : pct;
  if (p >= 100) return { label: "Goal hit", color: "rgb(74 222 128)" };
  if (p >= 80) return { label: "Almost there", color: "rgb(125 211 252)" };
  if (p >= 50) return { label: "On track", color: "rgb(167 139 250)" };
  if (p > 0) return { label: "Behind", color: "rgb(248 113 113)" };
  return { label: "Not started", color: "rgb(148 163 184)" };
}

function CustomizeGoalsSheet({ open, onClose, selected, onToggle }: {
  open: boolean; onClose: () => void;
  selected: GoalKey[]; onToggle: (k: GoalKey) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Customize Goals">
      <p className="text-xs text-white/60 mb-4">
        Pick up to {MAX_GOALS} goals to show on your home screen. ({selected.length}/{MAX_GOALS})
      </p>
      <div className="space-y-2 pb-2">
        {ALL_GOALS.map(g => {
          const isOn = selected.includes(g.key);
          const disabled = !isOn && selected.length >= MAX_GOALS;
          return (
            <button
              key={g.key}
              onClick={() => onToggle(g.key)}
              disabled={disabled}
              className={`w-full flex items-center justify-between p-3 rounded-xl border press text-left ${
                isOn
                  ? "bg-[color-mix(in_oklab,var(--section)_18%,transparent)] border-[var(--section)]"
                  : "bg-white/5 border-white/10"
              } ${disabled ? "opacity-40" : ""}`}
            >
              <div>
                <div className="text-sm font-bold text-white">{g.label}</div>
                <div className="text-[11px] text-white/50">{g.description}</div>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                isOn ? "bg-[var(--section)] border-[var(--section)]" : "border-white/20"
              }`}>
                {isOn && <Check size={14} className="text-black" />}
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}