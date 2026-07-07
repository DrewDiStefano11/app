# Dashboard and Graph Data Consistency Audit

Date: 2024-07-07
Branch/Task: docs-dashboard-graph-consistency-audit

**Note:** This is a docs-only audit task and does not change runtime behavior.

## Executive Summary

- **State vs. View Inconsistency**: The biggest consistency risk across dashboard cards, graphs, and summaries is the inconsistent usage of `useStore().state` (persistent user data) vs. `useStore().view` (derived data merging demo mode content). The Home dashboard relies heavily on `view`, while specific feature screens (Progress, Nutrition, Recovery, Training) primarily rely on `state`. This leads to a severe mismatch of calculated data when Demo Mode is active.
- **Demo Mode Leaks**: Because some screens use `state`, any manual interaction (saving, logging, editing) performed on those screens while Demo Mode is active could potentially write demo data or mix demo data with persistent state, breaking the isolation boundary.
- **AI Confidence Representation**: AI-generated data provenance and confidence are tracked in the data layer (e.g., `provenance` metadata), but visibility in surface UI summaries is mostly limited to popup detailed views (e.g., AI confidence shown in `quick-popups.tsx`). Dashboards aggregate AI data into totals without clear indicators of origin/confidence.
- **Time Range Mismatches**: Some visualizations hardcode their lookback periods (e.g., `weeklyVolumeSeries` uses 14 days by default for series data, while `volumeByMuscle` and `volumeByExercise` use 30 days). Popups and summary cards rely on varying time windows.

## Files Inspected

- `src/lib/store.tsx`: Core state provider. Confirmed `state` vs `view` definitions.
- `src/lib/fitcore-data.ts`: Data schema and persistence logic.
- `src/lib/types.ts`: Typings for AI confidence and data provenance.
- `src/lib/analytics.ts` / `src/lib/analytics-extra.ts`: Helper functions used to calculate scores, metrics, and chart series.
- `src/components/app/views/home.tsx`: Main dashboard surface. Uses `view` heavily.
- `src/components/app/views/progress.tsx`: Progress charts and graphs. Uses `state`.
- `src/components/app/views/nutrition.tsx`: Nutrition logging and tracking. Uses `state`.
- `src/components/app/views/recovery.tsx`: Recovery readiness and heatmaps. Uses `state`.
- `src/components/app/views/training.tsx`: Workout lists and basic graphs. Uses `state`.
- `src/components/app/popups/score-popup.tsx`: Detailed view for the FitCore Score. Uses `view`.

## Visual Surface Inventory

