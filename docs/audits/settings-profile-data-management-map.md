# 1. Executive summary

- **Current Settings architecture:** The Settings surface is implemented as an overlay component (`SettingsView` in `src/components/app/views/settings.tsx`) rendered conditionally over the main dashboard, controlled by `settingsOpen` state in `src/routes/index.tsx`. It relies on the global context `useStore()` from `src/lib/store.tsx` to read and write app state.
- **Major existing Settings capabilities:** Editing basic user profile (weight, training days), deep Jarvis AI configuration (model, proactive level, permissions), simple data export/import (JSON), and complete application data reset.
- **Current maturity of profile and preference management:** Profile data is functional, stored locally, and heavily consumed by domain views. Preferences like theme and units exist in the `Personalization` data schema but are only partially exposed via UI controls. Jarvis AI settings are highly detailed and currently active.
- **Current maturity of data management:** Primitive. Implemented purely as manual JSON blob download/upload via `exportJson` and `importJson`. Reset is functional and returns the user to onboarding. No automatic backups or snapshotting.
- **Major feature-preservation risks:** Future settings refactoring must preserve exact `profile` schema values as they drive training analytics. Unit conversion dependencies are heavily reliant on `formatWeight` and related logic.
- **Major integration risks with the future Data Safety architecture:** The current persistence layer (`saveFitCoreData` in `src/lib/store.tsx`) writes synchronously to `localStorage` on state changes. Migrating to asynchronous storage will break existing Settings components that assume synchronous state updates.
- **Most important findings for future redesign and implementation:** The Settings UI heavily leverages a `FutureRows` pattern to present placeholders for upcoming features (marked "Planned"). These presentation-only controls must be preserved or handled appropriately until the future Data Safety phase is active.

- **Distinctions:**
  - **Currently implemented runtime behavior:** Profile editing, Jarvis preference toggles, basic export/import, global reset.
  - **Presentation-only controls & placeholders:** Sections labeled "Integrations & Devices", "Privacy & Security" advanced locks, Coach/Pro modes.
  - **Incomplete flows:** Import is destructive without preview.
  - **Future architecture described elsewhere:** Data Safety Phase (e.g., granular conflict resolution, async storage).
  - **Inferred risks:** Changing units might not migrate historical logged workout data if unit state is purely presentational.

# 2. Settings route and navigation structure

- **Settings route:** Conditionally rendered top-level overlay. Not a dedicated TanStack route.
- **Route files:** `src/routes/index.tsx`, `src/components/app/views/settings.tsx`.
- **Opening entry points:** `onOpenSettings` callback triggered by the top-bar header in `HomeView` and by the `BottomNav` menu (when no active workout is running).
- **Home entry point:** Settings icon button in `PageHeader` of `HomeView`.
- **Global navigation entry point:** `BottomNav` triggers it.
- **Jarvis-related entry points:** Accessed via Jarvis settings button or nested `SettingsCard`.
- **Onboarding-related entry points:** Exiting settings after reset routes back to `Onboarding` component.
- **Subsections / tabs:** 4 subtabs managed by local state: "profile", "preferences", "data", "integrations".
- **Nested views:** None, currently a single-page scrolling view per tab.
- **Sheets:** None used in Settings currently.
- **Dialogs:** `ConfirmDialog` used for "Reset all data".
- **Return paths:** `onBack` prop triggers `setSettingsOpen(false)` in `src/routes/index.tsx`.
- **Close behavior:** Overlay unmounts.
- **Mobile navigation behavior evident from code:** Bottom padding (`pb-28`) to avoid bottom nav overlay occlusion, but bottom nav itself is hidden while Settings is open.

**Route/View States:**

