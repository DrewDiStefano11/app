import type { MealItem } from "../types";

export type JarvisMealItem = Pick<
  MealItem,
  "name" | "qty" | "calories" | "protein" | "carbs" | "fat"
>;

export function mealItemTotals(items: readonly JarvisMealItem[]) {
  return items.reduce(
    (totals, item) => ({
      calories: totals.calories + Math.round(item.calories),
      protein: totals.protein + Math.round(item.protein),
      carbs: totals.carbs + Math.round(item.carbs),
      fat: totals.fat + Math.round(item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function scaleMealPortion(item: JarvisMealItem, portions: number): JarvisMealItem {
  if (portions === 1) return item;
  const quantity = item.qty && /^(\d+(?:\.\d+)?)(\s+[^\d/].*)$/.exec(item.qty);
  return {
    name: item.name,
    qty: quantity
      ? `${Number((Number(quantity[1]) * portions).toFixed(3))}${quantity[2]}`
      : `${portions} × ${item.qty ?? "estimated portion"}`,
    calories: Math.round(item.calories * portions),
    protein: Math.round(item.protein * portions),
    carbs: Math.round(item.carbs * portions),
    fat: Math.round(item.fat * portions),
  };
}
