import { expect, test } from "bun:test";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { queryRecordedMeal } from "../../../src/lib/jarvis/recorded-meals";
import { defaultState, type MealEntry } from "../../../src/lib/types";
import { runTool } from "../../../src/lib/jarvis/tools";

const now = new Date(2026, 10, 25, 12);
function meal(id = "oats", days = 1, patch: Partial<MealEntry> = {}): MealEntry {
  const date = new Date(now); date.setDate(date.getDate() - days);
  return { id, name: "Overnight oats", type: "breakfast", calories: 300, protein: 20, carbs: 40, fat: 6, createdAt: date.getTime(), ...patch } as MealEntry;
}
const stateWith = (...meals: MealEntry[]) => ({ ...structuredClone(defaultState), mealEntries: meals });

test("historical phrases use dated actual records before saved foods, preserve portions and never mutate them", () => {
  const state = stateWith(meal());
  state.savedNutrition = [{ id: "different", kind: "food", meal: meal("preset", 0, { name: "Breakfast", calories: 999 }) }];
  const before = JSON.stringify(state);
  for (const text of ["log the same breakfast as yesterday", "same breakfast as yesterday", "I had yesterday's breakfast", "log Overnight oats from yesterday"]) {
    const result = interpretJarvisText(text, state, now);
    expect(result).toMatchObject({ tool: "logReferenceMeal", args: { name: "Overnight oats", calories: 300, protein: 20, carbs: 40, fat: 6 } });
    expect(result?.args.notes).toContain("recorded meal oats");
  }
  expect(JSON.stringify(state)).toBe(before);
});

test("ambiguous records prompt for a choice with continuity and reject removed or ambiguous choices", () => {
  const oats = meal(), eggs = meal("eggs", 1, { name: "Eggs", calories: 200 });
  const state = stateWith(oats, eggs);
  const ask = interpretJarvisText("log same breakfast as yesterday", state, now);
  expect(ask?.reply).toContain("Which recorded meal");
  const selected = interpretJarvisText("2", state, now, ask?.nextContext);
  expect(selected?.tool).toBe("logReferenceMeal");
  expect(selected?.args.originalText).toContain("log same breakfast as yesterday");
  expect(selected?.nextContext?.mealRecall).toBeUndefined();
  const missing = interpretJarvisText("2", stateWith(), now, ask?.nextContext);
  expect(missing?.reply).toContain("unavailable");
  expect(interpretJarvisText("cancel", state, now, ask?.nextContext)?.reply).toContain("cancelled");
});

test("missing, future, undone, unconfirmed and malformed records never become historical nutrients", () => {
  const state = stateWith(
    meal("future", -1), meal("nan", 1, { calories: NaN }),
    meal("pending", 1, { source: "camera", confirmed: false }),
    meal("pending-manual", 1, { provenance: { source: "manual", confidence: "high", confirmation: "unconfirmed" } }),
    meal("undone", 1, { auditId: "undone-audit" }),
  );
  state.jarvisAudit = [{ id: "undone-audit", tool: "logMeal", summary: "undone", status: "logged", createdAt: now.getTime(), undone: true }];
  const result = interpretJarvisText("log same breakfast as yesterday", state, now);
  expect(result?.reply).toContain("could not find");
  expect(result?.tool).toBeUndefined();
  expect(interpretJarvisText("log the chicken from last week", state, now)?.reply).toContain("cannot safely resolve");
});

test("last meal is chronological, named repeats distinguish portion variants, and unknown macros stay unknown", () => {
  const unknown = meal("unknown", 0, { name: "Unreported bowl", macroStatus: "unreported", protein: undefined, carbs: undefined, fat: undefined });
  const state = stateWith(unknown, meal("old", 3));
  const last = interpretJarvisText("repeat my last meal", state, now);
  expect(last).toMatchObject({ tool: "logCaloriesOnly", args: { calories: 300, approximate: false } });
  expect(last?.args.protein).toBeUndefined();
  expect(last?.args.notes).toContain("recorded meal unknown");
  expect(interpretJarvisText("log overnight oats again", state, now)?.args.calories).toBe(300);
  state.mealEntries.push(meal("larger", 1, { calories: 600 }));
  expect(interpretJarvisText("log overnight oats again", state, now)?.reply).toContain("Which recorded meal");
});

test("usual serving needs three distinct dates and preserves explicit preferences; suggestions use real records", () => {
  const state = stateWith(meal("a", 1), meal("b", 2), meal("duplicate", 2));
  expect(interpretJarvisText("log my usual breakfast", state, now)?.reply).toContain("three distinct days");
  state.mealEntries.push(meal("c", 3));
  expect(interpretJarvisText("log my usual breakfast", state, now)).toMatchObject({ tool: "logReferenceMeal", args: { calories: 300 } });
  expect(interpretJarvisText("show my frequent meals", state, now)?.reply).toContain("3 distinct days");
  state.userGoalsProfile.usualBreakfast = "My chosen breakfast";
  state.jarvisLearning.usualMeal_breakfast = { calories: 450, protein: 30, carbs: 40, fat: 18 };
  expect(interpretJarvisText("log my usual breakfast", state, now)?.tool).toBe("logUsualMeal");
});

test("calendar yesterday respects a daylight-saving transition", () => {
  const date = new Date(2026, 10, 2, 0, 30);
  const yesterday = new Date(date); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 15);
  const state = stateWith(meal("dst", 1, { createdAt: yesterday.getTime() }));
  expect(interpretJarvisText("same breakfast as yesterday", state, date)?.tool).toBe("logReferenceMeal");
});

test("copied breakdown must agree with totals and original low confidence remains low", () => {
  const bad = meal("bad", 1, { items: [{ name: "oats", qty: "1 cup", calories: 200, protein: 20, carbs: 40, fat: 6 }] });
  expect(interpretJarvisText("same breakfast as yesterday", stateWith(bad), now)?.reply).toContain("differs");
  const low = meal("low", 1, { source: "camera", confirmed: true, confidence: "low" });
  expect(interpretJarvisText("same breakfast as yesterday", stateWith(low), now)?.args.confidence).toBe("low");
});

test("review, failed persistence and retry preserve the source and create exactly one new meal", () => {
  const original = meal();
  let state = stateWith(original);
  const proposal = queryRecordedMeal("same breakfast as yesterday", "same breakfast as yesterday", state, now);
  if (!proposal || !("tool" in proposal)) throw new Error("Expected reviewed proposal");
  const preview = runTool(proposal.tool, proposal.args, { state, set: () => { throw new Error("Preview wrote"); }, settings: state.jarvisSettings, confirmed: false });
  expect(preview.needsConfirmation).toBe(true);
  const failed = runTool(proposal.tool, proposal.args, { state, set: () => false, settings: state.jarvisSettings, confirmed: true });
  expect(failed.ok).toBe(false);
  expect(state.mealEntries).toEqual([original]);
  const save = () => runTool(proposal.tool, proposal.args, { state, set: update => { state = update(state); return true; }, settings: state.jarvisSettings, confirmed: true });
  expect(save().ok).toBe(true); expect(save().ok).toBe(true);
  expect(state.mealEntries).toHaveLength(2);
  expect(state.mealEntries[0]).toEqual(original);
  expect(state.mealEntries[1].notes).toContain("recorded meal oats");
});