- **Label:** "Profile" / **ID:** `profile` / **Component:** `SettingsView` (tab) / **File:** `src/components/app/views/settings.tsx` / **Return:** `onBack` closes settings. / **Tests:** `tests/e2e/settings-hub-safety-smoke.spec.ts`.
- **Label:** "Preferences" / **ID:** `preferences` / **Component:** `SettingsView` (tab).
- **Label:** "Data" / **ID:** `data` / **Component:** `SettingsView` (tab).
- **Label:** "Integrations" / **ID:** `integrations` / **Component:** `SettingsView` (tab).

- **Inconsistent Entry Points:** `GoalsProfileCard` and `SettingsCard` inside Jarvis also manage similar fields but are distinct components from the main `SettingsView` HubCards.

# 3. Complete Settings feature inventory

| Feature                 | User Purpose        | Source Files                             | Visible Location | Control Type | Dependency                         | Save Behavior                   | Validation               | Persistence  | Tests                                          | Completeness | Known Risk                        |
| ----------------------- | ------------------- | ---------------------------------------- | ---------------- | ------------ | ---------------------------------- | ------------------------------- | ------------------------ | ------------ | ---------------------------------------------- | ------------ | --------------------------------- |
| **Bodyweight**          | Target tracking     | `settings.tsx`, `goals-profile-card.tsx` | Profile Tab      | Input        | `state.profile.bodyweightLb`       | `onBlur` via `useEffect` buffer | Local buffer             | LocalStorage | `settings-hub-safety-smoke.spec.ts`            | Complete     | String parsing fallback           |
| **Days Per Week**       | Training frequency  | `settings.tsx`                           | Profile Tab      | Input        | `state.profile.daysPerWeek`        | Buffered `onChange`             | Local buffer             | LocalStorage | N/A                                            | Complete     | N/A                               |
| **Goals**               | Goal setting        | `goals-profile-card.tsx`                 | Jarvis Profile   | Select       | `state.userGoalsProfile.goal`      | Immediate                       | None                     | LocalStorage | N/A                                            | Complete     | Extended goal vs basic goal clash |
| **Export Data**         | Backup              | `settings.tsx`                           | Data Tab         | Button       | Full AppState                      | Download file                   | N/A                      | Local file   | N/A                                            | Complete     | Unencrypted                       |
| **Import Data**         | Restore             | `settings.tsx`                           | Data Tab         | Hidden Input | `importJson`                       | Merged and stored               | `validateFitCorePayload` | LocalStorage | N/A                                            | Complete     | Destructive overwrite             |
| **Reset Data**          | Clear app           | `settings.tsx`                           | Data Tab         | Button       | `reset()`                          | Overwrite with default          | `ConfirmDialog`          | LocalStorage | `settings-hub-safety-smoke.spec.ts`            | Complete     | Accidental wipe                   |
| **Jarvis Model**        | AI routing          | `settings-card.tsx`                      | Preferences Tab  | Select       | `state.jarvisSettings.geminiModel` | Immediate                       | None                     | LocalStorage | N/A                                            | Complete     | N/A                               |
| **Jarvis Confirmation** | Control AI behavior | `settings-card.tsx`                      | Preferences Tab  | Toggle       | `askBeforeWorkouts`, etc           | Immediate                       | None                     | LocalStorage | `settings-data-safety-lifecycle-smoke.spec.ts` | Complete     | N/A                               |

_(Note: Theme, Notification schedules, and explicit unit selectors are largely missing from the runtime Settings UI, existing only as `Planned` placeholders or pure state schemas in `src/lib/types.ts`)_

# 4. Profile field and profile-lifecycle map

**Current Supported Profile Fields (from `src/lib/types.ts` Profile & UserGoalsProfile):**

- **Goal:** `goal` (string). Required. Used in Analytics.
- **Experience:** `experience` (string). Required.
- **Bodyweight:** `bodyweightLb` (number), `targetBodyweightLb` (number). Required. Used in calculations/charts.
- **Units:** `units` (lb/kg). Required. Used by `formatWeight`.
- **Sleep/Step/Cardio Goals:** `sleepGoalH`, `stepGoal`, `cardioGoalMin`. Used by HomeView placeholders.
- **Macros:** `nutritionTargets` (calories, protein, carbs, fat). Stored separately but part of health profile.

