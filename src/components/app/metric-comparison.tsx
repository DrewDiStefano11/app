import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState } from "@/lib/types";
import { weightUnit } from "@/lib/types";
import type { WhoopSnapshot } from "@/lib/whoop/dashboard";
import {
  CORRELATION_METRICS,
  recordedCorrelation,
  type CorrelationMetric,
} from "@/lib/analytics/recorded-correlation";
import { BottomSheet } from "./sheet";
import { Card, Select } from "./ui";

const inputMetrics: CorrelationMetric[] = [
  "calories",
  "protein",
  "volume",
  "sleep",
  "hrv",
  "soreness",
];
const outcomeMetrics: CorrelationMetric[] = ["weight", "volume", "readiness"];
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function MetricComparison({
  state,
  snapshot,
  days,
}: {
  state: AppState;
  snapshot: WhoopSnapshot | null;
  days: number;
}) {
  const [left, setLeft] = useState<CorrelationMetric>("calories");
  const [right, setRight] = useState<CorrelationMetric>("weight");
  const [open, setOpen] = useState(false);
  const comparison = useMemo(
    () => recordedCorrelation(state, left, right, days, snapshot),
    [state, left, right, days, snapshot],
  );
  const { result, pairs } = comparison;
  const metric = weightUnit(state.personalization) === "kg";
  const scale = (key: CorrelationMetric) =>
    metric && (key === "weight" || key === "volume") ? 0.453592 : 1;
  const unit = (key: CorrelationMetric) =>
    metric && key === "weight"
      ? "kg"
      : metric && key === "volume"
        ? "kg × reps"
        : CORRELATION_METRICS[key].unit;
  const displayed = pairs.map((pair) => ({
    ...pair,
    x: pair.x * scale(left),
    y: pair.y * scale(right),
  }));
  const summary =
    result.status === "ready"
      ? `${result.strength} ${result.direction === "neutral" ? "association" : result.direction + " association"}`
      : result.status === "needs_more_data"
        ? "Needs more paired days"
        : "Comparison unavailable";
  const title = `${comparison.left.label} vs ${comparison.right.label}`;
  const chart = (
    <div
      className="h-48 w-full"
      role="img"
      aria-label={`${title} scatter plot of ${result.sampleSize} paired days`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 14, bottom: 12, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            type="number"
            dataKey="x"
            name={comparison.left.label}
            unit={` ${unit(left)}`}
            domain={["auto", "auto"]}
            tickFormatter={number}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={comparison.right.label}
            unit={` ${unit(right)}`}
            domain={["auto", "auto"]}
            tickFormatter={number}
            width={62}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => number(Number(value))}
            contentStyle={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              fontSize: 12,
            }}
          />
          <Scatter data={displayed} fill="var(--section)" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <>
      <Card>
        <p className="text-sm font-medium mb-3">Compare Metrics</p>
        <div className="flex gap-2 mb-4">
          <Select
            aria-label="First comparison metric"
            value={left}
            onChange={(event) => setLeft(event.target.value as CorrelationMetric)}
            className="flex-1 min-w-0 text-xs"
            style={{ colorScheme: "dark" }}
          >
            {inputMetrics.map((key) => (
              <option key={key} value={key}>
                {CORRELATION_METRICS[key].label}
              </option>
            ))}
          </Select>
          <span className="self-center text-xs text-muted-foreground">vs</span>
          <Select
            aria-label="Second comparison metric"
            value={right}
            onChange={(event) => setRight(event.target.value as CorrelationMetric)}
            className="flex-1 min-w-0 text-xs"
            style={{ colorScheme: "dark" }}
          >
            {outcomeMetrics.map((key) => (
              <option key={key} value={key}>
                {CORRELATION_METRICS[key].label}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          aria-label="Open metric comparison details"
          onClick={(event) => {
            event.currentTarget.focus();
            setOpen(true);
          }}
          className="w-full text-left flex items-start justify-between gap-2 rounded-xl bg-[var(--surface-2)] p-3"
        >
          <span>
            <span className="block text-sm font-medium capitalize">{summary}</span>
            <span className="block text-xs text-muted-foreground mt-1">
              {result.sampleSize} paired days · minimum {result.minimumSampleSize}
            </span>
            {result.coefficient !== null && (
              <span className="block text-sm tabular-nums mt-1">
                r = {result.coefficient.toFixed(2)}
              </span>
            )}
          </span>
          <ChevronRight size={16} />
        </button>
        {result.status === "ready" ? (
          chart
        ) : (
          <p className="text-xs text-muted-foreground mt-3">{result.reason}</p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Same-day logged values only; missing days are omitted. Correlation does not establish
          cause and effect.
        </p>
      </Card>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        closeLabel="Close metric comparison"
        manageFocus
        fitViewport
      >
        <div className="space-y-4">
          <p className="text-sm capitalize">
            {summary}
            {result.coefficient !== null && <> · r = {result.coefficient.toFixed(2)}</>}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.sampleSize} paired days in the selected {days}-day range. At least{" "}
            {result.minimumSampleSize} overlapping days with variation in both metrics are required.
          </p>
          <p className="text-sm text-muted-foreground">{result.reason}</p>
          {result.status === "ready" && chart}
          <dl className="text-sm space-y-2">
            <div>
              <dt className="font-medium">
                {comparison.left.label} ({unit(left)})
              </dt>
              <dd className="text-muted-foreground">{comparison.left.description}</dd>
            </div>
            <div>
              <dt className="font-medium">
                {comparison.right.label} ({unit(right)})
              </dt>
              <dd className="text-muted-foreground">{comparison.right.description}</dd>
            </div>
          </dl>
          {displayed.length > 0 && (
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs text-left tabular-nums"
                aria-label="Paired daily measurements"
              >
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">
                      {comparison.left.label} ({unit(left)})
                    </th>
                    <th scope="col">
                      {comparison.right.label} ({unit(right)})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...displayed].reverse().map((pair) => (
                    <tr key={pair.date} className="border-t border-border">
                      <th scope="row" className="py-2">
                        {pair.date}
                      </th>
                      <td>{number(pair.x)}</td>
                      <td>{number(pair.y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            These are descriptive associations in your recorded data. They do not show that changing
            one metric causes the other to change.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
