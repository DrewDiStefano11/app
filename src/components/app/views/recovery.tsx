import { useState, useMemo } from "react";
import { Plus, Moon, Heart, Activity } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { muscleMap } from "@/lib/analytics";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Input, Label, Ring, Textarea, SubTabs, SectionHeader, Chip, PlannedFeatureCard } from "@/components/app/ui";
import { BottomSheet } from "@/components/app/sheet";

const MUSCLES = ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core"];
const LEVELS: FatigueLevel[] = ["fresh","moderate","fatigued","very"];
const LEVEL_COLOR: Record<FatigueLevel,string> = { fresh: "var(--section)", moderate: "oklch(0.7 0.18 90)", fatigued: "oklch(0.65 0.2 40)", very: "oklch(0.6 0.22 25)" };

type Tab = "overview" | "readiness" | "sleep" | "muscle" | "checkin" | "trends" | "safety";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "readiness", label: "Readiness" },
  { id: "sleep", label: "Sleep" },
  { id: "muscle", label: "Soreness / Body" },
  { id: "checkin", label: "Check-In" },
  { id: "trends", label: "Trends" },
  { id: "safety", label: "Safety" },
];

function readiness(state: ReturnType<typeof useStore>["state"]) {
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  let total = 0, parts = 0;
  if (lastSleep) { total += Math.min(100, (lastSleep.hours / 8) * 50 + lastSleep.quality * 5); parts++; }
  if (lastCheck) { total += (lastCheck.energy + (10 - lastCheck.soreness) + (10 - lastCheck.stress) + lastCheck.motivation) * 2.5; parts++; }
  return { score: parts ? Math.round(total / parts) : 0, parts };
}

export function RecoveryView({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { state } = useStore();
  const { score, parts } = readiness(state);
  const isDeepDive = layoutMode === "deepDive";
  return (
    <div className="pb-24">
      <PageHeader title="Recovery" subtitle={`${parts ? `Readiness ${score}%` : "Add a check-in to start"} - ${isDeepDive ? "Deep Dive" : "Daily View"}`} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "overview" && <ReadinessTab layoutMode={layoutMode} />}
      {tab === "readiness" && <ReadinessTab />}
      {tab === "sleep" && <SleepSubtab />}
      {tab === "muscle" && <MuscleTab />}
      {tab === "checkin" && <CheckInSubtab />}
      {tab === "trends" && <TrendsTab />}
      {tab === "safety" && <SafetySubtab />}
    </div>
  );
}

/* ===================== READINESS ===================== */

function ReadinessTab({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const { state } = useStore();
  const { score, parts } = readiness(state);
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const weekSleep = state.sleepEntries.filter(s => s.createdAt > Date.now() - 7*86400000);
  const avgSleep = weekSleep.length ? (weekSleep.reduce((a, s) => a + s.hours, 0) / weekSleep.length).toFixed(1) : "—";
  const sleepGoal = state.profile.sleepGoalH ?? 8;
  const isDeepDive = layoutMode === "deepDive";

  const rec = !parts ? "Add a check-in or sleep entry to get a recommendation."
    : score >= 75 ? "Great recovery — train hard today."
    : score >= 60 ? "Solid recovery — normal training day."
    : score >= 40 ? "Reduce volume or intensity ~20%."
    : "Rest, mobility, or light cardio only.";

  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-center gap-4">
          <Ring value={score} max={100} size={96} label="ready" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's readiness</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{parts ? `${score}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{rec}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <PrimaryButton className="flex-1" onClick={() => setCheckOpen(true)}><Plus size={16} />Check-in</PrimaryButton>
          <GhostButton onClick={() => setSleepOpen(true)}><Moon size={16} />Sleep</GhostButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <StatCard label="Last sleep" value={lastSleep ? `${lastSleep.hours}h` : "—"} sub={lastSleep ? `q ${lastSleep.quality}/10` : ""} accent />
        <StatCard label="7d avg" value={`${avgSleep}h`} sub={`goal ${sleepGoal}h`} />
        <StatCard label="Steps" value={state.profile.stepGoal ?? "—"} sub="goal" />
      </div>

      {isDeepDive && (
        <Card className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Why this matters</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Readiness uses the latest sleep and check-in data already logged in FitCore. Wearable signals will appear only after real device integrations exist.
          </p>
        </Card>
      )}

      {lastCheck && (
        <>
          <SectionHeader title="Last check-in" />
          <Card>
            <div className="flex justify-between text-sm">
              <p className="text-muted-foreground">{new Date(lastCheck.createdAt).toLocaleDateString()}</p>
              <p>⚡{lastCheck.energy} • 💪{10-lastCheck.soreness} • 😌{10-lastCheck.stress} • 🔥{lastCheck.motivation}</p>
            </div>
          </Card>
        </>
      )}

      <SupplementsTodayCard />



      <p className="text-[11px] text-muted-foreground text-center mt-4">General fitness guidance. Not medical advice.</p>

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
    </div>
  );
}

