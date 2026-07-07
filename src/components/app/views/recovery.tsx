import { useState, useMemo } from "react";
import { Plus, Moon, Heart, Activity } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import { muscleMap } from "@/lib/analytics";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import {
  Card,
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Input,
  Label,
  Ring,
  Textarea,
  SectionHeader,
} from "@/components/app/ui";
import { BottomSheet } from "@/components/app/sheet";

const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];
const LEVELS: FatigueLevel[] = ["fresh", "moderate", "fatigued", "very"];
const LEVEL_COLOR: Record<FatigueLevel, string> = {
  fresh: "var(--section)",
  moderate: "oklch(0.7 0.18 90)",
  fatigued: "oklch(0.65 0.2 40)",
  very: "oklch(0.6 0.22 25)",
};

function readiness(state: ReturnType<typeof useStore>["state"]) {
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  let total = 0,
    parts = 0;
  if (lastSleep) {
    total += Math.min(100, (lastSleep.hours / 8) * 50 + lastSleep.quality * 5);
    parts++;
  }
  if (lastCheck) {
    total +=
      (lastCheck.energy +
        (10 - lastCheck.soreness) +
        (10 - lastCheck.stress) +
        lastCheck.motivation) *
      2.5;
    parts++;
  }
  return { score: parts ? Math.round(total / parts) : 0, parts };
}

