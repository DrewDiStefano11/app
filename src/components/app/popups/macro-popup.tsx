import { useMemo, useState } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const DAY = 86400000;

export function MacroDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view, state } = useStore();
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const [view2, setView2] = useState<"daily" | "weekly">("daily");

  const targets = state.nutritionTargets;

  const today = useMemo(() => {
    const t = view.mealEntries.filter(m => m.createdAt > Date.now() - DAY);
    return t.reduce((s, m) => ({
      calories: s.calories + m.calories, protein: s.protein + m.protein,
      carbs: s.carbs + m.carbs, fat: s.fat + m.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [view]);

  const series = useMemo(() => {
    const out = [];
    const now = Date.now();
    if (view2 === "daily") {
      for (let i = range - 1; i >= 0; i--) {
        const start = now - (i + 1) * DAY;
        const end = now - i * DAY;
        const day = view.mealEntries.filter(m => m.createdAt >= start && m.createdAt < end);
        const t = day.reduce((s, m) => ({
          c: s.c + m.calories, p: s.p + m.protein, ca: s.ca + m.carbs, f: s.f + m.fat,
        }), { c: 0, p: 0, ca: 0, f: 0 });
        const d = new Date(end);
        out.push({
          label: range <= 14
            ? d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1)
            : `${d.getMonth() + 1}/${d.getDate()}`,
          calories: Math.round(t.c), protein: Math.round(t.p),
          carbs: Math.round(t.ca), fat: Math.round(t.f),
        });
      }
    } else {
      const weeks = Math.max(1, Math.ceil(range / 7));
      for (let i = weeks - 1; i >= 0; i--) {
        const start = now - (i + 1) * 7 * DAY;
        const end = now - i * 7 * DAY;
        const wk = view.mealEntries.filter(m => m.createdAt >= start && m.createdAt < end);
        const t = wk.reduce((s, m) => ({
          c: s.c + m.calories, p: s.p + m.protein, ca: s.ca + m.carbs, f: s.f + m.fat,
        }), { c: 0, p: 0, ca: 0, f: 0 });
        out.push({
          label: `W${weeks - i}`,
          calories: Math.round(t.c / 7), protein: Math.round(t.p / 7),
          carbs: Math.round(t.ca / 7), fat: Math.round(t.f / 7),
        });
      }
    }
    return out;
  }, [view, range, view2]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Nutrition" height="tall">
      <div className="space-y-4">
        {/* Macro rings */}
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Today</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-4xl">{today.calories}</span>
            <span className="text-xs text-white/40 font-bold uppercase">/ {targets.calories} kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MacroRing label="P" val={today.protein} target={targets.protein} color="rgb(239 68 68)" />
            <MacroRing label="C" val={today.carbs} target={targets.carbs} color="rgb(245 158 11)" />
            <MacroRing label="F" val={today.fat} target={targets.fat} color="rgb(34 197 94)" />
          </div>
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
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 px-2 pt-1">Calories Trend</div>
          <ResponsiveContainer width="100%" height="85%">
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
              <Area type="monotone" dataKey="calories" stroke="var(--section)" strokeWidth={2} fill="url(#kcalG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
