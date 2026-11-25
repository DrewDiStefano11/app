import { useMemo, useState } from "react";
import { useLocalCalendarDate } from "@/hooks/use-local-calendar-date";
import { trainingPeriodComparison } from "@/lib/analytics/training-periods";
import type { AppState } from "@/lib/types";

export function TrainingPeriodAnalysis({ state }: { state: AppState }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [showAll, setShowAll] = useState(false);
  const date = useLocalCalendarDate();
  const result = useMemo(() => ({ ...trainingPeriodComparison(state, days, Date.now()), asOf: date.toLocaleDateString() }), [state, days, date]);
  const { current, previous, changePercent } = result;
  const number = (value: number) => Math.round(value).toLocaleString();
  const exercises = showAll ? current.exercises : current.exercises.slice(0, 8);
  return <section aria-label="Training period analysis" className="space-y-3">
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Training periods</h3><div className="flex gap-1">{([7, 30] as const).map(value => <button key={value} type="button" aria-pressed={days === value} className={`min-h-11 rounded-lg border px-3 text-xs ${days === value ? "border-primary bg-primary/15" : "border-border"}`} onClick={() => { setDays(value); setShowAll(false); }}>{value} days</button>)}</div></div>
    <p className="text-xs text-muted-foreground">Calculated from completed recorded weighted working sets by workout finish date. Includes today ({result.asOf}); the comparison uses the preceding {days} full calendar days. Warmups and unconfirmed records are excluded.</p>
    {!current.hasData ? <p className="rounded-xl border border-border p-4 text-sm">No eligible weighted working sets in these {days} days. Finish a workout with recorded loads and repetitions to see this analysis. Bodyweight and timed activity remain in their existing logs.</p> : <>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3 text-sm">
        <p>Volume <strong className="block text-lg">{number(current.volume)}</strong><span className="text-xs text-muted-foreground">recorded load × reps</span></p>
        <p>Working sets <strong className="block text-lg">{current.sets}</strong></p>
        <p>Weighted sessions <strong className="block">{current.sessions}</strong></p><p>Weighted training days <strong className="block">{current.trainingDays}</strong></p>
        <p>Custom routine sessions <strong className="block" aria-label="Custom routine weighted sessions">{current.routineSessions}</strong><span className="text-xs text-muted-foreground">{previous.routineSessions} in the preceding {days} days</span></p>
        <p>No recorded custom routine <strong className="block" aria-label="Weighted sessions without a recorded routine">{current.sessionsWithoutRoutine}</strong></p>
      </div>
      <p className="text-sm">{changePercent === null ? "Volume comparison unavailable without a prior period containing recorded load." : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% volume versus the preceding ${days} days (${number(previous.volume)} recorded load × reps).`}</p>
      <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-xs"><caption className="p-3 text-left font-semibold">Volume by exercise</caption><thead><tr><th className="px-3 py-2">Exercise</th><th className="px-3 py-2">Volume</th><th className="px-3 py-2">Sets</th></tr></thead><tbody>{exercises.map(exercise => <tr key={exercise.identity.id} className="border-t border-border"><th className="px-3 py-2 font-medium">{exercise.identity.displayName}</th><td className="px-3 py-2">{number(exercise.totalVolume)}</td><td className="px-3 py-2">{exercise.validSetCount}</td></tr>)}</tbody></table></div>
      {current.exercises.length > 8 && <button className="min-h-11 rounded-lg border border-border px-3 text-xs" onClick={() => setShowAll(value => !value)}>{showAll ? "Show top eight" : `Show all ${current.exercises.length} exercises`}</button>}
      <div className="rounded-xl border border-border p-3"><h4 className="mb-2 text-sm font-semibold">Volume by muscle group</h4>{current.muscles.length ? <><ul className="grid grid-cols-2 gap-2 text-xs">{current.muscles.map(group => <li className="capitalize" key={group.id}>{group.id}: {number(group.currentPeriodVolume)}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground">Calculated credit: primary muscles 100%, secondary muscles 40%. Muscle totals overlap and should not be added together. Metadata coverage {Math.round(current.muscleCoverage)}%.</p></> : <p className="text-xs">Muscle information is unavailable for the recorded exercise identities.</p>}</div>
    </>}
    <p className="text-xs text-muted-foreground">Custom routine counts use the routine recorded when a workout started. Missing or conflicting routine records are not counted as routine completions. Historical program adherence is unavailable because previous schedule versions and activation dates were not recorded. These values describe logged activity.</p>
  </section>;
}