export function RecoveryView() {
  const { state } = useStore();
  const { score, parts } = readiness(state);
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fatigueOpen, setFatigueOpen] = useState(false);

  // Latest data
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const sore = MUSCLES.filter((m) => state.muscleFatigue[m] && state.muscleFatigue[m] !== "fresh");

  const rec = !parts
    ? "Add a check-in or sleep entry to get a recommendation."
    : score >= 75
      ? "Great recovery — train hard today."
      : score >= 60
        ? "Solid recovery — normal training day."
        : score >= 40
          ? "Reduce volume or intensity ~20%."
          : "Rest, mobility, or light cardio only.";

  const sleepGoal = state.profile.sleepGoalH ?? 8;

  return (
    <div className="pb-24" style={{ "--section": "var(--recovery)" } as React.CSSProperties}>
      <PageHeader title="Recovery" subtitle="Daily View" />
      <div className="px-5">
        {/* 1. Readiness Score hero card */}
        <div className="card-elev p-5 section-gradient ring-section mt-4 mb-4">
          <div className="flex items-center gap-4">
            <Ring value={score} max={100} size={96} label="ready" />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Today's readiness
              </p>
              <p className="text-3xl font-bold tabular-nums mt-1">{parts ? `${score}%` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">{rec}</p>
            </div>
          </div>
          {parts > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {lastSleep && (
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full bg-black/20 text-white/90">
                  Sleep
                </span>
              )}
              {sore.length > 0 && (
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full bg-black/20 text-white/90">
                  Soreness
                </span>
              )}
              {lastCheck && (
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full bg-black/20 text-white/90">
                  Stress
                </span>
              )}
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full bg-black/20 text-white/50 border border-dashed border-white/20">
                HRV (coming soon)
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full bg-black/20 text-white/50 border border-dashed border-white/20">
                Load (coming soon)
              </span>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <PrimaryButton className="flex-1" onClick={() => setCheckOpen(true)}>
              <Plus size={16} />
              Check-in
            </PrimaryButton>
            <GhostButton onClick={() => setSleepOpen(true)}>
              <Moon size={16} />
              Sleep
            </GhostButton>
          </div>
        </div>

        {/* 2. Sleep card */}
        <SectionHeader title="Sleep" />
        {lastSleep ? (
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium">{lastSleep.hours}h</p>
                <p className="text-xs text-muted-foreground">Duration (Goal {sleepGoal}h)</p>
              </div>
              <div>
                <p className="text-sm font-medium">{lastSleep.quality}/10</p>
                <p className="text-xs text-muted-foreground">Quality</p>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={<Moon size={22} />}
            title="No sleep data"
            description="Log your sleep to see insights here."
          />
        )}

        {/* 3. Soreness / Pain card */}
        <SectionHeader
          title="Soreness & Pain"
          action={
            <button onClick={() => setFatigueOpen(true)} className="text-xs text-muted-foreground">
              Update
            </button>
          }
        />
        {sore.length === 0 ? (
          <Card className="mb-4">
            <p className="text-sm text-muted-foreground">
              All muscles marked fresh. Tap Update if you feel sore.
            </p>
          </Card>
        ) : (
          <Card className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {sore.map((m) => (
                <span
                  key={m}
                  className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded-full text-white capitalize"
                  style={{ background: LEVEL_COLOR[state.muscleFatigue[m]!] }}
                >
                  {m} · {state.muscleFatigue[m]}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 4. Body Map preview */}
        <SectionHeader title="Body Map" />
        <div className="card-elev p-4 section-gradient ring-section mb-4">
          <div className="flex justify-center">
            <div className="aspect-[1/2] w-full max-w-[150px]">
              <BodyHeatmap
                values={muscleMap(state, "recovery")}
                mode="recovery"
                side="front"
                compact
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Front view. Tap to see detailed map in Deep Dive (coming soon).
          </p>
        </div>

        {/* 5. Stress / Mood card */}
        <SectionHeader title="Stress & Mood" />
        {lastCheck ? (
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium">
                  ⚡{lastCheck.energy} / 🔥{lastCheck.motivation}
                </p>
                <p className="text-xs text-muted-foreground">Energy / Motivation</p>
              </div>
              <div>
                <p className="text-sm font-medium">😌{10 - lastCheck.stress}/10</p>
                <p className="text-xs text-muted-foreground">Low Stress</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
              Logged {new Date(lastCheck.createdAt).toLocaleDateString()}
            </p>
          </Card>
        ) : (
          <EmptyState
            icon={<Heart size={22} />}
            title="No check-ins"
            description="Complete a daily check-in to see stress and mood."
          />
        )}

        {/* 6. Morning/Night form history preview */}
        <SectionHeader title="Routine Forms" />
        <Card className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            Morning Check-In and Night Review history will appear here once submitted.
          </p>
          <div className="flex gap-2">
            <span className="text-xs bg-[var(--surface-2)] px-2 py-1 rounded text-muted-foreground">
              Morning (due 5am-12pm)
            </span>
            <span className="text-xs bg-[var(--surface-2)] px-2 py-1 rounded text-muted-foreground">
              Night (due 7pm-2am)
            </span>
          </div>
        </Card>

        {/* 7. Wearable-derived stats */}
        <SectionHeader title="Wearable Stats" />
        <Card className="mb-4 opacity-70">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-medium">—</p>
              <p className="text-xs text-muted-foreground">HRV (ms)</p>
            </div>
            <div>
              <p className="text-sm font-medium">—</p>
              <p className="text-xs text-muted-foreground">Resting HR (bpm)</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
            Connect a wearable in FitCore Hub (coming soon) to sync data automatically.
          </p>
        </Card>

        <SupplementsTodayCard />

        <p className="text-[11px] text-muted-foreground text-center mt-6 mb-2">
          Note: Detailed subtabs (Overview, Readiness, Wearables, etc.) will be available in
          Recovery Deep Dive.
        </p>

        <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
        <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
        <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
      </div>
    </div>
  );
}

/* ===================== SHEETS ===================== */

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <Label>{label}</Label>
        <span className="text-sm tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--section)]"
      />
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
    set((s) => ({
      ...s,
      recoveryCheckIns: [
        ...s.recoveryCheckIns,
        {
          id: uid(),
          energy,
          soreness,
          stress,
          motivation,
          notes: notes || undefined,
          createdAt: Date.now(),
        },
      ],
    }));
    setNotes("");
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Daily check-in">
      <div className="space-y-4">
        <Slider label="Energy" value={energy} onChange={setEnergy} />
        <Slider label="Soreness" value={soreness} onChange={setSoreness} />
        <Slider label="Stress" value={stress} onChange={setStress} />
        <Slider label="Motivation" value={motivation} onChange={setMotivation} />
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <PrimaryButton className="w-full" onClick={submit}>
          Save check-in
        </PrimaryButton>
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
    const h = Number(hours);
    if (!h) return;
    const notes = [bed && `Bed ${bed}`, wake && `Wake ${wake}`].filter(Boolean).join(" • ");
    set((s) => ({
      ...s,
      sleepEntries: [
        ...s.sleepEntries,
        { id: uid(), hours: h, quality, notes: notes || undefined, createdAt: Date.now() },
      ],
    }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log sleep">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Hours</Label>
            <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <div className="flex justify-between">
              <Label>Quality</Label>
              <span className="text-xs tabular-nums">{quality}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-[var(--section)] mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bedtime</Label>
            <Input value={bed} onChange={(e) => setBed(e.target.value)} placeholder="11:30 PM" />
          </div>
          <div>
            <Label>Wake</Label>
            <Input value={wake} onChange={(e) => setWake(e.target.value)} placeholder="7:00 AM" />
          </div>
        </div>
        <PrimaryButton className="w-full" onClick={submit}>
          Save sleep
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}

function FatigueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  return (
    <BottomSheet open={open} onClose={onClose} title="Muscle fatigue" height="tall">
      <div className="space-y-3">
        {MUSCLES.map((m) => (
          <div key={m}>
            <p className="text-sm font-medium capitalize mb-2">{m}</p>
            <div className="flex gap-1.5">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() =>
                    set((s) => ({ ...s, muscleFatigue: { ...s.muscleFatigue, [m]: lvl } }))
                  }
                  className={`flex-1 px-2 py-2 rounded-lg text-xs capitalize border ${state.muscleFatigue[m] === lvl ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                  style={
                    state.muscleFatigue[m] === lvl ? { background: LEVEL_COLOR[lvl] } : undefined
                  }
                >
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
  const t = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const today = state.supplementLogs.filter((s) => s.createdAt >= t);
  const routine = state.userGoalsProfile.supplementRoutine ?? [];
  if (today.length === 0 && routine.length === 0) return null;
  const takenNames = today.map((s) => s.name.toLowerCase());
  const missing = routine.filter((r) => !takenNames.some((tn) => tn.includes(r.toLowerCase())));
  return (
    <>
      <SectionHeader title="Supplements today" />
      <Card className="space-y-2">
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None logged yet. Tell Jarvis "log creatine".
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {today.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>
                  ✓ {s.name}
                  {s.dose ? ` (${s.dose})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            From routine — still missing:{" "}
            <span className="text-foreground">{missing.join(", ")}</span>
          </p>
        )}
      </Card>
    </>
  );
}
