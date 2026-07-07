import { useMemo, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, ImagePlus, Check, AlertCircle } from "lucide-react";
import { BottomSheet } from "../sheet";
import { useStore, uid } from "@/lib/store";
import { useServerFn } from "@tanstack/react-start";
import { estimateMealMacros } from "@/lib/ai.functions";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

/* ============================== LOG MEAL ============================== */
export function LogMealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const estimate = useServerFn(estimateMealMacros);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("dinner");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");

  const [photo, setPhoto] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<"low" | "medium" | "high" | null>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setType("dinner");
    setCal("");
    setP("");
    setC("");
    setF("");
    setPhoto(null);
    setAiLoading(false);
    setAiError(null);
    setAiConfidence(null);
    setAiNotes(null);
    setSaveError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File) => {
    if (!file) return;
    setAiError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setAiLoading(true);
      try {
        const res = await estimate({ data: { imageDataUrl: dataUrl } });
        if (res.ok) {
          setName(res.estimate.name || "Meal");
          setCal(String(res.estimate.calories));
          setP(String(res.estimate.protein));
          setC(String(res.estimate.carbs));
          setF(String(res.estimate.fat));
          setAiConfidence(res.estimate.confidence);
          setAiNotes(res.estimate.notes || null);
        } else {
          setAiError(res.error);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Estimate failed");
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const canSave = name.trim() && Number(cal) > 0;
  const save = () => {
    if (!canSave) return;
    try {
      set((s) => ({
        ...s,
        mealEntries: [
          ...s.mealEntries,
          {
            id: uid(),
            name: name.trim(),
            type,
            calories: Number(cal) || 0,
            protein: Number(p) || 0,
            carbs: Number(c) || 0,
            fat: Number(f) || 0,
            createdAt: Date.now(),
          },
        ],
      }));
      close();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save meal");
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title="Log Meal" height="tall">
      <div className="space-y-4">
        {/* AI camera */}
        <div className="tile p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--section)]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                AI Photo Estimate
              </span>
            </div>
            {photo && (
              <button
                onClick={() => {
                  setPhoto(null);
                  setAiNotes(null);
                  setAiConfidence(null);
                }}
                className="text-[10px] text-white/40 font-bold uppercase"
              >
                Clear
              </button>
            )}
          </div>

          {!photo ? (
            <>
              <p className="text-xs text-white/50 mt-2">
                Snap or upload a meal photo — AI estimates calories & macros for review.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="press h-12 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold"
                  style={{ background: "var(--section)" }}
                >
                  <Camera size={16} /> Take Photo
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="press h-12 rounded-xl flex items-center justify-center gap-2 text-white/80 text-sm font-bold bg-white/5 border border-white/10"
                >
                  <ImagePlus size={16} /> Upload
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={photo} alt="Meal preview" className="w-full max-h-48 object-cover" />
                {aiLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white text-sm font-bold">
                      <Loader2 size={16} className="animate-spin" /> Estimating macros…
                    </div>
                  </div>
                )}
              </div>
              {!aiLoading && aiConfidence && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className="px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                    style={{ background: "var(--section-soft)", color: "var(--section)" }}
                  >
                    {aiConfidence} confidence
                  </span>
                  <span className="text-white/50">Review and edit below before saving.</span>
                </div>
              )}
              {aiNotes && <p className="text-[11px] text-white/40 italic">{aiNotes}</p>}
            </div>
          )}

          {aiError && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div className="space-y-3">
          <Field label="Meal name">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveError(null);
              }}
              placeholder="e.g. Chicken & rice"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)]"
            />
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setSaveError(null);
              }}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)] capitalize"
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m} className="bg-black">
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-4 gap-2">
            <NumField
              label="Cal"
              value={cal}
              onChange={(v) => {
                setCal(v);
                setSaveError(null);
              }}
            />
            <NumField
              label="P (g)"
              value={p}
              onChange={(v) => {
                setP(v);
                setSaveError(null);
              }}
            />
            <NumField
              label="C (g)"
              value={c}
              onChange={(v) => {
                setC(v);
                setSaveError(null);
              }}
            />
            <NumField
              label="F (g)"
              value={f}
              onChange={(v) => {
                setF(v);
                setSaveError(null);
              }}
            />
          </div>
        </div>

        {saveError && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={close}
            className="flex-1 h-12 rounded-xl border border-white/15 bg-white/5 font-bold text-white/80"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="flex-1 h-12 rounded-xl font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--section)" }}
          >
            <Check size={16} /> Save meal
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ============================== CHECK-IN ============================== */
export function CheckInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [motivation, setMotivation] = useState(8);
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQ, setSleepQ] = useState(7);
  const [notes, setNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = () => {
    setEnergy(7);
    setSoreness(3);
    setStress(3);
    setMotivation(8);
    setSleepHours("");
    setSleepQ(7);
    setNotes("");
    setSaveError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const readiness = Math.round(
    ((energy + motivation + (10 - soreness) + (10 - stress)) / 40) * 100,
  );

  const save = () => {
    try {
      const now = Date.now();
      set((s) => {
        const next = {
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
              createdAt: now,
            },
          ],
        };
        const h = Number(sleepHours);
        if (h > 0) {
          next.sleepEntries = [
            ...s.sleepEntries,
            { id: uid(), hours: h, quality: sleepQ, createdAt: now },
          ];
        }
        return next;
      });
      close();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save check-in");
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title="Daily Check-In" height="tall">
      <div className="space-y-4">
        <div className="tile p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              Predicted Readiness
            </div>
            <div className="font-display text-4xl mt-1">
              {readiness}
              <span className="text-xs text-white/40 ml-1">%</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-white/60 max-w-[180px]">
            {readiness >= 75
              ? "Prime day — push hard."
              : readiness >= 55
                ? "Solid — moderate intensity."
                : "Take it easy or recover."}
          </div>
        </div>

        <Slider label="Energy" value={energy} onChange={(v) => { setEnergy(v); setSaveError(null); }} />
        <Slider label="Soreness / Fatigue" value={soreness} onChange={(v) => { setSoreness(v); setSaveError(null); }} invert />
        <Slider label="Mood / Stress" value={stress} onChange={(v) => { setStress(v); setSaveError(null); }} invert />
        <Slider label="Motivation" value={motivation} onChange={(v) => { setMotivation(v); setSaveError(null); }} />

        <div className="tile p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            Last night's sleep (optional)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={sleepHours}
              onChange={(e) => { setSleepHours(e.target.value); setSaveError(null); }}
              placeholder="7.5 hrs"
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)]"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 font-bold uppercase">
                Quality {sleepQ}/10
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={sleepQ}
                onChange={(e) => { setSleepQ(Number(e.target.value)); setSaveError(null); }}
                className="accent-[var(--section)]"
              />
            </div>
          </div>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaveError(null); }}
            rows={2}
            placeholder="How are you feeling today?"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)] resize-none"
          />
        </Field>

        {saveError && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={close}
            className="flex-1 h-12 rounded-xl border border-white/15 bg-white/5 font-bold text-white/80"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--section)" }}
          >
            <Check size={16} /> Save check-in
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ============================== WEIGH IN ============================== */
export function WeighInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [w, setW] = useState(String(state.profile.bodyweightLb));
  const [notes, setNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = () => {
    setW(String(state.profile.bodyweightLb));
    setNotes("");
    setSaveError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const recent = useMemo(() => {
    return [...state.bodyweightEntries]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-14)
      .map((e) => ({
        d: new Date(e.createdAt).toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        w: e.weightLb,
      }));
  }, [state.bodyweightEntries]);

  const last = state.bodyweightEntries[state.bodyweightEntries.length - 1];
  const delta = last ? Number(w) - last.weightLb : 0;

  const save = () => {
    if (w.trim() === "") {
      setSaveError("Weight cannot be blank");
      return;
    }
    const wt = Number(w);
    if (isNaN(wt) || wt <= 0) {
      setSaveError("Weight must be a positive number");
      return;
    }
    if (wt > 1000) {
      setSaveError("Weight must be less than 1000");
      return;
    }

    try {
      set((s) => ({
        ...s,
        bodyweightEntries: [
          ...s.bodyweightEntries,
          { id: uid(), weightLb: wt, notes: notes || undefined, createdAt: Date.now() },
        ],
        profile: { ...s.profile, bodyweightLb: wt },
        goals: s.goals.map((g) => (g.type === "bodyweight" ? { ...g, current: wt } : g)),
      }));
      close();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save weigh-in");
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title="Weigh In">
      <div className="space-y-4">
        <div className="tile p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            Current weight
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              inputMode="decimal"
              value={w}
              onChange={(e) => {
                setW(e.target.value);
                setSaveError(null);
              }}
              className="font-display text-5xl bg-transparent outline-none w-32 tabular-nums text-white border-b border-white/10 focus:border-[var(--section)]"
            />
            <span className="text-sm text-white/40 font-bold uppercase">lb</span>
            {last && (
              <span
                className={`ml-auto text-xs font-bold tabular-nums ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-white/40"}`}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} vs last
              </span>
            )}
          </div>
          <div className="text-[10px] text-white/40 mt-2">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}{" "}
            · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>

        {recent.length >= 2 && (
          <div className="tile p-3 h-28">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">
              Recent trend
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={recent}>
                <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                <Line
                  type="monotone"
                  dataKey="w"
                  stroke="var(--section)"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: "var(--section)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaveError(null);
            }}
            placeholder="Morning, post-bathroom…"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)]"
          />
        </Field>

        {saveError && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={close}
            className="flex-1 h-12 rounded-xl border border-white/15 bg-white/5 font-bold text-white/80"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--section)" }}
          >
            <Check size={16} /> Save weigh-in
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ============================== Helpers ============================== */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 block text-center">
        {label}
      </label>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[var(--section)] text-center tabular-nums font-bold"
      />
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  invert,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  invert?: boolean;
}) {
  const display = invert ? `${value}/10` : `${value}/10`;
  return (
    <div className="tile p-4">
      <div className="flex justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums text-white">{display}</span>
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
