import { useWhoopSnapshot } from "@/hooks/use-whoop-snapshot";
import { selectWhoopEvidence } from "@/lib/whoop/evidence";
import { StatCard } from "./ui";
import { useStore } from "@/lib/store";
import { measuredNumber, sleepDuration } from "@/lib/whoop/format";
function source(at?: string, state?: string) {
  return at
    ? `WHOOP · ${state === "pending" ? "Pending · " : state === "calibrating" ? "Calibrating · " : ""}${new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "WHOOP · Unavailable";
}

/** Native health fields, sharing exactly the same authorized evidence as the score tiles. */
export function WhoopHealthFields() {
  const snapshot = useWhoopSnapshot();
  const { state } = useStore();
  const summary = state.demoMode ? null : selectWhoopEvidence(snapshot);
  const recovery = summary?.recovery;
  const cycle = summary?.cycle;
  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Health measurements">
      <StatCard
        label="HRV"
        value={measuredNumber(recovery?.hrvMs, " ms")}
        sub={source(recovery?.at, recovery?.state)}
      />
      <StatCard
        label="Resting heart rate"
        value={measuredNumber(recovery?.restingHeartRate, " bpm")}
        sub={source(recovery?.at, recovery?.state)}
      />
      <StatCard
        label="Daily Strain"
        value={measuredNumber(cycle?.strain)}
        sub={source(cycle?.at, cycle?.state)}
      />
      <StatCard
        label="Steps"
        value={measuredNumber(cycle?.steps)}
        sub={source(cycle?.at, cycle?.state)}
      />
    </div>
  );
}

export function WhoopSleepFields() {
  const snapshot = useWhoopSnapshot();
  const { state } = useStore();
  const sleep = state.demoMode ? null : selectWhoopEvidence(snapshot)?.sleep;
  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Sleep measurements">
      <StatCard
        label="Sleep performance"
        value={measuredNumber(sleep?.performance, "%")}
        sub={source(sleep?.at, sleep?.state)}
      />
      <StatCard
        label="Respiratory rate"
        value={measuredNumber(sleep?.respiratoryRate, " breaths/min")}
        sub={source(sleep?.at, sleep?.state)}
      />
      <StatCard
        label="Light sleep"
        value={sleepDuration(sleep?.lightMs)}
        sub={source(sleep?.at, sleep?.state)}
      />
      <StatCard
        label="Deep sleep"
        value={sleepDuration(sleep?.deepMs)}
        sub={source(sleep?.at, sleep?.state)}
      />
      <StatCard
        label="REM sleep"
        value={sleepDuration(sleep?.remMs)}
        sub={source(sleep?.at, sleep?.state)}
      />
      <StatCard
        label="Awake"
        value={sleepDuration(sleep?.awakeMs)}
        sub={source(sleep?.at, sleep?.state)}
      />
    </div>
  );
}
