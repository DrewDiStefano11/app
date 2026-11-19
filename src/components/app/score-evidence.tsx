import { useEffect, useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import { useWhoopSnapshot } from "@/hooks/use-whoop-snapshot";
import {
  calculatePersonalScores,
  scoreStatusLabel,
  type PersonalScore,
} from "@/lib/analytics/personal-scores";

export function usePersonalScores(state: AppState, enabled = true) {
  const snapshot = useWhoopSnapshot();
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setRefreshCount((count) => count + 1);
    refresh();
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [enabled]);
  return useMemo(
    () => calculatePersonalScores(state, Date.now(), snapshot),
    [state, refreshCount, snapshot],
  );
}

const sourceNames: Record<PersonalScore["evidence"][number]["records"][number]["source"], string> =
  {
    whoop: "WHOOP",
    manual: "Manual entry",
    recorded: "Recorded in FitCore",
    demo: "Demo Data",
    jarvis: "Jarvis",
    "ai-estimated": "AI estimate",
    imported: "Imported",
    wearable: "Wearable",
    "apple-health": "Apple Health",
    "health-connect": "Health Connect",
    barcode: "Barcode",
    "system-derived": "Derived",
  };

export function ScoreEvidence({ metric }: { metric: PersonalScore }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{metric.explanation}</p>
      {metric.evidence.length > 0 && (
        <div>
          <p className="text-sm font-semibold">
            {metric.status === "stale" ? "Earlier records" : "Recorded evidence"}
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {metric.evidence.map(({ label, records, detail }, index) => {
              const dates = [
                ...new Set(records.map((record) => new Date(record.at).toLocaleDateString())),
              ];
              const sources = [...new Set(records.map((record) => sourceNames[record.source]))];
              return (
                <li key={`${label}-${index}`}>
                  {label} · {records.length} {records.length === 1 ? "record" : "records"} ·{" "}
                  {sources.join(", ")}
                  <span className="block">{dates.join(", ")}</span>
                  {detail && <span className="block">{detail}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {metric.missing.length > 0 && (
        <div>
          <p className="text-sm font-semibold">What’s missing</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {metric.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ScoreValue({ metric }: { metric: PersonalScore }) {
  return (
    <div className="space-y-1">
      <p className="font-display text-4xl tabular-nums">
        {metric.value ?? "—"}
        {metric.measurement && metric.value !== null ? "%" : ""}
      </p>
      <p className="text-xs text-muted-foreground">{scoreStatusLabel(metric)}</p>
    </div>
  );
}
