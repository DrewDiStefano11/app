# FitCore Daily View and Deep Dive Acceptance Test Plan

## 1. Purpose

This test plan validates the functional layout, state management, and component behavior of the FitCore application strictly regarding the app-wide 'Daily View' and 'Deep Dive' layout modes. It establishes exact QA, regression, and PR-acceptance criteria for both manual and automated verification.

It does **not** validate backend sync algorithms, database migrations, or wearable data extraction logic (unless those directly alter the presentation layer).

This plan should be used by developers and automated CI hooks as the definitive merge-gate requirement for any PR that modifies app-shell components, routing destinations, bottom tabs, settings, mode toggling, or shared display metrics.

* **Focused Testing:** Targeted subset of this plan run during active development for a specific domain.
* **Regression Testing:** Verifying unchanged areas are not broken by a PR in a different domain (e.g., Nutrition PR breaking Recovery layout).
* **Full-Suite Testing:** The execution of all automated tests in this plan prior to major releases.

## 2. Test Environments

* **Desktop Chromium:** Playwright default browser project (`desktop-chromium`), testing responsive wrapping, max widths, and mouse interactions.
* **Mobile 360x800:** `mobile-360x800` Playwright project. Validates compact cards, standard touch targets, bottom-sheet height limits, and horizontal overflow prevention on smaller Android-equivalent screens.
* **Mobile 390x844:** `mobile-390x844` Playwright project. Validates iOS-equivalent notch/safe-area spacing, touch behaviors, and bottom-nav stickiness.

*Notes on context:* Tests must run against a local dev server with client-side hydration enabled. Mobile views must rely exclusively on BottomSheets and touch navigation; horizontal side-scrolling should only exist within defined subtab rows (`role="tablist"`).

## 3. Test Data Strategy

All fixtures must be loaded using the established Playwright `seedFitCoreAppState(page, state)` or `seedMinimalOnboardedState(page)` helpers to inject JSON strictly adhering to schema `v4` into `localStorage` (`fitcore.v1`) prior to page load.

* **Empty onboarded user:** Onboarding complete, basic profile, all arrays empty. (Use `seedMinimalOnboardedState`). Purpose: Verify null-state empty components.
* **Minimal onboarded user:** Profile with a goal, 1 assigned template, no logs today. Purpose: Base line for logging tests.
* **User with workouts:** Contains historical logs and one logged today. Purpose: Verify "completed" UI states and weekly summaries.
* **Active workout:** `activeWorkout` object populated. Purpose: Verify sticky "Workout in Progress" UI and resumption paths.
* **User with meals:** Multiple meal entries today. Purpose: Verify daily macro accumulation and lists.
* **User with recovery data:** Today's check-in complete. Purpose: Validate Recovery Daily View summaries.
* **User with sleep:** Sleep session logged. Purpose: Validate Sleep deep dive and daily summaries.
* **User with bodyweight history:** Array of historical weigh-ins. Purpose: Validate trends and charts.
* **User with goals:** Array of active and completed goals. Purpose: Validate goal tracking UI.
* **User with PRs:** Array of personal records. Purpose: Validate PR tracking.
* **User with progress photos:** Base64 image strings or valid placeholders in history. Purpose: Validate photo carousels.
* **Imported backup:** A full JSON dump of a complex state. Purpose: Validate the import overlay and immediate app re-render.
* **Malformed records:** Missing required IDs or invalid dates. Purpose: Ensure graceful failure (no crash).
* **Future-dated records:** Logs dated tomorrow. Purpose: Ensure today's views filter them out.
* **Mixed valid/invalid records:** Valid and invalid in the same array. Purpose: Ensure invalid records do not block rendering of valid ones.
* **Wearable data if supported:** Future-proof fixture containing normalized provider-neutral wearable sessions. Purpose: Validate imported wearable sessions don't conflict with manual ones.

*Rule:* Tests must **not** manually set `localStorage.setItem` mid-test to bypass UI actions. Cleanup happens automatically per-test isolation in Playwright.

## 4. Selector Standards

