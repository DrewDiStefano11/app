import { useState, type FormEvent } from "react";
import { GhostButton, Input, PrimaryButton } from "@/components/app/ui";
import type { NutritionTargets } from "@/lib/types";

const FIELDS = [
  ["calories", "Calories (kcal)"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbs (g)"],
  ["fat", "Fat (g)"],
] as const;

export function NutritionTargetsEditor({
  targets,
  onSave,
  onCancel,
}: {
  targets: NutritionTargets;
  onSave: (targets: NutritionTargets) => boolean;
  onCancel: () => void;
}) {
  const [failed, setFailed] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = { ...targets };
    for (const [key] of FIELDS) {
      const value = form.get(key);
      if (
        typeof value !== "string" ||
        !value ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      )
        return;
      next[key] = Number(value);
    }
    if (FIELDS.every(([key]) => next[key] === targets[key])) {
      onCancel();
      return;
    }
    setFailed(!onSave(next));
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-muted-foreground">
        Enter 0 for any nutrient you do not want to set a target for.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(([key, label]) => (
          <label className="block text-sm" key={key}>
            {label}
            <Input
              name={key}
              type="number"
              min="0"
              step="any"
              required
              defaultValue={targets[key]}
            />
          </label>
        ))}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Targets could not be saved. Your edits are still here.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton type="submit">Save targets</PrimaryButton>
      </div>
    </form>
  );
}
