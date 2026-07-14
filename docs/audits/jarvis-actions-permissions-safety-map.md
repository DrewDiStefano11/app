# 1. Executive summary

- **Current Jarvis architecture:** Jarvis functions as an in-app AI control layer communicating via a server function (`aiChat` in `src/lib/ai.functions.ts`). State is held locally within the `JarvisPanel` component. Action handlers are structured as discrete tools returning a `ToolResult`. State mutations use the standard global store (`useStore`) and are appended to `jarvisAudit`.
- **Current user-facing surfaces:** Accessed via a floating button in the bottom navigation, setting cards, and a history/undo view (`JarvisActivityCard`). The interface is predominantly a chat panel sliding up as a bottom sheet.
- **Current action capabilities:** Capabilities are extensive, bounded by `TOOL_SPECS`. They encompass reading state (nutrition, recovery, training), modifying goals/settings, and mutating domain logs (workouts, meals, supplements, check-ins, cardio). Action capabilities match a 1:1 schema mapping with application tools.
- **Current permission model:** Four-tier (1-4) integer permission setting, controlling whether tools can be called automatically, require confirmation, or are restricted entirely to read-only ("Suggest only"). Enforced client-side before tool execution (`shouldAutoRun`).
- **Current confirmation model:** Conditional rendering of `ConfirmCard`. If a tool is mutating and `shouldAutoRun` returns false, it enters a `needsConfirmation` state where the user must manually approve the data patch before the global store is updated.
- **Current undo capability:** Driven by `jarvisAudit` and `undoAuditEntry`. Most discrete mutations (add, edit, delete for meals, workouts, sets) save the previous state (`prev`) and can be selectively reversed up to a time limit (10 minutes for edits, no limit for log undo, up to 200 items).
- **Current safety boundaries:** Destructive actions (like deleting the active workout or app reset) require separate domain confirmation dialogs and are generally shielded from automated AI execution without explicit user confirmation buttons outside the chat flow.
- **Major preservation risks:** The client-side execution model relies on the AI correctly matching schema requirements. Because `jarvisAudit` is an array appended client-side, concurrent execution or rapid tab switching risks desync.
- **Major trust risks:** Fake data generation. Although the prompt strictly forbids it ("Never claim to log something without a tool call"), LLMs may still hallucinate a success response if they fail to invoke the tool correctly.
- **Major missing test coverage:** Very limited E2E testing for the confirmation flows and the 10-minute edit boundary within the chat panel itself.
- **Most important findings for future redesign and runtime integration:** The tools contract is very clean, but it is currently highly coupled to the local `useStore`. Future data safety (atomic persistence) will require `runTool` to return an async transactional commit rather than synchronous state updates.

# 2. Jarvis route and surface map

- **Bottom Navigation Composer**
  - **Label:** Jarvis
  - **Component:** `BottomNav`
  - **Source file:** `src/components/app/bottom-nav.tsx`
  - **Route:** Global (all tabs)
  - **Opening trigger:** Tapping the Sparkles icon or typing in the command bar.
  - **Closing behavior:** Reverts to collapsed nav when focus is lost or panel opens.
  - **Back behavior:** Browser back does not affect it directly; it's a global overlay.
  - **Mobile behavior:** Anchored to safe area bottom.
  - **State retained when closed:** Prompt text is cleared on submit.
  - **Test coverage:** Missing specific component E2E test.

- **Jarvis Panel**
  - **Label:** Jarvis
  - **Component:** `JarvisPanel`
  - **Source file:** `src/components/app/jarvis/jarvis-panel.tsx`
  - **Route:** Global overlay sheet
  - **Opening trigger:** `fitcore:open-jarvis` event (from bottom nav).
  - **Closing behavior:** Dismisses sheet; conversation remains mounted if not unmounted by parent.
  - **Back behavior:** Handled by `BottomSheet` (hardware back dismisses).
  - **Mobile behavior:** Full-screen sheet on mobile.
  - **State retained when closed:** Conversation history (`messages: RenderedMsg[]`) is retained in component state until unmount/reload.
  - **Test coverage:** UI presence verified in some daily tests, but chat-flow specifically is light.