| Surface / Screen | Visual or Card   | Data Source | Derived From                                   | Time Range / Filter       | Demo Mode Behavior Known? | Risk Level | Notes                                                                   |
| :--------------- | :--------------- | :---------- | :--------------------------------------------- | :------------------------ | :------------------------ | :--------- | :---------------------------------------------------------------------- |
| Home Dashboard   | FitCore Score    | `view`      | `fitcoreScore(view)`                           | Lifetime/Mixed            | Yes (Uses demo data)      | High       | Correctly displays demo data, but mismatches other views using `state`. |
| Home Dashboard   | Readiness Orbit  | `view`      | `readinessScore(view)`                         | Recent checks/sleep       | Yes (Uses demo data)      | High       | Mismatches Recovery screen.                                             |
| Home Dashboard   | Muscle Heatmap   | `view`      | `muscleMap(view)`                              | Configurable via heatMode | Yes (Uses demo data)      | Medium     | -                                                                       |
| Home Dashboard   | Macros Summary   | `view`      | `todayMealTotals(view)`                        | Today                     | Yes (Uses demo data)      | High       | Mismatches Nutrition screen.                                            |
| Home Dashboard   | Volume Trend     | `view`      | `totalVolumeInRange(view)`                     | 7d vs 14d                 | Yes (Uses demo data)      | Medium     | -                                                                       |
| Home Dashboard   | Popup Mode       | `view`      | `volumeByMuscle(view)`, etc.                   | Configurable / 30d        | Yes (Uses demo data)      | Medium     | -                                                                       |
| Progress View    | FitCore Score    | `state`     | `fitcoreScore(state)`                          | Lifetime/Mixed            | Yes (Ignores demo data)   | High       | Discrepancy with Home Dashboard.                                        |
| Progress View    | Bodyweight Trend | `state`     | `state.bodyweightEntries`                      | Lifetime sorted           | Yes (Ignores demo data)   | High       | -                                                                       |
| Progress View    | Training Volume  | `state`     | `state.workouts`                               | Configurable              | Yes (Ignores demo data)   | High       | -                                                                       |
| Nutrition View   | Daily Targets    | `state`     | `state.mealEntries`                            | Today                     | Yes (Ignores demo data)   | High       | Discrepancy with Home Dashboard macro summary.                          |
| Recovery View    | Readiness Score  | `state`     | `state.recoveryCheckIns`, `state.sleepEntries` | Latest                    | Yes (Ignores demo data)   | High       | Discrepancy with Home Dashboard readiness orbit.                        |
| Recovery View    | Sleep Trend      | `state`     | `state.sleepEntries`                           | Lifetime sorted           | Yes (Ignores demo data)   | High       | -                                                                       |
| Training View    | Activity Log     | `state`     | `state.workouts`                               | Configurable / Today      | Yes (Ignores demo data)   | High       | -                                                                       |
| Popups (Score)   | Score Breakdown  | `view`      | `view`                                         | Lifetime/Mixed            | Yes (Uses demo data)      | High       | Detailed popup matches Home, but not Progress screen.                   |

## Data Source Map

- **Workouts/Exercises/Sets**: Reside in `state.workouts` / `state.activeWorkout`. Handled mostly via helper functions.
- **Body Weight**: Reside in `state.bodyweightEntries`. Simple sorted arrays.
- **Meals/Macros**: Reside in `state.mealEntries`. Filtered dynamically by day.
- **Sleep**: Reside in `state.sleepEntries`. Filtered to latest.
- **Soreness/Recovery/Readiness**: Reside in `state.recoveryCheckIns` and `state.muscleFatigue`.
- **AI Logs/Insights**: Audit trails are in `state.jarvisAudit`. Provenance is embedded in the object interfaces (e.g. `MealEntry.provenance`).
- **Demo/Sample Data**: Generated by `buildDemoState(state)` and merged into `state` when `demoMode` is toggled true. Served as `view`.
- **Architecture**: Data is stored centrally in the `StoreContext`. However, components retrieve it through either `state` (direct unadulterated state) or `view` (demo data merged), causing downstream inconsistencies when Demo Mode is activated.

## Inconsistency Risks

- **Same metric calculated differently**: `fitcoreScore` is calculated using `view` on the Home screen and `state` on the Progress screen. In Demo Mode, these will display completely different numbers for the exact same metric.
- **Different screens reading from different state layers**: Home relies on `view`, whereas Training, Nutrition, Recovery, and Progress rely mostly on `state`.
- **Demo mode using derived view in some places but persisted state in others**: Confirmed. This is the source of the inconsistency. Interacting with forms on screens using `state` during Demo Mode poses a risk of overwriting or polluting actual user data.
- **Graphs and cards using different time windows**: Analytics functions default to specific ranges (e.g. `weeklyVolumeSeries` uses 14 days, `volumeByMuscle` uses 30 days) while some UI elements provide fixed filters (7d, 30d).
- **AI-generated logs not appearing in all relevant graphs**: While AI logs have `provenance`, dashboards summarize total volume/macros without differentiating low-confidence AI data from confirmed user entries.

## Demo Mode and State/View Concerns

