import { useMemo, useState } from "react";
import {
  BarChart3,
  Camera,
  ChevronRight,
  Image as ImageIcon,
  LineChart,
  Plus,
  Scale,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { bodyweightDelta, fitcoreScore, weeklyVolumeSeries } from "@/lib/analytics";
import type { ProgressPhoto } from "@/lib/types";
import {
  Card,
  Chip,
  EmptyState,
  GhostButton,
  Input,
  Label,
  PageHeader,
  PrimaryButton,
  Ring,
  SectionHeader,
  Select,
  StatCard,
  SubTabs,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

type Tab = "overview" | "body" | "analytics";
type BodySubTab = "weight" | "photos";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "body", label: "Body" },
  { id: "analytics", label: "Analytics" },
];

export function ProgressView() {
  const [tab, setTab] = useState<Tab>("overview");
  const [bodySub, setBodySub] = useState<BodySubTab>("weight");

  const openBody = (sub: BodySubTab) => {
    setBodySub(sub);
    setTab("body");
  };

  return (
    <div className="pb-24">
      <PageHeader title="Progress" subtitle="Your trends and milestones" />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "overview" && <OverviewTab onOpenTab={setTab} onOpenBody={openBody} />}
      {tab === "body" && <BodyTab sub={bodySub} onSubChange={setBodySub} />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

/* ===================== OVERVIEW ===================== */

function OverviewTab({
  onOpenTab,
  onOpenBody,
}: {
  onOpenTab: (tab: Tab) => void;
  onOpenBody: (sub: BodySubTab) => void;
}) {
  const { state } = useStore();
  const score = fitcoreScore(state);

  // Bodyweight
  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const latestBw = sortedBw[sortedBw.length - 1]?.weightLb ?? state.profile.bodyweightLb;
  const target = state.profile.targetBodyweightLb;
  const dWeek = bodyweightDelta(state, 7) ?? 0;

  // Training
  const vol7d = useMemo(
    () => weeklyVolumeSeries(state, 7).reduce((a, s) => a + s.volume, 0),
    [state],
  );
  const vol14d = useMemo(
    () => weeklyVolumeSeries(state, 14).reduce((a, s) => a + s.volume, 0),
    [state],
  );
  const volPrev7d = vol14d - vol7d;
  const volChange = volPrev7d ? ((vol7d - volPrev7d) / volPrev7d) * 100 : 0;
  const workouts7d = state.workouts.filter((w) => w.startedAt > Date.now() - 7 * 86400000).length;

  // Nutrition
  const meals7d = state.mealEntries.filter((m) => m.createdAt > Date.now() - 7 * 86400000);
  const avgKcal7d = meals7d.length ? meals7d.reduce((a, m) => a + m.calories, 0) / 7 : 0;
  const targetKcal = state.nutritionTargets.calories;

  // Recovery
  const checkins7d = state.recoveryCheckIns.filter((c) => c.createdAt > Date.now() - 7 * 86400000);
  const avgReadiness7d = checkins7d.length
    ? (checkins7d.reduce(
        (a, c) => a + (c.energy + c.motivation + (6 - c.soreness) + (6 - c.stress)) / 20,
        0,
      ) /
        checkins7d.length) *
      100
    : 0;

  const topGoals = state.goals.filter((g) => g.pinned).slice(0, 3);
  const goalList = topGoals.length ? topGoals : state.goals.slice(0, 3);
  const goalAvg = state.goals.length
    ? Math.round(
        state.goals.reduce(
          (a, g) => a + Math.min(100, (g.current / Math.max(0.01, g.target)) * 100),
          0,
        ) / state.goals.length,
      )
    : 0;

  const summaryParts = [];
  if (Math.abs(dWeek) >= 0.5) {
    summaryParts.push(
      `Bodyweight ${dWeek > 0 ? "increased" : "decreased"} by ${Math.abs(dWeek).toFixed(1)} lb.`,
    );
  } else if (sortedBw.length > 1) {
    summaryParts.push("Bodyweight is stable this week.");
  }

  if (vol7d > 0 && volPrev7d > 0) {
    if (Math.abs(volChange) >= 5) {
      summaryParts.push(
        `Training volume ${volChange > 0 ? "increased" : "decreased"} ${Math.round(Math.abs(volChange))}%.`,
      );
    } else {
      summaryParts.push("Training volume is consistent.");
    }
  }

  if (meals7d.length > 3) {
    const diff = avgKcal7d - targetKcal;
    if (Math.abs(diff) > 150) {
      summaryParts.push(
        `Avg calories are ${Math.abs(Math.round(diff))} ${diff > 0 ? "above" : "below"} target.`,
      );
    } else {
      summaryParts.push("Nutrition is very close to target.");
    }
  }

  const hasProgressData =
    sortedBw.length > 0 ||
    workouts7d > 0 ||
    state.goals.length > 0 ||
    state.progressPhotos.length > 0;
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : "Log more workouts and meals to see a summary of your trends.";
  const latestWeightLabel = sortedBw.length ? `${latestBw.toFixed(1)} lb` : "No weigh-ins";
  const targetDiff = target - latestBw;

  return (
    <div className="px-5 space-y-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Stats hub
            </span>
            <h2 className="text-2xl font-bold mt-1">
              {hasProgressData ? "Your progress snapshot" : "Build your first trend"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {hasProgressData
                ? summary
                : "Log a weigh-in, complete workouts, add photos, or track goals to turn this into a useful progress hub."}
            </p>
          </div>
          <div className="shrink-0">
            <Ring value={score} max={100} size={76} label="score" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <GhostButton onClick={() => onOpenBody("weight")} className="justify-start">
            <Scale size={16} />
            Body
          </GhostButton>
          <GhostButton onClick={() => onOpenTab("analytics")} className="justify-start">
            <LineChart size={16} />
            Charts
          </GhostButton>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Bodyweight"
          value={sortedBw.length ? latestBw.toFixed(1) : "--"}
          sub={sortedBw.length ? "lb current" : "not logged"}
          accent
        />
        <StatCard
          label="Training"
          value={workouts7d}
          sub={`${Math.round(vol7d / 1000)}k lb 7d`}
          accent
        />
        <StatCard
          label="Goals"
          value={state.goals.length ? `${goalAvg}%` : "--"}
          sub={state.goals.length ? "avg progress" : "none yet"}
        />
        <StatCard
          label="Trend"
          value={sortedBw.length > 1 ? formatSigned(dWeek) : "--"}
          sub={sortedBw.length > 1 ? "lb 7d" : "needs data"}
        />
        <StatCard
          label="7d Avg Kcal"
          value={Math.round(avgKcal7d).toString()}
          sub={`/ ${targetKcal}`}
          accent
        />
        <StatCard
          label="7d Readiness"
          value={avgReadiness7d ? `${Math.round(avgReadiness7d)}%` : "--"}
          sub="avg"
          accent
        />
      </div>

      <section>
        <SectionHeader
          title="Bodyweight"
          action={
            <button
              onClick={() => onOpenBody("weight")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Log
            </button>
          }
        />
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Current</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{latestWeightLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {sortedBw.length > 1
                  ? `${formatSigned(dWeek)} lb over 7d`
                  : "Log 2+ weigh-ins for trend"}{" "}
                - target {target} lb ({formatSigned(targetDiff)} to go)
              </p>
            </div>
            <Scale size={22} style={{ color: "var(--section)" }} />
          </div>
          <div className="mt-4">
            {sortedBw.length < 2 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Log at least 2 weigh-ins to see your bodyweight trend.
              </p>
            ) : (
              <Sparkline points={sortedBw.map((b) => b.weightLb)} unit=" lb" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <GhostButton onClick={() => onOpenBody("weight")} className="justify-start">
              <Plus size={16} />
              Log weigh-in
            </GhostButton>
            <GhostButton onClick={() => onOpenTab("analytics")} className="justify-start">
              <BarChart3 size={16} />
              Body analytics
            </GhostButton>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Progress entry points" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            icon={<Camera size={20} />}
            title="Progress photos"
            detail={
              state.progressPhotos.length
                ? `${state.progressPhotos.length} photo${state.progressPhotos.length === 1 ? "" : "s"} saved`
                : "Add front, side, or back photos."
            }
            onClick={() => onOpenBody("photos")}
          />
          <ActionCard
            icon={<TrendingUp size={20} />}
            title="Training analytics"
            detail={
              vol7d
                ? `${Math.round(vol7d / 1000)}k lb over the last 7 days.`
                : "Complete workouts to light up volume charts."
            }
            onClick={() => onOpenTab("analytics")}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Current goals" />
        {goalList.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="No goals yet"
            description="Goals from the home panel will stay visible here once you add them."
          />
        ) : (
          <div className="space-y-2">
            {goalList.map((g) => {
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
      </section>

      <Card>
        <div className="flex gap-3 items-start">
          <Sparkles className="text-[var(--section)] shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-sm">Keep the signal honest</p>
            <p className="text-sm text-muted-foreground mt-1">
              Progress trends work best when weigh-ins, photos, workouts, and goals are logged
              consistently.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ===================== BODY ===================== */

function BodyTab({
  sub,
  onSubChange,
}: {
  sub: BodySubTab;
  onSubChange: (sub: BodySubTab) => void;
}) {
  return (
    <div className="px-5">
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <Chip active={sub === "weight"} onClick={() => onSubChange("weight")}>
          Weight
        </Chip>
        <Chip active={sub === "photos"} onClick={() => onSubChange("photos")}>
          Photos
        </Chip>
      </div>
      {sub === "weight" ? <WeightSection /> : <PhotosSection />}
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
    : "--";
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
      <div className="card-elev p-5 section-gradient ring-section mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Bodyweight log
            </span>
            <h2 className="text-2xl font-bold mt-1">
              {last ? `${last.weightLb.toFixed(1)} lb` : "Start tracking"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {last
                ? `Last logged ${new Date(last.createdAt).toLocaleDateString()}`
                : "Add your first weigh-in to unlock trends."}
            </p>
          </div>
          <Scale size={22} style={{ color: "var(--section)" }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Wk avg" value={weekAvg} sub="lb" accent />
        <StatCard label="+/- 7d" value={formatSigned(dWeek)} sub="lb" />
        <StatCard label="+/- 30d" value={formatSigned(dMonth)} sub="lb" />
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
      <div className="card-elev p-5 section-gradient ring-section mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Progress photos
            </span>
            <h2 className="text-2xl font-bold mt-1">
              {state.progressPhotos.length
                ? `${state.progressPhotos.length} saved`
                : "No photos yet"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Keep visual check-ins beside your bodyweight and training trends.
            </p>
          </div>
          <Camera size={22} style={{ color: "var(--section)" }} />
        </div>
        <PrimaryButton className="w-full mt-4" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add photo
        </PrimaryButton>
      </div>

      <SectionHeader title="Timeline" />
      {state.progressPhotos.length === 0 ? (
        <EmptyState
          icon={<Camera size={22} />}
          title="No photos yet"
          description="Photos tell the real story. Add one weekly."
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[...state.progressPhotos].reverse().map((p) => (
            <button
              key={p.id}
              aria-label={`View ${p.view} photo`}
              onClick={() => setView(p)}
              className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative active:scale-[0.98]"
            >
              <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded capitalize">
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
  const [range, setRange] = useState<"14d" | "30d">("14d");
  const days = range === "14d" ? 14 : 30;
  const series = weeklyVolumeSeries(state, days);
  const total = series.reduce((a, s) => a + s.volume, 0);
  const max = Math.max(1, ...series.map((s) => s.volume));
  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const bwInRange = sortedBw.filter((b) => b.createdAt > Date.now() - days * 86400000);
  const goalAvg = state.goals.length
    ? Math.round(
        state.goals.reduce(
          (a, g) => a + Math.min(100, (g.current / Math.max(0.01, g.target)) * 100),
          0,
        ) / state.goals.length,
      )
    : 0;

  return (
    <div className="px-5 space-y-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Analytics
            </span>
            <h2 className="text-2xl font-bold mt-1">{days} day progress view</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Training volume, bodyweight over time, and goal progress in one place.
            </p>
          </div>
          <BarChart3 size={22} style={{ color: "var(--section)" }} />
        </div>
        <div className="flex gap-2 mt-4">
          {(["14d", "30d"] as const).map((r) => (
            <Chip key={r} active={range === r} onClick={() => setRange(r)}>
              {r}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Volume"
          value={`${Math.round(total / 1000)}k`}
          sub={`${days}d lb`}
          accent
        />
        <StatCard label="Weigh-ins" value={bwInRange.length} sub={`${days}d range`} />
        <StatCard label="Goals" value={state.goals.length ? `${goalAvg}%` : "--"} sub="avg" />
      </div>

      <section>
        <SectionHeader title="Training volume" />
        {total === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="No training volume"
            description="Complete workouts to see volume trends."
          />
        ) : (
          <Card>
            <div className="flex items-end gap-1 h-32 sm:h-36">
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
            <p className="text-xs text-muted-foreground mt-2 tabular-nums">
              {Math.round(total / 1000)}k lb total over {days}d
            </p>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title="Bodyweight vs time" />
        {bwInRange.length < 2 ? (
          <EmptyState
            icon={<Scale size={22} />}
            title="Not enough data"
            description="Log more weigh-ins to compare."
          />
        ) : (
          <Card>
            <Sparkline points={bwInRange.map((b) => b.weightLb)} unit=" lb" />
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title="Goal progress" />
        {state.goals.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="No goals"
            description="Add goals on the home Goals panel."
          />
        ) : (
          <div className="space-y-2">
            {state.goals.map((g) => {
              const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
              return (
                <Card key={g.id}>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="font-medium text-sm">{g.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{Math.round(pct)}%</p>
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
      </section>
    </div>
  );
}

/* ===================== SHARED ===================== */

function ActionCard({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="premium-card card-elev p-4 text-left press transition-[transform,border-color,background-color]"
    >
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "var(--section-soft)", color: "var(--section)" }}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-sm block">{title}</span>
          <span className="text-xs text-muted-foreground mt-1 block leading-relaxed">{detail}</span>
        </span>
        <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );
}

function formatSigned(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

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
