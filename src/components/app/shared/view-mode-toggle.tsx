import type { LayoutMode } from "@/components/app/layout-primitives";
import { cn } from "@/lib/utils";

type ViewModeToggleProps = {
  mode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
  className?: string;
};

const OPTIONS: { mode: LayoutMode; label: string; helper: string }[] = [
  { mode: "daily", label: "Daily View", helper: "Quick summary for today." },
  { mode: "deepDive", label: "Deep Dive", helper: "Expanded detail across your tabs." },
];

export function ViewModeToggle({ mode, onModeChange, className }: ViewModeToggleProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-white/[0.045] p-3 shadow-[var(--shadow-card)]",
        className,
      )}
      aria-label="FitCore display mode"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
          Display Mode
        </p>
        <p className="text-[10px] font-semibold text-white/35">Switch detail level</p>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Daily View or Deep Dive">
        {OPTIONS.map((option) => {
          const selected = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={selected}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                "btn-control press min-h-[58px] rounded-2xl border px-3 py-2 text-left transition-[background-color,border-color,transform]",
                selected
                  ? "border-[var(--section)] bg-[var(--section-soft)] text-white"
                  : "border-border bg-black/10 text-white/55 hover:bg-white/[0.06] hover:text-white/75",
              )}
            >
              <span className="block text-sm font-bold leading-tight">{option.label}</span>
              <span className="mt-1 block text-[10px] leading-snug text-white/45">
                {option.helper}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
