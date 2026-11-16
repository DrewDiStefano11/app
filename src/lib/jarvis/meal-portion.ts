import { markProvenanceEdited } from "../fitcore-data";
import { uid } from "../store";
import type { AppState, MealEntry, MealItem } from "../types";
import { pushAudit } from "./action-audit";
import { mealItemTotals } from "./meal-math";
import type { LocalJarvisCommand } from "./text-commands";
import type { ToolHandler } from "./tools";

const UNITS = "cup|scoop|ounce|oz|gram|g|slice|serving|portion|piece";
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const AMOUNT = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${UNITS})s?$`, "i");
const CORRECTION = new RegExp(
  `^actually,? (?:that|it|the meal) was (\\d+(?:\\.\\d+)?|${WORDS.join("|")}) (${UNITS})s? (?:of )?(.+)$`,
  "i",
);

function unitName(unit: string) {
  const normalized = unit.toLowerCase();
  return normalized === "oz" ? "ounce" : normalized === "g" ? "gram" : normalized;
}

function amountOf(item: MealItem) {
  const match = item.qty?.trim().match(AMOUNT);
  if (!match || Number(match[1]) <= 0) return undefined;
  return { quantity: Number(match[1]), unit: unitName(match[2]) };
}

export function queryMealPortion(
  text: string,
  state: AppState,
  lastMealId?: string,
): LocalJarvisCommand | undefined {
  const match = CORRECTION.exec(text);
  if (!match) return undefined;
  const meal = state.mealEntries.find((item) => item.id === lastMealId);
  if (!meal)
    return { reply: "Confirm a meal in this Jarvis conversation before correcting its portion." };
  const needle = match[3].trim();
  const matches = (meal.items ?? []).flatMap((item, index) => {
    const name = item.name.toLowerCase().trim();
    return name === needle || name.endsWith(` ${needle}`) ? [{ item, index }] : [];
  });
  if (matches.length !== 1)
    return { reply: `Name one item from ${meal.name} to correct its portion.` };
  const reference = amountOf(matches[0].item);
  const unit = unitName(match[2]);
  if (!reference || reference.unit !== unit) {
    return {
      reply: `Use the saved portion unit for ${matches[0].item.name}${reference ? ` (${reference.unit})` : ""}, or edit the meal in Nutrition.`,
    };
  }
  const quantity = /^\d/.test(match[1]) ? Number(match[1]) : WORDS.indexOf(match[1]);
  if (quantity <= 0) return { reply: "Enter a portion above zero." };
  return {
    tool: "correctMealPortion",
    args: { id: meal.id, index: matches[0].index, quantity, unit },
  };
}

export const correctMealPortion: ToolHandler = (args, { state, set, confirmed }) => {
  const meal = state.mealEntries.find((entry) => entry.id === args.id);
  const index = Number(args.index);
  const item = meal?.items?.[index];
  const old = item && amountOf(item);
  if (!meal || meal.macroStatus === "unreported" || !item || !old || old.unit !== args.unit) {
    return { ok: false, summary: "The saved meal portion is no longer available." };
  }
  const quantity = Number(args.quantity);
  const factor = quantity / old.quantity;
  if (factor > 10)
    return {
      ok: false,
      summary: "Portions above ten times the recorded amount need a fresh estimate.",
    };
  if (factor === 1)
    return { ok: true, summary: "The meal already has that portion.", data: { duplicate: true } };
  const auditId = uid();
  const provenance = markProvenanceEdited(item.provenance ?? meal.provenance, {
    editedBy: "user",
    auditId,
  });
  const updated: MealItem = {
    ...item,
    qty: `${quantity} ${old.unit}${quantity === 1 ? "" : "s"}`,
    calories: Math.round(item.calories * factor),
    protein: Math.round(item.protein * factor),
    carbs: Math.round(item.carbs * factor),
    fat: Math.round(item.fat * factor),
    provenance,
  };
  const items = meal.items!.map((entry, position) => (position === index ? updated : entry));
  const totals = mealItemTotals(items);
  if (totals.calories > 20_000 || Math.max(totals.protein, totals.carbs, totals.fat) > 5_000) {
    return { ok: false, summary: "The new totals exceed FitCore's meal limits." };
  }
  const summary = `${confirmed ? "Corrected" : "Correct"} ${meal.name}. ${item.name}: ${item.qty} to ${updated.qty}. Meal total ${totals.calories} kcal, ${totals.protein}g P / ${totals.carbs}g C / ${totals.fat}g F.`;
  if (!confirmed) return { ok: true, summary };
  const next: MealEntry = {
    ...meal,
    ...totals,
    items,
    source: "edited",
    confirmed: true,
    provenance: markProvenanceEdited(meal.provenance, { editedBy: "user", auditId }),
  };
  set((current) => ({
    ...current,
    mealEntries: current.mealEntries.map((entry) => (entry.id === meal.id ? next : entry)),
  }));
  pushAudit(set, {
    id: auditId,
    tool: "correctMealPortion",
    summary,
    status: "logged",
    entityKind: "mealPortionEdit",
    entityIds: [meal.id],
    patch: { prev: meal, index, expected: updated, totals },
    createdAt: Date.now(),
  });
  return { ok: true, summary, auditId, data: { id: meal.id } };
};
