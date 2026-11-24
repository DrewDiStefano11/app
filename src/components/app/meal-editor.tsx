import { useState, type FormEvent } from "react";
import { GhostButton, Input, PrimaryButton, Select, Textarea } from "@/components/app/ui";
import { markProvenanceEdited } from "@/lib/fitcore-data";
import { requiresNutritionPresetConfirmation } from "@/lib/saved-nutrition";
import { MEAL_TYPES } from "@/lib/data";
import type { MealEntry } from "@/lib/types";

const NUTRIENT_FIELDS = [
  ["calories", "Calories (kcal)"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbs (g)"],
  ["fat", "Fat (g)"],
  ["fiber", "Fiber (g)"],
] as const;

export function MealEditor({
  meal,
  onSave,
  onCancel,
  onSavePreset,
}: {
  meal: MealEntry;
  onSave: (meal: MealEntry) => boolean;
  onCancel: () => void;
  onSavePreset?: (meal: MealEntry) => boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [presetStatus, setPresetStatus] = useState<"saved" | "failed" | null>(null);
  const confirmEstimate = requiresNutritionPresetConfirmation(meal);
  const types = MEAL_TYPES.includes(meal.type) ? MEAL_TYPES : [...MEAL_TYPES, meal.type];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const nameInput = event.currentTarget.elements.namedItem("name");
    if (!(nameInput instanceof HTMLInputElement)) return;
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.setCustomValidity("Enter a meal name.");
      nameInput.reportValidity();
      return;
    }

    const optionalNumber = (key: string) => {
      const value = fields.get(key);
      return value === null || value === "" ? undefined : Number(value);
    };
    const protein = optionalNumber("protein");
    const carbs = optionalNumber("carbs");
    const fat = optionalNumber("fat");
    const hasAnyMacros = [protein, carbs, fat].some((value) => value !== undefined);
    const hasAllMacros = protein !== undefined && carbs !== undefined && fat !== undefined;
    if (hasAnyMacros && !hasAllMacros) {
      setError("Enter protein, carbs, and fat together, or leave all three blank.");
      return;
    }

    const details = {
      ...meal,
      name: nameInput.value === meal.name.replace(/[\r\n]/g, "") ? meal.name : name,
      type: String(fields.get("type")),
      calories: Number(fields.get("calories")),
      fiber: optionalNumber("fiber"),
    };
    const updated: MealEntry = hasAllMacros
      ? { ...details, macroStatus: undefined, protein, carbs, fat }
      : {
          ...details,
          macroStatus: "unreported",
          protein: undefined,
          carbs: undefined,
          fat: undefined,
        };
    const notes = String(fields.get("notes") ?? "");
    if (notes !== (meal.notes?.replace(/\r\n?/g, "\n") ?? "")) {
      if (notes) updated.notes = notes;
      else delete updated.notes;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (onSavePreset && submitter instanceof HTMLButtonElement && submitter.value === "preset") {
      if (confirmEstimate) {
        updated.confirmed = true;
        updated.confidence = "high";
        updated.provenance = {
          ...meal.provenance,
          source: meal.provenance?.source ?? (meal.source === "camera" ? "ai-estimated" : "jarvis"),
          confirmation: "confirmed",
          confidence: "high",
        };
      }
      setPresetStatus(onSavePreset(updated) ? "saved" : "failed");
      return;
    }
    if (JSON.stringify(updated) === JSON.stringify(meal)) {
      onCancel();
      return;
    }

    updated.provenance = {
      ...markProvenanceEdited(meal.provenance, { editedBy: "user" }),
      confirmation: meal.provenance?.confirmation ?? "confirmed",
    };
    setError(
      onSave(updated) ? null : "Meal changes could not be saved. Your edits are still here.",
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm">
        Meal name
        <Input
          name="name"
          defaultValue={meal.name}
          required
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
      </label>
      <label className="block text-sm">
        Meal type
        <Select name="type" defaultValue={meal.type} className="capitalize">
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Meal totals</legend>
        {meal.macroStatus === "unreported" && (
          <p className="mb-2 text-sm text-muted-foreground">
            Enter all three macros when you know them. Blank fields keep macros unreported.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {NUTRIENT_FIELDS.map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <Input
                name={key}
                type="number"
                min="0"
                step="any"
                required={
                  key === "calories" || (key !== "fiber" && meal.macroStatus !== "unreported")
                }
                defaultValue={meal[key]}
              />
            </label>
          ))}
        </div>
      </fieldset>
      {!!meal.items?.length && (
        <details className="text-sm text-muted-foreground">
          <summary>Original items</summary>
          <ul className="mt-2 list-disc pl-5">
            {meal.items.map((item, index) => (
              <li key={index}>
                {item.name}
                {item.qty && ` · ${item.qty}`}
              </li>
            ))}
          </ul>
        </details>
      )}
      <label className="block text-sm">
        Meal notes
        <Textarea name="notes" aria-label="Meal notes" defaultValue={meal.notes} rows={3} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {presetStatus === "saved" && (
        <p role="status" className="text-sm">
          Meal saved to your library.
        </p>
      )}
      {presetStatus === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          Meal preset could not be saved.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onCancel}>Cancel changes</GhostButton>
        <PrimaryButton type="submit">Save changes</PrimaryButton>
      </div>
      {onSavePreset && (
        <div className="flex flex-wrap gap-2">
          <GhostButton type="submit" name="action" value="preset">
            {confirmEstimate ? "Confirm values and save preset" : "Save as reusable meal"}
          </GhostButton>
          {!confirmEstimate && (
            <GhostButton type="submit" name="action" value="preset">
              Save to Library
            </GhostButton>
          )}
        </div>
      )}
    </form>
  );
}
