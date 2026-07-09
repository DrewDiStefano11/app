import { useState, useMemo } from "react";
import { Camera, Plus, Trash2, Image as ImageIcon, Scale, Target, Sparkles } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { fitcoreScore, weeklyVolumeSeries, bodyweightDelta } from "@/lib/analytics";
import type { ProgressPhoto } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { Card, StatCard, PageHeader, PrimaryButton, EmptyState, Label, Input, Select, SubTabs, SectionHeader, Chip, Ring, PlannedFeatureCard } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

type Tab = "overview" | "bodyweight" | "photos" | "measurements" | "analytics" | "goals" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bodyweight", label: "Body" },
  { id: "photos", label: "Photos" },
  { id: "measurements", label: "Measurements" },
  { id: "analytics", label: "Analytics" },
  { id: "goals", label: "Goals" },
  { id: "history", label: "History" },
];

export function ProgressView({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const isDeepDive = layoutMode === "deepDive";
  return (
    <div className="pb-24">
      <PageHeader title="Progress" subtitle={`Your trends and milestones - ${isDeepDive ? "Deep Dive" : "Daily View"}`} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "overview" && <OverviewTab layoutMode={layoutMode} />}
      {tab === "bodyweight" && <div className="px-5"><WeightSection /></div>}
      {tab === "photos" && <div className="px-5"><PhotosSection /></div>}
      {tab === "measurements" && <MeasurementsTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "history" && <ProgressHistoryTab />}
    </div>
  );
}

/* ===================== OVERVIEW ===================== */

