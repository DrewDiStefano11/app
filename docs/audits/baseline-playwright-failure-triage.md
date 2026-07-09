# Baseline Playwright Failure Triage Audit

## Overview
This audit investigates a known baseline Playwright failure pattern related to the desktop data-integrity test timing out while waiting for the "Recover" button, after the bottom navigation collapses during the Nutrition flow.

## Failure Analysis

### Which Playwright test appears to fail
The test failing is in `tests/e2e/data-integrity.spec.ts`, specifically the test titled:
`"manual workout, meal, check-in, and weigh-in survive a full reload"`.

### What selector/action appears to fail
The test fails on the following action:
`await page.getByRole("button", { name: "Recover" }).click();`
This occurs immediately after the meal logging flow is completed in the "Fuel" (Nutrition) tab.

### The likely user flow that produces the failure
1. The test navigates to the "Fuel" tab.
2. It interacts with the meal logging form (filling out inputs for Kcal, P, C, F).
3. The process of filling out this form likely causes the page to scroll down.
4. The `BottomNav` component (`src/components/app/bottom-nav.tsx`) has a scroll listener that collapses the navigation when the user scrolls down (`delta > 8`).
5. After clicking "Add to Daily Log", the navigation remains in its collapsed state.
6. The test immediately attempts to click the "Recover" button, but it is no longer visible because the navigation is collapsed, showing an "Expand navigation, current section Fuel" button instead.
7. Playwright times out waiting for the "Recover" button to become visible and actionable.

### Issue relationship
- **Collapsed navigation:** Yes, this is the root cause. The `BottomNav` component hides the explicit section buttons when collapsed.
- **Desktop vs mobile behavior:** Yes, on desktop viewports, if the window is short enough to allow scrolling in the Nutrition view, the scroll listener will collapse the navigation. On mobile, this is expected behavior, but E2E tests often run with a fixed desktop height or run without verifying the collapsed state.
- **Nutrition flow leaving navigation collapsed:** Yes, filling out the custom entry form in the Fuel tab scrolls the viewport, leaving the nav collapsed.
- **Ambiguous button labels:** No, the selector `name: "Recover"` is explicit and accurate, the element is simply hidden.
- **Test selector brittleness:** Yes, the test is brittle because it implicitly assumes the bottom navigation is always expanded, failing to check for the collapsed state or using the resilient dispatch event alternative.
- **App shell behavior:** Yes, the app shell's scroll-based collapse logic works as intended but creates a race condition/hidden state for linear test flows.

## Files Involved

### Which files are likely involved
- `tests/e2e/data-integrity.spec.ts` (The failing test)
- `src/components/app/bottom-nav.tsx` (The component controlling the collapse logic)
- `tests/e2e/helpers/fitcore-test-state.ts` (Potentially, if test helpers are updated)

### Which files should not be touched while current runtime PRs are open
- `src/components/app/views/recovery.tsx` (Blocked by active PR #129)
- `src/components/app/views/progress.tsx` (Blocked by active PR #148)
- Any other main runtime navigation logic, as #129 and #148 may rely on current app shell state.

## Recommendation

### Whether this should be fixed as:
- **Test-only selector/navigation stabilization:** **Yes.** The app behavior (collapsing on scroll) is intentional and expected. The test should be updated to handle this valid UI state.
- **Runtime navigation fix:** No.
- **App-shell fix:** No.
- **Deferred until current runtime UI PRs merge:** No, this is a test-only fix that does not impact the runtime source files being modified in #129/#148.

### Risks of fixing it too broadly
If the runtime `BottomNav` collapse logic is disabled or altered to "fix" the test, it would degrade the mobile user experience (by permanently wasting vertical screen space) and potentially create merge conflicts with any other PRs dependent on the standard shell behavior. Modifying the layout or scroll bounds of the Nutrition tab might break responsive design.

### Recommended future fix task with narrow file scope
Update the specific test in `tests/e2e/data-integrity.spec.ts` to stabilize the navigation step. Before calling `.click()` on bottom navigation buttons, the test should either:
1. Check if the expand navigation button (e.g., `page.getByRole('button', { name: /Expand navigation/ })`) is visible and click it first.
2. OR, dispatch the custom navigation event as documented in memory: `await page.evaluate(() => window.dispatchEvent(new CustomEvent('fitcore:nav', { detail: 'recovery' })));`.

### Recommended validation commands for the future fix
```bash
npx playwright test tests/e2e/data-integrity.spec.ts
```
*(Optionally run multiple times to ensure stability and lack of race conditions)*

---

## Final Section

- **Recommended future PR title:** Fix Playwright timeout by handling collapsed navigation in data integrity test
- **Suggested future allowed changed files:** `tests/e2e/data-integrity.spec.ts`
- **Whether the future fix should wait until #129/#148 are merged or closed:** No, the fix should proceed as it is test-only and will not conflict with runtime PRs.
- **Whether the future fix should be tests-only or runtime:** Tests-only.
