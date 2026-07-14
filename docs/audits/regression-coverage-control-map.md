# 1. Executive summary

**Current test architecture:** Tests are divided into unit tests (using Vitest) and E2E tests (using Playwright). There is a strong emphasis on smoke testing, data state integrity, and specific domain panel loading.

**Current test strengths:** Strong coverage of initial page loads (no page errors), initial data contract invariants, and smoke coverage across the main domains (Training, Fuel, Recovery, Stats).

**Current test weaknesses:** Missing explicit failure-path injection, limited verification of actual data persistence during network or storage failures, and heavy reliance on idealized fixture data.

**Current coverage distribution:** E2E smoke tests cover the majority of tabs, while unit tests heavily focus on analytics, metrics, and insights.

**Strongest domain coverage:** Analytics, metrics, and initial smoke tests of main navigation tabs.

**Weakest domain coverage:** PWA offline behavior, destructive actions, error handling, partial states, and responsive edge cases.

**Most fragile test areas:** Tests using exact structural DOM selectors or exact text matches (e.g., in UI smoke tests relying on exact dashboard copy).

**Most misleading fixture areas:** Centralized `minimalState` fixture data in test helpers that avoid edge cases, missing fields, or corrupted structures.

**Largest feature-preservation gaps:** Complex active-workout interaction flows and offline data syncing.

**Largest accessibility gaps:** Keyboard focus trapping inside custom sheets and dialogs, and screen reader live region announcements for dynamic changes.

**Largest responsive gaps:** Testing of sheet sizing and keyboard overlap on extremely narrow mobile viewports (e.g., 320 px).

**Largest data-propagation gaps:** Verification that edits in one domain reliably reflect in cross-domain analytics without full reload.

**Largest persistence gaps:** Concurrent tab writing conflicts, quota exhaustion, and state recovery.

**Most important future test requirements:** Expanding negative testing scenarios, boundaries, real-world data isolation, and specific coverage for future premium UI and Data Safety integrations.

**Distinctions:**

- **Behavior directly asserted:** Page load success, visibility of domain panels, basic validation feedback.
- **Behavior indirectly exercised:** Form state management, local storage initial seating.
- **Behavior only implied:** Correct hydration over multiple sessions.
- **Behavior untested:** True offline mode, quota failure, corrupted JSON recovery.
- **Behavior tested only with fixtures:** Fully populated history states and progress charts.
- **Behavior requiring browser verification:** Responsive sheet layouts, mobile keyboard interactions.
- **Behavior depending on future Data Safety integration:** Atomic persistence, cross-tab synchronization, stale write handling.

# 2. Method and evidence boundaries

- **Required base SHA:** 3e4326782d761313c4f2644ecfe55503770b360a
- **Static inspection methodology:** Code and test files were read statically via file system inspections. No runtime tests were executed.
- **Test files inspected:** All files in `tests/e2e/`, `tests/unit/`, and associated helpers (e.g., `tests/e2e/helpers/fitcore-test-state.ts`).
- **Source files cross-referenced:** `playwright.config.ts`, `package.json`, `vite.config.ts`, `tsconfig.json`, `src/lib/`.
- **Why test pass/fail status is not being claimed:** Tests were not run; this is a static code-and-test inspection task.
- **Why runtime coverage percentages are not being claimed:** Code coverage tools were not executed.
- **How a test name is distinguished from its actual assertions:** Test bodies were inspected to ensure assertions actually verify the named behavior, reviewing explicit `expect()` calls rather than relying on `test()` block strings.
- **How fixture realism is evaluated:** By comparing fixture structure against likely real-world scenarios, reviewing for missing optional fields, zero values, and edge cases.
- **How test coverage is classified:** Based on the presence of direct assertions, interaction commands, and test helpers.

**Definitions:**

- **Directly asserted:** The test includes explicit assertions verifying the specific behavior or value.
- **Indirectly exercised:** The behavior occurs as a side effect of the test but is not explicitly asserted.
- **Smoke-only:** Test verifies no fatal error occurs and basic UI is visible.
- **Fixture-only:** Behavior is only verified under idealized, pre-seeded data conditions.
- **Presentation-coupled:** Test relies on visual layout, text, or exact DOM structure rather than semantics.
- **Behavior-coupled:** Test relies on accessible names, roles, and functional outcomes.
- **Missing:** No test file or block covers this behavior.
- **Partial:** Some aspects are tested, but significant edge cases or lifecycle stages are omitted.
- **Future dependency:** Behavior requires features not yet merged into main.
- **Requires runtime verification:** Cannot be fully confirmed statically due to browser layout dependencies.
- **Unclear:** Test intent or assertions are ambiguous or overly complex.

# 3. Test architecture map

- **Unit-test framework:** Vitest.
- **Integration-test framework:** Relies mostly on E2E Playwright for integration scenarios.
- **E2E framework:** Playwright (`@playwright/test` ^1.61.1).
- **Browser projects:** desktop-chromium, mobile-360x800, mobile-390x844 (all using Chromium engine).
- **Viewport projects:** Desktop Chrome, mobile (360 px width, 390 px width).
- **Test directories:** `tests/e2e/`, `tests/unit/`, `tests/e2e/helpers/`.
- **Naming conventions:** `*.spec.ts` for E2E, `*.test.ts` for unit tests.
- **Fixtures:** Centralized test state builder in `tests/e2e/helpers/fitcore-test-state.ts`.
- **Helpers:** `seedFitCoreAppState`, `seedMinimalOnboardedState`, `gotoDashboard`, `expectDashboardReady`, `setMobileViewport`.
- **Global setup:** Test-specific `page.addInitScript` for seeding local storage state.
- **Global teardown:** Playwright default per-test context teardown.
- **Test-state construction:** Injecting JSON directly into `window.localStorage` via Playwright initialization scripts.
- **Storage initialization:** Driven by the `FITCORE_STORAGE_KEY` and `FITCORE_DATA_VERSION = 4`.
- **Mocks:** No global network mock file found; UI mocks rely entirely on `localStorage` seeding.
- **Screenshot handling:** Configured as `only-on-failure`.
- **CI commands:** `npm run test:e2e`.
- **Package scripts:** `test:e2e`, `test:e2e:ui`, `test:e2e:headed`.

### Unit Testing

