import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WhoopSnapshot } from "@/lib/whoop/dashboard";
import {
  WHOOP_HISTORY_METRICS,
  whoopDailyHistory,
  whoopHistoryChartPoints,
  type WhoopHistoryMetric,
} from "@/lib/whoop/history";
import { Card, Select } from "./ui";

const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function WhoopHistoryChart({
  snapshot,
  days,
}: {
  snapshot: WhoopSnapshot | null;
  days: number;
}) {
  const [metric, setMetric] = useState<WhoopHistoryMetric>("hrv");
  const points = useMemo(() => whoopDailyHistory(snapshot, metric, days), [snapshot, metric, days]);
  const chart = useMemo(() => whoopHistoryChartPoints(points), [points]);
  const info = WHOOP_HISTORY_METRICS[metric];
  const average = points.length
    ? points.reduce((sum, point) => sum + point.value, 0) / points.length
    : null;
  const change = points.length > 1 ? points.at(-1)!.value - points[0].value : null;
  return (
    <Card>
      <section aria-label="Historical WHOOP measurements" className="space-y-3">
        <h3 className="font-semibold">Historical health measurements</h3>
        <label className="block text-sm">
          WHOOP metric
          <Select
            aria-label="WHOOP history metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as WhoopHistoryMetric)}
          >
            {(Object.keys(WHOOP_HISTORY_METRICS) as WhoopHistoryMetric[]).map((key) => (
              <option key={key} value={key}>
                {WHOOP_HISTORY_METRICS[key].label}
              </option>
            ))}
          </Select>
        </label>
        <p className="text-xs text-muted-foreground">
          Actual WHOOP records · current device local dates · latest scored observation per day.
          Missing dates stay gaps. Sleep excludes naps; duration requires complete recorded stages.
        </p>
        {average === null ? (
          <p role="status" className="text-sm text-muted-foreground">
            No authorized {info.label.toLowerCase()} measurements in this range. Enable private
            history and import available WHOOP history in Settings.
          </p>
        ) : (
          <>
            <p className="text-sm tabular-nums">
              {points.length} observed days · Average {number(average)} {info.unit}
            </p>
            <p className="text-xs text-muted-foreground">
              {points[0].date} to {points.at(-1)!.date}
              {change !== null &&
                ` · First-to-last change ${change > 0 ? "+" : ""}${number(change)} ${info.unit}`}
              . This describes recorded observations, not a clinical conclusion.
            </p>
            <div
              role="img"
              aria-label={`${info.label} chart with ${points.length} actual observed days`}
              className="h-52 min-w-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    type="number"
                    dataKey="timestamp"
                    domain={["dataMin", "dataMax"]}
                    scale="time"
                    tickFormatter={(at) =>
                      new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    }
                    tick={{ fontSize: 10 }}
                    minTickGap={35}
                  />
                  <YAxis width={42} domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(at) => new Date(Number(at)).toLocaleDateString()}
                    formatter={(value) => [`${number(Number(value))} ${info.unit}`, info.label]}
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke="var(--section)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details>
              <summary className="cursor-pointer py-2 text-sm underline">
                Inspect recorded {info.label.toLowerCase()} values
              </summary>
              <div className="max-h-72 overflow-auto">
                <table
                  className="w-full text-left text-xs"
                  aria-label={`${info.label} recorded values`}
                >
                  <thead>
                    <tr>
                      <th className="py-2">Local date</th>
                      <th>Value ({info.unit})</th>
                      <th>Recorded at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.date}>
                        <td className="py-2">{point.date}</td>
                        <td className="tabular-nums">{number(point.value)}</td>
                        <td>
                          <time dateTime={point.at}>
                            {new Date(point.at).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </section>
    </Card>
  );
}
