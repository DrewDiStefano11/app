import { useState, type FormEvent } from "react";
import { GhostButton, Input, PrimaryButton, Select, Textarea } from "@/components/app/ui";
import { markProvenanceEdited } from "@/lib/fitcore-data";
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
}: {
  meal: MealEntry;
  onSave: (meal: MealEntry) => boolean;
  onCancel: () => void;
}) {
  const [failed, setFailed] = useState(false);
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

    const updated = {
      ...meal,
      name: nameInput.value === meal.name.replace(/[\r\n]/g, "") ? meal.name : name,
    };
    updated.type = String(fields.get("type"));
    for (const [key] of NUTRIENT_FIELDS) {
      const value = fields.get(key);
      if (key === "fiber" && value === "") {
        delete updated.fiber;
      } else {
        updated[key] = Number(value);
      }
    }
    const notes = String(fields.get("notes") ?? "");
    if (notes !== (meal.notes?.replace(/\r\n?/g, "\n") ?? "")) {
      if (notes) updated.notes = notes;
      else delete updated.notes;
    }
    if (JSON.stringify(updated) === JSON.stringify(meal)) {
      onCancel();
      return;
    }

    updated.provenance = {
      ...markProvenanceEdited(meal.provenance, { editedBy: "user" }),
      confirmation: meal.provenance?.confirmation ?? "confirmed",
    };
    setFailed(!onSave(updated));
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
        <div className="grid grid-cols-2 gap-3">
          {NUTRIENT_FIELDS.map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <Input
                name={key}
                type="number"
                min="0"
                step="any"
                required={key !== "fiber"}
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
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Meal changes could not be saved. Your edits are still here.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onCancel}>Cancel changes</GhostButton>
        <PrimaryButton type="submit">Save changes</PrimaryButton>
      </div>
    </form>
  );
}
