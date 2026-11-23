import { z } from "zod";
import { FOODS } from "../data";
import { mealItemTotals } from "./meal-math";
import { normalizeSpokenNumbers } from "./normalization/spoken-numbers";

const label = z.string().trim().min(1).max(160);
const nutrition = z.strictObject({ calories: z.number().min(0).max(10000), protein: z.number().min(0).max(1000), carbs: z.number().min(0).max(1000), fat: z.number().min(0).max(1000) });
const unit = z.enum(["g", "oz", "cup", "tbsp", "tsp", "piece", "serving", "ml"]);
export const photoIngredientSchema = nutrition.extend({ id: label, name: label, quantity: z.number().positive().max(5000), unit, evidence: z.enum(["visible", "inferred", "user"]), preparation: label });
export const photoEstimateSchema = z.strictObject({
  name: label, mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"]),
  recipeServings: z.number().positive().max(100), servingsEaten: z.number().positive().max(100),
  items: z.array(photoIngredientSchema).min(1).max(20), assumptions: z.array(z.string().max(300)).max(8), question: z.string().max(300),
}).refine(value => new Set(value.items.map(i => i.id)).size === value.items.length, "Ingredient IDs must be unique");
export type PhotoEstimate = z.infer<typeof photoEstimateSchema>;
export type PhotoIngredient = PhotoEstimate["items"][number];
export interface PhotoMealDraft extends PhotoEstimate {
  draftId: string;
  original: PhotoEstimate;
  corrections: string[];
  revision: number;
}
export const photoPatchSchema = z.strictObject({ operations: z.array(z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("remove"), id: label }),
  z.strictObject({ op: z.literal("portion"), id: label, quantity: z.number().positive().max(5000), unit }),
  z.strictObject({ op: z.literal("nutrition"), id: label, nutrition: nutrition.partial().refine(n => Object.keys(n).length > 0) }),
  z.strictObject({ op: z.literal("add"), item: photoIngredientSchema }),
  z.strictObject({ op: z.literal("replace"), id: label, item: photoIngredientSchema }),
  z.strictObject({ op: z.literal("preparation"), id: label, preparation: label, nutrition }),
  z.strictObject({ op: z.literal("servings"), recipeServings: z.number().positive().max(100), servingsEaten: z.number().positive().max(100) }),
  z.strictObject({ op: z.literal("meal"), name: label.optional(), mealType: photoEstimateSchema.shape?.mealType ?? z.enum(["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"]) }),
])).min(1).max(12) });
export type PhotoMealPatch = z.infer<typeof photoPatchSchema>;
export type PhotoRevisionResult = { ok: true; draft: PhotoMealDraft } | { ok: false; error: string };

export function createPhotoMealDraft(estimate: unknown, draftId: string): PhotoMealDraft {
  const checked = photoEstimateSchema.parse(estimate);
  return { ...structuredClone(checked), draftId, original: structuredClone(checked), corrections: [], revision: 0 };
}

function compatibleFactor(old: PhotoIngredient, quantity: number, nextUnit: PhotoIngredient["unit"]) {
  const units = { g: 1, oz: 28.3495, cup: 240, tbsp: 15, tsp: 5, ml: 1, piece: 1, serving: 1 };
  const family = (u: string) => ["g", "oz"].includes(u) ? "mass" : ["cup", "tbsp", "tsp", "ml"].includes(u) ? "volume" : u;
  if (family(old.unit) !== family(nextUnit)) return undefined;
  return quantity * units[nextUnit] / (old.quantity * units[old.unit]);
}

