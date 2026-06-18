import { Check, X, Undo2 } from "lucide-react";
import type { ToolResult } from "@/lib/jarvis/tools";

interface MealData {
  id?: string;
  calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number;
  items?: { name: string; qty?: string; calories: number; protein: number; carbs: number; fat: number }[];
  confidence?: "high" | "medium" | "low";
  assumptions?: string[];
}

function isMealData(d: unknown): d is MealData {
  return !!d && typeof d === "object" && ("calories" in d || "items" in d);
}

export function ConfirmCard({ tool, result, onConfirm, onCancel, onUndo }:
  { tool: string; result: ToolResult; onConfirm: () => void; onCancel: () => void; onUndo?: () => void }) {
  const pending = result.needsConfirmation && result.ok;
  const done = !result.needsConfirmation && result.ok;
  const failed = !result.ok;
  const meal = (tool === "logMeal" || tool === "logUsualMeal") && isMealData(result.data) ? result.data : null;
  const confColor = meal?.confidence === "high" ? "var(--success, #10b981)" : meal?.confidence === "low" ? "var(--destructive, #ef4444)" : "var(--warning, #f59e0b)";

  return (
    <div className="max-w-[85%] w-full rounded-2xl border border-border bg-[var(--surface-2)] p-3 text-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">{tool}</span>
        {meal?.confidence && (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklab, ${confColor} 18%, transparent)`, color: confColor }}>
            {meal.confidence}
          </span>
        )}
        {done && <span className="text-[10px] font-semibold text-[color:var(--success,#10b981)] ml-auto">SAVED</span>}
        {failed && <span className="text-[10px] font-semibold text-destructive ml-auto">FAILED</span>}
        {pending && <span className="text-[10px] font-semibold text-[color:var(--warning,#f59e0b)] ml-auto">REVIEW</span>}
      </div>
      <div>{result.summary}{failed && result.error ? ` — ${result.error}` : ""}</div>

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
                  <span className="truncate">• {it.name}{it.qty ? ` (${it.qty})` : ""}</span>
                  <span className="shrink-0">{it.calories}k · {it.protein}p</span>
                </li>
              ))}
            </ul>
          )}
          {meal.assumptions && meal.assumptions.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Assumptions ({meal.assumptions.length})</summary>
              <ul className="mt-1 ml-3 list-disc">{meal.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {pending && (
        <div className="flex gap-2 pt-1">
          <button onClick={onConfirm} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: "var(--section)" }}>
            <Check size={14} /> Save
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-[var(--surface)] text-xs font-medium border border-border inline-flex items-center gap-1">
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

function Macro({ label, v, unit }: { label: string; v: number; unit?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold">{v}{unit ?? ""}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