To prevent fragile tests and false positives, elements must be selected using the following strict priority:

1. **Role and exact accessible name:** (e.g., `page.getByRole('button', { name: 'Save Meal', exact: true })`).
2. **Label:** (e.g., `page.getByLabel('Bodyweight in lbs')`).
3. **Heading-scoped locator:** (e.g., `.filter({ has: page.getByRole('heading', { name: 'Nutrition Summary' }) })`).
4. **Stable semantic test identifier:** (e.g., `page.getByTestId('heatmap-cell-2024-01-01')`) — *Only when accessible roles are impossible or duplicated by design.*
5. **Narrowly scoped structural locator:** (e.g., `.sheet-root >> .content`) — *Acceptable ONLY for portaled overlays like BottomSheet that fall outside main DOM semantic trees.*

**Prohibited Practices:**
* Broad `.first()` or `.last()` to bypass ambiguous selectors (fix the rendering or use strict text filtering instead).
* Unexplained `.nth(x)` indices.
* Coordinate clicks (`page.mouse.click(x, y)`).
* `force: true` on clicks (indicates a layout/overlay bug).
* Arbitrary waits (`page.waitForTimeout(5000)`).
* Empty or swallowed `try/catch` blocks used to bypass assertions.
* Conditional assertion avoidance (e.g., `if (visible) expect...`).
* Direct React-state manipulation or mid-test `localStorage` mutation.
* Direct store mutation (e.g., calling Zustand store actions directly).
* Direct localStorage verification instead of verifying UI state.
* Selectors based entirely on decorative CSS (e.g., `page.locator('.bg-blue-500')`).

## 5. Global App-Shell Acceptance

**SHELL-001 | App Navigation and Mode Persistence**
* **ID:** SHELL-001
* **Title:** App Navigation and Mode Persistence
* **Scope:** Global App Shell
* **Preconditions:** Logged in user with valid state.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** All (Desktop & Mobile)
* **Steps:**
  1. Navigate to `/`.
  2. Verify 5 exact tabs exist: Home, Training, Fuel/Nutrition, Recovery, Stats.
  3. Verify Settings is NOT a bottom tab.
  4. Toggle mode to `deepDive`.
  5. Click through all tabs using keyboard.
* **Expected result:**
  * Mode remains `deepDive` across all navigations.
  * Tab switching immediately shows new content.
  * Selected state is reflected on the active tab button.
  * On mobile, tabs remain sticky at bottom without overlays blocking.
  * Active workout banner (if present) persists.
* **Negative assertions:**
  * NO stale destination buttons (routing must be immediate).
  * NO stray overlays from shell transitions.
* **Related source files:** `src/components/app/shell.tsx`, `src/lib/routing.ts`
* **Existing test coverage:** `navigation-smoke.spec.ts`
* **Merge-blocking status:** Yes - Blocks all UI PRs.

## 6. Home Daily View Acceptance

**HOME-D-001 | Home Daily View Elements**
* **ID:** HOME-D-001
* **Title:** Home Daily View Elements
* **Scope:** Home Tab in `daily` mode.
* **Preconditions:** User with basic history.
* **Fixture:** `seedFitCoreAppState` (user with minimal stats).
* **Viewport:** All
* **Steps:**
  1. Navigate to Home.
  2. Verify Mode is set to Daily View.
* **Expected result:**
  * Score hero is visible.
  * Daily summary is visible.
  * Next action card is visible.
  * Attention items (if any) are visible.
  * Training summary, Nutrition summary, Recovery summary are visible.
  * Heatmap is visible.
  * Coach insight is visible.
  * Quick actions (Log Meal, Check-in, etc.) are visible.
  * Settings button is available at top (not bottom).
* **Negative assertions:**
  * NO subtabs are rendered (`page.getByRole('tablist')` count is 0).
  * NO fake data is used for missing sections (honest empty states only).
* **Related source files:** `src/components/home/daily-view.tsx`
* **Existing test coverage:** `dashboard-smoke.spec.ts`, `home-daily-heatmap-polish-smoke.spec.ts`
* **Merge-blocking status:** Yes