- **Jarvis Settings Card**
  - **Label:** Jarvis / AI Memory
  - **Component:** `JarvisSettingsCard`
  - **Source file:** `src/components/app/jarvis/settings-card.tsx`
  - **Route:** Settings -> Data (`settings.tsx`)
  - **Opening trigger:** Navigating to Settings -> Data tab.
  - **Closing behavior:** Navigating away.
  - **Back behavior:** N/A.
  - **Mobile behavior:** Standard card.
  - **State retained when closed:** Updates global `jarvisSettings` which persists.
  - **Test coverage:** Missing.

- **Jarvis Activity View**
  - **Label:** AI History & Undo
  - **Component:** `JarvisActivityCard`
  - **Source file:** `src/components/app/jarvis/activity-view.tsx`
  - **Route:** Settings -> Data (`settings.tsx`)
  - **Opening trigger:** Rendered inline.
  - **Closing behavior:** Navigating away.
  - **Back behavior:** N/A.
  - **Mobile behavior:** Standard card.
  - **State retained when closed:** Reads `jarvisAudit` from global store.
  - **Test coverage:** Missing.

# 3. Conversation-state inventory

- **Messages:** `RenderedMsg` (`src/components/app/jarvis/jarvis-panel.tsx`)
  - **Lifecycle:** Appended on user send, API response, or tool execution.
  - **Persistence:** None. Cleared on full page reload.
  - **Preservation requirement:** Must not persist sensitive PHI permanently without explicit "AI Memory" opt-in (currently handled by not persisting chat).
- **User messages:** `content` string, `role: "user"`.
- **Assistant messages:** `content` string, `role: "assistant"`.
- **Tool messages:** Held inside `RenderedMsg.toolResults` array.
- **Confirmation messages:** Displayed via `ConfirmCard` when a tool result contains `pending`.
- **Error messages:** Appended as `Warning: ${res.error}` or generic catch blocks.
- **Action receipts:** Derived from `ToolResult.summary` and appended as assistant text.
- **Undo messages:** Displayed via `ConfirmCard` after a successful mutation.
- **Timestamps:** `createdAt` (milliseconds) on every message.
- **Conversation history:** Limit is effectively the React component lifecycle.
- **Daily-session behavior:** Not explicitly bounded by day, only by browser session.
- **Reload behavior:** Clears entirely.
- **Clearing behavior:** Re-mounting the `JarvisPanel` or closing the app.
- **Maximum history:** No strict truncation implemented in UI, though API sends only recent messages.
- **Empty state:** Shows suggested prompt pills ("Give me my daily review", "Log creatine").
- **Loading state:** "Thinking..." indicator and pulsing dot.
- **Error state:** Red "FAILED" badge or warning text.

# 4. Complete Jarvis capability inventory

