import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Expand,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { BottomSheet } from "@/components/app/sheet";
import {
  DataQualityBadge,
  PremiumCard,
  SectionHeader,
  type DataQualityDetails,
} from "@/components/app/premium-ui";
import { cn } from "@/lib/utils";

export type ChartKind =
  | "line"
  | "area"
  | "bar"
  | "stacked_bar"
  | "scatter"
  | "calendar_heatmap"
  | "distribution"
  | "range"
  | "timeline"
  | "before_after";
export type ComparisonMode = "raw" | "normalized" | "indexed" | "small_multiples";
export type RangeKey = "7d" | "14d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom";

export interface ChartPoint {
  date: string;
  [metric: string]: string | number | null;
}
export interface ChartSeries {
  id: string;
  label: string;
  unit: string;
  color: string;
  axis?: "left" | "right";
  hidden?: boolean;
}
export interface StackItem {
  id: string;
  label: string;
  description?: string;
  pinned?: boolean;
  suggested?: boolean;
  quality?: DataQualityDetails;
  content: ReactNode;
}

const allowedPalette = [
  "#a78bfa",
  "#60a5fa",
  "#f59e0b",
  "#34d399",
  "#f472b6",
  "#22d3ee",
  "#facc15",
  "#c084fc",
];

export function RangeSelector({
  value,
  onChange,
  supported = ["7d", "14d", "30d", "3m", "6m", "1y", "all"],
}: {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
  supported?: RangeKey[];
}) {
  const ranges: { id: RangeKey; label: string }[] = [
    { id: "7d", label: "7D" },
    { id: "14d", label: "14D" },
    { id: "30d", label: "30D" },
    { id: "3m", label: "3M" },
    { id: "6m", label: "6M" },
    { id: "1y", label: "1Y" },
    { id: "all", label: "All" },
  ];
  return (
    <div className="premium-segmented-control" aria-label="Chart range">
      {ranges.map((range) => (
        <button
          key={range.id}
          type="button"
          disabled={!supported.includes(range.id)}
          aria-pressed={value === range.id}
          onClick={() => onChange(range.id)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export function ComparisonSelector({
  value,
  onChange,
}: {
  value: ComparisonMode;
  onChange: (value: ComparisonMode) => void;
}) {
  return (
    <label className="premium-select-label">
      <span>Display</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ComparisonMode)}>
        <option value="raw">Raw values</option>
        <option value="normalized">% change</option>
        <option value="indexed">Indexed to 100</option>
        <option value="small_multiples">Aligned charts</option>
      </select>
    </label>
  );
}

export function ChartLegend({
  series,
  onToggle,
}: {
  series: ChartSeries[];
  onToggle?: (id: string) => void;
}) {
  return (
    <div className="premium-chart-legend" aria-label="Chart metrics">
      {series.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onToggle?.(item.id)}
          aria-pressed={!item.hidden}
          disabled={!onToggle}
        >
          <span style={{ background: item.color }} />
          <span>{item.label}</span>
          <small>{item.unit}</small>
        </button>
      ))}
    </div>
  );
}

export function ChartToolbar({
  range,
  onRangeChange,
  mode,
  onModeChange,
  onAddMetric,
  onCustomize,
  onFocus,
}: {
  range: RangeKey;
  onRangeChange: (value: RangeKey) => void;
  mode: ComparisonMode;
  onModeChange: (value: ComparisonMode) => void;
  onAddMetric?: () => void;
  onCustomize?: () => void;
  onFocus?: () => void;
}) {
  return (
    <div className="premium-chart-toolbar">
      <RangeSelector value={range} onChange={onRangeChange} />
      <div className="flex flex-wrap gap-2">
        <ComparisonSelector value={mode} onChange={onModeChange} />
        {onAddMetric && (
          <button className="premium-icon-action" type="button" onClick={onAddMetric}>
            <Plus size={15} /> Add metric
          </button>
        )}
        {onCustomize && (
          <button className="premium-icon-action" type="button" onClick={onCustomize}>
            <Settings2 size={15} /> Customize
          </button>
        )}
        {onFocus && (
          <button className="premium-icon-action" type="button" onClick={onFocus}>
            <Expand size={15} /> Focus
          </button>
        )}
      </div>
    </div>
  );
}

function normalizeData(data: ChartPoint[], series: ChartSeries[], mode: ComparisonMode) {
  if (mode === "raw" || mode === "small_multiples") return data;
  return data.map((point, index) => {
    const next: ChartPoint = { date: point.date };
    series.forEach((item) => {
      const baseline = Number(data[0]?.[item.id]);
      const value = Number(point[item.id]);
      next[item.id] =
        Number.isFinite(value) && Number.isFinite(baseline) && baseline !== 0
          ? mode === "indexed"
            ? (value / baseline) * 100
            : ((value - baseline) / Math.abs(baseline)) * 100
          : null;
    });
    next.__index = index;
    return next;
  });
}

export function ComparisonChart({
  title,
  description,
  data,
  series,
  kind = "line",
  mode,
  onModeChange,
  selectedDate,
  onSelectedDateChange,
  onOpenEntry,
  quality = { state: "ready" },
  annotations = [],
  animate = true,
  compact = false,
  onFocus,
}: {
  title: string;
  description?: string;
  data: ChartPoint[];
  series: ChartSeries[];
  kind?: ChartKind;
  mode: ComparisonMode;
  onModeChange: (value: ComparisonMode) => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
  onOpenEntry?: (date: string) => void;
  quality?: DataQualityDetails;
  annotations?: { date: string; label: string }[];
  animate?: boolean;
  compact?: boolean;
  onFocus?: () => void;
}) {
  const [hidden, setHidden] = useState<string[]>(
    series.filter((item) => item.hidden).map((item) => item.id),
  );
  const visibleSeries = series.filter((item) => !hidden.includes(item.id));
  const plotData = useMemo(
    () => normalizeData(data, visibleSeries, mode),
    [data, visibleSeries, mode],
  );
  const selectedIndex = Math.max(
    0,
    plotData.findIndex((point) => point.date === selectedDate),
  );
  const selected = plotData[selectedIndex] ?? plotData.at(-1);
  const excessive = visibleSeries.length > 5;
  const rawAxes = new Set(visibleSeries.map((item) => item.axis ?? "left"));

  const moveSelection = (direction: number) => {
    if (!plotData.length) return;
    const next = Math.min(
      plotData.length - 1,
      Math.max(0, (selectedIndex < 0 ? plotData.length - 1 : selectedIndex) + direction),
    );
    onSelectedDateChange?.(plotData[next].date);
  };

  const chartProps = { data: plotData, margin: { top: 12, right: 8, left: -18, bottom: 2 } };
  const common = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 5" />
      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis yAxisId="left" tickLine={false} axisLine={false} width={42} />
      {rawAxes.has("right") && mode === "raw" && (
        <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={42} />
      )}
      <Tooltip contentStyle={{ display: "none" }} />
      {annotations.map((annotation) => (
        <ReferenceLine
          key={`${annotation.date}-${annotation.label}`}
          x={annotation.date}
          stroke="rgba(255,255,255,.22)"
          strokeDasharray="2 4"
        />
      ))}
    </>
  );
  const lines = visibleSeries.map((item) => (
    <Line
      key={item.id}
      type="monotone"
      dataKey={item.id}
      yAxisId={mode === "raw" ? (item.axis ?? "left") : "left"}
      stroke={item.color}
      strokeWidth={2.5}
      dot={false}
      activeDot={{ r: 5 }}
      isAnimationActive={animate}
    />
  ));
  let chart: ReactNode;
  if (kind === "area")
    chart = (
      <AreaChart {...chartProps}>
        {common}
        {visibleSeries.map((item) => (
          <Area
            key={item.id}
            type="monotone"
            dataKey={item.id}
            yAxisId={mode === "raw" ? (item.axis ?? "left") : "left"}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.12}
            strokeWidth={2.5}
            isAnimationActive={animate}
          />
        ))}
      </AreaChart>
    );
  else if (kind === "bar" || kind === "stacked_bar")
    chart = (
      <BarChart {...chartProps}>
        {common}
        {visibleSeries.map((item) => (
          <Bar
            key={item.id}
            dataKey={item.id}
            yAxisId={mode === "raw" ? (item.axis ?? "left") : "left"}
            fill={item.color}
            radius={[4, 4, 0, 0]}
            stackId={kind === "stacked_bar" ? "stack" : undefined}
            isAnimationActive={animate}
          />
        ))}
      </BarChart>
    );
  else if (kind === "scatter")
    chart = (
      <ScatterChart {...chartProps}>
        {common}
        <ZAxis range={[50, 50]} />
        {visibleSeries.map((item) => (
          <Scatter
            key={item.id}
            dataKey={item.id}
            yAxisId={mode === "raw" ? (item.axis ?? "left") : "left"}
            fill={item.color}
            line
            isAnimationActive={animate}
          />
        ))}
      </ScatterChart>
    );
  else
    chart = (
      <LineChart {...chartProps}>
        {common}
        {lines}
      </LineChart>
    );

  return (
    <PremiumCard
      className={cn("premium-chart-shell", compact && "premium-chart-shell--compact")}
      as="section"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Comparison</p>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
          {description && <p className="mt-1 text-xs leading-5 text-white/45">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DataQualityBadge quality={quality} compact />
          {onFocus && (
            <button className="premium-icon-action" type="button" onClick={onFocus}>
              <Expand size={15} /> Focus
            </button>
          )}
        </div>
      </div>
      {excessive && (
        <div className="premium-chart-warning" role="status">
          Six metrics are visible. Hide a series or use aligned charts for a clearer comparison.
        </div>
      )}
      {rawAxes.size > 2 && (
        <div className="premium-chart-warning" role="alert">
          Raw comparison supports no more than two axes. Choose normalized or aligned charts.
        </div>
      )}
      <div className="mt-4">
        <ComparisonSelector value={mode} onChange={onModeChange} />
      </div>
      <ChartLegend
        series={series.map((item) => ({ ...item, hidden: hidden.includes(item.id) }))}
        onToggle={(id) =>
          setHidden((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
          )
        }
      />
      <div
        className="premium-chart-plot"
        role="img"
        aria-label={`${title}. ${visibleSeries.map((item) => `${item.label} in ${item.unit}`).join(", ")}. ${plotData.length} recorded dates.`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveSelection(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveSelection(1);
          }
        }}
        onPointerMove={(event) => {
          if (
            !onSelectedDateChange ||
            !plotData.length ||
            (event.pointerType === "mouse" && event.buttons === 0)
          )
            return;
          const rect = event.currentTarget.getBoundingClientRect();
          const index = Math.round(
            ((event.clientX - rect.left) / rect.width) * (plotData.length - 1),
          );
          onSelectedDateChange(plotData[Math.min(plotData.length - 1, Math.max(0, index))].date);
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chart as never}
        </ResponsiveContainer>
      </div>
      {selected && (
        <div className="premium-chart-detail" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="premium-round-action"
              aria-label="Previous date"
              onClick={() => moveSelection(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <div className="text-center">
              <p className="text-xs font-semibold text-white/45">Selected date</p>
              <p className="mt-0.5 font-semibold">{selected.date}</p>
            </div>
            <button
              type="button"
              className="premium-round-action"
              aria-label="Next date"
              onClick={() => moveSelection(1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visibleSeries.map((item) => (
              <div key={item.id}>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {item.label}
                </span>
                <strong className="tabular-nums" style={{ color: item.color }}>
                  {selected[item.id] == null
                    ? "—"
                    : Number(selected[item.id]).toFixed(mode === "raw" ? 0 : 1)}{" "}
                  {mode === "raw" ? item.unit : mode === "indexed" ? "index" : "%"}
                </strong>
              </div>
            ))}
          </div>
          {onOpenEntry && (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--section)]"
              onClick={() => onOpenEntry(selected.date)}
            >
              Open logged entry
            </button>
          )}
        </div>
      )}
    </PremiumCard>
  );
}

export function PinnedAnalyticsStack({
  items,
  selectedId,
  pinnedId,
  onSelectedIdChange,
  onPinChange,
  onDismissSuggested,
  onCustomize,
  onReorder,
  ariaLabel = "Analytics charts",
}: {
  items: StackItem[];
  selectedId?: string;
  pinnedId?: string;
  onSelectedIdChange: (id: string) => void;
  onPinChange?: (id?: string) => void;
  onDismissSuggested?: (id: string) => void;
  onCustomize?: () => void;
  onReorder?: (id: string, direction: -1 | 1) => void;
  ariaLabel?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const ignoreScrollSelection = useRef(false);
  const ignoreScrollTimer = useRef<number | undefined>(undefined);
  const [localSelectedId, setLocalSelectedId] = useState(selectedId);
  const activeId = items.some((item) => item.id === localSelectedId)
    ? localSelectedId!
    : items.some((item) => item.id === selectedId)
      ? selectedId!
      : items.some((item) => item.id === pinnedId)
        ? pinnedId!
        : items[0]?.id;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  const selectClosestVisibleItem = () => {
    const element = viewport.current;
    if (!element || ignoreScrollSelection.current) return;
    const children = Array.from(element.children) as HTMLElement[];
    const center = element.scrollLeft + element.clientWidth / 2;
    let closest = activeIndex;
    let distance = Infinity;
    children.forEach((child, index) => {
      const current = Math.abs(child.offsetLeft + child.offsetWidth / 2 - center);
      if (current < distance) {
        distance = current;
        closest = index;
      }
    });
    if (items[closest] && items[closest].id !== activeId) onSelectedIdChange(items[closest].id);
  };
  const select = (index: number) => {
    const item = items[Math.min(items.length - 1, Math.max(0, index))];
    if (!item) return;
    setLocalSelectedId(item.id);
    onSelectedIdChange(item.id);
    const container = viewport.current;
    const child = container?.children[index] as HTMLElement | undefined;
    if (container && child) {
      ignoreScrollSelection.current = true;
      window.clearTimeout(ignoreScrollTimer.current);
      container.scrollLeft = child.offsetLeft - (container.clientWidth - child.offsetWidth) / 2;
      ignoreScrollTimer.current = window.setTimeout(() => {
        ignoreScrollSelection.current = false;
      }, 450);
    }
  };
  return (
    <section
      className="premium-stack"
      data-active-chart={activeId}
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          select(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          select(activeIndex + 1);
        }
      }}
    >
      <div className="premium-stack__header">
        <div>
          <p className="eyebrow">Pinned analytics</p>
          <p className="mt-1 text-sm text-white/45">
            {items[activeIndex]?.label} · {activeIndex + 1} of {items.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="premium-round-action"
            aria-label="Previous chart"
            disabled={activeIndex === 0}
            onPointerDown={() => select(activeIndex - 1)}
            onClick={(event) => {
              if (event.detail === 0) select(activeIndex - 1);
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="premium-round-action"
            aria-label="Next chart"
            disabled={activeIndex === items.length - 1}
            onPointerDown={() => select(activeIndex + 1)}
            onClick={(event) => {
              if (event.detail === 0) select(activeIndex + 1);
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className="premium-stack__viewport"
        tabIndex={0}
        onPointerUp={() => window.setTimeout(selectClosestVisibleItem, 120)}
      >
        {items.map((item, index) => (
          <article
            key={item.id}
            className="premium-stack__item"
            data-selected={item.id === activeId}
            aria-label={`${item.label}${item.id === pinnedId ? ", pinned" : ""}${item.suggested ? ", suggested" : ""}`}
          >
            <div className="premium-stack__item-header">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold">{item.label}</h3>
                  {item.id === pinnedId && (
                    <span className="premium-mini-label">
                      <Pin size={11} /> Pinned
                    </span>
                  )}
                  {item.suggested && (
                    <span className="premium-mini-label" data-suggested="true">
                      Suggested
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-white/40">{item.description}</p>
                )}
              </div>
              {item.quality && <DataQualityBadge quality={item.quality} compact />}
            </div>
            <div className="mt-4">{item.content}</div>
            <div className="premium-stack__actions">
              <button
                type="button"
                onClick={() => onPinChange?.(item.id === pinnedId ? undefined : item.id)}
              >
                {item.id === pinnedId ? <PinOff size={15} /> : <Pin size={15} />}
                {item.id === pinnedId ? "Unpin" : "Pin"}
              </button>
              {onReorder && (
                <>
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move ${item.label} earlier`}
                    onClick={() => onReorder(item.id, -1)}
                  >
                    <ArrowLeft size={15} /> Earlier
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.label} later`}
                    onClick={() => onReorder(item.id, 1)}
                  >
                    <ArrowRight size={15} /> Later
                  </button>
                </>
              )}
              {item.suggested && onDismissSuggested && (
                <button type="button" onClick={() => onDismissSuggested(item.id)}>
                  <X size={15} /> Dismiss
                </button>
              )}
              <button type="button" aria-label={`More actions for ${item.label}`}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="premium-stack__footer">
        <div className="flex gap-1" aria-label="Chart position">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.label}`}
              aria-current={item.id === activeId ? "true" : undefined}
              onClick={() => select(items.findIndex((candidate) => candidate.id === item.id))}
            />
          ))}
        </div>
        {onCustomize && (
          <button type="button" className="premium-icon-action" onClick={onCustomize}>
            <Settings2 size={15} /> Customize
          </button>
        )}
      </div>
    </section>
  );
}

export function ChartCustomizationPanel({
  items,
  pinnedId,
  onPinChange,
  onReorder,
  onRename,
  onDuplicate,
  onRemove,
  onReset,
}: {
  items: Pick<StackItem, "id" | "label">[];
  pinnedId?: string;
  onPinChange: (id?: string) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/55">Choose the default and active order.</p>
        <button type="button" className="premium-icon-action" onClick={onReset}>
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      {items.map((item, index) => (
        <PremiumCard key={item.id} className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs text-white/35">
                {item.id === pinnedId ? "Default chart" : `Position ${index + 1}`}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                className="premium-round-action"
                type="button"
                aria-label={`Move ${item.label} up`}
                disabled={index === 0}
                onClick={() => onReorder(item.id, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="premium-round-action"
                type="button"
                aria-label={`Move ${item.label} down`}
                disabled={index === items.length - 1}
                onClick={() => onReorder(item.id, 1)}
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
          <div className="premium-stack__actions mt-3">
            <button
              type="button"
              onClick={() => onPinChange(item.id === pinnedId ? undefined : item.id)}
            >
              {item.id === pinnedId ? <PinOff size={15} /> : <Pin size={15} />}
              {item.id === pinnedId ? "Unpin" : "Pin"}
            </button>
            <button type="button" onClick={() => onRename(item.id)}>
              Rename
            </button>
            <button type="button" onClick={() => onDuplicate(item.id)}>
              Duplicate
            </button>
            <button type="button" onClick={() => onRemove(item.id)}>
              Remove
            </button>
          </div>
        </PremiumCard>
      ))}
    </div>
  );
}

export function ChartFocusMode({
  open,
  onClose,
  title,
  chart,
  series,
  range,
  onRangeChange,
  mode,
  onModeChange,
  onSave,
  onReturnContext,
  annotations,
  data,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  chart: ReactNode;
  series: ChartSeries[];
  range: RangeKey;
  onRangeChange: (value: RangeKey) => void;
  mode: ComparisonMode;
  onModeChange: (value: ComparisonMode) => void;
  onSave?: () => void;
  onReturnContext?: () => void;
  annotations?: { date: string; label: string }[];
  data?: ChartPoint[];
}) {
  const [showTable, setShowTable] = useState(false);
  const close = () => {
    onClose();
    onReturnContext?.();
  };
  return (
    <BottomSheet open={open} onClose={close} title={title} height="full">
      <div className="premium-focus-mode">
        <ChartToolbar
          range={range}
          onRangeChange={onRangeChange}
          mode={mode}
          onModeChange={onModeChange}
        />
        <ChartLegend series={series} />
        <div className="premium-focus-mode__plot">{chart}</div>
        {annotations?.length ? (
          <div>
            <SectionHeader title="Annotations" />
            <div className="mt-2 space-y-2">
              {annotations.map((item) => (
                <div key={`${item.date}-${item.label}`} className="premium-annotation">
                  <span>{item.date}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="premium-icon-action w-full justify-center"
          onClick={() => setShowTable((value) => !value)}
          aria-expanded={showTable}
        >
          Data table
        </button>
        {showTable && data && (
          <div className="overflow-x-auto">
            <table className="premium-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {series.map((item) => (
                    <th key={item.id}>{item.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((point) => (
                  <tr key={point.date}>
                    <td>{point.date}</td>
                    {series.map((item) => (
                      <td key={item.id}>{String(point[item.id] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {onSave && (
          <button type="button" className="premium-primary-action" onClick={onSave}>
            <Save size={17} /> Save chart
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

export { allowedPalette as fitCoreChartPalette };