- **Paths:** `tests/unit/`
- **Purpose:** Testing pure domain logic, math, formatting, data validation.
- **Environment:** Node / Vitest.
- **Dependencies:** Vitest.
- **Data setup:** Inline mock objects within describe blocks.
- **Cleanup:** Handled by Vitest per suite.
- **Strengths:** Fast execution, high coverage of analytics algorithms.
- **Limitations:** No real DOM or browser layout verification.
- **Ownership risk:** Low risk of file conflicts; pure logic isolates easily.

### E2E Testing

- **Paths:** `tests/e2e/`
- **Purpose:** End-to-end user flows, UI behavior, persistence, accessibility smoke checks.
- **Environment:** Playwright with Vite dev server at `http://localhost:8080`.
- **Dependencies:** `@playwright/test`.
- **Data setup:** Centralized `seedMinimalOnboardedState` and specific helpers.
- **Cleanup:** Browser context isolation per test.
- **Strengths:** Real browser engine, catches integration and render errors.
- **Limitations:** Susceptible to UI coupling and flakiness, slow execution.
- **Ownership risk:** High risk; UI changes in shared domains can break many unrelated smoke tests.

```markdown
[Playwright Runner] --> [Browser Contexts (Desktop/Mobile)] --> [Vite Dev Server]
| | |
+-- [Helpers] ---------------+-- [Init Scripts (localStorage)] +
```

# 4. Test-file registry

### Unit

- `tests/unit/analytics-version.test.ts` (Domain: Analytics | Behavior: Version validation)
- `tests/unit/anomaly-detection.test.ts` (Domain: Analytics | Behavior: Anomaly rules)
- `tests/unit/data-provenance.test.ts` (Domain: Data | Behavior: Provenance tracking)
- `tests/unit/date-time.test.ts` (Domain: Utils | Behavior: Date math boundaries)
- `tests/unit/domain-metrics.test.ts` (Domain: Analytics | Behavior: Core metric calculation)
- `tests/unit/evidence-attribution.test.ts` (Domain: Analytics | Behavior: Evidence mapping)
- `tests/unit/fitcore-analytics-explanations.test.ts` (Domain: Analytics | Behavior: Explanations logic)
- `tests/unit/fitcore-analytics-insights.test.ts` (Domain: Analytics | Behavior: Insights calculations)
- `tests/unit/fitcore-analytics-interactions.test.ts` (Domain: Analytics | Behavior: Interactions state)
- `tests/unit/fitcore-analytics-presentation.test.ts` (Domain: Analytics | Behavior: Presentation mapping)
- `tests/unit/fitcore-analytics-signals.test.ts` (Domain: Analytics | Behavior: Signal processing)
- `tests/unit/fitcore-analytics-trends.test.ts` (Domain: Analytics | Behavior: Trend tracking)
- `tests/unit/fitcore-analytics-trust.test.ts` (Domain: Analytics | Behavior: Trust calculation)
- `tests/unit/fitcore-analytics-visualizations.test.ts` (Domain: Analytics | Behavior: Visualization logic)
- `tests/unit/fitcore-analytics.test.ts` (Domain: Analytics | Behavior: Core logic)
- `tests/unit/fitcore-insight-readiness.test.ts` (Domain: Recovery | Behavior: Readiness logic)
- `tests/unit/goal-detail-metrics.test.ts` (Domain: Stats | Behavior: Goal progression logic)
- `tests/unit/insight-candidates.test.ts` (Domain: Analytics | Behavior: Insight generation)
- `tests/unit/insight-evidence.test.ts` (Domain: Analytics | Behavior: Insight tracking)
- `tests/unit/insight-explanations.test.ts` (Domain: Analytics | Behavior: Insight text mapping)
- `tests/unit/insight-interactions.test.ts` (Domain: Analytics | Behavior: Insight state logic)
- `tests/unit/insight-visualizations.test.ts` (Domain: Analytics | Behavior: Chart mapping)
- `tests/unit/meaningful-change.test.ts` (Domain: Analytics | Behavior: Delta evaluation thresholds)
- `tests/unit/metric-dependency-graph.test.ts` (Domain: Analytics | Behavior: Metric graph mapping)
- `tests/unit/metric-freshness.test.ts` (Domain: Analytics | Behavior: Metric freshness bounds)
- `tests/unit/metric-quality.test.ts` (Domain: Analytics | Behavior: Data quality bounds)
- `tests/unit/metric-trust.test.ts` (Domain: Analytics | Behavior: Metric trust rules)
- `tests/unit/nutrition-detail-metrics.test.ts` (Domain: Fuel | Behavior: Macro math)
- `tests/unit/personal-baselines.test.ts` (Domain: Analytics | Behavior: Baseline logic boundaries)
- `tests/unit/recovery-detail-metrics.test.ts` (Domain: Recovery | Behavior: Recovery logic boundaries)
- `tests/unit/rolling-trends.test.ts` (Domain: Analytics | Behavior: Trend calculations)
- `tests/unit/safe-math.test.ts` (Domain: Utils | Behavior: Math bounds)
- `tests/unit/training-detail-metrics.test.ts` (Domain: Training | Behavior: Volume logic)

### Integration

- Mostly integrated into E2E specs via Playwright component mounting and navigation smoke flows.

### E2E

