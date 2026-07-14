# 1. Executive summary

- **Current Settings architecture:** Confirmed current runtime behavior: The Settings surface is implemented as an overlay component (`SettingsView` in `src/components/app/views/settings.tsx`) conditionally rendered over the main dashboard, controlled by `settingsOpen` state in `src/routes/index.tsx`. It relies on the global context `useStore()` from `src/lib/store.tsx` to read and write app state synchronously to local storage.
- **Major existing Settings capabilities:** Confirmed current runtime behavior: Editing basic user profile (weight, training days), Jarvis AI configuration (model, proactive level, permissions), simple data export/import (JSON), and complete application data reset.
- **Current maturity of profile and preference management:** Confirmed current runtime behavior: Profile data is stored locally and consumed by domain views. Confirmed incomplete: Preferences like theme and units exist in the `Personalization` schema (`src/lib/types.ts`) but lack exposed UI controls in the main Settings surface. Jarvis AI settings are highly detailed and active.
- **Current maturity of data management:** Confirmed current runtime behavior: Implemented as manual JSON blob download/upload via `exportJson` and `importJson`. Reset is functional and returns the user to onboarding. Future integration question: Automatic backups or background synchronization are not present on current main.
- **Major feature-preservation risks:** Probable risk: Future settings refactoring must preserve exact `profile` schema values as they drive training analytics. Unit conversion dependencies are heavily reliant on `formatWeight` and related logic.
- **Major integration risks with the future Data Safety architecture:** Future integration question: The current persistence layer (`saveFitCoreData` in `src/lib/store.tsx`) writes synchronously to `localStorage` on state changes. Asynchronous storage and atomic persistence require coordination with the Data Safety branch after merge.
- **Most important findings for future redesign and implementation:** Presentation-only: The Settings UI heavily leverages a `FutureRows` pattern to present placeholders for upcoming features (marked "Planned"). These presentation-only controls must be preserved or handled appropriately until the future Data Safety phase is active.

# 2. Method and evidence boundaries

This audit is restricted to inspecting the current main branch at baseline `3e4326782d761313c4f2644ecfe55503770b360a`. No active unmerged Codex branches, parked PRs, or future implementations were treated as current behavior. All assertions are sourced directly from the active file codebase. Future Data Safety integrations (like cloud sync, asynchronous storage, automatic backups, encryption, account systems, conflict resolution, revision handling, remote persistence, and background synchronization) are strictly categorized as future dependencies not present on current main.

# 3. Settings route and navigation map

- **Settings route:** Confirmed current runtime behavior: Settings is a conditionally rendered overlay view, not a dedicated route (`src/routes/index.tsx`).
- **Opening entry points:** Confirmed current runtime behavior: `onOpenSettings` callback triggered by the top-bar header in `HomeView` and by the `BottomNav` menu.
- **Home entry point:** Confirmed current runtime behavior: Settings icon button in `PageHeader` of `HomeView`.
- **Global navigation entry point:** Confirmed current runtime behavior: `BottomNav` menu (when no active workout is running).
- **Jarvis-related entry points:** Confirmed current runtime behavior: Accessed via Jarvis settings button or nested `SettingsCard`.
- **Onboarding-related entry points:** Confirmed current runtime behavior: Exiting settings after reset routes back to `Onboarding` component.
- **Subsections / tabs:** Confirmed current runtime behavior: Exact visible Settings tabs and labels: "Profile" (`profile`), "Preferences" (`preferences`), "Data" (`data`), and "Integrations" (`integrations`).
- **Nested views:** Confirmed current runtime behavior: None, currently a single-page scrolling view per tab.
- **Sheets:** Confirmed current runtime behavior: None used in Settings currently.
- **Dialogs:** Confirmed current runtime behavior: `ConfirmDialog` used for "Reset all data".
- **Return paths:** Confirmed current runtime behavior: `onBack` prop triggers `setSettingsOpen(false)` in `src/routes/index.tsx`.
- **Close behavior:** Confirmed current runtime behavior: Overlay unmounts.
- **Mobile navigation behavior evident from code:** Confirmed current runtime behavior: Bottom padding (`pb-28`) avoids bottom nav overlay occlusion, though bottom nav itself is hidden while Settings is open.

