import { useState, useMemo } from "react";
import {
  Camera,
  Plus,
  Trash2,
  Image as ImageIcon,
  Scale,
  Target,
  Sparkles,
  TrendingUp,
  Info,
  Activity,
  History,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Zap,
  LineChart,
  Flame,
} from "lucide-react";

import { useStore, uid } from "@/lib/store";
import { fitcoreScore, weeklyVolumeSeries, bodyweightDelta, momentumScore } from "@/lib/analytics";
import type { ProgressPhoto } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import {
  Card,
  StatCard,
  PageHeader,
  PrimaryButton,
  EmptyState,
  Label,
  Input,
  Select,
  SubTabs,
  SectionHeader,
  Chip,
  Ring,
  PlannedFeatureCard,
  CompactMetricCard,
  ExpandableCard,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

type DeepDiveTab = "analytics" | "body" | "goals" | "insights";
const DEEP_DIVE_TABS: { id: DeepDiveTab; label: string }[] = [
  { id: "analytics", label: "Analytics" },
  { id: "body", label: "Body" },
  { id: "goals", label: "Goals" },
  { id: "insights", label: "Insights" },
];

export function ProgressView({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const [tab, setTab] = useState<DeepDiveTab>("analytics");
  const isDeepDive = layoutMode === "deepDive";
  return (
    <div className="pb-24" style={{ "--section": "var(--gold)" } as any}>
      <PageHeader
        title="Progress"
        subtitle={`Your trends and milestones - ${isDeepDive ? "Deep Dive" : "Daily View"}`}
      />
      {!isDeepDive ? (
        <DailyViewContent />
      ) : (
        <>
          <SubTabs tabs={DEEP_DIVE_TABS} active={tab} onChange={setTab} />
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "body" && <BodyTab />}
          {tab === "goals" && <GoalsTab />}
          {tab === "insights" && <InsightsTab />}
        </>
      )}
    </div>
  );
}

/* ===================== DAILY VIEW ===================== */

function DailyViewContent() {
  const { state, set } = useStore();
  const [w, setW] = useState(String(state.profile.bodyweightLb));
  const [openDetail, setOpenDetail] = useState<"weight" | "goals" | "momentum" | "photo" | null>(
    null,
  );
  const [openPhoto, setOpenPhoto] = useState(false);

  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const bw = state.profile.bodyweightLb;
  const target = state.profile.targetBodyweightLb;
  const dWeek = bodyweightDelta(state, 7) ?? 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const week = sortedBw.filter((e) => e.createdAt > weekAgo);
  const weekAvg = week.length
    ? (week.reduce((a, e) => a + e.weightLb, 0) / week.length).toFixed(1)
    : "—";

  const topGoals = state.goals.filter((g) => g.pinned).slice(0, 2);
  const goalList = topGoals.length ? topGoals : state.goals.slice(0, 2);

  const mScore = momentumScore(state);

  const submitWeighIn = () => {
    const wt = Number(w);
    if (!wt) return;
    set((s) => ({
      ...s,
      bodyweightEntries: [
        ...s.bodyweightEntries,
        { id: uid(), weightLb: wt, createdAt: Date.now() },
      ],
      profile: { ...s.profile, bodyweightLb: wt },
      goals: s.goals.map((g) => (g.type === "bodyweight" ? { ...g, current: wt } : g)),
    }));
    setW("");
  };

  const latestPhoto =
    state.progressPhotos.length > 0 ? state.progressPhotos[state.progressPhotos.length - 1] : null;
  const latestWeight = sortedBw.length > 0 ? sortedBw[sortedBw.length - 1].weightLb : null;

  return (
    <div className="px-5 space-y-4">
      {/* Weigh In Action */}
      <Card className="bg-[var(--surface-2)]">
        <p className="text-sm font-medium mb-2 flex items-center gap-1">
          <Scale size={16} className="text-[var(--section)]" /> Log Weigh In
        </p>
        <div className="flex gap-2">
          <Input
            className="flex-1 bg-background"
            inputMode="decimal"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder="Weight in lb"
          />
          <PrimaryButton onClick={submitWeighIn}>Save</PrimaryButton>
        </div>
      </Card>

      {/* Weight Trend Card */}
      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setOpenDetail("weight")}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp size={16} className="text-[var(--section)]" /> Current Weight
            </p>
            <p className="text-2xl font-bold mt-1">
              {latestWeight ?? bw}{" "}
              <span className="text-sm font-normal text-muted-foreground">lb</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dWeek === 0
                ? "Stable"
                : `${dWeek > 0 ? "Up" : "Down"} ${Math.abs(dWeek).toFixed(1)} lb this week`}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        {sortedBw.length < 2 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl">
            Log at least 2 weigh-ins for trend line
          </p>
        ) : (
          <Sparkline points={sortedBw.map((b) => b.weightLb)} unit=" lb" />
        )}
      </Card>

      {/* Goal Progress Card */}
      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setOpenDetail("goals")}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold flex items-center gap-1">
              <Target size={16} className="text-[var(--section)]" /> Goal Progress
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Moving toward your targets</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        {goalList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center border border-dashed rounded-xl">
            No active goals
          </p>
        ) : (
          <div className="space-y-2 mt-2">
            {goalList.map((g) => {
              const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{g.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round(g.current)}/{g.target}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: "var(--section)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {/* Momentum Card */}
        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform flex flex-col justify-between"
          onClick={() => setOpenDetail("momentum")}
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
              <Zap size={14} className="text-[var(--section)]" /> Momentum
            </p>
            <p className="font-semibold leading-tight">{mScore.label}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {mScore.hasData ? mScore.explanation : "Need data"}
          </p>
        </Card>

        {/* Photo Card */}
        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform flex flex-col justify-between p-0 overflow-hidden relative min-h-[100px]"
          onClick={() => setOpenDetail("photo")}
        >
          {latestPhoto ? (
            <>
              <img
                src={latestPhoto.dataUrl}
                alt="Latest progress"
                className="w-full h-full object-cover absolute inset-0 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Camera size={14} /> Latest Update
                </p>
                <p className="text-[10px] opacity-80">
                  {new Date(latestPhoto.createdAt).toLocaleDateString()}
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 h-full flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Camera size={14} /> Photos
              </p>
              <p className="font-semibold text-sm">Add Update</p>
            </div>
          )}
        </Card>
      </div>

      <PlannedFeatureCard
        title="Top Insight"
        status="Planned"
        description="Your top progress insight and suggested next action will appear here."
      />
      <PhotoSheet open={openPhoto} onClose={() => setOpenPhoto(false)} />

      {/* DETAIL SHEETS */}
      <BottomSheet
        open={openDetail === "weight"}
        onClose={() => setOpenDetail(null)}
        title="Weight Trend Context"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This week's average is <strong className="text-foreground">{weekAvg} lb</strong>, and
            you've seen a change of{" "}
            <strong className="text-foreground">
              {dWeek > 0 ? "+" : ""}
              {dWeek.toFixed(1)} lb
            </strong>{" "}
            over the last 7 days.
          </p>
          <p className="text-sm text-muted-foreground">
            Remember that daily weight fluctuates based on hydration, sodium, digestion, and stress.
            The trend line is more important than the daily number.
          </p>
          <div className="bg-[var(--surface-2)] p-4 rounded-xl text-sm">
            Target: {target} lb ({target - bw >= 0 ? "+" : ""}
            {(target - bw).toFixed(1)} lb to go)
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openDetail === "goals"}
        onClose={() => setOpenDetail(null)}
        title="Goal Progress"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your pinned goals are tracking your most important targets. Consistency in training and
            nutrition will drive these bars forward.
          </p>
          {goalList.length === 0 ? (
            <p className="text-sm">No goals active right now. Add them on the Home screen.</p>
          ) : null}
          {goalList.map((g) => (
            <div key={g.id} className="bg-[var(--surface-2)] p-4 rounded-xl text-sm">
              <p className="font-medium mb-1">{g.label}</p>
              <p className="text-muted-foreground">
                Current: {g.current} / Target: {g.target}
              </p>
            </div>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={openDetail === "momentum"}
        onClose={() => setOpenDetail(null)}
        title="Momentum Score"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Momentum combines your consistency across training, nutrition logging, and recovery
            check-ins. {mScore.explanation}
          </p>
          {mScore.factors.map((f) => (
            <div key={f.id} className="bg-[var(--surface-2)] p-3 rounded-xl text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium capitalize">{f.label}</span>
                <span className="font-bold text-[var(--section)]">{f.score}</span>
              </div>
              <p className="text-xs text-muted-foreground">{f.detail}</p>
            </div>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={openDetail === "photo"}
        onClose={() => setOpenDetail(null)}
        title="Body Updates"
      >
        <div className="space-y-4 text-center pt-2">
          {latestPhoto ? (
            <img src={latestPhoto.dataUrl} alt="Latest progress" className="w-full rounded-xl" />
          ) : (
            <div className="py-8 text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm">No photos added yet.</p>
            </div>
          )}
          <PrimaryButton
            className="w-full"
            onClick={() => {
              setOpenDetail(null);
              setTimeout(() => setOpenPhoto(true), 150);
            }}
          >
            <Plus size={16} /> Add New Photo
          </PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  );
}

function BodyTab() {
  const { state } = useStore();
  const [expanded, setExpanded] = useState<"photos" | "history" | null>(null);

  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const bw = state.profile.bodyweightLb;
  const latestWeight = sortedBw.length > 0 ? sortedBw[sortedBw.length - 1].weightLb : bw;
  const dWeek = bodyweightDelta(state, 7) ?? 0;

  return (
    <div className="px-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Current Weight" value={latestWeight.toString()} sub="lb" accent />
        <StatCard
          label="Weekly Change"
          value={`${dWeek >= 0 ? "+" : ""}${dWeek.toFixed(1)}`}
          sub="lb"
        />
      </div>

      <SectionHeader title="Log Bodyweight" />
      <WeightSection />

      <SectionHeader title="Body Composition & Measurements" />
      <div className="space-y-2">
        <PlannedFeatureCard
          title="Body Measurements"
          status="Planned"
          description="Track waist, chest, arms, legs, and other body measurements here."
        />
        <PlannedFeatureCard
          title="Body Composition"
          status="Planned"
          description="Lean mass and body fat percentage trends."
        />
      </div>

      <ExpandableCard
        title="Progress Photos"
        icon={<Camera size={18} className="text-[var(--section)]" />}
        expanded={expanded === "photos"}
        onToggle={() => setExpanded((e) => (e === "photos" ? null : "photos"))}
      >
        <div className="pt-2">
          <PhotosSection />
        </div>
      </ExpandableCard>

      <ExpandableCard
        title="Visual Timeline & History"
        icon={<History size={18} className="text-[var(--section)]" />}
        expanded={expanded === "history"}
        onToggle={() => setExpanded((e) => (e === "history" ? null : "history"))}
      >
        <div className="pt-2">
          <ProgressHistoryTab />
          <div className="mt-4">
            <PlannedFeatureCard
              title="Visual Comparison"
              status="Planned"
              description="Side-by-side progress photo timeline features."
            />
          </div>
        </div>
      </ExpandableCard>
    </div>
  );
}

function WeightSection() {
  const { state, set } = useStore();
  const [w, setW] = useState(String(state.profile.bodyweightLb));
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const last = sorted[sorted.length - 1];
  const weekAgo = Date.now() - 7 * 86400000,
    monthAgo = Date.now() - 30 * 86400000;
  const week = sorted.filter((e) => e.createdAt > weekAgo);
  const weekAvg = week.length
    ? (week.reduce((a, e) => a + e.weightLb, 0) / week.length).toFixed(1)
    : "—";
  const lastWeek = sorted.find((e) => e.createdAt < weekAgo);
  const lastMonth = sorted.find((e) => e.createdAt < monthAgo);
  const dWeek = last && lastWeek ? last.weightLb - lastWeek.weightLb : 0;
  const dMonth = last && lastMonth ? last.weightLb - lastMonth.weightLb : 0;

  const submit = () => {
    const wt = Number(w);
    if (!wt) return;
    set((s) => ({
      ...s,
      bodyweightEntries: [
        ...s.bodyweightEntries,
        { id: uid(), weightLb: wt, createdAt: Date.now() },
      ],
      profile: { ...s.profile, bodyweightLb: wt },
      goals: s.goals.map((g) => (g.type === "bodyweight" ? { ...g, current: wt } : g)),
    }));
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Wk avg" value={weekAvg} sub="lb" accent />
        <StatCard label="Δ 7d" value={`${dWeek >= 0 ? "+" : ""}${dWeek.toFixed(1)}`} sub="lb" />
        <StatCard label="Δ 30d" value={`${dMonth >= 0 ? "+" : ""}${dMonth.toFixed(1)}`} sub="lb" />
      </div>

      <SectionHeader title="Log new" />
      <div className="flex gap-2">
        <Input
          className="flex-1"
          inputMode="decimal"
          value={w}
          onChange={(e) => setW(e.target.value)}
          placeholder="Weight in lb"
        />
        <PrimaryButton onClick={submit}>Save</PrimaryButton>
      </div>

      <SectionHeader title="Recent weigh-ins" />
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="No weigh-ins"
          description="Track weekly for real trends."
        />
      ) : (
        <div className="space-y-2">
          {[...sorted]
            .reverse()
            .slice(0, 15)
            .map((e) => (
              <Card key={e.id}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold tabular-nums">{e.weightLb} lb</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    aria-label="Delete weigh-in"
                    onClick={() => setConfirmDel(e.id)}
                    className="text-muted-foreground"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({
            ...s,
            bodyweightEntries: s.bodyweightEntries.filter((x) => x.id !== confirmDel),
          }));
          setConfirmDel(null);
        }}
        title="Delete weigh-in?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}

function PhotosSection() {
  const { state, set } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ProgressPhoto | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  return (
    <>
      <PrimaryButton className="w-full" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add photo
      </PrimaryButton>
      <SectionHeader title="Timeline" />
      {state.progressPhotos.length === 0 ? (
        <EmptyState
          icon={<Camera size={22} />}
          title="No photos yet"
          description="Photos tell the real story. Add one weekly."
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[...state.progressPhotos].reverse().map((p) => (
            <button
              key={p.id}
              aria-label={`View ${p.view} photo`}
              onClick={() => setView(p)}
              className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative active:scale-[0.98]"
            >
              <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
                {p.view}
              </span>
            </button>
          ))}
        </div>
      )}

      <PhotoSheet open={open} onClose={() => setOpen(false)} />

      <BottomSheet open={!!view} onClose={() => setView(null)} title="Photo details" height="tall">
        {view && (
          <>
            <img src={view.dataUrl} alt={view.view} className="w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">View</p>
                <p className="capitalize">{view.view}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Phase</p>
                <p className="capitalize">{view.phase}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Date</p>
                <p>{new Date(view.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            {view.notes && <p className="text-sm text-muted-foreground mt-3">{view.notes}</p>}
            <button
              onClick={() => setConfirmDel(view.id)}
              className="w-full mt-4 px-4 py-3 rounded-xl border border-destructive text-destructive text-sm font-medium"
            >
              Delete photo
            </button>
          </>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({
            ...s,
            progressPhotos: s.progressPhotos.filter((x) => x.id !== confirmDel),
          }));
          setConfirmDel(null);
          setView(null);
        }}
        title="Delete photo?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}

/* ===================== ANALYTICS ===================== */

function AnalyticsTab() {
  const { state } = useStore();
  const [range, setRange] = useState<"14d" | "30d" | "90d">("30d");
  const [metricA, setMetricA] = useState<
    "calories" | "protein" | "volume" | "sleep" | "hrv" | "soreness"
  >("calories");
  const [metricB, setMetricB] = useState<"weight" | "strength" | "performance">("weight");
  const [openDetail, setOpenDetail] = useState<"volume" | "bw" | "correlation" | "momentum" | null>(
    null,
  );

  const days = range === "14d" ? 14 : range === "30d" ? 30 : 90;
  const series = weeklyVolumeSeries(state, days);
  const total = series.reduce((a, s) => a + s.volume, 0);
  const max = Math.max(1, ...series.map((s) => s.volume));

  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const bwInRange = sortedBw.filter((b) => b.createdAt > Date.now() - days * 86400000);

  return (
    <div className="px-5 space-y-4">
      <div className="flex gap-2">
        {(["14d", "30d", "90d"] as const).map((r) => (
          <Chip
            key={r}
            aria-label={`View ${r} range`}
            active={range === r}
            onClick={() => setRange(r)}
          >
            {r}
          </Chip>
        ))}
      </div>

      <SectionHeader title="Correlations" />
      <Card>
        <p className="text-sm font-medium mb-3">Compare Metrics</p>
        <div className="flex gap-2 mb-4">
          <Select
            value={metricA}
            onChange={(e) => setMetricA(e.target.value as any)}
            className="flex-1 bg-background text-xs py-1.5 px-2"
          >
            <option value="calories">Calories</option>
            <option value="protein">Protein</option>
            <option value="volume">Volume</option>
            <option value="sleep">Sleep</option>
            <option value="hrv">HRV</option>
            <option value="soreness">Soreness</option>
          </Select>
          <span className="text-muted-foreground self-center text-xs">vs</span>
          <Select
            value={metricB}
            onChange={(e) => setMetricB(e.target.value as any)}
            className="flex-1 bg-background text-xs py-1.5 px-2"
          >
            <option value="weight">Weight</option>
            <option value="strength">Strength</option>
            <option value="performance">Performance</option>
          </Select>
        </div>

        <div
          className="h-32 bg-[var(--surface-2)] rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => setOpenDetail("correlation")}
        >
          <div className="text-center text-muted-foreground px-4">
            <LineChart className="mx-auto mb-2 opacity-50" size={24} />
            <p className="text-sm font-medium">Needs more data</p>
            <p className="text-xs mt-1">
              Log both {metricA} and {metricB} consistently for 14+ days to see their relationship.
            </p>
          </div>
        </div>
      </Card>

      <SectionHeader title="Long-term Trends" />

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setOpenDetail("volume")}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold flex items-center gap-1">Training Volume</p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {Math.round(total / 1000)}k lb over {days}d
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        {total === 0 ? (
          <EmptyState
            icon={<Dumbbell size={22} />}
            title="No volume"
            description="Complete workouts to see trends."
          />
        ) : (
          <div className="flex items-end gap-1 h-24 mt-4">
            {series.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${(s.volume / max) * 100}%`,
                  background: "var(--section)",
                  minHeight: s.volume ? 4 : 0,
                  opacity: s.volume ? 0.85 : 0.15,
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setOpenDetail("bw")}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold flex items-center gap-1">Bodyweight Trend</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fluctuations vs. True Trend</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        {bwInRange.length < 2 ? (
          <EmptyState
            icon={<Scale size={22} />}
            title="Not enough data"
            description="Log more weigh-ins to compare."
          />
        ) : (
          <div className="mt-4">
            <Sparkline points={bwInRange.map((b) => b.weightLb)} unit=" lb" />
          </div>
        )}
      </Card>

      <BottomSheet
        open={openDetail === "correlation"}
        onClose={() => setOpenDetail(null)}
        title={`${metricA} vs ${metricB}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This visualization will compare how your{" "}
            <strong className="capitalize text-foreground">{metricA}</strong> relates to your{" "}
            <strong className="capitalize text-foreground">{metricB}</strong> over time.
          </p>
          <div className="bg-[var(--surface-2)] p-4 rounded-xl text-sm">
            <p className="font-medium mb-1 flex items-center gap-1">
              <Info size={14} className="text-[var(--section)]" /> What this might suggest
            </p>
            <p className="text-muted-foreground">
              Observing this relationship can help identify if changes in {metricA} are positively
              or negatively impacting your {metricB}. Note that correlations do not guarantee
              causation.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Status:</strong> Needs more consistent daily logs to generate a valid
            statistical comparison. Ensure you are logging {metricA} and {metricB} data.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openDetail === "volume"}
        onClose={() => setOpenDetail(null)}
        title="Training Volume"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Volume is calculated as <strong>Sets × Reps × Weight</strong> for all completed
            exercises.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-[var(--surface-2)] p-3 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase">Selected Range</p>
              <p className="font-semibold">{Math.round(total / 1000)}k lb</p>
            </div>
            <div className="bg-[var(--surface-2)] p-3 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase">Peak Day</p>
              <p className="font-semibold">{Math.round(max / 1000)}k lb</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Consistent progressive overload (gradually increasing volume over time) is a primary
            driver of muscle growth and strength adaptation.
          </p>
        </div>
      </BottomSheet>
      <BottomSheet
        open={openDetail === "bw"}
        onClose={() => setOpenDetail(null)}
        title="Bodyweight Trend Context"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Daily weight fluctuations are normal and expected due to water retention, glycogen
            storage, sodium intake, and digestion. The long-term trend line shown here filters out
            daily noise to reveal your actual direction of progress over {days} days.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

function GoalsTab() {
  const { state } = useStore();
  const mScore = momentumScore(state);
  const [openDetail, setOpenDetail] = useState<"momentum" | null>(null);

  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Momentum & Consistency" />
      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setOpenDetail("momentum")}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold flex items-center gap-1">
              <Zap size={16} className="text-[var(--section)]" /> Momentum Score
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{mScore.label}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-[var(--surface-2)]">
            <span className="font-bold text-[var(--section)]">{mScore.score}</span>
          </div>
          <p className="text-xs flex-1 text-muted-foreground line-clamp-2">
            {mScore.hasData ? mScore.explanation : "Log data to build momentum."}
          </p>
        </div>
      </Card>

      <SectionHeader title="Active Goals" />
      {state.goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No goals"
          description="Add or pin goals on the home Goals panel to track them here."
        />
      ) : (
        <div className="space-y-2">
          {state.goals.map((g) => {
            const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(g.current)}/{g.target}
                  </p>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: "var(--section)" }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SectionHeader title="Goal Projections" />
      <div className="space-y-2">
        <PlannedFeatureCard
          title="Goal Risk Status"
          status="Planned"
          description="Early detection if you are falling behind your required weekly pace."
        />
        <PlannedFeatureCard
          title="Adaptive Goal Suggestions"
          status="Planned"
          description="Recommendations to adjust your target dates or goals based on realistic trends."
        />
      </div>

      <BottomSheet
        open={openDetail === "momentum"}
        onClose={() => setOpenDetail(null)}
        title="Momentum Score"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Momentum combines your consistency across training, nutrition logging, and recovery
            check-ins.
          </p>
          {mScore.factors.map((f) => (
            <div key={f.id} className="bg-[var(--surface-2)] p-3 rounded-xl text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium capitalize">{f.label}</span>
                <span className="font-bold text-[var(--section)]">{f.score}</span>
              </div>
              <p className="text-xs text-muted-foreground">{f.detail}</p>
            </div>
          ))}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Keep logging workouts, meals, and recovery data to improve your score.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

function InsightsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Actionable Insights" />
      <Card>
        <p className="text-sm font-medium mb-1 flex items-center gap-1">
          <TrendingUp size={16} className="text-[var(--section)]" /> What's Improving
        </p>
        <p className="text-xs text-muted-foreground">
          Your consistency in logging workouts has remained strong over the past 14 days.
        </p>
      </Card>
      <Card>
        <p className="text-sm font-medium mb-1 flex items-center gap-1">
          <Activity size={16} className="text-destructive" /> What Needs Attention
        </p>
        <p className="text-xs text-muted-foreground">
          Nutrition logging has slipped over the weekend. Try to log even estimated meals to keep
          momentum.
        </p>
      </Card>

      <SectionHeader title="AI Progress Coach" />
      <PlannedFeatureCard
        title="Personalized Recommendations"
        status="Planned"
        description="AI will interpret your body trends, correlations, and momentum to suggest your optimal next steps."
        actionLabel="Coach coming later"
      />

      <SectionHeader title="Education" />
      <ExpandableCard
        title="Understanding Weight Fluctuations"
        icon={<Info size={18} className="text-[var(--section)]" />}
        expanded={expanded === "weight"}
        onToggle={() => setExpanded((e) => (e === "weight" ? null : "weight"))}
      >
        <div className="pt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            Bodyweight can fluctuate wildly day-to-day due to water retention, carbohydrate intake,
            sodium, and digestion. This is why FitCore focuses on the <strong>7-day average</strong>{" "}
            and the longer-term trend line, rather than any single daily weigh-in.
          </p>
        </div>
      </ExpandableCard>
      <ExpandableCard
        title="Correlation vs. Causation"
        icon={<Info size={18} className="text-[var(--section)]" />}
        expanded={expanded === "correlation"}
        onToggle={() => setExpanded((e) => (e === "correlation" ? null : "correlation"))}
      >
        <div className="pt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            Just because two metrics move together doesn't strictly mean one caused the other.
            Strong correlations are useful signals that highlight relationships worth paying
            attention to and experimenting with.
          </p>
        </div>
      </ExpandableCard>
      <ExpandableCard
        title="Handling Plateaus"
        icon={<Info size={18} className="text-[var(--section)]" />}
        expanded={expanded === "plateau"}
        onToggle={() => setExpanded((e) => (e === "plateau" ? null : "plateau"))}
      >
        <div className="pt-2 space-y-2 text-sm text-muted-foreground">
          <p>Progress is rarely perfectly linear. Plateaus lasting 1-2 weeks are normal.</p>
          <p>
            If your trend line stays flat for 3+ weeks while your goals require movement, it's
            typically time to adjust training volume or nutrition targets.
          </p>
        </div>
      </ExpandableCard>
    </div>
  );
}

function ProgressHistoryTab() {
  const { state } = useStore();
  const events = [
    ...state.bodyweightEntries.map((entry) => ({
      id: `bw-${entry.id}`,
      label: `${entry.weightLb} lb weigh-in`,
      date: entry.createdAt,
      meta: "Bodyweight",
    })),
    ...state.progressPhotos.map((photo) => ({
      id: `photo-${photo.id}`,
      label: `${photo.view} progress photo`,
      date: photo.createdAt,
      meta: "Photo",
    })),
  ].sort((a, b) => b.date - a.date);
  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Progress history" />
      {events.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="No progress history"
          description="Weigh-ins and progress photos will appear here."
        />
      ) : (
        <div className="space-y-2">
          {events.slice(0, 20).map((event) => (
            <Card key={event.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.meta}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== SHARED ===================== */

function Sparkline({ points, unit }: { points: number[]; unit: string }) {
  const w = 320,
    h = 80,
    pad = 8;
  const min = Math.min(...points),
    max = Math.max(...points);
  const range = Math.max(0.1, max - min);
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const path = points
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"} ${pad + i * step} ${h - pad - ((v - min) / range) * (h - pad * 2)}`,
    )
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <path
          d={path}
          fill="none"
          stroke="var(--section)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums mt-1">
        <span>
          {points[0]}
          {unit}
        </span>
        <span>
          {points[points.length - 1]}
          {unit}
        </span>
      </div>
    </div>
  );
}

function PhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { set } = useStore();
  const [view, setView] = useState<ProgressPhoto["view"]>("front");
  const [phase, setPhase] = useState<ProgressPhoto["phase"]>("maintenance");
  const [notes, setNotes] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 4_000_000) {
      alert("Image is too large (max 4MB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => setDataUrl(r.result as string);
    r.readAsDataURL(f);
  };
  const submit = () => {
    if (!dataUrl) return;
    set((s) => ({
      ...s,
      progressPhotos: [
        ...s.progressPhotos,
        { id: uid(), dataUrl, view, phase, notes: notes || undefined, createdAt: Date.now() },
      ],
    }));
    setDataUrl("");
    setNotes("");
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Add progress photo" height="tall">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>View</Label>
            <Select value={view} onChange={(e) => setView(e.target.value as ProgressPhoto["view"])}>
              <option>front</option>
              <option>side</option>
              <option>back</option>
            </Select>
          </div>
          <div>
            <Label>Phase</Label>
            <Select
              value={phase}
              onChange={(e) => setPhase(e.target.value as ProgressPhoto["phase"])}
            >
              <option>bulk</option>
              <option>cut</option>
              <option>maintenance</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label>Photo</Label>
          <label className="mt-1 block cursor-pointer">
            <div className="aspect-[3/4] rounded-xl bg-[var(--surface-2)] border border-dashed border-border flex items-center justify-center overflow-hidden">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt="New progress photo preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto mb-1" />
                  <span className="text-xs">Tap to choose</span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <PrimaryButton className="w-full" disabled={!dataUrl} onClick={submit}>
          Save photo
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