- `tests/e2e/active-workout-lifecycle-smoke.spec.ts` (Domain: Training | Primary behavior: Workout state flow)
- `tests/e2e/analytics-workout-volume.spec.ts` (Domain: Analytics | Primary behavior: Volume chart UI)
- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts` (Domain: Stats | Primary behavior: Form limits)
- `tests/e2e/daily-decision.spec.ts` (Domain: Home | Primary behavior: Daily constraints)
- `tests/e2e/data-propagation-smoke.spec.ts` (Domain: Cross | Primary behavior: State syncing across tabs)
- `tests/e2e/empty-state-crash-smoke.spec.ts` (Domain: General | Primary behavior: Prevent crash)
- `tests/e2e/home-daily-heatmap-polish-smoke.spec.ts` (Domain: Home | Primary behavior: Heatmap rendering)
- `tests/e2e/nutrition-logging-validation-smoke.spec.ts` (Domain: Fuel | Primary behavior: Nutrition bounds)
- `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts` (Domain: UI | Primary behavior: Z-index testing)
- `tests/e2e/progress-rich-data-smoke.spec.ts` (Domain: Stats | Primary behavior: Populated view loading)
- `tests/e2e/provenance.spec.ts` (Domain: Data | Primary behavior: Provenance rendering)
- `tests/e2e/quick-popup-open-close-regression.spec.ts` (Domain: Overlays | Primary behavior: Toggle UI)
- `tests/e2e/recovery-check-in-validation-smoke.spec.ts` (Domain: Recovery | Primary behavior: Check-in logic)
- `tests/e2e/settings-data-safety-lifecycle-smoke.spec.ts` (Domain: Settings | Primary behavior: Settings limits)
- `tests/e2e/settings-hub-safety-smoke.spec.ts` (Domain: Settings | Primary behavior: Prompts)
- `tests/e2e/unit-conversions.spec.ts` (Domain: Settings | Primary behavior: Units mapping)

### Accessibility

- `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts` (Domain: A11y | Primary behavior: Focus trap tests)

### Responsive

- `tests/e2e/mobile.spec.ts` (Domain: Layout | Primary behavior: Viewport squish constraints)
- `tests/e2e/mobile-layout-overlay-smoke.spec.ts` (Domain: Layout | Primary behavior: Sheets on mobile)

### Analytics

- `tests/e2e/analytics-invariants.spec.ts` (Domain: UI | Primary behavior: Analytics visual mapping)
- `tests/e2e/chart-empty-data-smoke.spec.ts` (Domain: Chart | Primary behavior: Empty charts)

### Persistence

- `tests/e2e/core-logging-persistence-smoke.spec.ts` (Domain: DB | Primary behavior: Local storage verify)
- `tests/e2e/localstorage-compatibility-smoke.spec.ts` (Domain: DB | Primary behavior: Version tracking)
- `tests/e2e/reload-stability-smoke.spec.ts` (Domain: Flow | Primary behavior: F5 state preservation)

### PWA

- None found directly verifying service-worker intercepts.

### Smoke

- `tests/e2e/app-pr-gate-smoke.spec.ts` (Domain: Entry | Primary behavior: PR blocking check)
- `tests/e2e/dashboard-smoke.spec.ts` (Domain: UI | Primary behavior: Main load)
- `tests/e2e/data-contract-invariants.spec.ts` (Domain: Model | Primary behavior: Shell visibility)
- `tests/e2e/data-integrity.spec.ts` (Domain: DB | Primary behavior: Safe shell loads)
- `tests/e2e/date-boundary-today-rollup-smoke.spec.ts` (Domain: Util | Primary behavior: Safe bounds UI)
- `tests/e2e/navigation-smoke.spec.ts` (Domain: UI | Primary behavior: Routing)
- `tests/e2e/no-fatal-app-errors-smoke.spec.ts` (Domain: Global | Primary behavior: Error intercepts)
- `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts` (Domain: Fuel | Primary behavior: Fuel load)
- `tests/e2e/rich-state-all-tabs-smoke.spec.ts` (Domain: Global | Primary behavior: Rich loads)
- `tests/e2e/settings-hub-render-smoke.spec.ts` (Domain: Config | Primary behavior: Shell visible)
- `tests/e2e/smoke.spec.ts` (Domain: Root | Primary behavior: App mount)
- `tests/e2e/training-daily-view-panels-smoke.spec.ts` (Domain: Training | Primary behavior: Panels mount)

# 5. Test-command and configuration audit

- **Package test scripts:** `test:e2e` (`playwright test`), `test:e2e:ui`, `test:e2e:headed`.
- **Playwright commands:** Runner integrates with local dev server (`npm run dev`) at `http://localhost:8080`.
- **Project definitions:** `desktop-chromium` (Desktop Chrome), `mobile-360x800` (isMobile: true), `mobile-390x844` (isMobile: true).
- **Timeouts:** Playwright default timeouts (usually 30s per test).
- **Retries:** Configured to retry 2 times on CI, 0 times locally.
- **Worker counts:** Restricted to 1 worker globally in config (`workers: 1`). Effect on confidence: ensures sequential execution, reducing test isolation flakiness, but risks masking hidden test state pollution and forces longer execution times.
- **Shard support:** Not configured in base file, risking monolithic CI bottlenecks.
- **Screenshots:** `only-on-failure`. Avoids snapshot drift but requires reproducing failures manually to inspect.
- **Traces:** `on-first-retry`.
- **Videos:** `retain-on-failure`.
- **Console-error handling:** Asserted manually in specific tests (e.g., `no-fatal-app-errors-smoke.spec.ts` hooks into `page.on('pageerror')`). Missing blanket coverage against console errors across the entire suite.
- **Page-error handling:** Verified in smoke tests.
- **Test output:** HTML reporter configured.
- **Browser selection:** Strictly Chromium. Lack of Webkit/Firefox coverage poses risks for PWA installation flows and iOS Safari specific layout bugs.

# 6. Fixture and test-data architecture

- **Centralized fixtures:** Found in `tests/e2e/helpers/fitcore-test-state.ts`. The primary data source is the `minimalState` dictionary.
- **Domain-local fixtures:** Scattered inline within describe blocks in individual spec files.
- **Onboarding state:** Represented by `onboardingComplete: true`.
- **Profile state:** Hardcoded profile object (`goal: 'hypertrophy'`, `experience: 'intermediate'`, `daysPerWeek: 5`, etc).
- **Workout history:** Starts as empty array `workouts: []` in base fixture.
- **Active workout:** Started `null` in base fixture.
- **Meals:** Starts as empty array `mealEntries: []`.
- **Recovery entries:** Unseeded in minimal state.
- **Weigh-ins:** Starts as empty array `bodyweightEntries: []`.
- **Goals:** Array containing one item `id: 'g1'`, type `weekly_workouts`, target `5`.
- **Photos:** Missing from base fixture.
- **Storage state:** Managed via `FITCORE_STORAGE_KEY` and `FITCORE_DATA_VERSION = 4` injected directly into `window.localStorage`.
- **Corrupted or malformed state:** Addressed explicitly in `localstorage-compatibility-smoke.spec.ts`.

**Fixture Risks:** The centralized `minimalState` makes overly optimistic default assumptions about data completeness (providing all fields on the profile) which risks masking edge cases where users have partial profiles. The `goal` fixture is completely hardcoded, risking staleness if goal schemas change.

# 7. Fixture realism audit

