import { addCalendarDays, dayKey, startOfDay } from "@/lib/analytics/date-time";
import { useMemo } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { usePersistentState } from "@/lib/persist";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";


export function MacroDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, state } = useStore();
  const [range, setRange] = usePersistentState<7 | 30 | 90>("macro.range", 7);
  const [view2, setView2] = usePersistentState<"daily" | "weekly">("macro.view", "daily");

  const targets = state.nutritionTargets;

  const now = Date.now();
  const dayStart = startOfDay(now);
  const todayMeals = open
    ? view.mealEntries.filter((meal) => meal.createdAt >= dayStart && meal.createdAt <= now)
    : [];
  const today = todayMeals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const series = useMemo(() => {
    if (!open) return [];
    const mealsByDate = new Map<string, number>();
    for (const meal of view.mealEntries) {
      if (meal.createdAt > now || !Number.isFinite(meal.calories)) continue;
      const date = dayKey(meal.createdAt);
      if (date) mealsByDate.set(date, (mealsByDate.get(date) ?? 0) + meal.calories);
    }
    const daysPerPoint = view2 === "daily" ? 1 : 7;
    return Array.from({ length: Math.ceil(range / daysPerPoint) }, (_, index) => {
      const first = 1 - range + index * daysPerPoint;
      const last = Math.min(0, first + daysPerPoint - 1);
      const values = Array.from({ length: last - first + 1 }, (_, offset) =>
        mealsByDate.get(dayKey(addCalendarDays(dayStart, first + offset))),
      ).filter((value): value is number => value !== undefined);
      const firstDate = addCalendarDays(dayStart, first);
      const lastDate = addCalendarDays(dayStart, last);
      const shortDate = (date: number) =>
        new Date(date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
      return {
        label: first === last ? shortDate(firstDate) : `${shortDate(firstDate)}–${shortDate(lastDate)}`,
        calories: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
        loggedDays: values.length,
      };
    });
  }, [open, view.mealEntries, range, view2, dayStart, now]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Nutrition" height="tall">
      <div className="space-y-4">
        {/* Macro rings */}
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Logged today</div>
          {todayMeals.length > 0 ? <>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-4xl">{today.calories}</span>
            <span className="text-xs text-white/40 font-bold uppercase">/ {targets.calories} kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MacroRing label="P" val={today.protein} target={targets.protein} color="rgb(239 68 68)" />
            <MacroRing label="C" val={today.carbs} target={targets.carbs} color="rgb(245 158 11)" />
            <MacroRing label="F" val={today.fat} target={targets.fat} color="rgb(34 197 94)" />
          </div>
          </> : <p className="mt-2 text-sm text-muted-foreground">No meals logged today</p>}
        </div>

        {/* Range + view */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([7, 30, 90] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                range === r ? "text-white border-transparent" : "text-white/50 border-white/10"}`}
              style={range === r ? { background: "var(--section)" } : undefined}>
              {r}D
            </button>
          ))}
          <div className="ml-auto flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
            {(["daily", "weekly"] as const).map(v => (
              <button key={v} onClick={() => setView2(v)}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                  view2 === v ? "bg-white/15 text-white" : "text-white/50"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calories trend */}
        <div className="tile p-3 h-56">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 px-2 pt-1">{view2 === "daily" ? "Logged calories by date" : "Average calories per logged day"}</div>
          {series.some((point) => point.calories !== null) ? <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="kcalG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--section)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--section)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Area type="linear" dataKey="calories" name="Logged kcal" connectNulls={false} dot={{ r: 2 }} stroke="var(--section)" strokeWidth={2} fill="url(#kcalG)" />
            </AreaChart>
          </ResponsiveContainer> : <p className="px-2 pt-4 text-sm text-muted-foreground">No meals logged in this period.</p>}
        </div>
        {series.some((point) => point.loggedDays > 0) && (
          <details className="text-xs text-muted-foreground">
            <summary>Recorded values by date</summary>
            <ul className="mt-2 space-y-1">
              {series.map((point) => <li key={point.label}>{point.label} · {point.calories === null ? "—" : `${point.calories} kcal · ${point.loggedDays} logged ${point.loggedDays === 1 ? "day" : "days"}`}</li>)}
            </ul>
          </details>
        )}
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
          <span className="text-[9px] text-white/40 font-bold">/{target}g</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mt-1">{label}</span>
    </div>
  );
}
