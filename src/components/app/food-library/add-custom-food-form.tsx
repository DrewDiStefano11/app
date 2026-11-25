import { useState, type FormEvent } from "react";
import { useStore, uid } from "@/lib/store";
import { addNutritionPreset, updateNutritionPreset } from "@/lib/saved-nutrition";
import type { MealEntry, SavedNutritionPreset } from "@/lib/types";
import { GhostButton, Input, Label, PrimaryButton, Select } from "@/components/app/ui";

const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const UNITS = ["g", "oz", "ml", "cup", "tbsp", "tsp", "serving", "piece", "scoop", "slice"];

interface Props {
  /** If provided, we're editing an existing preset (name/serving only — macros re-confirmed). */
  initialPreset?: SavedNutritionPreset;
  onSaved: () => void;
  onCancel: () => void;
}

export function AddCustomFoodForm({ initialPreset, onSaved, onCancel }: Props) {
  const { set } = useStore();

  const init = initialPreset?.meal;
  const initMacros = init && init.macroStatus !== "unreported";

  const [name, setName] = useState(init?.name ?? "");
  const [calories, setCalories] = useState(String(init?.calories ?? ""));
  const [protein, setProtein] = useState(initMacros ? String(init.protein) : "");
  const [carbs, setCarbs] = useState(initMacros ? String(init.carbs) : "");
  const [fat, setFat] = useState(initMacros ? String(init.fat) : "");
  const [servingSize, setServingSize] = useState(() => {
    if (!initialPreset?.servingLabel) return "";
    const m = /^(\d+(?:\.\d+)?)\s*(.+)$/.exec(initialPreset.servingLabel);
    return m?.[1] ?? "";
  });
  const [unit, setUnit] = useState(() => {
    if (!initialPreset?.servingLabel) return "serving";
    const m = /^(\d+(?:\.\d+)?)\s*(.+)$/.exec(initialPreset.servingLabel);
    return m?.[2] ?? "serving";
  });
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const cal = Number(calories);
    if (!Number.isFinite(cal) || cal < 0) {
      setError("Enter a valid calorie value.");
      return;
    }

    const hasProtein = protein !== "";
    const hasCarbs = carbs !== "";
    const hasFat = fat !== "";
    const hasAny = hasProtein || hasCarbs || hasFat;
    const hasAll = hasProtein && hasCarbs && hasFat;
    if (hasAny && !hasAll) {
      setError("Enter protein, carbs, and fat together, or leave all three blank.");
      return;
    }

    const servingLabel = servingSize && unit ? `${servingSize} ${unit}` : undefined;

    if (!initialPreset) {
      // Creating — check for duplicate name
      const dupName = normalized(trimmedName);
      const meal: MealEntry = hasAll
        ? {
            id: uid(),
            name: trimmedName,
            type: "snack",
            createdAt: Date.now(),
            calories: cal,
            protein: Number(protein),
            carbs: Number(carbs),
            fat: Number(fat),
            confirmed: true,
          }
        : {
            id: uid(),
            name: trimmedName,
            type: "snack",
            createdAt: Date.now(),
            calories: cal,
            macroStatus: "unreported",
            confirmed: true,
          };

      const preset: SavedNutritionPreset = {
        id: uid(),
        kind: "food",
        meal,
        ...(servingLabel && { servingLabel }),
      };

      let added = false;
      const saved = set((current) => {
        if ((current.savedNutrition ?? []).some((p) => normalized(p.meal.name) === dupName))
          return current;
        const next = addNutritionPreset(current, preset);
        added = next !== current;
        return next;
      });
      if (!saved) {
        setError(
          "Could not save this food. Your entries are retained; check storage and try again.",
        );
        return;
      }
      if (!added) {
        setError("Could not save — this food may already exist.");
        return;
      }
      onSaved();
      return;
    }

    // Editing existing preset — update serving label and kind; leave meal macros intact
    // (we don't allow full macro re-entry in edit to avoid retroactive changes)
    const saved = set((s) => updateNutritionPreset(s, initialPreset.id, { servingLabel }));
    if (!saved) {
      setError(
        "Could not save these changes. Your entries are retained; check storage and try again.",
      );
      return;
    }
    onSaved();
  }

  const isEditing = !!initialPreset;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm">
        Food name
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Overnight Oats, Teriyaki Beef"
          required
          disabled={isEditing}
        />
      </label>

      {!isEditing && (
        <>
          <label className="block text-sm">
            Calories (kcal)
            <Input
              name="calories"
              type="number"
              min="0"
              step="any"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
              placeholder="0"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Macros (optional)</legend>
            <p className="mb-2 text-xs text-muted-foreground">
              Enter all three or leave all blank.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                Protein (g)
                <Input
                  name="protein"
                  type="number"
                  min="0"
                  step="any"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="text-sm">
                Carbs (g)
                <Input
                  name="carbs"
                  type="number"
                  min="0"
                  step="any"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="text-sm">
                Fat (g)
                <Input
                  name="fat"
                  type="number"
                  min="0"
                  step="any"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
          </fieldset>
        </>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Serving size (optional)</legend>
        <div className="flex gap-2">
          <Input
            name="servingSize"
            type="number"
            min="0"
            step="any"
            value={servingSize}
            onChange={(e) => setServingSize(e.target.value)}
            placeholder="100"
            className="w-24"
            aria-label="Serving amount"
          />
          <Select
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            aria-label="Serving unit"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton type="submit">{isEditing ? "Save changes" : "Add to Library"}</PrimaryButton>
      </div>
    </form>
  );
}
