# Wave 2 Data Propagation Code-Scope Audit

## 1. Purpose and scope
This audit prepares the codebase for Wave 2 runtime implementation, which follows Wave 1 (core logging popups). Wave 2 focuses on establishing reliable data propagation so that user data flows properly into dashboard cards, graphs, derived summaries, and persistence. It also covers source/manual labels, correction/deletion paths, and ensuring state vs. demo mode integrity.

**Note:** This is a docs-only audit. It inspects runtime files to establish implementation boundaries and risk but does not modify runtime code.

## 2. Source docs checked
* `docs/planning/implementation-start-handoff.md`
* `docs/planning/post-product-bible-cleanup-plan.md`
* `docs/planning/post-bible-agent-task-queue.md`
* `docs/planning/data-propagation-and-no-wasted-data-map.md`
* `docs/planning/dashboard-graph-propagation-implementation-readiness-checklist.md`
* `docs/planning/source-labels-and-confidence-model-plan.md`
* `docs/planning/correction-deletion-propagation-plan.md`
* `docs/audits/wave-01-core-logging-code-scope-audit.md`
* `docs/audits/current-data-flow-audit.md`
* `docs/audits/state-view-usage-map.md`
* `docs/audits/dashboard-graph-data-consistency-audit.md`
* `docs/audits/graph-dashboard-current-behavior-audit.md`
* `docs/audits/meal-logging-current-behavior-audit.md`
* `docs/audits/check-in-current-behavior-audit.md`
* `docs/audits/weigh-in-current-behavior-audit.md`

## 3. Runtime files inspected
| File path | Ownership | Flows affected | Risk level | Likely Wave 2 changes | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/lib/store.tsx` | Central state management | Persistence, state vs view, demo mode isolation | High | Correcting `.state` vs `.view` conflict in demo mode; adding source label schema to logs | High risk file, central to entire app. |
| `src/lib/persist.ts` | LocalStorage handling | Persistence | Medium | Ensure accurate `fitcore.v1` writes. | Needs to ignore demo data. |
| `src/components/app/views/home.tsx` | Dashboard view | Dashboard cards, summaries | High | Standardizing data subscriptions (fixing `.view` vs `.state`). | Heavily overloaded file. |
| `src/components/app/views/nutrition.tsx` | Nutrition UI | Nutrition graphs | Low | Hooking up correctly to state summaries. | |
| `src/components/app/views/progress.tsx` | Progress UI | Progress & bodyweight graphs | Medium | Ensuring graphs re-render correctly on data update. | |
| `src/components/app/views/recovery.tsx` | Recovery UI | Check-in/recovery graphs | Medium | Ensuring graphs re-render correctly on data update. | |
| `src/lib/fitcore-data.ts` | Data helpers | Derived summaries, source provenance | Medium | Modifying `getNutritionSummary` and similar derived helpers to respect source/confidence labels. | Central data utility. |
| `src/lib/analytics.ts` | Analytics logic | Summary helpers, score derivation | High | Updating FitCore Score calculations to respect edits/deletions. | |

## 4. Data propagation map
* **Meal entries**: Propagates to Nutrition dashboard, daily summaries, Progress graphs.
* **Check-in entries**: Propagates to Recovery dashboard, Readiness score, FitCore score.
* **Weigh-in entries**: Propagates to Progress graphs, moving averages.
* **Workout entries (downstream context)**: Propagates to Progress/Training graphs, muscle heatmaps, volume metrics.

## 5. Dashboard propagation analysis
Currently, dashboard cards rely on immediate React state reactivity. However, as noted in previous audits, the conflicting use of `useStore().state` vs `useStore().view` during demo mode causes potential view inconsistencies. Wave 2 must standardize all dashboard cards in `home.tsx` to read consistently, ensuring updates flow automatically without page refresh.

## 6. Graph propagation analysis
Graphs in `progress.tsx` and `nutrition.tsx` derive data from summaries in `fitcore-data.ts` and `analytics.ts`. Wave 2 will need to guarantee that these derived calculations properly invalidate or update when new data is added, so the user doesn't see stale graph data.

## 7. State vs view/demo mode risk analysis
The biggest architectural risk in Wave 2 is the Demo Mode separation. Modifying the `StoreContext` in `src/lib/store.tsx` to safely separate persistent user `state` from volatile `view` (demo data) must be done cleanly. Failing to do so could result in demo data polluting the `fitcore.v1` local storage cache or real user data leaking into demo calculations.

## 8. Source/manual/confidence label analysis
Source provenance (manual vs AI vs verified) needs to be visualized on logged entries. `fitcore-data.ts` already has some functions (`createAiEstimateProvenance`, `createJarvisProvenance`). Wave 2 will need to ensure these existing label systems correctly map to the UI (e.g., in `home.tsx` recent activity logs).

## 9. Correction/deletion propagation analysis
Currently, the ability to correct or delete logs exists but might leave derived metrics stale. Wave 2 needs to verify that existing code properly recalculates daily totals and FitCore scores when a base log is modified. This primarily affects logic in `analytics.ts` and `fitcore-data.ts`.

## 10. File overlap analysis
`src/lib/store.tsx`, `src/lib/fitcore-data.ts`, and `src/components/app/views/home.tsx` are the heavily shared files. Modifying data propagation mechanisms touches the core foundation of the app state.

## 11. Recommended Wave 2 PR breakdown
* **Recommendation**: **One combined PR** is strongly recommended.
* **Reasoning**: The files involved (`store.tsx`, `home.tsx`, `fitcore-data.ts`, `analytics.ts`) are so deeply coupled regarding data derivation and propagation that attempting to split this into UI vs Data PRs will almost certainly cause severe merge conflicts or broken runtime states in the middle of the wave.

## 12. Out-of-scope list
* AI/Jarvis implementation
* graph redesign
* active workout
* privacy/settings deletion UI
* schema migrations
* package/lockfile/config/workflow changes
* service worker changes

## 13. Final recommendation table

| Area | Likely files | Recommended PR | Parallel safe? | Risk | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Propagation & State | `store.tsx`, `fitcore-data.ts`, `persist.ts` | 2A (Combined) | No | High | Core state fixes; high conflict risk if split. |
| Dashboard & UI | `home.tsx`, `analytics.ts`, `progress.tsx` | 2A (Combined) | No | High | Relies heavily on State changes; must combine. |

**Important Note:** Wave 2 depends on the UI popup structure implemented in Wave 1. A quick refresh of `home.tsx` and related state logic may be needed after the Wave 1 implementation PR is merged to ensure alignment.