- **New users:** Highly realistic testing coverage via `minimalState` empty array bounds.
- **Experienced users:** Evaluated heavily in `rich-state-all-tabs-smoke.spec.ts`.
- **No data:** Realistically evaluated by `empty-state-crash-smoke.spec.ts`.
- **Partial data:** The base fixtures often seed overly complete records (e.g., full profile object instead of partial profile).
- **Dense history:** Assessed by inline loops generating arrays, but does not stress test real-world chaotic dates or malformed historical records.
- **Malformed data:** Checked slightly but lacks realistic JSON-schema violations simulation.
- **Old-version data:** Evaluated directly in `localstorage-compatibility-smoke.spec.ts`.
- **Realistic dates:** Relying on simple `toISOString()` bounds lacks timezone variation testing and DST boundary evaluation.
- **Realistic units:** Mix of imperial and metric, verified in unit conversions.
- **Realistic goals:** Minimal 1-goal setup, lacks dense realistic goal-history overlapping.
- **Missing optional fields:** Over-provisioned in fixtures to bypass TS compiler errors, creating a blind spot for `undefined` runtime property accesses.
- **Zero values:** Rarely explicitly asserted against in the UI.

# 8. Test-state helper audit

- `seedFitCoreAppState(page, state)`: Directly initializes `localStorage`. Bypasses onboarding UI, risking missing state hydration defects on natural startup paths. Domains using it: All E2E domains.
- `seedMinimalOnboardedState(page)`: Invokes the base state. Assumptions: app schema expects `FITCORE_DATA_VERSION = 4`. Failure mode: If data schema changes heavily, every test relying on this will crash simultaneously.
- `gotoDashboard(page)`: Navigation driver helper. Fragility risk: if the route structure changes, the entire suite is disrupted.
- `expectDashboardReady(page)`: Helper waiting for `FitCore Today` or `FitCore Score` text. Fragility risk: Highly coupled to exact text strings. Risk of bypassing real user flows: Bypasses authentication or loading overlay state checks.
- `setMobileViewport(page, viewport)`: Helper dynamically adjusting width/height. Risk: Setting this mid-test might fail to simulate real mobile touch-events accurately compared to proper Playwright browser project contexts.

# 9. Selector strategy audit

- **Accessible names / Roles:** Present (e.g., `getByRole('button', { name: 'Save' })`). Strong and accessibility-aligned.
- **Labels:** Used moderately in form assertions.
- **Text:** Heavy reliance on `.getByText('...', { exact: true })`. Extremely fragile to any copy changes, particularly in dashboard assertions.
- **Test IDs:** Very rare.
- **Classes / CSS selectors / nth-child:** `.sheet-root` used aggressively for popup scoping. Extremely fragile to structural UI rewrites.
- **Premium redesign impact:** Tests relying on exact text strings or CSS classes will break massively. Refactoring to strict semantic selectors (`getByRole`, `getByLabelText`) is necessary for redesign stability.

# 10. Assertion-quality audit

- **User-visible outcome:** Dominant type (verifying components are `toBeVisible`).
- **State mutation:** Directly checked in `core-logging-persistence-smoke.spec.ts` against raw local storage.
- **Navigation result:** Tested via URL bounds in `navigation-smoke.spec.ts`.
- **Element existence / visibility:** Widespread.
- **Text-only:** Frequently checks that specific exact metrics render. High false-confidence risk if CSS hides the element off-screen but it remains in the DOM tree.
- **No-error:** `no-fatal-app-errors-smoke.spec.ts` covers fatal throws.
- **Missing assertion types:** Many forms lack assertions proving the form fields actually clear or reset properly on cancellation, and many checks click 'Save' without deeply querying the data store or reloading the page to prove persistence.

# 11. No-fatal-error and smoke-test audit

- **Smoke test files:** `smoke.spec.ts`, `dashboard-smoke.spec.ts`, `app-pr-gate-smoke.spec.ts`, `empty-state-crash-smoke.spec.ts`, `no-fatal-app-errors-smoke.spec.ts`.
- **Paths covered:** `/`, `/training`, `/fuel`, `/recovery`, `/progress`.
- **States covered:** Initial state, fully populated state, explicitly empty state.
- **Assertions:** Visibility, element count, console error trapping.
- **Useful confidence:** Proves the application shell mounts and renders the specific domain entry points without throwing React rendering errors.
- **Missing behavioral confidence:** Does not verify interactive workflows like adding a meal or completing a workout.
- **Overlap:** Significant overlap with domain-specific smoke suites (e.g., `training-daily-view-panels-smoke.spec.ts`).

# 12. Home coverage audit

- **Home startup:** Smoke coverage via `dashboard-smoke.spec.ts`.
- **Daily View / Deep Dive:** Toggle UI visibility tested; routing behavior not explicitly covered as it is purely presentational.
- **FitCore Score / Readiness / Momentum:** Visibility checks.
- **Quick actions:** Tested for modal open logic.
- **Body heatmap:** Covered specifically by `home-daily-heatmap-polish-smoke.spec.ts`.
- **Empty states:** Asserts components don't crash when arrays are empty.
- **Data propagation:** E2E propagates check to verify meal logging impacts Home (`data-propagation-smoke.spec.ts`).
- **Chart interactions:** Absent deep E2E interaction coverage.
- **Classification:** Home coverage is heavily **smoke-only** and **presentation-coupled**.

# 13. Training coverage audit

- **Training Daily View / Deep Dive:** Smoke tested for visibility.
- **Workout history / Templates / Exercise history:** Coverage relies on fully populated rich-data tests rendering correctly.
- **Charts / PRs:** Metric bounds tested heavily in unit tests; E2E relies on smoke checks.
- **Empty states:** Checked against crashing.
- **Data propagation:** Asserts logged workout propagates to Training view.
- **Missing E2E:** Deep interactive flow for logging a complex structured workout, editing historical workout data, or navigating exercise history.

# 14. Active-workout coverage audit

- **Lifecycle stages:** Covered in `active-workout-lifecycle-smoke.spec.ts`.
- **Direct assertions:** Verifies state transitions (Start -> Resume -> Complete -> Discard).
- **Persisted-state assertions:** Checks local storage persistence.
- **Missing failure cases:** Coverage is weak on resolving duplicate state conflicts, concurrent session boundaries, and handling quota exhaustion mid-workout.
- **Add/remove/reorder exercise, add/edit/delete set, modifiers, notes, timers:** Very lightly tested, lacking full interaction automation coverage.
- **Risk:** High. The active workout is highly complex, stateful, and destructive if interrupted without safe failure handling.