**HOME-D-002 | BottomSheet Lifecycle on Home**
* **ID:** HOME-D-002
* **Title:** BottomSheet Lifecycle on Home
* **Scope:** Quick Actions on Home
* **Preconditions:** Empty onboarded user.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** Mobile (360x800)
* **Steps:** 1. Click 'Log Meal' quick action. 2. Click backdrop.
* **Expected result:** BottomSheet opens, focus moves inside.
* **Negative assertions:** Clicking backdrop closes sheet; no leftover `.sheet-root` DOM.
* **Related source files:** `src/components/app/sheet.tsx`
* **Existing test coverage:** `popup-stack-and-scroll-lock-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 7. Home Deep Dive Acceptance

**HOME-DD-001 | Home Deep Dive Elements**
* **ID:** HOME-DD-001
* **Title:** Home Deep Dive Elements
* **Scope:** Home Tab in `deepDive` mode.
* **Preconditions:** User with history.
* **Fixture:** User with historical logs.
* **Viewport:** All
* **Steps:**
  1. Navigate to Home.
  2. Click 'Deep Dive' toggle.
* **Expected result:**
  * Mode transitions cleanly without reload.
  * Richer details (trends, extended metrics) replace basic summaries.
  * Retained data accurately matches user state.
  * Navigation remains available.
  * Unsupported states correctly show "Insufficient history" placeholders.
* **Negative assertions:**
  * NO subtabs are rendered on Home, even in Deep Dive.
* **Related source files:** `src/components/home/deep-dive.tsx`
* **Existing test coverage:** `rich-state-all-tabs-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 8. Training Daily View Acceptance

**TRAIN-D-001 | Training Daily State Transitions**
* **ID:** TRAIN-D-001
* **Title:** Training Daily State Transitions
* **Scope:** Training Tab in `daily` mode.
* **Preconditions:** Varies per matrix step (No workout vs Active vs Completed).
* **Fixture:** Multiple fixtures depending on state matrix.
* **Viewport:** All
* **Steps:** View training tab under each precondition.
* **Expected result:**
  * *No Workout today:* Shows "Ready to train", "Start today's plan" or "Blank Workout" template list, assigned workout.
  * *Active Workout:* Shows "Workout in progress", "Resume workout" button.
  * *Completed Workout today:* Shows "Training logged today", weekly summary, performance preview.
  * Cardio sections available.
  * BottomSheets open for logging without overlay residue.
* **Negative assertions:**
  * NO legacy subtabs exist in Daily View.
  * NO overlay residue after finishing a workout.
  * Active-workout state does not corrupt data integrity (no duplicated logs).
* **Related source files:** `src/components/training/daily-view.tsx`
* **Existing test coverage:** `training-daily-view-panels-smoke.spec.ts`, `active-workout-lifecycle-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 9. Training Deep Dive Acceptance

**TRAIN-DD-001 | Training Deep Dive Subtabs**
* **ID:** TRAIN-DD-001
* **Title:** Training Deep Dive Subtabs
* **Scope:** Training Tab in `deepDive` mode.
* **Preconditions:** Minimal onboarded user.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** All
* **Steps:** Navigate to Training -> Toggle to Deep Dive.
* **Expected result:**
  * Exactly 4 subtabs exist: Performance, Strength, Library, Insights.
  * Order is strictly preserved.
  * `role="tab"` and `role="tablist"` are applied.
  * Selecting a tab updates the panel content correctly.
  * Empty states explicitly show "No data yet".
* **Negative assertions:**
  * NO Daily View summary cards incorrectly duplicated.
* **Related source files:** `src/components/training/deep-dive.tsx`
* **Existing test coverage:** `rich-state-all-tabs-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 10. Fuel/Nutrition Daily View Acceptance

