import { useState } from "react";
import { exerciseProgression, parseProgressionTarget, progressionTargetStatus, sessionEstimatedMax, type RecordedExerciseSession } from "@/lib/exercise-progression";
import type { WorkoutExercise } from "@/lib/types";

export function ExerciseProgression({ exercise, sessions, onTarget }: { exercise: WorkoutExercise; sessions: RecordedExerciseSession[]; onTarget: (target: NonNullable<WorkoutExercise["target"]>) => void }) {
  const [error, setError] = useState("");
  const suggestedTarget = exercise.target ?? sessions[0]?.target;
  const advice = exerciseProgression(sessions, suggestedTarget);
  const status = exercise.target && advice.goal && progressionTargetStatus(exercise.sets, advice.goal, exercise.completed);
  return <details className="rounded-xl border border-border p-3 text-xs">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">Progression and session target</summary>
    <p className="mb-2">{advice.summary}</p>
    {!exercise.target && <p>Save a session target to track completion. Advice uses the last recorded target when available, otherwise 3 sets of 8–12 reps.</p>}
    {status && <p role="status">Target {status.status === "missed" ? "not met" : status.status}: {status.met}/{status.required} sets meet the minimum reps and target load.</p>}
    {advice.plateau && <p>Possible plateau: estimated top-set strength varied by at most 1% across four comparable sessions over at least seven days. Review your target before choosing a change.</p>}
    <p className="mt-2 text-muted-foreground">Uses completed standard weighted working sets from finished workouts. Warmups, nonstandard variations and unconfirmed records are excluded. Failure-tagged sets cannot trigger a load increase. Estimated 1RM uses sets of 1–12 reps. Suggestions do not change your program.</p>
    {sessions.slice(0, 3).map(session => <p key={session.workoutId} className="mt-2">{new Date(session.date).toLocaleDateString()}: {session.sets.map(s => `${s.weight} lb × ${s.reps}`).join(", ")}{sessionEstimatedMax(session) !== undefined && ` · estimated 1RM ${sessionEstimatedMax(session)} lb`}</p>)}
    <form className="mt-3 space-y-2" onSubmit={event => {
      event.preventDefault(); const fields = new FormData(event.currentTarget);
      const weight = String(fields.get("weight") ?? "").trim();
      const target = { ...exercise.target, sets: Number(fields.get("sets")), reps: String(fields.get("reps")), targetWeightLb: weight ? Number(weight) : undefined };
      if (!parseProgressionTarget(target)) { setError("Enter a valid set count, numeric rep range and optional positive load."); return; }
      onTarget(target); setError("");
    }}>
      <p className="font-semibold">Set a target for this session</p>
      <label className="block">Strategy<select aria-label="Progression strategy" defaultValue={advice.goal?.strategy ?? "hypertrophy"} className="ml-2 min-h-11 rounded-lg bg-[var(--surface)] p-2" onChange={event => {
        const form = event.currentTarget.form; const input = form?.elements.namedItem("reps");
        if (input instanceof HTMLInputElement) input.value = event.target.value === "strength" ? "3-5" : "8-12";
      }}><option value="strength">Strength</option><option value="hypertrophy">Hypertrophy</option></select></label>
      <div className="grid grid-cols-3 gap-2">
        <label>Sets<input aria-label="Progression target sets" name="sets" type="number" min="1" max="1000" defaultValue={suggestedTarget?.sets ?? 3} required className="min-h-11 w-full rounded-lg bg-[var(--surface)] p-2" /></label>
        <label>Rep range<input aria-label="Progression target reps" name="reps" defaultValue={suggestedTarget?.reps ?? "8-12"} required className="min-h-11 w-full rounded-lg bg-[var(--surface)] p-2" /></label>
        <label>Load (lb)<input aria-label="Progression target load" name="weight" type="number" min="0.1" max="2000" step="any" defaultValue={suggestedTarget?.targetWeightLb ?? ""} className="min-h-11 w-full rounded-lg bg-[var(--surface)] p-2" /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="min-h-11 rounded-lg border border-border px-3" type="submit">Save session target</button>
    </form>
  </details>;
}
