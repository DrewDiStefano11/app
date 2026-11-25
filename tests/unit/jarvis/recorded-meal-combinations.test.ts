import { expect, test } from "bun:test";
import { interpretJarvisText } from "../../../src/lib/jarvis/text-commands";
import { runTool } from "../../../src/lib/jarvis/tools";
import { defaultState, type MealEntry } from "../../../src/lib/types";

const now = new Date(2026, 10, 25, 12);
function meal(id: string, days: number, name = "Oats", patch: Partial<MealEntry> = {}): MealEntry {
  const date = new Date(now); date.setDate(date.getDate() - days);
  return { id, name, type: "breakfast", calories: 200, protein: 10, carbs: 30, fat: 5, createdAt: date.getTime(), ...patch } as MealEntry;
}
const stateWith = (...rows: MealEntry[]) => ({ ...structuredClone(defaultState), mealEntries: rows });
const query = (state: ReturnType<typeof stateWith>, text = "repeat all of yesterday's breakfast") => interpretJarvisText(text, state, now);

test("explicit whole-meal wording combines actual portions while ordinary ambiguity remains", () => {
  const state = stateWith(meal("oats", 1), meal("milk", 1, "Milk", { fiber: 2 }), meal("other", 2));
  const before = structuredClone(state);
  for (const text of ["repeat all of yesterday's breakfast", "log yesterday's breakfast combo"]) {
    expect(query(state, text)).toMatchObject({ tool: "logReferenceMeal", args: { calories: 400, protein: 20, carbs: 60, fat: 10, items: [{ name: "Oats" }, { name: "Milk" }] } });
  }
  expect(query(state)?.args).not.toHaveProperty("fiber");
  expect(query(state)?.args.notes).toContain("oats (");
  expect(query(state)?.args.notes).toContain("milk (");
  expect(query(state, "same breakfast as yesterday")?.reply).toContain("Which recorded meal");
  expect(state).toEqual(before);
});

test("unknown, invalid, unconfirmed and duplicate records are never silently omitted from a whole-meal request", () => {
  const oats = meal("a", 1);
  for (const bad of [meal("b", 1, "Unknown", { macroStatus: "unreported", protein: undefined, carbs: undefined, fat: undefined }), meal("b", 1, "Invalid", { calories: NaN }), meal("b", 1, "Pending", { provenance: { source: "jarvis", confidence: "high", confirmation: "unconfirmed" } }), meal("a", 1)]) {
    const answer = query(stateWith(oats, bad));
    expect(answer?.tool).toBeUndefined();
    expect(answer?.reply).toMatch(/unreported|unconfirmed|duplicate/);
  }
  const inconsistent = meal("b", 1, "Bad breakdown", { items: [{ name: "wrong", calories: 10, protein: 0, carbs: 0, fat: 0 }] });
  expect(query(stateWith(oats, inconsistent))?.reply).toContain("differs from its totals");
});

test("full recorded ingredient quantities, fiber and conservative confidence survive aggregation", () => {
  const state = stateWith(meal("a", 1, "Oats", { fiber: 3, confidence: "low", assumptions: ["Serving size was estimated"], items: [{ name: "Rolled oats", qty: "40 g", calories: 200, protein: 10, carbs: 30, fat: 5 }] }), meal("b", 1, "Milk", { fiber: 0 }));
  const result = query(state);
  expect(result?.args).toMatchObject({ fiber: 3, confidence: "low", items: [{ name: "Rolled oats", qty: "40 g" }, { name: "Milk", qty: "1 recorded serving" }] });
  expect(result?.args.notes).toContain("confidence low");
  expect(result?.args.assumptions).toContain("Serving size was estimated");
});

test("usual combinations need three distinct local dates, preserve serving variants and clarify frequency ties", () => {
  const rows = [1, 2].flatMap(day => [meal(`oats-${day}`, day), meal(`milk-${day}`, day, "Milk")]);
  const state = stateWith(...rows);
  expect(query(state, "repeat my usual breakfast combo")?.reply).toContain("three distinct days");
  state.mealEntries.push(meal("oats-3", 3), meal("milk-3", 3, "Milk"));
  expect(query(state, "show my frequent meal combinations")?.reply).toContain("3 distinct days");
  expect(query(state, "repeat my usual breakfast combination")?.args.calories).toBe(400);
  state.mealEntries.push(...[4, 5, 6].flatMap(day => [meal(`eggs-${day}`, day, "Eggs"), meal(`toast-${day}`, day, "Toast")]));
  expect(query(state, "repeat my usual breakfast combo")?.reply).toContain("equally frequent");
});

test("bounded complete combinations reject oversize days and ignore future dates", () => {
  expect(query(stateWith(...Array.from({ length: 7 }, (_, i) => meal(`m-${i}`, 1))))?.reply).toContain("more than six");
  expect(query(stateWith(meal("future", -1)))?.reply).toContain("no recorded entries");
  const state = stateWith(meal("one", 1), meal("old", 40, "Milk"));
  expect(query(state, "show my frequent meal combinations")?.reply).toContain("No complete combination");
});

test("combination review rejects a failed write then saves exactly once without changing either source", () => {
  let state = stateWith(meal("a", 1), meal("b", 1, "Milk"));
  const original = structuredClone(state.mealEntries);
  const command = query(state);
  if (!command || !("tool" in command)) throw Error("Expected combination review");
  expect(runTool(command.tool, command.args, { state, now, settings: state.jarvisSettings, set: () => { throw Error("Review wrote"); } }).needsConfirmation).toBe(true);
  expect(runTool(command.tool, command.args, { state, now, settings: state.jarvisSettings, confirmed: true, set: () => false }).ok).toBe(false);
  const save = () => runTool(command.tool, command.args, { state, now, settings: state.jarvisSettings, confirmed: true, set: update => { state = update(state); return true; } });
  expect(save().ok).toBe(true); expect(save().ok).toBe(true);
  expect(state.mealEntries).toHaveLength(3);
  expect(state.mealEntries.slice(0, 2)).toEqual(original);
  expect(state.mealEntries[2]).toMatchObject({ calories: 400, protein: 20, carbs: 60, fat: 10 });
});
