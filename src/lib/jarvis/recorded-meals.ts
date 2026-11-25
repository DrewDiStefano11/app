import type { AppState, MealEntry } from "../types";
import { dayKey } from "../analytics/date-time";
import { requiresNutritionPresetConfirmation } from "../saved-nutrition";
import { mealItemTotals } from "./meal-math";
import { validateJarvisMutation } from "./action-schemas";
import { readUsualMeal } from "./usual-meals";
import type { LocalJarvisCommand } from "./text-commands";

export interface MealRecallContext { candidateIds: string[]; label: string; originalText: string }
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slots = "breakfast|lunch|dinner|snack|pre-workout|post-workout";

export function recordedMeals(state: AppState, now: Date) {
  const undone = new Set(state.jarvisAudit.filter(a => a.undone).map(a => a.id));
  return state.mealEntries.filter(meal => Number.isFinite(meal.createdAt) && meal.createdAt > 0 && meal.createdAt <= now.getTime()
    && meal.provenance?.confirmation !== "unconfirmed" && !requiresNutritionPresetConfirmation(meal)
    && (!meal.auditId || !undone.has(meal.auditId))
    && [meal.calories, ...(meal.macroStatus === "unreported" ? [] : [meal.protein, meal.carbs, meal.fat])].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0))
    .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}
export function recordedMealCommand(meal: MealEntry, originalText: string): LocalJarvisCommand {
  const source = meal.provenance?.source ?? meal.source ?? "manual";
  const recordedConfidence = meal.provenance?.confidence ?? meal.confidence;
  const confidence = recordedConfidence === "unknown" ? "low" : recordedConfidence ?? (source === "manual" ? "high" : "low");
  if (meal.items?.length && meal.macroStatus !== "unreported") {
    const totals = mealItemTotals(meal.items);
    if ((["calories", "protein", "carbs", "fat"] as const).some(key => totals[key] !== Math.round(meal[key])))
      return { reply: "The recorded meal's ingredient breakdown differs from its totals. Review it in Fuel before reusing it." };
  }
  const reference = `Reused recorded meal ${meal.id} from ${dayKey(meal.createdAt)}; original source ${source}, confidence ${meal.provenance?.confidence ?? meal.confidence ?? "unreported"}. Values and serving are copied records, not new measurements.`;
  const common = { name: meal.name, mealType: meal.type, calories: meal.calories, originalText, notes: reference };
  const tool = meal.macroStatus === "unreported" ? "logCaloriesOnly" : "logReferenceMeal";
  const args = meal.macroStatus === "unreported" ? { ...common, approximate: false } : {
    ...common, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
    ...(meal.fiber !== undefined && { fiber: meal.fiber }),
    ...(meal.items?.length && { items: meal.items.map(({ name, qty, calories, protein, carbs, fat }) => ({ name, ...(qty && { qty }), calories, protein, carbs, fat })) }),
    confidence, assumptions: [reference, ...(meal.assumptions ?? []).slice(0, 10)],
  };
  const checked = validateJarvisMutation(tool, args);
  return checked?.success ? { tool, args: checked.data, nextContext: { mealRecall: undefined } }
    : { reply: "That recorded meal needs valid portions or nutrition values. Open it in Fuel before reusing it.", nextContext: { mealRecall: undefined } };
}
function choose(meals: MealEntry[], label: string, originalText: string): LocalJarvisCommand {
  if (!meals.length) return { reply: `I could not find a confirmed recorded meal for ${label}. Name a saved food or describe what you ate; I will not guess historical values.`, nextContext: { mealRecall: undefined } };
  if (meals.length === 1) return recordedMealCommand(meals[0], originalText);
  const candidates = meals.slice(0, 8);
  return { reply: `Which recorded meal for ${label}? ${candidates.map((m, i) => `${i + 1}. ${m.name} (${m.calories} kcal, ${dayKey(m.createdAt)})`).join("; ")}. Reply with its number or exact name.`, nextContext: { mealRecall: { candidateIds: candidates.map(m => m.id), label, originalText } } };
}
const signature = (meal: MealEntry) => JSON.stringify([normalize(meal.name), meal.type, meal.calories, meal.macroStatus ?? "reported", meal.protein, meal.carbs, meal.fat, meal.items?.map(i => [normalize(i.name), i.qty, i.calories, i.protein, i.carbs, i.fat])]);
function frequencies(meals: MealEntry[], now: Date) {
  const start = new Date(now); start.setDate(start.getDate() - 28);
  const groups = new Map<string, { meal: MealEntry; days: Set<string> }>();
  for (const meal of meals) {
    if (meal.createdAt < start.getTime()) continue;
    const key = signature(meal), group = groups.get(key);
    if (group) group.days.add(dayKey(meal.createdAt));
    else groups.set(key, { meal, days: new Set([dayKey(meal.createdAt)]) });
  }
  return [...groups.values()].sort((a, b) => b.days.size - a.days.size || b.meal.createdAt - a.meal.createdAt);
}

