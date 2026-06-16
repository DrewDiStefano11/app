import { useState } from "react";
import { Plus, Trash2, Coffee, Utensils, Apple as AppleIcon } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, foodById, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import { Card, PageHeader, PrimaryButton, GhostButton, EmptyState, Chip, Input, Label, Select, Ring } from "@/components/app/ui";
import { BottomSheet } from "@/components/app/sheet";

const MEAL_TYPES = ["breakfast","lunch","dinner","snack","pre-workout","post-workout"];

export function NutritionView() {
  const { state, set } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [editTargets, setEditTargets] = useState(false);

  const today = state.mealEntries.filter(m => isToday(m.createdAt));
  const t = today.reduce((a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }), { c: 0, p: 0, cb: 0, f: 0 });
  const tg = state.nutritionTargets;

  return (
    <div className="pb-6">
      <PageHeader title="Nutrition" subtitle={`${Math.max(0, tg.calories - t.c)} kcal remaining`} />

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
            <PrimaryButton onClick={() => setLogOpen(true)} className="flex-1"><Plus size={16} />Log meal</PrimaryButton>
            <GhostButton onClick={() => setEditTargets(true)}>Targets</GhostButton>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-2 px-1">
          <h3 className="font-semibold">Today's meals</h3>
          <button onClick={() => setWeightOpen(true)} className="text-xs text-muted-foreground hover:text-foreground">Log weight</button>
        </div>

        {today.length === 0 ? (
          <EmptyState icon={<Utensils size={22} />} title="No meals logged" description="Log your first meal to start tracking macros." action={<PrimaryButton onClick={() => setLogOpen(true)}><Plus size={16} />Log meal</PrimaryButton>} />
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
                  <button className="ml-3 text-muted-foreground" onClick={() => set(s => ({ ...s, mealEntries: s.mealEntries.filter(x => x.id !== m.id) }))}><Trash2 size={14} /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <h3 className="font-semibold mt-6 mb-2 px-1">Recent recommendations</h3>
        <Card>
          <p className="text-sm">{
            t.p < tg.protein * 0.5
              ? `You're ${Math.round(tg.protein - t.p)}g short on protein. Add chicken, Greek yogurt, or whey.`
              : t.c > tg.calories
                ? `You're ${Math.round(t.c - tg.calories)} kcal over target — consider a lighter dinner.`
                : "You're tracking well today. Keep meals consistent and time carbs around training."
          }</p>
        </Card>
      </div>

      <LogMealSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <TargetsSheet open={editTargets} onClose={() => setEditTargets(false)} />
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

function LogMealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [tab, setTab] = useState<"templates" | "foods" | "custom">("templates");
  const [type, setType] = useState("dinner");
  const [name, setName] = useState("");
  const [cal, setCal] = useState(""); const [p, setP] = useState(""); const [c, setC] = useState(""); const [fat, setFat] = useState("");
  const [search, setSearch] = useState("");

  const addMeal = (m: MealEntry) => {
    set(s => ({ ...s, mealEntries: [...s.mealEntries, m] }));
    onClose();
  };

  const filteredFoods = FOODS.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const recentNames = Array.from(new Set(state.mealEntries.slice(-10).reverse().map(m => m.name))).slice(0, 5);

  return (
    <BottomSheet open={open} onClose={onClose} title="Log meal" height="tall">
      <div className="flex gap-2 mb-3">
        <Chip active={tab === "templates"} onClick={() => setTab("templates")}>Templates</Chip>
        <Chip active={tab === "foods"} onClick={() => setTab("foods")}>Foods</Chip>
        <Chip active={tab === "custom"} onClick={() => setTab("custom")}>Custom</Chip>
      </div>

      {recentNames.length > 0 && tab !== "custom" && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Recent</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentNames.map(n => {
              const m = [...state.mealEntries].reverse().find(x => x.name === n)!;
              return <Chip key={n} onClick={() => addMeal({ ...m, id: uid(), createdAt: Date.now() })}>{n}</Chip>;
            })}
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-2 max-h-[55dvh] overflow-y-auto">
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
          <div className="mt-3 space-y-1.5 max-h-[50dvh] overflow-y-auto">
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
          <PrimaryButton className="w-full" disabled={!name || !cal} onClick={() => addMeal({ id: uid(), name, type, calories: Number(cal)||0, protein: Number(p)||0, carbs: Number(c)||0, fat: Number(fat)||0, createdAt: Date.now() })}>Add meal</PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}

function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [w, setW] = useState(String(state.profile.bodyweightLb));
  const submit = () => {
    const wt = Number(w);
    if (!wt) return;
    set(s => ({
      ...s,
      bodyweightEntries: [...s.bodyweightEntries, { id: uid(), weightLb: wt, createdAt: Date.now() }],
      profile: { ...s.profile, bodyweightLb: wt },
      goals: s.goals.map(g => g.type === "bodyweight" ? { ...g, current: wt } : g),
    }));
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Log bodyweight">
      <div className="space-y-3">
        <div><Label>Weight (lb)</Label><Input inputMode="decimal" value={w} onChange={e => setW(e.target.value)} /></div>
        <PrimaryButton className="w-full" onClick={submit}>Save weight</PrimaryButton>
      </div>
    </BottomSheet>
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
