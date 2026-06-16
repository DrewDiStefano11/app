import { useState, useMemo } from "react";
import { Trophy, Camera, TrendingUp, Plus, Image as ImageIcon } from "lucide-react";
import { useStore, uid, e1RM } from "@/lib/store";
import { exerciseById } from "@/lib/data";
import type { ProgressPhoto } from "@/lib/types";
import { Card, StatCard, PageHeader, PrimaryButton, GhostButton, EmptyState, Label, Input, Select } from "@/components/app/ui";
import { BottomSheet } from "@/components/app/sheet";

export function ProgressView() {
  const { state, set } = useStore();
  const [photoOpen, setPhotoOpen] = useState(false);

  const sortedBw = useMemo(() => [...state.bodyweightEntries].sort((a,b) => a.createdAt - b.createdAt), [state.bodyweightEntries]);
  const bwTrend = sortedBw.length >= 2 ? sortedBw[sortedBw.length-1].weightLb - sortedBw[0].weightLb : 0;
  const weekWorkouts = state.workouts.filter(w => w.startedAt > Date.now() - 7*86400000).length;

  return (
    <div className="pb-6">
      <PageHeader title="Progress" subtitle="Your last 7 days at a glance" />

      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Workouts" value={weekWorkouts} sub="this week" accent />
          <StatCard label="PRs" value={state.prs.length} sub="all time" />
          <StatCard label="Bodyweight" value={`${state.profile.bodyweightLb}`} sub="lb" />
          <StatCard label="Trend" value={`${bwTrend >= 0 ? "+" : ""}${bwTrend.toFixed(1)}`} sub="lb total" />
        </div>

        <h3 className="font-semibold mt-6 mb-2 px-1">Bodyweight trend</h3>
        <Card>
          {sortedBw.length < 2 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Log at least 2 weigh-ins to see your trend.</p>
          ) : (
            <Sparkline points={sortedBw.map(b => b.weightLb)} />
          )}
        </Card>

        <h3 className="font-semibold mt-6 mb-2 px-1">Personal records</h3>
        {state.prs.length === 0 ? (
          <EmptyState icon={<Trophy size={22} />} title="No PRs yet" description="Finish workouts with weight + reps to track estimated 1RMs." />
        ) : (
          <div className="space-y-2">
            {[...state.prs].sort((a,b) => b.value - a.value).slice(0, 8).map(p => {
              const ex = exerciseById(p.exerciseId);
              return (
                <Card key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{ex?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.weight}lb × {p.reps} • {new Date(p.date).toLocaleDateString()}</p>
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
        )}

        <div className="flex items-center justify-between mt-6 mb-2 px-1">
          <h3 className="font-semibold">Progress photos</h3>
          <button onClick={() => setPhotoOpen(true)} className="text-xs hover:text-foreground" style={{ color: "var(--section)" }}>+ Add</button>
        </div>
        {state.progressPhotos.length === 0 ? (
          <EmptyState icon={<Camera size={22} />} title="No photos yet" description="Track visible changes over weeks and months." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {state.progressPhotos.slice(-9).reverse().map(p => (
              <div key={p.id} className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] relative">
                <img src={p.dataUrl} alt={p.view} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">{p.view}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} />
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
    set(s => ({ ...s, progressPhotos: [...s.progressPhotos, { id: uid(), dataUrl, view, phase, createdAt: Date.now() }] }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Add progress photo">
      <div className="space-y-3">
        <div><Label>View</Label><Select value={view} onChange={e => setView(e.target.value as ProgressPhoto["view"])}><option>front</option><option>side</option><option>back</option></Select></div>
        <div><Label>Phase</Label><Select value={phase} onChange={e => setPhase(e.target.value as ProgressPhoto["phase"])}><option>bulk</option><option>cut</option><option>maintenance</option></Select></div>
        <div>
          <Label>Photo</Label>
          <label className="mt-1 block cursor-pointer">
            <div className="aspect-[3/4] rounded-xl bg-[var(--surface-2)] border border-dashed border-border flex items-center justify-center overflow-hidden">
              {dataUrl ? <img src={dataUrl} alt="preview" className="w-full h-full object-cover" /> : <div className="text-center text-muted-foreground"><ImageIcon className="mx-auto mb-1" /><span className="text-xs">Tap to choose</span></div>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <PrimaryButton className="w-full" disabled={!dataUrl} onClick={submit}>Save photo</PrimaryButton>
      </div>
    </BottomSheet>
  );
}
