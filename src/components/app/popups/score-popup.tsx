import { BottomSheet } from "../sheet";
import { ScoreEvidence, ScoreValue, usePersonalScores } from "../score-evidence";
import { useStore } from "@/lib/store";

export function FitcoreScoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { view } = useStore();
  const scores = usePersonalScores(view, open);
  const parts = [
    { label: "Training consistency", metric: scores.training, weight: 35 },
    { label: "Nutrition adherence", metric: scores.nutrition, weight: 25 },
    { label: "Recovery", metric: scores.recovery, weight: 25 },
    { label: "Comparable training progress", metric: scores.progress, weight: 15 },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="FitCore Score" height="tall">
      <div className="space-y-4">
        <div className="tile space-y-3 p-4">
          <ScoreValue metric={scores.fitcore} />
          <ScoreEvidence metric={{ ...scores.fitcore, evidence: [] }} />
        </div>
        <h3 className="text-sm font-semibold">Score breakdown</h3>
        {parts.map((part) => (
          <div key={part.label} className="tile space-y-2 p-4">
            <h4 className="text-sm font-semibold">
              {part.label} · {part.weight}%
            </h4>
            <ScoreValue metric={part.metric} />
            <ScoreEvidence metric={part.metric} />
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