**Extended UserGoalsProfile Fields:**

- **Calorie/Macro Goals:** `calorieGoal`, `proteinGoal`, `carbGoal`, `fatGoal`
- **Diet Style / Strictness:** `dietStyle`, `macroStrictness`
- **Common Meals:** `usualBreakfast`, `usualLunch`, `usualDinner`, etc. Consumed by Jarvis context.

**Profile Lifecycle Map:**

1. **Onboarding Creation:** Initial default state or onboarded data written to `localStorage`.
2. **Settings Display:** Read from `useStore().state.profile`. Buffered in `SettingsView` (e.g. `bwBuf`).
3. **Profile Editing:** Buffered input synced to local component state.
4. **Validation:** Minimal type conversion (`Number()`) before applying.
5. **Save:** `onBlur` or explicit `set` fires `saveFitCoreData`.
6. **Downstream UI update:** Synchronous React state propagation via Context Provider.
7. **Reload behavior:** `useEffect` hydration in `StoreProvider` loads on mount.
8. **Reset behavior:** Overwritten by `defaultState` during `reset()`.

# 5. Units and measurement preferences

- **Pounds vs Kilograms:** State stored as `units` in `Profile` and `Personalization`. Converted via `lbToKg`, `kgToLb` in `src/lib/types.ts`. Read by `formatWeight`.
- **Distance:** `mi` vs `km` stored in `Personalization.units.distance`. Evaluated via `miToKm`, `distanceUnit`.
- **Current Behavior:** Conversion is purely runtime display calculation (`formatWeight` uses `weightUnit`). Stored data relies on base units (lbs).
- **Missing/Unsupported:** There is no dedicated UI toggle control for unit swapping visible in the active main settings surface.
- **Risks:**
  - If unit preferences are changed, historical raw logs might be misinterpreted if the codebase ever moves away from standardizing base units.
  - Charts and comparisons must apply `formatWeight` consistently to avoid mixed-unit displays.

# 6. Appearance, motion, and accessibility preferences

- **Theme:** `themeAccent` ("auto", "purple", "blue", "green", "red") is defined in `Personalization`.
- **UI Complexity:** `uiComplexity` ("simple", "advanced") defined in `Personalization`.
- **Missing Behavior:** There are no active controls in `SettingsView` allowing user modification of these presentation states. They are hard-coded to defaults or manipulated via URL/DevTools.
- **Reduced Motion:** No explicit control in state, honors OS `prefers-reduced-motion` natively where CSS allows.

# 7. Notification and reminder inventory

- **Defined in schema (`Personalization.reminders`):**
  - Workout reminders (`workoutEnabled`, `workoutTime`)
  - Weigh-in reminders (`weighInEnabled`, `weighInTime`)
  - Meal reminders (`mealLogEnabled`, `mealLogTime`)
- **Jarvis Reminders (`JarvisSettings`):**
  - `supplementReminders`, `dailyReviewEnabled`, `weeklyReviewEnabled`
- **Runtime implementation:** Currently entirely missing or presentational placeholders. No browser push API integration or service worker scheduling is present in code.
- **Completeness:** Controls exist for Jarvis review toggles in `SettingsCard`, but the reminder execution logic is absent.

# 8. Jarvis permission and confirmation map

- **Source File:** `src/components/app/jarvis/settings-card.tsx`, `src/lib/types.ts`.
- **Permission dependency:** `permission` level (1, 2, 3, 4).
- **AI Provider / Routing:** `aiProvider` (groq, gemini), model routing options.
- **Destructive/Confirmation Settings:**
  - `askBeforeMealEstimates`: Confirms AI nutrition logging.
  - `askBeforeWorkouts`: Confirms AI workout saving.
  - `askBeforeActiveWorkoutEdits`: Protects live session data.
  - `autoApplyActiveWorkoutSuggestions`: Toggles direct patch vs proposal.
