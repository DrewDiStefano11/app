import { useState, useMemo } from "react";
import { Trophy, Camera, Plus, Trash2, Image as ImageIcon, Scale, Dumbbell, Filter } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { exerciseById } from "@/lib/data";
import type { ProgressPhoto } from "@/lib/types";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Label, Input, Select, SubTabs, SectionHeader, Chip } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { GoalsTab } from "@/components/app/goals-tab";

type Tab = "strength" | "photos" | "prs" | "goals" | "history" | "weight";
const TABS: { id: Tab; label: string }[] = [
  { id: "strength", label: "Strength" },
  { id: "photos", label: "Photos" },
  { id: "prs", label: "PRs" },
  { id: "goals", label: "Goals" },
  { id: "history", label: "History" },
  { id: "weight", label: "Weight" },
];

export function ProgressView() {
  const [tab, setTab] = useState<Tab>("strength");
  return (
    <div className="pb-24">
      <PageHeader title="Progress" subtitle="Your trends and milestones" />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "strength" && <StrengthTab onJump={setTab} />}
      {tab === "photos" && <PhotosTab />}
      {tab === "prs" && <PRsTab />}
      {tab === "goals" && <GoalsTab section="progress" typeOptions={["lift","bodyweight","consistency","photo","habit"]} />}
      {tab === "history" && <HistoryTab />}
      {tab === "weight" && <WeightTab />}
    </div>
  );
}

