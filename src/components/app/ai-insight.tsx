import { Sparkles } from "lucide-react";
import { type ReactNode } from "react";

export function AiInsightStrip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="insight-shell w-full px-4 py-3.5 flex items-center gap-3 text-left press transition-[transform,border-color]"
    >
      <div className="shrink-0 grid w-9 h-9 place-items-center rounded-xl border border-white/10 bg-white text-black shadow-sm">
        <Sparkles size={14} className="text-black" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow mb-1" style={{ color: "var(--section)" }}>
          AI COACH
        </div>
        <p className="text-[13px] leading-snug text-white/90">{children}</p>
      </div>
      <div
        className="w-1.5 h-1.5 rounded-full shimmer-dot"
        style={{ background: "var(--section)" }}
      />
    </button>
  );
}