**FUEL-D-001 | Nutrition Daily View Lifecycle**
* **ID:** FUEL-D-001
* **Title:** Nutrition Daily View Lifecycle
* **Scope:** Fuel/Nutrition Tab in `daily` mode.
* **Preconditions:** Empty user.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** All
* **Steps:**
  1. Verify Daily Macros (calories, remaining, protein, carbs, fat).
  2. Test lifecycles for: template meal, recent meal, food-library meal, custom meal.
  3. Test invalid custom meal (missing fields).
  4. Test duplicate click / second save on form submit.
  5. Delete selected meal.
* **Expected result:**
  * Valid meals save and appear in "Meals Today".
  * Macros immediately propagate across app.
  * Invalid custom meals disable Save button or show error.
  * Double-clicking Save does not duplicate entry.
  * Deleting the meal instantly reverts macros.
* **Negative assertions:**
  * NO subtabs visible.
  * NO fake hydration or supplement data (honest empty state).
  * NO main-surface action for "Photo Meal" unless explicitly supported.
* **Related source files:** `src/components/nutrition/daily-view.tsx`
* **Existing test coverage:** `nutrition-daily-view-panels-smoke.spec.ts`, `nutrition-logging-validation-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 11. Fuel/Nutrition Deep Dive Acceptance

**FUEL-DD-001 | Nutrition Deep Dive Verification**
* **ID:** FUEL-DD-001
* **Title:** Nutrition Deep Dive Verification
* **Scope:** Fuel/Nutrition Tab in `deepDive` mode.
* **Preconditions:** User with meal history.
* **Fixture:** User with meals.
* **Viewport:** All
* **Steps:** Navigate to Fuel/Nutrition -> Toggle to Deep Dive.
* **Expected result:**
  * Exactly 4 subtabs: Macros, Quality, Timing, Insights.
* **Negative assertions:**
  * Fake hydration data is PROHIBITED.
  * Fake micronutrient data is PROHIBITED.
  * Fake fasting data is PROHIBITED.
  * Fake AI correlations are PROHIBITED.
  * Fake food-quality score is PROHIBITED.
* **Related source files:** `src/components/nutrition/deep-dive.tsx`
* **Existing test coverage:** `rich-state-all-tabs-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 12. Recovery Daily View Acceptance

**REC-D-001 | Recovery Daily Logging**
* **ID:** REC-D-001
* **Title:** Recovery Daily Logging
* **Scope:** Recovery Tab in `daily` mode.
* **Preconditions:** Empty user.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** All
* **Steps:**
  1. Verify readiness, latest check-in, sleep, body status.
  2. Click 'Log Check-in'. Check validation.
  3. Click 'Log Sleep'. Check validation.
  4. Test duplicate prevention and second save.
* **Expected result:**
  * Readiness score updates on daily summary.
  * Latest check-in timestamp updates.
  * Overlay cleanup is successful.
  * Propagation happens immediately.
* **Negative assertions:**
  * NO subtabs.
  * Invalid values (e.g. readiness > max) are blocked (Boundary table: <0, 0, 10, >10, NaN).
  * Duplicate check-ins for the exact same moment are prevented.
  * Wearable missing state clearly communicates "Not connected".
* **Related source files:** `src/components/recovery/daily-view.tsx`
* **Existing test coverage:** `recovery-check-in-validation-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 13. Recovery Deep Dive Acceptance

**REC-DD-001 | Recovery Deep Dive Verification**
* **ID:** REC-DD-001
* **Title:** Recovery Deep Dive Verification
* **Scope:** Recovery Tab in `deepDive` mode.
* **Preconditions:** User with missing or partial data.
* **Fixture:** User with partial recovery logs.
* **Viewport:** All
* **Steps:** Navigate to Recovery -> Toggle to Deep Dive.
* **Expected result:**
  * Exactly 4 subtabs: Health, Sleep, Body, Insights.
  * Handles missing and partial data gracefully (no crashes).
* **Negative assertions:**
  * NO crashes on partial data.
* **Related source files:** `src/components/recovery/deep-dive.tsx`
* **Existing test coverage:** `rich-state-all-tabs-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 14. Stats Daily View Acceptance