- **Undo behavior:** `JarvisUndoSnackbar` (in `jarvis-panel.tsx`) allows rolling back AI actions globally.
- **Tests:** `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts`.

# 9. Privacy and sensitive-data controls

- **Profile privacy:** "Data stays on this device. No accounts, no tracking." copy in Settings "About / Support".
- **Export disclosure:** "Current app data stays on this device unless you export it."
- **Data deletion:** Reset is clearly labeled as "Destructive action" with secondary confirmation overlay.
- **Missing/Risks:**
  - Progress photos lack explicit warnings about local device storage persistence.
  - Cloud sync language is absent (honest).
  - Medical history / sensitive categories (mentioned in `FutureRows` placeholders) have no active enforcement logic in Settings yet.

# 10. Current persistence and storage surface map

- **Store Initialization:** `loadFitCoreData` reads `FITCORE_STORAGE_KEY` via `localStorage` synchronously on mount.
- **Persistence:** `saveFitCoreData` serializes `AppState` via `JSON.stringify` synchronously.
- **Save triggers:** React `useEffect` inside `StoreProvider` (in `src/lib/store.tsx`) writes whenever `state` changes.
- **Migration behavior:** `migrateFitCoreDataIfNeeded` merges partials with defaults.
- **Unavailable-storage handling:** `try-catch` blocks gracefully fail if `localStorage` throws (e.g. quota limits or blocked access).
- **Settings Exposure:** Settings read/write directly via `useStore().set()`.

## Current main behavior versus future Data Safety integration

- **Current main:** Synchronous, full-blob `localStorage` saves. Simple overwrite logic.
- **Future integration dependencies:** The future Data Safety phase will introduce atomic persistence, revision handling, and asynchronous cloud sync. Settings UI must _not_ attempt to implement loading spinners for save operations until that architecture is merged, as current saves are synchronous. Placeholders for "Reduced-history mode" rely on this future backend.

# 11. Export inventory

- **Entry point:** "Export" button in `SettingsView`.
- **Exported format:** Plain JSON file.
- **Included data:** Entire `AppState`.
- **File name:** `fitcore-backup-YYYY-MM-DD.json`.
- **Download behavior:** Generates in-memory Blob, creates temporary object URL, and simulates anchor click.

# 12. Import inventory

- **Entry point:** "Import" ghost button wrapping `<input type="file">` in `SettingsView`.
- **Accepted type:** `application/json`.
- **File inspection:** Validates via `parseFitCoreImport` -> `validateFitCorePayload`.
- **Merge behavior:** Destructive overwrite/merge (`migrateAppState` blends imported fields). No preview.
- **Success/Failure feedback:** Sets temporary `importMsg` ("Imported successfully" or "Invalid backup file").
- **Rollback:** None. If import succeeds, old state is lost unless user manually exported first.

# 13. Backup, restore, and recovery inventory

- **Manual backup:** Covered by Export.
- **Automatic backup:** Absent.
- **Restore preview:** Absent.
- **Recovery after corruption:** Hydration uses `fallback` (`defaultState`) if JSON parse fails in `loadFitCoreData`.
- **Missing Data Safety dependencies:** Versioning snapshots, rollback history, and recovery messaging are all pending future Data Safety implementation.

# 14. Validation, warning, and error-feedback inventory

- **Save failure:** Handled silently in `persist.ts` and `fitcore-data.ts` via empty catch blocks.
- **Invalid import:** "Invalid backup file" text message appears for 3000ms.
- **Destructive action warning:** `ConfirmDialog` clearly details data loss scope before Reset.
- **Gaps:** Generic save failures do not alert the user. Missing conflict/stale-data warnings entirely.

# 15. Destructive-action map

