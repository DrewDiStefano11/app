# Dashboard Graph Propagation Implementation Readiness Checklist

## Purpose
This document provides a readiness checklist for implementing data propagation across the dashboard and graphs. It ensures that data entered from any source accurately, immediately, and consistently updates all relevant views according to the "no-wasted-data" principle. **Note: This is a docs-only planning file. No runtime app code is being modified. Features described here are planned, not necessarily implemented.**

## Scope
The scope includes tracking the flow of data from various input sources to the dashboard cards, underlying graphs, daily summaries, and the FitCore Score calculations. It also covers the handling of derived calculations, empty/error states, and demo mode isolation.

## Product Bible Sources Checked
* Book 9 (Analytics, Insights, and the Health Twin)
* Book 10 (Testing/QA/Platform Engineering) if merged/existing.
* (Book 6 is reserved/future-domain and is not included).

## Data Propagation Requirements From:
* **Meals:** Logged meals (calories, macros) must immediately update the daily nutrition summary and historical nutrition graphs.
* **Check-ins:** Subjective recovery signals must propagate to the recovery score and daily decision engine.
* **Weigh-ins:** Body weight entries must instantly reflect on the current weight dashboard card and the historical weight trend graph.
* **Workouts:** Completed workouts must update weekly volume metrics, muscle heatmaps, and exercise progression graphs.
* **Recovery/Sleep:** Sleep data must update recovery insights and modify training recommendations.
* **Wearable Imports:** Synced data must merge cleanly with existing data without creating duplicates.
* **AI/Jarvis Logs:** Any data points extracted and confirmed via Jarvis chat must propagate just like manual entries.
* **User Corrections:** Editing a previous log must trigger a recalculation of all derived metrics for that time period.
* **User Deletions:** Deleting a log must immediately remove its contribution from all associated dashboards and graphs.

## Dashboard Card Update Requirements
* Dashboard cards must react immediately to new data without requiring a manual page refresh.
* State management must ensure that the `view` layer stays synchronized with the underlying `state` changes.

## Graph Update Requirements
* Graphs opened from dashboard cards must reflect the most up-to-date data state.
* If a graph is currently open and new data is synced in the background, the graph should update seamlessly if technically feasible, or upon next open.

## Summary Update Requirements
* Daily and weekly summaries must aggregate data correctly, respecting boundaries (e.g., timezone shifts, start of week).
* These summaries must recalculate accurately when underlying data points are corrected or deleted.

## FitCore Score Explanation Requirements
* The FitCore Score is a derived metric. Any change to underlying health, training, or nutrition data must trigger a re-evaluation of the score.
* The explanation popup for the score must accurately reflect the specific data points that contributed to the current calculation.

## Source/Confidence Display Requirements
* When displaying aggregated data (like a weekly average), if significant portions of that data are derived from low-confidence AI estimates, this should be visually indicated (e.g., a "Contains Estimates" badge).
* Individual data points on graphs must clearly show their provenance (Manual, Verified, AI, Camera) and confidence level on hover or tap.

## Derived Calculation Invalidation
* Derived metrics (e.g., weekly averages, moving trends, FitCore score) must be explicitly invalidated and recalculated when underlying raw data is modified (corrected or deleted) to prevent stale or conflicting information.

## Empty/Loading/Error States
* Dashboard cards and graphs must handle situations where propagation is delayed (loading state) or fails (error state) gracefully.
* Empty states should clearly differentiate between "no data entered yet" and "data failed to load".

## Demo/Test Account Separation
* Data propagation within Demo mode must strictly utilize demo state variables and never pollute the real user database or local storage (`fitcore.v1`).
* The conflicting usage of `useStore().state` vs `useStore().view` during demo mode (as identified in audits) must be resolved before full implementation.

## Acceptance Checklist
- [ ] Logged meals update nutrition cards and graphs immediately.
- [ ] Weigh-ins update weight trends immediately.
- [ ] Completed workouts update volume metrics and heatmaps immediately.
- [ ] User corrections to past data trigger accurate recalculations of derived metrics.
- [ ] Deletions correctly remove data from all views.
- [ ] FitCore score recalculates upon relevant data changes.
- [ ] Source and confidence badges are visible on relevant graph data points.
- [ ] Empty and loading states are handled gracefully during data fetching/aggregation.
- [ ] Demo mode writes are completely isolated from real user data.

## Failure Examples
* A user logs a 500-calorie meal, but the daily summary card does not update until the app is restarted.
* A user deletes a weigh-in, but the point remains visible on the 1-month weight trend graph.
* Demo mode actions alter data visible upon logging out and logging back in with a real account.
* A weekly average calculation includes a deleted workout session because the cache was not invalidated.

## Suggested Future PR Breakdown
1. **State Mgmt Fixes:** Resolve `useStore().state` vs `.view` conflicts and solidify demo boundaries.
2. **Event Hooks:** Implement reliable data-change event hooks or subscriptions for dashboard cards.
3. **Derived Metrics:** Standardize the recalculation logic for derived summaries and the FitCore Score.
4. **UI Integration:** Ensure graphs and cards correctly subscribe to state changes and display provenance.

## Final Propagation Matrix
| Data Source | Target View | Recalculation Required |
| :--- | :--- | :--- |
| Weigh-in | Dashboard Card, Graph | Weekly Average, Trendline |
| Meal | Summary, Graph | Daily Totals, Calorie Deficit |
| Workout | Heatmap, Volume Graph | Weekly Volume, FitCore Score |
| Correction | All relevant views | All derived metrics in timeframe |
