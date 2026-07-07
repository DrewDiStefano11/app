# Nutrition Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before starting development of the FitCore Nutrition system features. Ensuring architecture, data, safety, and testing requirements are resolved beforehand.

## 2. Scope
This dependency map covers the following planned features:
- Manual meal logging
- Log meal popup
- AI/camera macro estimate flow
- User review before saving AI estimates
- Macro goals
- Nutrition dashboard cards
- Nutrition graphs
- Correction/deletion propagation
- Source/confidence labels
- Demo/test account separation
- AI/Jarvis meal logging and explanation

## 3. Product Bible Sources to Check
- `docs/product-bible/book-04-nutrition-system/README.md`
- `docs/product-bible/book-04-nutrition-system/01-nutrition-system-overview.md`
- `docs/product-bible/book-04-nutrition-system/02-meal-logging-and-food-entry.md`
- `docs/product-bible/book-04-nutrition-system/03-macro-estimation-and-food-ai.md`
- `docs/product-bible/book-04-nutrition-system/04-nutrition-data-model-philosophy.md`
- `docs/product-bible/book-04-nutrition-system/05-body-weight-and-feedback-loops.md`
- `docs/product-bible/book-04-nutrition-system/06-nutrition-coaching-and-safety.md`
- `docs/product-bible/book-02-system-architecture/README.md` (for Data Philosophy & Provenance)

## 4. Related Planning/Audit Inputs
- `docs/audits/ai-provenance-confidence-audit.md`
- `docs/audits/current-data-flow-audit.md`
- `docs/audits/dashboard-graph-data-consistency-audit.md`
- `docs/audits/popup-sheet-behavior-inventory.md`
- `docs/planning/ai-jarvis-source-permission-and-logging-map.md`

## 5. Required Data Dependencies
- **Provenance & Confidence Schema:** Must support robust source tagging (Manual, Verified, Jarvis, Camera) and confidence scores (0.0-1.0), tracking origin of AI estimations.
- **Correction Loop Support:** The schema must support preserving original AI metadata while updating log state to 'user_corrected' for future AI training loops.
- **Demo Mode Isolation:** Strict boundary enforcement for Demo modes so they never write test meals to true persistence storage.
- **Goal Persistence:** A consistent definition for daily/weekly Macro goals inside the user profile/state map.

## 6. Required UI Dependencies
- **Log Meal Popup Rules:** `BottomSheet` layout fixes, ensuring opacity and z-index correctness (`popup-sheet-behavior-inventory.md`). Use of `dvh`.
- **Review UI State:** A mandatory intermediary confirmation state for AI estimations before committing them to the data store.
- **Dashboard & Graphs:** Resolution of `useStore().state` vs `useStore().view` consistency issues for dashboard graphs and macro displays.

## 7. Required AI/Jarvis Dependencies
- **Explicit Confidence Logic:** Jarvis must soften recommendations and highlight low-confidence items (0.0-0.5).
- **Explanation Protocols:** Jarvis must cite data sources and explain macro suggestions without presenting estimates as fact.
- **Tooling Architecture:** Segregation of Meal logging tools inside the `src/lib/jarvis/tools.ts` to prevent merge conflicts with Training domains.

## 8. Required Privacy/Safety Dependencies
- **Opt-in Cloud/AI Boundaries:** Explicit checking of permissions prior to logging meals via photo/camera AI APIs, adhering to local-first medical privacy standards where applicable.
- **Disordered Eating Safeguards:** Handling rules for severely restricted caloric inputs or concerning trends as established in Book 4's safety protocols.

## 9. Required QA/Testing Dependencies
- Setup of mock camera APIs / AI responses for Playwright E2E tests for the AI macro estimate flow.
- Regression tests validating demo mode separation during meal entry.
- QA checks for visual confirmation states on "Save AI Estimate" buttons.

## 10. Implementation Sequence
1.  **Architecture:** Update schemas for Food Items/Logs to include Provenance and Confidence. Fix Demo state isolation.
2.  **UI Foundation:** Implement the Log Meal Popup and ensure the `BottomSheet` layout is safe.
3.  **Manual Flow:** Build the basic manual meal logging functionality.
4.  **AI Estimation Flow:** Wire up camera and text AI to return mock data, then build the "Review before Saving" UX.
5.  **Correction Loop:** Implement the logic where edits update confidence to 1.0/`user_corrected`.
6.  **Analytics Layer:** Build Macro Goal comparisons, Dashboard Cards, and Nutrition Graphs based on aggregated data.
7.  **Jarvis Integration:** Finalize Jarvis explanations and logging from chat context.

## 11. Unsafe Shortcuts
- Trusting AI output blindly without injecting the 'Review' confirmation screen.
- Overwriting original AI data upon correction instead of maintaining a history loop.
- Using `useStore().state` for dashboard read-outs where `useStore().view` is required, risking graph corruption during demo.

## 12. Suggested Future PR Breakdown
- PR 1: Nutrition Data Model updates (Provenance, Confidence, Macro structures).
- PR 2: UI Foundation updates (Log Meal Popups, Graph components).
- PR 3: Manual meal logging flow.
- PR 4: AI/Camera macro estimation and User Review workflow.
- PR 5: Dashboard Cards, Graphs, and Goal logic updates.
- PR 6: AI/Jarvis meal explanation context wiring.

## 13. Acceptance Criteria Before Runtime Work Starts
- Provenance/Confidence schemas are defined in `types.ts`.
- The 'Review before Saving' UX flow is mapped out.
- The `useStore().state` consistency audit findings are resolved.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| Provenance & Confidence Types | Yes | `docs/product-bible/book-04-nutrition-system/04-nutrition-data-model-philosophy.md` | Inability to track AI reliability or correction history | Create Type schema updates PR |
| 'Review Before Saving' UX Rules | Yes | `docs/audits/ai-provenance-confidence-audit.md` | Accidental/Bad AI data corrupting the user's log | Map out the Confirmation Modal |
| Fix `useStore` demo inconsistencies | Yes | `docs/audits/dashboard-graph-data-consistency-audit.md` | Charts/Data corruption in Demo mode | Resolve Store usage across components |
| BottomSheet UI fixes | Yes | `docs/audits/popup-sheet-behavior-inventory.md` | UI/UX breakage on Mobile for Meal Logging | Merge core UI layer fixes |
