import { useState } from "react";
import { Plus, Trash2, Utensils, Camera, Sparkles, Droplets, Pill } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Chip,
  Input,
  Label,
  Select,
  Ring,
  SectionHeader,
  SubTabs,
  PlannedFeatureCard,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { Tile, Eyebrow } from "@/components/app/tile";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];
type NutritionSubtab = "macros" | "quality" | "timing" | "insights";
const NUTRITION_TABS: { id: NutritionSubtab; label: string }[] = [
  { id: "macros", label: "Macros" },
  { id: "quality", label: "Quality" },
  { id: "timing", label: "Timing" },
  { id: "insights", label: "Insights" },
];

export function NutritionView({ layoutMode = "daily" }: { layoutMode?: LayoutMode }) {
  const { state, set } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [tab, setTab] = useState<NutritionSubtab>("macros");
  const isDeepDive = layoutMode === "deepDive";

  const today = state.mealEntries.filter((m) => isToday(m.createdAt));
  const t = today.reduce(
    (a, m) => ({ c: a.c + m.calories, p: a.p + m.protein, cb: a.cb + m.carbs, f: a.f + m.fat }),
    { c: 0, p: 0, cb: 0, f: 0 },
  );
  const tg = state.nutritionTargets;
  const remaining = Math.max(0, tg.calories - t.c);

  const supplements = state.supplementLogs
    ? state.supplementLogs.filter((s) => isToday(s.createdAt))
    : [];

  let statusMsg = "No nutrition logged yet";
  if (today.length > 0) {
    const proteinGap = tg.protein - t.p;
    const calorieGap = tg.calories - t.c;
    if (proteinGap > 30) statusMsg = `Protein still needed (${Math.round(proteinGap)}g short)`;
    else if (calorieGap > 500)
      statusMsg = `Calories still needed (${Math.round(calorieGap)} kcal under)`;
    else statusMsg = "On track";
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Nutrition"
        subtitle={`${Math.round(remaining)} kcal remaining today - ${isDeepDive ? "Deep Dive" : "Daily View"}`}
      />
      {isDeepDive && <SubTabs tabs={NUTRITION_TABS} active={tab} onChange={setTab} />}

      {!isDeepDive && (
        <div className="px-5 space-y-4 mt-2">
          <Tile
            hero
            accent
            delay={0}
            className="glow-section p-6 bg-green-500/10 border-green-500/20"
            style={{ "--section": "rgb(34 197 94)" } as React.CSSProperties}
          >
            <div className="flex justify-between items-center mb-4">
              <Eyebrow color="rgb(34 197 94)">Daily Macros</Eyebrow>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/5 px-2 py-1 rounded-md">
                {statusMsg}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
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
                  color="rgb(34 197 94)"
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

          <div className="grid grid-cols-1 gap-3">
            <PrimaryButton
              onClick={() => setLogOpen(true)}
              className="w-full rounded-2xl h-14 bg-green-500 hover:bg-green-600 text-white border-transparent"
            >
              <Plus size={18} />
              <span>Log Food</span>
            </PrimaryButton>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Droplets size={16} className="text-blue-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                  Hydration
                </p>
              </div>
              <p className="font-display text-xl text-white">
                0 <span className="text-sm text-white/40">fl oz</span>
              </p>
            </div>

            <div className="premium-card p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Pill size={16} className="text-purple-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                  Supplements
                </p>
              </div>
              {supplements.length > 0 ? (
                <p className="font-display text-xl text-white">
                  {supplements.length} <span className="text-sm text-white/40">taken</span>
                </p>
              ) : (
                <p className="font-display text-xl text-white/40 italic">None logged</p>
              )}
            </div>
          </div>

          <div>
            <SectionHeader title="Meals Today" />
            {today.length === 0 ? (
              <EmptyState
                icon={<Utensils size={22} />}
                title="No meals logged yet"
                description="Log your first meal or scan with AI to start tracking."
                action={
                  <PrimaryButton
                    onClick={() => setLogOpen(true)}
                    className="mt-2 bg-green-500 hover:bg-green-600 border-transparent"
                  >
                    <Plus size={16} />
                    Log Meal
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
                        {m.source === "camera" && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold text-green-400/80">
                              AI Estimated
                            </span>
                          </>
                        )}
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
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      onClick={() => setConfirmDel(m.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isDeepDive && tab === "macros" && (
        <div className="px-5 space-y-4 mt-2">
          <SectionHeader title="Macro detail" />
          <div className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4">
            <MacroBar
              label="Protein"
              value={t.p}
              target={tg.protein}
              unit="g"
              color="rgb(34 197 94)"
            />
            <div className="mt-4">
              <MacroBar
                label="Carbs"
                value={t.cb}
                target={tg.carbs}
                unit="g"
                color="rgb(245 158 11)"
              />
            </div>
            <div className="mt-4">
              <MacroBar label="Fat" value={t.f} target={tg.fat} unit="g" color="rgb(34 197 94)" />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Macro totals are calculated from meals logged today. Targets come from the existing
              nutrition target state.
            </p>
          </div>

          <PlannedFeatureCard
            title="Macro Trends"
            status="Planned"
            description="Toggleable graphs showing Calories, Protein, Carbs, and Fat over time will be integrated here once macro-over-time trend data is supported."
          />
        </div>
      )}

      {isDeepDive && tab === "quality" && (
        <div className="px-5 space-y-4 mt-2">
          <SectionHeader title="Nutrition Quality" />
          <PlannedFeatureCard
            title="Food Quality Score"
            status="Not connected yet"
            description="Overall food quality, meal balance, and micronutrient analysis will appear here."
          />
          <PlannedFeatureCard
            title="Hydration tracker"
            status="Not connected yet"
            description="Hydration will appear here once real hydration state exists. No water totals are fabricated."
          />
          <PlannedFeatureCard
            title="Food database & Library"
            status="Planned"
            description="Food library, saved foods, and common foods."
          />
          <PlannedFeatureCard
            title="Fiber & Micronutrients"
            status="Coming later"
            description="Deep analysis of fiber and micronutrients."
          />
          <div className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Pill size={16} className="text-purple-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                Supplements
              </p>
            </div>
            {supplements.length > 0 ? (
              <p className="font-display text-xl text-white">
                {supplements.length} <span className="text-sm text-white/40">taken</span>
              </p>
            ) : (
              <p className="font-display text-xl text-white/40 italic">None logged</p>
            )}
          </div>
        </div>
      )}

      {isDeepDive && tab === "timing" && (
        <div className="px-5 space-y-4 mt-2">
          <SectionHeader title="Timing & Windows" />
          <PlannedFeatureCard
            title="Meal Timing"
            status="Needs more logged data"
            description="Meal timing timeline, fasting/eating window analysis, and late-night eating patterns will appear here once supported."
          />
          <PlannedFeatureCard
            title="Workout Nutrition"
            status="Planned"
            description="Pre-workout and post-workout fuel analysis and its effect on training."
          />
        </div>
      )}

      {isDeepDive && tab === "insights" && (
        <div className="px-5 space-y-4 mt-2">
          <SectionHeader title="Insights & Relationships" />
          <PlannedFeatureCard
            title="Nutrition vs Weight"
            status="Coming later"
            description="Correlation between macro adherence and bodyweight trends."
          />
          <PlannedFeatureCard
            title="Nutrition vs Performance"
            status="Coming later"
            description="Correlation between nutrition (e.g. carbs) and training performance."
          />
          <PlannedFeatureCard
            title="Nutrition vs Recovery"
            status="Coming later"
            description="How food quality, hydration, and meal timing affect readiness and recovery."
          />
          <PlannedFeatureCard
            title="Education & Suggestions"
            status="Planned"
            description="Explanations on why macros, micronutrients, and timing matter for your specific goals."
          />
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

function CardLikeLogMeal({ onLog }: { onLog: () => void }) {
  return (
    <div className="premium-card rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-white/45">Log Food</p>
      <h2 className="mt-1 text-xl font-bold text-white">Add today's nutrition</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Use the existing meal templates, foods library, custom entry, or AI photo estimate entry
        point.
      </p>
      <PrimaryButton
        onClick={onLog}
        className="mt-4 w-full rounded-2xl bg-green-500 hover:bg-green-600"
      >
        <Plus size={16} />
        Log Meal
      </PrimaryButton>
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

  const filteredFoods = FOODS.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const recentNames = Array.from(
    new Set([...state.mealEntries].reverse().map((m) => m.name)),
  ).slice(0, 6);

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Food" height="tall">
      <div className="grid grid-cols-2 gap-3 mb-6 px-1 mt-2">
        <div
          className="p-3 rounded-2xl bg-gradient-to-br from-[var(--section-soft)] to-transparent border border-[var(--section-soft)] flex items-center justify-between group press transition-all cursor-pointer"
          onClick={() => window.dispatchEvent(new CustomEvent("fitcore:open-ai"))}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
              <Camera size={16} />
            </div>
            <div>
              <p className="font-bold text-white text-xs">Photo Log</p>
              <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider">
                AI Estimate
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between opacity-50 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/40">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="font-bold text-white text-xs">Barcode</p>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </div>

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
          <div className="space-y-2.5 max-h-[40dvh] overflow-y-auto pr-1">
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
          <div className="space-y-2 max-h-[45dvh] overflow-y-auto pr-1">
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
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-green-400"
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