# 4. Exact Settings feature inventory

| Feature                 | Category                           | Source Files             | Visible Location | Control Type | Dependency                         | Save Trigger                   | Validation               | Tests                                          |
| ----------------------- | ---------------------------------- | ------------------------ | ---------------- | ------------ | ---------------------------------- | ------------------------------ | ------------------------ | ---------------------------------------------- |
| **Bodyweight**          | Confirmed current runtime behavior | `settings.tsx`           | Profile Tab      | Input        | `state.profile.bodyweightLb`       | on blur via `useEffect` buffer | Local buffer parsing     | `settings-hub-safety-smoke.spec.ts`            |
| **Days Per Week**       | Confirmed current runtime behavior | `settings.tsx`           | Profile Tab      | Input        | `state.profile.daysPerWeek`        | on blur / buffered             | Local buffer parsing     | N/A                                            |
| **Goals**               | Confirmed current runtime behavior | `goals-profile-card.tsx` | Jarvis Profile   | Select       | `state.userGoalsProfile.goal`      | immediate                      | None                     | N/A                                            |
| **Export Data**         | Confirmed current runtime behavior | `settings.tsx`           | Data Tab         | Button       | Full AppState                      | download file                  | N/A                      | N/A                                            |
| **Import Data**         | Confirmed current runtime behavior | `settings.tsx`           | Data Tab         | Hidden Input | `importJson`                       | immediate file read            | `validateFitCorePayload` | N/A                                            |
| **Reset Data**          | Confirmed current runtime behavior | `settings.tsx`           | Data Tab         | Button       | `reset()`                          | explicit save (confirm)        | `ConfirmDialog`          | `settings-hub-safety-smoke.spec.ts`            |
| **Jarvis Model**        | Confirmed current runtime behavior | `settings-card.tsx`      | Preferences Tab  | Select       | `state.jarvisSettings.geminiModel` | immediate                      | None                     | N/A                                            |
| **Jarvis Confirmation** | Confirmed current runtime behavior | `settings-card.tsx`      | Preferences Tab  | Toggle       | `askBeforeWorkouts`                | immediate                      | None                     | `settings-data-safety-lifecycle-smoke.spec.ts` |
| **Theme / Display**     | Schema-only                        | `types.ts`               | N/A              | None         | `state.personalization`            | unsupported                    | N/A                      | N/A                                            |
| **Advanced Data Locks** | Presentation-only                  | `settings.tsx`           | Data Tab         | FutureRows   | None                               | unsupported                    | N/A                      | N/A                                            |

# 5. Profile-field lifecycle

- **Exact profile fields currently editable in the main Settings surface (`src/components/app/views/settings.tsx`):**
  - Bodyweight (`bodyweightLb`)
  - Days Per Week (`daysPerWeek`)
- **Fields that exist only in types or other components but are not editable in main Settings:**
  - Goals, usual meals, injury areas, supplements (editable in `GoalsProfileCard` in Jarvis panel).
  - Sleep goal, step goal, macro targets, target bodyweight (schema-only in `Profile`, partially exposed elsewhere).
- **Exact profile-state and personalization-state ownership:** Owned globally by `useStore().state.profile` and `useStore().state.personalization` in `src/lib/store.tsx`. Main settings UI buffers specific fields (like `bwBuf`) and updates the global store on blur.
- **Lifecycle:** Data originates from defaults or onboarding, is read by `SettingsView`, edited via buffered local component state, validated lightly (e.g. `Number()`), and saved to local storage synchronously on blur.

# 6. Units and measurements

- **Which unit fields exist:** `units` (weight: "lb" | "kg") in `Profile` and `Personalization`. `distance` ("mi" | "km") in `Personalization.units`.
- **Which controls are exposed:** Confirmed incomplete: There are no unit toggle controls exposed in the main Settings UI.
- **Which conversions are active:** Confirmed current runtime behavior: `formatWeight`, `lbToKg`, `kgToLb` are active throughout the app (e.g., charts, views).
- **Which controls are absent:** Confirmed incomplete: UI selectors for weight units, distance units, or energy units (calories/kJ) are absent from Settings.
- **Risks:** Probable risk: Unit changes might affect historical data display if conversions apply dynamically instead of migrating underlying stored records.

