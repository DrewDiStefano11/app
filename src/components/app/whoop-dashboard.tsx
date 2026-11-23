import { useWhoopSnapshot } from "@/hooks/use-whoop-snapshot";
import { useStore } from "@/lib/store";
import { selectWhoopEvidence } from "@/lib/whoop/evidence";
import { getWhoopActivity, matchWhoopStrengthWorkout } from "@/lib/whoop/dashboard";
import { measuredNumber, sleepDuration } from "@/lib/whoop/format";
import { Card } from "./ui";

const dateLabel = (at: string) =>
  new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Historical detail only. Current measurements belong to native Recovery/Sleep fields. */
export function WhoopDashboard() {
  const snapshot = useWhoopSnapshot();
  const {
    state: { workouts, demoMode },
  } = useStore();
  const summary = demoMode ? null : selectWhoopEvidence(snapshot);
  if (!summary || (!summary.history.length && !summary.activities.length)) return null;
  return (
    <div className="space-y-3" aria-label="WHOOP historical details">
      {summary.history.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-medium">Recent WHOOP recovery</summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Recovery</th>
                    <th scope="col">HRV</th>
                    <th scope="col">Resting HR</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.history.slice(0, 7).map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <th scope="row" className="py-2">
                        <time dateTime={row.at}>{dateLabel(row.at)}</time>
                      </th>
                      <td>{row.state === "scored" ? measuredNumber(row.score, "%") : row.state}</td>
                      <td>{measuredNumber(row.hrvMs, " ms")}</td>
                      <td>{measuredNumber(row.restingHeartRate, " bpm")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      )}
      {summary.activities.slice(0, 10).map((row) => {
        const activity = getWhoopActivity(row);
        const match = matchWhoopStrengthWorkout(row, summary.activities, workouts);
        return (
          <Card key={row.id}>
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                {activity.sport} · {dateLabel(activity.at)} · WHOOP
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                <time dateTime={activity.at}>{new Date(activity.at).toLocaleString()}</time> ·{" "}
                {activity.state}
              </p>
              {match && <p className="text-xs">Matched FitCore workout: {match.name}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt>Workout Strain</dt>
                  <dd>{measuredNumber(activity.strain)}</dd>
                </div>
                <div>
                  <dt>Average heart rate</dt>
                  <dd>{measuredNumber(activity.averageHeartRate, " bpm")}</dd>
                </div>
                <div>
                  <dt>Peak heart rate</dt>
                  <dd>{measuredNumber(activity.maxHeartRate, " bpm")}</dd>
                </div>
                {activity.zoneMs.map((value, zone) =>
                  value === null ? null : (
                    <div key={zone}>
                      <dt>Zone {zone}</dt>
                      <dd>{sleepDuration(value)}</dd>
                    </div>
                  ),
                )}
              </dl>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
