import { useState } from "react";
import { Plus, Trash2, Utensils } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import { Card, PageHeader, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Ring, SubTabs, SectionHeader } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";

const MEAL_TYPES = ["breakfast","lunch","dinner","snack","pre-workout","post-workout"];
type Tab = "macros" | "log";
const TABS: { id: Tab; label: string }[] = [
  { id: "macros", label: "Macros" },
  { id: "log", label: "Log" },
];

export function NutritionView() {
  const [tab, setTab] = useState<Tab>("macros");
  const { state } = useStore();
  const today = state.mealEntries.filter(m => isToday(m.createdAt));
  const remaining = Math.max(0, state.nutritionTargets.calories - today.reduce((a, m) => a + m.calories, 0));
  return (
    <div className="pb-24">
      <PageHeader title="Nutrition" subtitle={`${remaining} kcal remaining today`} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "macros" && <MacrosTab onLog={() => setTab("log")} />}
      {tab === "log" && <LogTab />}
    </div>
  );
}

function MacrosTab({ onLog }: { onLog: () => void }) {
  const { state, set } = useStore();
  const [editTargets, setEditTargets] = useState(false);
  const today = state.mealEntries.filter(m => isToday(m.createdAt));
  const t = today.reduce((a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }), { c: 0, p: 0, cb: 0, f: 0 });
  const tg = state.nutritionTargets;
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-center justify-between gap-4">
          <Ring value={t.c} max={tg.calories} size={92} label="kcal" />
          <div className="flex-1 space-y-2">
            <MacroBar label="Protein" value={t.p} target={tg.protein} unit="g" />
            <MacroBar label="Carbs" value={t.cb} target={tg.carbs} unit="g" />
            <MacroBar label="Fat" value={t.f} target={tg.fat} unit="g" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <PrimaryButton onClick={onLog} className="flex-1"><Plus size={16} />Log meal</PrimaryButton>
          <GhostButton onClick={() => setEditTargets(true)}>Targets</GhostButton>
        </div>
      </div>

      <SectionHeader title="Today's meals" />
      {today.length === 0 ? (
        <EmptyState icon={<Utensils size={22} />} title="No meals yet" description="Log your first meal to start tracking macros." action={<PrimaryButton onClick={onLog}><Plus size={16} />Log meal</PrimaryButton>} />
      ) : (
        <div className="space-y-2">
          {today.map(m => (
            <Card key={m.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.type} • {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{Math.round(m.calories)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}</p>
                </div>
                <button aria-label="Delete meal" className="ml-3 text-muted-foreground" onClick={() => setConfirmDel(m.id)}><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TargetsSheet open={editTargets} onClose={() => setEditTargets(false)} />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { set(s => ({ ...s, mealEntries: s.mealEntries.filter(x => x.id !== confirmDel) })); setConfirmDel(null); }} title="Delete meal?" message="This can't be undone." confirmLabel="Delete" destructive />
    </div>
  );
}

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, (value / Math.max(1, target)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{Math.round(value)}/{target}{unit}</span></div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--section)" }} />
      </div>
    </div>
  );
}

function LogTab() {
  const { state, set } = useStore();
  const [tab, setTab] = useState<"templates" | "foods" | "custom">("templates");
  const [type, setType] = useState("dinner");
  const [name, setName] = useState("");
  const [cal, setCal] = useState(""); const [p, setP] = useState(""); const [c, setC] = useState(""); const [fat, setFat] = useState("");
  const [search, setSearch] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const addMeal = (m: MealEntry) => set(s => ({ ...s, mealEntries: [...s.mealEntries, m] }));
  const filteredFoods = FOODS.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const recentNames = Array.from(new Set([...state.mealEntries].reverse().map(m => m.name))).slice(0, 6);

  return (
    <div className="px-5">
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        <Chip active={tab === "templates"} onClick={() => setTab("templates")}>Templates</Chip>
        <Chip active={tab === "foods"} onClick={() => setTab("foods")}>Foods</Chip>
        <Chip active={tab === "custom"} onClick={() => setTab("custom")}>Custom</Chip>
      </div>

      {recentNames.length > 0 && tab !== "custom" && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Recent — tap to duplicate</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentNames.map(n => {
              const m = [...state.mealEntries].reverse().find(x => x.name === n)!;
              return <Chip key={n} onClick={() => addMeal({ ...m, id: uid(), createdAt: Date.now() })}>{n}</Chip>;
            })}
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-2">
          {MEAL_TEMPLATES.map(mt => {
            const t = mealTotals(mt.items);
            return (
              <Card key={mt.id} onClick={() => addMeal({ id: uid(), name: mt.name, type: mt.type, calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, createdAt: Date.now() })}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{mt.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{mt.type} • {mt.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{Math.round(t.calories)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">P{Math.round(t.protein)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "foods" && (
        <>
          <Input placeholder="Search foods..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select className="mt-2" value={type} onChange={e => setType(e.target.value)}>
            {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
          </Select>
          <div className="mt-3 space-y-1.5">
            {filteredFoods.map(f => (
              <button key={f.id} onClick={() => addMeal({ id: uid(), name: f.name, type, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, createdAt: Date.now() })}
                className="w-full text-left p-3 rounded-xl bg-[var(--surface-2)] flex justify-between">
                <div>
                  <p className="font-medium text-sm">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.servingLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{f.calories}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">P{f.protein}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "custom" && (
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Post-workout shake" /></div>
          <div><Label>Type</Label><Select value={type} onChange={e => setType(e.target.value)}>{MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}</Select></div>
          <div className="grid grid-cols-4 gap-2">
            <div><Label>Cal</Label><Input inputMode="numeric" value={cal} onChange={e => setCal(e.target.value)} /></div>
            <div><Label>P</Label><Input inputMode="numeric" value={p} onChange={e => setP(e.target.value)} /></div>
            <div><Label>C</Label><Input inputMode="numeric" value={c} onChange={e => setC(e.target.value)} /></div>
            <div><Label>F</Label><Input inputMode="numeric" value={fat} onChange={e => setFat(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} />
            Save as quick re-log
          </label>
          <PrimaryButton className="w-full" disabled={!name || !cal} onClick={() => {
            addMeal({ id: uid(), name, type, calories: Number(cal)||0, protein: Number(p)||0, carbs: Number(c)||0, fat: Number(fat)||0, createdAt: Date.now() });
            setName(""); setCal(""); setP(""); setC(""); setFat("");
          }}>Add meal</PrimaryButton>
        </div>
      )}
    </div>
  );
}


function TargetsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [c, setC] = useState(String(state.nutritionTargets.calories));
  const [p, setP] = useState(String(state.nutritionTargets.protein));
  const [cb, setCb] = useState(String(state.nutritionTargets.carbs));
  const [f, setF] = useState(String(state.nutritionTargets.fat));
  return (
    <BottomSheet open={open} onClose={onClose} title="Macro targets">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Calories</Label><Input inputMode="numeric" value={c} onChange={e => setC(e.target.value)} /></div>
        <div><Label>Protein (g)</Label><Input inputMode="numeric" value={p} onChange={e => setP(e.target.value)} /></div>
        <div><Label>Carbs (g)</Label><Input inputMode="numeric" value={cb} onChange={e => setCb(e.target.value)} /></div>
        <div><Label>Fat (g)</Label><Input inputMode="numeric" value={f} onChange={e => setF(e.target.value)} /></div>
      </div>
      <PrimaryButton className="w-full mt-4" onClick={() => { set(s => ({ ...s, nutritionTargets: { calories: +c||0, protein: +p||0, carbs: +cb||0, fat: +f||0 } })); onClose(); }}>Save targets</PrimaryButton>
    </BottomSheet>
  );
}