# 15. Fuel/Nutrition coverage audit

| Feature        | Direct Assertions | Smoke Coverage    | Data Integrity Coverage | Missing Coverage           |
| -------------- | ----------------- | ----------------- | ----------------------- | -------------------------- |
| Daily View     | No                | Yes               | Partial                 | Responsive layouts         |
| Deep Dive      | No                | Yes               | Partial                 | Chart bounds               |
| Macro targets  | Unit tested       | Yes               | Full (Unit)             | Real-time edits            |
| Meal logging   | Yes               | Yes               | Validation verified     | Error recovery             |
| Custom foods   | No                | No                | None                    | CRUD flows                 |
| Supplements    | No                | No                | None                    | Rendering flow             |
| Photo entry    | No                | Yes (Placeholder) | None                    | File binary testing        |
| Edit/Delete    | No                | Yes               | Partial                 | Revert unsaved             |
| Empty state    | Yes               | Yes               | N/A                     | Corrupt state handling     |
| Data propagate | Yes               | Yes               | Storage synced          | Immediate analytics update |

# 16. Recovery coverage audit

| Feature          | Direct Assertions | Smoke Coverage | Data Integrity Coverage | Missing Coverage          |
| ---------------- | ----------------- | -------------- | ----------------------- | ------------------------- |
| Daily View       | No                | Yes            | Partial                 | Edge boundaries           |
| Deep Dive        | No                | Yes            | Partial                 | Detail overlap            |
| Readiness logic  | Unit tested       | Yes            | Full (Unit)             | Timezone limits           |
| Recovery score   | Unit tested       | Yes            | Full (Unit)             | NaN handling              |
| Check-ins        | Yes               | Yes            | Validation bounds       | Duplicate prevention      |
| Sleep logging    | Yes               | Yes            | Bounds verified         | Next-day rollover         |
| Soreness/Fatigue | Yes               | Yes            | Bounds verified         | Cross-tab conflict        |
| Body heatmap     | No                | Yes            | Rendering               | Tap interactions          |
| Empty state      | Yes               | Yes            | N/A                     | Missing permission bounds |
| Data propagate   | Yes               | Yes            | Tested                  | Stale UI update           |

# 17. Stats/Progress coverage audit

| Feature            | Direct Assertions | Smoke Coverage    | Data Integrity Coverage | Missing Coverage        |
| ------------------ | ----------------- | ----------------- | ----------------------- | ----------------------- |
| Daily View         | No                | Yes               | Partial                 | Subtab isolation        |
| Deep Dive          | No                | Yes               | Partial                 | Analytics interaction   |
| Weigh-ins          | Yes               | Yes               | Validation logic        | Extreme bounds (0, 999) |
| Bodyweight history | No                | Yes               | Rendering               | Scroll on 100+ items    |
| Goals              | No                | Yes               | Mock seeding            | Edit and delete flows   |
| Momentum           | Unit tested       | Yes               | Logic mapped            | Chart edge values       |
| Photos             | No                | Yes (Placeholder) | None                    | File management         |
| Empty state        | Yes               | Yes               | N/A                     | Mixed empty states      |
| Data propagate     | Yes               | Yes               | Tested                  | Goal updates to Home    |

# 18. Jarvis coverage audit

- **Launcher / Conversation / Domain actions / Permissions:** Heavily bounded by unit tests; E2E coverage relies on UI visibility smoke tests.
- **Confirmations / Undo / Errors / Retry:** Missing deep failure path injections (e.g. Jarvis API timeouts).
- **Active-workout interaction:** Minimal cross-domain test mapping.
- **Offline behavior:** Unclear. Cannot verify platform PWA boundary interactions with AI via static checks alone.

# 19. Settings coverage audit

- **Profile / Units / Preferences / Notifications / Privacy / Reset / Clear data / Import / Export / Backup / Recovery / Validation / Destructive actions:**
- Coverage spans `settings-hub-render-smoke.spec.ts`, `settings-hub-safety-smoke.spec.ts`, `settings-data-safety-lifecycle-smoke.spec.ts`.
- **Unit conversions:** Checked explicitly in `unit-conversions.spec.ts`.
- **Safety:** Dialog confirmations are verified before destructive resets occur.
- **Features absent on current main:** Deep Data Safety integration handling atomic cross-tab conflict locks is missing from the active branch.

# 20. Navigation coverage audit

| Transition Source | Transition Destination | Coverage Type        | Reload Verification | Preserved State Asserts |
| ----------------- | ---------------------- | -------------------- | ------------------- | ----------------------- |
| Home              | Training               | Direct routing check | Yes                 | Partial                 |
| Home              | Fuel                   | Direct routing check | Yes                 | Partial                 |
| Fuel              | Deep Dive mode         | UI visibility check  | No                  | No                      |
| Global            | Settings               | UI visibility check  | No                  | Yes (State closure)     |
| Settings          | Back to Origin         | Missing              | N/A                 | N/A                     |
| Active Workout    | Home                   | Missing block check  | N/A                 | N/A                     |
| Any Tab           | Reload                 | Direct assertion     | Yes                 | State survives F5       |

# 21. Sheet, dialog, and popup coverage audit

- **Opening / Closing / Backdrop dismissal / Escape dismissal / Focus trap / Focus restoration / Scrolling / Nested overlays / Safe areas / Mobile height / Destructive confirmation / Accessibility semantics:**
- Checked in `popup-stack-and-scroll-lock-smoke.spec.ts`, `quick-popup-open-close-regression.spec.ts`, `mobile-layout-overlay-smoke.spec.ts`.
- Verifies that body scroll locking functions appropriately and stacking order (z-index) correctly renders.
- **Selector fragility:** Tests scope aggressively using `.sheet-root`, meaning any refactoring of the custom bottom sheet component breaks the test suite.

# 22. Form and validation coverage audit

