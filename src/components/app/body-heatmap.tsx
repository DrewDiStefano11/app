import { useState } from "react";
import type { HeatMode } from "@/lib/analytics";

interface Region {
  id: string;
  label: string;
  side: "front" | "back";
  d: string;
}

// Simplified anatomical zones on a 100x200 silhouette
const REGIONS: Region[] = [
  // FRONT
  {
    id: "shoulders",
    label: "Shoulders",
    side: "front",
    d: "M28 48 Q28 38 38 36 L42 44 L36 56 Z M72 48 Q72 38 62 36 L58 44 L64 56 Z",
  },
  { id: "chest", label: "Chest", side: "front", d: "M38 50 Q50 46 62 50 L62 70 Q50 76 38 70 Z" },
  {
    id: "biceps",
    label: "Biceps",
    side: "front",
    d: "M26 60 L34 58 L34 80 L26 82 Z M74 60 L66 58 L66 80 L74 82 Z",
  },
  { id: "core", label: "Core", side: "front", d: "M40 72 L60 72 L60 100 L40 100 Z" },
  {
    id: "quads",
    label: "Quads",
    side: "front",
    d: "M38 108 L48 108 L46 152 L38 150 Z M62 108 L52 108 L54 152 L62 150 Z",
  },
  {
    id: "calves",
    label: "Calves",
    side: "front",
    d: "M40 162 L46 162 L46 188 L40 186 Z M54 162 L60 162 L60 186 L54 188 Z",
  },
  // BACK
  { id: "back", label: "Back", side: "back", d: "M36 50 Q50 46 64 50 L64 96 Q50 100 36 96 Z" },
  {
    id: "triceps",
    label: "Triceps",
    side: "back",
    d: "M26 60 L34 58 L34 82 L26 84 Z M74 60 L66 58 L66 82 L74 84 Z",
  },
  {
    id: "shoulders-back",
    label: "Rear Delts",
    side: "back",
    d: "M28 48 Q28 38 38 36 L42 44 L36 54 Z M72 48 Q72 38 62 36 L58 44 L64 54 Z",
  },
  { id: "glutes", label: "Glutes", side: "back", d: "M38 100 L62 100 L62 124 Q50 128 38 124 Z" },
  {
    id: "hamstrings",
    label: "Hamstrings",
    side: "back",
    d: "M38 128 L48 128 L46 158 L38 156 Z M62 128 L52 128 L54 158 L62 156 Z",
  },
  {
    id: "calves-back",
    label: "Calves",
    side: "back",
    d: "M40 162 L46 162 L46 188 L40 186 Z M54 162 L60 162 L60 186 L54 188 Z",
  },
];

// Map region id -> muscle key from analytics
const REGION_MUSCLE: Record<string, string> = {
  shoulders: "shoulders",
  chest: "chest",
  biceps: "biceps",
  core: "core",
  quads: "quads",
  calves: "calves",
  back: "back",
  triceps: "triceps",
  "shoulders-back": "shoulders",
  glutes: "glutes",
  hamstrings: "hamstrings",
  "calves-back": "calves",
};

function colorFor(intensity: number, mode: HeatMode): string {
  // 0..1 -> color
  const i = Math.max(0, Math.min(1, intensity));
  if (mode === "recovery") {
    // green-good, red-low
    const g = Math.round(80 + i * 160);
    const r = Math.round(220 - i * 180);
    return `rgb(${r} ${g} 80 / ${0.18 + i * 0.55})`;
  }
  if (mode === "imbalance") {
    return `rgb(239 68 68 / ${0.12 + i * 0.7})`;
  }
  // load / strength: section color
  return `rgb(var(--section-rgb) / ${0.12 + i * 0.7})`;
}

export function BodyHeatmap({
  values,
  mode,
  onSelect,
  compact,
  side: forcedSide,
}: {
  values: Record<string, number>;
  mode: HeatMode;
  onSelect?: (muscle: string) => void;
  compact?: boolean;
  side?: "front" | "back";
}) {
  const [side, setSide] = useState<"front" | "back">(forcedSide ?? "front");
  const visible = REGIONS.filter((r) => r.side === side);

  const svg = (
    <svg viewBox="0 0 100 200" className="w-full h-full">
      <defs>
        <linearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      {/* Silhouette */}
      <path
        d="M50 8 C44 8 40 12 40 18 C40 24 44 28 50 28 C56 28 60 24 60 18 C60 12 56 8 50 8 Z
           M34 32 Q30 34 28 42 L24 60 L26 86 L34 92 L34 108 L36 152 L38 188 L46 190 L46 158 L50 110 L54 158 L54 190 L62 188 L64 152 L66 108 L66 92 L74 86 L76 60 L72 42 Q70 34 66 32 Z"
        fill="url(#bodyShade)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.6"
      />
      {visible.map((r) => {
        const key = REGION_MUSCLE[r.id];
        const v = values[key] ?? 0;
        return (
          <path
            key={r.id}
            d={r.d}
            fill={colorFor(v, mode)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.4"
            className="transition-all cursor-pointer hover:brightness-125"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(key);
            }}
          />
        );
      })}
    </svg>
  );

  if (compact) {
    return <div className="w-full h-full">{svg}</div>;
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="aspect-[1/2] w-full max-w-[200px]">{svg}</div>
      {!forcedSide && (
        <div className="mt-3 flex gap-1 p-1 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => setSide("front")}
            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full transition ${side === "front" ? "bg-white/15 text-white" : "text-white/50"}`}
          >
            Front
          </button>
          <button
            onClick={() => setSide("back")}
            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full transition ${side === "back" ? "bg-white/15 text-white" : "text-white/50"}`}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
