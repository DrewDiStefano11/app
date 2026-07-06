import { useId, useState } from "react";
import type { HeatMode } from "@/lib/analytics";

interface Region {
  id: string;
  label: string;
  side: "front" | "back";
  d: string;
}

// Smooth, stylized anatomical zones on a neutral 100x200 athlete silhouette.
const REGIONS: Region[] = [
  {
    id: "shoulders",
    label: "Shoulders",
    side: "front",
    d: "M27 48 C28 38 34 34 42 37 C42 44 39 50 34 55 C30 55 27 53 27 48 Z M73 48 C72 38 66 34 58 37 C58 44 61 50 66 55 C70 55 73 53 73 48 Z",
  },
  {
    id: "chest",
    label: "Chest",
    side: "front",
    d: "M37 47 C42 44 47 44 49 47 L49 69 C44 71 39 68 36 63 Z M63 47 C58 44 53 44 51 47 L51 69 C56 71 61 68 64 63 Z",
  },
  {
    id: "biceps",
    label: "Biceps",
    side: "front",
    d: "M25 58 C29 55 34 58 35 65 L33 82 C30 87 25 84 24 79 Z M75 58 C71 55 66 58 65 65 L67 82 C70 87 75 84 76 79 Z",
  },
  {
    id: "core",
    label: "Core",
    side: "front",
    d: "M39 70 C43 72 47 72 50 70 C53 72 57 72 61 70 L59 101 C55 105 45 105 41 101 Z",
  },
  {
    id: "quads",
    label: "Quads",
    side: "front",
    d: "M37 111 C40 106 47 107 49 112 L46 151 C44 157 38 155 36 149 Z M63 111 C60 106 53 107 51 112 L54 151 C56 157 62 155 64 149 Z",
  },
  {
    id: "calves",
    label: "Calves",
    side: "front",
    d: "M37 158 C41 154 46 158 47 164 L45 187 C42 192 38 188 37 181 Z M63 158 C59 154 54 158 53 164 L55 187 C58 192 62 188 63 181 Z",
  },
  {
    id: "back",
    label: "Back",
    side: "back",
    d: "M36 47 C41 43 46 44 50 48 C54 44 59 43 64 47 L63 78 C60 91 55 99 50 101 C45 99 40 91 37 78 Z",
  },
  {
    id: "triceps",
    label: "Triceps",
    side: "back",
    d: "M25 58 C29 55 34 58 35 64 L33 84 C30 88 25 85 24 79 Z M75 58 C71 55 66 58 65 64 L67 84 C70 88 75 85 76 79 Z",
  },
  {
    id: "shoulders-back",
    label: "Rear Delts",
    side: "back",
    d: "M27 48 C28 38 34 34 42 37 C42 44 39 50 34 55 C30 55 27 53 27 48 Z M73 48 C72 38 66 34 58 37 C58 44 61 50 66 55 C70 55 73 53 73 48 Z",
  },
  {
    id: "glutes",
    label: "Glutes",
    side: "back",
    d: "M38 101 C42 98 47 99 50 103 L49 124 C44 129 38 126 36 119 Z M62 101 C58 98 53 99 50 103 L51 124 C56 129 62 126 64 119 Z",
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    side: "back",
    d: "M37 127 C41 123 47 125 49 130 L46 157 C43 161 38 158 36 152 Z M63 127 C59 123 53 125 51 130 L54 157 C57 161 62 158 64 152 Z",
  },
  {
    id: "calves-back",
    label: "Calves",
    side: "back",
    d: "M37 159 C41 154 46 158 47 165 L45 187 C42 192 38 188 37 181 Z M63 159 C59 154 54 158 53 165 L55 187 C58 192 62 188 63 181 Z",
  },
];

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

const SILHOUETTE =
  "M50 6 C42 6 38 12 39 20 C40 26 43 30 47 31 L47 34 C42 34 38 34 34 35 C27 37 23 43 21 53 L18 78 C17 87 21 92 27 94 L32 91 L34 106 C35 117 34 136 35 153 L36 181 C36 192 40 196 46 193 L49 160 L50 126 L51 160 L54 193 C60 196 64 192 64 181 L65 153 C66 136 65 117 66 106 L68 91 L73 94 C79 92 83 87 82 78 L79 53 C77 43 73 37 66 35 C62 34 58 34 53 34 L53 31 C57 30 60 26 61 20 C62 12 58 6 50 6 Z";