| Capability                     | Triggering UI/Phrase      | Handler / Tool                      | Source             | Required Data    | Mutation                   | Confirm? | Perm? | Undo? | Success | Failure | Tests            | Status |
| :----------------------------- | :------------------------ | :---------------------------------- | :----------------- | :--------------- | :------------------------- | :------- | :---- | :---- | :------ | :------ | :--------------- | :----- |
| Answer informational questions | User input                | LLM direct response                 | `ai.functions.ts`  | None             | None                       | No       | No    | No    | Text    | Warning | Minimal          | Active |
| Daily review                   | "Give me my daily review" | `getDailyReviewSummary`             | `tools.ts`         | None             | None                       | No       | No    | No    | Text    | Error   | `daily-decision` | Active |
| Start a workout                | "Start workout"           | `logWorkout` / `createWorkoutDraft` | `tools.ts`         | `exercises`      | Add to `workouts`          | Yes\*    | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Resume a workout               | "Resume"                  | `getActiveWorkout`                  | `tools.ts`         | None             | None                       | No       | No    | No    | Text    | Error   | Minimal          | Active |
| Add an exercise                | "Add squats"              | `updateActiveWorkout`               | `tools.ts`         | `patch`          | Mutates active             | Yes\*    | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Log a set                      | "Did 135x10"              | `logExerciseSet`                    | `tools.ts`         | `weight`, `reps` | Mutates active             | No       | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Complete a workout             | "Finish workout"          | `finishActiveWorkout`               | `tools.ts`         | None             | Moves active to `workouts` | Yes      | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Log a meal                     | "Log breakfast"           | `logMeal`                           | `tools.ts`         | `name`, macros   | Add to `mealEntries`       | Yes\*    | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Reuse a meal                   | "Log my usual breakfast"  | `logUsualMeal`                      | `tools.ts`         | `slot`           | Add to `mealEntries`       | Yes\*    | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Log a supplement               | "Log creatine"            | `logSupplement`                     | `tools.ts`         | `name`           | Add to `supplementLogs`    | No       | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Log a check-in                 | "Check in: energy 8"      | `logDailyCheckIn`                   | `tools.ts`         | 4 metrics        | Add to `recoveryCheckIns`  | No       | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Log a weigh-in                 | "Log 180 lbs"             | `logBodyWeight`                     | `tools.ts`         | `weightLb`       | Add to `bodyweightEntries` | No       | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Update profile                 | "Change my goal to cut"   | `updateUserGoalsProfile`            | `tools.ts`         | `patch`          | Mutates `profile`          | Yes      | Yes   | Yes   | Saved   | Error   | Minimal          | Active |
| Undo an action                 | "Undo that"               | `undoLastAction`                    | `tools.ts`         | None             | Reverts last audit         | No       | Yes   | N/A   | Saved   | Error   | Minimal          | Active |
| Confirm an action              | "Save" button             | `runTool(..., {confirmed:true})`    | `jarvis-panel.tsx` | `draftId`        | Executes pending           | N/A      | N/A   | Yes   | Saved   | Error   | Minimal          | Active |
| Report an error                | N/A                       | Catch block                         | `jarvis-panel.tsx` | None             | None                       | N/A      | N/A   | N/A   | N/A     | Text    | N/A              | Active |

_\* Confirmation depends on `askBefore_`settings,`confidence`, and `permission` level.\*

# 5. Tool and action-contract inventory

- **`getNutritionStatus`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Read-only summary of macros.
  - **Input:** None.
  - **Output:** `{ totals, targets }`.
  - **Mutation:** None.
- **`logMeal`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Additive logging.
  - **Input:** `name`, `mealType`, macros.
  - **Validation:** Confidence check.
  - **Affected State:** Appends `mealEntries`.
  - **Output:** Audit ID and summary.
  - **Confirmation:** Required if low/medium confidence or `askBeforeMealEstimates` is true.
  - **Undo:** Supports deleting the added meal via `undoAuditEntry`.
- **`logWorkout`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Additive logging of structured workout.
  - **Input:** `exercises` array matching `workoutExerciseSchema`.
  - **Affected State:** Appends `workouts`.
  - **Confirmation:** Required if `askBeforeWorkouts` is true or low confidence.
  - **Undo:** Deletes the added workout.
- **`logBodyWeight`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Additive measurement logging.
  - **Input:** `weightLb` (number).
  - **Confirmation:** Not required if `autoLogBodyweight` is true.
  - **Undo:** Reverses entry.
- **`undoLastAction`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Destructive (reversal).
  - **Input:** None (finds last valid audit).
  - **Affected State:** Removes or reverts the target entity; marks audit as `undone`.
- **`updateActiveWorkout`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Editing action.
  - **Input:** `patch` object.
  - **Confirmation:** Required if `askBeforeActiveWorkoutEdits` is true.
- **`deleteMeal`** (`src/lib/jarvis/tools.ts`)
  - **Purpose:** Destructive action.
  - **Input:** `id`.
  - **Confirmation:** Always requires explicit LLM intent, but bypasses sheet confirmation if permissions are level 4.
  - **Undo:** Restores the meal from the audit `patch.prev`.

# 6. Domain action matrix

### Home and daily review

- **Action:** Get summary
- **Command:** `getTodaySummary`, `getDailyReviewSummary`
- **Data read:** Macros, workouts, check-ins.
- **Data written:** None.
- **Resulting UI:** LLM text response.

### Training

- **Action:** Log set
- **Command:** `logExerciseSet`
- **Data read:** Active workout state.
- **Data written:** Appends to `sets` in `activeWorkout`.
- **Undo:** Removes the set.
- **Missing symmetry:** Jarvis can `finishActiveWorkout` but cannot natively trigger the "Discard Workout" destructive dialog (requires manual UI click).

