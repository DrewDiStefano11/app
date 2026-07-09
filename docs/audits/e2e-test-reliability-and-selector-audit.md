# E2E Test Reliability and Selector Audit

## Scope

This audit reviews the Playwright test suite in `tests/e2e/` to evaluate the reliability of selectors, the robustness of test flows against hydration and UI changes (like collapsed navigation), and the risk of tests breaking after upcoming layout updates (Daily View / Deep Dive and subtab modifications). It focuses on identifying ambiguous locators, fragile workarounds, and tests relying on potentially changing UI components.

## Executive Summary

The test suite currently functions but exhibits several anti-patterns that create fragility, particularly `.first()` usage due to duplicate element names (often between top-level UI and bottom sheets), collapsed navigation workarounds (`Expand navigation`), and direct string matching that can break during layout changes. Upcoming Daily View / Deep Dive features will heavily impact tests currently asserting strictly against top-level structures. Several tests, particularly `smoke.spec.ts`, are too broad and should be broken down.

## Current E2E Test Map

- `tests/e2e/smoke.spec.ts`: Broad coverage, highly fragile.
- `tests/e2e/data-integrity.spec.ts`: Tests persistence, relies heavily on `.first()` and `fitcore.v1` local storage bypasses.
- `tests/e2e/data-propagation-smoke.spec.ts`: Tests flow between tabs, stable but uses `.first()` for data verification.
- `tests/e2e/active-workout-lifecycle-smoke.spec.ts`: Tests complex flow, uses `Expand navigation`.
- `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts`: Tests nutrition tab, uses `Expand navigation` heavily.
- `tests/e2e/training-daily-view-panels-smoke.spec.ts`: Tests training tab, uses `Expand navigation` heavily.
- `tests/e2e/progress-rich-data-smoke.spec.ts`: Tests progress tab.
- `tests/e2e/analytics-invariants.spec.ts` & `tests/e2e/analytics-workout-volume.spec.ts`: Unit/Integration-style, very stable.
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`: Validation tests, uses `.first()`.

## Tests That Appear Stable

- `tests/e2e/analytics-invariants.spec.ts`: Tests logic directly, isolated from UI.
- `tests/e2e/analytics-workout-volume.spec.ts`: Tests logic directly, isolated from UI.
- `tests/e2e/app-pr-gate-smoke.spec.ts`: Generally passes, acts as a high-level gate.
- `tests/e2e/navigation-smoke.spec.ts`: Straightforward navigation verification.

## Tests That Appear Fragile

- `tests/e2e/smoke.spec.ts`: A monolith test covering too many flows. Relies heavily on `.first()` for overlapping UI elements (e.g. `logMealSheet.getByRole('button').filter({ has: page.locator('svg') }).first().click()`).
- `tests/e2e/data-integrity.spec.ts`: Bypasses setup with `localStorage.setItem("fitcore.v1", ...)` but struggles with overlapping DOM elements, relying on `nav.getByRole("button", { name: /Expand navigation/i })`.
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`: Uses `.first()` to target input fields (e.g., `sheet.getByRole("spinbutton").first().fill("181.4")`).
- `tests/e2e/data-propagation-smoke.spec.ts`: Uses `.first()` when verifying propagated values to avoid strict mode violations.

## Ambiguous Selectors

- **The `.first()` Anti-Pattern**: Widespread use of `.first()` to resolve ambiguous locators.
  - `tests/e2e/smoke.spec.ts`: Targeting sheet close buttons or random SVG buttons (`.filter({ has: page.locator('svg') }).first()`).
  - `tests/e2e/data-propagation-smoke.spec.ts`: Validating values (`page.getByText("181.6").first()`).
  - `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`: Targeting inputs (`sheet.getByRole("spinbutton").first()`).
- **Generic Role Targeting**:
  - `page.getByRole('button', { name: 'Settings', exact: true })` and `.or(page.locator('.lucide-circle-user'))`.
- **Text Matching Issues**:
  - `page.getByText('FitCore Today', { exact: true }).or(page.getByText('FitCore Score'))` indicates flux in header naming.

**P2: Brittle selectors or weak assertions.** The use of `.first()` is a code smell indicating that the selector is not uniquely identifying the intended element, making tests susceptible to breaking if DOM order changes.

## Hydration / Pre-Render Risks

