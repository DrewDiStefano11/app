import { expect, test } from "bun:test";
import { createPhotoMealDraft, revisePhotoMealLocally, photoMealTotals, applyPhotoMealPatch } from "../../../src/lib/jarvis/meal-photo-draft";

export const plate = {
  name: "Chicken rice and broccoli", mealType: "dinner", recipeServings: 1, servingsEaten: 1,
  assumptions: ["Portions estimated from the photo; cooking oil may be hidden."], question: "Was any oil or sauce added?",
  items: [
    { id: "chicken", name: "Grilled chicken", quantity: 6, unit: "oz", calories: 280, protein: 52, carbs: 0, fat: 6, evidence: "visible", preparation: "grilled" },
    { id: "rice", name: "White rice", quantity: 1, unit: "cup", calories: 205, protein: 4, carbs: 45, fat: 0, evidence: "visible", preparation: "cooked" },
    { id: "broccoli", name: "Broccoli", quantity: 1, unit: "cup", calories: 55, protein: 4, carbs: 11, fat: 1, evidence: "visible", preparation: "steamed" },
  ],
};

test("acceptance correction changes only chicken, broccoli and oil and preserves original observations", () => {
  const initial = createPhotoMealDraft(plate, "photo-one");
  const revised = revisePhotoMealLocally(initial, "Actually the chicken was 8 ounces, remove the broccoli, and add a tablespoon of olive oil.");
  expect(revised?.ok).toBe(true);
  if (!revised?.ok) throw new Error("Expected revision");
  expect(revised.draft.items.map(i => i.name)).toEqual(["Grilled chicken", "White rice", "Olive Oil"]);
  expect(revised.draft.items[0].quantity).toBe(8);
  expect(revised.draft.items[1]).toEqual(initial.items[1]);
  expect(revised.draft.original).toEqual(plate);
  expect(initial.items).toHaveLength(3);
  expect(photoMealTotals(revised.draft)).toEqual({ calories: 698, protein: 73, carbs: 45, fat: 22 });
  expect(revised.draft.corrections).toHaveLength(1);
});

test("multiple revisions retain label overrides and servings use full recipe basis", () => {
  let draft = createPhotoMealDraft(plate, "servings");
  const result = revisePhotoMealLocally(draft, "the rice label says 180 calories, 5g protein, 40g carbs and 2g fat");
  expect(result?.ok).toBe(true);
  if (!result?.ok) throw new Error("Expected label correction");
  draft = result.draft;
  const portions = revisePhotoMealLocally(draft, "This makes 2 servings and I ate 1 serving");
  expect(portions?.ok).toBe(true);
  if (!portions?.ok) throw new Error("Expected servings");
  expect(portions.draft.items[1]).toEqual(draft.items[1]);
  expect(photoMealTotals(portions.draft)).toEqual({ calories: 258, protein: 31, carbs: 26, fat: 5 });
  expect(portions.draft.original.items[1].calories).toBe(205);
});

test("patches are atomic, bounded, cannot target ambiguous items or rewrite original observations", () => {
  const draft = createPhotoMealDraft(plate, "atomic");
  const bad = applyPhotoMealPatch(draft, { operations: [{ op: "remove", id: "broccoli" }, { op: "portion", id: "missing", quantity: 2, unit: "cup" }] }, "two edits");
  expect(bad.ok).toBe(false);
  expect(draft.items).toHaveLength(3);
  expect(applyPhotoMealPatch(draft, { operations: [{ op: "portion", id: "rice", quantity: -2, unit: "cup" }] }, "negative").ok).toBe(false);
  expect(revisePhotoMealLocally(draft, "remove the food")?.ok).toBe(false);
  expect(revisePhotoMealLocally(draft, "the chicken was 8 grams")?.ok).toBe(true);
});

test("preparation and replacement patches preserve unrelated ingredients and user correction history", () => {
  const draft = createPhotoMealDraft(plate, "replace");
  const changed = applyPhotoMealPatch(draft, { operations: [{ op: "replace", id: "broccoli", item: { ...plate.items[2], name: "Spinach", calories: 20 } }, { op: "preparation", id: "chicken", preparation: "air fried", nutrition: { calories: 300, protein: 52, carbs: 0, fat: 8 } }] }, "spinach, air fried chicken");
  expect(changed.ok).toBe(true);
  if (!changed.ok) return;
  expect(changed.draft.items[1]).toEqual(draft.items[1]);
  expect(changed.draft.items[2].id).toBe("broccoli");
  expect(changed.draft.items[0].evidence).toBe("user");
  expect(changed.draft.original).toEqual(plate);
});