| Domain   | Target Form    | Required Fields Asserts | Boundary Check Asserts | Cancel/Fail State Retention | Duplicate Submit Guard |
| -------- | -------------- | ----------------------- | ---------------------- | --------------------------- | ---------------------- |
| Fuel     | Meal Log       | Yes                     | Yes (Numeric)          | Partial                     | Missing                |
| Recovery | Check-in       | Yes                     | Yes (Time limits)      | Partial                     | Missing                |
| Stats    | Weigh-in       | Yes                     | Yes (Weight)           | Partial                     | Missing                |
| Training | Active Workout | No                      | No                     | No                          | Missing                |
| Settings | Profile        | Yes                     | Partial                | Partial                     | Missing                |

# 23. Destructive-action coverage audit

- **Delete / Discard / Clear / Reset / Overwrite / Restore / Cancel / Confirm / Undo / Recovery / Reload after deletion / Missing selected record / Privacy-sensitive deletion:**
- Verified in `settings-hub-safety-smoke.spec.ts` mostly.
- Checks success paths (clicking confirm succeeds).
- **Missing coverage:** Testing failure scenarios for destructive actions, checking if records are locked during multi-tab deletion, verifying privacy-sensitive actions properly erase evidence in the AI layer.

# 24. Accessibility coverage audit

- **Keyboard navigation / Visible focus / Accessible names / Labels / Dialog roles / Focus trap / Focus restoration / Escape / Live regions / Chart alternatives / Heatmap accessibility / Reduced motion / Form errors / Active workout / Jarvis:**
- Keyboard focus checks validated in `keyboard-focus-accessibility-smoke.spec.ts`.
- Accessible names verified indirectly through Playwright selector use.
- **Absent / Unclear coverage:** Live regions announcing status updates, proper semantic attributes on highly visual charts, heatmap tab-indexes, reduced motion query logic.

# 25. Responsive coverage audit

- **Viewport coverage:** Projects run at Desktop Chromium, 360 px width, 390 px width. `mobile.spec.ts` asserts base rendering on mobile definitions.
- **Horizontal overflow / Bottom navigation / Safe areas / Sheet sizing:** Asserts that components do not throw errors.
- **Missing assertions:** Actual calculations ensuring no hidden horizontal scrollbars exist on 320 px devices, virtual keyboard overlap tests for forms.

# 26. Analytics unit-test coverage audit

- **Contracts covered:** FitCore Score, training consistency, nutrition adherence, readiness, recovery, Momentum, volume, muscle map, goal progress, comparison interactions, data-quality states.
- Extensive coverage located across the `fitcore-analytics-*.test.ts` suite.
- Logic thoroughly evaluated across ready, empty, zero, unsupported, and boundary states.
- Highly resilient suite decoupled from UI presentation logic.

# 27. Chart interaction coverage audit

- **Exact values / Hover / Tap / Keyboard focus / Tooltips / Range changes / Metric selection / Series visibility / Focus mode / Table mode / Chart reordering / Pinning / Duplication / Comparison / Incompatible units / Mobile interactions / Empty states:**
- Basic empty state UI bounds checked in `chart-empty-data-smoke.spec.ts`.
- **Missing coverage:** Tests are largely title visibility asserts. True interaction checks (hovering bar charts, verifying dynamic tooltips, testing tap boundaries on mobile) are absent.

# 28. Data-propagation coverage audit

- **Paths:** Logging -> Home, Logging -> Domain, Logging -> Stats, Settings -> Forms, Jarvis -> Domain.
- Demonstrated in `data-propagation-smoke.spec.ts`.
- Mutation in one tab (e.g. Fuel) explicitly updates display in Home tab.
- **Missing coverage:** Checking propagation latency, verifying cross-view syncing works dynamically via `localStorage` events without reload.

# 29. Persistence and reload coverage audit

- **First save / Subsequent save / Reload / Hydration / Profile retention / Active workout retention / Meal retention / Recovery retention / Weigh-in retention / Goal retention / Settings retention / Corrupt state / Unsupported state / Storage unavailable / Quota failure / Stale write / Concurrent tabs:**
- Verified in `core-logging-persistence-smoke.spec.ts` and `reload-stability-smoke.spec.ts`.
- Evaluates direct raw JSON parsing capabilities.
- **Missing coverage (Future Data Safety gap):** Concurrent cross-tab write resolution, quota exhaustion injection handling.

# 30. Error and failure-path coverage audit

- **Validation failure:** Covered heavily.
- **Storage failure / Chart failure / Missing selected record / Malformed stored data / Unsupported version / Permission denial / Offline state / Service-worker failure / Jarvis failure / Active-workout failure / Retry / Partial success / Duplicate retry:**
- Almost universally untested outside of generic empty boundary checks.
- Heavily success-path biased. Domains lack negative test assertions for component level error boundaries.

# 31. Empty, partial, and unsupported-state coverage audit

| State Profile  | Home Empty Checks | Fuel Empty Checks | Recovery Empty Checks | Stats Empty Checks | Global Crash Safe |
| -------------- | ----------------- | ----------------- | --------------------- | ------------------ | ----------------- |
| Absolute Zero  | Yes (None logged) | Yes (No meals)    | Yes (No check-ins)    | Yes (No weigh-ins) | Yes               |
| Single Entry   | Missing bounds    | Missing bounds    | Missing bounds        | Missing bounds     | Partial           |
| Partial Goal   | Missing mapping   | N/A               | N/A                   | Missing mapping    | Partial           |
| Malformed JSON | N/A               | N/A               | N/A                   | N/A                | Yes (Rollback)    |
| Unsupported    | UI placeholders   | UI placeholders   | UI placeholders       | UI placeholders    | Yes               |

# 32. PWA and offline coverage audit

- **Service-worker registration / Installability / Cached shell / Offline startup / Offline navigation / Offline logging / Reconnect / Update detection / Waiting worker / Update prompt / Activation / Reload / Stale assets / Storage quota / Standalone mode:**
- **Completely untested.** No Playwright assertions prove standard offline behavior triggers service worker routing or caching.

# 33. Data-safety future coverage map

**Future test requirements for post-merge Data Safety:**

- **Validation / Repair planning / Import inspection / Backup envelope / Atomic persistence / Revision handling / Stale writes / Transaction coordination / Browser lifecycle / Failed writes / Rollback:**
- Expected to reside in `tests/e2e/core-data-safety-*.spec.ts` and `tests/unit/data-safety-*.test.ts`.
- Will strictly require injecting `QuotaExceededError` mocks, launching simultaneous Playwright contexts to force write collisions, and verifying local storage version increments appropriately handle rollbacks.

