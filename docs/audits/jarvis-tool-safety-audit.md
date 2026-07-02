# FitCore Jarvis AI Tool Safety Audit

**Date:** March 2024
**Auditor:** Jules (AI Software Engineer)
**Status:** Completed

---

## 1. Executive Summary

This audit evaluated the safety, traceability, and data integrity of the FitCore Jarvis AI control layer. The investigation covered the tool calling pipeline, permission enforcement, confirmation UI, and undo mechanisms.

The core architecture is fundamentally sound, utilizing a centralized `runTool` and `pushAudit` pattern that ensures traceability. Permission levels (L1-L4) are strictly enforced in the UI layer before tool execution. However, a minor bug was identified and fixed regarding precise state restoration for deleted active workout sets.

Overall, Jarvis provides a high degree of transparency through audit logs and confidence indicators, protecting user data from silent or accidental mutation.

---

## 2. Jarvis Permission Model Summary

FitCore implements a 4-level permission model that governs AI autonomy:

| Level  | Name            | Behavior                                                                                                     |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------ |
| **L1** | Suggest Only    | AI is restricted to `get*` tools. No mutations allowed.                                                      |
| **L2** | Draft & Confirm | Default level. All mutations create a `pending` draft in the UI for user review.                             |
| **L3** | Auto-Log Simple | Auto-saves low-risk items (Bodyweight, Supplements) if confidence is high. Vague items still ask.            |
| **L4** | Full Control    | Expanded auto-apply for workouts/meals with high confidence. Destructive actions still require confirmation. |

**Enforcement:** Handled in `jarvis-panel.tsx` via `isMutatingTool` and `shouldAutoRun` checks.

---

## 3. Tool Safety Map

| Risk Category       | Protection Mechanism                                            | Effectiveness |
| ------------------- | --------------------------------------------------------------- | ------------- |
| **Silent Mutation** | `isMutatingTool` filter + `pending` state in UI.                | High          |
| **Data Loss**       | Multi-entity `undoAuditEntry` + `patch` preservation.           | High          |
| **Duplication**     | `actionKey` generation and `hasAuditKey` pre-check.             | High          |
| **Misdiagnosis**    | System prompt instructions ("Never diagnose").                  | High          |
| **Key Exposure**    | Server-side execution + storage in `localStorage` (never logs). | High          |

---

## 4. Mutating vs Non-Mutating Tool List

### Non-Mutating (Safe)

- `getTodaySummary`, `getNutritionStatus`, `getTrainingStatus`, `getRecoveryStatus`, `getProgressTrends`
- `getUserGoalsProfile`, `getJarvisSettings`, `getJarvisLearnedPreferences`
- `getMealHistory`, `getUsualMeals`, `getSupplementStatus`, `getMissedHabits`, `getDailyReviewSummary`
- `getWorkoutHistory`, `getLastWorkoutByType`, `getLastExercisePerformance`, `getActiveWorkout`, `getWorkoutTemplates`
- `suggestNutritionAction`, `suggestActiveWorkoutChange`, `suggestWorkoutProgression`, `suggestExerciseSubstitution`

### Mutating (Protected)

- **Logging:** `logBodyWeight`, `logSupplement`, `logDailyCheckIn`, `logMeal`, `logUsualMeal`, `logWorkout`, `logCardio`, `logExerciseSet`
- **Editing:** `updateUserGoalsProfile`, `updateJarvisSettings`, `updateMeal`, `updateWorkout`, `updateActiveWorkout`, `updateExerciseSet`, `updateDailyCheckIn`
- **Deletion:** `deleteMeal`, `deleteWorkout`, `deleteExerciseSet`
- **Misc:** `saveJarvisLearning`, `saveUsualMeal`, `createWorkoutDraft`, `finishActiveWorkout`, `saveWorkoutTemplate`, `logWorkoutNote`, `logWorkoutPainOrSoreness`

---

