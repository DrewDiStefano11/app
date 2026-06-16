import { useState } from "react";
import { Plus, Trash2, Pin, PinOff } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import type { Goal, SectionId } from "@/lib/types";
import { Card, EmptyState, PrimaryButton, GhostButton, Input, Label, Select } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const TYPE_LABEL: Record<Goal["type"], string> = {
  lift: "Lift target",
  weekly_workouts: "Weekly workouts",
  bodyweight: "Bodyweight",
  cardio: "Cardio target",
  habit: "Habit",
  volume: "Volume target",
  sleep: "Sleep hours",
  readiness: "Readiness avg",
  macro: "Macro target",
  consistency: "Consistency",
  photo: "Photo habit",
};

export function GoalsTab({ section, typeOptions, emptyTitle }: {
  section: SectionId;
  typeOptions: Goal["type"][];
  emptyTitle?: string;
}) {
  const { state, set } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const goals = state.goals
    .filter(g => (g.section ?? defaultSectionFor(g.type)) === section)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="px-5 pb-6">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">{goals.length} goal{goals.length === 1 ? "" : "s"}</p>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus size={16} />New goal</PrimaryButton>
      </div>

      {goals.length === 0 ? (
        <EmptyState title={emptyTitle ?? "No goals yet"} description="Set targets to track real progress." action={<PrimaryButton onClick={() => setAddOpen(true)}><Plus size={16} />Add a goal</PrimaryButton>} />
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.min(100, (g.current / Math.max(1, g.target)) * 100);
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{g.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{TYPE_LABEL[g.type]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => set(s => ({ ...s, goals: s.goals.map(x => x.id === g.id ? { ...x, pinned: !x.pinned } : x) }))}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
                      {g.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button onClick={() => setConfirmDel(g.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Progress</span><span className="tabular-nums">{g.current}/{g.target}</span></div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--section)" }} />
                </div>
                <div className="flex gap-2 mt-3">
                  <GhostButton className="flex-1 py-2 text-xs" onClick={() => set(s => ({ ...s, goals: s.goals.map(x => x.id === g.id ? { ...x, current: Math.max(0, x.current - 1) } : x) }))}>−1</GhostButton>
                  <GhostButton className="flex-1 py-2 text-xs" onClick={() => set(s => ({ ...s, goals: s.goals.map(x => x.id === g.id ? { ...x, current: x.current + 1 } : x) }))}>+1</GhostButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddGoalSheet open={addOpen} onClose={() => setAddOpen(false)} section={section} typeOptions={typeOptions} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { set(s => ({ ...s, goals: s.goals.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }}
        title="Delete goal?" message="This can't be undone." confirmLabel="Delete" destructive />
    </div>
  );
}

function defaultSectionFor(t: Goal["type"]): SectionId {
  if (["lift","weekly_workouts","cardio","volume"].includes(t)) return "training";
  if (["macro"].includes(t)) return "nutrition";
  if (["sleep","readiness"].includes(t)) return "recovery";
  if (["bodyweight","consistency","photo"].includes(t)) return "progress";
  return "training";
}

function AddGoalSheet({ open, onClose, section, typeOptions }: { open: boolean; onClose: () => void; section: SectionId; typeOptions: Goal["type"][] }) {
  const { set } = useStore();
  const [type, setType] = useState<Goal["type"]>(typeOptions[0]);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("10");
  const [current, setCurrent] = useState("0");
  const submit = () => {
    if (!label) return;
    const g: Goal = { id: uid(), type, label, target: Number(target) || 0, current: Number(current) || 0, section };
    set(s => ({ ...s, goals: [...s.goals, g] }));
    setLabel(""); setTarget("10"); setCurrent("0");
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="New goal">
      <div className="space-y-3">
        <div><Label>Type</Label>
          <Select value={type} onChange={e => setType(e.target.value as Goal["type"])}>
            {typeOptions.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        </div>
        <div><Label>Goal</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Bench press 225 lb" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Target</Label><Input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></div>
          <div><Label>Current</Label><Input inputMode="decimal" value={current} onChange={e => setCurrent(e.target.value)} /></div>
        </div>
        <PrimaryButton className="w-full" disabled={!label} onClick={submit}>Save goal</PrimaryButton>
      </div>
    </BottomSheet>
  );
}
