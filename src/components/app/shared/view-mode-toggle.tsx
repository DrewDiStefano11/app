import { cn } from "@/lib/utils";

export type ViewMode = "daily" | "deep";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

const VIEW_MODE_OPTIONS = [
  { id: "daily" as const, label: "Daily View" },
  { id: "deep" as const, label: "Deep Dive" },
];

export function ViewModeToggle({
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="View Mode"
      className={cn(
        "segmented-control flex gap-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm p-1",
        className,
      )}
    >
      {VIEW_MODE_OPTIONS.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "btn-control relative flex-1 rounded-full font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300",
              compact ? "px-3 py-1 text-[10px]" : "px-3.5 py-1.5 text-[11px]",
              isActive
                ? "text-white shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--section)_70%,transparent)]"
                : "text-white/45 hover:text-white/70",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            style={
              isActive
                ? { background: "var(--section)" }
                : undefined
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
