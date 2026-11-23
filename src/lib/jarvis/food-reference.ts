import { FOODS, type Food } from "../data";
import { mealItemTotals, type JarvisMealItem } from "./meal-math";
import type { LocalJarvisCommand } from "./text-commands";

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
      /\b(?:cups|slices|scoops|whites|cakes|tbsp|ounces|grams)\b/g,
      (word) =>
        ({
          cups: "cup",
          slices: "slice",
          scoops: "scoop",
          whites: "white",
          cakes: "cake",
          ounces: "oz",
          grams: "g",
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