- As suspected in issue #47, the data-flow audit's hypothesis is confirmed: Demo mode uses a derived `view`, but many screens (Nutrition, Recovery, Training, Progress) still consume `state` directly.
- **Surfaces to be tested later:**
  - Entering data on the Nutrition screen while in Demo Mode (does it update `state`?).
  - Switching tabs from Home to Progress to see if the FitCore Score abruptly changes when Demo Mode is toggled.
  - Confirming no persisted state pollution after generating data on screens that bypass `view`.

## AI-Generated Data Display Risks

- **Provenance Missing in Summaries**: While popups (like `quick-popups.tsx`) display AI confidence levels ("low", "medium", "high" confidence), the aggregated graphs and macro cards (e.g. `todayMealTotals`) do not segment out or visually differentiate AI-generated unconfirmed data from manual entry.
- AI-generated data affects graphs/cards in exactly the same way as manual data unless explicitly excluded by the daily decision engine logic, which can skew the visuals if the AI data is of low confidence or unconfirmed.

## Risk Table

| Risk                       | Evidence                                                                | Affected Screens                              | User Impact                                                    | Severity | Recommended Future Action                                                                          | Safe to Fix Now?      |
| :------------------------- | :---------------------------------------------------------------------- | :-------------------------------------------- | :------------------------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------- | :-------------------- |
| **Demo Mode Mismatch**     | `HomeView` uses `view`, `ProgressView` uses `state` for `fitcoreScore`. | Home, Progress, Recovery, Nutrition, Training | Confusing UI, demo mode feels broken or incomplete.            | High     | Unify consumer hooks to strictly use `view` for all read-only surfaces.                            | No, future runtime PR |
| **Data Pollution in Demo** | Screens using `state` have action buttons (Save, Log).                  | Progress, Recovery, Nutrition, Training       | Potentially writing demo values to actual user state if mixed. | High     | Lock writes during Demo Mode or ensure writes apply strictly to `state` while reading from `view`. | No, future runtime PR |
| **Time Range Discrepancy** | `weeklyVolumeSeries` defaults to 14d, `volumeByMuscle` to 30d.          | Home, Progress                                | Conflicting perceived volume trends.                           | Low      | Standardize time range defaults in `analytics.ts` or explicitly pass ranges.                       | No, future runtime PR |
| **Missing AI Provenance**  | `todayMealTotals` sums all meals regardless of provenance confidence.   | Home, Nutrition                               | Untrusted AI data may skew daily totals and graphs.            | Medium   | Add filtering or visual indicators for unconfirmed AI data in summary calculations.                | No, future runtime PR |

## Future Validation Checklist

- [ ] Toggle Demo Mode ON. Compare FitCore score on Home vs. Progress screen.
- [ ] Toggle Demo Mode ON. Compare Readiness score on Home vs. Recovery screen.
- [ ] Log a meal on the Nutrition screen while Demo Mode is ON. Confirm no persisted state pollution.
- [ ] Log a weigh-in, confirm all weight-related graphs (Home popup, Progress) update correctly.
- [ ] Clear localStorage and confirm empty states are correct across all tabs.
- [ ] Test AI-generated meal log. Ensure low-confidence data behaves as expected in daily totals and graphs.
- [ ] Toggle graph modes in popup (volume 7d vs 30d), confirm dashboard mode persistence matches.

## Recommended Future Tasks

- **Runtime**: Refactor all read-only view components (`progress.tsx`, `nutrition.tsx`, `recovery.tsx`, `training.tsx`) to consume `useStore().view` instead of `useStore().state` to ensure Demo Mode consistency.
- **Runtime**: Implement a write-lock or write-validation mechanism when `demoMode` is true to prevent state pollution.
- **Runtime**: Update analytics helpers (`analytics.ts`) to accept an options object for filtering out low-confidence AI data or visually differentiating it.
- **Planning/Test**: Execute the Future Validation Checklist manually.
- **Planning**: Define a strict standard for default time windows across volume and progress graphs.
