import { useEffect, useMemo, useState } from "react";
import { Target, Settings2, Check } from "lucide-react";
import { Tile, Eyebrow } from "@/components/app/tile";
import { BottomSheet } from "@/components/app/sheet";
import { useStore } from "@/lib/store";
import { usePersistentState } from "@/lib/persist";
import { homeGoalMetrics, withVolumeGoal } from "@/lib/home-goal-metrics";
import { useWhoopSnapshot } from "@/hooks/use-whoop-snapshot";
import { lbToKg, weightUnit } from "@/lib/types";

type GoalKey = "weekly_workouts" | "protein" | "calories" | "weight" | "steps" | "sleep" | "volume";

interface GoalRow {
  key: GoalKey;
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  color: string;
  /** Format display value (e.g. with commas, decimals). */
  fmt?: (n: number) => string;
  /** When true, smaller current vs target is "ahead". (e.g. weight cut) */
  inverse?: boolean;
  hint?: string;
}

const STORE_KEY = "home.goals.selected";
const DEFAULT_SELECTED: GoalKey[] = ["weekly_workouts", "protein", "weight"];
const MAX_GOALS = 5;

const ALL_GOALS: { key: GoalKey; label: string; description: string }[] = [
  { key: "weekly_workouts", label: "Weekly Workouts", description: "Sessions in the last 7 days" },
  { key: "protein", label: "Protein", description: "Today vs target" },
  { key: "calories", label: "Calories", description: "Today vs target" },
  { key: "weight", label: "Bodyweight", description: "Current vs target" },
  { key: "steps", label: "Steps", description: "Today's WHOOP measurement vs goal" },
  { key: "sleep", label: "Sleep", description: "Last night vs goal" },
  { key: "volume", label: "Training Volume", description: "7-day total vs target" },
];

const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmt1 = (n: number) => n.toFixed(1);