# 7. Appearance, motion, and accessibility preferences

- **Theme, accent, complexity, motion preferences:** Schema-only. `themeAccent`, `uiComplexity`, `showAdvancedStats` exist in `Personalization` (`src/lib/types.ts`) but have no functional UI controls in Settings. Motion relies on OS-level `prefers-reduced-motion` CSS where implemented, not user state.
- **Accessibility preferences:** Confirmed incomplete: No explicit accessibility preference toggles exist in Settings.

# 8. Notifications and reminders

- **Functional vs Presentation-only:** Schema-only: `workoutEnabled`, `weighInEnabled`, `mealLogEnabled` exist in `Personalization.reminders`. Presentation-only: Jarvis review toggles (`dailyReviewEnabled`) are visually rendered but have no background synchronization or native push notification scheduling.
- **Notification settings:** Confirmed incomplete: There are no active web push or service worker notification systems present on current main.

# 9. Jarvis settings and permissions

- **Jarvis settings and permission controls:** Confirmed current runtime behavior: Controlled within `src/components/app/jarvis/settings-card.tsx`.
- **Includes:** AI Provider, auto-logging behavior, `askBeforeWorkouts` confirmations, and UI length (`responseStyle`).
- **Undo behavior:** Confirmed current runtime behavior: Belongs to `JarvisUndoSnackbar` and `JarvisPanel`, not main Settings.

# 10. Privacy and sensitive-data controls

- **Privacy surfaces:** Presentation-only: `FutureRows` in `SettingsView` list "Local-only sensitive data" and "Reduced-history mode". These are visual placeholders.
- **Confirmed current runtime behavior:** "Data stays on this device." is explicit static copy.
- **Future integration question:** Encryption or remote persistence controls are not present on current main.

# 11. Current persistence surface

- **Current Implementation:** Confirmed current runtime behavior: `saveFitCoreData` in `src/lib/fitcore-data.ts` uses synchronous `localStorage.setItem` for the entire `AppState`.
- **Storage read and write error handling:** Confirmed current runtime behavior: `try-catch` blocks silently swallow write failures (`catch { return false; }`). Hydration (`loadFitCoreData`) falls back to `defaultState` if parsing fails.
- **Corrupted or invalid saved-state handling:** Confirmed current runtime behavior: If JSON parse fails or validation returns null, the app falls back to defaults.
- **Future integration question:** Asynchronous storage, atomic persistence, and background synchronization require coordination with the Data Safety branch after merge.

# 12. Export lifecycle

- **Exact export function:** Confirmed current runtime behavior: `exportJson` from `useStore`.
- **Included state:** Full `AppState` object.
- **File type:** `application/json` (Blob).
- **File naming:** `fitcore-backup-YYYY-MM-DD.json`.
- **User feedback:** Browser native download prompt.

# 13. Import lifecycle

- **Parser:** Confirmed current runtime behavior: `parseFitCoreImport` in `src/lib/fitcore-data.ts`.
- **Validation:** Confirmed current runtime behavior: Uses `validateFitCorePayload` to ensure basic schema conformity.
- **Migration:** Confirmed current runtime behavior: `migrateAppState` merges the incoming parsed object with the current state (e.g. `...defaultState, ...base, ...parsed`).
- **Replacement versus merge behavior:** Confirmed current runtime behavior: It performs a shallow merge of top-level properties and some nested properties (like `profile` and `personalization`), but effectively overwrites arrays (like workouts and meals) with the imported version. It does _not_ safely resolve conflicts within collections.
- **Partial-state handling:** Uses spread operators to fill missing fields with defaults.
- **Failure feedback:** Sets a temporary state message ("Invalid backup file") which disappears after 3 seconds.
- **Rollback or lack of rollback:** Confirmed current runtime behavior: If the import succeeds, the previous state is overwritten in memory and saved to localStorage. There is no rollback mechanism.

