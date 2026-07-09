# FitCore LocalStorage & Storage Shape Audit

This document outlines the usage of browser `localStorage` and the shape of stored application data within FitCore.

## 1. localStorage Keys Used by the App
The primary storage key used by the application is:
* `fitcore.v1` (Defined in `FITCORE_STORAGE_KEY` in `src/lib/fitcore-data.ts`)

Legacy keys checked during load fallback:
* `fitcore.state`
* `fitcore.data`
* `focus-lift-data`
* `fitcore.v0`

## 2. Expected Stored Shape for Each Key
The `fitcore.v1` key stores a single JSON-stringified object conforming to the `AppState` interface defined in `src/lib/types.ts`.
The expected schema structure includes, but is not limited to:
* `version`: A numeric schema version indicator (currently `4`).
* `onboardingComplete`: Boolean flag.
* `profile`: Object containing user goals, metrics, and experience level.
* `personalization`: Settings for UI accents, reminders, units, etc.
* `nutritionTargets`: Calorie and macro target objects.
* Array Collections:
    * `workouts`, `workoutTemplates`, `customExercises`, `cardioEntries`
    * `mealEntries`, `bodyweightEntries`, `sleepEntries`
    * `recoveryCheckIns`, `recoverySignals`
    * `prs`, `goals`, `progressPhotos`, `supplementLogs`
    * `aiMessages`, `jarvisAudit`
* `activeWorkout`: Object (or null) representing a workout currently in progress.
* `muscleFatigue`, `jarvisLearning`, `userGoalsProfile`: Nested dynamic record objects.
* `jarvisSettings`: Extensive configuration for the AI coach provider and features.

## 3. Whether `fitcore.v1` Appears to Store AppState Directly or Wrapped Data
`fitcore.v1` stores the `AppState` **directly** as a flat JSON stringification of the entire root state object.
There is no envelope, outer wrapping metadata, or binary compression applied before storage. When parsed, it yields an object matching the root `AppState` type (subject to missing fields or legacy formats).

## 4. Storage Boot/Parse/Fallback Behavior
The boot and parse sequence is managed in `src/lib/store.tsx` and `src/lib/fitcore-data.ts`:
1. On startup, `load()` in `store.tsx` calls `loadFitCoreData(defaultState)`.
2. `loadFitCoreData` attempts to retrieve and parse `fitcore.v1`.
3. If `fitcore.v1` is missing or fails parsing (returns null), it sequentially attempts to parse the `LEGACY_KEYS`.
4. If all keys fail, it falls back to the hardcoded `defaultState`.
5. The `parse` utility function in `fitcore-data.ts` includes rudimentary validation: it filters the raw JSON object, discarding any root-level keys that do not exist in a hardcoded `STATE_KEYS` whitelist or fail `validStateField` checks.
6. The resulting partial object is passed to `migrateAppState`, which deeply merges the stored partial state with the `defaultState` and `defaultPersonalization` to ensure nested objects are fully populated.
7. Finally, `migrateFitCoreDataIfNeeded` applies any necessary logical state migrations.

## 5. Known Risks for Corrupted or Old Stored Data
* **Silently Dropped Data:** The `parse` function filters out unmapped keys. If a user downgrades the app version or if there's a mismatch between the stored payload and `STATE_KEYS`, valid user data might be silently dropped from storage upon next save without notifying the user.
* **Storage Size Limits:** Since the entire `AppState` containing all historical logs is stringified as a monolithic object, heavy usage over years will inevitably hit the browser's 5MB localStorage limit. Once the limit is reached, `localStorage.setItem` will throw a `QuotaExceededError`. The `saveFitCoreData` function catches this error and returns `false`, meaning the app will silently fail to save new data without alerting the user.
* **Corrupted JSON:** If the `fitcore.v1` payload becomes partially written or corrupted during a browser crash, `JSON.parse` will throw, and the app will completely wipe the user's data by falling back to `defaultState`.

## 6. Future Test or Implementation Recommendations
* **Implementation Recommendation:** Introduce IndexedDB (e.g., via localForage, Dexie, or idb) to migrate away from synchronous localStorage limits and handle large log arrays.
* **Implementation Recommendation:** Add UI alerting or telemetry when `saveFitCoreData` returns `false` (which catches `QuotaExceededError`).
* **Implementation Recommendation:** Implement a storage backup mechanism (e.g., `fitcore.v1.backup`) prior to parsing and overwriting data on boot, ensuring corrupted parses have a fallback mechanism before total data loss.
* **Test Recommendation:** Create unit/E2E tests that simulate hitting the 5MB storage limit and verify that the UI gracefully informs the user rather than silently dropping newly tracked workouts or meals.
* **Test Recommendation:** Create unit/E2E tests that load legacy schema versions and assert the data is correctly deeply-merged and migrated to the V4 shape without regressions.
