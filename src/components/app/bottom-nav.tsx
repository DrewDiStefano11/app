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

export function BottomNav({ active, onChange }: {
  active: SectionId; onChange: (s: SectionId) => void; onOpenSettings: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[480px] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="glass-strong rounded-2xl flex items-stretch justify-between px-2 py-2 shadow-2xl">
          {items.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl transition-colors press",
                  isActive ? "text-white" : "text-white/40",
                )}
                aria-label={label}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8}
                  style={isActive ? { color: "var(--section)" } : undefined} />
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={isActive ? { color: "var(--section)" } : undefined}
                >{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
