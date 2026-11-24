import { useState } from "react";
import { BookOpen, Heart, Clock, TrendingUp, Search, Plus, Pencil, Trash2, Zap } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { FOODS, type Food } from "@/lib/data";
import type { MealEntry, SavedNutritionPreset } from "@/lib/types";
import {
  addNutritionPreset,
  copyMealForLog,
  removeNutritionPreset,
  favoriteNutritionPreset,
  recentlyConsumedFoods,
  frequentlyConsumedFoods,
} from "@/lib/saved-nutrition";
import {
  PageHeader,
  PrimaryButton,
  GhostButton,
  EmptyState,
  Input,
  SubTabs,
} from "@/components/app/ui";
import { BottomSheet, ConfirmDialog } from "@/components/app/sheet";
import { AddCustomFoodForm } from "./add-custom-food-form";

type LibraryTab = "saved" | "recent" | "frequent" | "favorites" | "catalog";

const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
  { id: "saved", label: "My Foods" },
  { id: "recent", label: "Recent" },
  { id: "frequent", label: "Frequent" },
  { id: "favorites", label: "Favorites" },
  { id: "catalog", label: "Catalog" },
];

const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function macroLine(calories: number, protein?: number, carbs?: number, fat?: number) {
  if (protein !== undefined && carbs !== undefined && fat !== undefined) {
    return `${calories} kcal · ${protein}g P · ${carbs}g C · ${fat}g F`;
  }
  return `${calories} kcal`;
}

