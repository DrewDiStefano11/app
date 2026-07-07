# FitCore Test Coverage Strategy

## 1. Purpose
This document outlines a structured testing strategy for FitCore, identifying what tests are needed beyond the current CI/build checks and Playwright end-to-end tests. The goal is to incrementally build a robust, safe testing layer that ensures data integrity, AI/Jarvis safety, and a reliable user experience across the app. This strategy strictly avoids large, monolithic testing pull requests in favor of small, focused PRs grouped by risk area.

## 2. Current Known Validation Layers
- Continuous Integration (CI) and build checks are in place (or in progress via parked PRs like PR #14).
- Playwright is used for full user flow and mobile end-to-end (E2E) testing.
- Manual Quality Assurance (QA) checklists and audits.
- *Note:* PR #14 (CI workflow), PR #34 (popup positioning), and PR #2 (Jarvis voice mode) are parked/draft and must not be touched. Existing layouts and runtime PRs are active; this document is designed to avoid overlap.

## 3. Missing Test Categories
FitCore requires systematic testing in the following areas:

- **Unit tests for pure calculation logic:** Validation of isolated calculations and helpers.
- **Store/reducer tests:** Verification of state transitions and updates.
- **Data propagation tests:** Ensuring logs are correctly propagated across the app (no-wasted-data principle).
- **Local storage / reload persistence tests:** Validating app recovery and hydration states.
- **AI/Jarvis typed logging safety tests:** Validating strict schemas, source tracking, and permission boundaries.
- **Manual vs AI-created log equivalence tests:** Ensuring AI-generated entries behave consistently with manual inputs.
- **Empty-state tests:** Fallbacks and UI handling when no data exists.
- **Accessibility tests:** Ensuring ARIA labels, focus states, and color independence.
- **Mobile layout regression tests:** Validating layout shifts and responsiveness on smaller screens.
- **Error boundary / invalid input tests:** Graceful failure states and recovery from bad inputs.
- **Time-window tests for Morning Check-In and Night Review:** Verifying form visibility strictly based on time criteria.
- **Score calculation tests:** Validation of FitCore Score and Readiness Score algorithms.
- **Graph/trend data tests:** Ensuring accurate rendering and data filtering in visualizations.
- **Privacy/export/delete behavior tests (later):** Data portability and cleanup.
- **Performance/bundle smoke checks (later):** Monitoring core web vitals and bundle regressions.
- **Visual regression tests (later):** Pixel-perfect layout validations (only if lightweight).

## 4. Recommended Test Stack
- **Pure Unit Tests:** Use the existing project testing tools (e.g., Vitest/Jest via Bun, if available). Do not add new testing frameworks unless existing tools cannot support the required tests. Prefer pure unit tests for calculations, score generation, and data helpers.
- **Store & State Tests:** Utilize the existing testing framework to run isolated store/reducer updates.
- **End-to-End & Layout:** Prefer Playwright only for full user flows, mobile UI behavior, accessibility checks, and mobile layout regression.

## 5. Priority Order
Test implementation should strictly follow this priority order to minimize risk and avoid overlap with active UI work:

1. **Test script/package audit only:** Verify current test runner configuration without adding tests.
2. **Pure calculation unit tests:** (e.g., FitCore Score, Nutrition macros).
3. **Store/data propagation tests:** Validating global state consistency.
4. **Persistence/reload tests:** Local storage rehydration and demo mode transitions.
5. **Jarvis typed logging safety tests:** Validating AI schema constraints.
6. **Accessibility smoke tests:** Focus management and ARIA states via Playwright.
7. **Mobile layout regression tests:** Viewport-specific Playwright tests.

## 6. Tests to Add Before First Usable Testing Version
To meet the initial user testing threshold, the following minimal testing guarantees are required:

- **Pure Calculations:** Validation of FitCore Score and Readiness Score.
- **Data Consistency:** Unit tests for nutrition macros, workout logging, and active workout sets.
- **Store Updates:** Verification of store state after meal logging (manual and photo/AI meal estimates) and sleep entries.
- **Safety Boundaries:** Jarvis audit/undo entries, and Jarvis typed logging safety tests to ensure AI guardrails are respected.
- **Core Flows:** Time-window tests for Morning Check-In and Night Review routines.

## 7. Tests That Can Wait Until Later
The following tests are deferred to subsequent implementation waves:
- Privacy/export/delete behavior tests.
- Performance/bundle smoke checks.
- Visual regression tests (only if lightweight).
- Deep edge cases for empty-state tests and soreness/pain graphs (unless causing fatal errors).
- Complex bodyweight, insights trends, and graph/trend data visual testing.

## 8. Files Likely Involved Later
Future testing PRs will likely involve (but are not limited to):
- `tests/unit/**/*.test.ts` (new directories)
- `tests/e2e/helpers/fitcore-test-state.ts` (Playwright E2E updates)
- `src/lib/store.tsx` (for state verification logic)
- `src/lib/fitcore-data.ts` (calculations and validations)
- `src/lib/jarvis/tools.ts` (testing AI tool schemas)

## 9. Files to Avoid While Active PRs Are In Progress
To prevent conflicts with active UI and runtime implementations, avoid modifying:
- `.github/workflows/*` (Keep CI workflow changes separate because PR #14 is parked).
- Any runtime UI files (e.g., `src/components/app/*`, layout primitives, or popup sheets).
- `package.json`, `bun.lockb`, or any lockfiles.
- Schema, migration, or Product Bible files.
- Active layout or AI runtime components like `src/components/app/active-workout.tsx`.

## 10. Acceptance Criteria
Future testing PRs will be evaluated against:
- Small, focused PR scope (no monolithic testing PRs).
- Tests must pass reliably and independently of runtime network states.
- Pure calculation testing utilizes lightweight unit tests, while UI flows utilize Playwright.
- No new heavy testing dependencies added without prior validation.
- All FitCore explicit test cases (FitCore Score, Readiness Score, Nutrition macros, Workout logging, Active workout sets, Meal logging, Photo/AI meal estimates, Sleep entries, Soreness and pain, Bodyweight, Morning Check-In, Night Review, Jarvis audit/undo entries, Insights trends, Data reload/persistence) are accounted for in the strategy.

## 11. Suggested Small PR Sequence
To safely introduce test coverage, proceed with the following isolated PRs:

1. **Test script/package audit only:** Verify and document current test scripts without adding frameworks.
2. **Pure calculation unit tests:** Add tests strictly for helper functions (FitCore Score, Readiness Score, Nutrition macros).
3. **Store/data propagation tests:** Validate state transitions for workout logging, meal logging, and sleep entries.
4. **Persistence/reload tests:** Validate data reload/persistence and local storage synchronization.
5. **Jarvis typed logging safety tests:** Validate schema safety for photo/AI meal estimates and Jarvis audit/undo entries.
6. **Accessibility smoke tests:** Integrate standard ARIA and color-contrast assertions.
7. **Mobile layout regression tests:** Playwright validations for mobile viewport shifts and touch targets.
