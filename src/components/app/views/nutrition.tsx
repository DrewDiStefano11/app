import { useState } from "react";
import { Bookmark, Plus, Pencil, Trash2, Utensils, Camera, Sparkles, Droplets, Pill } from "lucide-react";
import { useStore, uid, isToday } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, MEAL_TYPES, mealTotals } from "@/lib/data";
import type { MealEntry, SavedNutritionPreset } from "@/lib/types";
import { addNutritionPreset, copyMealForLog, foodMeal, replaceNutritionPreset } from "@/lib/saved-nutrition";
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
import { MealEditor } from "@/components/app/meal-editor";
import { dayKey } from "@/lib/analytics/date-time";
import { calculateMealTotals } from "@/lib/analytics/domain-metrics";
import { MacroTrendChart } from "@/components/app/macro-trend-chart";

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
  const [confirmDel, setConfirmDel] = useState<MealEntry | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => dayKey(Date.now()));
  const [tab, setTab] = useState<NutritionSubtab>("macros");
  const isDeepDive = layoutMode === "deepDive";

  const now = Date.now();
  const today = state.mealEntries.filter((m) => isToday(m.createdAt) && m.createdAt <= now);
  const totals = calculateMealTotals(today);
  const t = { c: totals.calories, p: totals.protein, cb: totals.carbs, f: totals.fat };
  const historyMeals = historyOpen
    ? state.mealEntries.filter(meal => meal.createdAt <= now && dayKey(meal.createdAt) === historyDate)
    : [];
  const historyTotals = calculateMealTotals(historyMeals);

  const commitMeal = (original: MealEntry, replacement?: MealEntry) => {
    const reviewed = JSON.stringify(original);
    let changed = false;
    const saved = set(current => {
      const index = current.mealEntries.findIndex(meal => meal.id === original.id);
      if (index < 0 || JSON.stringify(current.mealEntries[index]) !== reviewed) return current;
      changed = true;
      return {
        ...current,
        mealEntries: replacement
          ? current.mealEntries.map((meal, position) => position === index ? replacement : meal)
          : current.mealEntries.filter((_, position) => position !== index),
      };
    });
    return saved && changed;
  };

  const requestDelete = (meal: MealEntry) => {
    setDeleteFailed(false);
    setConfirmDel(meal);
  };
  const tg = state.nutritionTargets;
  const hasMeals = today.length > 0;

  const supplements = state.supplementLogs
    ? state.supplementLogs.filter((s) => isToday(s.createdAt))
    : [];

  return (
    <div className="pb-24">
      <PageHeader
        title="Nutrition"
        subtitle={hasMeals ? `${Math.round(t.c)} kcal logged today` : "No meals logged today"}
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
                {hasMeals ? "Logged so far" : "No meals recorded"}
              </span>
            </div>
            {hasMeals && <div className="flex items-center justify-between gap-6">
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
            </div>}
          </Tile>

          <div className="grid grid-cols-1 gap-3">
            <PrimaryButton
              onClick={() => setLogOpen(true)}
              className="w-full rounded-2xl h-14 bg-green-500 hover:bg-green-600 text-white border-transparent"
            >
              <Plus size={18} />
              <span>Log Meal</span>
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
                —
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
            <SectionHeader title="Meals Today"
              action={<GhostButton onClick={() => { setDeleteFailed(false); setHistoryOpen(true); }}>Meal history</GhostButton>} />
            {deleteFailed && !historyOpen && <MealDeleteError />}
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
              <MealRows meals={today} onEdit={setEditing} onDelete={requestDelete} />
            )}
          </div>
        </div>
      )}

      {isDeepDive && tab === "macros" && (
        <div className="px-5 space-y-4 mt-2">
          <SectionHeader title="Macro detail" />
          <div className="premium-card rounded-2xl border border-white/10 bg-white/5 p-4">
            {hasMeals ? <>
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
              Values reflect meals logged today.
            </p>
            </> : <p className="text-sm text-muted-foreground">No meals logged today.</p>}
          </div>

          <MacroTrendChart meals={state.mealEntries} now={now} />
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
            status="Coming later"
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
      <BottomSheet open={historyOpen} onClose={() => { setDeleteFailed(false); setHistoryOpen(false); }}
        title="Meal history" height="tall" closeLabel="Close meal history"
        manageFocus={!editing && !confirmDel}>
        <label className="mb-4 block text-sm">
          Meal date
          <Input type="date" value={historyDate} max={dayKey(now)} onChange={event => {
            setDeleteFailed(false);
            setHistoryDate(event.target.value);
          }} />
        </label>
        {deleteFailed && <MealDeleteError />}
        {historyMeals.length ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{Math.round(historyTotals.calories)} kcal logged</p>
            <MealRows meals={historyMeals} onEdit={setEditing} onDelete={requestDelete} />
          </>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">No meals logged for this date.</p>
        )}
      </BottomSheet>
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Edit meal"
        height="tall" closeLabel="Close meal editor" manageFocus>
        {editing && <MealEditor key={editing.id} meal={editing} onCancel={() => setEditing(null)}
          onSavePreset={draft => {
            let present = false;
            const saved = set(current => {
              present = current.mealEntries.some(meal => JSON.stringify(meal) === JSON.stringify(editing));
              return present ? addNutritionPreset(current, { id: uid(), kind: "meal", meal: draft }) : current;
            });
            return saved && present;
          }}
          onSave={replacement => {
            const saved = commitMeal(editing, replacement);
            if (saved) setEditing(null);
            return saved;
          }} />}
      </BottomSheet>
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) setDeleteFailed(!commitMeal(confirmDel));
        }}
        manageFocus
        title="Delete meal?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

