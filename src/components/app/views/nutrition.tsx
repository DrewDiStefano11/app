import { useState, useMemo } from "react";
import { Plus, Trash2, Utensils, Target } from "lucide-react";
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
        <PrimaryButton onClick={() => setLogOpen(true)} className="w-full mt-4">
          <Plus size={16} />
          Log meal
        </PrimaryButton>
      </div>

      <SectionHeader title="Today's food log" />
      {today.length === 0 ? (
        <EmptyState
          icon={<Utensils size={22} />}
          title="No meals yet"
          description="Log your first meal to start tracking macros."
          action={
            <PrimaryButton onClick={() => setLogOpen(true)}>
              <Plus size={16} />
              Log meal
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-2">
          {today.map((m) => (
            <Card key={m.id}>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {m.type} •{" "}
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{Math.round(m.calories)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                  </p>
                </div>
                <button
                  aria-label="Delete meal"
                  className="ml-3 text-muted-foreground"
                  onClick={() => setConfirmDel(m.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, (value / Math.max(1, target)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}/{target}
          {unit}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--section)" }} />
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
    <div className="px-5">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Days logged" value={days.length} accent />
        <StatCard label="7d avg" value={`${weekAvg}`} sub="kcal" />
        <StatCard label="On target" value={`${onTarget}/${week.length}`} sub="days" />
      </div>

      <SectionHeader title="Past days" />
      {days.length === 0 ? (
        <EmptyState
          icon={<Utensils size={22} />}
          title="No history yet"
          description="Logged meals will show up here grouped by day."
        />
      ) : (
        <div className="space-y-2">
          {days.map(([dayKey, meals]) => {
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
              <Card key={dayKey}>
                <div className="flex justify-between items-baseline mb-2">
                  <p className="font-semibold text-sm">
                    {new Date(dayKey * DAY).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(total.c)} kcal • {meals.length} meal{meals.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden mb-2"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: "var(--section)" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  P{Math.round(total.p)} • C{Math.round(total.cb)} • F{Math.round(total.f)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
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
    <div className="px-5">
      <div className="card-elev p-5 section-gradient ring-section">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--section)" }}
          >
            <Target size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Plan</p>
            <p className="font-semibold capitalize">{state.profile.goal.replace("_", " ")}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">{goalRec}</p>
      </div>

      <SectionHeader title="Daily targets" />
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Calories</Label>
            <Input inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input inputMode="numeric" value={cb} onChange={(e) => setCb(e.target.value)} />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input inputMode="numeric" value={f} onChange={(e) => setF(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 tabular-nums">
          Protein per bodyweight: {proteinPerLb.toFixed(2)} g/lb
        </p>
        <PrimaryButton className="w-full mt-3" onClick={save}>
          Save targets
        </PrimaryButton>
      </Card>

      <SectionHeader title="Bodyweight goal" />
      <Card>
        <div className="flex justify-between items-baseline">
          <p className="text-sm text-muted-foreground">Current → Target</p>
          <p className="font-semibold tabular-nums">
            {bw} → {targetBw} lb
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Tracked under Progress → Body.</p>
      </Card>
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
    <BottomSheet open={open} onClose={onClose} title="Log meal" height="tall">
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        <Chip active={mode === "templates"} onClick={() => setMode("templates")}>
          Templates
        </Chip>
        <Chip active={mode === "foods"} onClick={() => setMode("foods")}>
          Foods
        </Chip>
        <Chip active={mode === "custom"} onClick={() => setMode("custom")}>
          Custom
        </Chip>
      </div>

      {recentNames.length > 0 && mode !== "custom" && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Recent — tap to duplicate</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentNames.map((n) => {
              const m = [...state.mealEntries].reverse().find((x) => x.name === n)!;
              return (
                <Chip key={n} onClick={() => addMeal({ ...m, id: uid(), createdAt: Date.now() })}>
                  {n}
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      {mode === "templates" && (
        <div className="space-y-2 max-h-[50dvh] overflow-y-auto">
          {MEAL_TEMPLATES.map((mt) => {
            const t = mealTotals(mt.items);
            return (
              <Card
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
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{mt.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {mt.type} • {mt.items.length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{Math.round(t.calories)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      P{Math.round(t.protein)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {mode === "foods" && (
        <>
          <Input
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select className="mt-2" value={type} onChange={(e) => setType(e.target.value)}>
            {MEAL_TYPES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <div className="mt-3 space-y-1.5 max-h-[40dvh] overflow-y-auto">
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
                className="w-full text-left p-3 rounded-xl bg-[var(--surface-2)] flex justify-between"
              >
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

      {mode === "custom" && (
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Post-workout shake"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label>Cal</Label>
              <Input inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} />
            </div>
            <div>
              <Label>P</Label>
              <Input inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} />
            </div>
            <div>
              <Label>C</Label>
              <Input inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} />
            </div>
            <div>
              <Label>F</Label>
              <Input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>
          <PrimaryButton
            className="w-full"
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
            Add meal
          </PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}
