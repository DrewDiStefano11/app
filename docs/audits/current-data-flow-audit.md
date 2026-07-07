# FitCore Current Data-Flow Audit

## Executive Summary

This audit traces the lifecycle of user-entered and app-generated data within the FitCore application. It identifies how data is persisted, loaded, processed, displayed, and exposed to AI components. The goal is to highlight persistence strategies, map data flow across key features, and pinpoint potential risks related to data loss, inconsistencies, or improper exposure of mock/demo data. The audit reveals that data is primarily managed via a centralized React Context (`StoreContext` in `src/lib/store.tsx`) backed by `localStorage`, with mechanisms for importing/exporting state.

## Persistence Map

- **Layer:** LocalStorage (browser-based persistence).
- **Key:** The primary state is saved under a single key, typically managed by `localStorage.setItem(FITCORE_STORAGE_KEY, JSON.stringify(state))` (see `src/lib/fitcore-data.ts` and `src/lib/persist.ts`).
- **Architecture:** Centralized. All state changes pass through a central `set` updater function in `src/lib/store.tsx`, which triggers `saveFitCoreData(next)`. This ensures that UI, summaries, history, and AI contexts reflect the same data.
- **Demo Mode:** There is a specific toggle (`demoMode` in `AppState`) that switches the active "view" state to a merged copy containing generated demo data, without overwriting the actual user data stored in localStorage.
- **Legacy keys:** Migration logic exists to look for legacy keys (`LEGACY_KEYS`) to prevent data loss across updates.

## Data-Flow Map by Feature

### 1. Workout Data

- **Sources:** Manual logging via active workout UI, template imports.
- **Storage:** `workouts` array and `activeWorkout` object in `AppState`.
- **Fields:** Workouts contain metadata (id, name, startedAt, endedAt, notes, provenance) and a list of `exercises`. Each exercise has `sets` (weight, reps, completed status, modifiers/tags).
- **Flow:**
  - Logged in `src/components/app/active-workout.tsx`.
  - Saved to central state via `set` context updater.
  - Processed into flattened `FitCoreLog` entities in `allLogs(s)`.
  - Summarized and queried via helper functions (e.g., `getWorkoutHistory`, `getExerciseHistory`, `getProgressSeries`).
  - Displayed in "Training" and "Progress" views.
  - Volume calculations are used to derive progress graphs and are sent to the AI via `buildAICoachContext`.

### 2. Nutrition Data

- **Sources:** Manual entry, Jarvis (AI/Camera) meal estimation.
- **Storage:** `mealEntries` array in `AppState`. Also uses `nutritionTargets`.
- **Fields:** Meal type, calories, protein, carbs, fat, notes, provenance (tracking AI vs. manual entry, confidence levels).
- **Flow:**
  - Logged manually or via AI.
  - Saved to central state.
  - Aggregated daily via `getDailyMacroSummary` and `getNutritionSummary` (which groups meals and compares against targets).
  - Displayed in "Nutrition" view and home dashboard.
  - Sent to AI context (`buildAICoachContext` includes daily calorie and macro totals vs. targets).
  - **Note:** Unconfirmed AI/camera nutrition is intentionally excluded or handled differently by the daily decision engine to avoid skewing macros.

### 3. Body Weight / Weigh-In Data

- **Sources:** Manual entry, potentially AI parsing.
- **Storage:** `bodyweightEntries` array in `AppState`.
- **Fields:** Date, weightLb, notes.
- **Flow:**
  - Saved to state.
  - Fetched via `getLatestMetrics` and mapped into `getProgressSeries`.
  - Displayed in "Home", "Progress" graphs.
  - Used in AI context (`Latest bodyweight`).
  - Source of truth is consistent across cards and graphs due to central helpers.

### 4. Check-In Data & Recovery Signals

- **Sources:** Manual daily check-ins, unstructured notes parsing (e.g., extracting "pain" or "soreness" from workout notes via `extractRecoverySignalsFromNotes`).
- **Storage:** `recoveryCheckIns` array and `recoverySignals` array in `AppState`.
- **Fields:** Energy, soreness, stress, motivation (for check-ins); kind, severity, body area (for signals).
- **Flow:**
  - Check-ins modify scores. Workout notes auto-generate signals.
  - Aggregated in `getRecoverySummary`, calculating a `readiness` score.
  - Displayed in "Recovery" view and popups (e.g., `readiness-popup.tsx`).
  - Used in AI context (`Readiness` score and latest signals are passed).

### 5. Progress/Graph Data