### Fuel/Nutrition

- **Action:** Log meal
- **Command:** `logMeal`
- **Data read:** None.
- **Data written:** Appends `MealEntry`.
- **Confirmation:** Dependent on settings.
- **Undo:** Reverses the entry.

### Recovery

- **Action:** Log check-in
- **Command:** `logDailyCheckIn`
- **Data written:** Appends `RecoveryCheckIn`.
- **Undo:** Reverses entry.

### Stats/Progress

- **Action:** Log weight
- **Command:** `logBodyWeight`
- **Data written:** Appends `BodyweightEntry`.

### Settings

- **Action:** Update profile
- **Command:** `updateUserGoalsProfile`
- **Data written:** Mutates `userGoalsProfile`.

# 7. Permission model audit

Defined in `src/lib/types.ts` as `JarvisPermission` (1 to 4).
Stored in `jarvisSettings.permission` (default: 2).

- **L1 (Suggest only):** LLM is instructed not to call mutating tools. Checked client-side in `JarvisPanel`: `tools = settings.permission === 1 ? TOOL_SPECS.filter(t => t.name.startsWith("get")) : TOOL_SPECS`.
- **L2 (Draft & confirm):** Allows mutating tools, but `shouldAutoRun` returns `false`, forcing a `ConfirmCard` review for everything.
- **L3 (Auto-log simple items):** `shouldAutoRun` allows bodyweight and supplements to pass without confirmation if specific toggles (`autoLogBodyweight`) are enabled.
- **L4 (Full app control):** Auto-applies low-risk changes; still confirms active-workout changes if toggles dictate.

**Prompt behavior:** System prompt enforces the behavior description.
**Denial behavior:** Tool fails or falls back to `needsConfirmation: true`.

# 8. Confirmation model audit

Evaluated in `runTool` and `shouldAutoRun` (`src/lib/jarvis/tools.ts`, `src/components/app/jarvis/jarvis-panel.tsx`).

- **No confirmation:** `logBodyWeight` (if `autoLogBodyweight` is true), `logSupplement` (if `autoLogSupplements` is true).
- **Inline confirmation:** `ConfirmCard` rendered in chat. User clicks "Save". Used for `logMeal`, `logWorkout`.
- **Destructive confirmation:** Not natively triggered via chat (deletion tools like `deleteMeal` require L4 permission or manual UI intervention).
- **Post-action acknowledgment:** "Undo" button appears on the receipt.

**Consistency gaps:** Workouts explicitly require a `draftId` mechanism to hold state before committing. Deletions (e.g., `deleteWorkout`) currently bypass `ConfirmCard` if executed at L4, which relies entirely on the Undo buffer for safety.

# 9. Undo and reversibility audit

Implemented via `undoAuditEntry` (`src/lib/jarvis/tools.ts`).

- **Directly reversible:** Meals, workouts, bodyweight, supplements, check-ins, sets.
- **Generated undo state:** A `patch` containing the `prev` state is stored in `jarvisAudit`.
- **Undo control:** "Undo" button on `ConfirmCard` or the `undoLastAction` LLM tool.
- **Time limit:** 10 minutes (`Date.now() - a.createdAt < 10 * 60_000`) for edits.
- **Irreversible:** Clearing Jarvis history itself is irreversible.
- **Failure behavior:** Returns "nothing to undo".
- **Cross-view behavior:** Modifies the global store, instantly reflecting in all views.

# 10. Active-workout Jarvis audit

- **Starting a workout:** `logWorkout` (logs past) or `createWorkoutDraft` (prepares a summary). Does not implicitly start the real-time UI timer.
- **Editing sets:** `updateExerciseSet`. Needs `setId`.
- **Completing a workout:** `finishActiveWorkout`. Moves `activeWorkout` to `workouts`.
- **Risks:**
  - **Duplicate sets:** If the LLM generates a new set instead of updating an existing one.
  - **Stale state:** LLM might reference a `setId` that the user manually deleted in the UI seconds prior.
  - **Missing active workout:** Tools check for `state.activeWorkout`, failing safely if null.

