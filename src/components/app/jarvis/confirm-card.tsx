import { useState } from "react";
import { Check, X, Undo2 } from "lucide-react";
import type { ToolResult } from "@/lib/jarvis/tools";

interface MealData {
  id?: string;
  calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number;
  items?: { name: string; qty?: string; calories: number; protein: number; carbs: number; fat: number }[];
  confidence?: "high" | "medium" | "low";
  assumptions?: string[];
}

interface WorkoutData {
  workoutName?: string;
  workoutType?: string;
  startedAt?: number;
  endedAt?: number;
  durationMin?: number;
  exercises?: { name?: string; exerciseId?: string; sets?: { weight?: number; reps?: number; modifier?: string }[] }[];
  notes?: string;
  confidence?: "high" | "medium" | "low";
}

interface CardioData {
  type?: string;
  minutes?: number;
  distanceMi?: number;
  calories?: number;
  confidence?: "high" | "medium" | "low";
}

function isMealData(d: unknown): d is MealData {
  return !!d && typeof d === "object" && ("calories" in d || "items" in d);
}

function isWorkoutData(d: unknown): d is WorkoutData {
  return !!d && typeof d === "object" && "exercises" in d;
}

function isCardioData(d: unknown): d is CardioData {
  return !!d && typeof d === "object" && ("minutes" in d || "distanceMi" in d) && !("exercises" in d);
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    logBodyWeight: "Bodyweight",
    logSupplement: "Supplement",
    logDailyCheckIn: "Daily check-in",
    logMeal: "Meal",
    logUsualMeal: "Usual meal",
    saveUsualMeal: "Usual meal",
    createWorkoutDraft: "Workout",
    logWorkout: "Workout",
    logCardio: "Cardio",
    updateActiveWorkout: "Active workout",
    finishActiveWorkout: "Workout summary",
    saveWorkoutTemplate: "Workout template",
  };
  return labels[tool] ?? "Jarvis action";
}

export function ConfirmCard({ tool, result, onConfirm, onCancel, onUndo }:
  { tool: string; result: ToolResult; onConfirm: () => void; onCancel: () => void; onUndo?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const pending = result.needsConfirmation && result.ok;
  const done = !result.needsConfirmation && result.ok;
  const failed = !result.ok;
  const meal = (tool === "logMeal" || tool === "logUsualMeal") && isMealData(result.data) ? result.data : null;
  const workout = (tool === "createWorkoutDraft" || tool === "logWorkout") && isWorkoutData(result.data) ? result.data : null;
  const cardio = tool === "logCardio" && isCardioData(result.data) ? result.data : null;
  const confidence = meal?.confidence ?? workout?.confidence ?? cardio?.confidence;
  const confColor = confidence === "high" ? "var(--success, #10b981)" : confidence === "low" ? "var(--destructive, #ef4444)" : "var(--warning, #f59e0b)";
  const saveLabel = tool === "logWorkout" || tool === "createWorkoutDraft" ? "Log workout" : tool === "logCardio" ? "Log cardio" : "Save";

  const confirmOnce = () => {
    if (submitting || !pending) return;
    setSubmitting(true);
    onConfirm();
  };

  return (
    <div className="max-w-[85%] w-full rounded-2xl border border-border bg-[var(--surface-2)] p-3 text-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">{toolLabel(tool)}</span>
        {confidence && (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklab, ${confColor} 18%, transparent)`, color: confColor }}>
            {confidence}
          </span>
        )}
        {done && <span className="text-[10px] font-semibold text-[color:var(--success,#10b981)] ml-auto">SAVED</span>}
        {failed && <span className="text-[10px] font-semibold text-destructive ml-auto">FAILED</span>}
        {pending && <span className="text-[10px] font-semibold text-[color:var(--warning,#f59e0b)] ml-auto">REVIEW</span>}
      </div>
      <div>{result.summary}{failed && result.error ? ` - ${result.error}` : ""}</div>

      {meal && (meal.calories ?? 0) > 0 && (
        <div className="rounded-xl bg-[var(--surface)] p-2 space-y-1.5">
          <div className="grid grid-cols-4 gap-1 text-center">
            <Macro label="kcal" v={meal.calories ?? 0} />
            <Macro label="P" v={meal.protein ?? 0} unit="g" />
            <Macro label="C" v={meal.carbs ?? 0} unit="g" />
            <Macro label="F" v={meal.fat ?? 0} unit="g" />
          </div>
          {meal.items && meal.items.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t border-border">
              {meal.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">- {it.name}{it.qty ? ` (${it.qty})` : ""}</span>
                  <span className="shrink-0">{it.calories}k / {it.protein}p</span>
                </li>
              ))}
            </ul>
          )}
          {meal.assumptions && meal.assumptions.length > 0 && <Assumptions items={meal.assumptions} />}
        </div>
      )}

      {workout && (
        <div className="rounded-xl bg-[var(--surface)] p-2 space-y-1.5">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>{workout.workoutType ?? workout.workoutName ?? "Workout"}</span>
            <span>{workout.durationMin ? `${workout.durationMin} min` : workout.startedAt && workout.endedAt ? `${Math.round((workout.endedAt - workout.startedAt) / 60000)} min` : "Draft"}</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t border-border">
            {(workout.exercises ?? []).map((ex, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{ex.name ?? ex.exerciseId}</span>
                <span className="shrink-0">{(ex.sets ?? []).map(s => `${s.weight ? `${s.weight}x` : ""}${s.reps ?? "?"}`).join(", ")}</span>
              </li>
            ))}
          </ul>
          {workout.notes && <p className="text-xs text-muted-foreground border-t border-border pt-1">{workout.notes}</p>}
        </div>
      )}

      {cardio && (
        <div className="rounded-xl bg-[var(--surface)] p-2 grid grid-cols-3 gap-1 text-center">
          <Macro label={cardio.type ?? "cardio"} v={cardio.minutes ?? 0} unit="m" />
          <Macro label="mi" v={cardio.distanceMi ?? 0} />
          <Macro label="kcal" v={cardio.calories ?? 0} />
        </div>
      )}

      {pending && (
        <div className="flex gap-2 pt-1">
          <button disabled={submitting} onClick={confirmOnce} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-60" style={{ background: "var(--section)" }}>
            <Check size={14} /> {submitting ? "Saving..." : saveLabel}
          </button>
          <button disabled={submitting} onClick={onCancel} className="px-3 py-2 rounded-xl bg-[var(--surface)] text-xs font-medium border border-border inline-flex items-center gap-1 disabled:opacity-60">
            <X size={14} /> Cancel
          </button>
        </div>
      )}
      {done && onUndo && (
        <button onClick={onUndo} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <Undo2 size={12} /> Undo
        </button>
      )}
    </div>
  );
}

function Assumptions({ items }: { items: string[] }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Assumptions ({items.length})</summary>
      <ul className="mt-1 ml-3 list-disc">{items.map((a, i) => <li key={i}>{a}</li>)}</ul>
    </details>
  );
}

function Macro({ label, v, unit }: { label: string; v: number; unit?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold">{v}{unit ?? ""}</div>
      <div className="text-[10px] text-muted-foreground uppercase truncate">{label}</div>
    </div>
  );
}
