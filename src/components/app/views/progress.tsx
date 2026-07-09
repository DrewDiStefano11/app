import { useState, useMemo } from "react";
import {
  Camera,
  Plus,
  Trash2,
  Image as ImageIcon,
  Scale,
  Target,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { fitcoreScore, weeklyVolumeSeries, bodyweightDelta } from "@/lib/analytics";
import type { ProgressPhoto } from "@/lib/types";
import {
  Card,
  StatCard,
  PageHeader,
  PrimaryButton,
  EmptyState,
  Label,
  Input,
  Select,
  SectionHeader,
  Chip,
  SubTabs,
} from "@/components/app/ui";
import { LayoutModeToggle, type LayoutMode } from "@/components/app/layout-primitives";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

type ProgressPanel = "bodyweight" | "photos" | "analytics" | null;

export function ProgressView() {
  const [panel, setPanel] = useState<ProgressPanel>(null);
  const [mode, setMode] = useState<LayoutMode>("daily");
  const [deepDiveTab, setDeepDiveTab] = useState<"Analytics" | "Body" | "Goals" | "Insights">(
    "Analytics",
  );
  const { state } = useStore();
  const score = fitcoreScore(state);

  return (
    <div className="pb-24">
      <PageHeader title="Progress" />
      <div className="px-5 pt-2 pb-4">
        <LayoutModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "daily" ? (
        <DailyProgressView onOpenPanel={setPanel} score={score} />
      ) : (
        <DeepDiveProgressView
          activeTab={deepDiveTab}
          onChangeTab={setDeepDiveTab}
          onOpenPanel={setPanel}
          score={score}
        />
      )}

      {mode === "daily" && (
        <>
          <BottomSheet
            open={panel === "bodyweight"}
            onClose={() => setPanel(null)}
            title="Bodyweight log"
            height="tall"
          >
            <WeightSection />
          </BottomSheet>
          <BottomSheet
            open={panel === "photos"}
            onClose={() => setPanel(null)}
            title="Photo timeline"
            height="tall"
          >
            <PhotosSection />
          </BottomSheet>
          <BottomSheet
            open={panel === "analytics"}
            onClose={() => setPanel(null)}
            title="Training analytics"
            height="tall"
          >
            <AnalyticsSection />
          </BottomSheet>
        </>
      )}
    </div>
  );
}

