import { Home, Dumbbell, Apple, Heart, TrendingUp } from "lucide-react";
import type { SectionId } from "@/lib/types";
import { cn } from "@/lib/utils";

const items: { id: SectionId; label: string; Icon: typeof Dumbbell }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "training", label: "Train", Icon: Dumbbell },
  { id: "nutrition", label: "Fuel", Icon: Apple },
  { id: "recovery", label: "Recover", Icon: Heart },
  { id: "progress", label: "Stats", Icon: TrendingUp },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: SectionId;
  onChange: (s: SectionId) => void;
  onOpenSettings: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[480px] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="nav-shell flex items-stretch justify-between rounded-[1.35rem] px-2 py-2">
          {items.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={cn(
                  "btn-control relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[0.9rem] py-1.5 transition-[color,background-color] press",
                  isActive
                    ? "nav-item-active text-white"
                    : "text-white/40 hover:text-white/65",
                )}
                aria-label={label}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={isActive ? { color: "var(--section)" } : undefined}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.09em]"
                  style={isActive ? { color: "var(--section)" } : undefined}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
