# Metric Propagation Risk Map

## 1. Major tracked metric categories visible in the app
*   **FitCore Score** (and its driver sub-scores: Training Consistency, Nutrition Adherence, Readiness, Recovery, Momentum).
*   **Training**: Workout Volume, Sets Completed, Reps, Weekly Workouts.
*   **Nutrition**: Daily Calories, Protein, Carbs, Fat.
*   **Recovery & Body**: Energy, Soreness, Stress, Motivation, Bodyweight.

## 2. Where each metric appears to be created, updated, displayed, graphed, or summarized
*   **Creation/Update**:
    *   `src/components/app/popups/quick-popups.tsx` (Manual creation of check-ins, meals, bodyweight).
    *   `src/components/app/active-workout.tsx` (Manual entry of workout sets/reps/weight).
    *   `src/lib/store.tsx` (Global central store where state updates are applied and persisted).
*   **Display & Summarization**:
    *   `src/components/app/views/home.tsx` (Dashboard tiles showing FitCore Score, momentum, daily macro rings, readiness orbits).
    *   `src/components/app/views/training.tsx` (Weekly consistency summary).
    *   `src/components/app/views/progress.tsx` (Historical trend charts and graphs).
    *   `src/components/app/views/recovery.tsx` (Averaged fatigue/soreness visualizers).
*   **Calculation**:
    *   `src/lib/analytics.ts` (Derives scores and aggregated volumes from raw logs).
    *   `src/lib/fitcore-data.ts` (Aggregates timeline series like `getProgressSeries`).

## 3. Risks where a metric may be logged but not reflected elsewhere
*   **Date Boundary Issues**: Logs created near midnight may be recorded with a timestamp from "yesterday" but displayed "today" (or vice versa) if timezone normalization or calendar-day boundary logic is inconsistent between the logging component and the `getProgressSeries` analytics function.
*   **Incomplete Logs**: A workout might be logged, but if the individual sets are not marked `completed: true`, the `workoutVolume` calculation in `analytics.ts` will return 0, making the workout appear invisible on volume charts.
*   **Demo Mode Interference**: If a user logs real data while `state.demoMode` is true, the `store.view` might prioritize displaying demo data over the newly logged user data.

## 4. Risks where charts/figures may not update from the same source of truth
*   **Direct state vs View state**: UI components reading from raw `state` instead of the derived `view` from `useStore()` will show inconsistent data when demo mode is active or when derived metrics haven't been re-calculated.
*   **Calculation Duplication**: If a component manually loops through `state.workouts` to sum volume instead of using `totalVolumeInRange` from `analytics.ts`, it might diverge from other components using the standard function.
*   **Stale References**: `useMemo` hooks in dashboard views may fail to recompute if they depend on deep, un-cloned object mutations within the store (though `setState` patterns generally protect against this if immutable updates are respected).

## 5. Areas that need future validation
*   **Macro Rollups**: Validate that partial meal entries (e.g., just calories, no protein) don't crash or break the `getDailyMacroSummary` math.
*   **Timezones**: Validate that a check-in logged at 11:59 PM local time correctly maps to the correct day in progress charts, regardless of UTC offsets.
*   **Empty States**: Validate that charts fail gracefully (or show empty state UI) when a user has deleted all their workouts or check-ins.

## 6. Future safe tasks grouped by exact file scope
*   **`src/lib/analytics.ts`**:
    *   Add explicit boundary handling and timezone-aware grouping functions for daily rollups to be used by all charting tools.
    *   Implement memoized selector patterns for expensive calculations like `totalVolumeInRange` if performance degrades.
*   **`src/components/app/views/progress.tsx`**:
    *   Refactor all inline array `.reduce()` or `.filter()` logic into shared helper functions exported from `src/lib/analytics.ts`.
*   **`src/lib/fitcore-data.ts`**:
    *   Add a validation layer to `saveFitCoreData` that ensures required fields (`createdAt`, `id`) are always present before persisting to `localStorage`.