# 14. Reset and destructive-action lifecycle

- **Exact state scope:** Confirmed current runtime behavior: Replaces entire `AppState` with `defaultState`.
- **Confirmation:** Confirmed current runtime behavior: Requires clicking "Reset all data" and confirming via a secondary `ConfirmDialog`.
- **Onboarding effect:** Confirmed current runtime behavior: `onboardingComplete` resets to `false`, causing the app to render the `Onboarding` view.
- **Recoverability:** Confirmed current runtime behavior: Unrecoverable unless the user manually exported a backup beforehand.

# 15. Backup, restore, and recovery behavior

- **Automatic backups:** Future integration question: Not present on current main.
- **Restore:** Confirmed current runtime behavior: Handled solely via manual JSON file import.
- **Recovery behavior:** Confirmed current runtime behavior: System defaults to a blank slate if the storage key is corrupted. There are no automatic recovery checkpoints.

# 16. Validation and feedback

- **Storage failure conclusion:** Confirmed current runtime behavior: Storage write failures are caught by a silent try-catch block and return `false`, providing no UI feedback to the user.
- **Validation:** Confirmed current runtime behavior: Minimal input string validation (e.g., rejecting non-finite numbers via `Number()`) on buffered Settings inputs.

# 17. Concurrent-tab and stale-write behavior

- **Concurrent-tab behavior:** Confirmed current runtime behavior: The core app state (`AppState`) relies on last-write-wins overwriting. There is no cross-tab synchronization for the main domain data.
- **Stale-write behavior:** Future integration question: Conflict resolution and revision handling are not present on current main and require coordination with the Data Safety branch after merge. (Note: minor UI preferences sync via a custom `usePersistentState` event listener, but not core health data).

# 18. Current-main versus future-integration boundary

- **Current main:** Synchronous, unencrypted, local JSON storage. Presentation-only placeholders for advanced features.
- **Future integrations:** Cloud sync, asynchronous storage, automatic backups, encryption, account systems, conflict resolution, revision handling, remote persistence, and background synchronization are all possible future dependencies or unresolved integration questions. Do not treat as current behavior.

# 19. Test coverage

- **Tests inventoried:**
  - `tests/e2e/settings-hub-safety-smoke.spec.ts`: Confirmed current runtime behavior: Tests opening/closing Settings, verifying Reset dialog visibility, and preventing fatal rendering errors.
  - `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts`: Confirmed current runtime behavior: Basic safety workflows for Jarvis settings.
  - `tests/e2e/settings-hub-render-smoke.spec.ts`: Confirmed current runtime behavior: Validates section toggling and visibility.
- **Gaps:** Confirmed incomplete: No automated tests currently exist for the JSON import/export parsing logic or storage-failure error handling.

# 20. Preservation checklist

- [ ] Maintain conditionally rendered overlay structure of `SettingsView`.
- [ ] Preserve exact schema output for profile fields (bodyweight, daysPerWeek) upon save.
- [ ] Retain `FutureRows` placeholders until their backing architecture is verified as merged.
- [ ] Do not remove `ConfirmDialog` protections from the reset flow.
- [ ] Preserve `migrateAppState` merge behavior during JSON import until conflict-resolution is active.

# 21. Safe implementation boundaries

- **Safe files for UI rework:** `src/components/app/views/settings.tsx`, `src/components/app/jarvis/settings-card.tsx`.
- **Requires coordination:** `src/lib/types.ts` (modifying Profile schema), `src/lib/store.tsx` (persistence entry point).
- **Future boundaries:** Any changes involving asynchronous storage or account systems require coordination with the Data Safety branch after merge.

# 22. Open questions

- **Unit historical migration:** Unresolved integration question: If a user changes unit preferences in the future, how will historical raw logs be safely migrated or displayed without assuming base weights?
- **Storage failure UI:** Unresolved integration question: Should silent `localStorage` quota failures surface a visible warning banner to the user?

# 23. File index

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