- **Action:** Reset all data
- **Trigger:** Click "Reset all data" -> `setConfirmReset(true)`.
- **Scope:** Permanently erases workouts, meals, recovery, photos, PRs (entire `AppState`).
- **Confirmation:** Secondary `ConfirmDialog` modal requiring explicit confirmation.
- **Undo/Recoverability:** Completely destructive. Non-recoverable.
- **Import overwrite:** Importing a JSON file permanently replaces conflicting local state.

# 16. Conflict, stale-write, and concurrent-change presentation map

- **Current Implementation:** Pure `localStorage` last-write-wins overwrite. No concurrent tab warning for core app state. UI preferences sync via `usePersistentState` cross-tab events.
- **Absence:** No revision mismatch or stale write presentation.

**Future UI questions depending on merged Data Safety architecture:**

- When to block UI for conflict warnings?
- How to gracefully explain stale data merges from cloud sync?
- How to silently auto-resolve conflicts without disrupting active workouts?

# 17. Settings action and interaction matrix

| Action Label    | Section    | Result / Destination | State Mutation     | Validation               | Close Behavior   | Test Coverage                       |
| --------------- | ---------- | -------------------- | ------------------ | ------------------------ | ---------------- | ----------------------------------- |
| Back/Done       | Top Header | Closes Settings      | None               | N/A                      | Unmounts overlay | `settings-hub-safety-smoke.spec.ts` |
| Reset all data  | Data       | Opens Confirmation   | None               | N/A                      | N/A              | `settings-hub-safety-smoke.spec.ts` |
| Export          | Data       | Downloads file       | None               | N/A                      | N/A              | None                                |
| Import          | Data       | Prompts File Picker  | Overwrites `state` | `validateFitCorePayload` | N/A              | None                                |
| Toggle sections | All        | Expands/Collapses    | Local UI state     | N/A                      | N/A              | `settings-hub-render-smoke.spec.ts` |

# 18. Sheet, dialog, and popup inventory

- **ConfirmDialog:** Used for "Reset all data".
  - **Opening trigger:** "Reset all data" button click.
  - **Component:** `ConfirmDialog` (from `src/components/app/ui.tsx`).
  - **Content:** Title "Reset all data?", Message "This permanently erases workouts..."
  - **Actions:** Cancel, Reset (Destructive).
  - **Dismissal behavior:** Clicking Cancel or confirming action.

# 19. Cross-domain dependency map

- **`state.profile` consumed by:** `HomeView` (calories, goals), `TrainingView` (experience, splits), Analytics engine (various domains).
- **`state.personalization.units` consumed by:** Formatting helpers (`formatWeight`) globally used in Training UI, Charts, and Summaries.
- **`jarvisSettings` consumed by:** `JarvisPanel`, `ai.functions.ts` routing logic.
- **Risk:** Unit alteration without history migration could invalidate past PR charts. Profile field removal could crash Analytics engine.

# 20. Data-state coverage matrix

| State                    | Implemented | Location        | Action              | Safety Implication                   |
| ------------------------ | ----------- | --------------- | ------------------- | ------------------------------------ |
| Ready                    | Yes         | `SettingsView`  | Edit inputs         | N/A                                  |
| Saving                   | No          | N/A             | Synchronous save    | Silent                               |
| Validation error         | Partial     | Import flow     | Shows string        | N/A                                  |
| Destructive confirmation | Yes         | `ConfirmDialog` | Must confirm        | Prevents accidental wipe             |
| Conflict / Stale         | No          | N/A             | Overwrites silently | Data loss risk if multiple tabs open |

# 21. Responsive and accessibility observations

- **Mobile Settings Navigation:** Padding (`pb-28`) prevents occlusion by safe areas.
- **Keyboard Access:** Tab navigation works for primary HubCards and Inputs.
- **Destructive Announcements:** `ConfirmDialog` uses standard ARIA dialog patterns.
- **Hidden inputs:** Import uses a hidden `<input type="file">` triggered via label wrapping, accessible but potentially brittle for screen readers without `aria-label` (currently has `aria-label="Import backup file"`).
- **Confirmed gap:** Missing semantic grouping (`<fieldset>`) for radio/unit selections.