function OverviewTab({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const { state } = useStore();
  const score = fitcoreScore(state);
  const isDeepDive = layoutMode === "deepDive";

  // Bodyweight
  const sortedBw = useMemo(() => [...state.bodyweightEntries].sort((a,b) => a.createdAt - b.createdAt), [state.bodyweightEntries]);
  const bw = state.profile.bodyweightLb;
  const target = state.profile.targetBodyweightLb;
  const dWeek = bodyweightDelta(state, 7) ?? 0;

  // Training
  const vol7d = useMemo(() => weeklyVolumeSeries(state, 7).reduce((a, s) => a + s.volume, 0), [state]);
  const vol14d = useMemo(() => weeklyVolumeSeries(state, 14).reduce((a, s) => a + s.volume, 0), [state]);
  const volPrev7d = vol14d - vol7d;
  const volChange = volPrev7d ? ((vol7d - volPrev7d) / volPrev7d) * 100 : 0;

  // Nutrition
  const meals7d = state.mealEntries.filter(m => m.createdAt > Date.now() - 7 * 86400000);
  const avgKcal7d = meals7d.length ? meals7d.reduce((a, m) => a + m.calories, 0) / 7 : 0;
  const targetKcal = state.nutritionTargets.calories;

  // Recovery
  const checkins7d = state.recoveryCheckIns.filter(c => c.createdAt > Date.now() - 7 * 86400000);
  const avgReadiness7d = checkins7d.length ? checkins7d.reduce((a, c) => a + (c.energy + c.motivation + (6 - c.soreness) + (6 - c.stress)) / 20, 0) / checkins7d.length * 100 : 0;

  const topGoals = state.goals.filter(g => g.pinned).slice(0, 3);
  const goalList = topGoals.length ? topGoals : state.goals.slice(0, 3);

  // What Changed Summary
  const summaryParts = [];
  if (Math.abs(dWeek) >= 0.5) {
    summaryParts.push(`Bodyweight ${dWeek > 0 ? "increased" : "decreased"} by ${Math.abs(dWeek).toFixed(1)} lb.`);
  } else if (sortedBw.length > 1) {
    summaryParts.push("Bodyweight is stable this week.");
  }

  if (vol7d > 0 && volPrev7d > 0) {
    if (Math.abs(volChange) >= 5) {
      summaryParts.push(`Training volume ${volChange > 0 ? "increased" : "decreased"} ${Math.round(Math.abs(volChange))}%`);
    } else {
      summaryParts.push("Training volume is consistent.");
    }
  }

  if (meals7d.length > 3) {
      const diff = avgKcal7d - targetKcal;
      if (Math.abs(diff) > 150) {
          summaryParts.push(`Avg calories are ${Math.abs(Math.round(diff))} ${diff > 0 ? "above" : "below"} target.`);
      } else {
          summaryParts.push("Nutrition is very close to target.");
      }
  }

  const summary = summaryParts.length > 0 ? summaryParts.join(" ") : "Log more workouts and meals to see a summary of your trends.";

  return (
    <div className="px-5">
      <SectionHeader title="Weekly Summary" />
      <Card>
         <div className="flex gap-3 items-start">
            <Sparkles className="text-[var(--section)] shrink-0" size={20} />
            <p className="text-sm">{summary}</p>
         </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard label="Bodyweight Δ" value={`${dWeek >= 0 ? "+" : ""}${dWeek.toFixed(1)}`} sub="lb" accent />
        <StatCard label="Training Vol Δ" value={`${volChange > 0 ? "+" : ""}${Math.round(volChange)}`} sub="%" accent />
        <StatCard label="7d Avg Kcal" value={Math.round(avgKcal7d).toString()} sub={`/ ${targetKcal}`} accent />
        <StatCard label="7d Readiness" value={avgReadiness7d ? `${Math.round(avgReadiness7d)}%` : "—"} sub="avg" accent />
      </div>

      {isDeepDive && (
        <Card className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Deep Dive detail</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Progress combines bodyweight, training volume, nutrition adherence, readiness, goals, and photos using existing logged data only.
          </p>
        </Card>
      )}

      <SectionHeader title="Bodyweight trend" />
      <Card>
        {sortedBw.length < 2 ? (
          <EmptyState icon={<Scale size={22} />} title="Not enough data" description="Log at least 2 weigh-ins to see your trend." />
        ) : (
          <Sparkline points={sortedBw.map(b => b.weightLb)} unit=" lb" />
        )}
        <p className="text-xs text-muted-foreground mt-2">Target {target} lb ({(target - bw) >= 0 ? "+" : ""}{(target - bw).toFixed(1)} to go)</p>
      </Card>

      <SectionHeader title="Current goals" />
      {goalList.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="No pinned goals" description="Pin goals on the home Goals panel to track them here." />
      ) : (
        <div className="space-y-2">
          {goalList.map(g => {
            const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{Math.round(g.current)}/{g.target}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: "var(--section)" }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== BODY ===================== */

function BodyTab() {
  const [sub, setSub] = useState<"weight" | "photos">("weight");
  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3">
        <Chip active={sub === "weight"} aria-label="Weight tab" onClick={() => setSub("weight")}>Weight</Chip>
        <Chip active={sub === "photos"} aria-label="Photos tab" onClick={() => setSub("photos")}>Photos</Chip>
      </div>
      {sub === "weight" ? <WeightSection /> : <PhotosSection />}
    </div>
  );
}

function WeightSection() {
  const { state, set } = useStore();
  const [w, setW] = useState(String(state.profile.bodyweightLb));
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const sorted = useMemo(() => [...state.bodyweightEntries].sort((a,b) => a.createdAt - b.createdAt), [state.bodyweightEntries]);
  const last = sorted[sorted.length - 1];
  const weekAgo = Date.now() - 7*86400000, monthAgo = Date.now() - 30*86400000;
  const week = sorted.filter(e => e.createdAt > weekAgo);
  const weekAvg = week.length ? (week.reduce((a, e) => a + e.weightLb, 0) / week.length).toFixed(1) : "—";
  const lastWeek = sorted.find(e => e.createdAt < weekAgo);
  const lastMonth = sorted.find(e => e.createdAt < monthAgo);
  const dWeek = last && lastWeek ? (last.weightLb - lastWeek.weightLb) : 0;
  const dMonth = last && lastMonth ? (last.weightLb - lastMonth.weightLb) : 0;

  const submit = () => {
    const wt = Number(w); if (!wt) return;
    set(s => ({ ...s,
      bodyweightEntries: [...s.bodyweightEntries, { id: uid(), weightLb: wt, createdAt: Date.now() }],
      profile: { ...s.profile, bodyweightLb: wt },
      goals: s.goals.map(g => g.type === "bodyweight" ? { ...g, current: wt } : g),
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
        <Input className="flex-1" inputMode="decimal" value={w} onChange={e => setW(e.target.value)} placeholder="Weight in lb" />
        <PrimaryButton onClick={submit}>Save</PrimaryButton>
      </div>

      <SectionHeader title="Recent weigh-ins" />
      {sorted.length === 0 ? (
        <EmptyState icon={<Scale size={22} />} title="No weigh-ins" description="Track weekly for real trends." />
      ) : (
        <div className="space-y-2">
          {[...sorted].reverse().slice(0, 15).map(e => (
            <Card key={e.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold tabular-nums">{e.weightLb} lb</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</p>
                </div>
                <button aria-label="Delete weigh-in" onClick={() => setConfirmDel(e.id)} className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { set(s => ({ ...s, bodyweightEntries: s.bodyweightEntries.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }}
        title="Delete weigh-in?" message="This can't be undone." confirmLabel="Delete" destructive />
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
      <PrimaryButton className="w-full" onClick={() => setOpen(true)}><Plus size={16} />Add photo</PrimaryButton>
      <SectionHeader title="Timeline" />
      {state.progressPhotos.length === 0 ? (
        <EmptyState icon={<Camera size={22} />} title="No photos yet" description="Photos tell the real story. Add one weekly." />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[...state.progressPhotos].reverse().map(p => (
            <button key={p.id} aria-label={`View ${p.view} photo`} onClick={() => setView(p)} className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative active:scale-[0.98]">
              <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">{p.view}</span>
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
              <div><p className="text-[10px] uppercase text-muted-foreground">View</p><p className="capitalize">{view.view}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Phase</p><p className="capitalize">{view.phase}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Date</p><p>{new Date(view.createdAt).toLocaleDateString()}</p></div>
            </div>
            {view.notes && <p className="text-sm text-muted-foreground mt-3">{view.notes}</p>}
            <button onClick={() => setConfirmDel(view.id)} className="w-full mt-4 px-4 py-3 rounded-xl border border-destructive text-destructive text-sm font-medium">Delete photo</button>
          </>
        )}
      </BottomSheet>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { set(s => ({ ...s, progressPhotos: s.progressPhotos.filter(x => x.id !== confirmDel) })); setConfirmDel(null); setView(null); }}
        title="Delete photo?" message="This can't be undone." confirmLabel="Delete" destructive />
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
  const max = Math.max(1, ...series.map(s => s.volume));
  const sortedBw = useMemo(() => [...state.bodyweightEntries].sort((a,b) => a.createdAt - b.createdAt), [state.bodyweightEntries]);
  const bwInRange = sortedBw.filter(b => b.createdAt > Date.now() - days * 86400000);

  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3">
        {(["14d","30d"] as const).map(r => <Chip key={r} aria-label={`View ${r} range`} active={range === r} onClick={() => setRange(r)}>{r}</Chip>)}
      </div>

      <SectionHeader title="Training volume" />
      {total === 0 ? (
        <EmptyState icon={<Target size={22} />} title="No training volume" description="Complete workouts to see volume trends." />
      ) : (
        <Card>
          <div className="flex items-end gap-1 h-28">
            {series.map((s, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${(s.volume / max) * 100}%`, background: "var(--section)", minHeight: s.volume ? 4 : 0, opacity: s.volume ? 0.85 : 0.15 }} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">{Math.round(total/1000)}k lb total over {days}d</p>
        </Card>
      )}

      <SectionHeader title="Bodyweight vs time" />
      {bwInRange.length < 2 ? (
        <EmptyState icon={<Scale size={22} />} title="Not enough data" description="Log more weigh-ins to compare." />
      ) : (
        <Card>
          <Sparkline points={bwInRange.map(b => b.weightLb)} unit=" lb" />
        </Card>
      )}

      <SectionHeader title="Goal progress" />
      {state.goals.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="No goals" description="Add goals on the home Goals panel." />
      ) : (
        <div className="space-y-2">
          {state.goals.map(g => {
            const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{Math.round(pct)}%</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: "var(--section)" }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeasurementsTab() {
  return (
    <div className="px-5 space-y-4">
      <PlannedFeatureCard
        title="Body measurements"
        status="Coming later"
        description="Track waist, chest, arms, legs, and other body measurements here once the feature is connected."
        actionLabel="Measurements coming later"
      />
    </div>
  );
}

function GoalsTab() {
  const { state } = useStore();
  return (
    <div className="px-5 space-y-4">
      <SectionHeader title="Goals" />
      {state.goals.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="No goals" description="Add or pin goals on the home Goals panel to track them here." />
      ) : (
        <div className="space-y-2">
          {state.goals.map(g => {
            const pct = Math.min(100, (g.current / Math.max(0.01, g.target)) * 100);
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{Math.round(g.current)}/{g.target}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: "var(--section)" }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <PlannedFeatureCard
        title="Smart goal recommendations"
        status="Planned"
        description="Future recommendations will appear here after they are connected to real progress data."
      />
    </div>
  );
}

function ProgressHistoryTab() {
  const { state } = useStore();
  const events = [
    ...state.bodyweightEntries.map(entry => ({
      id: `bw-${entry.id}`,
      label: `${entry.weightLb} lb weigh-in`,
      date: entry.createdAt,
      meta: "Bodyweight",
    })),
    ...state.progressPhotos.map(photo => ({
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
        <EmptyState icon={<Scale size={22} />} title="No progress history" description="Weigh-ins and progress photos will appear here." />
      ) : (
        <div className="space-y-2">
          {events.slice(0, 20).map(event => (
            <Card key={event.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.meta}</p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
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
  const w = 320, h = 80, pad = 8;
  const min = Math.min(...points), max = Math.max(...points);
  const range = Math.max(0.1, max - min);
  const step = (w - pad*2) / Math.max(1, points.length - 1);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i*step} ${h - pad - ((v - min)/range)*(h - pad*2)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <path d={path} fill="none" stroke="var(--section)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums mt-1">
        <span>{points[0]}{unit}</span><span>{points[points.length-1]}{unit}</span>
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
    if (f.size > 4_000_000) { alert("Image is too large (max 4MB)"); return; }
    const r = new FileReader();
    r.onload = () => setDataUrl(r.result as string);
    r.readAsDataURL(f);
  };
  const submit = () => {
    if (!dataUrl) return;
    set(s => ({ ...s, progressPhotos: [...s.progressPhotos, { id: uid(), dataUrl, view, phase, notes: notes || undefined, createdAt: Date.now() }] }));
    setDataUrl(""); setNotes("");
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Add progress photo" height="tall">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>View</Label><Select value={view} onChange={e => setView(e.target.value as ProgressPhoto["view"])}><option>front</option><option>side</option><option>back</option></Select></div>
          <div><Label>Phase</Label><Select value={phase} onChange={e => setPhase(e.target.value as ProgressPhoto["phase"])}><option>bulk</option><option>cut</option><option>maintenance</option></Select></div>
        </div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" /></div>
        <div>
          <Label>Photo</Label>
          <label className="mt-1 block cursor-pointer">
            <div className="aspect-[3/4] rounded-xl bg-[var(--surface-2)] border border-dashed border-border flex items-center justify-center overflow-hidden">
              {dataUrl ? <img src={dataUrl} alt="New progress photo preview" className="w-full h-full object-cover" /> : <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto mb-1" /><span className="text-xs">Tap to choose</span></div>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <PrimaryButton className="w-full" disabled={!dataUrl} onClick={submit}>Save photo</PrimaryButton>
      </div>
    </BottomSheet>
  );
}
