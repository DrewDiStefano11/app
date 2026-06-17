import { useState } from "react";
import { Plus, Moon, Heart, Trash2, Activity } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Input, Label, Ring, Textarea, SubTabs, SectionHeader } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const MUSCLES = ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core"];
const LEVELS: FatigueLevel[] = ["fresh","moderate","fatigued","very"];
const LEVEL_COLOR: Record<FatigueLevel,string> = { fresh: "var(--section)", moderate: "oklch(0.7 0.18 90)", fatigued: "oklch(0.65 0.2 40)", very: "oklch(0.6 0.22 25)" };

type Tab = "home" | "sleep" | "readiness";
const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "sleep", label: "Sleep" },
  { id: "readiness", label: "Readiness" },
];

function readiness(state: ReturnType<typeof useStore>["state"]) {
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  let total = 0, parts = 0;
  if (lastSleep) { total += Math.min(100, (lastSleep.hours / 8) * 50 + lastSleep.quality * 5); parts++; }
  if (lastCheck) { total += (lastCheck.energy + (10 - lastCheck.soreness) + (10 - lastCheck.stress) + lastCheck.motivation) * 2.5; parts++; }
  return { score: parts ? Math.round(total / parts) : 0, parts };
}

export function RecoveryView() {
  const [tab, setTab] = useState<Tab>("home");
  const { state } = useStore();
  const { score, parts } = readiness(state);
  return (
    <div className="pb-24">
      <PageHeader title="Recovery" subtitle={parts ? `Readiness ${score}%` : "Add a check-in to start"} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "home" && <HomeTab onJump={setTab} />}
      {tab === "sleep" && <SleepTab />}
      {tab === "readiness" && <ReadinessTab />}
    </div>
  );
}

function HomeTab({ onJump }: { onJump: (t: Tab) => void }) {
  const { state } = useStore();
  const { score, parts } = readiness(state);
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fatigueOpen, setFatigueOpen] = useState(false);
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const weekSleep = state.sleepEntries.filter(s => s.createdAt > Date.now() - 7*86400000);
  const avgSleep = weekSleep.length ? (weekSleep.reduce((a, s) => a + s.hours, 0) / weekSleep.length).toFixed(1) : "—";
  const rec = !parts ? "Add a check-in or sleep entry to get a recommendation."
    : score >= 75 ? "Great recovery — train hard today." : score >= 50 ? "Train at moderate intensity." : "Consider a lighter session or rest day.";
  const mostFatigued = MUSCLES.filter(m => state.muscleFatigue[m] && state.muscleFatigue[m] !== "fresh");
  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-center gap-4">
          <Ring value={score} max={100} size={96} label="ready" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Readiness</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{parts ? score : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{rec}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <PrimaryButton className="flex-1" onClick={() => setCheckOpen(true)}><Plus size={16} />Check-in</PrimaryButton>
          <GhostButton onClick={() => setSleepOpen(true)}><Moon size={16} />Sleep</GhostButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard label="Sleep avg 7d" value={`${avgSleep}h`} />
        <StatCard label="Check-ins" value={state.recoveryCheckIns.length} />
      </div>

      <SectionHeader title="Muscle fatigue" action={<button onClick={() => setFatigueOpen(true)} className="text-xs text-muted-foreground">Update</button>} />
      {mostFatigued.length === 0 ? (
        <Card><p className="text-sm text-muted-foreground">All muscles marked fresh. Tap Update if you feel sore.</p></Card>
      ) : (
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {mostFatigued.map(m => (
              <span key={m} className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full text-white capitalize" style={{ background: LEVEL_COLOR[state.muscleFatigue[m]!] }}>{m} · {state.muscleFatigue[m]}</span>
            ))}
          </div>
        </Card>
      )}

      <SectionHeader title="Quick actions" />
      <div className="grid grid-cols-3 gap-3">
        <QA icon={<Moon size={16} />} label="Log sleep" onClick={() => onJump("sleep")} />
        <QA icon={<Heart size={16} />} label="Check-in" onClick={() => onJump("readiness")} />
        <QA icon={<Activity size={16} />} label="Fatigue" onClick={() => setFatigueOpen(true)} />
      </div>

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

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
      <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
    </div>
  );
}