# 22. Current test-coverage map

- **`tests/e2e/settings-hub-safety-smoke.spec.ts`**: Verifies Settings and Hub open/close safely, verifies Reset dialog visibility and cancellation. Prevents fatal errors.
- **`tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts`**: Verifies data safety workflows.
- **`tests/e2e/settings-hub-render-smoke.spec.ts`**: Verifies UI rendering and section toggling.
- **Missing Scenarios:** No specific test for Import/Export blob manipulation. No test for unit conversion validation.

# 23. Preservation checklist for future Settings redesign

- [ ] All existing profile fields remain editable (weight, goals, days per week).
- [ ] Downstream profile usage remains intact for Analytics dependencies.
- [ ] Units remain semantically correct and connected to `formatWeight`.
- [ ] Unit changes do not silently corrupt historical meaning of past logged data.
- [ ] Appearance and reduced motion preferences remain supported.
- [ ] Jarvis permissions remain explicit and integrated with AI routing logic.
- [ ] Destructive actions remain clearly scoped and require secondary confirmation.
- [ ] Privacy-sensitive data receives appropriate warnings.
- [ ] Current persistence behavior is not duplicated (use existing `useStore` hooks).
- [ ] No fake backup or recovery state is shown.
- [ ] Import/export controls remain honest about local file behavior.
- [ ] Validation errors remain actionable.
- [ ] Mobile Settings remains usable with correct bottom safe area padding.
- [ ] Complete regression coverage protects all critical flows (run E2E smoke tests).

# 24. Future Data Safety integration checklist

- **Transaction coordination:** Require UI locks during async save states.
- **Atomic persistence:** Replace synchronous `localStorage.setItem` with batched or IndexedDB commits.
- **Stale-write feedback:** Introduce visual indicator for cloud vs local sync mismatch.
- **Conflict feedback:** Implement conflict resolution modal for divergent merges.
- **Safe import inspection:** Implement preview phase before destructive overwrite.
- **Risk:** Premature implementation of spinners or async delays in Settings will break the current synchronous state flow.

# 25. Safe future task boundaries

- **Safe files for UI rework:** `src/components/app/views/settings.tsx`, `src/components/app/jarvis/settings-card.tsx`.
- **Requires coordination:** `src/lib/types.ts` (modifying Profile schema breaks analytics), `src/lib/store.tsx` (persistence entry point).
- **Do NOT touch:** Core analytics metrics (`src/lib/analytics/`) relying on `AppState.profile`. Persistence flow (`src/lib/fitcore-data.ts`) until Data Safety phase.

# 26. Open questions and uncertainties

- **Unit historical migration:** Does changing the unit toggle simply change the label, or does it recalculate historical PRs? (Evidence points to purely presentational formatting, which risks misinterpreting raw stored lbs if the system ever attempts to store kgs).
- **Notification logic:** Where will web push API keys be stored once reminders are fully implemented? (Depends on Data Safety merge).

# 27. File index

- **Routes / Views:**
  - `src/routes/index.tsx`
  - `src/components/app/views/settings.tsx`
- **Profile / Preferences components:**
  - `src/components/app/jarvis/goals-profile-card.tsx`
  - `src/components/app/jarvis/settings-card.tsx`
- **Overlays:**
  - `src/components/app/ui.tsx` (`ConfirmDialog`)
- **Store / Persistence dependencies:**
  - `src/lib/store.tsx`
  - `src/lib/fitcore-data.ts`
  - `src/lib/persist.ts`
- **Tests:**
  - `tests/e2e/settings-hub-safety-smoke.spec.ts`
  - `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts`
  - `tests/e2e/settings-hub-render-smoke.spec.ts`