**STATS-D-001 | Stats Daily Validation**
* **ID:** STATS-D-001
* **Title:** Stats Daily Validation
* **Scope:** Stats Tab in `daily` mode. (Note: Title must be "Stats", internal code may use "Progress").
* **Preconditions:** User with 1 past weigh-in.
* **Fixture:** User with bodyweight history.
* **Viewport:** All
* **Steps:** Navigate to Stats. Add weigh-in, test duplicate/second save.
* **Expected result:**
  * Visible name is "Stats".
  * Current bodyweight displayed.
  * Direction arrow/trend indicates "Insufficient weigh-ins" (requires >= 2).
  * Goals, personal records, training consistency, weekly volume, nutrition summary, recovery summary, milestones, and progress photos sections visible.
  * Quick actions work correctly.
  * Bodyweight validation works, duplicate saves blocked.
  * Propagation is immediate.
* **Negative assertions:**
  * NO subtabs.
  * NO fake trend lines.
  * NO fake milestones or correlations or adherence.
  * "Progress" is NOT used as the user-facing name.
* **Related source files:** `src/components/progress/daily-view.tsx`
* **Existing test coverage:** `progress-rich-data-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 15. Stats Deep Dive Acceptance

**STATS-DD-001 | Stats Deep Dive Verification**
* **ID:** STATS-DD-001
* **Title:** Stats Deep Dive Verification
* **Scope:** Stats Tab in `deepDive` mode.
* **Preconditions:** User with history.
* **Fixture:** User with PRs, photos, goals.
* **Viewport:** All
* **Steps:** Navigate to Stats -> Toggle to Deep Dive.
* **Expected result:**
  * Exactly 4 subtabs: Analytics, Body, Goals, Insights.
  * Supported charts render properly.
  * Empty states for charts handle missing data.
  * Goal management works correctly.
  * Photos appear.
* **Negative assertions:**
  * Correlations strictly require sufficient evidence (no fake AI text).
* **Related source files:** `src/components/progress/deep-dive.tsx`
* **Existing test coverage:** `rich-state-all-tabs-smoke.spec.ts`, `chart-empty-data-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 16. Settings Acceptance

**SETTINGS-001 | Settings Layout and Data**
* **ID:** SETTINGS-001
* **Title:** Settings Layout and Data
* **Scope:** Settings area.
* **Preconditions:** Logged in user.
* **Fixture:** `seedMinimalOnboardedState`
* **Viewport:** All
* **Steps:** Navigate to Home -> Click Settings (top).
* **Expected result:**
  * Settings opens successfully.
  * Mode independence: Works exactly the same regardless of `daily` or `deepDive` state.
  * Exactly 4 sections: Profile, Preferences, Data, Integrations.
  * Numeric validation uses buffered inputs.
  * Import/Export triggers correctly. Same-file reselection works.
  * Reset triggers confirmation dialog. Cancel cancels, confirm resets to onboarding.
  * Overlay cleanup works.
* **Negative assertions:**
  * Settings is NOT accessible via bottom tabs.
  * Immediate empty-string saving is blocked on numeric fields.
* **Related source files:** `src/components/settings/settings-hub.tsx`
* **Existing test coverage:** `settings-hub-render-smoke.spec.ts`, `settings-hub-safety-smoke.spec.ts`
* **Merge-blocking status:** Yes

## 17. Cross-Screen Propagation Scenarios

Data entered in one screen must immediately update all relevant global state without a page reload.

* **Complete Workout:** Updates Training Daily, Home Training summary, Stats Consistency, Stats Volume.
* **Log Meal:** Updates Nutrition Daily, Home Nutrition summary, Stats Nutrition summary.
* **Delete Meal:** Reverts above summaries.
* **Recovery Check-in:** Updates Recovery Daily, Home Recovery summary.
* **Sleep Entry:** Updates Recovery Sleep metrics.
* **Bodyweight Entry:** Updates Stats bodyweight, Stats trends, Profile settings.
* **Update Bodyweight Goal:** Updates Settings Profile, Stats Goals.
* **Import Data:** Instantly forces app-wide re-render to reflect new dataset.
* **Reset Data:** Clears global store and immediately jumps to Onboarding.

