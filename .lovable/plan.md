
# Jarvis AI Assistant — Phased Build Plan

This is a very large spec (7 phases, dozens of tools, voice mode, WHOOP/Apple Health, trend engine). I will NOT try to build it all in one turn — that would produce a shallow, broken result. Instead I'll ship it in working slices, starting with the foundation, and check in between phases.

## What I'll do first (this turn = Phase 1 only)

Phase 1 — **Jarvis Foundation**. Everything else builds on this.

### 1. Rename + UI shell
- Rename the existing floating AI to **Jarvis** everywhere (button, headers, copy).
- Keep the existing floating button position; add listening / thinking / speaking visual states (stubbed until voice ships in Phase 6).
- Add a confidence + source badge component (`high/med/low`, `manual / jarvis / whoop / apple-health / barcode / imported`).
- Add a global **undo snackbar** triggered by any Jarvis action.
- Add a **Jarvis Activity** screen under Settings showing logged / suggested / edited / skipped items.

### 2. Structured tool layer (no free-form state mutation)
Create `src/lib/jarvis/` with:
- `tools.ts` — Zod schemas + handler registry for the core tools needed in Phase 1:
  `getTodaySummary`, `getNutritionStatus`, `getTrainingStatus`, `getRecoveryStatus`, `getProgressTrends`, `getUserGoalsProfile`, `updateUserGoalsProfile`, `getJarvisSettings`, `updateJarvisSettings`, `logBodyWeight`, `logSupplement`, `logDailyCheckIn`, `createUndoRecord`, `undoLastAction`, `saveJarvisLearning`.
  (Food / workout / WHOOP / reminder tools come in later phases — stubs only for now.)
- `funnel.ts` — every tool routes writes through the existing logging funnel so Home / Nutrition / Training / Recovery / Progress all update.
- `audit.ts` — every action writes `{ id, tool, input, prevValue, newValue, source, confidence, originalText, timestamp, confirmed, undone }` to `state.jarvisAudit` (cap 200).
- `learning.ts` — key/value store for corrections (`usualBreakfast`, `ricePortionMultiplier`, dismissed suggestions, etc.).

### 3. Server route
- `src/routes/api/jarvis.ts` — streaming chat endpoint using AI SDK + Lovable Gateway (`google/gemini-3-flash-preview`) with the Phase 1 tools wired via `tool()` + `stopWhen: stepCountIs(50)`.
- Reads `LOVABLE_API_KEY` server-side; I'll provision it if missing.
- Client uses `useChat` with `DefaultChatTransport` pointed at `/api/jarvis`.

### 4. Goals / Profile system (Phase 1 subset)
Add `userProfile` to AppState + a new **Goals & Profile** settings card with the fields most needed for early suggestions:
goal (bulk/cut/maintain/recomp/strength/hypertrophy/general), targetBodyweight, currentBodyweight, calorieGoal, proteinGoal, carbGoal, fatGoal, weeklyWeightChange, normalWorkoutDays, normalWorkoutTime, weakPoints, injuryAreas, supplementRoutine, normalWeighInTime, usualMeals (breakfast/lunch/dinner/shake/pre/post). Remaining fields scaffolded but optional.

### 5. Jarvis AI Settings card
Dedicated card in Settings:
- Enabled toggle
- Permission level (1 Suggest only → 4 Full control) — Phase 1 enforces levels 1–2 only; 3–4 marked "available next phase"
- Response style (concise / normal / detailed)
- Personality (friendly-direct / coach / siri-style / chatgpt-style)
- Proactive suggestions (off/low/normal/high) — stub for Phase 5
- Auto-log toggles (supplements, bodyweight, meals, workouts) — only supplements + bodyweight respected in Phase 1
- Confirmation toggles for food / workout / active-workout edits
- Memory/correction learning on/off + Clear learned preferences
- Clear Jarvis history
- WHOOP / Apple Health toggles (stubs for Phase 4)
- Daily/weekly review toggles + time pickers (stubs for Phase 5)
- Voice mode toggles (stubs for Phase 6, disabled with "coming soon")

### 6. Confirmation card component
`<JarvisConfirmCard>` rendered inline in the Jarvis chat for any tool call where `needsConfirmation` is true. Buttons: **Save / Edit / Cancel**. Auto-save tier for clear bodyweight + named supplements per spec.

### 7. Safety
- No tool can delete, change goals, create recurring reminders, or edit an active workout without explicit confirm — enforced in tool handlers, not in the prompt.
- Every write returns an `undoId`; undo snackbar wires to `undoLastAction`.

## Files

**New**
- `src/lib/jarvis/tools.ts`
- `src/lib/jarvis/funnel.ts`
- `src/lib/jarvis/audit.ts`
- `src/lib/jarvis/learning.ts`
- `src/lib/jarvis/types.ts`
- `src/lib/ai-gateway.server.ts` (gateway provider helper)
- `src/routes/api/jarvis.ts` (streaming chat route w/ tools)
- `src/components/app/jarvis/jarvis-panel.tsx` (renamed floating-ai)
- `src/components/app/jarvis/confirm-card.tsx`
- `src/components/app/jarvis/source-badge.tsx`
- `src/components/app/jarvis/undo-snackbar.tsx`
- `src/components/app/jarvis/activity-view.tsx`
- `src/components/app/jarvis/settings-card.tsx`
- `src/components/app/settings/goals-profile-card.tsx`

**Edited**
- `src/lib/types.ts` — `UserProfile`, `JarvisSettings`, `JarvisAuditEntry`, `JarvisLearning`, source/confidence on existing log types
- `src/lib/store.tsx` — new slices + migration
- `src/components/app/views/settings.tsx` — mount Jarvis Settings + Goals & Profile + Activity link
- `src/components/app/views/home.tsx` — replace existing floating AI mount with Jarvis
- `src/routes/index.tsx` — mount undo snackbar globally
- `src/lib/ai.functions.ts` — keep but mark deprecated; new flow uses streaming route

**Removed/replaced**
- `src/components/app/floating-ai.tsx` → replaced by `jarvis-panel.tsx` (old file deleted)

## Phases 2–7 (NOT this turn)

After Phase 1 lands and you've tried it, I'll do these one at a time and check in between each:
- **Phase 2**: food macro estimation, usual meals, mixed-source meals, supplements, missed-habit detection, daily check-in flow, daily review.
- **Phase 3**: workout NL logging, draft/confirm, active-workout suggestions, smart progression, pain/soreness-adjusted workouts, health metrics panel.
- **Phase 4**: WHOOP + Apple Health connectors, workout-window matching, conflict handling, pending sync.
- **Phase 5**: full trend engine, proactive suggestions, weekly review, reminder suggestions, dismissed-suggestion memory.
- **Phase 6**: voice mode — push-to-talk, STT via `openai/gpt-4o-mini-transcribe`, TTS via `openai/gpt-4o-mini-tts`, voice confirmation parser, voice settings.
- **Phase 7**: progress photos, body measurements, comparisons.

## Out of scope (forever, unless you ask)
- Native iOS/Siri integration (PWA only).
- Always-on wake word.
- Medical diagnosis — safety rules in tool handlers will only ever return seriousness categories + "seek help" prompts.

## Approve to proceed
Reply **"go"** and I'll build Phase 1 in the next turn. If you want me to start somewhere else (e.g. voice first, or WHOOP first), say which phase and I'll re-plan.
