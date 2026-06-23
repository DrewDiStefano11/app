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
      className="w-full glass rounded-2xl px-4 py-3 flex items-center gap-3 text-left press"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
        <Sparkles size={14} className="text-black" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow mb-0.5" style={{ color: "var(--section)" }}>
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