export function applyPhotoMealPatch(draft: PhotoMealDraft, input: unknown, wording: string): PhotoRevisionResult {
  const parsed = photoPatchSchema.safeParse(input);
  if (!parsed.success || !wording.trim() || wording.length > 2048 || draft.corrections.length >= 30)
    return { ok: false, error: "That correction needs valid quantities or nutrition values. The draft is unchanged." };
  const next = structuredClone(draft);
  for (const operation of parsed.data.operations) {
    if (operation.op === "servings") {
      next.recipeServings = operation.recipeServings;
      next.servingsEaten = operation.servingsEaten;
      continue;
    }
    if (operation.op === "meal") {
      next.name = operation.name ?? next.name;
      next.mealType = operation.mealType;
      continue;
    }
    if (operation.op === "add") {
      if (next.items.some(i => i.id === operation.item.id)) return { ok: false, error: "That ingredient ID is already in the draft." };
      next.items.push({ ...operation.item, evidence: "user" });
      continue;
    }
    const index = next.items.findIndex(i => i.id === operation.id);
    if (index < 0) return { ok: false, error: "That ingredient is no longer in this draft. Nothing changed." };
    const old = next.items[index];
    if (operation.op === "remove") next.items.splice(index, 1);
    else if (operation.op === "replace") next.items[index] = { ...operation.item, id: old.id, evidence: "user" };
    else if (operation.op === "nutrition") next.items[index] = { ...old, ...operation.nutrition, evidence: "user" };
    else if (operation.op === "preparation") next.items[index] = { ...old, preparation: operation.preparation, ...operation.nutrition, evidence: "user" };
    else {
      const factor = compatibleFactor(old, operation.quantity, operation.unit);
      if (factor === undefined || factor > 20) return { ok: false, error: `Use a compatible quantity for ${old.name}; mass and volume cannot be converted without more information.` };
      next.items[index] = { ...old, quantity: operation.quantity, unit: operation.unit, calories: old.calories * factor, protein: old.protein * factor, carbs: old.carbs * factor, fat: old.fat * factor, evidence: "user" };
    }
  }
  if (!photoEstimateSchema.safeParse(nextEstimate(next)).success) return { ok: false, error: "Keep at least one ingredient and valid bounded portions. The draft is unchanged." };
  next.corrections.push(wording.trim());
  next.question = "";
  next.revision++;
  return { ok: true, draft: next };
}

export function nextEstimate(draft: PhotoMealDraft): PhotoEstimate {
  const { name, mealType, recipeServings, servingsEaten, items, assumptions, question } = draft;
  return { name, mealType, recipeServings, servingsEaten, items, assumptions, question };
}

export function photoMealItems(draft: PhotoMealDraft) {
  const factor = draft.servingsEaten / draft.recipeServings;
  return draft.items.map(item => ({ name: item.name, qty: `${Number((item.quantity * factor).toFixed(3))} ${item.unit}`, calories: item.calories * factor, protein: item.protein * factor, carbs: item.carbs * factor, fat: item.fat * factor }));
}
export function photoMealTotals(draft: PhotoMealDraft) { return mealItemTotals(photoMealItems(draft)); }

