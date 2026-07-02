import type { CSSProperties } from "react";
import { ClipboardCheck, Dumbbell, Moon, TrendingUp, Utensils } from "lucide-react";
import { BottomSheet } from "@/components/app/sheet";
import type { MomentumFactor, MomentumResult } from "@/lib/analytics";

const factorIcons = {
  training: Dumbbell,
  nutrition: Utensils,
  checkins: ClipboardCheck,
  recovery: Moon,
  progress: TrendingUp,
} satisfies Record<MomentumFactor["id"], typeof Dumbbell>;

export function MomentumDetailSheet({
  open,
  onClose,
  momentum,
}: {
  open: boolean;
  onClose: () => void;
  momentum: MomentumResult;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Momentum Score" height="tall">
      <div className="momentum-sheet-hero">
        <div
          className="momentum-sheet-score"
          style={{ "--momentum-score": momentum.score } as CSSProperties}
        >
          <span>{momentum.hasData ? momentum.score : "—"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[var(--momentum)]">{momentum.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{momentum.explanation}</p>
        </div>
      </div>

      {momentum.hasData ? (
        <div className="mt-5 space-y-3">
          <p className="eyebrow">What is driving it</p>
          {momentum.factors.map((factor) => {
            const Icon = factorIcons[factor.id];
            return (
              <div key={factor.id} className="momentum-factor">
                <div className="momentum-factor__icon">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white/90">{factor.label}</span>
                    <span className="font-display text-lg text-[var(--momentum)]">
                      {factor.score}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[var(--momentum)]"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
                    {factor.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="momentum-empty mt-5">
          Momentum becomes more useful as FitCore learns your normal rhythm. No new logging flow is
          required.
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-white/35">
        Momentum is a read-only summary of recent consistency and goal direction. It does not change
        FitCore, readiness, or recovery scoring.
      </p>
    </BottomSheet>
  );
}