## 5. Confirmation/Auto-Log Behavior Review

- **L1 Integrity:** Verified that L1 (Suggest Only) effectively filters the toolset to `get*` tools only (`jarvis-panel.tsx:210`).
- **Confirmation Flow:** Mutating tools correctly transition to a `needsConfirmation` state unless `shouldAutoRun` returns true.
- **High Confidence Requirement:** `shouldAutoRun` ensures that meals and workouts only auto-log if the AI reports `high` confidence.
- **User Preference:** Settings like `askBeforeMealEstimates` and `askBeforeWorkouts` are respected even at higher permission levels.

---

## 6. Undo Behavior Review

- **Traceability:** Every mutation pushes an entry to `jarvisAudit`.
- **Atomic Undo:** `undoAuditEntry` handles 15+ different entity kinds, using stored `prev` state or `entityIds` to revert changes.
- **Fixed Bug:** Identified that `deleteExerciseSet` undo hardcoded the restoration to the first exercise. This was fixed by preserving `exerciseId` in the audit patch.
- **Isolation:** Undo logic uses specific IDs, preventing accidental erasure of unrelated manual logs.

---

## 7. Active Workout Safety Review

- **Locking:** Active workout edits via `updateActiveWorkout` or `logExerciseSet` are protected by the same confirmation layer.
- **Safety Suggestions:** `suggestExerciseSubstitution` and `suggestActiveWorkoutChange` are non-mutating, returning suggestions for the user to act on.
- **Pain Signals:** Workout notes containing "pain" or "sore" trigger a recovery activity entry for visibility in the recovery section.

---

## 8. Data Overwrite/Duplication Risks

- **Duplicate Prevention:** `hasAuditKey` in `tools.ts` uses an `actionKey` (hashed tool + arguments + date) to prevent re-logging the same prompt within 10 minutes.
- **Workout Duplication:** `maybeDuplicateWorkout` checks for existing workouts on the same day with similar names/exercise counts.
- **Manual Overwrite:** Jarvis tools generally use `patch` (merging) rather than full overwrite, preserving manual data.

---

## 9. API Key / Provider / Fallback Safety Review

- **Key Handling:** API keys are never stored in the application state or logs. They are handled by `ai.functions.ts` via server-side environment variables or provided in headers for local-only keys.
- **Fallback Logic:** `callGroqChat` implements a robust retry/fallback chain across models (Qwen, Llama) and providers (Groq -> Gemini) to ensure reliability without data corruption.
- **Transparency:** AI diagnostics are recorded in `localStorage` for debugging but omit sensitive key data.

---

## 10. Priority Findings

### High Priority

- **Fixed:** Active workout set deletion undo was imprecise (restored to wrong exercise).

### Medium Priority

- **Ambiguity Handling:** AI might occasionally log a "Usual Meal" with high confidence even if the saved macros are missing (though it includes an assumption note).
- **Audit Limit:** The audit log is capped at 200 entries. While sufficient for undoing recent actions, long-term auditability is limited.

### Low Priority

- **humanizeArgs Coverage:** Some internal tools like `logWorkoutPainOrSoreness` could have better human-readable summaries in the confirm card.

---

## 11. Recommended Follow-up Tasks

1. **Improve Confidence Calibration:** Refine system prompts to strictly define "high confidence" for meal portions.
2. **Global Undo Snackbar:** Re-enable the `JarvisUndoSnackbar` (currently a no-op) to make undo more accessible outside the Jarvis panel.
3. **Audit Persistence:** Consider expanding audit log capacity or archiving for power users.

---

## 12. Files Reviewed

- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/confirm-card.tsx`
- `src/components/app/jarvis/activity-view.tsx`
- `src/components/app/jarvis/settings-card.tsx`
- `src/lib/jarvis/tools.ts`
- `src/lib/ai.functions.ts`
- `src/lib/store.tsx`
- `src/lib/types.ts`