function StrengthTab({ onJump }: { onJump: (t: Tab) => void }) {
  const { state } = useStore();
  const sortedBw = useMemo(() => [...state.bodyweightEntries].sort((a,b) => a.createdAt - b.createdAt), [state.bodyweightEntries]);
  const bwTrend = sortedBw.length >= 2 ? sortedBw[sortedBw.length-1].weightLb - sortedBw[0].weightLb : 0;
  const weekWorkouts = state.workouts.filter(w => w.startedAt > Date.now() - 7*86400000).length;
  const topPR = [...state.prs].sort((a,b) => b.value - a.value)[0];
  const recentPRs = [...state.prs].sort((a,b) => b.date - a.date).slice(0, 3);

  return (
    <div className="px-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Workouts" value={weekWorkouts} sub="this week" accent />
        <StatCard label="PRs" value={state.prs.length} sub="all time" />
        <StatCard label="Bodyweight" value={`${state.profile.bodyweightLb}`} sub="lb" />
        <StatCard label="Trend" value={`${bwTrend >= 0 ? "+" : ""}${bwTrend.toFixed(1)}`} sub="lb total" />
      </div>

      {topPR && (
        <>
          <SectionHeader title="Best lift" />
          <Card>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{exerciseById(topPR.exerciseId)?.name}</p>
                <p className="text-xs text-muted-foreground">{topPR.weight}lb × {topPR.reps} • {new Date(topPR.date).toLocaleDateString()}</p>
              </div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--section)" }}>{topPR.value}</p>
            </div>
          </Card>
        </>
      )}

      {recentPRs.length > 0 && (
        <>
          <SectionHeader title="Recent PRs" action={<button onClick={() => onJump("prs")} className="text-xs text-muted-foreground">All</button>} />
          <div className="space-y-2">
            {recentPRs.map(p => (
              <Card key={p.id}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-sm">{exerciseById(p.exerciseId)?.name}</p>
                    <p className="text-xs text-muted-foreground">{p.weight}lb × {p.reps}</p>
                  </div>
                  <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>{p.value}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Quick actions" />
      <div className="grid grid-cols-2 gap-3">
        <QA icon={<Trophy size={16} />} label="View PRs" onClick={() => onJump("prs")} />
        <QA icon={<Camera size={16} />} label="Add photo" onClick={() => onJump("photos")} />
        <QA icon={<Scale size={16} />} label="Bodyweight" onClick={() => onJump("weight")} />
        <QA icon={<Dumbbell size={16} />} label="History" onClick={() => onJump("history")} />
      </div>
    </div>
  );
}

function QA({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-elev p-4 flex items-center gap-3 text-left active:scale-[0.98]">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--section-soft)", color: "var(--section)" }}>{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function PhotosTab() {
  const { state, set } = useStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ProgressPhoto | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  return (
    <div className="px-5">
      <PrimaryButton className="w-full" onClick={() => setOpen(true)}><Plus size={16} />Add photo</PrimaryButton>
      <SectionHeader title="Timeline" />
      {state.progressPhotos.length === 0 ? (
        <EmptyState icon={<Camera size={22} />} title="No photos yet" description="Photos tell the real story. Add one weekly." />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {[...state.progressPhotos].reverse().map(p => (
            <button key={p.id} onClick={() => setView(p)} className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative active:scale-[0.98]">
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
    </div>
  );
}

function PRsTab() {
  const { state } = useStore();
  const [filterEx, setFilterEx] = useState<string>("all");
  const exerciseOptions = useMemo(() => Array.from(new Set(state.prs.map(p => p.exerciseId))), [state.prs]);
  const filtered = filterEx === "all" ? state.prs : state.prs.filter(p => p.exerciseId === filterEx);
  const sorted = [...filtered].sort((a,b) => b.value - a.value);
  const recent = Date.now() - 14*86400000;

  return (
    <div className="px-5">
      {state.prs.length === 0 ? (
        <EmptyState icon={<Trophy size={22} />} title="No PRs yet" description="Finish workouts with weight + reps logged. Est 1RM = weight × (1 + reps/30)." />
      ) : (
        <>
          {exerciseOptions.length > 1 && (
            <Select className="mb-3" value={filterEx} onChange={e => setFilterEx(e.target.value)}>
              <option value="all">All exercises</option>
              {exerciseOptions.map(id => <option key={id} value={id}>{exerciseById(id)?.name}</option>)}
            </Select>
          )}
          <div className="space-y-2">
            {sorted.map(p => {
              const isNew = p.date > recent;
              return (
                <Card key={p.id} className={isNew ? "ring-section" : ""}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{exerciseById(p.exerciseId)?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.weight}lb × {p.reps} • {new Date(p.date).toLocaleDateString()}{isNew ? " • NEW" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums" style={{ color: "var(--section)" }}>{p.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">est 1RM</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function HistoryTab() {
  const { state } = useStore();
  const [filter, setFilter] = useState<"all" | "workout" | "pr" | "weight" | "photo">("all");
  type Item = { id: string; ts: number; kind: "workout" | "pr" | "weight" | "photo"; title: string; sub: string };
  const items: Item[] = useMemo(() => {
    const arr: Item[] = [];
    state.workouts.forEach(w => arr.push({ id: `w-${w.id}`, ts: w.startedAt, kind: "workout", title: w.name, sub: `${w.exercises.length} exercises` }));
    state.prs.forEach(p => arr.push({ id: `p-${p.id}`, ts: p.date, kind: "pr", title: `PR — ${exerciseById(p.exerciseId)?.name}`, sub: `Est 1RM ${p.value} (${p.weight}×${p.reps})` }));
    state.bodyweightEntries.forEach(b => arr.push({ id: `b-${b.id}`, ts: b.createdAt, kind: "weight", title: `Weigh-in ${b.weightLb} lb`, sub: b.notes ?? "" }));
    state.progressPhotos.forEach(p => arr.push({ id: `ph-${p.id}`, ts: p.createdAt, kind: "photo", title: `Photo — ${p.view}`, sub: p.phase }));
    return arr.sort((a, b) => b.ts - a.ts);
  }, [state]);
  const filtered = filter === "all" ? items : items.filter(i => i.kind === filter);

  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar"><Filter size={14} className="text-muted-foreground self-center" />
        {(["all","workout","pr","weight","photo"] as const).map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Logged activity will show up on your timeline." />
      ) : (
        <div className="space-y-2">
          {filtered.map(it => (
            <Card key={it.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-sm">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(it.ts).toLocaleString()}{it.sub ? ` • ${it.sub}` : ""}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full self-start" style={{ background: "var(--section-soft)", color: "var(--section)" }}>{it.kind}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WeightTab() {
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
  const targetGap = state.profile.targetBodyweightLb - state.profile.bodyweightLb;

  const submit = () => {
    const wt = Number(w); if (!wt) return;
    set(s => ({ ...s,
      bodyweightEntries: [...s.bodyweightEntries, { id: uid(), weightLb: wt, createdAt: Date.now() }],
      profile: { ...s.profile, bodyweightLb: wt },
      goals: s.goals.map(g => g.type === "bodyweight" ? { ...g, current: wt } : g),
    }));
  };

  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Bodyweight</p>
        <p className="text-4xl font-bold tabular-nums mt-1">{state.profile.bodyweightLb} <span className="text-base text-muted-foreground">lb</span></p>
        <p className="text-xs text-muted-foreground mt-1">Target {state.profile.targetBodyweightLb} lb ({targetGap >= 0 ? "+" : ""}{targetGap.toFixed(1)} to go)</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div><p className="text-[10px] uppercase text-muted-foreground">Wk avg</p><p className="font-semibold tabular-nums">{weekAvg}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Δ 7d</p><p className="font-semibold tabular-nums">{dWeek >= 0 ? "+" : ""}{dWeek.toFixed(1)}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Δ 30d</p><p className="font-semibold tabular-nums">{dMonth >= 0 ? "+" : ""}{dMonth.toFixed(1)}</p></div>
        </div>
      </div>

      <SectionHeader title="Trend" />
      <Card>
        {sorted.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Log at least 2 weigh-ins to see your trend.</p>
        ) : (
          <Sparkline points={sorted.map(b => b.weightLb)} />
        )}
      </Card>

      <SectionHeader title="Log new" />
      <div className="space-y-3">
        <Input inputMode="decimal" value={w} onChange={e => setW(e.target.value)} placeholder="Weight in lb" />
        <PrimaryButton className="w-full" onClick={submit}>Save weight</PrimaryButton>
      </div>

      <SectionHeader title="Recent" />
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
                <button onClick={() => setConfirmDel(e.id)} className="text-muted-foreground"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { set(s => ({ ...s, bodyweightEntries: s.bodyweightEntries.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }}
        title="Delete weigh-in?" message="This can't be undone." confirmLabel="Delete" destructive />
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
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
        <span>{points[0]} lb</span><span>{points[points.length-1]} lb</span>
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
