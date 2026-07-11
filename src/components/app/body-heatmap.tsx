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
    d: "M26 46 C27 38 34 35 42 37 C42 45 39 52 34 56 C29 55 26 52 26 46 Z M74 46 C73 38 66 35 58 37 C58 45 61 52 66 56 C71 55 74 52 74 46 Z",
  },
  {
    id: "chest",
    label: "Chest",
    side: "front",
    d: "M37 47 C41 43 47 44 50 48 L50 68 C45 71 39 67 36 62 Z M63 47 C59 43 53 44 50 48 L50 68 C55 71 61 67 64 62 Z",
  },
  {
    id: "biceps",
    label: "Biceps",
    side: "front",
    d: "M24 57 C29 54 34 57 35 65 L33 82 C29 86 24 83 23 78 Z M76 57 C71 54 66 57 65 65 L67 82 C71 86 76 83 77 78 Z",
  },
  {
    id: "core",
    label: "Core",
    side: "front",
    d: "M39 69 C43 73 47 73 50 69 C53 73 57 73 61 69 L59 101 C54 106 46 106 41 101 Z",
  },
  {
    id: "quads",
    label: "Quads",
    side: "front",
    d: "M37 111 C42 105 48 107 49 113 L47 151 C44 157 37 156 36 148 Z M63 111 C58 105 52 107 51 113 L53 151 C56 157 63 156 64 148 Z",
  },
  {
    id: "calves",
    label: "Calves",
    side: "front",
    d: "M36 158 C41 153 46 158 47 165 L45 187 C41 192 37 188 36 181 Z M64 158 C59 153 54 158 53 165 L55 187 C59 192 63 188 64 181 Z",
  },
  {
    id: "back",
    label: "Back",
    side: "back",
    d: "M35 46 C41 41 46 43 50 48 C54 43 59 41 65 46 L63 78 C60 92 55 101 50 102 C45 101 40 92 37 78 Z",
  },
  {
    id: "triceps",
    label: "Triceps",
    side: "back",
    d: "M24 57 C29 54 34 57 35 65 L33 83 C29 87 24 84 23 78 Z M76 57 C71 54 66 57 65 65 L67 83 C71 87 76 84 77 78 Z",
  },
  {
    id: "shoulders-back",
    label: "Rear Delts",
    side: "back",
    d: "M26 46 C27 38 34 35 42 37 C42 45 39 52 34 56 C29 55 26 52 26 46 Z M74 46 C73 38 66 35 58 37 C58 45 61 52 66 56 C71 55 74 52 74 46 Z",
  },
  {
    id: "glutes",
    label: "Glutes",
    side: "back",
    d: "M38 100 C43 96 48 97 50 103 L49 123 C44 129 37 127 36 118 Z M62 100 C57 96 52 97 50 103 L51 123 C56 129 63 127 64 118 Z",
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    side: "back",
    d: "M37 127 C42 122 47 125 49 131 L46 156 C42 161 37 159 36 151 Z M63 127 C58 122 53 125 51 131 L54 156 C58 161 63 159 64 151 Z",
  },
  {
    id: "calves-back",
    label: "Calves",
    side: "back",
    d: "M36 158 C41 153 46 158 47 165 L45 187 C41 192 37 188 36 181 Z M64 158 C59 153 54 158 53 165 L55 187 C59 192 63 188 64 181 Z",
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
  "M50 6 C42 6 38 12 39 20 C40 26 43 30 47 31 L47 34 C41 34 37 35 34 36 C27 38 22 44 20 54 L17 79 C16 88 20 93 27 94 L31 92 L33 107 C34 118 33 137 34 154 L35 182 C35 193 40 197 46 193 L49 161 L50 126 L51 161 L54 193 C60 197 65 193 65 182 L66 154 C67 137 66 118 67 107 L69 92 L73 94 C80 93 84 88 83 79 L80 54 C78 44 73 38 66 36 C63 35 59 34 53 34 L53 31 C57 30 60 26 61 20 C62 12 58 6 50 6 Z";

const DETAIL_LINES: Record<"front" | "back", string[]> = {
  front: [
    "M37 47 Q50 54 63 47",
    "M50 48 L50 101",
    "M42 78 L58 78 M41 89 L59 89",
    "M38 112 Q44 122 47 150 M62 112 Q56 122 53 150",
    "M38 165 Q42 172 44 186 M62 165 Q58 172 56 186",
  ],
  back: [
    "M37 47 Q50 57 63 47",
    "M50 47 L50 101",
    "M38 63 Q50 73 62 63",
    "M37 106 Q44 115 49 123 M63 106 Q56 115 51 123",
    "M38 133 Q43 144 46 157 M62 133 Q57 144 54 157",
  ],
};

function colorFor(intensity: number, mode: HeatMode): string {
  const value = Math.max(0, Math.min(1, intensity));
  if (value < 0.01) return "rgb(148 163 184 / 0.13)";
  if (mode === "strength") {
    return `rgb(59 130 246 / ${0.22 + value * 0.72})`;
  }
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
        const interactive = typeof onSelect === "function";
        return (
          <path
            key={region.id}
            d={region.d}
            fill={colorFor(value, mode)}
            stroke={isSelected ? "rgb(255 255 255 / 0.94)" : "rgb(226 232 240 / 0.24)"}
            strokeWidth={isSelected ? 1.35 : 0.55}
            filter={isSelected ? `url(#${gradientId}-selected)` : undefined}
            className="body-heatmap-region"
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${region.label}, ${Math.round(value * 100)} percent intensity`
                : undefined
            }
            onClick={
              interactive
                ? (event) => {
                    event.stopPropagation();
                    select(muscle);
                  }
                : undefined
            }
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      select(muscle);
                    }
                  }
                : undefined
            }
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
