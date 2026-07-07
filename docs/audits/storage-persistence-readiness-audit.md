# Storage and Persistence Readiness Audit

Date of audit: 2024-07-07
Branch/task name: docs-storage-audit
**Note:** This is a docs-only audit and does not change any runtime behavior.

## Executive Summary

- **localStorage Reliance:** The app entirely relies on synchronous `localStorage` for state persistence (`fitcore.v1`). UI-level persistence relies on `fitcore.ui.*` namespace. AI diagnostic calls use `fitcore.ai.diagnostics`.
- **State vs View:** `store.tsx` maintains a `state` (real persisted user data) and a `view` (a computed state injected with demo data when `demoMode` is true).
- **Data Integrity:** `FITCORE_DATA_VERSION = 4` is the active schema version. `migrateFitCoreDataIfNeeded` handles migrations automatically on app load.
- **Risk (Demo Mode Pollution):** If any UI components write updates based on `view` rather than the underlying base `state`, demo data could be accidentally persisted to localStorage (Issue #47 concern).
- **Export/Import Readiness:** Basic JSON export/import is functional but lacks selective export and granular deletion for sensitive data.
- **IndexedDB / Cloud:** Not yet implemented. The synchronous architecture of `localStorage` will require significant refactoring when moving to asynchronous storage like `IndexedDB`.

## Files Inspected

- `src/lib/store.tsx`: Core state management, hydration, and demo mode separation logic. It holds the `StoreProvider` and the critical `state` vs `view` distinction.
- `src/lib/fitcore-data.ts`: Defines the main data schema, `FITCORE_STORAGE_KEY` (`fitcore.v1`), and handles loading, saving, and migrating the main payload.
- `src/lib/persist.ts`: Contains the hook for `localStorage`-backed React state used for UI preferences (`fitcore.ui.*`).
- `src/lib/demo-data.ts`: Generates deterministic mock data injected into `view` when demo mode is active.
- `src/lib/types.ts`: Defines all core data types (workouts, exercises, macros, settings).
- `src/lib/daily-decision.ts`: Reads persisted data to generate AI insights. Stale data here would impact coaching recommendations.

## Current Persistence Map

| Data Type                | Storage Location / Key                    | Source File                     | Hydration Behavior                                          | Write Behavior                     | Reset/Delete Behavior                | Export Behavior                 | Migration/Versioning Present? | Risk Level | Notes                                                    |
| ------------------------ | ----------------------------------------- | ------------------------------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------ | ------------------------------- | ----------------------------- | ---------- | -------------------------------------------------------- |
| Workouts                 | `fitcore.v1` (AppState.workouts)          | `store.tsx` & `fitcore-data.ts` | Loaded on mount, migrated via `migrateFitCoreDataIfNeeded`. | Centralized via `saveFitCoreData`. | Cleared on `reset()`.                | Included in full JSON export.   | Yes (v4).                     | Medium     | Needs offline-sync logic if moving to cloud.             |
| Active Workout State     | `fitcore.v1` (AppState.activeWorkout)     | `store.tsx`                     | Hydrates active session.                                    | Centralized via `set()`.           | Cleared when workout ends or reset.  | Included in full JSON export.   | Yes.                          | Medium     | Risk of mid-workout data loss if browser clears storage. |
| Exercises/Sets           | `fitcore.v1` (inside workouts)            | `store.tsx`                     | Hydrated as part of workouts.                               | Centralized via `set()`.           | Cleared on `reset()`.                | Included in full JSON export.   | Yes.                          | Low        |                                                          |
| Meal/Nutrition Logs      | `fitcore.v1` (AppState.mealEntries)       | `store.tsx`                     | Loaded on mount.                                            | Centralized via `set()`.           | Cleared on `reset()`.                | Included in full JSON export.   | Yes.                          | Low        |                                                          |
| Body Weight              | `fitcore.v1` (AppState.bodyweightEntries) | `store.tsx`                     | Loaded on mount.                                            | Centralized via `set()`.           | Cleared on `reset()`.                | Included in full JSON export.   | Yes.                          | Low        |                                                          |
| Progress Metrics         | Computed from above                       | `fitcore-data.ts`               | Computed, not directly stored.                              | N/A                                | N/A                                  | N/A                             | N/A                           | Low        |                                                          |
| Recovery/Sleep/Readiness | `fitcore.v1` (AppState.recoveryCheckIns)  | `store.tsx`                     | Loaded on mount.                                            | Centralized via `set()`.           | Cleared on `reset()`.                | Included in full JSON export.   | Yes.                          | Low        |                                                          |
| Soreness/Pain/Injury     | `fitcore.v1` (Recovery CheckIns & Notes)  | `store.tsx`                     | Loaded on mount.                                            | Centralized via `set()`.           | Cleared on `reset()`.                | Included in full JSON export.   | Yes.                          | Medium     | Sensitive health data, needs selective deletion.         |
| User Settings            | `fitcore.v1` (AppState.personalization)   | `store.tsx`                     | Loaded on mount, merged with defaults.                      | Centralized via `set()`.           | Reset to defaults.                   | Included in full JSON export.   | Yes.                          | Low        |                                                          |
| AI/Jarvis Outputs        | `fitcore.v1` & `fitcore.ai.diagnostics`   | `jarvis-panel.tsx`              | `jarvis-panel` reads diagnostics directly.                  | Independent `setItem`.             | Not explicitly cleared on app reset. | Diagnostics not in export.      | No.                           | Medium     | AI diagnostic calls leak across app resets.              |
| Demo/Sample Data         | Computed into `view`                      | `demo-data.ts`                  | Generated on the fly if `demoMode=true`.                    | Not saved (unless bug occurs).     | Disappears when demo mode is off.    | Not exported (unless polluted). | N/A                           | High       | #47: Risk of writing view state into true state.         |
| Future Medical/Genetics  | N/A (Placeholders)                        | N/A                             | N/A                                                         | N/A                                | N/A                                  | N/A                             | N/A                           | Unknown    | Requires highly secure, local-only or encrypted storage. |

## LocalStorage Behavior

- **`fitcore.v1`**: The primary monolithic JSON blob for all user data (workouts, meals, settings). Centralized writes via `saveFitCoreData`. Versioned (currently v4).
- **Legacy Keys**: `fitcore.state`, `fitcore.data`, `focus-lift-data`, `fitcore.v0` are checked for migration fallbacks.
- **`fitcore.ui.*`**: Various UI preferences (e.g., collapsed states, selected tabs) managed by `usePersistedState`. Not versioned.
- **`fitcore.ai.diagnostics`**: Stores API call logs for Jarvis. Unversioned, not cleared on global reset.
- **Invalid/Corrupt Data Handling**: `migrateAppState` uses `try/catch` and falls back to `defaultState` safely. Partial states are merged so nested objects are not blown away.
- **Stale Data Risks**: Graph/AI logic operates on the in-memory state. If another tab mutates storage, the current tab won't see it (no `storage` event listener).

## Hydration and Default State

- The app initializes with `defaultState` during server-side rendering (or initial client render).
- On mount, `StoreProvider`'s `useEffect` calls `load()` which reads `localStorage`, migrates it, and updates the state, flipping `hydrated` to true.
- **Separation**: Real persisted data lives in `state`. If `state.demoMode` is true, a `view` is computed by merging `demo-data.ts` into the state.
- **Concern #47**: While `StoreProvider` correctly isolates `state` and `view`, individual screens must be careful to dispatch updates based on user intent rather than taking the entire `view` object and saving it back to `state`. If a component copies a demo workout and saves it, it permanently pollutes the user's real data.

## Demo Mode / State-View Separation Risks

- **Risks**: The primary risk is demo data pollution. If a user enables demo mode, modifies a demo workout, and the app saves the entire workout list back to `state`, the demo data becomes permanent user data.
- **Future Testing Needs**:
  - Enable demo mode, log a new meal, disable demo mode. Confirm the new meal is saved but demo meals are gone.
  - Enable demo mode, edit a _demo_ workout, disable demo mode. Confirm what happens (should probably be isolated or warned).
  - Check for any component that uses `set(s => ({ ...view }))` instead of `set(s => ({ ...s }))`.

## Data Export and Deletion Readiness

- **Full Data Export**: Ready. `exportJson` works via JSON dump of the main state.
- **Full Data Deletion**: Ready. `reset()` clears the state and overwrites the monolithic key with defaults.
- **Selective Deletion**: **Not Ready**. Users cannot easily bulk-delete just workouts or just nutrition.
- **Deleting AI Memories**: **Not Ready**. Diagnostics and AI history are scattered and not easily wiped without full reset.
- **Deleting Sensitive Categories**: **Not Ready**. Health/pain data is embedded in standard logs.
- **Local-only Privacy Mode**: **Not Ready**. The app is local-only by default, but there is no architectural distinction between "safe to sync" and "never sync" data fields.

## Future IndexedDB / Cloud Sync Readiness

- **Schema Versioning & Migrations**: Currently handled entirely in-memory on the JSON blob. This won't scale to IndexedDB where migrations require explicit schema version upgrades on the DB connection.
- **Asynchronous Storage**: `localStorage` is synchronous. All `useStore` logic assumes synchronous access. Moving to IndexedDB will require a massive refactoring to handle async hydration, loading states, and async `set()` operations.
- **Conflict Resolution**: None exists. If two devices sync a monolithic JSON blob, one will overwrite the other. A move to cloud requires migrating to atomic log-based or CRDT-style syncing.
- **Offline Edits**: App is offline-first, but needs a queue/sync status manager if a cloud layer is added.
- **Data Provenance**: AI confidence/source tags are in the schema (`DataProvenance`), which is good, but they must be preserved during any sync merge.

## Risk Table

| Risk                      | Evidence                                     | Data Types Affected         | User Impact                                    | Severity | Recommended Future Action                                               | Safe to Fix Now?      |
| ------------------------- | -------------------------------------------- | --------------------------- | ---------------------------------------------- | -------- | ----------------------------------------------------------------------- | --------------------- |
| Demo Data Pollution (#47) | State/View merge in `store.tsx`.             | All (Workouts, Meals, etc.) | High (Data corruption)                         | High     | Audit all `set()` calls to ensure they only mutate intended properties. | No, future runtime PR |
| Sync Overwrites           | Monolithic JSON blob approach.               | All                         | High (Data loss across devices)                | High     | Move to atomic/delta updates before adding cloud sync.                  | No, future runtime PR |
| Cross-tab State Desync    | No `storage` event listener in `store.tsx`.  | All                         | Low/Medium (Requires refresh to see changes)   | Low      | Add `window.addEventListener('storage')` to sync state across tabs.     | No, future runtime PR |
| AI Storage Leak           | `jarvis-panel.tsx` raw `localStorage` usage. | AI Diagnostics              | Low (Storage quota eventually)                 | Low      | Move diagnostics into main state or clear on reset.                     | No, future runtime PR |
| Large Payload Freeze      | `localStorage` synchronous parsing.          | All                         | Medium (UI stutter on load with years of data) | Medium   | Migrate to IndexedDB for async chunked loading.                         | No, future runtime PR |

## Recommended Future Storage Task Queue

### Docs/Planning Tasks

1. Map out IndexedDB schema mapping (how JSON nested arrays map to DB object stores).
2. Define sync conflict resolution strategy (CRDT vs Last-Write-Wins per field).

### Validation/Test Tasks

1. Write Playwright test to verify Demo Mode isolation (Issue #47).
2. Write Playwright test to verify cross-tab synchronization behavior.

### Data Model/Schema Tasks

1. Add `syncStatus` (pending, synced, error) to `FitCoreLog`.
2. Tag sensitive fields with a `localOnly` flag in the TypeScript types.

### Runtime Storage Implementation Tasks (Post-Product Bible)

1. Implement IndexedDB wrapper (e.g., using `idb`).
2. Refactor `StoreProvider` to handle async initialization.
3. Migrate `localStorage` blob to DB object stores on first load.

### Privacy/Export/Delete Tasks

1. Build UI for selective data deletion (e.g., "Clear all nutrition data").
2. Ensure AI diagnostic data is included in the master reset function.

## Future Smoke Test Checklist

- [ ] Fresh load with no localStorage.
- [ ] Load with old/stale localStorage (v3 schema) and verify v4 migration.
- [ ] Log workout and reload.
- [ ] Log meal and reload.
- [ ] Weigh in and reload.
- [ ] Switch demo mode on/off.
- [ ] Confirm demo mode does not pollute real state (Issue #47).
- [ ] Clear data and confirm app recovers to clean default state.
- [ ] Confirm graphs/cards match persisted records.
- [ ] Confirm AI-generated records retain source/confidence on export/import.
