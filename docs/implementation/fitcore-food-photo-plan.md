# Conversational food-photo implementation plan

Goal: turn one consented food image into a useful ingredient estimate, revise through the existing Jarvis text/voice composer, and explicitly save or correct one Nutrition meal. The user's 2026-11-23 conversational workflow is the specification. Execute inline, autonomously, with synthetic data.

## Design decisions

Use Groq `qwen/qwen3.8-27b`, currently documented for vision and JSON mode (https://console.groq.com/docs/vision). It is a preview model; instruct mode (`reasoning_effort="none"`) bounds generation without spending the output budget on thinking. Unavailable models fail safely, without provider fallback. Use the configured caller Groq key only. Never activate billing. One resized JPEG stripped of metadata, max 1280 pixels on either side / 2 MiB; no remote image URLs, image storage, fitness context or WHOOP context. Upload requires per-photo consent. Existing disabled legacy Gemini photo form remains disabled; Nutrition's Photo Log opens this Jarvis workflow.

The draft holds immutable initial observations, current ingredients with stable IDs, quantities, nutrition, visible/inferred/user evidence, correction history, meal type, and number of servings eaten from the photographed recipe. User nutrition/quantity corrections override guesses. Totals are calculated locally with shared meal math. Simple portions/removal/servings/labels/library additions are deterministic; a bounded text-only Groq request can propose structured add/replace/preparation patches for other wording. Patches apply only to referenced ingredients and cannot rewrite untouched values. No image reanalysis on correction. Original observations and corrections remain inspectable in the review draft.

Alternatives: reanalyzing images on every turn wastes requests and can overwrite corrections; a rigid manual ingredient form fails the requested conversational behavior. Retain a small optional item editor for precise label values and correction fallback, alongside the normal composer.

## Tasks and interfaces

- [x] Finish and publish the validated voice prerequisite as a draft PR; branch photos from it.
- [x] Add `meal-photo-draft.ts`: strict estimate/patch schemas, `createPhotoMealDraft`, pure `applyPhotoMealPatch`, deterministic `parsePhotoMealCorrection`, shared-rounded totals. Tests: acceptance example, units, labels, servings, additions/removals/replacements/preparation, ambiguous matches, invalid values and atomic multi-correction rollback, original preservation, repeated revisions.
- [x] Add `food-photo.server.ts`: consented bounded image estimate and text-only patch proposal; validate all inputs and outputs, one request, bounded response body/time, abort/rate-limit support, no content diagnostics/fallback. Tests: key/consent/size/signature/remote URL rejection, malformed replies, exact payload isolation, failure/timeout/cancellation.
- [x] Add `meal-photo-transaction.ts`: explicit `savePhotoMealDraft` through existing `runTool(logMeal/updateMeal)`, draft ID dedupe, unchanged-target comparison for existing meals, shared nutrition sums and existing audit/undo. Retain draft after rejected write, no partial saves. Tests: duplicate/retry/stale correction/undo/backup, selector parity.
- [x] Add Jarvis photo picker and ingredient review component; integrate composer and voice, cancel/clear/background cleanup, loading/error/retry and saved-meal edit. Nutrition entry opens the same interface. Tests: full synthetic mobile acceptance, repeated correction, explicit confirm, failed save retry, saved correction one ID, provider errors/camera cancellation/background and active-workout timer preservation; inspect layout in Chromium and iPhone WebKit.
- [ ] Update privacy, usage metadata and durable progress; complete targeted lint/TS, full units and production build, affected mobile integration; independent focused review and draft PR. Physical camera/iPhone and actual model accuracy remain explicitly unverified until approved device/provider testing.

## Review focus

Ambiguous ingredient names must not target arbitrary rows. Multi-part corrections apply all-or-none. Servings divide a whole-photo recipe and retain a separately explicit amount eaten. Provider patches must preserve user values outside requested fields. Stale/failed saves retain review content, never create duplicates. Background/clear interrupts AI work and late responses cannot revive discarded drafts.

No new database or persisted fitness schema: normalized items and estimates use existing MealEntry and provenance; correction details can be retained in bounded existing notes. Photo work has not been merged or deployed. Voice and daily prerequisites were merged under explicit user authorization. No secrets changes.