/* ===================== MUSCLE STATUS ===================== */

function MuscleTab() {
  const { state, set } = useStore();
  const [side, setSide] = useState<"front" | "back">("front");
  const [fatigueOpen, setFatigueOpen] = useState(false);
  const values = useMemo(() => muscleMap(state, "recovery"), [state]);
  const sore = MUSCLES.filter(m => state.muscleFatigue[m] && state.muscleFatigue[m] !== "fresh");

  return (
    <div className="px-5">
      <div className="card-elev p-4 section-gradient ring-section">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Body heatmap</p>
          <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
            {(["front","back"] as const).map(s => (
              <button key={s} onClick={() => setSide(s)}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full transition ${side === s ? "bg-white/15 text-white" : "text-white/50"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="aspect-[1/2] w-full max-w-[200px]">
            <BodyHeatmap values={values} mode="recovery" side={side} compact />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">Green = recovered. Red = recent load.</p>
      </div>

      <SectionHeader title="Soreness check-in" action={<button onClick={() => setFatigueOpen(true)} className="text-xs text-muted-foreground">Update all</button>} />
      {sore.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">All muscles marked fresh. Tap Update if you feel sore.</p></Card>
      ) : (
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {sore.map(m => (
              <span key={m} className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full text-white capitalize" style={{ background: LEVEL_COLOR[state.muscleFatigue[m]!] }}>
                {m} · {state.muscleFatigue[m]}
              </span>
            ))}
          </div>
        </Card>
      )}

      <SectionHeader title="Quick tap" />
      <div className="grid grid-cols-2 gap-2">
        {MUSCLES.map(m => {
          const lvl = state.muscleFatigue[m] ?? "fresh";
          const next: FatigueLevel = lvl === "fresh" ? "moderate" : lvl === "moderate" ? "fatigued" : lvl === "fatigued" ? "very" : "fresh";
          return (
            <button key={m}
              onClick={() => set(s => ({ ...s, muscleFatigue: { ...s.muscleFatigue, [m]: next } }))}
              className="card-elev p-3 flex items-center justify-between text-left active:scale-[0.98]">
              <span className="text-sm font-medium capitalize">{m}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: LEVEL_COLOR[lvl] }}>{lvl}</span>
            </button>
          );
        })}
      </div>

      <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
    </div>
  );
}

function SleepSubtab() {
  const { state } = useStore();
  const [sleepOpen, setSleepOpen] = useState(false);
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  const weekSleep = state.sleepEntries.filter(s => s.createdAt > Date.now() - 7*86400000);
  const avgSleep = weekSleep.length ? (weekSleep.reduce((a, s) => a + s.hours, 0) / weekSleep.length).toFixed(1) : "--";
  return (
    <div className="px-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Last sleep" value={lastSleep ? `${lastSleep.hours}h` : "--"} sub={lastSleep ? `q ${lastSleep.quality}/10` : "no entry"} accent />
        <StatCard label="7d avg" value={`${avgSleep}h`} sub={`${weekSleep.length} entries`} />
      </div>
      <PrimaryButton className="w-full" onClick={() => setSleepOpen(true)}><Moon size={16} />Log sleep</PrimaryButton>
      <PlannedFeatureCard
        title="Sleep trend analytics"
        status="Coming later"
        description="Deeper sleep timing and quality trends will appear here once enough real sleep entries exist."
      />
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
    </div>
  );
}

function CheckInSubtab() {
  const { state } = useStore();
  const [checkOpen, setCheckOpen] = useState(false);
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  return (
    <div className="px-5 space-y-4">
      <PrimaryButton className="w-full" onClick={() => setCheckOpen(true)}><Plus size={16} />Check In</PrimaryButton>
      {lastCheck ? (
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Latest check-in</p>
          <p className="mt-2 text-sm text-muted-foreground">{new Date(lastCheck.createdAt).toLocaleString()}</p>
          <p className="mt-2 text-sm">Energy {lastCheck.energy}/10 - Soreness {lastCheck.soreness}/10 - Stress {lastCheck.stress}/10 - Motivation {lastCheck.motivation}/10</p>
        </Card>
      ) : (
        <EmptyState icon={<Heart size={22} />} title="No check-ins yet" description="Your daily check-in history will appear here." />
      )}
      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
    </div>
  );
}

function SafetySubtab() {
  return (
    <div className="px-5 space-y-4">
      <PlannedFeatureCard
        title="Recovery safety guidance"
        status="Presentational only"
        description="Future injury and red-flag guidance will live here. FitCore does not diagnose conditions or replace medical care."
      />
    </div>
  );
}

/* ===================== TRENDS ===================== */

function TrendsTab() {
  const { state } = useStore();
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const days = range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 86400000;
  const sleeps = state.sleepEntries.filter(s => s.createdAt > cutoff);
  const checks = state.recoveryCheckIns.filter(c => c.createdAt > cutoff);
  const sleepAvg = sleeps.length ? (sleeps.reduce((a, s) => a + s.hours, 0) / sleeps.length).toFixed(1) : "—";
  const qAvg = sleeps.length ? (sleeps.reduce((a, s) => a + s.quality, 0) / sleeps.length).toFixed(1) : "—";
  const consistency = Math.round((sleeps.length / days) * 100);

  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3">
        {(["7d","30d"] as const).map(r => <Chip key={r} active={range === r} onClick={() => setRange(r)}>{r}</Chip>)}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Sleep avg" value={`${sleepAvg}h`} accent />
        <StatCard label="Quality" value={`${qAvg}`} sub="/10" />
        <StatCard label="Logged" value={`${consistency}%`} sub="of days" />
      </div>

      <SectionHeader title="Sleep trend" />
      <Card>
        {sleeps.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Log at least 2 nights to see trends.</p>
        ) : (
          <Sparkline points={[...sleeps].sort((a,b) => a.createdAt - b.createdAt).map(s => s.hours)} unit="h" />
        )}
      </Card>

      <SectionHeader title="Readiness history" />
      {checks.length === 0 ? (
        <EmptyState icon={<Heart size={22} />} title="No check-ins" description="Log daily check-ins to see your readiness curve." />
      ) : (
        <div className="space-y-2">
          {[...checks].reverse().slice(0, 10).map(c => {
            const score = Math.round((c.energy + (10 - c.soreness) + (10 - c.stress) + c.motivation) * 2.5);
            return (
              <Card key={c.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{new Date(c.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">⚡{c.energy} • 💪{10-c.soreness} • 😌{10-c.stress} • 🔥{c.motivation}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: "var(--section)" }}>{score}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sparkline({ points, unit }: { points: number[]; unit: string }) {
  const w = 320, h = 80, pad = 8;
  const min = Math.min(...points), max = Math.max(...points);
  const range = Math.max(0.1, max - min);
  const step = (w - pad*2) / Math.max(1, points.length - 1);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i*step} ${h - pad - ((v - min)/range)*(h - pad*2)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <path d={path} fill="none" stroke="var(--section)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums mt-1">
        <span>{points[0]}{unit}</span><span>{points[points.length-1]}{unit}</span>
      </div>
    </div>
  );
}

/* ===================== SHEETS ===================== */

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1"><Label>{label}</Label><span className="text-sm tabular-nums">{value}/10</span></div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[var(--section)]" />
    </div>
  );
}

function CheckInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [motivation, setMotivation] = useState(8);
  const [notes, setNotes] = useState("");
  const submit = () => {
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id: uid(), energy, soreness, stress, motivation, notes: notes || undefined, createdAt: Date.now() }] }));
    setNotes(""); onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Daily check-in">
      <div className="space-y-4">
        <Slider label="Energy" value={energy} onChange={setEnergy} />
        <Slider label="Soreness" value={soreness} onChange={setSoreness} />
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider label="Motivation" value={motivation} onChange={setMotivation} />
        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <PrimaryButton className="w-full" onClick={submit}>Save check-in</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function SleepSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [hours, setHours] = useState("7.5");
  const [quality, setQuality] = useState(7);
  const [bed, setBed] = useState("");
  const [wake, setWake] = useState("");
  const submit = () => {
    const h = Number(hours); if (!h) return;
    const notes = [bed && `Bed ${bed}`, wake && `Wake ${wake}`].filter(Boolean).join(" • ");
    set(s => ({ ...s, sleepEntries: [...s.sleepEntries, { id: uid(), hours: h, quality, notes: notes || undefined, createdAt: Date.now() }] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log sleep">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Hours</Label><Input inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} /></div>
          <div>
            <div className="flex justify-between"><Label>Quality</Label><span className="text-xs tabular-nums">{quality}/10</span></div>
            <input type="range" min={1} max={10} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-[var(--section)] mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Bedtime</Label><Input value={bed} onChange={e => setBed(e.target.value)} placeholder="11:30 PM" /></div>
          <div><Label>Wake</Label><Input value={wake} onChange={e => setWake(e.target.value)} placeholder="7:00 AM" /></div>
        </div>
        <PrimaryButton className="w-full" onClick={submit}>Save sleep</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function FatigueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  return (
    <BottomSheet open={open} onClose={onClose} title="Muscle fatigue" height="tall">
      <div className="space-y-3">
        {MUSCLES.map(m => (
          <div key={m}>
            <p className="text-sm font-medium capitalize mb-2">{m}</p>
            <div className="flex gap-1.5">
              {LEVELS.map(lvl => (
                <button key={lvl} onClick={() => set(s => ({ ...s, muscleFatigue: { ...s.muscleFatigue, [m]: lvl } }))}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs capitalize border ${state.muscleFatigue[m] === lvl ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                  style={state.muscleFatigue[m] === lvl ? { background: LEVEL_COLOR[lvl] } : undefined}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

/* ===================== SUPPLEMENTS TODAY ===================== */

function SupplementsTodayCard() {
  const { state } = useStore();
  const t = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }, []);
  const today = state.supplementLogs.filter(s => s.createdAt >= t);
  const routine = state.userGoalsProfile.supplementRoutine ?? [];
  if (today.length === 0 && routine.length === 0) return null;
  const takenNames = today.map(s => s.name.toLowerCase());
  const missing = routine.filter(r => !takenNames.some(tn => tn.includes(r.toLowerCase())));
  return (
    <>
      <SectionHeader title="Supplements today" />
      <Card className="space-y-2">
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">None logged yet. Tell Jarvis "log creatine".</p>
        ) : (
          <ul className="text-sm space-y-1">
            {today.map(s => (
              <li key={s.id} className="flex justify-between">
                <span>✓ {s.name}{s.dose ? ` (${s.dose})` : ""}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            From routine — still missing: <span className="text-foreground">{missing.join(", ")}</span>
          </p>
        )}
      </Card>
    </>
  );
}