const DETAIL_LINES: Record<"front" | "back", string[]> = {
  front: [
    "M38 48 Q50 55 62 48",
    "M50 48 L50 101",
    "M43 78 L57 78 M42 88 L58 88",
    "M39 112 Q44 121 47 149 M61 112 Q56 121 53 149",
    "M39 165 Q43 171 45 185 M61 165 Q57 171 55 185",
  ],
  back: [
    "M38 48 Q50 58 62 48",
    "M50 47 L50 101",
    "M39 63 Q50 72 61 63",
    "M38 106 Q44 114 49 122 M62 106 Q56 114 51 122",
    "M39 133 Q44 143 46 156 M61 133 Q56 143 54 156",
  ],
};

function colorFor(intensity: number, mode: HeatMode): string {
  const value = Math.max(0, Math.min(1, intensity));
  if (value < 0.01) return "rgb(148 163 184 / 0.13)";
  if (mode === "recovery") {
    const green = Math.round(80 + value * 160);
    const red = Math.round(220 - value * 180);
    return `rgb(${red} ${green} 80 / ${0.28 + value * 0.62})`;
  }
  if (mode === "imbalance") {
    return `rgb(239 68 68 / ${0.22 + value * 0.72})`;
  }
  return `rgb(var(--section-rgb) / ${0.22 + value * 0.72})`;
}

export function BodyHeatmap({
  values,
  mode,
  onSelect,
  compact,
  side: forcedSide,
  selected,
}: {
  values: Record<string, number>;
  mode: HeatMode;
  onSelect?: (muscle: string) => void;
  compact?: boolean;
  side?: "front" | "back";
  selected?: string | null;
}) {
  const [side, setSide] = useState<"front" | "back">(forcedSide ?? "front");
  const gradientId = useId().replace(/:/g, "");
  const visible = REGIONS.filter((region) => region.side === side);

  const select = (muscle: string) => onSelect?.(muscle);
  const svg = (
    <svg
      viewBox="0 0 100 200"
      className="body-heatmap-figure h-full w-full"
      aria-label={`${side} body muscle heat map`}
    >
      <defs>
        <linearGradient id={`${gradientId}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0.16)" />
          <stop offset="48%" stopColor="rgb(148 163 184 / 0.08)" />
          <stop offset="100%" stopColor="rgb(15 23 42 / 0.36)" />
        </linearGradient>
        <filter id={`${gradientId}-selected`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse
        cx="50"
        cy="193"
        rx="24"
        ry="4"
        fill="rgb(0 0 0 / 0.34)"
        className="body-heatmap-shadow"
      />
      <path
        d={SILHOUETTE}
        fill={`url(#${gradientId}-body)`}
        stroke="rgb(226 232 240 / 0.34)"
        strokeWidth="0.9"
        className="body-heatmap-silhouette"
      />
      {visible.map((region) => {
        const muscle = REGION_MUSCLE[region.id];
        const value = values[muscle] ?? 0;
        const isSelected = selected === muscle;
        return (
          <path
            key={region.id}
            d={region.d}
            fill={colorFor(value, mode)}
            stroke={isSelected ? "rgb(255 255 255 / 0.94)" : "rgb(226 232 240 / 0.24)"}
            strokeWidth={isSelected ? 1.35 : 0.55}
            filter={isSelected ? `url(#${gradientId}-selected)` : undefined}
            className="body-heatmap-region"
            role="button"
            tabIndex={0}
            aria-label={`${region.label}, ${Math.round(value * 100)} percent intensity`}
            onClick={(event) => {
              event.stopPropagation();
              select(muscle);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                select(muscle);
              }
            }}
          />
        );
      })}
      {DETAIL_LINES[side].map((path, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke="rgb(226 232 240 / 0.15)"
          strokeWidth="0.5"
          strokeLinecap="round"
          pointerEvents="none"
        />
      ))}
    </svg>
  );

  if (compact) return <div className="h-full w-full">{svg}</div>;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="aspect-[1/2] w-full max-w-[200px]">{svg}</div>
      {!forcedSide && (
        <div className="mt-3 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setSide("front")}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              side === "front" ? "bg-white/15 text-white" : "text-white/50"
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setSide("back")}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
              side === "back" ? "bg-white/15 text-white" : "text-white/50"
            }`}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
