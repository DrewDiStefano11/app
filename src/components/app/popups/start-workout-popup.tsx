import { BottomSheet } from "../sheet";
import { useStore } from "@/lib/store";
import { availableWorkoutTemplates, exerciseById, type WorkoutTemplate } from "@/lib/data";
import { Play, Plus, Dumbbell } from "lucide-react";

export function StartWorkoutSheet({ open, onClose, onStarted }: {
  open: boolean; onClose: () => void; onStarted: () => void;
}) {
  const { state, startWorkout } = useStore();

  const start = (template?: WorkoutTemplate) => {
    if (!startWorkout(template)) return;
    onClose();
    onStarted();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Start Workout" height="tall">
      <div className="space-y-3">
        <button onClick={() => start()}
          className="w-full p-4 rounded-2xl flex items-center gap-3 press relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--section), color-mix(in oklab, var(--section) 50%, black))" }}>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Plus className="text-white" size={20} />
          </div>
          <div className="text-left">
            <div className="font-display text-xl uppercase text-white leading-none">Blank Workout</div>
            <div className="text-[11px] text-white/70 mt-1">Start fresh, add exercises as you go</div>
          </div>
          <Play className="ml-auto text-white fill-white" size={18} />
        </button>

        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold pt-2 px-1">From Template</div>

        <div className="space-y-2">
          {availableWorkoutTemplates(state.workoutTemplates).map(t => (
            <button key={t.id} onClick={() => start(t)}
              className="w-full p-3 rounded-2xl tile press flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--section-soft)", color: "var(--section)" }}>
                <Dumbbell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{t.name}</div>
                <div className="text-[11px] text-white/40 truncate">
                  {t.goal}{t.durationMin > 0 && ` · ${t.durationMin}min`} · {t.exercises.length} exercises
                </div>
                <div className="text-[10px] text-white/30 truncate mt-0.5">
                  {t.exercises.slice(0, 3).map(e => exerciseById(e.exerciseId)?.name).filter(Boolean).join(" · ")}
                </div>
              </div>
              <Play size={16} className="text-white/40" />
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