# 11. Daily review and summary audit

- **Entry points:** "Give me my daily review".
- **Handler:** `getDailyReviewSummary` and `getDailyDecision`.
- **Information summarized:** Calories vs targets, protein vs targets, meals logged, supplements, bodyweight, workout status (`src/lib/jarvis/tools.ts`, `src/lib/daily-decision.ts`).
- **Missing-data behavior:** Reports as `null` or 0; does not hallucinate (LLM is prompted to report missing data explicitly).

# 12. Error, retry, and failure-recovery audit

- **Tool failure:** Handler returns `{ ok: false, error: "Reason" }`.
- **Visible message:** Rendered as `Warning: ${error}` by the assistant.
- **Retry path:** User must type a correction.
- **AI Network failure:** Catch block in `JarvisPanel` outputs "Warning: Jarvis failed".
- **Partial success:** Not currently possible; `runTool` mutations are synchronous and atomic to the global store.

# 13. Validation and ambiguity handling

- **Meal without quantity:** LLM estimates based on "normal" portions, but `confidence` flag drops to "medium" or "low", triggering a mandatory `ConfirmCard`.
- **Missing fields:** Zod/JSON schema validation in the LLM call enforces required fields (e.g., `weightLb` for `logBodyWeight`).
- **Risk:** Silent assumptions for generic phrases ("log a sandwich") might save an incorrect calorie count if `autoLogMealEstimates` is true and the LLM wrongly assigns `confidence: high`.

# 14. Safety and health-claim audit

- **System prompt boundary:** `jarvisSystemPrompt` explicitly states: "Never diagnose. Red-flag symptoms -> recommend medical care."
- **Data access:** Can read soreness/fatigue.
- **Risk:** Bounded and appropriate. The LLM is restricted from acting as a doctor, but may still offer overly confident coaching advice if the model ignores the system prompt.
- **Test coverage:** Missing specific adversarial tests for medical claims.

# 15. Privacy and sensitive-data audit

- **Data access:** Reads profile, check-ins, workouts, meals.
- **User visibility:** All read operations happen client-side or are passed in the immediate prompt context.
- **Persistence:** `messages` are NOT persisted to `localStorage`. `jarvisAudit` IS persisted, storing the exact `patch` and `originalText`.
- **Deletion behavior:** "Clear Jarvis activity history" clears `jarvisAudit`.
- **Risk:** `originalText` in `jarvisAudit` could contain sensitive phrases the user typed, which persists in localStorage until manually cleared.

# 16. Action receipt and user-feedback inventory

- **Trigger:** Successful `runTool`.
- **Information displayed:** The `ToolResult.summary` is echoed by the LLM or rendered in the `ConfirmCard`.
- **Verifiability:** `ConfirmCard` shows exact macros/sets saved and includes an Undo button.
- **Failure:** Shows FAILED badge on the card.

# 17. Navigation and context-preservation map

- Jarvis currently does **not** trigger application routing directly (e.g., it cannot force the app to navigate to the Training tab). It overlays the current view.
- Context is preserved because the bottom sheet does not unmount the underlying views.

# 18. Jarvis sheet, dialog, and popup inventory

- **BottomSheet (`JarvisPanel`):** Main chat interface. Uses full height. Scrollable message list. Dismissed by swiping down or clicking outside.
- **ConfirmDialog:** Used manually for destructive actions (e.g., `deleteWorkout`), but not natively mapped to Jarvis chat yet.

# 19. State and data dependency map

- **Dependencies:** Consumes `useStore` (`state`, `set`).
- **Metrics read:** `todaysMealsTotal`, `getLatestMetrics`, `getRecoverySummary`.
- **Missing-data behavior:** Handled gracefully via optional chaining or `?? null`.

# 20. State-coverage matrix

- **Ready:** Implemented (pill buttons).
- **Processing action:** Implemented (Loading pulse).
- **Awaiting confirmation:** Implemented (`ConfirmCard` REVIEW state).
- **Permission denied:** Implemented (Settings check before execution).
- **Action succeeded:** Implemented (SAVED state).
- **Undo available:** Implemented (10 min limit).
- **Stale state:** Not fully protected (risk of editing an already deleted entity).

