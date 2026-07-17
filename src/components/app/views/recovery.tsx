import { useState, useMemo } from "react";
import { ArrowLeft, Heart, Activity, Moon } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { muscleMap } from "@/lib/analytics";
import { BodyHeatmap } from "@/components/app/body-heatmap";
import {
  Card,
  StatCard,
  PageHeader,
  PrimaryButton,
  EmptyState,
  Input,
  Label,
  Ring,
  Textarea,
  SubTabs,
  SectionHeader,
  Chip,
  PlannedFeatureCard,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import {
  calculateRecoveryDailyReadiness,
  RecoveryDailyPremiumView,
} from "@/components/app/views/recovery-daily-premium";

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

type Tab = "health" | "sleep" | "body" | "insights";
const TABS: { id: Tab; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "sleep", label: "Sleep" },
  { id: "body", label: "Body" },
  { id: "insights", label: "Insights" },
];

export function RecoveryView({
  layoutMode = "daily",
  onLayoutModeChange,
}: {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}) {
  const [tab, setTab] = useState<Tab>("health");
  const { set } = useStore();
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fatigueOpen, setFatigueOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "sleep" | "check-in";
    id: string;
  } | null>(null);
  const isDeepDive = layoutMode === "deepDive";

  return (
    <div className="pb-24">
      {!isDeepDive ? (
        <RecoveryDailyPremiumView
          onLogCheckIn={() => setCheckOpen(true)}
          onLogSleep={() => setSleepOpen(true)}
          onUpdateFatigue={() => setFatigueOpen(true)}
          onDeleteCheckIn={(id) => setDeleteTarget({ type: "check-in", id })}
          onDeleteSleep={(id) => setDeleteTarget({ type: "sleep", id })}
          onOpenDeepDive={() => onLayoutModeChange?.("deepDive")}
        />
      ) : (
        <>
          <PageHeader title="Recovery" subtitle="Recovery history - Deep Dive" />
          <div className="px-5 pb-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"
              onClick={() => onLayoutModeChange?.("daily")}
            >
              <ArrowLeft size={15} aria-hidden="true" /> Daily View
            </button>
          </div>
          <SubTabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === "health" && <HealthTab />}
          {tab === "sleep" && <SleepDeepDiveTab />}
          {tab === "body" && <BodyTab />}
          {tab === "insights" && <InsightsTab />}
        </>
      )}

      <CheckInSheet open={checkOpen} onClose={() => setCheckOpen(false)} />
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
      <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          set((current) =>
            deleteTarget.type === "sleep"
              ? {
                  ...current,
                  sleepEntries: current.sleepEntries.filter(
                    (entry) => entry.id !== deleteTarget.id,
                  ),
                }
              : {
                  ...current,
                  recoveryCheckIns: current.recoveryCheckIns.filter(
                    (entry) => entry.id !== deleteTarget.id,
                  ),
                },
          );
          setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.type ?? "entry"}?`}
        message="This removes the saved recovery record and recalculates readiness. This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ===================== DEEP DIVE TABS ===================== */

function HealthTab() {
  const { state } = useStore();
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  const readiness = calculateRecoveryDailyReadiness(lastSleep, lastCheck);
  const score = readiness.score ?? 0;
  const parts = readiness.parts;

  return (
    <div className="px-5 space-y-4">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-center gap-4">
          <Ring value={score} max={100} size={96} label="ready" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Today's readiness
            </p>
            <p className="text-3xl font-bold tabular-nums mt-1">{parts ? `${score}%` : "—"}</p>
          </div>
        </div>
      </div>

      {lastCheck && (
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Last check-in
          </p>
          <div className="flex justify-between text-sm">
            <p className="text-muted-foreground">
              {new Date(lastCheck.createdAt).toLocaleDateString()}
            </p>
            <p>
              ⚡{lastCheck.energy} • 💪{10 - lastCheck.soreness} • 😌{10 - lastCheck.stress} • 🔥
              {lastCheck.motivation}
            </p>
          </div>
        </Card>
      )}

      <PlannedFeatureCard
        title="Apple Watch / Whoop"
        status="Planned"
        description="Connect your wearable to sync continuous health and recovery signals."
      />

      <SectionHeader title="Health Signals" />
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-sm font-medium">HRV</p>
          <p className="text-xs text-muted-foreground mt-1">Needs wearable sync</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Resting HR</p>
          <p className="text-xs text-muted-foreground mt-1">Needs wearable sync</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Respiratory Rate</p>
          <p className="text-xs text-muted-foreground mt-1">Planned</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Temperature</p>
          <p className="text-xs text-muted-foreground mt-1">Planned</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">SpO2</p>
          <p className="text-xs text-muted-foreground mt-1">Planned</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Stress</p>
          <p className="text-xs text-muted-foreground mt-1">Planned</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Steps</p>
          <p className="text-xs text-muted-foreground mt-1">Needs wearable sync</p>
        </Card>
        <Card className="p-3">
          <p className="text-sm font-medium">Calories Burned</p>
          <p className="text-xs text-muted-foreground mt-1">Needs wearable sync</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-sm font-medium">Body Age</p>
        <p className="text-xs text-muted-foreground mt-1">Planned</p>
      </Card>

      <SectionHeader title="Strain Tracking" />
      <div className="grid grid-cols-2 gap-3">
        <PlannedFeatureCard
          title="Muscular Strain"
          status="Planned"
          description="Muscle and body load relationships."
        />
        <PlannedFeatureCard
          title="Cardio Strain"
          status="Planned"
          description="Heart-rate and system load."
        />
      </div>
    </div>
  );
}

/* ===================== MUSCLE / BODY STATUS ===================== */

function BodyTab() {
  const { state, set } = useStore();
  const [side, setSide] = useState<"front" | "back">("front");
  const [fatigueOpen, setFatigueOpen] = useState(false);
  const values = useMemo(() => muscleMap(state, "recovery"), [state]);
  const sore = MUSCLES.filter((m) => state.muscleFatigue[m] && state.muscleFatigue[m] !== "fresh");

  const days = 7;
  const cutoff = Date.now() - days * 86400000;
  const checks = state.recoveryCheckIns.filter((c) => c.createdAt > cutoff);

  return (
    <div className="px-5 space-y-4">
      <div className="card-elev p-4 section-gradient ring-section">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Body heatmap</p>
          <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full transition ${side === s ? "bg-white/15 text-white" : "text-white/50"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="aspect-[1/2] w-full max-w-[200px]">
            <BodyHeatmap values={values} mode="recovery" side={side} compact />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Green = recovered. Red = recent load.
        </p>
      </div>

      <SectionHeader
        title="Soreness check-in"
        action={
          <button onClick={() => setFatigueOpen(true)} className="text-xs text-muted-foreground">
            Update all
          </button>
        }
      />
      {sore.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            All muscles marked fresh. Tap Update if you feel sore.
          </p>
        </Card>
      ) : (
        <Card>
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

      <SectionHeader title="Quick tap" />
      <div className="grid grid-cols-2 gap-2">
        {MUSCLES.map((m) => {
          const lvl = state.muscleFatigue[m] ?? "fresh";
          const next: FatigueLevel =
            lvl === "fresh"
              ? "moderate"
              : lvl === "moderate"
                ? "fatigued"
                : lvl === "fatigued"
                  ? "very"
                  : "fresh";
          return (
            <button
              key={m}
              onClick={() =>
                set((s) => ({ ...s, muscleFatigue: { ...s.muscleFatigue, [m]: next } }))
              }
              className="card-elev p-3 flex items-center justify-between text-left active:scale-[0.98]"
            >
              <span className="text-sm font-medium capitalize">{m}</span>
              <span
                className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ background: LEVEL_COLOR[lvl] }}
              >
                {lvl}
              </span>
            </button>
          );
        })}
      </div>

      <SectionHeader title="Check-in History" />
      {checks.length === 0 ? (
        <EmptyState
          icon={<Heart size={22} />}
          title="No check-ins"
          description="Log daily check-ins to see your history."
        />
      ) : (
        <div className="space-y-2">
          {[...checks]
            .reverse()
            .slice(0, 10)
            .map((c) => {
              const score = Math.round(
                (c.energy + (10 - c.soreness) + (10 - c.stress) + c.motivation) * 2.5,
              );
              return (
                <Card key={c.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ⚡{c.energy} • 💪{10 - c.soreness} • 😌{10 - c.stress} • 🔥{c.motivation}
                      </p>
                    </div>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: "var(--section)" }}
                    >
                      {score}
                    </p>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      <SectionHeader title="Body Status Tracking" />
      <div className="grid grid-cols-2 gap-3 pb-2">
        <PlannedFeatureCard
          title="Pain Flags"
          status="Planned"
          description="Injury red-flag checklist."
        />
        <PlannedFeatureCard
          title="Fatigue Trend"
          status="Planned"
          description="Fatigue vs consistency."
        />
        <PlannedFeatureCard
          title="Mobility"
          status="Planned"
          description="Mobility tracking over time."
        />
        <PlannedFeatureCard
          title="Injury Notes"
          status="Planned"
          description="Active injury logging."
        />
      </div>
      <PlannedFeatureCard
        title="Soreness vs Volume"
        status="Planned"
        description="Compare muscle soreness to training volume load."
      />

      <FatigueSheet open={fatigueOpen} onClose={() => setFatigueOpen(false)} />
    </div>
  );
}

function SleepDeepDiveTab() {
  const { state } = useStore();
  const [sleepOpen, setSleepOpen] = useState(false);

  const days = 7;
  const cutoff = Date.now() - days * 86400000;
  const sleeps = state.sleepEntries.filter((s) => s.createdAt > cutoff);
  const sleepAvg = sleeps.length
    ? (sleeps.reduce((a, s) => a + s.hours, 0) / sleeps.length).toFixed(1)
    : "—";
  const qAvg = sleeps.length
    ? (sleeps.reduce((a, s) => a + s.quality, 0) / sleeps.length).toFixed(1)
    : "—";
  const consistency = Math.round((sleeps.length / days) * 100);

  return (
    <div className="px-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sleep avg" value={`${sleepAvg}h`} accent />
        <StatCard label="Quality" value={`${qAvg}`} sub="/10" />
        <StatCard label="Logged" value={`${consistency}%`} sub="of days" />
      </div>

      <SectionHeader title="Sleep trend" />
      <Card>
        {sleeps.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Log at least 2 nights to see trends.
          </p>
        ) : (
          <Sparkline
            points={[...sleeps].sort((a, b) => a.createdAt - b.createdAt).map((s) => s.hours)}
            unit="h"
          />
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <PlannedFeatureCard
          title="Sleep Stages"
          status="Planned"
          description="Needs wearable sync."
        />
        <PlannedFeatureCard title="Sleep Debt" status="Planned" description="Needs more data." />
        <PlannedFeatureCard
          title="Consistency"
          status="Planned"
          description="Bedtime/wake time consistency."
        />
        <PlannedFeatureCard title="Wake Time" status="Planned" description="Average wake time." />
      </div>

      <PrimaryButton className="w-full" onClick={() => setSleepOpen(true)}>
        <Moon size={16} />
        Log sleep
      </PrimaryButton>
      <SleepSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />
    </div>
  );
}

function InsightsTab() {
  return (
    <div className="px-5 space-y-4">
      <SupplementsTodayCard />

      <SectionHeader title="Deep Dive Insights" />
      <PlannedFeatureCard
        title="Recovery AI Coach"
        status="Planned"
        description="Personalized recovery suggestions and pattern detection."
      />
      <div className="grid grid-cols-2 gap-3">
        <PlannedFeatureCard
          title="HRV vs Performance"
          status="Planned"
          description="Correlation tracking."
        />
        <PlannedFeatureCard
          title="Strain vs Recovery"
          status="Planned"
          description="Load impact insights."
        />
        <PlannedFeatureCard
          title="Sleep vs Readiness"
          status="Planned"
          description="Correlation tracking."
        />
        <PlannedFeatureCard
          title="Stress vs Sleep"
          status="Planned"
          description="Correlation tracking."
        />
      </div>

      <SectionHeader title="Education & Safety" />
      <PlannedFeatureCard
        title="Metric Explanations"
        status="Planned"
        description="Learn what HRV, strain, and sleep debt mean for your body."
      />
      <PlannedFeatureCard
        title="Safety & Illness Alerts"
        status="Presentational only"
        description="Future abnormal trend warnings (e.g. elevated RHR, temperature drop) will live here. FitCore does not diagnose conditions or replace medical care."
      />
    </div>
  );
}

function Sparkline({ points, unit }: { points: number[]; unit: string }) {
  const w = 320,
    h = 80,
    pad = 8;
  const min = Math.min(...points),
    max = Math.max(...points);
  const range = Math.max(0.1, max - min);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const path = points
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"} ${pad + i * step} ${h - pad - ((v - min) / range) * (h - pad * 2)}`,
    )
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <path
          d={path}
          fill="none"
          stroke="var(--section)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums mt-1">
        <span>
          {points[0]}
          {unit}
        </span>
        <span>
          {points[points.length - 1]}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ===================== SHEETS ===================== */

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label
          htmlFor={id}
          className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
        >
          {label}
        </label>
        <span className="text-sm tabular-nums">{value}/10</span>
      </div>
      <input
        id={id}
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
        <Slider id="recovery-energy" label="Energy" value={energy} onChange={setEnergy} />
        <Slider id="recovery-soreness" label="Soreness" value={soreness} onChange={setSoreness} />
        <Slider id="recovery-stress" label="Stress" value={stress} onChange={setStress} />
        <Slider
          id="recovery-motivation"
          label="Motivation"
          value={motivation}
          onChange={setMotivation}
        />
        <div>
          <label
            htmlFor="recovery-notes"
            className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
          >
            Notes
          </label>
          <Textarea
            id="recovery-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
  const [error, setError] = useState("");
  const submit = () => {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      setError("Enter sleep hours greater than 0 and no more than 24.");
      return;
    }
    setError("");
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
            <label
              htmlFor="sleep-hours"
              className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              Hours
            </label>
            <Input
              id="sleep-hours"
              inputMode="decimal"
              value={hours}
              onChange={(e) => {
                setHours(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "sleep-hours-error" : undefined}
            />
          </div>
          <div>
            <div className="flex justify-between">
              <label
                htmlFor="sleep-quality"
                className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
              >
                Quality
              </label>
              <span className="text-xs tabular-nums">{quality}/10</span>
            </div>
            <input
              id="sleep-quality"
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
            <label
              htmlFor="sleep-bedtime"
              className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              Bedtime
            </label>
            <Input
              id="sleep-bedtime"
              value={bed}
              onChange={(e) => setBed(e.target.value)}
              placeholder="11:30 PM"
            />
          </div>
          <div>
            <label
              htmlFor="sleep-wake"
              className="text-xs uppercase tracking-wider text-muted-foreground font-semibold"
            >
              Wake
            </label>
            <Input
              id="sleep-wake"
              value={wake}
              onChange={(e) => setWake(e.target.value)}
              placeholder="7:00 AM"
            />
          </div>
        </div>
        {error && (
          <p id="sleep-hours-error" role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
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
                  type="button"
                  aria-pressed={state.muscleFatigue[m] === lvl}
                  aria-label={`${m}: ${lvl === "very" ? "very fatigued" : lvl}`}
                  onClick={() =>
                    set((s) => ({ ...s, muscleFatigue: { ...s.muscleFatigue, [m]: lvl } }))
                  }
                  className={`min-h-11 flex-1 px-2 py-2 rounded-lg text-xs capitalize border ${state.muscleFatigue[m] === lvl ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
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