- **Sources:** `getProgressSeries(s)` aggregates data from `workouts`, `bodyweightEntries`, `mealEntries`, and `recoveryCheckIns`.
- **Usage:** Used by dashboard cards and graph components in `progress.tsx` and popups.
- **Consistency:** Graphs and cards share the same source of truth because they rely on the same derived functions (`get*Summary` helpers) built from the central `StoreContext`.

### 6. AI Assistant Data (Jarvis)

- **Input Data:**
  - `buildAICoachContext(s)` aggregates: current goal, experience level, latest bodyweight, today's nutrition totals/targets, readiness score/signals, recent workout history, and a list of recently saved activity.
  - This context is injected into AI prompts.
- **AI Outputs:**
  - Parsed and saved as actual logs (meals, workouts) or audit entries (`jarvisAudit`).
  - Provenance tags ensure AI-generated data is tracked (`jarvisSettings`, confidence levels).
- **Risks:** Centralizing so much user data in prompts creates privacy implications. However, data is sent to explicit APIs (Gemini/Groq) based on user-provided keys.

## Mock/Demo Data Findings

- **Location:** `src/lib/demo-data.ts` builds sample workouts, meals, bodyweights, and check-ins.
- **Activation:** The `demoMode` flag in `AppState`.
- **Separation:** In `src/lib/store.tsx`, `view` is derived: `useMemo(() => state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state, [state])`.
- **Risk Mitigation:** The `state` variable holds the true user data and is saved to `localStorage`. Demo mode appears intended to separate demo display data from persisted user data through the derived `view`.
- **Risks:** Current usage may be inconsistent because some views may still use `state` directly from `useStore()` instead of `view`. This means demo-mode behavior may be inconsistent across Training, Nutrition, Progress, and Recovery. The risk is not only that demo data could accidentally be written into real state during active demo mode, but also that demo mode may not display consistently because some screens may bypass the demo overlay. Future cleanup should verify every `useStore()` consumer and clearly define when components should use `state`, `view`, or mutation helpers before treating demo mode as fully isolated.

## Data Loss / Inconsistency Risks

1.  **LocalStorage Limits:** Browsers enforce quota limits on localStorage (typically 5MB). If the user accumulates massive amounts of workout history, progress photos (if stored as base64), or AI audit logs, `localStorage.setItem` will throw an error, causing silent save failures and subsequent data loss. (See `try/catch` in `src/lib/persist.ts`).
2.  **State Migrations:** If the data model schema changes (e.g., adding a new field to `MealEntry`) and `migrateAppState` or `migrateFitCoreDataIfNeeded` does not handle default values properly, the app might crash or drop fields upon loading older JSON exports.
3.  **Audit/Provenance Sync:** The `projectedProvenance` function merges audit data with log data at runtime. If an entity is deleted, it appears the `deleteLog` function cleans up related entries across collections, but orphaned AI audit entries might remain and clutter state.
4.  **UI State vs Persistent State:** There's a `usePersist` hook (`src/lib/persist.ts`) that manages UI-level state (like selected tabs) via `localStorage` directly, outside of the main `AppState`. This splits the source of truth for certain minor preferences.

## Highest-Risk Data Issues

1.  **Storage Quota:** All historical data is kept in a single JSON blob in `localStorage`. Long-term use will inevitably hit quota limits, leading to silent data loss on `save`.
2.  **Demo Mode Writes & Inconsistent Display:** Accidental real-state mutations while `demoMode` is active could inadvertently bake demo structures into the real state. Additionally, inconsistent demo display due to mixed `state` vs `view` usage poses a risk. There is a need for a clear convention for display data vs persisted data vs mutation helpers.
3.  **Base64 Photos:** If `progressPhotos` or AI camera snapshot strings are stored directly in `localStorage` state, the 5MB limit will be reached extremely quickly.

## Recommended Cleanup Order (Post-Product Bible)

1.  **Storage Layer Upgrade:** Migrate from `localStorage` to `IndexedDB` (e.g., via `idb` or a similar wrapper) to support much larger data sets (history, photos).
2.  **Demo Mode Safety:** Add strict dev-only warnings or lock write-access when `demoMode` is true to prevent state pollution.
3.  **Audit Log Pruning:** Implement a cleanup routine for old/irrelevant `jarvisAudit` and AI messages to save space.

## What Can Be Fixed Now

- _None required currently for this task, as no code bugs are glaring enough to warrant a hotfix without a refactor._

## Validation Performed

- Inspected `src/lib/store.tsx` to verify the single-source-of-truth context provider.
- Analyzed `src/lib/fitcore-data.ts` to confirm data summarization and querying logic.
- Checked `src/lib/demo-data.ts` to confirm how mock data is constructed.
- Audited `src/lib/ai.functions.ts` to verify how data is formatted for AI context.
