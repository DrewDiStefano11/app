import type { AppState, MealEntry } from "../types";
import type { CommitJarvisState } from "./action-transaction";
import { photoEstimateSchema, nextEstimate, photoMealItems, photoMealTotals, type PhotoMealDraft } from "./meal-photo-draft";
import { runTool, type ToolResult } from "./tools";

/** Only an explicitly reviewed draft can reach the existing validated, atomic Nutrition writer. */
export function savePhotoMealDraft(draft: PhotoMealDraft, state: AppState, commit: CommitJarvisState, confirmed: boolean, target?: MealEntry): ToolResult {
  if (!confirmed) return { ok: false, summary: "Review this estimate and explicitly confirm saving first." };
  if (!photoEstimateSchema.safeParse(nextEstimate(draft)).success) return { ok: false, summary: "This meal draft needs valid ingredients before saving." };
  const draftId = `${draft.draftId}:photo:${draft.revision}`;
  const previous = state.jarvisAudit.find(a => a.patch?.actionKey === `draft:${draftId}`);
  if (previous) return previous.undone ? { ok: false, summary: "That review was already undone. Revise it before saving again." } : { ok: true, summary: "This reviewed meal is already saved.", auditId: previous.id, data: { id: previous.entityIds?.[0], duplicate: true } };
  if (target && JSON.stringify(state.mealEntries.find(m => m.id === target.id)) !== JSON.stringify(target))
    return { ok: false, summary: "This saved meal changed after review. Reopen its latest version before correcting it. Your review is retained." };
  const items = photoMealItems(draft), totals = photoMealTotals(draft);
  const notes = [`Photo estimate reviewed by user; portions remain estimates. ${draft.servingsEaten} of ${draft.recipeServings} servings.`, ...draft.corrections].join("\n").slice(0, 1024);
  const args = target
    ? { draftId, id: target.id, patch: { name: draft.name, type: draft.mealType, ...totals, items, notes } }
    : { draftId, name: draft.name, mealType: draft.mealType, ...totals, items, notes, confidence: "low", assumptions: [...draft.assumptions, "Photo portions are approximate; user reviewed the estimate."].slice(0, 12) };
  return runTool(target ? "updateMeal" : "logMeal", args, { state, set: commit, settings: state.jarvisSettings, confirmed: true, mealPortionEdited: draft.corrections.length > 0, inputMethod: "photo" });
}
