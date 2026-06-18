import { Check, X, Undo2 } from "lucide-react";
import type { ToolResult } from "@/lib/jarvis/tools";

export function ConfirmCard({ tool, result, onConfirm, onCancel, onUndo }:
  { tool: string; result: ToolResult; onConfirm: () => void; onCancel: () => void; onUndo?: () => void }) {
  const pending = result.needsConfirmation && result.ok;
  const done = !result.needsConfirmation && result.ok;
  const failed = !result.ok;
  return (
    <div className="max-w-[85%] w-full rounded-2xl border border-border bg-[var(--surface-2)] p-3 text-sm space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">{tool}</span>
        {done && <span className="text-[10px] font-semibold text-[color:var(--success,#10b981)] ml-auto">SAVED</span>}
        {failed && <span className="text-[10px] font-semibold text-destructive ml-auto">FAILED</span>}
        {pending && <span className="text-[10px] font-semibold text-[color:var(--warning,#f59e0b)] ml-auto">REVIEW</span>}
      </div>
      <div>{result.summary}{failed && result.error ? ` — ${result.error}` : ""}</div>
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