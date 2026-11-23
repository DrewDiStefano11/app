import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useServerFn } from "@tanstack/react-start";
import { estimateJarvisMealPhoto, reviseJarvisMealPhoto } from "@/lib/ai.functions";
import { jarvisProviderKeys } from "@/lib/jarvis/provider-keys";
import { reserveJarvisPhotoRequest } from "@/lib/jarvis/cloud-usage";
import { prepareMealPhoto } from "@/lib/jarvis/meal-photo-image";
import { createPhotoMealDraft, applyPhotoMealPatch, revisePhotoMealLocally, nextEstimate, type PhotoMealDraft } from "@/lib/jarvis/meal-photo-draft";
import { savePhotoMealDraft } from "@/lib/jarvis/meal-photo-transaction";
import { undoAuditEntry, type ToolResult } from "@/lib/jarvis/tools";
import type { CommitJarvisState } from "@/lib/jarvis/action-transaction";
import type { AppState, MealEntry } from "@/lib/types";
import { uid } from "@/lib/store";
import { PhotoMealReview } from "./photo-meal-review";

const cooldown = { until: 0 };
type Usage = { provider: string; actualModel: string; callType: string; timestamp: number; status?: number; errorCategory?: string; promptTokens?: number; completionTokens?: number };
interface Options { active: boolean; stateRef: RefObject<AppState>; commit: CommitJarvisState; onReply: (text: string) => void; onBusyChange: (busy: boolean) => void; onUsage: (usage: Usage) => void }