## 18. Overlay and Sheet Lifecycle Matrix

| Overlay Type | Open Trigger | Title | Close Control | Backdrop | Focus Dest | Submit Close | Failure State | Clean DOM | Mobile Cover |
|---|---|---|---|---|---|---|---|---|---|
| BottomSheet | Log Meal btn | "Add Meal" | 'X' or cancel | Click closes | Trigger btn | Closes | Stays open | `.sheet-root` gone | Yes |
| ConfirmDialog | Delete btn | "Are you sure" | Cancel btn | Static (no close) | Trigger btn | Closes | N/A | React portal clear | Yes |
| BottomSheet | Log Workout | "Start Workout" | 'X' | Click closes | Trigger btn | Navigates | Stays open | `.sheet-root` gone | Yes |
| BottomSheet | Settings Reset | "Reset Data" | Cancel btn | Static | Settings btn | Navigates to reset | N/A | React portal clear | Yes |
| Nested Sheet | Edit Details | "Edit..." | Back/Close | Static | Trigger btn | Closes to parent | Stays open | `.sheet-root` clear | Yes |

*(All popups/sheets must portal correctly and not leave stale DOM nodes.)*

## 19. Empty and Missing Data Matrix

| Scenario | Display Behavior |
|---|---|
| **Empty** | "No data yet" or visually empty chart frame. |
| **Zero** | Displays "0" or "0.0" (honest numeric render). |
| **Unsupported** | "Feature not available" / Greyed out. |
| **Not connected** | "Device not connected" (Wearables). |
| **Insufficient history** | "Need 3 more days of data" (Trends/Analytics). |
| **Malformed** | Skips record gracefully, logs warning. |
| **Future dated** | Hidden from "Today" views. |
| **Stale** | Shows timestamp of last successful sync. |

## 20. Analytics Safety Acceptance

