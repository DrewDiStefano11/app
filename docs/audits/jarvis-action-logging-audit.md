# Jarvis Action Logging, Confirmations, and Reversibility Audit

## Executive Summary
This audit reviews the current state of the FitCore Jarvis assistant's action logging, confirmation flows, reversibility (undo), and safety boundaries. The architecture centralizes tool execution and mutations through `src/lib/jarvis/tools.ts`, which successfully pushes detailed metadata to the `jarvisAudit` state array. Confirmation mechanisms exist via the `ConfirmCard` component to intercept high-risk or low-confidence tool calls before they persist. An `undoAuditEntry` function provides a partial, though robust, rollback mechanism. However, demo mode boundary enforcement and explicit UI safety disclaimers for health/medical inputs require future strengthening.

## Scope
This is a docs-only audit examining Jarvis action logging, confirmation flows, undo capabilities, provenance tracking, and safety constraints. It does not implement any runtime changes.

## Files Inspected
- `src/components/app/jarvis/jarvis-panel.tsx`
- `src/components/app/jarvis/confirm-card.tsx`
- `src/components/app/jarvis/activity-view.tsx`
- `src/lib/jarvis/tools.ts`
- `src/lib/ai.functions.ts`
- `src/lib/store.tsx`
- `src/lib/types.ts`
- `docs/audits/ai-provenance-confidence-audit.md`

## Current Jarvis Capability Inventory
| Capability | Current State | Notes |
| :--- | :--- | :--- |
| Read-only answering | Current | Handled via Chat APIs (Groq/Gemini). |
| Logging data | Current | `logMeal`, `logBodyWeight`, `logSupplement`, `logCardio`, `logWorkout`. |
| Editing data | Current | `updateMeal`, `updateDailyCheckIn`. |
| Deleting data | Current | `deleteMeal`. |
| Workout actions | Current | `createWorkoutDraft`, `updateActiveWorkout`, `finishActiveWorkout`, `suggestWorkoutProgression`, `suggestExerciseSubstitution`, `logWorkoutNote`, `logWorkoutPainOrSoreness`. |
| Nutrition actions | Current | `logMeal`, `logUsualMeal`, `saveUsualMeal`, `updateMeal`, `deleteMeal`. |
| Recovery/check-in | Current | `logDailyCheckIn`, `updateDailyCheckIn`, `logWorkoutPainOrSoreness`. |
| Settings/privacy | Current | `updateJarvisSettings`, `updateUserGoalsProfile`. |

## Tool/Action Architecture Map
1. **Entry Point:** Users input text or voice (Future) in `jarvis-panel.tsx`.
2. **AI Provider Routing:** Input is sent to `ai.functions.ts` (Groq, Gemini, Legacy) which returns standard JSON tool calls.
3. **Execution Intercept:** In `jarvis-panel.tsx`, tool calls are parsed. If a tool mutates state (`isMutatingTool`), permissions (`settings.permission >= 2`) and confidence are evaluated.
4. **Tool Execution:** `runTool()` in `tools.ts` processes the request.
   - If confidence is low or confirmation is required, it returns `needsConfirmation: true`.
   - If confirmed, the tool handler executes, updating state via `set` and pushing an audit log via `pushAudit()`.
5. **State Mutation:** All updates route through `useStore().set` in `store.tsx`, ensuring `fitcore-data.ts` migration and local storage persistence rules apply.

## Confirmation Behavior Table
| Action Type | Requires Confirmation | Auto-execution | Conflict Resolution |
| :--- | :--- | :--- | :--- |
| Low Confidence (Meals, Workouts) | Yes | No | Handled by `needsConfirmation` flag in `runTool`. |
| High Confidence (Permissions < 2) | Yes | No | Forced review via `isMutatingTool` check. |
| High Confidence (Permissions >= 2) | No (Settings Dependant) | Yes | Auto-executes if `shouldAutoRun` allows. |
| Pending Action Storage | UI Component Level | N/A | `jarvis-panel.tsx` stores `pending` arguments inside the message's `toolResults` array. |
| Multiple Pending Conflicts | Open Question | N/A | Unclear if confirming old pending actions might conflict with newer state changes. |