# 34. Fixture mutation and isolation audit

- **Mutate shared fixtures / Reuse mutable objects / Rely on test order / Leak localStorage / Leak active workout / Leak service workers / Leak timers / Leak browser context / Require serial execution:**
- `playwright.config.ts` forces serial execution via `workers: 1`.
- Shared fixtures within a single spec run risk test-order bleed if local storage is not correctly wiped in `afterEach` hooks.

# 35. Date and timezone test audit

- **Current day / Previous day / Boundaries / Timezone conversion / Daylight saving time / Future dates / Stale thresholds / Same-day duplicates:**
- Relies entirely on implicit environment dates.
- E2E tests are likely to flake near midnight UTC unless a fixed mock clock is injected into the browser context using Playwright APIs.

# 36. Flakiness-risk audit

- **File:** `dashboard-smoke.spec.ts` and others using exact text matches.
- **Pattern:** Tightly coupled UI text searches.
- **Affected behavior:** UI tests fail when copy changes.
- **File:** `navigation-smoke.spec.ts`.
- **Pattern:** UI transition assertions.
- **Affected behavior:** Fast clicks fail if sheet/overlay transitions lock the DOM briefly.

# 37. Presentation-coupling audit

- **Tests coupled to exact exact heading copy / exact class names / exact structure:**
- `expectDashboardReady` checks hardcoded 'FitCore Today' strings.
- Popup tests scope explicitly via the `.sheet-root` CSS class.
- **Redesign break risk:** Critical. Any CSS or heading restructure breaks smoke suites instantly. Replace with semantic `getByRole('dialog')` and `getByRole('heading', { name: ... })` equivalents.

# 38. Behavior-coupling quality audit

- **Strong patterns to reuse:** Tests leveraging `getByRole('button', { name: 'Save' })` and explicit validation of raw stringified JSON within `localStorage` blocks.
- Verifying state changes cross-view logically uncouples testing from layout specifics.

# 39. Test duplication audit

- **Duplication clusters:** Repetitive seeding of `minimalState` and subsequent verification of basic navigation in nearly every E2E test block before the actual core test commences.
- **Risk:** Overly tests basic routing, increasing test time significantly.

# 40. Missing negative-test audit

- **Missing coverage priorities:**
  1. Form submission when offline.
  2. Clicking "Cancel" on active workout destruction with unsaved progress.
  3. Attempting to override deeply nested application configurations while simulating an unhandled `localStorage` parse error.

# 41. Missing boundary-test audit

- **Missing boundary tests:** Adding 99+ exercises to an active workout, testing negative recovery numbers, attempting to weigh-in with extreme edge cases (e.g., 0 lb bodyweight).

# 42. Missing scale-test audit

- **Missing scale tests:** Booting the application with a mocked `localStorage` JSON containing realistically massive multi-year data histories to test UI virtualization and hydration delays.

# 43. Test ownership and file-scope map

- **Domain UI tests:** Safe to edit by feature groups, minimal conflicts (`nutrition-*.spec.ts`, `training-*.spec.ts`).
- **Shared helpers (`fitcore-test-state.ts`):** Conflict hotspot requiring central coordination.
- **Persistence tests (`core-logging-persistence-smoke.spec.ts`):** Conflict hotspot for future Data Safety logic.

# 44. Premium redesign regression checklist

- [ ] Critical features remain reachable.
- [ ] Actions remain functional.
- [ ] Values remain accurate.
- [ ] Units remain visible.
- [ ] Empty states remain honest.
- [ ] Missing and zero remain distinct.
- [ ] Daily View remains action-first.
- [ ] Deep Dive remains analytical.
- [ ] Charts retain exact values.
- [ ] Sheets remain functional.
- [ ] Navigation context remains intact.
- [ ] Mobile behavior remains intact.
- [ ] Accessibility remains intact.
- [ ] No fatal browser errors occur.
- [ ] Data propagates to related views.
- [ ] Reload preserves legitimate data.
- [ ] Selectors use user-facing semantics where possible.

# 45. Future integration regression checklist

- [ ] startup;
- [ ] onboarding;
- [ ] profile hydration;
- [ ] active workout;
- [ ] meals;
- [ ] check-ins;
- [ ] weigh-ins;
- [ ] goals;
- [ ] Settings;
- [ ] Jarvis actions;
- [ ] analytics;
- [ ] cross-view propagation;
- [ ] atomic saves;
- [ ] stale writes;
- [ ] concurrent tabs;
- [ ] import;
- [ ] backup;
- [ ] recovery;
- [ ] offline;
- [ ] service-worker updates;
- [ ] mobile;
- [ ] accessibility;
- [ ] no page errors;
- [ ] no console errors.

# 46. Required future test matrix

### Critical Priority

| Test ID | Domain | Scenario                     | Starting state            | Action                                       | Expected UI result            | Expected data result            | Expected persisted result | Reload expectation | Viewport | Accessibility assertion | Failure-path requirement | Recommended test layer | Likely owner |
| ------- | ------ | ---------------------------- | ------------------------- | -------------------------------------------- | ----------------------------- | ------------------------------- | ------------------------- | ------------------ | -------- | ----------------------- | ------------------------ | ---------------------- | ------------ |
| TC-01   | Data   | Concurrent tab save conflict | Logged in, Tab A & B open | Edit setting in Tab A, Save setting in Tab B | Warns of stale state or syncs | Latest valid configuration wins | JSON updated correctly    | Settings retained  | Desktop  | N/A                     | Mock storage lag         | E2E                    | Platform     |

### High Priority

| Test ID | Domain  | Scenario                     | Starting state                     | Action                              | Expected UI result                                | Expected data result | Expected persisted result | Reload expectation | Viewport   | Accessibility assertion | Failure-path requirement | Recommended test layer | Likely owner |
| ------- | ------- | ---------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------------------- | -------------------- | ------------------------- | ------------------ | ---------- | ----------------------- | ------------------------ | ---------------------- | ------------ |
| TC-02   | UI      | 320 px Mobile overlap bounds | Empty                              | Open bottom sheet, trigger keyboard | Content area squishes without bleeding off screen | N/A                  | N/A                       | N/A                | Mobile-320 | N/A                     | N/A                      | E2E                    | UX           |
| TC-03   | Network | App startup offline          | Empty cache, offline network state | Open app                            | Service worker loads shell, warns 'Offline'       | N/A                  | Data intact               | App starts         | Mobile     | N/A                     | Network disconnected     | E2E                    | Platform     |

