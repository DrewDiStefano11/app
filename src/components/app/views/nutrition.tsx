import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { FOODS, MEAL_TEMPLATES, mealTotals } from "@/lib/data";
import type { MealEntry } from "@/lib/types";
import type { LayoutMode } from "@/components/app/layout-primitives";
import { PrimaryButton, Chip, Input, Label, Select } from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { NutritionDailyPremiumView } from "@/components/app/views/nutrition-daily-premium";
import { NutritionDeepDivePremiumView } from "@/components/app/views/nutrition-deep-dive-premium";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];
export function NutritionView({
  layoutMode = "daily",
  onLayoutModeChange,
}: {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}) {
  const { state, set } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const isDeepDive = layoutMode === "deepDive";

  return (
    <div className="pb-24">
      {isDeepDive ? (
        <NutritionDeepDivePremiumView
          onOpenDaily={() => onLayoutModeChange?.("daily")}
          onLogMeal={() => setLogOpen(true)}
          onDeleteMeal={setConfirmDel}
        />
      ) : (
        <NutritionDailyPremiumView
          onLogMeal={() => setLogOpen(true)}
          onDeleteMeal={setConfirmDel}
          onOpenDeepDive={() => onLayoutModeChange?.("deepDive")}
        />
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
      <div className="grid grid-cols-2 gap-3 mb-6 px-1 mt-2">
        <button
          type="button"
          className="p-3 rounded-2xl bg-gradient-to-br from-[var(--section-soft)] to-transparent border border-[var(--section-soft)] flex items-center justify-between group press transition-all cursor-pointer"
          onClick={() => window.dispatchEvent(new CustomEvent("fitcore:open-ai"))}
          aria-label="Photo Log, AI Estimate"
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
        </button>

        <button
          type="button"
          disabled
          className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between opacity-50"
          aria-label="Barcode, coming soon"
        >
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
        </button>
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
                <button
                  type="button"
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
                  className="premium-card w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group press transition-all text-left"
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
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "foods" && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              aria-label="Search foods library"
              placeholder="Search foods library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl pl-4 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20"
                aria-label="Clear food search"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">As</p>
            <Select
              aria-label="Food meal type"
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
                aria-label="Meal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Post-workout protein bowl"
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meal Type</Label>
              <Select
                aria-label="Meal type"
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
                  aria-label="Calories in kilocalories"
                  inputMode="numeric"
                  value={cal}
                  onChange={(e) => setCal(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label>P</Label>
                <Input
                  aria-label="Protein in grams"
                  inputMode="numeric"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-green-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label>C</Label>
                <Input
                  aria-label="Carbohydrates in grams"
                  inputMode="numeric"
                  value={c}
                  onChange={(e) => setC(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-xl h-11 text-center font-bold text-amber-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label>F</Label>
                <Input
                  aria-label="Fat in grams"
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