// ---- Saved / Favorites row ----
function PresetRow({
  preset,
  onQuickLog,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  key?: string;
  preset: SavedNutritionPreset;
  onQuickLog: (preset: SavedNutritionPreset) => void;
  onEdit: (preset: SavedNutritionPreset) => void;
  onDelete: (preset: SavedNutritionPreset) => void;
  onToggleFavorite: (preset: SavedNutritionPreset) => void;
}) {
  const meal = preset.meal;
  const macros = meal.macroStatus !== "unreported"
    ? { protein: meal.protein, carbs: meal.carbs, fat: meal.fat }
    : {};

  return (
    <div className="flex items-start gap-3 p-4 border border-border rounded-[var(--radius-card)] bg-white/[0.02]">
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{meal.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {macroLine(meal.calories, macros.protein, macros.carbs, macros.fat)}
        </p>
        {preset.servingLabel && (
          <p className="text-xs text-muted-foreground">per {preset.servingLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleFavorite(preset)}
          aria-label={preset.isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Heart
            size={16}
            className={preset.isFavorite ? "fill-current text-rose-400" : "text-muted-foreground"}
          />
        </button>
        <button
          type="button"
          onClick={() => onQuickLog(preset)}
          aria-label={`Quick-log ${meal.name}`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Zap size={16} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(preset)}
          aria-label={`Edit ${meal.name}`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(preset)}
          aria-label={`Delete ${meal.name}`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ---- Recent / Frequent meal row ----
function MealRow({
  meal,
  onQuickLog,
  onSaveToLibrary,
}: {
  key?: string;
  meal: MealEntry;
  onQuickLog: (meal: MealEntry) => void;
  onSaveToLibrary: (meal: MealEntry) => void;
}) {
  const macros = meal.macroStatus !== "unreported"
    ? { protein: meal.protein, carbs: meal.carbs, fat: meal.fat }
    : {};
  return (
    <div className="flex items-start gap-3 p-4 border border-border rounded-[var(--radius-card)] bg-white/[0.02]">
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{meal.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {macroLine(meal.calories, macros.protein, macros.carbs, macros.fat)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onSaveToLibrary(meal)}
          aria-label={`Save ${meal.name} to library`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => onQuickLog(meal)}
          aria-label={`Quick-log ${meal.name}`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Zap size={16} />
        </button>
      </div>
    </div>
  );
}

// ---- Catalog food row ----
function CatalogRow({
  food,
  onQuickLog,
  onSaveToLibrary,
}: {
  key?: string;
  food: Food;
  onQuickLog: (food: Food) => void;
  onSaveToLibrary: (food: Food) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 border border-border rounded-[var(--radius-card)] bg-white/[0.02]">
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{food.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {macroLine(food.calories, food.protein, food.carbs, food.fat)}
        </p>
        <p className="text-xs text-muted-foreground capitalize">{food.category} · {food.servingLabel}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onSaveToLibrary(food)}
          aria-label={`Save ${food.name} to library`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => onQuickLog(food)}
          aria-label={`Quick-log ${food.name}`}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Zap size={16} />
        </button>
      </div>
    </div>
  );
}

export function FoodLibraryView({ embedded = false }: { embedded?: boolean } = {}) {
  const { state, set } = useStore();
  const [tab, setTab] = useState<LibraryTab>("saved");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<SavedNutritionPreset | null>(null);
  const [editPreset, setEditPreset] = useState<SavedNutritionPreset | null>(null);
  const [quickLogMsg, setQuickLogMsg] = useState<string | null>(null);

  const savedPresets = state.savedNutrition ?? [];
  const q = normalized(search);

  // ---- Filtered lists ----
  const filteredSaved = savedPresets.filter((p) => !q || normalized(p.meal.name).includes(q));
  const filteredFavorites = savedPresets.filter((p) => p.isFavorite && (!q || normalized(p.meal.name).includes(q)));
  const recent = recentlyConsumedFoods(state, 10).filter((m) => !q || normalized(m.name).includes(q));
  const frequent = frequentlyConsumedFoods(state, 10).filter((m) => !q || normalized(m.name).includes(q));
  const catalogFoods = FOODS.filter((f) => !q || normalized(f.name).includes(q) || normalized(f.category).includes(q));

  // ---- Actions ----
  function quickLogPreset(preset: SavedNutritionPreset) {
    const meal = copyMealForLog(preset.meal, uid());
    set((s) => ({ ...s, mealEntries: [...s.mealEntries, meal] }));
    setQuickLogMsg(`${preset.meal.name} logged!`);
    setTimeout(() => setQuickLogMsg(null), 2500);
  }

  function quickLogMeal(meal: MealEntry) {
    const copy = copyMealForLog(meal, uid());
    set((s) => ({ ...s, mealEntries: [...s.mealEntries, copy] }));
    setQuickLogMsg(`${meal.name} logged!`);
    setTimeout(() => setQuickLogMsg(null), 2500);
  }

  function quickLogFood(food: Food) {
    const meal: MealEntry = {
      id: uid(),
      name: food.name,
      type: "snack",
      createdAt: Date.now(),
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      ...(food.fiber ? { fiber: food.fiber } : {}),
    };
    set((s) => ({ ...s, mealEntries: [...s.mealEntries, meal] }));
    setQuickLogMsg(`${food.name} logged!`);
    setTimeout(() => setQuickLogMsg(null), 2500);
  }

  function savePresetFromMeal(meal: MealEntry) {
    const preset: SavedNutritionPreset = {
      id: uid(),
      kind: "meal",
      meal: { ...meal, confirmed: true },
    };
    set((s) => addNutritionPreset(s, preset));
  }

  function savePresetFromFood(food: Food) {
    const meal: MealEntry = {
      id: uid(),
      name: food.name,
      type: "snack",
      createdAt: Date.now(),
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      confirmed: true,
    };
    const preset: SavedNutritionPreset = {
      id: uid(),
      kind: "food",
      meal,
      servingLabel: food.servingLabel,
    };
    set((s) => addNutritionPreset(s, preset));
  }

  function deletePreset(preset: SavedNutritionPreset) {
    set((s) => removeNutritionPreset(s, preset.id));
    setConfirmDel(null);
  }

  function toggleFavorite(preset: SavedNutritionPreset) {
    set((s) => favoriteNutritionPreset(s, preset.id, !preset.isFavorite));
  }

  return (
    <div className={embedded ? "pb-6" : "pb-32"}>
      {!embedded ? (
        <PageHeader
          title="Food Library"
          subtitle="Your saved foods, recent meals, and catalog"
          action={
            <PrimaryButton onClick={() => setAddOpen(true)}>
              <Plus size={16} />
              Add Food
            </PrimaryButton>
          }
        />
      ) : (
        <div className="flex justify-between items-center px-1 mb-3">
          <p className="text-xs text-muted-foreground">Saved foods, recent meals, and catalog</p>
          <PrimaryButton onClick={() => setAddOpen(true)} className="min-h-9 px-3 py-1.5 text-xs">
            <Plus size={14} /> Add Food
          </PrimaryButton>
        </div>
      )}

      {quickLogMsg && (
        <div
          role="status"
          aria-live="polite"
          className="mx-5 mb-3 px-4 py-2.5 rounded-[var(--radius-small)] bg-green-500/15 border border-green-500/30 text-sm text-green-400 font-medium"
        >
          {quickLogMsg}
        </div>
      )}

      <SubTabs tabs={LIBRARY_TABS} active={tab} onChange={setTab} />

      {/* Search bar — always visible */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search foods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search foods"
          />
        </div>
      </div>

      {/* ---- My Saved Foods ---- */}
      {tab === "saved" && (
        <div className="px-5 space-y-3">
          {filteredSaved.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={search ? "No matches" : "No saved foods yet"}
              description={
                search
                  ? "Try a different search term."
                  : "Save a meal from the Fuel tab, or add a custom food here."
              }
              action={
                !search ? (
                  <PrimaryButton onClick={() => setAddOpen(true)}>
                    <Plus size={16} /> Add Custom Food
                  </PrimaryButton>
                ) : undefined
              }
            />
          ) : (
            filteredSaved.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                onQuickLog={quickLogPreset}
                onEdit={setEditPreset}
                onDelete={setConfirmDel}
                onToggleFavorite={toggleFavorite}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Recent ---- */}
      {tab === "recent" && (
        <div className="px-5 space-y-3">
          {recent.length === 0 ? (
            <EmptyState
              icon={<Clock size={28} />}
              title={search ? "No matches" : "No meals logged yet"}
              description="Log some meals and they'll appear here."
            />
          ) : (
            recent.map((meal) => (
              <MealRow
                key={meal.id}
                meal={meal}
                onQuickLog={quickLogMeal}
                onSaveToLibrary={savePresetFromMeal}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Frequent ---- */}
      {tab === "frequent" && (
        <div className="px-5 space-y-3">
          {frequent.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={28} />}
              title={search ? "No matches" : "No data yet"}
              description="Your most logged foods will appear here after you log some meals."
            />
          ) : (
            frequent.map((meal) => (
              <MealRow
                key={meal.id}
                meal={meal}
                onQuickLog={quickLogMeal}
                onSaveToLibrary={savePresetFromMeal}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Favorites ---- */}
      {tab === "favorites" && (
        <div className="px-5 space-y-3">
          {filteredFavorites.length === 0 ? (
            <EmptyState
              icon={<Heart size={28} />}
              title={search ? "No matches" : "No favorites yet"}
              description="Tap the heart icon on any saved food to mark it as a favorite."
            />
          ) : (
            filteredFavorites.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                onQuickLog={quickLogPreset}
                onEdit={setEditPreset}
                onDelete={setConfirmDel}
                onToggleFavorite={toggleFavorite}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Catalog ---- */}
      {tab === "catalog" && (
        <div className="px-5 space-y-3">
          {catalogFoods.length === 0 ? (
            <EmptyState
              icon={<Search size={28} />}
              title="No catalog matches"
              description="Try a different search term."
            />
          ) : (
            catalogFoods.map((food) => (
              <CatalogRow
                key={food.id}
                food={food}
                onQuickLog={quickLogFood}
                onSaveToLibrary={savePresetFromFood}
              />
            ))
          )}
        </div>
      )}

      {/* ---- Add Custom Food Sheet ---- */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Custom Food">
        <AddCustomFoodForm
          onSaved={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </BottomSheet>

      {/* ---- Edit preset Sheet ---- */}
      {editPreset && (
        <BottomSheet
          open={!!editPreset}
          onClose={() => setEditPreset(null)}
          title="Edit Saved Food"
        >
          <AddCustomFoodForm
            initialPreset={editPreset}
            onSaved={() => setEditPreset(null)}
            onCancel={() => setEditPreset(null)}
          />
        </BottomSheet>
      )}

      {/* ---- Delete confirm ---- */}
      {confirmDel && (
        <ConfirmDialog
          open={!!confirmDel}
          title={`Delete "${confirmDel.meal.name}"?`}
          message="This removes the food from your library. Historical meal logs are not affected."
          confirmLabel="Delete"
          destructive
          onConfirm={() => deletePreset(confirmDel)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

export function FoodLibrarySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Food Library"
      height="tall"
      closeLabel="Close food library"
      manageFocus
    >
      <FoodLibraryView embedded />
    </BottomSheet>
  );
}
