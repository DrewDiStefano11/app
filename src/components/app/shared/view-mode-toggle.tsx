import type { LayoutMode } from "@/components/app/layout-primitives";
import { cn } from "@/lib/utils";

type ViewModeToggleProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  className?: string;
};

const OPTIONS: { mode: LayoutMode; label: string }[] = [
  { mode: "daily", label: "Daily View" },
  { mode: "deepDive", label: "Deep Dive" },
];

export function ViewModeToggle({ mode, onModeChange, className }: ViewModeToggleProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-white/[0.045] p-1 shadow-[var(--shadow-card)]",
        className,
      )}
      aria-label="FitCore display mode"
    >
      <div className="flex" role="group" aria-label="Daily View or Deep Dive">
        {OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={selected}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                "btn-control press flex-1 min-h-[36px] rounded-xl px-3 py-1.5 text-center transition-[background-color,color]",
                selected
                  ? "bg-[var(--section)] text-white shadow-sm"
                  : "text-white/55 hover:text-white/75",
              )}
            >
              <span className="block text-xs font-bold leading-tight">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
