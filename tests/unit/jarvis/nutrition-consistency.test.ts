import { expect, test } from "bun:test";
import { defaultState } from "../../../src/lib/types";
import { todayMealTotals } from "../../../src/lib/analytics";
import { getNutritionAnalytics } from "../../../src/lib/analytics/domain-metrics";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { runTool } from "../../../src/lib/jarvis/tools";

test("Home, Deep Dive, typed answers and Jarvis tools exclude future meals consistently", () => {
  const now = Date.now();
  const meal = {
    id: "logged",
    name: "Lunch",
    type: "lunch",
    createdAt: now - 1000,
    calories: 500,
    protein: 40,
    carbs: 50,
    fat: 15,
  };
  const future = { ...meal, id: "future", createdAt: now + 60_000, calories: 900, protein: 90 };
  const state = { ...structuredClone(defaultState), mealEntries: [meal, future] };
  expect(todayMealTotals(state, now).calories).toBe(500);
  expect(getNutritionAnalytics(state, now).caloriesToday.value).toBe(500);
  const reply = interpretJarvisText("How many calories have I eaten today?", state, new Date(now));
  expect(reply).toMatchObject({
    reply: "Today's meal log totals 500 kcal, including any saved estimates.",
  });
  const status = runTool(
    "getNutritionStatus",
    {},
    { state, settings: state.jarvisSettings, set: () => {} },
  );
  expect(status.data).toMatchObject({ totals: { calories: 500, protein: 40 } });
  const review = runTool(
    "getDailyReviewSummary",
    {},
    { state, settings: state.jarvisSettings, set: () => {} },
  );
  expect(review.data).toMatchObject({ mealsLogged: 1, calories: { logged: 500 } });
});
