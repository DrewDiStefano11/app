import { useMemo } from "react";
import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { readinessScore, recoveryScore, bestMuscleToTrainToday } from "@/lib/analytics";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const DAY = 86400000;

export function ReadinessDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view } = useStore();
  const readiness = useMemo(() => readinessScore(view), [view]);
  const recovery = useMemo(() => recoveryScore(view), [view]);
  const best = useMemo(() => bestMuscleToTrainToday(view), [view]);

  // 14-day trend from sleep+checkins synthesized
  const series = useMemo(() => {
    const now = Date.now();
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const start = now - (i + 1) * DAY;
      const end = now - i * DAY;
      const sleeps = view.sleepEntries.filter(s => s.createdAt >= start && s.createdAt < end);
      const checks = view.recoveryCheckIns.filter(c => c.createdAt >= start && c.createdAt < end);
      let score = 70;
      if (sleeps.length || checks.length) {
        const sAvg = sleeps.length
          ? sleeps.reduce((a, s) => a + Math.min(1, s.hours / 8) * (s.quality / 5), 0) / sleeps.length : 0.7;
        const cAvg = checks.length
          ? checks.reduce((a, c) => a + ((c.energy + c.motivation + (6 - c.soreness) + (6 - c.stress)) / 20), 0) / checks.length : 0.7;
        score = Math.round((sAvg * 0.5 + cAvg * 0.5) * 100);
      }
      const d = new Date(end);
      out.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1), readiness: score });
    }
    return out;
  }, [view]);

  const reco = readiness >= 80
    ? `Prime day — push hard. Target ${best} with a heavy compound.`
    : readiness >= 60
      ? `Solid day — moderate intensity. ${best} session recommended.`
      : `Low readiness — prioritize mobility, light cardio, or skill work.`;

  return (
    <BottomSheet open={open} onClose={onClose} title="Readiness & Recovery" height="tall">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreTile label="Readiness" value={readiness} color="rgb(96 165 250)" />
          <ScoreTile label="Recovery" value={recovery} color="rgb(34 197 94)" />
        </div>

        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Today's Recommendation</div>
          <p className="text-sm">{reco}</p>
        </div>

        <div className="tile p-3 h-56">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 px-2 pt-1">14-Day Readiness Trend</div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={series} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="readiness" stroke="rgb(96 165 250)" strokeWidth={2.5} dot={{ r: 3, fill: "rgb(96 165 250)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Pill label="Sleep" value={view.sleepEntries.slice(-1)[0]?.hours.toFixed(1) ?? "—"} unit="h" />
          <Pill label="Checkins" value={view.recoveryCheckIns.length} unit="" />
          <Pill label="Best Today" value={best} unit="" caps />
        </div>
      </div>
    </BottomSheet>
  );
}

function ScoreTile({ label, value, color }: { label: string; value: number; color: string }) {
  const size = 96; const r = size / 2 - 6; const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / 100);
  return (
    <div className="tile p-4 flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 mt-2">{label}</span>
    </div>
  );
}
function Pill({ label, value, unit, caps }: { label: string; value: string | number; unit: string; caps?: boolean }) {
  return (
    <div className="tile p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
      <div className={`font-display text-lg mt-1 ${caps ? "capitalize" : ""}`}>{value}<span className="text-xs text-white/40 ml-0.5">{unit}</span></div>
    </div>
  );
}
