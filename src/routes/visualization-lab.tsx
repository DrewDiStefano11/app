import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowLeft, Expand, Settings2 } from "lucide-react";
import { BottomSheet } from "@/components/app/sheet";
import {
  HeroSurface,
  NeedsMoreDataState,
  SectionHeader,
  SectionTheme,
  StaleState,
  StatusBadge,
} from "@/components/app/premium-ui";
import {
  ChartCustomizationPanel,
  ChartFocusMode,
  ComparisonChart,
  PinnedAnalyticsStack,
  fitCoreChartPalette,
  type ChartPoint,
  type ChartSeries,
  type ComparisonMode,
  type RangeKey,
  type StackItem,
} from "@/components/app/premium-visualization";

export const Route = createFileRoute("/visualization-lab")({
  head: () => ({
    meta: [
      { title: "FitCore Visualization Lab" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisualizationLabRoute,
});

const fixtureData: ChartPoint[] = [
  { date: "Mon", readiness: 68, sleep: 6.5, volume: 8200 },
  { date: "Tue", readiness: 72, sleep: 7.1, volume: 10400 },
  { date: "Wed", readiness: 70, sleep: 6.8, volume: 0 },
  { date: "Thu", readiness: 78, sleep: 7.7, volume: 11800 },
  { date: "Fri", readiness: 81, sleep: 8.0, volume: 9200 },
  { date: "Sat", readiness: 76, sleep: 7.4, volume: 0 },
  { date: "Sun", readiness: 84, sleep: 8.2, volume: 12600 },
];

const comparisonSeries: ChartSeries[] = [
  { id: "readiness", label: "Readiness", unit: "pts", color: fitCoreChartPalette[0], axis: "left" },
  { id: "sleep", label: "Sleep", unit: "hr", color: fitCoreChartPalette[1], axis: "right" },
];

function MiniTrend({ metric, color }: { metric: "readiness" | "sleep" | "volume"; color: string }) {
  return (
    <div className="h-36" role="img" aria-label={`${metric} preview across seven recorded days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={fixtureData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#mini-${metric})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function VisualizationLabRoute() {
  if (import.meta.env.PROD) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Visualization lab is development-only</h1>
          <Link to="/" className="mt-4 inline-flex text-sm text-primary">
            Return to FitCore
          </Link>
        </div>
      </main>
    );
  }
  return <VisualizationLab />;
}

function VisualizationLab() {
  const [hydrated, setHydrated] = useState(false);
  const initialItems = [
    {
      id: "readiness",
      label: "Readiness rhythm",
      description: "Seven recorded days",
      quality: { state: "ready" as const, confidence: "high" as const },
      content: <MiniTrend metric="readiness" color={fitCoreChartPalette[0]} />,
    },
    {
      id: "sleep",
      label: "Sleep consistency",
      description: "Suggested from this week's change",
      suggested: true,
      quality: { state: "partial" as const, confidence: "medium" as const },
      content: <MiniTrend metric="sleep" color={fitCoreChartPalette[1]} />,
    },
    {
      id: "volume",
      label: "Training volume",
      description: "Work sets from logged sessions",
      quality: { state: "stale" as const },
      content: <MiniTrend metric="volume" color={fitCoreChartPalette[3]} />,
    },
  ];
  const [items, setItems] = useState<StackItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState("readiness");
  const [pinnedId, setPinnedId] = useState<string | undefined>("readiness");
  const [mode, setMode] = useState<ComparisonMode>("raw");
  const [range, setRange] = useState<RangeKey>("7d");
  const [selectedDate, setSelectedDate] = useState("Sun");
  const [focusOpen, setFocusOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setHydrated(true), []);

  const chart = useMemo(
    () => (
      <ComparisonChart
        title="Sleep vs readiness"
        description="Two compatible signals across seven recorded days."
        data={fixtureData}
        series={comparisonSeries}
        kind="area"
        mode={mode}
        onModeChange={setMode}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        quality={{ state: "ready", confidence: "high", sampleSize: 7, completeness: 100 }}
        annotations={[{ date: "Thu", label: "Lower-body workout" }]}
        animate={false}
      />
    ),
    [mode, selectedDate],
  );

  const reorder = (id: string, direction: -1 | 1) =>
    setItems((current) => {
      const from = current.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  return (
    <SectionTheme
      section="home"
      className="min-h-screen bg-[var(--surface-base)] text-white"
      data-hydrated={hydrated}
    >
      <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 pb-20 pt-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Development proof</p>
            <h1 className="mt-1 text-2xl font-semibold">Premium foundation</h1>
          </div>
          <Link to="/" className="premium-icon-action">
            <ArrowLeft size={15} /> App
          </Link>
        </div>
        <div className="space-y-8">
          <HeroSurface
            eyebrow="FitCore score"
            value="82"
            unit="/ 100"
            status="Ready for productive training"
            supportingFact="Readiness improved 4 points across seven recorded days."
            action={
              <button type="button" className="premium-primary-action w-full">
                <Expand size={17} /> Review contributors
              </button>
            }
          >
            <div className="mt-4">
              <StatusBadge tone="success">Measured · high confidence</StatusBadge>
            </div>
          </HeroSurface>

          <section>
            <SectionHeader
              eyebrow="Daily analytics"
              title="Signals worth watching"
              description="Swipe, use the arrow buttons, or press left and right arrow keys."
              action={
                <button
                  type="button"
                  className="premium-round-action"
                  aria-label="Customize analytics"
                  onClick={() => setCustomizeOpen(true)}
                >
                  <Settings2 size={17} />
                </button>
              }
            />
            <div className="mt-4">
              <PinnedAnalyticsStack
                items={items}
                selectedId={selectedId}
                pinnedId={pinnedId}
                onSelectedIdChange={setSelectedId}
                onPinChange={setPinnedId}
                onDismissSuggested={(id) =>
                  setItems((current) => current.filter((item) => item.id !== id))
                }
                onCustomize={() => setCustomizeOpen(true)}
                onReorder={reorder}
              />
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="Universal comparison"
              title="Understand connected signals"
              description="Exact values stay available below the chart on mobile."
              action={
                <button
                  type="button"
                  className="premium-icon-action"
                  onClick={() => setFocusOpen(true)}
                >
                  <Expand size={15} /> Focus
                </button>
              }
            />
            <div className="mt-4">{chart}</div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <NeedsMoreDataState
              requiredHistory={3}
              message="Log three more recovery check-ins to unlock a reliable soreness comparison."
            />
            <StaleState
              message="Your last wearable sync was four days ago. Manual logs remain available."
              action={
                <button type="button" className="premium-icon-action">
                  Review sources
                </button>
              }
            />
          </section>
        </div>
      </main>

      <BottomSheet
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize analytics"
        height="tall"
      >
        <ChartCustomizationPanel
          items={items}
          pinnedId={pinnedId}
          onPinChange={setPinnedId}
          onReorder={reorder}
          onRename={(id) =>
            setItems((current) =>
              current.map((item) =>
                item.id === id ? { ...item, label: `${item.label} · custom` } : item,
              ),
            )
          }
          onDuplicate={(id) =>
            setItems((current) => {
              const source = current.find((item) => item.id === id);
              return source
                ? [
                    ...current,
                    {
                      ...source,
                      id: `${source.id}-copy-${current.length}`,
                      label: `${source.label} copy`,
                      suggested: false,
                    },
                  ]
                : current;
            })
          }
          onRemove={(id) => setItems((current) => current.filter((item) => item.id !== id))}
          onReset={() => {
            setItems(initialItems);
            setPinnedId("readiness");
            setSelectedId("readiness");
          }}
        />
      </BottomSheet>

      <ChartFocusMode
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        title="Sleep vs readiness"
        chart={chart}
        series={comparisonSeries}
        range={range}
        onRangeChange={setRange}
        mode={mode}
        onModeChange={setMode}
        onSave={() => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1400);
        }}
        onReturnContext={() =>
          document
            .querySelector<HTMLElement>(
              "[aria-label='Sleep vs readiness. Readiness in pts, Sleep in hr. 7 recorded dates.']",
            )
            ?.focus()
        }
        annotations={[{ date: "Thu", label: "Lower-body workout" }]}
        data={fixtureData}
      />
      {saved && (
        <div
          className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-emerald-400/30 bg-emerald-950/95 px-4 py-2 text-sm font-semibold text-emerald-300"
          role="status"
        >
          Chart saved in this view
        </div>
      )}
    </SectionTheme>
  );
}
