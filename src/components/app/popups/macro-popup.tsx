import { startOfDay } from "@/lib/analytics/date-time";
import { calculateMealTotals } from "@/lib/analytics/domain-metrics";
import { MacroTrendChart } from "@/components/app/macro-trend-chart";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";



export function MacroDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, state } = useStore();

  const targets = state.nutritionTargets;

  const now = Date.now();
  const dayStart = startOfDay(now);
  const todayMeals = open
    ? view.mealEntries.filter((meal) => meal.createdAt >= dayStart && meal.createdAt <= now)
    : [];
  const today = calculateMealTotals(todayMeals);

  return (
    <BottomSheet open={open} onClose={onClose} title="Nutrition" height="tall">
      <div className="space-y-4">
        {/* Macro rings */}
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Logged today</div>
          {todayMeals.length > 0 ? <>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-4xl">{today.calories}</span>
            <span className="text-xs text-white/40 font-bold uppercase">{targets.calories > 0 ? `/ ${targets.calories} kcal` : "kcal · No target"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MacroRing label="P" val={today.protein} target={targets.protein} color="rgb(239 68 68)" />
            <MacroRing label="C" val={today.carbs} target={targets.carbs} color="rgb(245 158 11)" />
            <MacroRing label="F" val={today.fat} target={targets.fat} color="rgb(34 197 94)" />
          </div>
          </> : <p className="mt-2 text-sm text-muted-foreground">No meals logged today</p>}
        </div>

        <MacroTrendChart meals={view.mealEntries} now={now} demo={state.demoMode} />
      </div>
    </BottomSheet>
  );
}

function MacroRing({ label, val, target, color }: { label: string; val: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(1, val / target) : 0;
  const size = 64; const r = size / 2 - 5; const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="5" fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg leading-none" style={{ color }}>{Math.round(val)}</span>
          <span className="text-[9px] text-white/40 font-bold">{target > 0 ? `/${target}g` : "g · No target"}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mt-1">{label}</span>
    </div>
  );
}