function DailyProgressView({
  onOpenPanel,
  score,
}: {
  onOpenPanel: (panel: ProgressPanel) => void;
  score: number;
}) {
  const { state } = useStore();

  // Bodyweight
  const sortedBw = useMemo(
    () => [...state.bodyweightEntries].sort((a, b) => a.createdAt - b.createdAt),
    [state.bodyweightEntries],
  );
  const bw = state.profile.bodyweightLb;
  const target = state.profile.targetBodyweightLb;
  const dWeek = bodyweightDelta(state, 7) ?? 0;
  const lastBw = sortedBw.length > 0 ? sortedBw[sortedBw.length - 1] : null;

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

  const recentPhoto =
    state.progressPhotos.length > 0 ? state.progressPhotos[state.progressPhotos.length - 1] : null;

  // What Changed Summary
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
        `Training volume ${volChange > 0 ? "increased" : "decreased"} ${Math.round(Math.abs(volChange))}%`,
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

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : "Log more workouts and meals to see a summary of your trends.";

  return (
    <div className="px-5 space-y-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Weekly view
            </span>
            <h2 className="text-2xl font-bold mt-1">Score: {score}</h2>
            <p className="text-sm text-muted-foreground mt-1">{summary}</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--section)" }}
          >
            <Sparkles size={22} className="text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <StatCard
            label="Bodyweight Δ"
            value={`${dWeek >= 0 ? "+" : ""}${dWeek.toFixed(1)}`}
            sub="lb"
            accent
          />
          <StatCard
            label="Training Vol Δ"
            value={`${volChange > 0 ? "+" : ""}${Math.round(volChange)}`}
            sub="%"
            accent
          />
          <StatCard
            label="7d Avg Kcal"
            value={Math.round(avgKcal7d).toString()}
            sub={`/ ${targetKcal}`}
            accent
          />
          <StatCard
            label="7d Readiness"
            value={avgReadiness7d ? `${Math.round(avgReadiness7d)}%` : "—"}
            sub="avg"
            accent
          />
        </div>
      </div>

      <section>
        <SectionHeader
          title="Body metrics"
          action={
            <button
              onClick={() => onOpenPanel("bodyweight")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Log weigh-in
            </button>
          }
        />
        <Card onClick={() => onOpenPanel("bodyweight")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{lastBw ? `${lastBw.weightLb} lb` : "No weigh-ins"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target {target} lb ({target - bw >= 0 ? "+" : ""}
                {(target - bw).toFixed(1)} to go)
              </p>
            </div>
            <Scale size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Photo timeline"
          action={
            <button
              onClick={() => onOpenPanel("photos")}
              className="text-xs font-semibold text-muted-foreground"
            >
              View all
            </button>
          }
        />
        <Card onClick={() => onOpenPanel("photos")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{recentPhoto ? "Latest photo" : "No photos yet"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {recentPhoto
                  ? new Date(recentPhoto.createdAt).toLocaleDateString()
                  : "Photos tell the real story. Add one weekly."}
              </p>
            </div>
            {recentPhoto ? (
              <div className="w-10 h-10 rounded overflow-hidden">
                <img src={recentPhoto.dataUrl} className="w-full h-full object-cover" />
              </div>
            ) : (
              <Camera size={20} style={{ color: "var(--section)" }} />
            )}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Training analytics"
          action={
            <button
              onClick={() => onOpenPanel("analytics")}
              className="text-xs font-semibold text-muted-foreground"
            >
              Open
            </button>
          }
        />
        <Card onClick={() => onOpenPanel("analytics")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Volume & goals</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track your volume trends over time.
              </p>
            </div>
            <BarChart3 size={20} style={{ color: "var(--section)" }} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Current goals" />
        {goalList.length === 0 ? (
          <EmptyState
            icon={<Target size={22} />}
            title="No pinned goals"
            description="Pin goals on the home Goals panel to track them here."
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

      <p className="text-[11px] text-muted-foreground text-center mt-4 pb-4">
        Consistency over time is more important than daily noise.
      </p>
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
      <div className="flex gap-2 mb-6">
        <Input
          className="flex-1"
          inputMode="decimal"
          value={w}
          onChange={(e) => setW(e.target.value)}
          placeholder="Weight in lb"
        />
        <PrimaryButton onClick={submit}>Save</PrimaryButton>
      </div>

      <SectionHeader title="Bodyweight trend" />
      <Card className="mb-6">
        {sorted.length < 2 ? (
          <EmptyState
            icon={<Scale size={22} />}
            title="Not enough data"
            description="Log at least 2 weigh-ins to see your trend."
          />
        ) : (
          <Sparkline points={sorted.map((b) => b.weightLb)} unit=" lb" />
        )}
      </Card>

      <SectionHeader title="Recent weigh-ins" />
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="No weigh-ins"
          description="Track weekly for real trends."
        />
      ) : (
        <div className="space-y-2 pb-6">
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
      <PrimaryButton className="w-full mb-4" onClick={() => setOpen(true)}>
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
        <div className="grid grid-cols-3 gap-2 pb-6">
          {[...state.progressPhotos].reverse().map((p) => (
            <button
              key={p.id}
              aria-label={`View ${p.view} photo`}
              onClick={() => setView(p)}
              className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative active:scale-[0.98]"
            >
              <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
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

function AnalyticsSection() {
  const { state } = useStore();
  const [range, setRange] = useState<"14d" | "30d">("14d");
  const days = range === "14d" ? 14 : 30;
  const series = weeklyVolumeSeries(state, days);
  const total = series.reduce((a, s) => a + s.volume, 0);
  const max = Math.max(1, ...series.map((s) => s.volume));

  return (
    <>
      <div className="flex gap-2 mb-4">
        {(["14d", "30d"] as const).map((r) => (
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

      <SectionHeader title="Training volume" />
      {total === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No training volume"
          description="Complete workouts to see volume trends."
        />
      ) : (
        <Card className="mb-6">
          <div className="flex items-end gap-1 h-28">
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

      <SectionHeader title="Goal progress" />
      {state.goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No goals"
          description="Add goals on the home Goals panel."
        />
      ) : (
        <div className="space-y-2 pb-6">
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
    </>
  );
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
      <div className="space-y-3 pb-6">
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

function DeepDiveProgressView({
  activeTab,
  onChangeTab,
  onOpenPanel,
  score,
}: {
  activeTab: string;
  onChangeTab: (tab: any) => void;
  onOpenPanel: (panel: ProgressPanel) => void;
  score: number;
}) {
  const TABS = [
    { id: "Analytics", label: "Analytics" },
    { id: "Body", label: "Body" },
    { id: "Goals", label: "Goals" },
    { id: "Insights", label: "Insights" },
  ];

  return (
    <div>
      <SubTabs tabs={TABS} active={activeTab} onChange={onChangeTab} />
      {activeTab === "Analytics" && (
        <div className="px-5 mt-4">
          <SectionHeader title="Deep Dive: Analytics" />
          <AnalyticsSection />
        </div>
      )}
      {activeTab === "Body" && (
        <div className="px-5 mt-4">
          <SectionHeader title="Deep Dive: Body" />
          <WeightSection />
          <div className="mt-6">
            <PhotosSection />
          </div>
        </div>
      )}
      {activeTab === "Goals" && (
        <div className="px-5 mt-4">
          <SectionHeader title="Deep Dive: Goals" />
          <Card>
            <p className="text-sm text-muted-foreground">Goals deep dive is coming later.</p>
          </Card>
        </div>
      )}
      {activeTab === "Insights" && (
        <div className="px-5 mt-4">
          <SectionHeader title="Deep Dive: Insights" />
          <Card>
            <p className="text-sm text-muted-foreground">Insights and Coach trends coming later.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
