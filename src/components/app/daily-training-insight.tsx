import { useMemo } from "react";
import type { TemplateExercise } from "@/lib/data";
import { useLocalCalendarDate } from "@/hooks/use-local-calendar-date";
import { dailyTrainingInsight } from "@/lib/daily-training-insight";
import type { AppState } from "@/lib/types";

export function DailyTrainingInsight({ state, plan, onReview }: { state: AppState; plan: readonly TemplateExercise[]; onReview: () => void }) {
  const date = useLocalCalendarDate();
  const { workouts, customExercises } = state;
  const { insight, asOf } = useMemo(() => ({ insight: dailyTrainingInsight({ workouts, customExercises }, plan, Date.now()), asOf: date.toLocaleDateString() }), [workouts, customExercises, plan, date]);
  if (!insight) return null;
  return <section aria-label="Training insight from your records" className="rounded-2xl border border-border bg-[var(--surface-2)] p-4 space-y-2 text-sm">
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">From your workout log</h3><span className="text-xs text-muted-foreground">{asOf}</span></div>
    {insight.planHasHistory ? <>
      <p><strong>{insight.name}</strong> · {new Date(insight.latest.date).toLocaleDateString()}</p>
      <p className="text-xs text-muted-foreground">Last recorded working sets: {insight.latest.sets.slice(0, 3).map(set => `${set.weight} lb × ${set.reps}`).join(", ")}{insight.latest.sets.length > 3 ? ` (${insight.latest.sets.length} total sets)` : ""}.</p>
      <p>{insight.advice.summary}</p>
    </> : <p>Your planned movements do not yet have eligible completed weighted sets. Log a workout to compare future targets with your recorded performance.</p>}
    <button type="button" className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold" onClick={onReview}>Review workout</button>
  </section>;
}
