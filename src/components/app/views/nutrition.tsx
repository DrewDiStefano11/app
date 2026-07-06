import { useState, useMemo } from "react";
import { Plus, Trash2, Utensils, Target, Camera, Sparkles } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import {
  Card,
  StatCard,
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Chip,
  Input,
  Label,
  Select,
  Ring,
  SubTabs,
  SectionHeader,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { Tile, Eyebrow } from "@/components/app/tile";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];
type Tab = "today" | "history" | "goals";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "history", label: "History" },
  { id: "goals", label: "Goals" },
];

export function NutritionView() {
  const [tab, setTab] = useState<Tab>("today");
  const { state } = useStore();
  const today = state.mealEntries.filter((m) => isToday(m.createdAt));
  const remaining = Math.max(
    0,
    state.nutritionTargets.calories - today.reduce((a, m) => a + m.calories, 0),
  );
  return (
    <div className="pb-24">
      <PageHeader title="Nutrition" subtitle={`${remaining} kcal remaining today`} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "today" && <TodayTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "goals" && <GoalsTab />}
    </div>
  );
}

/* ===================== TODAY ===================== */

function TodayTab() {
  const { state, set } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const today = state.mealEntries.filter((m) => isToday(m.createdAt));
  const t = today.reduce(
    (a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }),
    { c: 0, p: 0, cb: 0, f: 0 },
  );
  const tg = state.nutritionTargets;
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="px-5 space-y-4">
      <Tile hero accent delay={0} className="glow-section p-6">
        <Eyebrow color="var(--section)">Daily Macros</Eyebrow>
        <div className="flex items-center justify-between gap-6 mt-4">
          <div className="flex flex-col items-center gap-2">
            <Ring value={t.c} max={tg.calories} size={96} label="kcal" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {Math.round((t.c / Math.max(1, tg.calories)) * 100)}% Goal
            </p>
          </div>
          <div className="flex-1 space-y-3">
            <MacroBar
              label="Protein"
              value={t.p}
              target={tg.protein}
              unit="g"
              color="rgb(239 68 68)"
            />
            <MacroBar
              label="Carbs"
              value={t.cb}
              target={tg.carbs}
              unit="g"
              color="rgb(245 158 11)"
            />
            <MacroBar label="Fat" value={t.f} target={tg.fat} unit="g" color="rgb(34 197 94)" />
          </div>
        </div>
      </Tile>

      <div className="grid grid-cols-2 gap-3">
        <PrimaryButton onClick={() => setLogOpen(true)} className="rounded-2xl h-14">
          <Plus size={18} />
          <span>Log Meal</span>
        </PrimaryButton>
        <GhostButton
          onClick={() => setLogOpen(true)}
          className="rounded-2xl h-14 border-white/10 bg-white/5"
        >
          <Camera size={18} className="text-[var(--section)]" />
          <span>Scan</span>
        </GhostButton>
      </div>

      <div>
        <SectionHeader title="Today's Log" />
        {today.length === 0 ? (
          <EmptyState
            icon={<Utensils size={22} />}
            title="No meals yet"
            description="Log your first meal or scan with AI to start tracking."
            action={
              <PrimaryButton onClick={() => setLogOpen(true)} className="mt-2">
                <Plus size={16} />
                Log meal
              </PrimaryButton>
            }
          />
        ) : (
          <div className="space-y-3">
            {today.map((m) => (
              <div
                key={m.id}
                className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group transition-all active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{m.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      {m.type}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-bold text-white/40">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right px-3">
                  <p className="font-display text-xl leading-none tabular-nums text-white">
                    {Math.round(m.calories)}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">
                    P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                  </p>
                </div>
                <button
                  aria-label="Delete meal"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  onClick={() => setConfirmDel(m.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <LogMealSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          set((s) => ({ ...s, mealEntries: s.mealEntries.filter((x) => x.id !== confirmDel) }));
          setConfirmDel(null);
        }}
        title="Delete meal?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / Math.max(1, target)) * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5">
        <span className="text-white/40">{label}</span>
        <span className="text-white/80 tabular-nums">
          {Math.round(value)}/{target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color || "var(--section)" }}
        />
      </div>
    </div>
  );
}

/* ===================== HISTORY ===================== */

const DAY = 86400000;

function HistoryTab() {
  const { state } = useStore();
  const days = useMemo(() => {
    const map = new Map<number, MealEntry[]>();
    for (const m of state.mealEntries) {
      const d = Math.floor(m.createdAt / DAY);
      const arr = map.get(d) ?? [];
      arr.push(m);
      map.set(d, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).slice(0, 14);
  }, [state.mealEntries]);

  const tg = state.nutritionTargets;
  const week = days.slice(0, 7).map(([, meals]) => meals.reduce((a, m) => a + m.calories, 0));
  const weekAvg = week.length ? Math.round(week.reduce((a, b) => a + b, 0) / week.length) : 0;
  const onTarget = week.filter(
    (c) => Math.abs(c - tg.calories) / Math.max(1, tg.calories) < 0.1,
  ).length;

  return (
    <div className="px-5 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Tile delay={0} className="p-4">
          <Eyebrow color="var(--section)">7d Average</Eyebrow>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-display text-3xl">{weekAvg}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              kcal
            </span>
          </div>
        </Tile>
        <Tile delay={100} className="p-4">
          <Eyebrow color="rgb(34 197 94)">Consistency</Eyebrow>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-display text-3xl">{onTarget}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              / {week.length} Days
            </span>
          </div>
        </Tile>
      </div>

      <div>
        <SectionHeader title="Past Days" />
        {days.length === 0 ? (
          <EmptyState
            icon={<Utensils size={22} />}
            title="No history yet"
            description="Logged meals will show up here grouped by day."
          />
        ) : (
          <div className="space-y-3">
            {days.map(([dayKey, meals], idx) => {
              const total = meals.reduce(
                (a, m) => ({
                  c: a.c + m.calories,
                  p: a.p + m.protein,
                  cb: a.cb + m.carbs,
                  f: a.f + m.fat,
                }),
                { c: 0, p: 0, cb: 0, f: 0 },
              );
              const pct = Math.min(100, (total.c / Math.max(1, tg.calories)) * 100);
              return (
                <div
                  key={dayKey}
                  className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white">
                        {new Date(dayKey * DAY).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-0.5">
                        {meals.length} meal{meals.length === 1 ? "" : "s"} logged
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl leading-none text-white">
                        {Math.round(total.c)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
                        kcal
                      </p>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full overflow-hidden bg-white/5 mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: "var(--section)" }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-white/40">
                        <span>P</span>
                        <span>{Math.round(total.p)}g</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-red-500/60"
                          style={{
                            width: `${Math.min(100, (total.p / Math.max(1, tg.protein)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-white/40">
                        <span>C</span>
                        <span>{Math.round(total.cb)}g</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-amber-500/60"
                          style={{
                            width: `${Math.min(100, (total.cb / Math.max(1, tg.carbs)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-white/40">
                        <span>F</span>
                        <span>{Math.round(total.f)}g</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-green-500/60"
                          style={{
                            width: `${Math.min(100, (total.f / Math.max(1, tg.fat)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== GOALS ===================== */

function GoalsTab() {
  const { state, set } = useStore();
  const tg = state.nutritionTargets;
  const [c, setC] = useState(String(tg.calories));
  const [p, setP] = useState(String(tg.protein));
  const [cb, setCb] = useState(String(tg.carbs));
  const [f, setF] = useState(String(tg.fat));
  const bw = state.profile.bodyweightLb;
  const targetBw = state.profile.targetBodyweightLb;
  const proteinPerLb = (Number(p) || 0) / Math.max(1, bw);
  const goalRec =
    state.profile.goal === "cut"
      ? "Cut: ~10–20% calorie deficit. Keep protein ≥ 1g/lb."
      : state.profile.goal === "lean_bulk"
        ? "Lean bulk: ~150–300 kcal surplus. Protein 0.8–1g/lb."
        : state.profile.goal === "strength"
          ? "Strength: maintain or slight surplus. Protein 0.8–1g/lb."
          : state.profile.goal === "maintenance"
            ? "Maintenance: match expenditure. Protein 0.7–1g/lb."
            : "Hypertrophy: small surplus + protein ≥ 0.8g/lb for muscle gain.";

  const save = () =>
    set((s) => ({
      ...s,
      nutritionTargets: { calories: +c || 0, protein: +p || 0, carbs: +cb || 0, fat: +f || 0 },
    }));

  return (
    <div className="px-5 space-y-6">
      <Tile accent hero className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 border border-white/10 shadow-inner">
            <Target size={24} className="text-[var(--section)]" />
          </div>
          <div>
            <Eyebrow color="var(--section)">Current Strategy</Eyebrow>
            <h2 className="font-display text-2xl leading-none mt-1 capitalize text-white">
              {state.profile.goal.replace("_", " ")}
            </h2>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-white/60 mt-4 font-medium">{goalRec}</p>
      </Tile>

      <div>
        <SectionHeader title="Daily Targets" />
        <div className="premium-card p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Calories</Label>
              <Input
                inputMode="numeric"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Protein (g)</Label>
              <Input
                inputMode="numeric"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl font-bold text-red-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Carbs (g)</Label>
              <Input
                inputMode="numeric"
                value={cb}
                onChange={(e) => setCb(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl font-bold text-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fat (g)</Label>
              <Input
                inputMode="numeric"
                value={f}
                onChange={(e) => setF(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl font-bold text-green-400"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between px-1 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Protein Intensity
              </span>
              <span className="text-xs font-bold tabular-nums text-white/60">
                {proteinPerLb.toFixed(2)} g/lb
              </span>
            </div>
            <PrimaryButton className="w-full rounded-xl h-12 shadow-lg" onClick={save}>
              Save Targets
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Bodyweight Goal" />
        <div className="premium-card p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Current Weight
              </p>
              <p className="font-display text-2xl text-white mt-1">
                {bw}
                <span className="text-xs ml-1 text-white/40">lb</span>
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Target Weight
              </p>
              <p className="font-display text-2xl text-[var(--section)] mt-1">
                {targetBw}
                <span className="text-xs ml-1 opacity-50">lb</span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold text-white/30 italic">
              Tracked under Progress → Body metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== LOG SHEET ===================== */

function LogMealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, set } = useStore();
  const [mode, setMode] = useState<"templates" | "foods" | "custom">("templates");
  const [type, setType] = useState("dinner");
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [fat, setFat] = useState("");
  const [search, setSearch] = useState("");

  const addMeal = (m: MealEntry) => {
    set((s) => ({ ...s, mealEntries: [...s.mealEntries, m] }));
    onClose();
  };
  const filteredFoods = FOODS.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const recentNames = Array.from(
    new Set([...state.mealEntries].reverse().map((m) => m.name)),
  ).slice(0, 6);

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Meal" height="tall">
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        <Chip active={mode === "templates"} onClick={() => setMode("templates")}>
          Templates
        </Chip>
        <Chip active={mode === "foods"} onClick={() => setMode("foods")}>
          Foods Library
        </Chip>
        <Chip active={mode === "custom"} onClick={() => setMode("custom")}>
          Custom Entry
        </Chip>
      </div>

      {mode === "templates" && (
        <div className="mb-4">
          <div
            className="p-4 rounded-2xl bg-gradient-to-br from-[var(--section-soft)] to-transparent border border-[var(--section-soft)] mb-4 flex items-center justify-between group press transition-all"
            onClick={() => window.dispatchEvent(new CustomEvent("fitcore:open-ai"))}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--section)] flex items-center justify-center text-white shadow-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Scan with FitCore AI</p>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                  Instant photo estimation
                </p>
              </div>
            </div>
            <Camera size={18} className="text-white/40 group-hover:text-white transition-colors" />
          </div>

          {recentNames.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-1">
                Recently Logged
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {recentNames.map((n) => {
                  const m = [...state.mealEntries].reverse().find((x) => x.name === n)!;
                  return (
                    <Chip
                      key={n}
                      onClick={() => addMeal({ ...m, id: uid(), createdAt: Date.now() })}
                    >
                      {n}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-1">
            Meal Templates
          </p>
          <div className="space-y-2.5 pr-1">
            {MEAL_TEMPLATES.map((mt) => {
              const t = mealTotals(mt.items);
              return (
                <div
                  key={mt.id}
                  onClick={() =>
                    addMeal({
                      id: uid(),
                      name: mt.name,
                      type: mt.type,
                      calories: t.calories,
                      protein: t.protein,
                      carbs: t.carbs,
                      fat: t.fat,
                      createdAt: Date.now(),
                    })
                  }
                  className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group press transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate text-sm">{mt.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-0.5">
                      {mt.type} • {mt.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-white tabular-nums">
                      {Math.round(t.calories)}
                    </p>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                      P{Math.round(t.protein)} C{Math.round(t.carbs)} F{Math.round(t.fat)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "foods" && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Search foods library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl pl-4 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">As</p>
            <Select
              className="h-9 py-0 px-3 bg-white/5 border-white/10 rounded-lg text-xs font-bold uppercase"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m} className="bg-black">
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 pr-1">
            {filteredFoods.map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  addMeal({
                    id: uid(),
                    name: f.name,
                    type,
                    calories: f.calories,
                    protein: f.protein,
                    carbs: f.carbs,
                    fat: f.fat,
                    createdAt: Date.now(),
                  })
                }
                className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center press transition-all"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm truncate">{f.name}</p>
                  <p className="text-[10px] font-bold text-white/40 mt-0.5">{f.servingLabel}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-base font-display text-white tabular-nums">{f.calories}</p>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                    P{f.protein} C{f.carbs} F{f.fat}
                  </p>
                </div>
              </button>
            ))}
            {filteredFoods.length === 0 && (
              <p className="text-center py-8 text-white/20 text-sm font-medium italic">
                No foods found matching "{search}"
              </p>
            )}
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-5 pt-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Meal Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Post-workout protein bowl"
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meal Type</Label>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12 capitalize font-bold"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m} className="bg-black">
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Kcal</Label>
                <Input
                  inputMode="numeric"
                  value={cal}
                  onChange={(e) => setCal(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label>P</Label>
                <Input
                  inputMode="numeric"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-red-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label>C</Label>
                <Input
                  inputMode="numeric"
                  value={c}
                  onChange={(e) => setC(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-amber-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label>F</Label>
                <Input
                  inputMode="numeric"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-green-400"
                />
              </div>
            </div>
          </div>
          <div className="pt-4">
            <PrimaryButton
              className="w-full rounded-xl h-14 shadow-lg text-lg"
              disabled={!name || !cal}
              onClick={() => {
                addMeal({
                  id: uid(),
                  name,
                  type,
                  calories: Number(cal) || 0,
                  protein: Number(p) || 0,
                  carbs: Number(c) || 0,
                  fat: Number(fat) || 0,
                  createdAt: Date.now(),
                });
                setName("");
                setCal("");
                setP("");
                setC("");
                setFat("");
              }}
            >
              Add to Daily Log
            </PrimaryButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