### Medium Priority

| Test ID | Domain   | Scenario                    | Starting state    | Action                                   | Expected UI result                          | Expected data result | Expected persisted result | Reload expectation | Viewport | Accessibility assertion | Failure-path requirement | Recommended test layer | Likely owner |
| ------- | -------- | --------------------------- | ----------------- | ---------------------------------------- | ------------------------------------------- | -------------------- | ------------------------- | ------------------ | -------- | ----------------------- | ------------------------ | ---------------------- | ------------ |
| TC-04   | Training | Discard active workout flow | In active session | Click Discard, then Cancel, then Discard | Confirm dialog appears, resets, then clears | Session nullified    | `activeWorkout: null`     | Defaults to main   | Mobile   | Dialog focus trap       | Database locks verified  | E2E                    | Feature      |

### Low Priority

| Test ID | Domain   | Scenario           | Starting state | Action                | Expected UI result           | Expected data result | Expected persisted result | Reload expectation | Viewport | Accessibility assertion | Failure-path requirement | Recommended test layer | Likely owner |
| ------- | -------- | ------------------ | -------------- | --------------------- | ---------------------------- | -------------------- | ------------------------- | ------------------ | -------- | ----------------------- | ------------------------ | ---------------------- | ------------ |
| TC-05   | Settings | Long text clipping | Setup          | Enter very long names | Text truncated with ellipsis | N/A                  | Saves safely              | Renders properly   | Mobile   | N/A                     | N/A                      | E2E                    | Feature      |

# 47. Prioritized regression-risk register

- **Critical:** Active workout persistence conflict.
  - Current tests: Lifecycle smoke.
  - Missing proof: Real-time concurrent edits.
  - Redesign consequence: Potential mass data loss on UI overhaul.
- **High:** Schema backward compatibility.
  - Current tests: Basic schema mapping.
  - Missing proof: Actual version 1-to-4 rolling upgrades.
  - Future dependency: Data Safety integration overhaul.
- **Medium:** Chart touch interactions on mobile viewports.
- **Low:** Settings copywriting mapping directly to strict E2E selectors.

# 48. Prioritized test-infrastructure risk register

- **Critical:** Fixture drift (bypassing the real startup hydration sequence by forcing strict JSON shapes into `localStorage`).
- **High:** Presentation coupling (reliance on `.sheet-root` and specific exact text hashes).
- **Medium:** Date dependence (reliance on implicitly executing in UTC or localized timezones in CI pipelines).
- **Low:** Serial dependence (running `workers: 1` locally vs parallel remote).

# 49. Minimum approval gates by task type

- **Domain Daily View redesign:** Required E2E visibility, mobile coverage.
- **Domain Deep Dive redesign:** Required analytics unit logic bounds.
- **Shared-component change:** Accessibility focus smoke checks, responsive tests.
- **Navigation change:** Required cross-view propagation check.
- **Overlay change:** Required z-index scrolling test updates.
- **Persistence change:** Required E2E storage reload verification.
- **PWA change:** Full offline network injection suite.
- **Final integration:** All scopes.

# 50. Safe future task boundaries

- **Safe for domain-local ownership:** `nutrition-daily-view-panels-smoke.spec.ts`, `training-daily-view-panels-smoke.spec.ts`.
- **Shared test helpers requiring coordination:** `fitcore-test-state.ts`.
- **Central fixture hotspots:** Base `minimalState` defaults.
- **Playwright configuration hotspots:** `playwright.config.ts`.
- **Files likely to conflict with Data Safety work:** `core-logging-persistence-smoke.spec.ts`.
- **Recommended sequencing boundaries:** Decouple layout smoke tests from exact DOM string assertions prior to initiating premium redesign code sequences.

# 51. Open questions and uncertainties

- **Service Worker Lifecycle:** Is caching active on `main`? Tests are completely silent, requiring browser verification to prove current platform behavior.
- **Memory quota behavior:** Does the application intercept memory limits effectively? Requires failure injection tests not present statically.
- **Timezone bounds:** Does the UI correctly handle historical data entry generated across multiple timezones? Statically unresolvable without real test execution limits.

# 52. File index

- **test configuration:** `playwright.config.ts`, `tsconfig.json`, `vite.config.ts`, `package.json`
- **package scripts:** `package.json`
- **fixtures:** `tests/e2e/helpers/fitcore-test-state.ts`
- **helpers:** `tests/e2e/helpers/fitcore-test-state.ts`
- **unit tests:** `tests/unit/*.test.ts`
- **analytics tests:** `tests/unit/fitcore-analytics-*.test.ts`
- **persistence tests:** `tests/e2e/core-logging-persistence-smoke.spec.ts`, `tests/e2e/reload-stability-smoke.spec.ts`
- **Home tests:** `tests/e2e/dashboard-smoke.spec.ts`, `tests/e2e/home-daily-heatmap-polish-smoke.spec.ts`
- **Training tests:** `tests/e2e/training-daily-view-panels-smoke.spec.ts`
- **active-workout tests:** `tests/e2e/active-workout-lifecycle-smoke.spec.ts`
- **Fuel tests:** `tests/e2e/nutrition-daily-view-panels-smoke.spec.ts`, `tests/e2e/nutrition-logging-validation-smoke.spec.ts`
- **Recovery tests:** `tests/e2e/recovery-check-in-validation-smoke.spec.ts`
- **Stats tests:** `tests/e2e/progress-rich-data-smoke.spec.ts`, `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`
- **Settings tests:** `tests/e2e/settings-*.spec.ts`, `tests/e2e/unit-conversions.spec.ts`
- **navigation tests:** `tests/e2e/navigation-smoke.spec.ts`
- **overlay tests:** `tests/e2e/popup-stack-and-scroll-lock-smoke.spec.ts`, `tests/e2e/quick-popup-open-close-regression.spec.ts`
- **accessibility tests:** `tests/e2e/keyboard-focus-accessibility-smoke.spec.ts`
- **responsive tests:** `tests/e2e/mobile.spec.ts`, `tests/e2e/mobile-layout-overlay-smoke.spec.ts`
- **PWA tests:** None found.
- **source files cross-referenced:** `src/lib/`