function QA({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-elev p-4 flex items-center gap-3 text-left active:scale-[0.98]">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--section-soft)", color: "var(--section)" }}>{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function SleepTab() {
  const { state, set } = useStore();
  const [hours, setHours] = useState("7.5");
  const [quality, setQuality] = useState(7);
  const [bed, setBed] = useState("");
  const [wake, setWake] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const week = state.sleepEntries.filter(s => s.createdAt > Date.now() - 7*86400000);
  const avg = week.length ? (week.reduce((a, s) => a + s.hours, 0) / week.length).toFixed(1) : "—";
  const best = week.length ? Math.max(...week.map(s => s.hours)) : 0;
  const worst = week.length ? Math.min(...week.map(s => s.hours)) : 0;

  const submit = () => {
    const h = Number(hours); if (!h) return;
    const notesAll = [bed && `Bed ${bed}`, wake && `Wake ${wake}`, notes].filter(Boolean).join(" • ");
    set(s => ({ ...s, sleepEntries: [...s.sleepEntries, { id: uid(), hours: h, quality, notes: notesAll || undefined, createdAt: Date.now() }] }));
    setNotes("");
  };

  return (
    <div className="px-5">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="7d avg" value={`${avg}h`} accent />
        <StatCard label="Best" value={best ? `${best}h` : "—"} />
        <StatCard label="Worst" value={worst ? `${worst}h` : "—"} />
      </div>

      <SectionHeader title="Log sleep" />
      <div className="space-y-3">
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
        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <PrimaryButton className="w-full" onClick={submit}>Save sleep</PrimaryButton>
      </div>

      <SectionHeader title="Recent" />
      {state.sleepEntries.length === 0 ? (
        <EmptyState icon={<Moon size={22} />} title="No sleep logged" description="Track sleep to power your readiness score." />
      ) : (
        <div className="space-y-2">
          {[...state.sleepEntries].reverse().slice(0, 10).map(s => (
            <Card key={s.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold tabular-nums">{s.hours}h <span className="text-xs text-muted-foreground">• {s.quality}/10</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}{s.notes ? ` • ${s.notes}` : ""}</p>
                </div>
                <button onClick={() => setConfirmDel(s.id)} className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { set(s => ({ ...s, sleepEntries: s.sleepEntries.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }}
        title="Delete sleep entry?" message="This can't be undone." confirmLabel="Delete" destructive />
    </div>
  );
}

function ReadinessTab() {
  const { state, set } = useStore();
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [motivation, setMotivation] = useState(8);
  const [notes, setNotes] = useState("");
  const { score, parts } = readiness(state);

  const submit = () => {
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id: uid(), energy, soreness, stress, motivation, notes: notes || undefined, createdAt: Date.now() }] }));
    setNotes("");
  };

  const reco = !parts ? "Needs more data — log a check-in or sleep first."
    : score >= 75 ? "✅ Train hard. Push intensity and volume."
    : score >= 60 ? "🟢 Normal training day."
    : score >= 40 ? "🟡 Reduce volume or intensity ~20%."
    : "🔴 Rest, mobility, or light cardio only.";

  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's readiness</p>
        <p className="text-4xl font-bold tabular-nums mt-1">{parts ? `${score}%` : "—"}</p>
        <p className="text-sm mt-2">{reco}</p>
      </div>

      <SectionHeader title="New check-in" />
      <div className="space-y-4">
        <Slider label="Energy" value={energy} onChange={setEnergy} />
        <Slider label="Soreness" value={soreness} onChange={setSoreness} />
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider label="Motivation" value={motivation} onChange={setMotivation} />
        <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <PrimaryButton className="w-full" onClick={submit}>Save check-in</PrimaryButton>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-4">General fitness guidance. Not medical advice.</p>
    </div>
  );
}

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
  const submit = () => {
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id: uid(), energy, soreness, stress, motivation, createdAt: Date.now() }] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Daily check-in">
      <div className="space-y-4">
        <Slider label="Energy" value={energy} onChange={setEnergy} />
        <Slider label="Soreness" value={soreness} onChange={setSoreness} />
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider label="Motivation" value={motivation} onChange={setMotivation} />
        <PrimaryButton className="w-full" onClick={submit}>Save</PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function SleepSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [hours, setHours] = useState("7.5");
  const [quality, setQuality] = useState(7);
  const submit = () => {
    set(s => ({ ...s, sleepEntries: [...s.sleepEntries, { id: uid(), hours: Number(hours)||0, quality, createdAt: Date.now() }] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log sleep">
      <div className="space-y-4">
        <div><Label>Hours</Label><Input inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} /></div>
        <Slider label="Quality" value={quality} onChange={setQuality} />
        <PrimaryButton className="w-full" onClick={submit}>Save</PrimaryButton>
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
