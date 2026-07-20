import { useMemo, type ReactNode } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { muscleStats, daysAgo } from "@/lib/analytics-extra";
import { muscleMap } from "@/lib/analytics";

export function MuscleDetailSheet({
  muscle,
  onClose,
  action,
}: {
  muscle: string | null;
  onClose: () => void;
  action?: ReactNode;
}) {
  const { view } = useStore();
  const open = !!muscle;
  const stats = useMemo(() => (muscle ? muscleStats(view, muscle) : null), [view, muscle]);
  const recovery = useMemo(
    () => (muscle ? Math.round((muscleMap(view, "recovery")[muscle] ?? 0.7) * 100) : 0),
    [view, muscle],
  );
  const strength = useMemo(
    () => (muscle ? Math.round((muscleMap(view, "strength")[muscle] ?? 0) * 100) : 0),
    [view, muscle],
  );
  const imbalance = useMemo(
    () => (muscle ? Math.round((muscleMap(view, "imbalance")[muscle] ?? 0) * 100) : 0),
    [view, muscle],
  );

  if (!muscle || !stats) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={muscle.charAt(0).toUpperCase() + muscle.slice(1)}
      height="tall"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Sets This Week" value={stats.setsWeek} />
          <Stat label="Volume" value={`${(stats.volWeek / 1000).toFixed(1)}k`} unit="lb" />
          <Stat label="Last Trained" value={daysAgo(stats.lastTrained)} />
          <Stat
            label="vs Last Week"
            value={`${stats.deltaPct >= 0 ? "+" : ""}${stats.deltaPct}%`}
            color={stats.deltaPct >= 0 ? "rgb(74 222 128)" : "rgb(248 113 113)"}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Bar label="Recovery" value={recovery} color="rgb(96 165 250)" />
          <Bar label="Strength" value={strength} color="var(--section)" />
          <Bar label="Imbalance" value={imbalance} color="rgb(239 68 68)" />
        </div>

        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">
            Recommended Next
          </div>
          <div className="space-y-1.5">
            {stats.recommended.map((e) => (
              <div
                key={e}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-sm">{e}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                  Add
                </span>
              </div>
            ))}
            {!stats.recommended.length && (
              <p className="text-xs text-white/40">No recommendations.</p>
            )}
          </div>
        </div>

        <div
          className="tile p-4"
          style={{ background: "var(--section-soft)", borderColor: "var(--section)" }}
        >
          <div
            className="text-[10px] uppercase tracking-widest font-bold mb-1"
            style={{ color: "var(--section)" }}
          >
            Training context
          </div>
          <p className="text-sm">
            These are existing FitCore training signals based on available history. They do not
            diagnose weakness, injury, overtraining, or readiness for a specific load.
          </p>
        </div>
        {action}
      </div>
    </BottomSheet>
  );
}

function Stat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="tile p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
      <div className="font-display text-2xl mt-1" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="text-xs text-white/40 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="tile p-3">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
      <div className="font-display text-xl mt-1" style={{ color }}>
        {value}%
      </div>
      <div className="h-1 mt-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
