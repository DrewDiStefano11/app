import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/app/ui";
import { getWhoopRecoveryAnalytics } from "@/lib/analytics/recovery-detail-metrics";
import { useStore } from "@/lib/store";
import { readWhoopSnapshot, requestWhoopSync, subscribeToWhoopChanges } from "@/lib/whoop/browser";
import {
  getWhoopActivity,
  matchWhoopStrengthWorkout,
  type WhoopSnapshot,
} from "@/lib/whoop/dashboard";

const dateLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function number(value: number | null | undefined, unit = "") {
  return value == null ? "Unavailable" : String(Math.round(value * 10) / 10) + unit;
}

function hours(ms: number | null | undefined) {
  if (ms == null) return "Unavailable";
  const minutes = Math.round(ms / 60_000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function scoreState(state: string | undefined) {
  if (state === "calibrating") return "WHOOP is calibrating.";
  if (state === "pending") return "WHOOP is calculating this score.";
  return null;
}

function Metric({ name, value }: { name: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs leading-snug text-muted-foreground">{name}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function WhoopDashboard({ compact = false }: { compact?: boolean }) {
  const [snapshot, setSnapshot] = useState<WhoopSnapshot | null>(null);
  const [hasLiveDisplay, setHasLiveDisplay] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const {
    state: { workouts },
  } = useStore();
  useEffect(() => {
    let request: AbortController | undefined;
    let expiry: number | undefined;
    const clear = () => {
      request?.abort();
      window.clearTimeout(expiry);
      setSnapshot(null);
    };
    const refresh = () => {
      request?.abort();
      if (document.visibilityState !== "visible") {
        clear();
        return;
      }
      const current = new AbortController();
      request = current;
      void readWhoopSnapshot(current.signal)
        .then((data) => {
          if (current.signal.aborted) return;
          window.clearTimeout(expiry);
          const remaining = data ? Date.parse(data.accessExpiresAt) - Date.now() : 0;
          if (remaining > 0) {
            setSnapshot(data);
            setHasLiveDisplay(!!data && "version" in data);
            setRefreshMessage("");
            expiry = window.setTimeout(clear, Math.min(remaining, 2_147_483_647));
          } else {
            setSnapshot(null);
          }
        })
        .catch(() => {
          if (!current.signal.aborted) setSnapshot(null);
        });
    };
    const unsubscribe = subscribeToWhoopChanges((change) => {
      if (change === "clear") {
        clear();
        setHasLiveDisplay(false);
      } else refresh();
    });
    const poll = window.setInterval(refresh, 120_000);
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("pagehide", clear);
    return () => {
      request?.abort();
      window.clearTimeout(expiry);
      window.clearInterval(poll);
      unsubscribe();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("pagehide", clear);
    };
  }, []);

  const summary = useMemo(() => snapshot && getWhoopRecoveryAnalytics(snapshot), [snapshot]);
  if (!snapshot || !summary) {
    if (!hasLiveDisplay) return null;
    return (
      <Card className="space-y-2">
        <p className="text-sm">WHOOP measurements need a fresh sync.</p>
        <button
          type="button"
          className="text-sm font-semibold underline underline-offset-2"
          onClick={async () => {
            setRefreshMessage("Syncing…");
            try {
              const response = await requestWhoopSync();
              setRefreshMessage(response.ok ? "" : "WHOOP could not sync yet. Try again shortly.");
            } catch {
              setRefreshMessage("Check your connection and try again.");
            }
          }}
        >
          Refresh WHOOP
        </button>
        {refreshMessage && (
          <p role="status" className="text-xs">
            {refreshMessage}
          </p>
        )}
      </Card>
    );
  }

  const { recovery, sleep, cycle, activities, history } = summary;
  return (
    <section aria-label="WHOOP measurements">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-semibold">WHOOP measurements</h2>
          <p className="text-xs text-muted-foreground">
            Last synced{" "}
            <time dateTime={snapshot.lastSyncedAt}>
              {new Date(snapshot.lastSyncedAt).toLocaleString()}
            </time>
          </p>
        </div>
        <div className="space-y-2">
          {recovery && (
            <p className="text-xs text-muted-foreground">
              Recovery · {dateLabel.format(new Date(recovery.at))}
            </p>
          )}
          {scoreState(recovery?.state) && <p className="text-sm">{scoreState(recovery?.state)}</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric name="WHOOP Recovery" value={number(recovery?.score, "%")} />
            <Metric name="HRV" value={number(recovery?.hrvMs, " ms")} />
            <Metric name="Resting heart rate" value={number(recovery?.restingHeartRate, " bpm")} />
          </dl>
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          {sleep && (
            <p className="text-xs text-muted-foreground">
              Sleep · {dateLabel.format(new Date(sleep.at))}
            </p>
          )}
          {scoreState(sleep?.state) && <p className="text-sm">{scoreState(sleep?.state)}</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric name="Sleep performance" value={number(sleep?.performance, "%")} />
            <Metric name="Time asleep" value={hours(sleep?.asleepMs)} />
            {!compact && (
              <>
                <Metric name="Light sleep" value={hours(sleep?.lightMs)} />
                <Metric name="Deep sleep" value={hours(sleep?.deepMs)} />
                <Metric name="REM sleep" value={hours(sleep?.remMs)} />
                <Metric name="Awake" value={hours(sleep?.awakeMs)} />
                <Metric
                  name="Respiratory rate"
                  value={number(sleep?.respiratoryRate, " breaths/min")}
                />
              </>
            )}
          </dl>
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          {cycle && (
            <p className="text-xs text-muted-foreground">
              Cycle started {dateLabel.format(new Date(cycle.at))}
            </p>
          )}
          {scoreState(cycle?.state) && <p className="text-sm">{scoreState(cycle?.state)}</p>}
          <dl className="grid grid-cols-2 gap-3">
            <Metric name="Daily Strain" value={number(cycle?.strain)} />
            {cycle?.steps != null && (
              <Metric name="WHOOP steps" value={cycle.steps.toLocaleString()} />
            )}
          </dl>
        </div>
        {!compact && (
          <>
            {history.length > 1 && (
              <details className="space-y-2 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Recent WHOOP recovery
                </summary>
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
                    {history.slice(0, 7).map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <th scope="row" className="py-1.5">
                          {dateLabel.format(new Date(row.at))}
                        </th>
                        <td>
                          {row.state === "calibrating"
                            ? "Calibrating"
                            : row.state === "pending"
                              ? "Pending"
                              : number(row.score, "%")}
                        </td>
                        <td>{number(row.hrvMs, " ms")}</td>
                        <td>{number(row.restingHeartRate, " bpm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
            {activities.slice(0, 5).map((row) => {
              const activity = getWhoopActivity(row);
              const match = matchWhoopStrengthWorkout(row, activities, workouts);
              return (
                <details key={row.id} className="space-y-2 border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {activity.sport} · {dateLabel.format(new Date(activity.at))}
                  </summary>
                  {match && <p className="text-xs">Matched FitCore workout: {match.name}</p>}
                  {scoreState(activity.state) && (
                    <p className="text-sm">{scoreState(activity.state)}</p>
                  )}
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Metric name="Workout Strain" value={number(activity.strain)} />
                    <Metric
                      name="Average heart rate"
                      value={number(activity.averageHeartRate, " bpm")}
                    />
                    <Metric name="Peak heart rate" value={number(activity.maxHeartRate, " bpm")} />
                    {activity.zoneMs.map((value, zone) =>
                      value === null ? null : (
                        <Metric key={zone} name={`Zone ${zone}`} value={hours(value)} />
                      ),
                    )}
                  </dl>
                </details>
              );
            })}
          </>
        )}
      </Card>
    </section>
  );
}