Tests that set `localStorage.setItem('fitcore.v1', JSON.stringify({ onboardingComplete: true }));` (e.g., `smoke.spec.ts`, `mobile.spec.ts`, `data-integrity.spec.ts`, `provenance.spec.ts`) bypass the onboarding flow. If the page is evaluated before hydration completes, the app might temporarily show the onboarding screen or an empty state, leading to flaky failures if the test expects the dashboard immediately.

**P1: Tests likely to fail during toggle/subtab work unless rewritten.** Tests heavily reliant on initial state assumptions may race with the new hydration strategies needed for Daily View/Deep Dive.

## Collapsed Navigation Risks

The mobile-first design collapses bottom navigation on scroll. Many tests implement explicit workarounds to expand it:
- `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts`: Uses `page.getByRole('button', { name: 'Expand navigation' })` multiple times.
- `tests/e2e/training-daily-view-panels-smoke.spec.ts`: Uses `page.getByRole('button', { name: 'Expand navigation' })` multiple times.
- `tests/e2e/active-workout-lifecycle-smoke.spec.ts`: Uses `page.getByRole('button', { name: 'Expand navigation' })`.
- `tests/e2e/data-integrity.spec.ts`: Uses `nav.getByRole("button", { name: /Expand navigation/i })`.
- `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts`: Uses `page.getByRole('button', { name: /^Expand navigation/ })`.
- `tests/e2e/recovery-check-in-validation-smoke.spec.ts`: Hardcodes state context `page.getByRole('button', { name: 'Expand navigation, current section Home' })`.

**P0: Tests that are currently invalid or can hide serious broken app behavior.** The reliance on finding and clicking "Expand navigation" indicates that the tests do not naturally interact with the UI as a user would when scrolling, or that the scroll state is improperly managed during tests.

## Tests Likely To Break After Toggle/Subtab PR

The upcoming Daily View / Deep Dive PR will alter the main layout from a flat dashboard into subtabs or deeper views.
- `tests/e2e/smoke.spec.ts`: Navigates to 'Train', 'Fuel', 'Recover', 'Stats', and 'Home' directly expecting specific headings (`page.getByRole('heading', { name: 'Training' })`).
- `tests/e2e/navigation-smoke.spec.ts`: Explicitly verifies top-level navigation which will change.
- `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts` & `tests/e2e/training-daily-view-panels-smoke.spec.ts`: Rely on current flat structures.

## Tests That Should Be Rewritten After Toggle/Subtab PR

- `tests/e2e/smoke.spec.ts`: Needs to be broken down into smaller, focused tests (e.g., separate onboarding, workout logging, meal logging).
- `tests/e2e/data-integrity.spec.ts` & `tests/e2e/data-propagation-smoke.spec.ts`: Selectors need to be updated to target the new layout structures without relying on `.first()`.
- Navigation and layout tests will need complete overhaul to reflect the new tab/subtab paradigm.

## Missing Coverage

- Isolated component tests for bottom sheets and complex inputs (e.g., spinbuttons) to remove the need for E2E tests to heavily test internal sheet validation.
- Direct programmatic interaction tests for context menus or complex navigation states.

## Recommended Test Cleanup PRs

1. **Selector Hardening**: Replace `.first()` instances with robust, specific `data-testid` attributes or more precise ARIA locators, especially in sheets and forms.
2. **Smoke Test Decomposition**: Split `tests/e2e/smoke.spec.ts` into isolated flows.
3. **Navigation Helper**: Abstract the "Expand navigation" logic into a central helper that reliably handles the collapsed state transparently for test authors, or ensure scroll state is reset.
4. **Hydration Awaiter**: Implement a consistent helper to wait for the `fitcore.v1` state to hydrate before asserting UI elements in tests bypassing onboarding.

## Validation Performed

Commands executed:
- `bun run build`
- `npx playwright test tests/e2e/app-pr-gate-smoke.spec.ts`
- `npx playwright test tests/e2e/navigation-smoke.spec.ts`
- `npx playwright test tests/e2e/data-propagation-smoke.spec.ts`
- `npx playwright test`

Test failures were observed (e.g. timeouts) related to complex flows, but no modifications were made to the tests during this audit.

## Confidence and Open Questions

**Confidence**: High. The patterns of fragility (`.first()`, `Expand navigation`) are widespread and clearly identifiable. The upcoming toggle/subtab PR will definitively break tests that rely on current top-level navigation assumptions.

**Open Questions**:
- Will the Daily View / Deep Dive layout introduce new ARIA roles or navigation patterns that require updates to the custom Playwright test environment?
- How should we handle the "Expand navigation" button in the future? Is it a permanent UX feature, or a temporary workaround that should be tested differently?
