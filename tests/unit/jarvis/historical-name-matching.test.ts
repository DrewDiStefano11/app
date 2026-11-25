import { expect, test } from "bun:test";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { defaultState, type MealEntry } from "../../../src/lib/types";

const now = new Date(2026, 10, 25, 12);
function meal(id: string, name: string, days = 1): MealEntry {
  const date = new Date(now); date.setDate(date.getDate() - days);
  return { id, name, type: "breakfast", createdAt: date.getTime(), calories: 200, protein: 10, carbs: 30, fat: 5 };
}
const stateWith = (...rows: MealEntry[]) => ({ ...structuredClone(defaultState), mealEntries: rows });

test("an unknown non-Latin name cannot recall an unrelated recorded meal", () => {
  const result = interpretJarvisText("repeat 寿司 again", stateWith(meal("chicken", "鸡肉饭")), now);
  expect(result?.tool).toBeUndefined();
  expect(result?.reply).toContain("could not find");
});

test("exact Unicode names and canonical accent variants select only their real records", () => {
  const state = stateWith(meal("chicken", "鸡肉饭"), meal("sushi", "寿司"), meal("cafe", "Café bowl"));
  expect(interpretJarvisText("repeat 寿司 again", state, now)?.args.notes).toContain("recorded meal sushi");
  expect(interpretJarvisText("repeat Cafe\u0301 bowl again", state, now)?.args.notes).toContain("recorded meal cafe");
});

test("different combining marks cannot manufacture a usual meal combination", () => {
  const state = stateWith(...[1, 2, 3].flatMap(day => [meal(`main-${day}`, day === 3 ? "दिल" : "दाल", day), meal(`milk-${day}`, "Milk", day)]));
  expect(interpretJarvisText("repeat my usual breakfast combo", state, now)?.tool).toBeUndefined();
  expect(interpretJarvisText("repeat my usual breakfast combo", state, now)?.reply).toContain("three distinct days");
});