export function GoalsPanel({ compact = false }: { compact?: boolean }) {
  const { view, state } = useStore();
  const snapshot = useWhoopSnapshot();
  const [selected, setSelected] = usePersistentState<GoalKey[]>(STORE_KEY, DEFAULT_SELECTED);
  const [open, setOpen] = useState(false);

  const rows = useMemo<GoalRow[]>(() => {
    const measurements = homeGoalMetrics(view, snapshot);
    const t = state.nutritionTargets;
    const unit = weightUnit(state.personalization);
    const displayWeight = (pounds: number) => (unit === "kg" ? lbToKg(pounds) : pounds);
    const latestBw =
      [...view.bodyweightEntries].sort((a, b) => b.createdAt - a.createdAt)[0]?.weightLb ??
      state.profile.bodyweightLb;
    const targetBw = state.profile.targetBodyweightLb;
    const sleepGoal = state.profile.sleepGoalH ?? 8;
    const stepGoal = state.profile.stepGoal ?? 10000;

    const map: Record<GoalKey, GoalRow> = {
      weekly_workouts: {
        key: "weekly_workouts",
        label: "Weekly Workouts",
        current: measurements.weeklyWorkouts,
        target: state.profile.daysPerWeek,
        unit: "workouts",
        color: "rgb(167 139 250)",
        fmt: fmtInt,
      },
      protein: {
        key: "protein",
        label: "Protein",
        current: measurements.protein,
        target: t.protein,
        unit: "g",
        hint: measurements.protein === null ? "Some meals have unreported macros" : undefined,
        color: "rgb(239 68 68)",
        fmt: fmtInt,
      },
      calories: {
        key: "calories",
        label: "Calories",
        current: measurements.calories,
        target: t.calories,
        unit: "kcal",
        color: "rgb(245 158 11)",
        fmt: fmtInt,
      },
      weight: {
        key: "weight",
        label: "Bodyweight",
        current: displayWeight(latestBw),
        target: displayWeight(targetBw),
        unit,
        color: "rgb(96 165 250)",
        fmt: fmt1,
        inverse: targetBw < latestBw,
      },
      steps: {
        key: "steps",
        label: "Steps",
        current: measurements.steps,
        target: stepGoal,
        unit: "steps",
        hint: measurements.steps === null ? "No steps available today" : "WHOOP · today",
        color: "rgb(34 197 94)",
        fmt: fmtInt,
      },
      sleep: {
        key: "sleep",
        label: "Sleep",
        current: measurements.sleepHours,
        target: sleepGoal,
        unit: "h",
        hint:
          measurements.sleepSource === "whoop"
            ? "WHOOP"
            : measurements.sleepHours === null
              ? "No recent sleep recorded"
              : "Logged sleep",
        color: "rgb(125 211 252)",
        fmt: fmt1,
      },
      volume: {
        key: "volume",
        label: "Training Volume",
        current: displayWeight(measurements.volumeLb),
        target:
          measurements.volumeTargetLb === null ? null : displayWeight(measurements.volumeTargetLb),
        unit: `${unit} × reps`,
        hint: "Last 7 days · completed sets",
        color: "rgb(74 222 128)",
        fmt: fmtInt,
      },
    };
    return selected
      .slice(0, MAX_GOALS)
      .map((k) => map[k])
      .filter(Boolean);
  }, [view, state, selected, snapshot]);

  const toggle = (k: GoalKey) => {
    setSelected((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k);
      if (prev.length >= MAX_GOALS) return prev;
      return [...prev, k];
    });
  };

  return (
    <>
      <Tile
        delay={compact ? 160 : 300}
        className={compact ? "home-section-card home-goals-card" : undefined}
      >
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
          <div className={compact ? "space-y-2" : "space-y-2.5"}>
            {rows.map((r) => (
              <GoalRowItem key={r.key} row={r} compact={compact} />
            ))}
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

function GoalRowItem({ row, compact }: { row: GoalRow; compact?: boolean }) {
  const { current, target, color, label, unit, fmt = fmtInt, inverse } = row;
  const rawPct = target !== null && target > 0 && current !== null ? (current / target) * 100 : 0;
  const pct = Math.max(0, Math.min(100, rawPct));
  const status =
    current === null
      ? { label: "Unavailable", color: "var(--muted-foreground)" }
      : target !== null && target > 0
        ? statusFor(rawPct, inverse)
        : { label: "No target", color: "var(--muted-foreground)" };
  return (
    <div role="group" aria-label={`${label} goal`}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold uppercase tracking-wider text-white/70 truncate`}
        >
          {label}
        </span>
        <span
          className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold tabular-nums text-white/90`}
        >
          {current === null ? "—" : fmt(current)}
          <span className="text-white/40">
            {target !== null && target > 0 ? ` / ${fmt(target)} ${unit}` : ` ${unit}`}
          </span>
        </span>
      </div>
      {current !== null && target !== null && target > 0 && (
        <div
          className="h-1.5 mt-1 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-label={`${label} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
          />
        </div>
      )}
      <div
        className={`mt-0.5 ${compact ? "text-[8px]" : "text-[9px]"} font-bold uppercase tracking-wider`}
        style={{ color: status.color }}
      >
        {status.label}
      </div>
      {row.hint && <p className="text-[10px] text-white/50">{row.hint}</p>}
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

function CustomizeGoalsSheet({
  open,
  onClose,
  selected,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  selected: GoalKey[];
  onToggle: (k: GoalKey) => void;
}) {
  const { state, set } = useStore();
  const unit = weightUnit(state.personalization);
  const [volumeTarget, setVolumeTarget] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const target = state.profile.weeklyVolumeGoalLb;
    setVolumeTarget(target === undefined ? "" : String(unit === "kg" ? lbToKg(target) : target));
  }, [open, state.profile.weeklyVolumeGoalLb, unit]);
  useEffect(() => {
    setMessage("");
    setFailed(false);
  }, [open]);
  const parsedTarget =
    volumeTarget.trim() === "" ? null : Number(volumeTarget) / (unit === "kg" ? 0.453592 : 1);
  const valid = parsedTarget === null || (Number.isFinite(parsedTarget) && parsedTarget > 0);
  const saveTarget = () => {
    if (!valid) return;
    const saved = set((current) => withVolumeGoal(current, parsedTarget));
    setFailed(!saved);
    setMessage(
      saved
        ? "Training volume target saved."
        : "Target could not be saved. Your entry is still here; resolve the storage warning and retry.",
    );
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Customize Goals"
      closeLabel="Close goal customization"
      manageFocus
      fitViewport
    >
      <p className="text-xs text-white/60 mb-4">
        Pick up to {MAX_GOALS} goals to show on your home screen. ({selected.length}/{MAX_GOALS})
      </p>
      <div className="space-y-2 pb-2">
        {ALL_GOALS.map((g) => {
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
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                  isOn ? "bg-[var(--section)] border-[var(--section)]" : "border-white/20"
                }`}
              >
                {isOn && <Check size={14} className="text-black" />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <label className="block text-sm" htmlFor="weekly-volume-target">
          7-day training volume target ({unit} × reps)
        </label>
        <input
          id="weekly-volume-target"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={volumeTarget}
          onChange={(event) => {
            setVolumeTarget(event.target.value);
            setMessage("");
          }}
          aria-invalid={!valid}
          className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2"
          placeholder="No target set"
        />
        <p className="text-xs text-white/50">
          Choose your own target. Leave blank to clear it. Volume is weight × repetitions from
          completed sets over the last 7 days.
        </p>
        <button
          type="button"
          onClick={saveTarget}
          disabled={!valid}
          className="press rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
        >
          Save target
        </button>
        {!valid && (
          <p role="alert" className="text-sm text-destructive">
            Enter a positive target or leave it blank.
          </p>
        )}
        {message && (
          <p role={failed ? "alert" : "status"} className="text-sm">
            {message}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
