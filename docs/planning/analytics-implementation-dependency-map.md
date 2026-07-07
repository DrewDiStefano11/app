# Analytics Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before starting the development of the FitCore Analytics, Insights, and Health Twin features. This ensures that cross-domain data is properly aggregated, visualizations are consistent, and AI insights are safe and explainable.

## 2. Scope
This dependency map covers the following planned features:
- Dashboard cards
- Graph popups
- Graph mode persistence
- Body heatmap
- Both sides of body
- FitCore score explanation
- Trend/average calculations
- Data source labels
- Confidence display
- Health Twin analytics
- Data propagation from all logging flows
- Empty/loading/error states

## 3. Product Bible Sources to Check
- `docs/product-bible/book-09-analytics-insights-and-health-twin/README.md`
- `docs/product-bible/book-09-analytics-insights-and-health-twin/01-analytics-insights-and-health-twin-overview.md`
- `docs/product-bible/book-09-analytics-insights-and-health-twin/02-fitcore-score-and-readiness-insights.md`
- `docs/product-bible/book-09-analytics-insights-and-health-twin/04-health-twin-model-and-longitudinal-context.md`
- `docs/product-bible/book-09-analytics-insights-and-health-twin/06-graphs-dashboards-and-user-facing-visualizations.md`
- `docs/product-bible/book-02-system-architecture/README.md` (Data/No-Wasted-Data principles)
- `docs/product-bible/book-05-ux-ui-and-user-experience/README.md`

## 4. Related Planning/Audit Inputs
- `docs/audits/dashboard-graph-data-consistency-audit.md`
- `docs/audits/ai-provenance-confidence-audit.md`
- `docs/audits/error-empty-loading-state-audit.md`
- `docs/planning/data-propagation-and-no-wasted-data-map.md`

## 5. Required Data Dependencies
- **"No Wasted Data" Propagation Matrix:** Implementation of data buses ensuring that every log (Nutrition, Training, Recovery) dynamically updates the core analytics engine without silos.
- **FitCore Score Calculation:** The explicit math, rules, and weighting for the aggregate FitCore score, including how it handles missing or low-confidence data.
- **Trend/Averaging Logic:** Standardized calculation utilities for 7-day, 30-day, and all-time trends, taking into account outliers.
- **Health Twin Model Schema:** The long-term timeline-based schema requirements necessary to run simulation logic.

## 6. Required UI Dependencies
- **Graphing Core Library:** Standardized, reusable chart components (Line, Bar, Heatmap) that support mode persistence (e.g., Weekly vs Monthly views).
- **Body Heatmap Assets:** SVGs or rendering logic required to display "both sides of the body" for training volume and soreness mapping.
- **Empty/Error/Loading State Wrappers:** Standardized UI fallbacks for analytics blocks based on `error-empty-loading-state-audit.md`.

## 7. Required AI/Jarvis Dependencies
- **Source-Backed Explainability:** AI insight generators must be wired to explicitly reference underlying data sources (provenance labels) and confidence metrics.
- **Health Twin Simulation Prompts:** System rules for how AI generates long-term health simulation insights based on current trends.

## 8. Required Privacy/Safety Dependencies
- **Privacy-Safe Aggregation:** Ensuring that sensitive recovery/medical data used in trend analysis cannot leak into unauthorized AI contexts without explicit opt-in.
- **Anti-Gamification Rules:** Visualizing scores in a way that promotes healthy behavior, rather than dangerous over-training, as per Book 9 principles.

## 9. Required QA/Testing Dependencies
- **Demo Mode Isolation Validation:** Extensive testing to ensure dashboard graphs only reflect `useStore().view` in demo mode, avoiding real data pollution as identified in previous audits.
- **Visual Regression Testing:** Snapshots for complex graph popups and heatmap states across mobile dimensions.

## 10. Implementation Sequence
1.  **Architecture:** Resolve `useStore().state` vs `useStore().view` discrepancies for data propagation.
2.  **Core Services:** Build Trend/Average calculation utilities and FitCore score mathematical engine.
3.  **UI Foundation:** Build standard Empty/Loading/Error components and generic Graph Wrappers.
4.  **Visualizations:** Implement Body Heatmap, standard Dashboard Cards, and Confidence Labels.
5.  **Analytics Pages:** Build Graph Popups, detail views, and persistence logic for selected timeframes.
6.  **Insights Layer:** Wire up AI explanations for the FitCore score and Health Twin simulations.

## 11. Unsafe Shortcuts
- Ignoring empty/loading states resulting in UI layout shifts or crash loops.
- Mixing `state` and `view` arbitrarily in dashboard calculations.
- Displaying aggregate scores without a clear "why" or source explanation.
- Rendering complex charts without mobile-first dynamic viewport consideration.

## 12. Suggested Future PR Breakdown
- PR 1: Core Calculation Utilities (Averages, Trends, FitCore Score engine).
- PR 2: UI Foundation (Empty states, Graph wrappers, `useStore` fixes).
- PR 3: Dashboard Cards and Basic Analytics propagation.
- PR 4: Advanced Visualizations (Body Heatmap, Detailed Graph Popups).
- PR 5: Health Twin data modeling and AI Insight explainability.

## 13. Acceptance Criteria Before Runtime Work Starts
- `dashboard-graph-data-consistency-audit.md` issues are resolved at the store level.
- FitCore Score algorithm is formally defined and approved.
- Empty/Error state design patterns are finalized.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| Store State vs View Fixes | Yes | `docs/audits/dashboard-graph-data-consistency-audit.md` | Dashboard charts corrupting or showing incorrect Demo data | Execute the `useStore` cleanup PR |
| FitCore Score Algorithm Definition | Yes | `docs/product-bible/book-09-analytics-insights-and-health-twin/README.md` | Meaningless or unpredictable analytics | Product definition of weighting rules |
| Empty/Loading Component Standard | Yes | `docs/audits/error-empty-loading-state-audit.md` | Ugly layout shifts on slower data loads | Create generic fallback UI wrappers |
| Body Heatmap Logic/Assets | Yes | `docs/product-bible/book-09-analytics-insights-and-health-twin/README.md` | Inability to map soreness/volume accurately | Acquire or define the SVG/Component |