function MealDeleteError() {
  return <p role="alert" className="mb-2 text-sm text-destructive">Meal could not be deleted. The saved meal is still here.</p>;
}

function MealRows({ meals, onEdit, onDelete }: {
  meals: readonly MealEntry[];
  onEdit: (meal: MealEntry) => void;
  onDelete: (meal: MealEntry) => void;
}) {
  return (
    <div className="space-y-3">
      {meals.map(meal => (
        <div key={meal.id} className="premium-card flex flex-wrap items-center justify-between gap-x-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-white">{meal.name}</p>
            <p className="text-xs text-muted-foreground">
              {meal.type} · {new Date(meal.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            {(meal.source === "camera" || meal.provenance?.source === "ai-estimated") && (
              <p className="text-xs text-muted-foreground">AI estimate</p>
            )}
            {meal.provenance?.editedBy === "user" && (
              <p className="text-xs text-muted-foreground">Edited</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-lg tabular-nums text-white">{Math.round(meal.calories)} kcal</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              P{Math.round(meal.protein)} C{Math.round(meal.carbs)} F{Math.round(meal.fat)}
            </p>
          </div>
          <div className="flex">
            <button type="button" aria-label="Edit meal" className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-white/10"
              onClick={() => onEdit(meal)}>
              <Pencil size={16} />
            </button>
            <button type="button" aria-label="Delete meal" className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-white/10"
              onClick={() => onDelete(meal)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CardLikeLogMeal({ onLog }: { onLog: () => void }) {
  return (
    <div className="premium-card rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-white/45">Log Meal</p>
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
  const [mode, setMode] = useState<"templates" | "foods" | "custom" | "saved">("templates");
  const [type, setType] = useState("dinner");
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [fat, setFat] = useState("");
  const [search, setSearch] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [presetMessage, setPresetMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const savedPresets = state.savedNutrition ?? [];
  const [editingPreset, setEditingPreset] = useState<SavedNutritionPreset | null>(null);

  const addMeal = (m: MealEntry) => {
    const saved = set((s) => ({ ...s, mealEntries: [...s.mealEntries, m] }));
    setSaveFailed(!saved);
    if (saved) {
      setPresetMessage(null);
      onClose();
    }
    return saved;
  };

  const saveFood = (meal: MealEntry, servingLabel?: string) => {
    const preset = { id: uid(), kind: "food" as const, meal, servingLabel };
    const saved = set(current => addNutritionPreset(current, preset));
    setPresetMessage({
      text: saved ? `${meal.name} saved to your library.` : "Food preset could not be saved.",
      failed: !saved,
    });
  };

  const customMeal = () => ({
    id: uid(), name: name.trim(), type, createdAt: Date.now(),
    calories: Number(cal), protein: Number(p), carbs: Number(c), fat: Number(fat),
  });
  const canSaveCustom = !!name.trim() && !!cal.trim() &&
    [cal, p, c, fat].every(value => Number.isFinite(Number(value)) && Number(value) >= 0);

  const filteredFoods = FOODS.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const recentNames = Array.from(
    new Set([...state.mealEntries].reverse().map((m) => m.name)),
  ).slice(0, 6);

  if (editingPreset) {
    const cancel = () => setEditingPreset(null);
    return (
      <BottomSheet open={open} onClose={cancel} title={editingPreset.kind === "food" ? "Edit saved food" : "Edit saved meal"}
        height="tall" closeLabel="Close preset editor" manageFocus>
        <MealEditor meal={editingPreset.meal} onCancel={cancel} onSave={meal => {
          let changed = false;
          const saved = set(current => {
            const next = replaceNutritionPreset(current, editingPreset, meal);
            changed = next !== current;
            return next;
          });
          if (saved && changed) cancel();
          return saved && changed;
        }} />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={() => { setPresetMessage(null); setSaveFailed(false); onClose(); }}
      title="Log Meal" height="tall" closeLabel="Close meal logger" manageFocus>
      {presetMessage && <p role={presetMessage.failed ? "alert" : "status"} className="mb-3 text-sm">{presetMessage.text}</p>}
      {saveFailed && <p role="alert" className="mb-3 text-sm text-destructive">Meal could not be saved. Try again.</p>}
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
        <Chip active={mode === "saved"} onClick={() => { setPresetMessage(null); setMode("saved"); }}>
          Saved
        </Chip>
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

      {mode === "saved" && (
        <div className="space-y-2">
          {savedPresets.length === 0 && <p className="text-sm text-muted-foreground">No saved foods or meals.</p>}
          {savedPresets.map(preset => (
            <div key={preset.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2">
              <div className="flex-1">
                <p className="font-medium">{preset.meal.name}</p>
                {preset.servingLabel && <p className="text-xs text-muted-foreground">{preset.servingLabel}</p>}
                <p className="text-xs text-muted-foreground">
                  {Math.round(preset.meal.calories)} kcal · {preset.kind === "food" ? "Food" : "Meal"} · {preset.meal.type}
                </p>
              </div>
              <GhostButton aria-label={`Log ${preset.meal.name}`}
                onClick={() => addMeal(copyMealForLog(preset.meal, uid()))}>Log</GhostButton>
              <GhostButton aria-label={`Edit ${preset.meal.name}`} onClick={() => setEditingPreset(preset)}><Pencil size={16} /></GhostButton>
              <GhostButton aria-label={`Remove ${preset.meal.name}`} onClick={() => {
                const saved = set(current => ({
                  ...current,
                  savedNutrition: (current.savedNutrition ?? []).filter(item => item.id !== preset.id),
                }));
                setPresetMessage(saved ? null : { text: "Preset could not be removed.", failed: true });
              }}><Trash2 size={16} /></GhostButton>
            </div>
          ))}
        </div>
      )}

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
                      onClick={() => addMeal(copyMealForLog(m, uid()))}
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
            {filteredFoods.map(food => (
              <div key={food.id} className="flex items-center rounded-2xl border border-white/10 bg-white/5 pr-2">
                <button type="button" onClick={() => addMeal(foodMeal(food, type, uid()))}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3 text-left press">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{food.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{food.servingLabel}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display tabular-nums">{food.calories} kcal</p>
                    <p className="text-xs tabular-nums text-muted-foreground">P{food.protein} C{food.carbs} F{food.fat}</p>
                  </div>
                </button>
                <GhostButton aria-label={`Save ${food.name}`} className="h-11 w-11 justify-center px-0"
                  onClick={() => saveFood(foodMeal(food, type, uid()), food.servingLabel)}>
                  <Bookmark size={16} />
                </GhostButton>
              </div>
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
              disabled={!canSaveCustom}
              onClick={() => {
                const saved = addMeal(customMeal());
                if (!saved) return;
                setName("");
                setCal("");
                setP("");
                setC("");
                setFat("");
              }}
            >
              Add to Daily Log
            </PrimaryButton>
            <GhostButton className="mt-2 w-full" disabled={!canSaveCustom} onClick={() => saveFood(customMeal())}>
              Save as reusable food
            </GhostButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
