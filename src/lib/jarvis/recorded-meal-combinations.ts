import type { AppState, MealEntry } from "../types";
import { dayKey } from "../analytics/date-time";
import { mealItemTotals } from "./meal-math";
import { normalizeRecordedMealName, recordedMealCommand, recordedMeals } from "./recorded-meals";
import { validateJarvisMutation } from "./action-schemas";
import type { LocalJarvisCommand } from "./text-commands";

const slots = "breakfast|lunch|dinner|snack|pre-workout|post-workout";
const fail = (reply: string): LocalJarvisCommand => ({ reply, nextContext: { mealRecall: undefined } });
const normalized = normalizeRecordedMealName;

function evidence(state: AppState, now: Date) {
  const ids = new Map<string, number>();
  for (const meal of state.mealEntries) ids.set(meal.id, (ids.get(meal.id) ?? 0) + 1);
  return { eligible: new Set(recordedMeals(state, now)), ids };
}
function combination(meals: MealEntry[], context: ReturnType<typeof evidence>, originalText: string): LocalJarvisCommand {
  if (!meals.length) return fail("There are no recorded entries for that whole meal. Name a saved food or describe what you ate.");
  if (meals.length > 6) return fail("That whole meal has more than six separate records. Repeat its entries individually so every serving can be reviewed.");
  if (meals.some(meal => !context.eligible.has(meal) || context.ids.get(meal.id) !== 1))
    return fail("Some entries are unconfirmed, invalid or have duplicate record IDs. Review them in Fuel before repeating the whole meal.");
  if (meals.some(meal => meal.macroStatus === "unreported"))
    return fail("At least one entry has unreported macros. Repeat these records individually to preserve the known and unknown values.");
  const components = meals.map(meal => recordedMealCommand(meal, originalText));
  const invalid = components.find(part => !("tool" in part));
  if (invalid) return invalid;
  const items = meals.flatMap(meal => meal.items?.length ? meal.items.map(({ name, qty, calories, protein, carbs, fat }) => ({ name, qty, calories, protein, carbs, fat })) : [{ name: meal.name, qty: "1 recorded serving", calories: meal.calories, protein: meal.protein!, carbs: meal.carbs!, fat: meal.fat! }]);
  const references = meals.map(meal => `${meal.id} (${dayKey(meal.createdAt)}; ${meal.provenance?.source ?? meal.source ?? "manual"}; confidence ${meal.provenance?.confidence ?? meal.confidence ?? "unreported"})`);
  const notes = `Whole recorded meal, ${meals.length} entries: ${references.join("; ")}. Copied portions, not new measurements.`;
  const confidence = components.some(part => "args" in part && part.args.confidence === "low") ? "low" : components.some(part => "args" in part && part.args.confidence === "medium") ? "medium" : "high";
  const args = { name: `${meals[0].type} combination (${meals.length} recorded entries)`, mealType: meals[0].type, ...mealItemTotals(items), ...(meals.every(meal => typeof meal.fiber === "number" && Number.isFinite(meal.fiber) && meal.fiber >= 0) ? { fiber: meals.reduce((sum, meal) => sum + meal.fiber!, 0) } : {}), items, confidence, notes, assumptions: [notes, ...new Set(meals.flatMap(meal => meal.assumptions ?? []))], originalText };
  const checked = validateJarvisMutation("logReferenceMeal", args);
  return checked?.success ? { tool: "logReferenceMeal", args: checked.data, nextContext: { mealRecall: undefined } }
    : fail("That combination is too large or has invalid portions. Repeat its recorded entries individually to review every value.");
}

function groups(state: AppState, now: Date, context: ReturnType<typeof evidence>) {
  const start = new Date(now); start.setDate(start.getDate() - 28);
  const days = new Map<string, MealEntry[]>();
  for (const meal of state.mealEntries) {
    if (!Number.isFinite(meal.createdAt) || meal.createdAt < start.getTime() || meal.createdAt > now.getTime()) continue;
    const key = `${dayKey(meal.createdAt)}:${meal.type}`;
    const group = days.get(key) ?? []; group.push(meal); days.set(key, group);
  }
  const frequent = new Map<string, { meals: MealEntry[]; days: Set<string> }>();
  for (const rows of days.values()) {
    if (rows.length < 2 || !("tool" in combination(rows, context, "show my frequent meal combinations"))) continue;
    const signature = JSON.stringify([rows[0].type, rows.map(meal => [normalized(meal.name), meal.calories, meal.protein, meal.carbs, meal.fat, meal.items?.map(item => [normalized(item.name), item.qty, item.calories, item.protein, item.carbs, item.fat])]).map(row => JSON.stringify(row)).sort()]);
    const group = frequent.get(signature);
    if (group) {
      group.days.add(dayKey(rows[0].createdAt));
      if (rows[0].createdAt > group.meals[0].createdAt) group.meals = rows;
    } else frequent.set(signature, { meals: rows, days: new Set([dayKey(rows[0].createdAt)]) });
  }
  return [...frequent.values()].filter(group => group.days.size >= 3).sort((a, b) => b.days.size - a.days.size || b.meals[0].createdAt - a.meals[0].createdAt);
}

/** Whole-day/slot aggregation requires explicit all/whole/combination wording. Ordinary ambiguity remains unchanged. */
export function queryRecordedMealCombination(text: string, originalText: string, state: AppState, now: Date): LocalJarvisCommand | undefined {
  const dated = new RegExp(`^(?:log|repeat) (?:all of |(?:my |the )?whole )?(yesterday|today)(?:'s|s) (${slots})(?: (?:combination|combo))?$`).exec(text);
  if (dated && /\b(?:all|whole|combination|combo)\b/.test(text)) {
    const date = new Date(now); if (dated[1] === "yesterday") date.setDate(date.getDate() - 1);
    const rows = state.mealEntries.filter(meal => meal.type === dated[2] && Number.isFinite(meal.createdAt) && meal.createdAt <= now.getTime() && dayKey(meal.createdAt) === dayKey(date.getTime()));
    return combination(rows, evidence(state, now), originalText);
  }
  if (/^(?:show|list) my frequent meal (?:combinations|combos)$/.test(text)) {
    const frequent = groups(state, now, evidence(state, now)).slice(0, 5);
    return fail(frequent.length ? `Repeated recorded combinations in the last 28 days: ${frequent.map(group => `${group.meals[0].type}: ${group.meals.map(meal => meal.name).join(" + ")} (${group.days.size} distinct days; latest ${dayKey(group.meals[0].createdAt)})`).join("; ")}. Repeat all of yesterday's breakfast (or another recorded slot) to review its actual entries.` : "No complete combination of at least two entries repeats on three distinct days in the last 28 days.");
  }
  const usual = new RegExp(`^(?:log|repeat) (?:my )?usual (${slots}) (?:combination|combo)$`).exec(text);
  if (usual) {
    const context = evidence(state, now);
    const frequent = groups(state, now, context).filter(group => group.meals[0].type === usual[1]);
    if (!frequent.length) return fail("A usual combination needs the same complete recorded entries on at least three distinct days in the last 28 days. Specify a dated whole meal instead.");
    if (frequent[1]?.days.size === frequent[0].days.size) return fail("More than one recorded combination is equally frequent. Specify today's or yesterday's whole meal to choose its actual portions.");
    return combination(frequent[0].meals, context, originalText);
  }
}
