# FitCore Data Logging Integrity Audit

**Date:** 2025-05-15
**Status:** Completed
**Auditor:** Jules (AI Assistant)

## 1. Executive Summary

FitCore employs a local-first, authoritative state model centered around a single `AppState` object persisted to `localStorage`. The data layer is generally robust, with clear separation between "real" data and "demo" data. However, there are inconsistencies in type definitions, potential for "wasted" data in notes that aren't fully leveraged, and risks associated with shallow merging during schema migrations. Jarvis (AI) logging is well-protected against duplication via an audit-key mechanism, but the undo logic and "suggested" state for AI logs are currently limited.

## 2. Data Flow Map

1.  **Input Layer:** Manual UI forms or Jarvis AI Tools.
2.  **Processing Layer:** `StoreContext.set` (in `store.tsx`) calls `migrateFitCoreDataIfNeeded` (in `fitcore-data.ts`).
3.  **Normalization Layer:** `migrateFitCoreDataIfNeeded` extracts `recoverySignals` from notes and ensures array integrity.
4.  **Persistence Layer:** `useEffect` in `StoreProvider` writes the raw `state` to `localStorage` (`fitcore.v1`) on every change.
5.  **View Layer:** `useMemo` in `StoreProvider` generates a `view` object (merging `demo-data` if `demoMode` is active) for UI consumption.

## 3. Log Type Analysis

| Log Type             | Storage Location (`AppState`) | Source(s)                            | Verification / Integrity                               |
| :------------------- | :---------------------------- | :----------------------------------- | :----------------------------------------------------- |
| **Workout Logs**     | `workouts[]`                  | Active Workout (Finish), Jarvis      | Validated in `saveLog` / `finishActiveWorkout`.        |
| **Active Workout**   | `activeWorkout`               | Training UI, Jarvis                  | Persisted between sessions; volatile until "Finished". |
| **Meal Logs**        | `mealEntries[]`               | Nutrition UI, Jarvis, Barcode/Camera | Includes `items`, `macros`, and `source` metadata.     |
| **Weigh-ins**        | `bodyweightEntries[]`         | Recovery UI, Jarvis                  | Time-series data; used for trend calculations.         |
| **Check-ins**        | `recoveryCheckIns[]`          | Recovery UI, Jarvis                  | Subjective scores (1-10) for energy, soreness, etc.    |
| **Sleep Logs**       | `sleepEntries[]`              | Recovery UI, Jarvis                  | Tracked in hours and quality (1-5).                    |
| **Supplement Logs**  | `supplementLogs[]`            | Hub/Recovery UI, Jarvis              | Simple logs for adherence tracking.                    |
| **Cardio Logs**      | `cardioEntries[]`             | Training UI, Jarvis                  | Separate from strength workouts.                       |
| **Recovery Signals** | `recoverySignals[]`           | Extracted from notes                 | Auto-generated from pain/soreness keywords in notes.   |
| **AI Audit Trail**   | `jarvisAudit[]`               | Jarvis Tools                         | Enables "Undo" and tracks AI confidence/original text. |

## 4. Data Consumption (Display/Analytics)

- **Dashboard:** Aggregates totals from `mealEntries`, `workouts`, and `recoveryCheckIns` via `analytics.ts`.
- **Graphs:** `analytics-extra.ts` transforms state arrays into time-series data for Recharts.
- **FitCore Score:** Derived from consistency and adherence across all log types.
- **AI Context:** `buildAICoachContext` (in `fitcore-data.ts`) feeds the last 5-8 logs into Jarvis for personalized advice.

## 5. Identified Risks

### High Priority

- **Migration Data Loss (High):** The `migrate` function in `store.tsx` uses shallow spreads for most top-level state keys. If a new top-level key is added to `defaultState` but not explicitly added to the `migrate` function, it may be lost or remain empty for returning users.
- **Version Mismatch Churn (High):** `defaultState.version` (2) is behind `FITCORE_DATA_VERSION` (3). This causes the `migrateFitCoreDataIfNeeded` function to run and potentially rewrite state on every application load for all users.
- **Incomplete AppState Type (High):** `recoverySignals` are being written to and read from state in `fitcore-data.ts`, but the field is missing from the `AppState` interface in `types.ts`, leading to unsafe type casting (`as StateWithSignals`).

### Medium Priority

- **Nested Merge Fragility (Medium):** While `personalization` and `profile` have deep-merge logic in `migrate`, other objects like `nutritionTargets` and `jarvisSettings` rely on simpler merges that might overwrite user customizations if new sub-fields are added.
- **Duplicate Cardio Logs (Medium):** `logCardio` tool in `jarvis/tools.ts` has a 1-minute fuzzy match for duplication, which might be too narrow for users logging multiple similar bouts of cardio.
- **"Suggested" vs "Logged" AI State (Medium):** Many Jarvis tools log data immediately with `status: "logged"`. If AI confidence is "low", data should stay in a "suggested" state to avoid polluting the authoritative history.

### Low Priority

- **Wasted Note Data (Low):** While recovery signals are extracted, other high-value data in notes (e.g., equipment used, specific meal ingredients) are not currently parsed or structured.
- **Audit Trail Limit (Low):** `jarvisAudit` is capped at 200 entries. High-frequency AI users might lose undo history relatively quickly.

## 6. Recommended Follow-up Fixes

1.  **[High] Type Safety:** Move `RecoverySignal` interface to `types.ts` and add `recoverySignals` to `AppState`. (Addressed in this PR).
2.  **[High] Version Sync:** Sync `defaultState.version` to `3`. (Addressed in this PR).
3.  **[High] Migration Audit:** Update `migrate` in `store.tsx` to be more defensive against new top-level keys.
4.  **[Medium] AI Confidence Gate:** Modify `runTool` to require explicit user confirmation for any action with "low" confidence before it hits the authoritative state.
5.  **[Medium] Export/Import Validation:** Add a schema validator to `importJson` to prevent corrupted JSON from breaking the local-first store.

## 7. Files Reviewed

- `src/lib/store.tsx`
- `src/lib/types.ts`
- `src/lib/fitcore-data.ts`
- `src/lib/jarvis/tools.ts`
- `src/lib/analytics.ts`
- `src/lib/analytics-extra.ts`
- `src/lib/demo-data.ts`
- `src/lib/persist.ts`
