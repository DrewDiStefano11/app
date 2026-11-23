import { useRef, useState } from "react";
import type { JarvisBatchReview } from "@/lib/jarvis/mixed-commands";
import type { ToolResult } from "@/lib/jarvis/tools";

export function BatchReview({
  review,
  outcome,
  cancelled,
  onSave,
  onCancel,
  onUndo,
}: {
  review: JarvisBatchReview;
  outcome?: ToolResult;
  cancelled?: boolean;
  onSave: (selected: number[]) => ToolResult;
  onCancel: () => void;
  onUndo: (auditId: string) => void;
}) {
  const [selected, setSelected] = useState(() => review.entries.map((_, index) => index));
  const submitting = useRef(false);
  const done = outcome?.ok === true;
  const results = (outcome?.data as { results?: ToolResult[] } | undefined)?.results ?? [];
  return (
    <fieldset
      aria-label="Review mixed entries"
      className="w-full rounded-2xl border border-border p-3 space-y-2"
    >
      <legend className="px-1 text-sm font-semibold">Review mixed entries</legend>
      <p className="text-xs text-muted-foreground">
        Select what to save. Nothing is logged until you confirm. Cancel and edit the message to
        change the details.
      </p>
      {review.entries.map((entry, index) => (
        <label key={index} className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(index)}
            disabled={done || cancelled}
            onChange={(event) =>
              setSelected((values) =>
                event.target.checked
                  ? [...values, index]
                  : values.filter((value) => value !== index),
              )
            }
          />
          <span>{entry.summary}</span>
        </label>
      ))}
      {outcome && (
        <p role={outcome.ok ? "status" : "alert"} className="text-sm">
          {outcome.summary}
        </p>
      )}
      {cancelled ? (
        <p className="text-sm text-muted-foreground">
          Cancelled. Nothing from this review was saved.
        </p>
      ) : done ? (
        <div className="space-y-1">
          {results.map(
            (result, index) =>
              result.auditId && (
                <button
                  type="button"
                  key={result.auditId}
                  className="block min-h-11 text-xs underline"
                  onClick={() => onUndo(result.auditId!)}
                >
                  Undo saved entry {index + 1}
                </button>
              ),
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!selected.length}
            className="min-h-11 rounded-xl bg-[var(--section)] px-3 text-sm text-white disabled:opacity-50"
            onClick={() => {
              if (submitting.current) return;
              submitting.current = true;
              const result = onSave(selected);
              if (!result.ok) submitting.current = false;
            }}
          >
            Save selected entries
          </button>
          <button type="button" onClick={onCancel} className="min-h-11 px-3 text-sm">
            Cancel group
          </button>
        </div>
      )}
    </fieldset>
  );
}