* **Principles:**
  * No `NaN` or `Infinity` rendered in UI.
  * Invalid dates gracefully rejected.
  * Deterministic output (same data = same output).
  * Reversed-input stability (array order doesn't break calculations).
  * Immutability (analysis doesn't mutate base records).
  * No unsupported inference (no guessing gaps).
  * Stable metric IDs.
  * Shared time snapshot for "today" across app.
  * Empty-state safety (div by zero prevention).
* **Current Suites:** verified by `analytics-invariants.spec.ts` and `analytics-workout-volume.spec.ts`. These cover core algorithms and safety checks to prevent crashes when UI consumes data.

## 21. Accessibility Acceptance

* **Headings:** Proper `h1`-`h6` hierarchy per view.
* **Names:** All interactables have `aria-label` or visible text.
* **Tab Roles:** Deep Dive Subtabs strictly use `role="tablist"` and `role="tab"`.
* **Absence of Daily Tablists:** Daily view strictly contains 0 `role="tablist"` elements.
* **Dialogs:** Sheets/Dialogs use `aria-modal="true"` and trap focus.
* **Alerts & Status Messages:** Toast notifications use `role="status"` or `aria-live`.
* **Labels:** Form fields properly associated.
* **Focus Restoration:** Handled correctly by custom sheet logic.
* **Keyboard Behavior:** Space/Enter activate buttons, arrows for tabs.
* **Selected State:** Active tabs use `aria-selected="true"`.
* **Reduced Motion:** Animations (`CountUp`) respect `prefers-reduced-motion`.
* **Touch Targets:** Minimum 44x44px for main actions on mobile viewports.
* **Contrast Review:** Minimal contrast passes AA requirements.

## 22. Responsive Acceptance

* **Card Wrapping:** CSS Grid/Flex handles resizing without overlaps.
* **Full-Width Actions:** Primary buttons stretch on mobile.
* **Sheet Height:** Bottom sheets scroll internally, never exceeding viewport height.
* **Sticky Controls:** Bottom navigation stays fixed at bottom `0`.
* **No Horizontal Overflow:** Except explicitly inside subtab rows.
* **Chart Labels:** Hide or rotate on narrow screens.
* **Heatmap:** Cells resize or container scrolls natively.
* **Long Text:** Ellipsis or wrap; never breaks layout.
* **Exact Tab Names:** Never truncate deep dive tab names (scroll horizontally).
* **Fuel Width Handling:** Macronutrient progress bars scale cleanly without overflowing.

## 23. Performance and Stability Acceptance

* **Rapid Toggles:** Repeated opening/closing of BottomSheets does not crash.
* **Rapid Submits:** Form disabling during `inFlight` prevents double logging.
* **Navigation:** Repeatedly clicking tabs doesn't leak memory.
* **Mode Switching:** Rapidly hitting `daily`/`deepDive` toggle is safe.
* **Reload:** F5 preserves current layout mode and tab route via `localStorage`.
* **Import + Nav:** Importing data then navigating uses new data immediately.
* **Reset:** Clearing state performs smoothly without fatal app errors.
* **Large Datasets:** Large record counts don't freeze the main thread.
* **No Runtime Errors:** No fatal react boundaries hit.
* **No Stranded Overlays:** Routing changes forcefully unmount lingering portals.

## 24. PR-Specific Minimum Test Matrix

| PR Type | Focused Tests | Regression Tests | Required Checks | Mobile | Manual Inspection |
|---|---|---|---|---|---|
| **App Shell / Layout** | `navigation-*`, `mobile*` | All smoke tests | Build, Lint, Type | Yes | Yes |
| **Home / Heatmap** | `home-daily-*` | `dashboard-*` | Build, Lint, Type | Yes | No |
| **Training View** | `training-*` | `active-workout-*` | Build, Lint, Type | Yes | No |
| **Nutrition / Fuel** | `nutrition-*` | `data-propagation*` | Build, Lint, Type | Yes | No |
| **Recovery View** | `recovery-*` | `data-propagation*` | Build, Lint, Type | Yes | No |
| **Stats / Progress** | `progress-*` | `analytics-invariants*`| Build, Lint, Type | Yes | No |
| **Settings** | `settings-hub*` | `localstorage-*` | Build, Lint, Type | Yes | No |
| **Analytics Core** | `analytics-*` | `data-integrity`, `smoke` | Build, Lint, Type | No | No |
| **Store / Schema** | `data-contract*` | Full Suite | Build, Lint, Type | No | No |
| **Wearables** | `provenance*` | `data-integrity*` | Build, Lint, Type | No | No |
| **Privacy** | `provenance*` | `data-integrity*` | Build, Lint, Type | No | No |
| **Shared Sheets** | `popup-stack*` | All Daily views | Build, Lint, Type | Yes | Yes |

*Note: All PRs must pass `npx playwright test` full suite before merging.*

## 25. Merge Gate

To be accepted into `main`, a PR MUST:
1. **Exact Scope:** Modify only what is stated in the PR intent (no rogue refactoring).
2. **Required Checks:** Pass all GitHub Actions (Playwright, Lint, Typecheck).
3. **No Generated Files:** Do not commit `dist/` or `playwright-report/`.
4. **No Lockfile Changes:** Unless explicitly updating a dependency via intent.
5. **No Weakened Tests:** Do not add `.first()`, `force: true`, or skip tests to bypass failures.
6. **No Unexpected Screenshots:** Playwright visual regressions must not fail unexpectedly.
7. **Clean Branch:** No unresolved merge conflicts, synced with latest `main`.
8. **Stale Branch:** Rebase if branch is significantly behind main.
9. **Cleanup:** Superseded or replaced PRs must be closed.

## 26. Current Coverage Audit

Based on `tests/e2e/` inspection:

* `active-workout-lifecycle-smoke.spec.ts` - **Covered**
* `analytics-invariants.spec.ts` - **Covered**
* `analytics-workout-volume.spec.ts` - **Covered**
* `app-pr-gate-smoke.spec.ts` - **Covered**
* `bodyweight-weigh-in-validation-smoke.spec.ts` - **Covered**
* `chart-empty-data-smoke.spec.ts` - **Covered**
* `core-logging-persistence-smoke.spec.ts` - **Covered**
* `daily-decision.spec.ts` - **Covered**
* `dashboard-smoke.spec.ts` - **Covered**
* `data-contract-invariants.spec.ts` - **Covered**
* `data-integrity.spec.ts` - **Covered**
* `data-propagation-smoke.spec.ts` - **Covered**
* `date-boundary-today-rollup-smoke.spec.ts` - **Covered**
* `empty-state-crash-smoke.spec.ts` - **Covered**
* `home-daily-heatmap-polish-smoke.spec.ts` - **Covered**
* `keyboard-focus-accessibility-smoke.spec.ts` - **Covered**
* `localstorage-compatibility-smoke.spec.ts` - **Covered**
* `mobile-layout-overlay-smoke.spec.ts` - **Covered**
* `mobile.spec.ts` - **Covered**
* `navigation-smoke.spec.ts` - **Covered**
* `no-fatal-app-errors-smoke.spec.ts` - **Covered**
* `nutrition-daily-view-panels-smoke.spec.ts` - **Covered**
* `nutrition-logging-validation-smoke.spec.ts` - **Covered**
* `popup-stack-and-scroll-lock-smoke.spec.ts` - **Covered**
* `progress-rich-data-smoke.spec.ts` - **Covered** (Note: Verifies Stats tab)
* `provenance.spec.ts` - **Covered**
* `quick-popup-open-close-regression.spec.ts` - **Covered**
* `recovery-check-in-validation-smoke.spec.ts` - **Covered**
* `reload-stability-smoke.spec.ts` - **Covered**
* `rich-state-all-tabs-smoke.spec.ts` - **Covered**
* `settings-hub-render-smoke.spec.ts` - **Covered**
* `settings-hub-safety-smoke.spec.ts` - **Covered**
* `smoke.spec.ts` - **Covered**
* `training-daily-view-panels-smoke.spec.ts` - **Covered**
* `unit-conversions.spec.ts` - **Covered**

*Current status:* High coverage for smoke, storage, and layout.

## 27. Recommended Test Backlog

* **P0: Merge Blockers**
  * `daily-deep-dive-toggles-strict.spec.ts` | App Shell | Ensures the mode toggle accurately preserves exact tab state globally. | Require minimal fixture. | UI Team | High
* **P1: Required Before Testing Release**
  * `mode-toggle-preservation.spec.ts` | App Shell | Ensure switching mode on Home persists when moving to Training. | Require minimal fixture. | UI Team | High
* **P2: Hardening**
  * `deep-dive-subtabs-strict.spec.ts` | Layout | Iterate all 4 Deep Dive tabs to ensure exactly 4 subtabs exist with exact naming. | High overlap risk with `rich-state-all-tabs-smoke.spec.ts`. | Core Team | Med
* **P3: Future Analytics/Wearables**
  * `wearable-import-empty-state.spec.ts` | Recovery/Training | Validate "not connected" text. | Wearable fixture. | Integrations Team | Low

## 28. Reusable PR Review Checklist

```markdown
### PR Review Checklist (Daily View & Deep Dive)
- [ ] **Mode Independence:** Does this feature work correctly in both `daily` and `deepDive` modes?
- [ ] **Tab Contracts:** If modifying a Deep Dive view, are there exactly 4 tabs with the mandated names?
- [ ] **No Daily Subtabs:** If modifying a Daily View, did we accidentally introduce a subtab?
- [ ] **Empty States:** Have we tested the UI with 0 records or "insufficient data"?
- [ ] **No Fake Data:** Is all AI text / charts driven by honest data points?
- [ ] **Selector Safety:** Do new E2E tests use strictly accessible roles (`getByRole`, `getByLabel`)?
- [ ] **Overlay Cleanup:** Do any new popups/sheets close cleanly without trapping focus or stranding DOM nodes?
- [ ] **App Shell Preservation:** Does this change break the bottom navigation stickiness on mobile?
```
