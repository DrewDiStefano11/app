import { FOODS, type Food } from "../data";
import { mealItemTotals, type JarvisMealItem } from "./meal-math";
import type { LocalJarvisCommand } from "./text-commands";
import { requiresNutritionPresetConfirmation } from "../saved-nutrition";
import type { AppState, SavedNutritionPreset } from "../types";

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
const SERVING = /^(\d+(?:[./]\d+)?)\s*(.+)$/;

function portion(text: string) {
  const match = SERVING.exec(text.toLowerCase().trim());
  if (!match) return undefined;
  const [value, denominator] = match[1].split("/").map(Number);
  const amount = denominator === undefined ? value : value / denominator;
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const unit = match[2]
    .replace(
      /\b(?:cups|slices|scoops|whites|cakes|tbsp|ounces|grams|servings|pieces)\b/g,
      (word) =>
        ({
          cups: "cup",
          slices: "slice",
          scoops: "scoop",
          whites: "white",
          cakes: "cake",
          ounces: "oz",
          grams: "g",
          servings: "serving",
          pieces: "piece",
        })[word] ?? word,
    )
    .replace(/\b(?:ounce|gram)\b/g, (word) => (word === "ounce" ? "oz" : "g"));
  return { amount, unit };
}

function lookup(name: string) {
  const matches = FOODS.filter(
    (food) => food.name.toLowerCase() === name || food.name.toLowerCase() + "s" === name,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function scale(food: Food, qty: string): JarvisMealItem | undefined {
  const base = portion(food.servingLabel);
  const requested = portion(qty);
  if (!base || !requested || base.unit !== requested.unit) return undefined;
  const factor = requested.amount / base.amount;
  if (factor > 10) return undefined;
  return {
    name: food.name,
    qty,
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor),
    carbs: Math.round(food.carbs * factor),
    fat: Math.round(food.fat * factor),
  };
}

function parseItem(text: string) {
  const count = new RegExp(`^(a|an|${WORDS.join("|")}|\\d+(?:[./]\\d+)?) (.+)$`).exec(text);
  if (!count) return undefined;
  const value =
    count[1] === "a" || count[1] === "an"
      ? 1
      : /^\d/.test(count[1])
        ? count[1]
        : WORDS.indexOf(count[1]);
  const explicit = /^(.+?) of (.+)$/.exec(count[2]);
  const food = lookup(explicit?.[2] ?? count[2]);
  if (!food) return undefined;
  const standard = portion(food.servingLabel);
  if (!standard || (!explicit && standard.unit !== "medium" && standard.unit !== "plain"))
    return undefined;
  const qty = `${value} ${explicit?.[1] ?? standard.unit}`;
  return scale(food, qty);
}

export function queryLibraryMeal(
  text: string,
  originalText: string,
): LocalJarvisCommand | undefined {
  const match = /^(?:i (?:ate|had)|log) (.+?)(?: for (breakfast|lunch|dinner|snack))?$/.exec(text);
  if (!match) return undefined;
  const named = match[1].split(/,\s*(?:and )?|\s+and\s+/);
  if (named.length > 10) return undefined;
  const items = named.map(parseItem);
  if (items.some((item) => !item)) return undefined;
  const resolved = items as JarvisMealItem[];
  return {
    tool: "logReferenceMeal",
    args: {
      name: resolved.map((item) => item.name).join(" + "),
      mealType: match[2] ?? "snack",
      ...mealItemTotals(resolved),
      items: resolved,
      confidence: "medium",
      assumptions: ["Used FitCore food library serving values."],
      originalText,
    },
  };
}

export function resolveLibraryPortions(items: JarvisMealItem[]) {
  const matched: string[] = [];
  const resolved = items.map((item) => {
    const food = lookup(item.name.trim().toLowerCase());
    const replaced = food && item.qty ? scale(food, item.qty) : undefined;
    if (!replaced) return item;
    matched.push(replaced.name);
    return replaced;
  });
  return { items: resolved, matched };
}

// ---- Saved-nutrition-aware helpers ----

const normalizedName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Find confirmed saved presets whose name fuzzy-matches `query`. */
function matchSavedPresets(query: string, state: AppState): SavedNutritionPreset[] {
  const q = normalizedName(query);
  return (state.savedNutrition ?? []).filter(
    (p) =>
      !requiresNutritionPresetConfirmation(p.meal) &&
      p.meal.macroStatus !== "unreported" &&
      normalizedName(p.meal.name).includes(q),
  );
}

/** Convert a confirmed saved preset (with optional servings multiplier) into a JarvisMealItem. */
function presetToItem(preset: SavedNutritionPreset, servings = 1): JarvisMealItem {
  const m = preset.meal;
  // m.macroStatus !== "unreported" guaranteed by caller
  const meal = m as Extract<typeof m, { protein: number }>;
  return {
    name: meal.name,
    qty: preset.servingLabel
      ? servings === 1
        ? preset.servingLabel
        : `${servings} × ${preset.servingLabel}`
      : undefined,
    calories: Math.round(meal.calories * servings),
    protein: Math.round(meal.protein * servings),
    carbs: Math.round(meal.carbs * servings),
    fat: Math.round(meal.fat * servings),
  };
}

/**
 * Like `queryLibraryMeal` but checks `state.savedNutrition` before the FOODS catalog.
 * Supports phrases like:
 *   "I had two servings of my teriyaki beef"
 *   "log the same breakfast as yesterday"
 *   "add another scoop of protein powder"
 *   "200 grams of the chicken from last week"
 *
 * When multiple materially different matches exist, returns a reply asking the user to clarify.
 * Always routes through the existing review-before-saving flow (tool: logReferenceMeal).
 */
export function queryLibraryMealWithSaved(
  text: string,
  originalText: string,
  state: AppState,
): LocalJarvisCommand | undefined {
  // Pattern: "i had / i ate / log <qty?> <name> [for <mealType>]"
  const match =
    /^(?:i (?:ate|had)|log|add|added|had) (.+?)(?: for (breakfast|lunch|dinner|snack|pre-workout|post-workout))?$/.exec(
      text,
    );
  if (!match) return undefined;

  const rawItems = match[1];
  const mealType = match[2] ?? "snack";

  // Strip filler phrases: "the same X as yesterday", "my usual X", "another X"
  const cleaned = rawItems
    .replace(/\bthe same\b/gi, "")
    .replace(/\b(?:as|from) (?:yesterday|last week|this morning|this week)\b/gi, "")
    .replace(/\bmy (?:usual\s+)?/gi, "")
    .replace(/\banother\b/gi, "1")
    .trim();

  // Try to split on ", and " / " and "
  const parts = cleaned.split(/,\s*(?:and )?|\s+and\s+/);
  if (parts.length > 10) return undefined;

  const resolvedItems: JarvisMealItem[] = [];
  const ambiguousNames: string[] = [];
  let usedSaved = false;
  let usedCatalog = false;

  for (const part of parts) {
    // Extract optional leading count: "2 servings of X", "two X", "1/2 cup of X"
    const countMatch = new RegExp(`^(a|an|${WORDS.join("|")}|\\d+(?:[./]\\d+)?) (.+)$`).exec(
      part.trim(),
    );

    let amount = 1;
    let requestedUnit: string | undefined;
    let foodQuery = part.trim();

    if (countMatch) {
      const countStr = countMatch[1];
      const count =
        countStr === "a" || countStr === "an"
          ? 1
          : /^\d/.test(countStr)
            ? countStr
            : WORDS.indexOf(countStr);
      amount = portion(`${count} serving`)?.amount ?? NaN;
      foodQuery = countMatch[2];
      const measured =
        /^(servings?|scoops?|cups?|oz|ounces?|g|grams?|pieces?|slices?|ml|tbsp|tsp)(?: of)?\s+(.+)$/.exec(
          foodQuery,
        );
      if (measured) {
        requestedUnit = portion(`1 ${measured[1]}`)?.unit;
        foodQuery = measured[2];
      }
    }

    foodQuery = foodQuery.replace(/^the\s+/, "");

    // 1. Search saved presets first
    const savedMatches = matchSavedPresets(foodQuery, state);
    if (savedMatches.length === 1) {
      const preset = savedMatches[0];
      let servings = amount;
      if (requestedUnit && requestedUnit !== "serving") {
        const base = preset.servingLabel && portion(preset.servingLabel);
        if (!base || base.unit !== requestedUnit) {
          return {
            reply: `Please use servings or ${preset.servingLabel ?? "the saved serving size"} for ${preset.meal.name}; I cannot safely convert that unit.`,
          };
        }
        servings = amount / base.amount;
      }
      if (!Number.isFinite(servings) || servings <= 0 || servings > 10) {
        return { reply: "Please specify a positive quantity of up to 10 saved servings." };
      }
      resolvedItems.push(presetToItem(preset, servings));
      usedSaved = true;
      continue;
    }
    if (savedMatches.length > 1) {
      // Multiple saved matches — present ambiguity
      ambiguousNames.push(
        `"${foodQuery}" matched: ${savedMatches.map((p) => p.meal.name).join(", ")}`,
      );
      continue;
    }

    // 2. Fall back to catalog lookup via existing parseItem logic
    const catalogItem = parseItem(part.trim());
    if (catalogItem) {
      resolvedItems.push(catalogItem);
      usedCatalog = true;
      continue;
    }

    // No match at all — give up on this phrase
    return undefined;
  }

  if (ambiguousNames.length) {
    return {
      reply: `I found multiple matches — please clarify:\n${ambiguousNames.join("\n")}\n\nOr open Food Library to log directly.`,
    };
  }

  // Keep the established catalog-only path and its original provenance intact.
  if (!resolvedItems.length || !usedSaved) return undefined;

  return {
    tool: "logReferenceMeal",
    args: {
      name: resolvedItems.map((i) => i.name).join(" + "),
      mealType,
      ...mealItemTotals(resolvedItems),
      items: resolvedItems,
      confidence: usedCatalog ? "medium" : "high",
      assumptions: [
        usedCatalog
          ? "Used saved library and FitCore catalog values."
          : "Used confirmed saved library serving values.",
      ],
      originalText,
    },
  };
}
