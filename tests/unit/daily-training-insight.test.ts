import { expect, test } from "bun:test";
import { dailyTrainingInsight } from "../../src/lib/daily-training-insight";
import { defaultState, type Workout } from "../../src/lib/types";
const now = new Date(2026, 10, 25, 12).getTime();
const plan = [{ exerciseId: "bench-press", sets: 3, reps: "8-12" }];
function workout(exerciseId = "bench-press"): Workout {
  return { id: "past", name: "Past", startedAt: now - 86400000, endedAt: now - 82800000, exercises: [{ id: "row", exerciseId, completed: true, sets: Array.from({ length: 3 }, (_, i) => ({ id: `set-${i}`, weight: 180, reps: 12, completed: true })) }] };
}
test("daily training insight joins the planned exercise to recorded performance without writes", () => {
  const state = { ...structuredClone(defaultState), workouts: [workout()] };
  const before = JSON.stringify(state), insight = dailyTrainingInsight(state, plan, now);
  expect(insight).toMatchObject({ exerciseId: "bench-press", planHasHistory: true, advice: { weight: 185 } });
  expect(JSON.stringify(state)).toBe(before);
});
test("rest plans and missing or unrelated history never produce fabricated performance", () => {
  const state = { ...structuredClone(defaultState), workouts: [workout("back-squat")] };
  expect(dailyTrainingInsight(state, [], now)).toBeUndefined();
  expect(dailyTrainingInsight(state, plan, now)).toEqual({ planHasHistory: false });
});
test("explicit planned load remains authoritative and stale history cannot produce an increase", () => {
  const state = { ...structuredClone(defaultState), workouts: [workout()] };
  const insight = dailyTrainingInsight(state, [{ ...plan[0], targetWeightLb: 195 }], now);
  expect(insight?.planHasHistory && insight.advice.summary).toContain("target is 195");
  state.workouts[0].startedAt = now - 40 * 86400000; state.workouts[0].endedAt = now - 40 * 86400000 + 3600000;
  const stale = dailyTrainingInsight(state, plan, now);
  expect(stale?.planHasHistory && stale.advice.summary).toContain("40 days ago");
});
