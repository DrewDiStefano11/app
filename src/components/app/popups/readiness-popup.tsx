import { BottomSheet } from "../sheet";
import { ScoreEvidence, ScoreValue, usePersonalScores } from "../score-evidence";
import { useStore } from "@/lib/store";
import { readinessHistory, scoreStatusLabel } from "@/lib/analytics/personal-scores";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export function ReadinessDetailSheet({
  open,
  onClose,
  focus = "readiness",
}: {
  open: boolean;
  onClose: () => void;
  focus?: "readiness" | "recovery";
}) {
  const { view } = useStore();
  const scores = usePersonalScores(view, open);
  const series = open && focus === "readiness" ? readinessHistory(view) : [];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={focus === "recovery" ? "Recovery Score" : "Readiness Score"}
      height="tall"
    >
      <div className="space-y-4">
        <div className="tile space-y-3 p-4">
          <ScoreValue metric={scores[focus]} />
          <ScoreEvidence metric={scores[focus]} />
        </div>
        {focus === "readiness" && (
          <div className="tile space-y-3 p-4">
            <h3 className="text-sm font-semibold">14-day readiness history</h3>
            <p className="text-xs text-muted-foreground">
              Estimates use records from that day. Days without readings have gaps.
            </p>
            {series.some((day) => day.value !== null) ? (
              <>
                <div className="h-40" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <XAxis dataKey="label" fontSize={10} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} fontSize={10} />
                      <Tooltip formatter={(value) => [value, "Readiness estimate"]} />
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke="rgb(96 165 250)"
                        connectNulls={false}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details>
                  <summary className="text-sm">Daily values and sources</summary>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {series.map((day) => (
                      <li key={day.date}>
                        {day.date} · {day.value ?? "—"} · {scoreStatusLabel(day)}
                        {day.evidence.length > 0 &&
                          ` · ${day.evidence.map((group) => group.label).join(", ")}`}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No readiness records in the last 14 days.
              </p>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
