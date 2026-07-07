import { useMemo } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { usePersistentState } from "@/lib/persist";
import { volumeSeries, volumeByMuscle, volumeByExercise, volumeByDayOfWeek, compareWindows, type Bucket } from "@/lib/analytics-extra";
import { GRAPH_PREFS } from "@/lib/persist";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const RANGES: { id: string; days: number; bucket: Bucket; label: string }[] = [
  { id: "7d", days: 7, bucket: "day", label: "7D" },
  { id: "30d", days: 30, bucket: "day", label: "30D" },
  { id: "90d", days: 90, bucket: "week", label: "90D" },
  { id: "1y", days: 365, bucket: "month", label: "1Y" },
  { id: "all", days: 9999, bucket: "month", label: "All" },
];
type GroupBy = "total" | "muscle" | "exercise" | "day";

export function VolumeDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view } = useStore();
  const [rangeId, setRangeId] = usePersistentState<string>(GRAPH_PREFS.volumeRange, "30d");
  const [groupBy, setGroupBy] = usePersistentState<GroupBy>(GRAPH_PREFS.volumeMode, "total");
  const [compare, setCompare] = usePersistentState<boolean>(GRAPH_PREFS.volumeCompare, false);
  const range = RANGES.find(r => r.id === rangeId) ?? RANGES[1];

  const totalSeries = useMemo(() => volumeSeries(view, range.days, range.bucket), [view, range]);
  const byMuscle = useMemo(() => volumeByMuscle(view, range.days), [view, range.days]);
  const byExercise = useMemo(() => volumeByExercise(view, range.days), [view, range.days]);
  const byDay = useMemo(() => volumeByDayOfWeek(view, range.days), [view, range.days]);
  const cmp = useMemo(() => compareWindows(view, range.days), [view, range.days]);

  const total = totalSeries.reduce((s, d) => s + d.volume, 0);

  return (
    <BottomSheet open={open} onClose={onClose} title="Total Volume" height="tall">
      <div className="space-y-4">
        {/* Total */}
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Volume · {range.label}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-4xl">{(total / 1000).toFixed(1)}k</span>
            <span className="text-xs text-white/40 font-bold uppercase">lb</span>
            {compare && (
              <span className={`text-xs font-bold ml-auto ${cmp.deltaPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {cmp.deltaPct >= 0 ? "+" : ""}{cmp.deltaPct}% vs prev
              </span>
            )}
          </div>
        </div>

        {/* Range filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRangeId(r.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                rangeId === r.id ? "text-white border-transparent" : "text-white/50 border-white/10"}`}
              style={rangeId === r.id ? { background: "var(--section)" } : undefined}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Group toggle */}
        <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 overflow-x-auto no-scrollbar">
          {([
            { id: "total", label: "Total" },
            { id: "muscle", label: "By Muscle" },
            { id: "exercise", label: "By Exercise" },
            { id: "day", label: "By Day" },
          ] as { id: GroupBy; label: string }[]).map(g => (
            <button key={g.id} onClick={() => setGroupBy(g.id)}
              className={`flex-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full transition whitespace-nowrap ${
                groupBy === g.id ? "bg-white/15 text-white" : "text-white/50"}`}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Compare toggle */}
        {groupBy === "total" && (
          <button onClick={() => setCompare(c => !c)}
            className={`w-full px-3 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider ${
              compare ? "border-transparent text-white" : "border-white/10 text-white/50"}`}
            style={compare ? { background: "var(--section-soft)", color: "var(--section)" } : undefined}>
            Compare to previous {range.label}
          </button>
        )}

        {/* Chart */}
        <div className="tile p-3 h-64">
          {groupBy === "total" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalSeries} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} lb`, "Volume"]} />
                <Bar dataKey="volume" fill="var(--section)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {groupBy === "muscle" && (
            byMuscle.length === 0 ? <Empty /> :
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMuscle} layout="vertical" margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={10} width={70} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} lb`, "Volume"]} />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {byMuscle.map((_, i) => <Cell key={i} fill="var(--section)" fillOpacity={1 - i * 0.06} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {groupBy === "exercise" && (
            byExercise.length === 0 ? <Empty /> :
            <div className="h-full overflow-y-auto pr-1 -mr-1">
              {byExercise.map((d, i) => {
                const max = byExercise[0].volume || 1;
                const pct = (d.volume / max) * 100;
                return (
                  <div key={d.name} className="mb-2.5">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white/80 font-bold truncate">{d.name}</span>
                      <span className="text-white/50 tabular-nums">{Math.round(d.volume / 1000 * 10) / 10}k · {d.sets} sets</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--section)", opacity: 1 - i * 0.05 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {groupBy === "day" && (
            byDay.every(d => d.volume === 0) ? <Empty /> :
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} lb`, "Volume"]} />
                <Bar dataKey="volume" fill="var(--section)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-xs text-white/40">No data in this range. Log a workout or enable Demo Data.</div>;
}
