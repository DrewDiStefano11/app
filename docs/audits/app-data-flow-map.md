# FitCore App Data Flow Map

This document outlines the high-level data entry points, state mutations, and view updates within the FitCore application architecture.

## 1. Main App State & Data Entry Points
* The main state structure is defined by `AppState` in `src/lib/types.ts`.
* The application state is loaded on boot via `loadFitCoreData` in `src/lib/fitcore-data.ts`, which attempts to fetch `fitcore.v1` from `localStorage` (or falls back to legacy keys).
* State defaults and structure upgrades are handled by `migrateFitCoreDataIfNeeded` and `migrateAppState` in `src/lib/store.tsx`.
* The global store is provided by `StoreProvider` (React Context) in `src/lib/store.tsx`. All components retrieve state and the state updater function `set` using the `useStore` hook.
* There are two parallel state projections exposed by `useStore`:
    * `state`: The underlying, true saved user data.
    * `view`: The "effective" state shown to the user. When `demoMode` is true, this merges demo data (from `src/lib/demo-data.ts`) over the base state for rendering, without overwriting real saved data.

## 2. Where User Actions Update Data
All data updates route through the `set` function provided by `useStore` in `src/lib/store.tsx`. When `set` is called, it:
1. Applies the requested update to the current state.
2. Runs the state through `migrateFitCoreDataIfNeeded` for any internal normalization.
3. Synchronously saves the new state to `localStorage` via `saveFitCoreData`.

Specific logging flows and mutations:
* **Home View Popups** (`src/components/app/views/home.tsx`):
    * **Meal Logging (`LogMealSheet`)**: Pushes a new `MealEntry` object into `state.mealEntries`.
    * **Check-In (`CheckInSheet`)**: Pushes a new `RecoveryCheckIn` into `state.recoveryCheckIns`.
    * **Weigh-In (`WeighInSheet`)**: Pushes a new `BodyweightEntry` into `state.bodyweightEntries`.
* **Training View** (`src/components/app/views/training.tsx`):
    * Workouts are tracked via an `activeWorkout` object in state. Once completed, the session is moved into `state.workouts`.
* **Nutrition View** (`src/components/app/views/nutrition.tsx`):
    * Additional explicit meal logging flows, modifying `mealEntries`.
* **Recovery View** (`src/components/app/views/recovery.tsx`):
    * Logging fatigue or sleep modifies `muscleFatigue` and `sleepEntries`.
* **AI/Jarvis Panel** (`src/components/app/jarvis/jarvis-panel.tsx`):
    * Modifies state based on AI inferences (e.g., logging a meal from text). Changes are tracked in `jarvisAudit`.

## 3. Which App Areas Consume Logged Data
* **Home View Dashboard (`src/components/app/views/home.tsx`)**:
    * Consumes `workouts` (for volume rings), `mealEntries` (for macro progress rings), `recoveryCheckIns` (for readiness scores), and `muscleFatigue` (for the body heatmap).
* **Training View**:
    * Reads `workouts` for history, PR tracking, and analytics (e.g., `weeklyVolumeSeries`).
* **Nutrition View**:
    * Aggregates `mealEntries` for the current day against `nutritionTargets`.
* **Recovery View**:
    * Consumes `sleepEntries` and `recoveryCheckIns` to calculate overall readiness scores.
* **Progress View (`src/components/app/views/progress.tsx`)**:
    * Aggregates data across `workouts`, `bodyweightEntries`, `mealEntries`, and `progressPhotos` to generate historical trend charts.
* **AI Coach Context**:
    * `buildAICoachContext` (in `src/lib/fitcore-data.ts`) aggregates user profile, nutrition, bodyweight, and recovery data into a text block to feed to the LLM context.

## 4. Known Risk Areas
* **Demo Mode State Bleeding**: The `view` vs `state` paradigm effectively masks true state during demo mode. If a component mistakenly writes back a merged demo-state entity into `state` via an updater, demo data could become permanently merged into the user's real saved profile.
* **Active Workout Abandonment**: If the user closes the tab while an `activeWorkout` is in progress, the workout state is persisted in localStorage, but if not handled correctly on reboot, the user might be permanently stuck in an active state or lose the active state entirely without it moving to `workouts`.
* **Log Aggregation Bounds**: Functions like `isToday(ts)` rely on local device time. Changes in timezone or daylight savings time boundaries might cause logs near midnight to shift across days, leading to duplicated or missing charts for a specific calendar day.
* **Storage Limit / Over-fetching**: `AppState` holds the entire history of workouts, meals, etc. As the arrays grow infinitely, stringifying and parsing the entire state block via `localStorage` on every keystroke or update will eventually hit the 5MB local storage limit or cause significant UI frame drops due to synchronous main-thread blocking.

## 5. Files that are High-Risk for Future Changes
* `src/lib/store.tsx`: Core state persistence and migration logic. Any structural flaw here impacts the entire application.
* `src/lib/types.ts`: Defines `AppState`. Breaking changes here require careful migration mappings.
* `src/lib/fitcore-data.ts`: Contains the normalization logic, serialization wrappers, and data projections.
* `src/components/app/active-workout.tsx`: Handles the complex state machine of an ongoing workout session.

## 6. Future Safe Implementation Tasks Grouped by Exact File Scope
* **`src/lib/store.tsx` & `src/lib/fitcore-data.ts`**:
    * Implement a chunked storage or IndexedDB strategy to prevent `AppState` from exceeding the 5MB localStorage limit.
    * Implement robust error boundaries around `parse` to gracefully handle corrupt JSON.
* **`src/components/app/views/*.tsx`**:
    * Refactor deeply nested components into pure presentational functions that accept data props, to allow for easier unit testing of visual states.
    * Replace flat 24-hour offsets with true calendar-day boundary calculations to prevent timezone rolling errors.