/** Deterministic dated record lookup. Every mutation still uses Jarvis review and its existing atomic writer. */
export function queryRecordedMeal(text: string, originalText: string, state: AppState, now: Date, recall?: MealRecallContext): LocalJarvisCommand | undefined {
  if (!recall && (!/^(?:(?:log|repeat|i (?:had|ate)) |(?:the |my )?same |(?:show|list) my (?:frequent|frequently logged) meals$|suggest a meal from my history$)/.test(text)
    || !/\b(?:again|usual|yesterday|today|frequent|frequently|history|last|recent|this morning|this week)\b/.test(text))) return;
  const meals = recordedMeals(state, now);
  if (recall) {
    if (/^(?:cancel|never mind|nevermind)$/.test(text)) return { reply: "Meal recall cancelled.", nextContext: { mealRecall: undefined } };
    const index = /^(?:number |option )?(\d+)$/.exec(text);
    const candidates = meals.filter(m => recall.candidateIds.includes(m.id));
    const named = candidates.filter(m => normalize(m.name) === normalize(text.replace(/^the /, "")));
    if (index || named.length) {
      const selected = index ? candidates.find(m => m.id === recall.candidateIds[Number(index[1]) - 1]) : named.length === 1 ? named[0] : undefined;
      return selected ? recordedMealCommand(selected, `${recall.originalText} (choice ${originalText}; recorded meal ${selected.id})`) : { reply: "That choice is unavailable or ambiguous. Ask for the meal again to review current records.", nextContext: { mealRecall: undefined } };
    }
  }
  if (/^(?:show|list) my (?:frequent|frequently logged) meals$|^suggest a meal from my history$/.test(text)) {
    const frequent = frequencies(meals, now).slice(0, 5);
    return { reply: frequent.length ? `Recorded meals in the last 28 days: ${frequent.map(g => `${g.meal.name}: ${g.days.size} distinct days, ${g.meal.calories} kcal per recorded portion`).join("; ")}. Ask to log a named meal again to review it.` : "There are no confirmed meal records in the last 28 days to suggest from." };
  }
  const last = /^(?:log|repeat|i (?:had|ate)) (?:my |the )?(?:same as (?:my |the )?)?(?:last|most recent) meal(?: again)?$/.test(text);
  if (last) return choose(meals.slice(0, 1), "your last meal", originalText);
  const dated = new RegExp(`^(?:(?:log|repeat|i (?:had|ate)) )?(?:(?:the |my )?same )?(${slots}) (?:as|from) (yesterday|today)$`).exec(text);
  // Keep the two syntaxes explicit so date words cannot fall through to saved-name matching.
  const prefix = new RegExp(`^(?:log|repeat|i (?:had|ate)) (yesterday|today)(?:'s|s) (${slots})$`).exec(text);
  const slot = prefix?.[2] ?? dated?.[1];
  const relative = prefix?.[1] ?? dated?.[2];
  if (slot && relative) {
    const date = new Date(now); if (relative === "yesterday") date.setDate(date.getDate() - 1);
    return choose(meals.filter(m => m.type === slot && dayKey(m.createdAt) === dayKey(date.getTime())), `${relative}'s ${slot}`, originalText);
  }
  const namedDate = /^(?:log|repeat|i (?:had|ate)) (?:my |the )?(.+?) from (yesterday|today)$/.exec(text);
  if (namedDate) {
    const date = new Date(now); if (namedDate[2] === "yesterday") date.setDate(date.getDate() - 1);
    return choose(meals.filter(m => normalize(m.name) === normalize(namedDate[1]) && dayKey(m.createdAt) === dayKey(date.getTime())), `${namedDate[1]} from ${namedDate[2]}`, originalText);
  }
  const usual = new RegExp(`^(?:log|i (?:had|ate)) (?:my )?usual (${slots})$`).exec(text);
  if (usual) {
    const storedSlot = usual[1] === "pre-workout" ? "preWorkout" : usual[1] === "post-workout" ? "postWorkout" : usual[1] as "breakfast" | "lunch" | "dinner" | "snack";
    if (readUsualMeal(state, storedSlot).name) return;
    const groups = frequencies(meals.filter(m => m.type === usual[1]), now);
    if (!groups.length || groups[0].days.size < 3) return { reply: `I need the same recorded ${usual[1]} on at least three distinct days in the last 28 days to infer a usual serving. Choose a saved meal or name the portion.` };
    const tied = groups.filter(g => g.days.size === groups[0].days.size);
    return choose(tied.map(g => g.meal), `your usual ${usual[1]}`, originalText);
  }
  const named = /^(?:log|repeat|i (?:had|ate)) (?:my |the )?(.+?) again$/.exec(text);
  if (named) {
    const variants = new Map<string, MealEntry>();
    for (const meal of meals) if (normalize(meal.name) === normalize(named[1]) && !variants.has(signature(meal))) variants.set(signature(meal), meal);
    return choose([...variants.values()], named[1], originalText);
  }
  if (/^(?:log|repeat|i (?:had|ate)) /.test(text) && /\b(?:yesterday|last week|this morning|this week)\b/.test(text))
    return { reply: "Name the meal and use from yesterday or from today, or specify its recorded portion. I cannot safely resolve that historical reference." };
}