export function usePhotoMeal(options: Options) {
  const [shown, setShown] = useState(false);
  const [image, setImage] = useState<string>();
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState<PhotoMealDraft>();
  const [target, setTarget] = useState<MealEntry>();
  const [receipt, setReceipt] = useState<ToolResult>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const current = useRef({ options, draft, target, receipt, image, consent });
  current.current = { options, draft, target, receipt, image, consent };
  const estimate = useServerFn(estimateJarvisMealPhoto);
  const revise = useServerFn(reviseJarvisMealPhoto);
  const reportBusy = useCallback((value: boolean) => { setBusy(value); current.current.options.onBusyChange(value); }, []);
  const interrupt = useCallback(() => { epoch.current++; request.current?.abort(); request.current = null; reportBusy(false); }, [reportBusy]);
  const discard = useCallback(() => {
    interrupt(); setImage(undefined); setDraft(undefined); setTarget(undefined); setReceipt(undefined); setError(undefined); setConsent(false); setShown(false);
    current.current = { ...current.current, draft: undefined, target: undefined, receipt: undefined, image: undefined, consent: false };
  }, [interrupt]);
  useEffect(() => {
    const cancel = () => { interrupt(); setImage(undefined); setConsent(false); };
    const hidden = () => { if (document.visibilityState === "hidden") cancel(); };
    document.addEventListener("visibilitychange", hidden); window.addEventListener("pagehide", cancel); window.addEventListener("offline", interrupt);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", cancel); window.removeEventListener("offline", interrupt); interrupt(); };
  }, [interrupt]);
  useEffect(() => { if (!options.active) { interrupt(); setImage(undefined); setConsent(false); } }, [options.active, interrupt]);

  const eligible = () => {
    const state = current.current.options.stateRef.current;
    if (!state.jarvisSettings.enabled || state.demoMode || state.jarvisSettings.aiProvider !== "groq") return "Choose Groq and enable Jarvis to estimate meal photos.";
    if (!navigator.onLine) return "Meal estimation needs a connection. Manual food logging remains available.";
    if (!jarvisProviderKeys.read("groq").key || state.jarvisSettings.groqKeyMode === "environment") return "Add your own Groq key in Jarvis AI settings to estimate photos.";
    if (Date.now() < cooldown.until) return "Groq requested a pause. Wait before estimating again.";
    return undefined;
  };
  const begin = () => { interrupt(); const controller = new AbortController(); request.current = controller; reportBusy(true); setError(undefined); return { controller, version: epoch.current }; };
  const finish = (version: number) => { if (version === epoch.current) { request.current = null; reportBusy(false); } };
  const onFile = async (file?: File) => {
    if (!file) return;
    const { controller, version } = begin();
    try {
      const prepared = await prepareMealPhoto(file, controller.signal);
      if (version !== epoch.current || controller.signal.aborted) return;
      setImage(prepared); setConsent(false); setDraft(undefined); setTarget(undefined); setReceipt(undefined);
    } catch (cause) { if (version === epoch.current) setError(cause instanceof Error ? cause.message : "Could not open this photo."); }
    finally { finish(version); }
  };
  const analyse = async () => {
    const context = current.current;
    if (request.current || !context.image || !context.consent) return;
    const unavailable = eligible(); if (unavailable) { setError(unavailable); return; }
    const limit = reserveJarvisPhotoRequest(window.localStorage); if (limit) { setError(limit); return; }
    const { controller, version } = begin();
    const timeout = window.setTimeout(() => { if (version === epoch.current) { interrupt(); setError("Meal estimation timed out. Nothing was saved; you can retry."); } }, 25000);
    try {
      const result = await estimate({ signal: controller.signal, data: { consent: true, imageDataUrl: context.image, userGroqApiKey: jarvisProviderKeys.read("groq").key, groqKeyMode: "local" } });
      if (controller.signal.aborted || version !== epoch.current) return;
      options.onUsage({ provider: "groq", actualModel: "qwen/qwen3.8-27b", callType: "mealPhoto", timestamp: Date.now(), ...(result.ok ? { status: 200, ...result.usage } : { status: result.status, errorCategory: result.code }) });
      if (!result.ok) { cooldown.until = Date.now() + Math.min(result.retryAfterMs ?? 0, 86400000); setError(result.error); return; }
      const next = createPhotoMealDraft(result.estimate, uid());
      setDraft(next); setImage(undefined); setReceipt(undefined);
      current.current.draft = next;
      options.onReply("Here is my preliminary meal estimate. Do the foods and portions look right? Correct anything by text or voice, then explicitly save.");
    } catch { if (version === epoch.current) setError("Meal estimation is unavailable. Nothing was saved; you can retry or log manually."); }
    finally { window.clearTimeout(timeout); finish(version); }
  };
  const save = () => {
    const context = current.current;
    if (!context.draft || request.current || context.receipt?.ok) return;
    const result = savePhotoMealDraft(context.draft, context.options.stateRef.current, context.options.commit, true, context.target);
    if (!result.ok) { setError(result.summary); return; }
    const id = (result.data as { id?: string } | undefined)?.id;
    // The store updates synchronously; keep the expected saved value for future revisions.
    setReceipt(result); current.current.receipt = result;
    setError(undefined);
    const saved = id ? context.options.stateRef.current.mealEntries.find(m => m.id === id) : undefined;
    if (saved) { setTarget(structuredClone(saved)); current.current.target = structuredClone(saved); }
    options.onReply(result.summary);
  };
  const applyRevision = (next: PhotoMealDraft) => {
    const context = current.current;
    let expected = context.target;
    if (context.receipt?.ok) {
      const audit = context.options.stateRef.current.jarvisAudit.find(a => a.id === context.receipt?.auditId);
      const saved = context.options.stateRef.current.mealEntries.find(m => m.id === audit?.entityIds?.[0]);
      if (!saved || audit?.undone) { setError("This saved meal is no longer available. Reopen its latest version in Nutrition."); return; }
      expected = structuredClone(saved);
    }
    setDraft(next); setReceipt(undefined); setTarget(expected); setError(undefined);
    current.current = { ...context, draft: next, receipt: undefined, target: expected };
    options.onReply("Updated the meal estimate. Review the revised breakdown before saving.");
  };
  const handleMessage = async (wording: string): Promise<boolean> => {
    const context = current.current;
    if (!context.draft || !shown) return false;
    if (/^(?:looks good[, ]*)?(?:save (?:it|the meal|this)|confirm(?: and save)?)[.!]?$/i.test(wording.trim())) { save(); return true; }
    if (/^(?:cancel|discard)(?: (?:it|the meal))?[.!]?$/i.test(wording.trim())) { discard(); return true; }
    if (/^(?:undo|how |what |give me |log |i did |i bench)/i.test(wording.trim())) return false;
    const local = revisePhotoMealLocally(context.draft, wording);
    if (local) { if (local.ok) applyRevision(local.draft); else setError(local.error); return true; }
    if (context.receipt?.ok && !/^(?:actually|add |remove |replace |change |the |it |this |i ate |make |use )/i.test(wording.trim())) return false;
    if (!context.consent) { setError("Allow sending meal corrections to Groq below, or use the exact item editor. The photo will not be sent again."); return true; }
    const unavailable = eligible(); if (unavailable) { setError(unavailable); return true; }
    const limit = reserveJarvisPhotoRequest(window.localStorage); if (limit) { setError(limit); return true; }
    const { controller, version } = begin();
    const timeout = window.setTimeout(() => { if (version === epoch.current) { interrupt(); setError("Correction timed out. Your draft is unchanged."); } }, 25000);
    try {
      const result = await revise({ signal: controller.signal, data: { consent: true, estimate: nextEstimate(context.draft), correction: wording, userGroqApiKey: jarvisProviderKeys.read("groq").key, groqKeyMode: "local" } });
      if (version !== epoch.current || controller.signal.aborted) return true;
      options.onUsage({ provider: "groq", actualModel: "qwen/qwen3.8-27b", callType: "mealPhotoCorrection", timestamp: Date.now(), ...(result.ok ? { status: 200, ...result.usage } : { status: result.status, errorCategory: result.code }) });
      if (!result.ok) { cooldown.until = Date.now() + Math.min(result.retryAfterMs ?? 0, 86400000); setError(result.error); return true; }
      const applied = applyPhotoMealPatch(context.draft, result.patch, wording);
      if (applied.ok) applyRevision(applied.draft); else setError(applied.error);
    } catch { if (version === epoch.current) setError("Correction unavailable. Your review is unchanged; retry or use the item editor."); }
    finally { window.clearTimeout(timeout); finish(version); }
    return true;
  };
  const reopen = useCallback((mealId: string) => {
    const meal = current.current.options.stateRef.current.mealEntries.find(m => m.id === mealId);
    if (!meal?.items?.length || meal.macroStatus === "unreported") return;
    try {
      const items = meal.items.map((item, index) => {
        const qty = /^(\d+(?:\.\d+)?) (g|oz|cup|tbsp|tsp|piece|serving|ml)$/.exec(item.qty ?? "");
        return { ...item, id: `saved-${index}`, quantity: qty ? Number(qty[1]) : 1, unit: qty?.[2] ?? "serving", evidence: "user", preparation: "as saved", source: undefined, confidence: undefined, provenance: undefined, qty: undefined };
      }).map(({ name, id, quantity, unit, evidence, preparation, calories, protein, carbs, fat }) => ({ name, id, quantity, unit, evidence, preparation, calories, protein, carbs, fat }));
      const next = createPhotoMealDraft({ name: meal.name, mealType: meal.type, recipeServings: 1, servingsEaten: 1, items, assumptions: ["Starting from the saved meal; original photo is not retained."], question: "" }, uid());
      interrupt(); setShown(true); setImage(undefined); setDraft(next); setTarget(structuredClone(meal)); setReceipt(undefined); setConsent(false); setError(undefined);
      current.current = { ...current.current, draft: next, target: structuredClone(meal), receipt: undefined, consent: false };
    } catch { setError("Use Nutrition's meal editor for this meal's saved format."); }
  }, [interrupt]);
  return {
    busy, shown, draft, handleMessage, discard, reopen,
    open: () => setShown(true),
    view: shown ? <PhotoMealReview image={image} draft={draft} target={target} receipt={receipt} error={error} busy={busy} consent={consent} onConsent={setConsent} onFile={onFile} onAnalyse={analyse} onDiscard={discard} onSave={save} onEdit={(patch, wording) => { if (!current.current.draft) return; const result = applyPhotoMealPatch(current.current.draft, patch, wording); if (result.ok) applyRevision(result.draft); else setError(result.error); }} onUndo={() => {
      const auditId = current.current.receipt?.auditId;
      if (!auditId) return;
      const result = undoAuditEntry(auditId, options.stateRef.current, options.commit);
      if (result.ok) discard(); else setError(result.summary);
    }} /> : null,
  };
}
