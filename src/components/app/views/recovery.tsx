import { useState } from "react";
import { Moon } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { FatigueLevel } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { Input, PrimaryButton, Textarea } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { RecoveryDailyPremiumView } from "@/components/app/views/recovery-daily-premium";
import {
  RecoveryDeepDivePremiumView,
  type RecoveryDeepDiveContext,
} from "@/components/app/views/recovery-deep-dive-premium";

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

export function RecoveryView({
  layoutMode = "daily",
  onLayoutModeChange,
}: {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}) {
  const { set } = useStore();
  const [checkOpen, setCheckOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fatigueOpen, setFatigueOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "sleep" | "check-in";
    id: string;
  } | null>(null);
  const [deepDiveContext, setDeepDiveContext] = useState<RecoveryDeepDiveContext>({
    range: "14d",
    sleepMetric: "hours",
    checkMetric: "energy",
  });

  return (
    <div className="pb-24">
      {layoutMode === "daily" ? (
        <RecoveryDailyPremiumView
          onLogCheckIn={() => setCheckOpen(true)}
          onLogSleep={() => setSleepOpen(true)}
          onUpdateFatigue={() => setFatigueOpen(true)}
          onDeleteCheckIn={(id) => setDeleteTarget({ type: "check-in", id })}
          onDeleteSleep={(id) => setDeleteTarget({ type: "sleep", id })}
          onOpenDeepDive={() => onLayoutModeChange?.("deepDive")}
        />
      ) : (
        <RecoveryDeepDivePremiumView
          context={deepDiveContext}
          onContextChange={setDeepDiveContext}
          onBack={() => onLayoutModeChange?.("daily")}
          onLogSleep={() => setSleepOpen(true)}
          onLogCheckIn={() => setCheckOpen(true)}
          onUpdateFatigue={() => setFatigueOpen(true)}
        />
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

function Slider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
        onChange={(event) => onChange(Number(event.target.value))}
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
    set((state) => ({
      ...state,
      recoveryCheckIns: [
        ...state.recoveryCheckIns,
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
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Notes
          </label>
          <Textarea
            id="recovery-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0 || value > 24) {
      setError("Enter sleep hours greater than 0 and no more than 24.");
      return;
    }
    setError("");
    const notes = [bed && `Bed ${bed}`, wake && `Wake ${wake}`].filter(Boolean).join(" · ");
    set((state) => ({
      ...state,
      sleepEntries: [
        ...state.sleepEntries,
        {
          id: uid(),
          hours: value,
          quality,
          notes: notes || undefined,
          createdAt: Date.now(),
        },
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
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Hours
            </label>
            <Input
              id="sleep-hours"
              inputMode="decimal"
              value={hours}
              onChange={(event) => {
                setHours(event.target.value);
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
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
              onChange={(event) => setQuality(Number(event.target.value))}
              className="mt-1 w-full accent-[var(--section)]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="sleep-bedtime"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Bedtime
            </label>
            <Input
              id="sleep-bedtime"
              value={bed}
              onChange={(event) => setBed(event.target.value)}
              placeholder="11:30 PM"
            />
          </div>
          <div>
            <label
              htmlFor="sleep-wake"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Wake
            </label>
            <Input
              id="sleep-wake"
              value={wake}
              onChange={(event) => setWake(event.target.value)}
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
          <Moon size={16} aria-hidden="true" /> Save sleep
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
        {MUSCLES.map((muscle) => (
          <div key={muscle}>
            <p className="mb-2 text-sm font-medium capitalize">{muscle}</p>
            <div className="flex gap-1.5">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={state.muscleFatigue[muscle] === level}
                  aria-label={`${muscle}: ${level === "very" ? "very fatigued" : level}`}
                  onClick={() =>
                    set((current) => ({
                      ...current,
                      muscleFatigue: { ...current.muscleFatigue, [muscle]: level },
                    }))
                  }
                  className={`min-h-11 flex-1 rounded-lg border px-2 py-2 text-xs capitalize ${state.muscleFatigue[muscle] === level ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                  style={
                    state.muscleFatigue[muscle] === level
                      ? { background: LEVEL_COLOR[level] }
                      : undefined
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
