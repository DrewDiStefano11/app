import { Dumbbell, Apple, Heart, TrendingUp, Settings as SettingsIcon } from "lucide-react";
import type { SectionId } from "@/lib/types";
import { cn } from "@/lib/utils";

const items: { id: SectionId; label: string; Icon: typeof Dumbbell }[] = [
  { id: "training", label: "Training", Icon: Dumbbell },
  { id: "nutrition", label: "Nutrition", Icon: Apple },
  { id: "recovery", label: "Recovery", Icon: Heart },
  { id: "progress", label: "Progress", Icon: TrendingUp },
];

export function BottomNav({ active, onChange, onOpenSettings }: {
  active: SectionId; onChange: (s: SectionId) => void; onOpenSettings: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[480px] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="glass border border-border rounded-2xl flex items-center justify-around px-2 py-2 shadow-2xl">
          {items.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <button key={id} onClick={() => onChange(id)}
                className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground")}
                aria-label={label}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8}
                  style={isActive ? { color: "var(--section)" } : undefined} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
          <button onClick={onOpenSettings} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground" aria-label="Settings">
            <SettingsIcon size={20} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Hub</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
