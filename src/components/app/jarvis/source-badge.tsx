import type { Confidence, DataSource } from "@/lib/types";

const SOURCE_LABEL: Record<DataSource, string> = {
  "manual": "Manual",
  "jarvis": "Jarvis",
  "jarvis-confirmed": "Jarvis ✓",
  "barcode": "Barcode",
  "camera": "Camera",
  "whoop": "WHOOP",
  "apple-health": "Apple Health",
  "imported": "Imported",
  "edited": "Edited",
};

const CONF_COLOR: Record<Confidence, string> = {
  high: "var(--success, #10b981)",
  medium: "var(--warning, #f59e0b)",
  low: "var(--destructive, #ef4444)",
};

export function SourceBadge({ source, confidence, className = "" }: { source?: DataSource; confidence?: Confidence; className?: string }) {
  if (!source && !confidence) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--surface-2)] text-muted-foreground ${className}`}>
      {source && <span>{SOURCE_LABEL[source]}</span>}
      {confidence && (
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: CONF_COLOR[confidence] }} />
          {confidence}
        </span>
      )}
    </span>
  );
}