const units: Record<string, PhotoIngredient["unit"]> = { grams: "g", gram: "g", g: "g", ounce: "oz", ounces: "oz", oz: "oz", cup: "cup", cups: "cup", tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp", serving: "serving", servings: "serving", piece: "piece", pieces: "piece", ml: "ml" };
const quantityPattern = "(\\d+(?:\\.\\d+)?(?:/\\d+)?|a|an)\\s*(grams?|g|ounces?|oz|cups?|tablespoons?|tbsp|teaspoons?|tsp|servings?|pieces?|ml)";
function parseQuantity(amount: string) { const [n, d = 1] = amount.split("/").map(Number); return /^(a|an)$/.test(amount) ? 1 : n / d; }
function matchIngredient(draft: PhotoMealDraft, text: string) {
  const needle = text.trim().toLowerCase().replace(/^the\s+/, "");
  const matches = draft.items.filter(i => i.name.toLowerCase() === needle || ` ${i.name.toLowerCase()} `.includes(` ${needle} `));
  return matches.length === 1 ? matches[0] : undefined;
}

/** Return undefined only when text interpretation is needed. Never partially apply a compound correction. */
export function revisePhotoMealLocally(draft: PhotoMealDraft, wording: string): PhotoRevisionResult | undefined {
  const text = normalizeSpokenNumbers(wording).normalizedText.toLowerCase().trim().replace(/[.!?]+$/, "").replace(/^actually[, ]+/, "");
  const servings = /^(?:this|it) (?:makes|is|was) (\d+(?:\.\d+)?) servings? and i ate (\d+(?:\.\d+)?) servings?$/.exec(text);
  if (servings) return applyPhotoMealPatch(draft, { operations: [{ op: "servings", recipeServings: Number(servings[1]), servingsEaten: Number(servings[2]) }] }, wording);
  const eaten = /^i ate (\d+(?:\.\d+)?) servings?$/.exec(text);
  if (eaten) return applyPhotoMealPatch(draft, { operations: [{ op: "servings", recipeServings: draft.recipeServings, servingsEaten: Number(eaten[1]) }] }, wording);
  const labelMatch = /^(?:the )?(.+?) (?:label says|has) (.+)$/.exec(text);
  if (labelMatch) {
    const item = matchIngredient(draft, labelMatch[1]);
    if (!item) return { ok: false, error: "Name one ingredient in the draft for that label correction." };
    const values: Record<string, number> = {};
    const fragments = labelMatch[2].split(/,\s*|\s+and\s+/);
    for (const fragment of fragments) {
      const number = /^(\d+(?:\.\d+)?)\s*(?:g\s*)?(calories|kcal|protein|carbs|carbohydrates|fat)$/.exec(fragment.trim());
      if (!number) return undefined;
      const field = number[2] === "kcal" ? "calories" : number[2] === "carbohydrates" ? "carbs" : number[2];
      values[field] = Number(number[1]);
    }
    return applyPhotoMealPatch(draft, { operations: [{ op: "nutrition", id: item.id, nutrition: values }] }, wording);
  }
  const clauses = text.split(/,\s*(?:and\s+)?|\s+and\s+(?=(?:add|remove|replace|the\s))/).map(c => c.trim());
  const operations: PhotoMealPatch["operations"] = [];
  for (const clause of clauses) {
    const remove = /^(?:remove|delete|leave out) (?:the )?(.+)$/.exec(clause);
    if (remove) {
      const item = matchIngredient(draft, remove[1]);
      if (!item) return { ok: false, error: "Name one matching ingredient to remove. The draft is unchanged." };
      operations.push({ op: "remove", id: item.id }); continue;
    }
    const portion = new RegExp(`^(?:the )?(.+?) (?:was|is|to) ${quantityPattern}$`).exec(clause.replace(/^(?:change|make) /, ""));
    if (portion) {
      const item = matchIngredient(draft, portion[1]);
      if (!item) return { ok: false, error: "Name one matching ingredient to change its portion." };
      operations.push({ op: "portion", id: item.id, quantity: parseQuantity(portion[2]), unit: units[portion[3]] }); continue;
    }
    const addition = new RegExp(`^add ${quantityPattern} (?:of )?(.+)$`).exec(clause);
    if (addition) {
      const food = FOODS.find(f => f.name.toLowerCase() === addition[3]);
      const base = food && /^(\d+(?:\.\d+)?) (\w+)/.exec(food.servingLabel.toLowerCase());
      if (!food || !base || !units[base[2]]) return undefined;
      const item: PhotoIngredient = { id: `added-${draft.revision}-${operations.length}`, name: food.name, quantity: Number(base[1]), unit: units[base[2]], calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, preparation: "as listed in FitCore food library", evidence: "user" };
      const requested = parseQuantity(addition[1]), requestedUnit = units[addition[2]];
      const factor = compatibleFactor(item, requested, requestedUnit);
      if (factor === undefined) return undefined;
      operations.push({ op: "add", item: { ...item, quantity: requested, unit: requestedUnit, calories: item.calories * factor, protein: item.protein * factor, carbs: item.carbs * factor, fat: item.fat * factor } }); continue;
    }
    return undefined;
  }
  return operations.length ? applyPhotoMealPatch(draft, { operations }, wording) : undefined;
}
