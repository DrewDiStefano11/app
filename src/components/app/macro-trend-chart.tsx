import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select } from "@/components/app/ui";
import { addCalendarDays, calendarDaysWindow, startOfDay } from "@/lib/analytics/date-time";
import {
  nutritionMacroPoints,
  type DailyMacroPoint,
  type NutritionMacro,
} from "@/lib/analytics/nutrition-detail-metrics";
import { usePersistentState } from "@/lib/persist";
import type { MealEntry } from "@/lib/types";

const NUTRIENTS: Record<NutritionMacro, { label: string; unit: string }> = {
  calories: { label: "Calories", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbs", unit: "g" },
  fat: { label: "Fat", unit: "g" },
};

function buildSeries(
  meals: readonly MealEntry[],
  nutrient: NutritionMacro,
  days: number,
  groupDays: number,
  now: number,
) {
  const today = startOfDay(now);
  const range = calendarDaysWindow(days, now);
  const totalsByDay = new Map(
    nutritionMacroPoints(meals, nutrient, range, now).map((point) => [point.timestamp, point]),
  );
  const shortDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });

  return Array.from({ length: Math.ceil(days / groupDays) }, (_, index) => {
    const first = 1 - days + index * groupDays;
    const last = Math.min(0, first + groupDays - 1);
    const start = addCalendarDays(today, first);
    const end = addCalendarDays(today, last);
    const values = Array.from({ length: last - first + 1 }, (_, offset) =>
      totalsByDay.get(addCalendarDays(today, first + offset)),
    ).filter((point): point is DailyMacroPoint => point !== undefined);
    return {
      timestamp: start,
      label: first === last ? shortDate(start) : `${shortDate(start)}–${shortDate(end)}`,
      value: values.length
        ? Math.round(values.reduce((sum, point) => sum + point.value, 0) / values.length)
        : null,
      loggedDays: values.length,
      partialDays: values.filter((point) => !point.complete).length,
    };
  });
}

export function MacroTrendChart({
  meals,
  now,
  demo = false,
}: {
  meals: readonly MealEntry[];
  now: number;
  demo?: boolean;
}) {
  const [savedRange, setRange] = usePersistentState<7 | 30 | 90>("macro.range", 7);
  const [savedGrouping, setGrouping] = usePersistentState<"daily" | "weekly">(
    "macro.view",
    "daily",
  );
  const range = savedRange === 30 || savedRange === 90 ? savedRange : 7;
  const grouping = savedGrouping === "weekly" ? "weekly" : "daily";
  const [nutrient, setNutrient] = usePersistentState<NutritionMacro>("macro.nutrient", "calories");
  const gradient = useId();
  const selected = Object.hasOwn(NUTRIENTS, nutrient) ? nutrient : "calories";
  const { label, unit } = NUTRIENTS[selected];
  const series = useMemo(
    () => buildSeries(meals, selected, range, grouping === "weekly" ? 7 : 1, now),
    [meals, selected, range, grouping, now],
  );
  const hasLogs = series.some((point) => point.loggedDays > 0);
  const title =
    grouping === "weekly"
      ? `Average ${label.toLowerCase()} per logged day`
      : `Logged ${label.toLowerCase()} by date`;

  return (
    <section aria-label="Macro trends" className="space-y-3">
      {demo && <p className="text-xs font-medium text-muted-foreground">Demo data</p>}
      <label className="block text-sm">
        Nutrient
        <Select
          className="mt-1"
          value={selected}
          onChange={(event) => setNutrient(event.target.value as NutritionMacro)}
        >
          {Object.entries(NUTRIENTS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      <div className="flex flex-wrap gap-2">
        <div role="group" aria-label="Date range" className="flex gap-1">
          {([7, 30, 90] as const).map((days) => (
            <button
              type="button"
              key={days}
              aria-pressed={range === days}
              onClick={() => setRange(days)}
              className="btn-control rounded-full border border-border px-3 py-2 text-xs font-bold aria-pressed:bg-[var(--section)]"
            >
              {days}D
            </button>
          ))}
        </div>
        <div role="group" aria-label="Group by" className="flex gap-1">
          {(["daily", "weekly"] as const).map((period) => (
            <button
              type="button"
              key={period}
              aria-pressed={grouping === period}
              onClick={() => setGrouping(period)}
              className="btn-control rounded-full border border-border px-3 py-2 text-xs capitalize aria-pressed:bg-[var(--section)]"
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="tile h-56 p-3">
        <h4 className="mb-1 px-2 pt-1 text-xs font-semibold text-muted-foreground">{title}</h4>
        {hasLogs ? (
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--section)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--section)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
              <Tooltip
                formatter={(value: number) => `${value} ${unit}`}
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type="linear"
                dataKey="value"
                name={label}
                connectNulls={false}
                dot={{ r: 2 }}
                stroke="var(--section)"
                strokeWidth={2}
                fill={`url(#${gradient})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="px-2 pt-4 text-sm text-muted-foreground">No meals logged in this period.</p>
        )}
      </div>
      {hasLogs && (
        <details className="text-xs text-muted-foreground">
          <summary>Recorded values by date</summary>
          <ul className="mt-2 space-y-1">
            {series.map((point) => (
              <li key={point.timestamp}>
                {point.label} ·{" "}
                {point.value === null
                  ? "—"
                  : `${point.value} ${unit} · ${point.loggedDays} logged ${point.loggedDays === 1 ? "day" : "days"}`}
                {point.partialDays > 0 && ` · ${point.partialDays} partial`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
