import { useMemo, useState } from "react";
import { BottomSheet } from "../sheet";
import { BodyHeatmap } from "../body-heatmap";
import { useStore } from "@/lib/store";
import { muscleMap, type HeatMode } from "@/lib/analytics";
import { MuscleDetailSheet } from "./muscle-popup";

const MODES: { id: HeatMode; label: string }[] = [
  { id: "load", label: "Load" },
  { id: "strength", label: "Strength" },
  { id: "imbalance", label: "Imbalance" },
  { id: "recovery", label: "Recovery" },
];

export function HeatmapDetailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view } = useStore();
  const [mode, setMode] = useState<HeatMode>("load");
  const [selected, setSelected] = useState<string | null>(null);
  const values = useMemo(() => muscleMap(view, mode), [view, mode]);

  return (
    <>
      <BottomSheet open={open && !selected} onClose={onClose} title="Body Heat Map" height="tall">
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 overflow-x-auto no-scrollbar">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap ${
                  mode === m.id ? "bg-white/15 text-white" : "text-white/50"}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Dual front+back */}
          <div className="tile p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Front</div>
                <div className="aspect-[1/2] w-full max-w-[150px]">
                  <BodyHeatmap values={values} mode={mode} side="front" compact onSelect={setSelected} />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Back</div>
                <div className="aspect-[1/2] w-full max-w-[150px]">
                  <BodyHeatmap values={values} mode={mode} side="back" compact onSelect={setSelected} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-white/40 text-center mt-3">Tap any muscle for details</p>
          </div>

          {/* Legend */}
          <div className="tile p-3 text-xs text-white/60">
            {mode === "load" && <p>Higher intensity = more recent volume on that muscle (7d).</p>}
            {mode === "strength" && <p>Higher intensity = more total volume contribution (30d).</p>}
            {mode === "imbalance" && <p>Higher red = volume distribution far from your mean.</p>}
            {mode === "recovery" && <p>Green = fully recovered. Red = recently hit, still recovering.</p>}
          </div>
        </div>
      </BottomSheet>

      <MuscleDetailSheet muscle={selected} onClose={() => setSelected(null)} />
    </>
  );
}