## Action Logging Readiness Table
| Logging Aspect | Status | Implementation Details |
| :--- | :--- | :--- |
| Actions Recorded | Current | Yes, via `pushAudit` updating `jarvisAudit` array in state. |
| Metadata Stored | Current | Includes `id`, `tool`, `summary`, `status`, `originalText`, `assumptions`, `confidence`, `entityIds`, `entityKind`, `patch`, `createdAt`. |
| Source | Current | Tracked, often utilizing `createJarvisProvenance`. |
| Confirmation Status | Current | Implicitly tracked (unconfirmed actions never reach `pushAudit`). |
| Undo Status | Current | `undone` boolean on `JarvisAuditEntry`, status updates to `undone`. |
| User Review | Current | Available via `JarvisActivityCard` in `activity-view.tsx`. |
| Persists Reloads | Current | Yes, `jarvisAudit` is part of standard `fitcore.v1` local storage state. |

## Undo/Reversibility Table
| Action Type | Reversible | Mechanism | Reliability |
| :--- | :--- | :--- | :--- |
| Standard Log (Meal, Workout) | Yes | `undoAuditEntry` filters state array by `entityIds`. | High |
| Delete Action (Meal) | Yes | Re-inserts `patch.prev` object into array. | High |
| Edit Action (Meal, Checkin) | Yes | Maps over array and restores `patch.prev`. | High |
| Complex/Compound Updates | Partial | Dependent on accurate `patch.prev` capture during the initial tool run. | Medium |
| Settings/Profile Edit | Yes | Restores `patch.prev`. | High |

## Provenance/Explainability Table
| Feature | Status | Notes |
| :--- | :--- | :--- |
| Explain Source Data | Current | `assumptions` array and `confidence` stored in audits and UI cards. |
| "Why do you know this?" | Planned/Future | Not systematically surfaced in UI beyond standard tool summaries. |
| Dashboard Metric Flow | Current | Low confidence limits Engine usage (per Product Bible). |
| AI vs User Logs | Current | Differentiated via DataProvenance `source`. |

## Safety Boundary Table
| Category | Safeguard | Notes |
| :--- | :--- | :--- |
| Medical/Injury | Current | AI models instructed not to diagnose. Recovery relies on 'soreness'. |
| Safe Certainty | Current | `runTool` overrides auto-save for `logMeal`, `logWorkout`, `logCardio` if `asConfidence` is not high. |
| Deletion | Current | Actions tracked via Audit, reversible. |
| Disclaimers | Known Gap | No explicit UI warning when logging pain/soreness that AI is not a doctor. |

## Demo Mode and Data-Pollution Risks
- **Current Architecture**: `store.tsx` differentiates between `state` (real user data) and `view` (demo data overlay).
- **Risk**: Tool mutations triggered while `demoMode: true` may write demo-polluted context into the actual `state` if AI models hallucinate based on the `view` data when formulating tool arguments.
- **Mitigation**: Action confirmation provides a human-in-the-loop buffer, but explicit prevention of writes during demo mode might be necessary.

## Known Gaps
1. **Demo Mode Writes**: Unclear isolation preventing AI from logging demo data into persistent state.
2. **Pending Action Staleness**: A pending confirmation in a chat message might act on outdated state if confirmed much later.
3. **Medical Disclaimers**: Missing explicit UI disclaimers for health/injury logs.
4. **Deep Undo Conflicts**: Undoing a deletion after subsequent entities depend on it is unhandled (though unlikely in this domain).

## Recommended Future Implementation Sequence
1.  **Demo Write Lock (Engine)**: Implement a strict block in `runTool` or `jarvis-panel.tsx` preventing state mutations when `demoMode` is active.
2.  **Explicit Explainability (UI)**: Add a "Why?" button on AI logs mapping to `audit.assumptions` and `originalText`.
3.  **Medical Disclaimer (UI)**: Add static or conditional warnings in the Jarvis chat when health/recovery topics are detected.
4.  **Stale Confirmation Check (Logic)**: Validate entity existence before applying pending edits/deletes.

## Stop Conditions for Future Agents
- Do not implement complex undo algorithms (e.g., event sourcing or deep diff merging) without explicit user approval.
- Do not bypass confirmation for low-confidence data.
- Do not modify `jarvisAudit` structure without ensuring backward compatibility in `fitcore-data.ts`.
- Do not add auto-execution to sensitive health/medical actions.

## Validation Performed
- Inspected Tool execution flow (`tools.ts`, `jarvis-panel.tsx`).
- Reviewed Audit logging (`activity-view.tsx`, `store.tsx`).
- Verified Confirmation UX (`confirm-card.tsx`).
