# E2E Smoke Coverage Gap Map

## 1. Existing Smoke Tests
- `analytics-invariants.spec.ts`: Pure logic/unit tests for analytics engine.
- `analytics-workout-volume.spec.ts`: Pure logic/unit tests for workout volume utility.
- `app-pr-gate-smoke.spec.ts`: High-level render and navigation safety smoke test for CI.
- `bodyweight-weigh-in-validation-smoke.spec.ts`: Validation and interaction-based smoke test for weigh-ins.
- `chart-empty-data-smoke.spec.ts`: Render-only smoke test for charts without data.
- `core-logging-persistence-smoke.spec.ts`: End-to-end localStorage persistence verification.
- `daily-decision.spec.ts`: Pure logic tests for the daily decision engine.
- `dashboard-smoke.spec.ts`: Render and navigation smoke test for main dashboard components.
- `data-contract-invariants.spec.ts`: Data structure/invariants tests.
- `data-integrity.spec.ts`: Data integrity logic tests.
- `data-propagation-smoke.spec.ts`: Lifecycle and propagation testing for updates across tabs.
- `date-boundary-today-rollup-smoke.spec.ts`: Logical tests for calendar boundary rollovers.
- `empty-state-crash-smoke.spec.ts`: Render safety check for zero-state scenarios.
- `keyboard-focus-accessibility-smoke.spec.ts`: Accessibility focus test.
- `localstorage-compatibility-smoke.spec.ts`: Boot safety and schema compatibility test.
- `mobile-layout-overlay-smoke.spec.ts`: UI rendering check for mobile viewport sizes.
- `mobile.spec.ts`: Broad mobile interaction test.
- `navigation-smoke.spec.ts`: Broad navigation flow test.
- `no-fatal-app-errors-smoke.spec.ts`: Render safety check for uncaught exceptions.
- `nutrition-daily-view-panels-smoke.spec.ts`: UI rendering smoke test for Nutrition daily view.
- `nutrition-logging-validation-smoke.spec.ts`: Nutrition macro bounds and input validation.
- `popup-stack-and-scroll-lock-smoke.spec.ts`: UI interaction test for bottom sheets/modals.
- `progress-rich-data-smoke.spec.ts`: Render safety for Progress tab with populated data.
- `provenance.spec.ts`: Unit tests for provenance foundation.
- `quick-popup-open-close-regression.spec.ts`: Quick actions UI state regression test.
- `recovery-check-in-validation-smoke.spec.ts`: Input validation and persistence test for check-in.
- `reload-stability-smoke.spec.ts`: Lifecycle testing for navigation state after page reload.
- `rich-state-all-tabs-smoke.spec.ts`: Cross-tab rendering smoke test with full state.
- `settings-hub-render-smoke.spec.ts`: Settings hub render smoke test.
- `settings-hub-safety-smoke.spec.ts`: Settings hub interaction and validation smoke test.
- `smoke.spec.ts`: Basic high-level smoke test.
- `training-daily-view-panels-smoke.spec.ts`: Training tab panel render test.
- `unit-conversions.spec.ts`: Pure logic unit tests for conversion math.

## 2. Test Categories Summary
- **Pure Logic / Unit (Docs-Only equivalent for logic):** `analytics-invariants`, `analytics-workout-volume`, `daily-decision`, `data-contract-invariants`, `data-integrity`, `provenance`, `unit-conversions`.
- **Render-Only:** `chart-empty-data-smoke`, `empty-state-crash-smoke`, `mobile-layout-overlay-smoke`, `no-fatal-app-errors-smoke`, `nutrition-daily-view-panels-smoke`, `progress-rich-data-smoke`, `settings-hub-render-smoke`, `training-daily-view-panels-smoke`.
- **Navigation/Lifecycle:** `app-pr-gate-smoke`, `dashboard-smoke`, `navigation-smoke`, `reload-stability-smoke`, `smoke`, `mobile`.
- **Interaction/Validation:** `bodyweight-weigh-in-validation-smoke`, `keyboard-focus-accessibility-smoke`, `nutrition-logging-validation-smoke`, `popup-stack-and-scroll-lock-smoke`, `quick-popup-open-close-regression`, `recovery-check-in-validation-smoke`, `settings-hub-safety-smoke`.
- **LocalStorage/Data Propagation:** `core-logging-persistence-smoke`, `data-propagation-smoke`, `date-boundary-today-rollup-smoke`, `localstorage-compatibility-smoke`, `rich-state-all-tabs-smoke`.

## 3. Duplication & Overlap
- **Smoke/Navigation:** `smoke.spec.ts`, `app-pr-gate-smoke.spec.ts`, `navigation-smoke.spec.ts`, and `dashboard-smoke.spec.ts` have overlapping intent to verify basic app boot and tab switching. They could be consolidated.
- **Empty State/Fatal Errors:** `empty-state-crash-smoke.spec.ts` and `no-fatal-app-errors-smoke.spec.ts` likely cover similar ground regarding zero-state crash prevention.
- **Mobile Render:** `mobile.spec.ts` and `mobile-layout-overlay-smoke.spec.ts` overlap.
- **Settings:** `settings-hub-render-smoke.spec.ts` and `settings-hub-safety-smoke.spec.ts` could be merged as one tests the render and the other tests safety features on the same page.

## 4. Gaps & Areas for Future Smoke Coverage
- **Nutrition AI Features:** Once implemented, safe validation of the photo upload and macro extraction API boundary.
- **Goal Mode / Codex Features:** Future state transitions when user goal modes are fully built out.
- **Progress Export/Share:** Verification of the "share" or export functionality in the Progress view if introduced.
- **Deep Deep Dive Toggles:** Broad smoke tests covering the layout shift between "Daily View" and "Deep Dive" modes once stable.

## 5. Blocked Areas (Pending PRs)
Do not introduce new tests or refactor existing ones for the following areas until current PRs #145, #146, and #147 are merged or closed:
- Core UI layout transitions.
- Settings hub logic (specifically do not touch `settings-hub-render-smoke.spec.ts` and `settings-hub-safety-smoke.spec.ts`).
- Boot safety regarding corrupted states (do not touch `corrupt-localstorage-boot-safety-smoke.spec.ts`).
- Workout active session lifecycles (do not touch `active-workout-lifecycle-smoke.spec.ts`).

## 6. Recommendations for Future Test Tasks
- **Consolidation Task (Navigation):** Merge `navigation-smoke.spec.ts`, `smoke.spec.ts`, and `dashboard-smoke.spec.ts` into a unified `main-routing-smoke.spec.ts`.
- **Consolidation Task (Render Safety):** Combine `empty-state-crash-smoke.spec.ts` and `no-fatal-app-errors-smoke.spec.ts` into a `zero-state-render-safety.spec.ts`.
- **New Feature Task (Nutrition):** Prepare a mock-based test suite for `nutrition-ai-logging-smoke.spec.ts` (blocked until UI is stable).
- **Maintenance Task:** Review and clean up generic naming (`smoke.spec.ts`) to reflect explicit boundary checks.
