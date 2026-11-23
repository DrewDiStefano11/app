import type { MealEntry } from "@/lib/types";
import { photoMealTotals, type PhotoMealDraft } from "@/lib/jarvis/meal-photo-draft";
import type { ToolResult } from "@/lib/jarvis/tools";
import type { savedFoodMatches } from "@/lib/jarvis/saved-food-matches";

interface Props {
  matches: ReturnType<typeof savedFoodMatches>;
  image?: string; draft?: PhotoMealDraft; target?: MealEntry; receipt?: ToolResult; error?: string; busy: boolean; consent: boolean;
  onConsent: (value: boolean) => void; onFile: (file?: File) => void; onAnalyse: () => void; onDiscard: () => void;
  onSave: () => void; onEdit: (patch: unknown, wording: string) => void; onUndo: () => void;
}
/** The conversation owns revisions; this card exposes their evidence and explicit save boundary. */
export function PhotoMealReview(props: Props) {
  const { draft, image, busy } = props;
  const totals = draft && photoMealTotals(draft);
  return <section aria-label="Meal photo review" className="w-full rounded-2xl border border-border bg-[var(--surface-2)] p-3 space-y-3 text-sm">
    <h4 className="font-semibold">{draft ? draft.name : "Estimate a meal photo"}</h4>
    {props.error && <p role="alert">{props.error}</p>}
    {!draft && <>
      <p>Choose a photo. Jarvis will estimate the foods and portions for your review.</p>
      <label className="block py-2">Upload food photo<input type="file" accept="image/*" aria-label="Upload food photo" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; props.onFile(file); }} /></label>
      <label className="block py-2">Take food photo<input type="file" accept="image/*" capture="environment" aria-label="Take food photo" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; props.onFile(file); }} /></label>
      {image && <img src={image} alt="Food photo awaiting consent" className="max-h-40 rounded-xl object-contain" />}
    </>}
    <label className="flex gap-2 py-2"><input type="checkbox" checked={props.consent} onChange={e => props.onConsent(e.target.checked)} disabled={busy} /><span>Send this photo and meal corrections to Groq<span className="block text-xs text-muted-foreground">Uses your Groq key and Qwen vision. Later corrections send meal text only. Photos are not saved in FitCore. Provider limits and retention rules apply.</span></span></label>
    {draft && totals && <>
      <p>Estimated portions for the whole photo. Eating {draft.servingsEaten} of {draft.recipeServings} servings.</p>
      <ul className="space-y-3">{draft.items.map(item => <li key={item.id} className="border-b border-border pb-2">
        <strong>{item.name}</strong><span className="block">~{Number(item.quantity.toFixed(3))} {item.unit} · {item.preparation} · {item.evidence === "user" ? "user corrected" : item.evidence}</span>
        <span className="block text-xs">{Math.round(item.calories)} kcal · {Math.round(item.protein)}g P / {Math.round(item.carbs)}g C / {Math.round(item.fat)}g F</span>
      </li>)}</ul>
      <p className="font-semibold">{totals.calories} kcal</p><p>{totals.protein}g protein / {totals.carbs}g carbs / {totals.fat}g fat for the amount eaten</p>
      <p>Do the foods and portions look right? Use the Jarvis message box or voice to correct them.</p>
      {props.matches.length > 0 && <div className="space-y-2"><p>Possible saved foods. Apply only if this is the same product; this replaces its estimated portion with the listed saved serving.</p>{props.matches.map(match => <button key={`${match.itemId}-${match.presetId}`} disabled={busy} className="min-h-11 rounded-lg border border-border px-3" onClick={() => props.onEdit({ operations: [{ op: "replace", id: match.itemId, item: match.ingredient }] }, `User selected saved label ${match.ingredient.name}, ${match.servingLabel}; replaced its estimate with the saved serving values.`)}>Use saved {match.ingredient.name} ({match.servingLabel})</button>)}</div>}
      {draft.question && <p>{draft.question}</p>}
      {draft.assumptions.map((text, index) => <p className="text-xs text-muted-foreground" key={index}>{text}</p>)}
      <details><summary className="min-h-11 py-3">Original observations and corrections</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(draft.original, null, 2)}</pre><ol>{draft.corrections.map((text, index) => <li key={index}>{text}</li>)}</ol></details>
      <details><summary className="min-h-11 py-3">Edit exact ingredient values</summary>{draft.items.map(item => <form key={`${item.id}-${draft.revision}`} className="space-y-2 border-t border-border py-3" onSubmit={event => {
        event.preventDefault(); if (busy) return; const data = new FormData(event.currentTarget);
        props.onEdit({ operations: [{ op: "nutrition", id: item.id, nutrition: Object.fromEntries(["calories", "protein", "carbs", "fat"].map(key => [key, Number(data.get(key))])) }] }, `Updated ${item.name} nutrition from user values for its listed quantity.`);
      }}><strong>{item.name}</strong><p className="text-xs">Values apply to its entire listed quantity.</p><div className="grid grid-cols-2 gap-2">{(["calories", "protein", "carbs", "fat"] as const).map(field => <label className="block" key={field}>{field}<input disabled={busy} name={field} type="number" min="0" max={field === "calories" ? 10000 : 1000} step="any" required defaultValue={item[field]} className="min-h-11 w-full rounded-lg bg-[var(--surface)] p-2" /></label>)}</div><button disabled={busy} className="min-h-11 rounded-lg border border-border px-3">Apply {item.name} values</button></form>)}</details>
      <div><button disabled={busy || props.receipt?.ok} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50" onClick={props.onSave}>{props.receipt?.ok ? "Meal saved" : props.target ? "Save corrected meal" : "Confirm and save meal"}</button></div>
      {props.receipt?.ok && <><p role="status">Meal saved. Corrections will update this same meal after another confirmation.</p><button className="min-h-11 rounded-lg border border-border px-3" onClick={props.onUndo}>Undo saved meal</button></>}
    </>}
    {!draft && <button disabled={busy || !image || !props.consent} onClick={props.onAnalyse} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{busy ? "Estimating…" : "Estimate meal"}</button>}
    <button className="min-h-11 rounded-lg border border-border px-3" onClick={props.onDiscard}>Discard meal photo</button>
  </section>;
}
