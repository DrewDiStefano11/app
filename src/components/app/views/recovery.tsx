import { useState } from "react";
import { Plus, Moon, Heart } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import { Card, PageHeader, PrimaryButton, GhostButton, EmptyState, Input, Label, Ring, Chip, Textarea } from "@/components/app/ui";
import { BottomSheet } from "@/components/app/sheet";

const MUSCLES = ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core"];
const LEVELS: FatigueLevel[] = ["fresh","moderate","fatigued","very"];
const LEVEL_COLOR: Record<FatigueLevel,string> = { fresh: "var(--section)", moderate: "oklch(0.7 0.18 90)", fatigued: "oklch(0.65 0.2 40)", very: "oklch(0.6 0.22 25)" };

export function RecoveryView() {
  const { state, set } = useStore();
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fatigueOpen, setFatigueOpen] = useState(false);

  // Readiness
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  let readiness = 0; let parts = 0;
  if (lastSleep) { readiness += Math.min(100, (lastSleep.hours / 8) * 50 + lastSleep.quality * 5); parts++; }
  if (lastCheck) { readiness += (lastCheck.energy + (10 - lastCheck.soreness) + (10 - lastCheck.stress) + lastCheck.motivation) * 2.5; parts++; }
  const score = parts > 0 ? Math.round(readiness / parts) : 0;

  const weekSleep = state.sleepEntries.filter(s => s.createdAt > Date.now() - 7*86400000);
  const avgSleep = weekSleep.length ? (weekSleep.reduce((a, s) => a + s.hours, 0) / weekSleep.length).toFixed(1) : "—";

  return (
    <div className="pb-6">
      <PageHeader title="Recovery" subtitle={parts ? `Readiness ${score}%` : "Add a check-in to start"} />

      <div className="px-5">
        <div className="card-elev p-5 section-gradient ring-section">
          <div className="flex items-center gap-4">
            <Ring value={score} max={100} size={96} label="ready" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Readiness</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{parts ? score : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">{parts ? (score >= 75 ? "Good to push hard" : score >= 50 ? "Train at moderate intensity" : "Consider an easy session") : "Needs more data"}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <PrimaryButton className="flex-1" onClick={() => setCheckOpen(true)}><Plus size={16} />Check-in</PrimaryButton>
            <GhostButton onClick={() => setSleepOpen(true)}><Moon size={16} />Sleep</GhostButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg sleep 7d</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{avgSleep}h</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-ins</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{state.recoveryCheckIns.length}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between mt-6 mb-2 px-1">
          <h3 className="font-semibold">Muscle fatigue</h3>
          <button onClick={() => setFatigueOpen(true)} className="text-xs text-muted-foreground hover:text-foreground">Update</button>
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-2">
            {MUSCLES.map(m => {
              const lvl = state.muscleFatigue[m] ?? "fresh";
              return (
                <div key={m} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
                  <span className="text-sm capitalize">{m}</span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: LEVEL_COLOR[lvl] }}>{lvl}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <h3 className="font-semibold mt-6 mb-2 px-1">Recent check-ins</h3>
        {state.recoveryCheckIns.length === 0 ? (
          <EmptyState icon={<Heart size={22} />} title="No check-ins yet" description="Daily check-ins power your readiness score." />
        ) : (
          <div className="space-y-2">
            {[...state.recoveryCheckIns].reverse().slice(0, 5).map(c => (
              <Card key={c.id}>
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs">⚡{c.energy} • 💪{10-c.soreness} • 😌{10-c.stress} • 🔥{c.motivation}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
      <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
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
  const [notes, setNotes] = useState("");
  const submit = () => {
    set(s => ({ ...s, recoveryCheckIns: [...s.recoveryCheckIns, { id: uid(), energy, soreness, stress, motivation, notes, createdAt: Date.now() }] }));
    onClose();
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
  const submit = () => {
    set(s => ({ ...s, sleepEntries: [...s.sleepEntries, { id: uid(), hours: Number(hours)||0, quality, createdAt: Date.now() }] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log sleep">
      <div className="space-y-4">
        <div><Label>Hours slept</Label><Input inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} /></div>
        <Slider label="Sleep quality" value={quality} onChange={setQuality} />
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
