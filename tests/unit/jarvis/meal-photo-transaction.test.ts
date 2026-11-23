import { expect, test } from "bun:test";
import { defaultState } from "../../../src/lib/types";
import { createPhotoMealDraft, revisePhotoMealLocally, photoMealTotals } from "../../../src/lib/jarvis/meal-photo-draft";
import { savePhotoMealDraft } from "../../../src/lib/jarvis/meal-photo-transaction";
import { undoAuditEntry, runTool } from "../../../src/lib/jarvis/tools";
import { calculateMealTotals } from "../../../src/lib/analytics/domain-metrics";
import { todayMealEntries } from "../../../src/lib/analytics/observed-fitness";
import { createFitCoreBackupEnvelope } from "../../../src/lib/data-backup";

const estimate = { name: "Rice", mealType: "dinner", recipeServings: 1, servingsEaten: 1, items: [{ id: "rice", name: "Rice", quantity: 1, unit: "cup", calories: 205, protein: 4, carbs: 45, fat: 0, evidence: "visible", preparation: "cooked" }], assumptions: ["Estimated"], question: "" };
test("explicit photo save retries after rejection, commits once, shares totals and existing backup/undo", () => {
  let state = structuredClone(defaultState);
  const draft = createPhotoMealDraft(estimate, "one-photo");
  const commit = (update: (current: typeof state) => typeof state) => { state = update(state); return true; };
  expect(savePhotoMealDraft(draft, state, commit, false).ok).toBe(false);
  expect(state.mealEntries).toHaveLength(0);
  expect(savePhotoMealDraft(draft, state, () => false, true).ok).toBe(false);
  expect(draft.items).toHaveLength(1);
  const saved = savePhotoMealDraft(draft, state, commit, true);
  expect(saved.ok).toBe(true);
  expect(state.mealEntries).toHaveLength(1);
  expect(state.mealEntries[0]).toMatchObject({ confirmed: true, source: "camera", provenance: { source: "ai-estimated", confirmation: "confirmed" } });
  expect(calculateMealTotals(todayMealEntries(state))).toMatchObject(photoMealTotals(draft));
  expect(runTool("getNutritionStatus", {}, { state, set: commit, settings: state.jarvisSettings }).data).toMatchObject({ totals: photoMealTotals(draft) });
  expect(savePhotoMealDraft(draft, state, commit, true).ok).toBe(true);
  expect(state.mealEntries).toHaveLength(1);
  expect(createFitCoreBackupEnvelope(JSON.parse(JSON.stringify(state)), { exportedAt: new Date().toISOString() }).safeToExport).toBe(true);
  expect(undoAuditEntry(saved.auditId!, state, commit).ok).toBe(true);
  expect(state.mealEntries).toHaveLength(0);
});

test("editing a saved photo meal updates its identity, rejects stale targets, and undo restores previous meal", () => {
  let state = structuredClone(defaultState);
  const commit = (update: (current: typeof state) => typeof state) => { state = update(state); return true; };
  const draft = createPhotoMealDraft(estimate, "edit-photo");
  savePhotoMealDraft(draft, state, commit, true);
  const target = structuredClone(state.mealEntries[0]);
  const revision = revisePhotoMealLocally(draft, "the rice was 2 cups");
  if (!revision?.ok) throw new Error("No revision");
  const edited = savePhotoMealDraft(revision.draft, state, commit, true, target);
  expect(edited.ok).toBe(true);
  expect(state.mealEntries).toHaveLength(1);
  expect(state.mealEntries[0]).toMatchObject({ id: target.id, calories: 410 });
  expect(savePhotoMealDraft({ ...revision.draft, revision: 2 }, state, commit, true, target).ok).toBe(false);
  expect(undoAuditEntry(edited.auditId!, state, commit).ok).toBe(true);
  expect(state.mealEntries[0]).toEqual(target);
});