# 21. Responsive and accessibility observations

- **Mobile behavior:** Bottom sheet anchors correctly.
- **Touch targets:** Action buttons in `ConfirmCard` are appropriately sized.
- **A11y:** Missing live region announcements for when Jarvis replies, requiring screen-reader users to manually navigate the DOM to read the response.

# 22. Current test-coverage map

- **Coverage:** Very light. `daily-decision.spec.ts` covers the analytics payload, but E2E tests for the `JarvisPanel` chat flow, undo sequences, and confirmation clicks are absent.
- **Regression requirement:** Critical mutating tools (`logWorkout`, `logMeal`, `undoLastAction`) must be covered by integration tests before further UI expansion.

# 23. Action-risk classification

- **Read-only:** `getNutritionStatus`, `getDailyReviewSummary` (Low risk).
- **Low-risk additive:** `logBodyWeight`, `logSupplement` (Low risk, easy undo).
- **Significant mutation:** `logWorkout`, `logMeal`, `updateActiveWorkout` (Medium risk, requires `ConfirmCard` based on settings).
- **Destructive:** `deleteWorkout`, `deleteMeal` (High risk, currently relies on `prev` patch for undo, could cause data loss if undo expires).
- **Privacy-sensitive:** Text parsing. (High risk, `originalText` stored in audit).

# 24. Preservation checklist for future Jarvis work

- [ ] `jarvisSystemPrompt` retains the "Never diagnose" medical boundary.
- [ ] `JarvisPermission` 1-4 logic remains strictly enforced before any tool execution.
- [ ] `ConfirmCard` logic is preserved for low-confidence estimates.
- [ ] `jarvisAudit` continues to capture the `prev` state for edits and deletes to enable `undoAuditEntry`.
- [ ] The conversation state (`messages`) remains transient and is NOT persisted to localStorage (protecting PHI in chat).
- [ ] Missing data is reported honestly, not hallucinated as 0 or false data.

# 25. Future Data Safety integration checklist

- **Transaction coordination:** `runTool` currently updates `useStore` synchronously. Future integration must await an atomic database transaction.
- **Stale-write rejection:** Jarvis must verify the `revision` or `updatedAt` of an entity before applying an edit (e.g., `updateActiveWorkout`), preventing it from editing a deleted workout.
- **Action receipts:** Receipts must only render AFTER the database confirms the write, not just when the client-side store updates.
- **Undo across revision changes:** Undo must submit a compensating transaction to the database, rather than just restoring a client-side `prev` object.

# 26. Future voice-boundary checklist

- Voice mode must enforce the exact same confirmation logic (e.g., reading back low-confidence meals before saving).
- Must provide an audible success/failure receipt.
- Must support a spoken "Undo that" command mapping directly to `undoLastAction`.
- Must silently fall back to text output if in a noisy environment or if the query involves sensitive PHI.

# 27. Safe future task boundaries

- **Safe for UI work:** `src/components/app/jarvis/jarvis-panel.tsx`, `confirm-card.tsx` (presentation only).
- **Action hotspots:** `src/lib/jarvis/tools.ts` (Requires extreme care, as it controls all data mutation).
- **Data Safety hotspots:** Any modification to `useStore` calls within `runTool` will likely conflict with upcoming persistence changes.

# 28. Open questions and uncertainties

- **Concurrency:** What happens if the user presses "Save" on two different `ConfirmCard` instances simultaneously? (Currently, React state batching handles it, but future async transactions might interleave improperly).
- **Audit cleanup:** Is 200 items sufficient for `jarvisAudit` before memory/storage limits in `localStorage` become an issue? (Cannot be determined without stress testing browser storage).

# 29. File index

- `src/components/app/jarvis/jarvis-panel.tsx` (Chat interface)
- `src/components/app/jarvis/confirm-card.tsx` (Confirmation UI)
- `src/components/app/jarvis/settings-card.tsx` (Settings)
- `src/components/app/jarvis/activity-view.tsx` (History)
- `src/lib/jarvis/tools.ts` (Action contracts and handlers)
- `src/lib/types.ts` (Permissions, state shapes)
- `src/lib/ai.functions.ts` (Server function)
- `src/lib/daily-decision.ts` (Review logic)
