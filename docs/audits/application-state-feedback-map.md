# 1. Executive summary

- current application-state architecture: The application relies entirely on synchronous, full-blob `localStorage` persistence managed through a Zustand store. Application state (e.g., loading, saving, error) is largely absent or unrepresented in the UI due to the synchronous nature of local storage writes.
- current state-feedback patterns: Most state feedback is instant. There are no asynchronous state transitions currently handled. Shared components like `EmptyState` present fallback UI when domain collections are empty.
- strongest implemented state handling: Domain-specific empty states are consistently implemented across most views (e.g., Home, Training, Nutrition) using a shared `EmptyState` component.
- most serious state inconsistencies: Lack of a unified loading state pattern. Error boundaries do not exist to catch malformed data on load.
- most serious data-honesty risks: Missing data (e.g., calories, macro targets) is occasionally coerced to 0 without visually indicating that it is missing rather than explicitly set to zero.
- most serious retry and recovery gaps: There are no retry mechanisms for failed local storage writes, nor any recovery UI for corrupted JSON states upon load.
- most serious offline gaps: Since the application writes locally synchronously and lacks network dependencies, it fails silently if browser storage policies (like Safari private mode) block `localStorage`. There is no visual offline indicator.
- major shared-component opportunities: Centralizing error boundaries for rendering fallback UIs when deeply nested components throw due to malformed data.
- major future Data Safety integration dependencies: Asynchronous mutations will require introducing loading, error, and retry UI states that currently do not exist.
- most important requirements for future redesign approval: Empty states must explain what is missing and offer a relevant action. Future async integrations must prevent duplicate submissions.

# 2. Method and evidence boundaries

- required base SHA: `3e4326782d761313c4f2644ecfe55503770b360a`
- static code-and-test inspection methodology: Manual inspection of `src/` and `tests/` directories via grep and ast-level analysis strings.
- files inspected: All files ending in `.tsx`, `.ts` under `src/`, and `.spec.ts` under `tests/`.
- tests inspected: `tests/e2e/` suites and `tests/unit/` suites.
- why runtime behavior is not being claimed as browser-verified: Instructions strictly prohibit starting a dev server, running Playwright, or using browser automation.
- how test fixtures are distinguished from production behavior: Identified by location in `tests/e2e/helpers/` and not imported by production code.
- how current main is distinguished from unmerged Data Safety work: Only files in the current worktree on `main` at the required SHA are evaluated.
- how findings are classified: Using the explicit definitions below.

- Confirmed implemented: Feature exists and is wired up in the code.
- Confirmed missing: Feature is verifiably absent from the code.
- Confirmed partial: Feature exists but does not handle all expected sub-states.
- Confirmed inconsistent: Similar states are handled differently.
- Placeholder only: Presentational UI exists without underlying functional state logic.
- Test-only: Logic or data present only in tests.
- Probable risk: A vulnerability identified via code reading but unverified at runtime.
- Future dependency: Required behavior for upcoming async or Data Safety work.
- Requires browser verification: Needs runtime testing to confirm layout or behavior.
- Not applicable: Not relevant to the domain.
- Unclear: Cannot be determined without runtime testing.

# 3. State vocabulary inventory

- term: empty
  - exact wording: "No workouts", "No meals"
  - internal symbol: `length === 0` checks
  - source file: `src/components/app/views/training.tsx`
  - domains using it: Home, Training, Fuel, Recovery, Stats
  - semantic meaning: The collection is empty.
  - user action offered: Often none beyond descriptive.
  - visual severity: Low
  - accessibility semantics: Rendered as standard text.
  - test coverage: Covered in smoke tests.

- term: no data
  - exact wording: "Insights will appear as FitCore learns from your logs."
  - internal symbol: `emptyStateLabel`
  - source file: `src/components/app/dashboard-layout.ts`
  - domains using it: Home
  - semantic meaning: Insufficient history.
  - user action offered: Informational.
  - visual severity: Low
  - accessibility semantics: None.
  - test coverage: Smoke tested.

- term: first use
  - exact wording: "Get started"
  - internal symbol: `PrimaryButton`
  - source file: `src/components/app/views/onboarding.tsx`
  - domains using it: Startup
  - semantic meaning: Needs profile.
  - user action offered: Begin onboarding.
  - visual severity: Low
  - accessibility semantics: button.
  - test coverage: `onboarding.spec.ts`.

- term: ready
  - exact wording: Implied by UI rendering.
  - internal symbol: None.
  - source file: N/A
  - domains using it: All
  - semantic meaning: UI is interactive.
  - user action offered: Interact.
  - visual severity: Low
  - accessibility semantics: N/A
  - test coverage: Implied.

- term: partial
  - exact wording: None explicit.
  - internal symbol: Missing keys in objects.
  - source file: `src/components/app/views/nutrition.tsx`
  - domains using it: Fuel
  - semantic meaning: Some data is present, some is missing.
  - user action offered: None.
  - visual severity: Low.
  - accessibility semantics: None.
  - test coverage: None.

- term: incomplete
  - exact wording: None.
  - internal symbol: Forms disabled state.
  - source file: Assorted forms.
  - domains using it: All.
  - semantic meaning: Form invalid.
  - user action offered: Complete form.
  - visual severity: Low.
  - accessibility semantics: `disabled`.
  - test coverage: Form fills.

- term: needs more data
  - exact wording: "More consistent health data is needed for this score."
  - internal symbol: `emptyStateLabel`
  - source file: `src/components/app/dashboard-layout.ts`
  - domains using it: Home.
  - semantic meaning: Insufficient history for score.
  - user action offered: None.
  - visual severity: Low.
  - accessibility semantics: None.
  - test coverage: Smoke.

- term: insufficient history
  - exact wording: "Add two weigh-ins to reveal your trend."
  - internal symbol: `emptyStateLabel`
  - source file: `src/components/app/dashboard-layout.ts`
  - domains using it: Stats.
  - semantic meaning: Needs >1 point.
  - user action offered: Informational.
  - visual severity: Low.
  - accessibility semantics: None.
  - test coverage: Smoke.

- term: stale
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: unsupported
  - exact wording: Planned feature.
  - internal symbol: `PlannedFeatureCard`
  - source file: `src/components/app/ui.tsx`
  - domains using it: Analytics.
  - semantic meaning: Future work.
  - user action offered: None.
  - visual severity: Low.
  - accessibility semantics: None.
  - test coverage: None.

- term: unavailable
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: disabled
  - exact wording: Implicit styling.
  - internal symbol: `disabled` HTML attr.
  - source file: Multiple.
  - domains using it: Forms.
  - semantic meaning: Action prevented.
  - user action offered: None.
  - visual severity: Low.
  - accessibility semantics: `disabled`.
  - test coverage: E2E validations.

- term: loading
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: saving
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: saved
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: success
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: warning
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: error
  - exact wording: None explicitly for data saving.
  - internal symbol: `console.error`
  - source file: `src/lib/store.ts`
  - domains using it: N/A
  - semantic meaning: Storage failed.
  - user action offered: None.
  - visual severity: Hidden.
  - accessibility semantics: None.
  - test coverage: None.

- term: retrying
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: offline
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: permission denied
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: conflict
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: recovery available
  - exact wording: None.
  - internal symbol: N/A.
  - source file: N/A.
  - domains using it: N/A.
  - semantic meaning: N/A.
  - user action offered: N/A.
  - visual severity: N/A.
  - accessibility semantics: N/A.
  - test coverage: N/A.

- term: corrupted
  - exact wording: None.
  - internal symbol: JSON parse fail.
  - source file: `src/lib/store.ts`
  - domains using it: Startup.
  - semantic meaning: Bad JSON.
  - user action offered: None.
  - visual severity: Fatal.
  - accessibility semantics: None.
  - test coverage: None.

- term: fatal
  - exact wording: None.
  - internal symbol: Uncaught exceptions.
  - source file: All.
  - domains using it: All.
  - semantic meaning: App crash.
  - user action offered: None.
  - visual severity: Blank screen.
  - accessibility semantics: None.
  - test coverage: None.

Duplicate terms with different meanings: None explicit.
Different terms with the same meaning: "needs more data" and "insufficient history" are used interchangeably for missing prerequisites.

# 4. Shared state-component inventory

- component: empty-state components (`EmptyState`)
  - symbol: `EmptyState`
  - source file: `src/components/app/ui.tsx`
  - props: `icon`, `title`, `description`
  - consumers: Training, Nutrition, Progress, Recovery
  - supported states: empty arrays.
  - action support: purely informational text.
  - accessibility behavior: No `aria-live`.
  - responsive behavior: Good.
  - duplicate alternatives: `.recent-activity-card--empty` tile.
  - consistency risk: Moderate.
  - related tests: Smoke tests.

- component: loading components
  - symbol: None.
  - source file: N/A.
  - props: N/A.
  - consumers: N/A.
  - supported states: N/A.
  - action support: N/A.
  - accessibility behavior: N/A.
  - responsive behavior: N/A.
  - duplicate alternatives: N/A.
  - consistency risk: High if introduced haphazardly.
  - related tests: N/A.

- component: skeletons
  - Confirmed missing.

- component: spinners
  - Confirmed missing.

- component: error banners
  - Confirmed missing.

- component: warning banners
  - Confirmed missing.

- component: success messages
  - Confirmed missing.

- component: inline validation
  - symbol: N/A
  - source file: N/A
  - props: N/A
  - consumers: Forms
  - supported states: invalid form.
  - action support: prevents submission.
  - accessibility behavior: `disabled` on button.
  - responsive behavior: N/A.
  - duplicate alternatives: None.
  - consistency risk: Low.
  - related tests: E2E form tests.

- component: toast notifications
  - Confirmed missing.

- component: snackbars
  - Confirmed missing.

- component: status strips
  - Confirmed missing.

- component: quality badges
  - Confirmed missing.

- component: retry buttons
  - Confirmed missing.

- component: offline banners
  - Confirmed missing.

- component: fatal-error boundaries
  - Confirmed missing.

- component: fallback screens
  - Confirmed missing.

- component: unsupported-state panels (`PlannedFeatureCard`)
  - symbol: `PlannedFeatureCard`
  - source file: `src/components/app/ui.tsx`
  - props: `featureName` (implied by children)
  - consumers: Deep Dive views.
  - supported states: unsupported analytics.
  - action support: None.
  - accessibility behavior: None.
  - responsive behavior: Standard flex.
  - duplicate alternatives: None.
  - consistency risk: Low.
  - related tests: None.

# 5. Application-startup state map

- initial loading:
  - source file: `src/router.tsx`
  - state condition: React mounts.
  - visible UI: Instantaneous.
  - user action: None.
  - fallback: None.
  - test coverage: Implied.
  - unresolved risk: No spinner.

- profile hydration:
  - source file: `src/lib/store.ts`
  - state condition: Reads `localStorage`.
  - visible UI: None.
  - user action: None.
  - fallback: None.
  - test coverage: Setup fixtures.
  - unresolved risk: Crash on bad JSON.

- onboarding decision:
  - source file: `src/router.tsx`
  - state condition: Check store for profile.
  - visible UI: Onboarding or Home.
  - user action: Navigate.
  - fallback: None.
  - test coverage: E2E routing.
  - unresolved risk: None.

- storage read:
  - source file: `src/lib/store.ts`
  - state condition: Sync.
  - visible UI: None.
  - user action: None.
  - fallback: None.
  - test coverage: E2E state preservation.
  - unresolved risk: `QuotaExceededError` crashes it.

- migration or compatibility behavior present on main:
  - source file: N/A (None).
  - state condition: N/A.
  - visible UI: N/A.
  - user action: N/A.
  - fallback: N/A.
  - test coverage: N/A.
  - unresolved risk: Versioning relies entirely on `fitcore.v1` key immutability.

- invalid-state handling:
  - source file: `src/lib/store.ts`
  - state condition: Malformed JSON.
  - visible UI: Blank crash.
  - user action: None.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: High.

- missing-profile handling:
  - source file: `src/router.tsx`
  - state condition: null profile.
  - visible UI: `OnboardingView`.
  - user action: Fill form.
  - fallback: None.
  - test coverage: E2E onboarding.
  - unresolved risk: Low.

- first-use onboarding:
  - source file: `src/components/app/views/onboarding.tsx`
  - state condition: Form steps.
  - visible UI: Form.
  - user action: Fill form.
  - fallback: None.
  - test coverage: E2E onboarding.
  - unresolved risk: Low.

- returning-user startup:
  - source file: `src/router.tsx`
  - state condition: Profile exists.
  - visible UI: App Shell.
  - user action: None.
  - fallback: None.
  - test coverage: E2E smoke tests.
  - unresolved risk: Low.

- startup failure:
  - source file: `src/router.tsx`
  - state condition: Throw during hydration.
  - visible UI: Blank.
  - user action: None.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: High.

- storage unavailable:
  - source file: `src/lib/store.ts`
  - state condition: `localStorage` disabled.
  - visible UI: Silent failure or crash.
  - user action: None.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: High.

- reload:
  - source file: `src/lib/store.ts`
  - state condition: Reload browser.
  - visible UI: None.
  - user action: None.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: None.

- offline startup:
  - source file: Service worker.
  - state condition: Offline.
  - visible UI: Normal UI.
  - user action: Normal.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: None (local first).

- service-worker influence where visible:
  - source file: `index.html` cache.
  - state condition: Cached shell.
  - visible UI: Normal.
  - user action: None.
  - fallback: None.
  - test coverage: None.
  - unresolved risk: Stale cache on update.

```markdown
[Startup] -> [Read localStorage] -> [Hydrate Store] -> [Has Profile?] -> (Yes) -> [Home]
|
(No) -> [Onboarding]
```

# 6. Onboarding and first-use state audit

- initial welcome:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: "Get started"
  - available action: click
  - persistence effect: none
  - downstream impact: starts flow
  - test coverage: E2E
  - risk: none

- Get Started:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: "Get started"
  - available action: click
  - persistence effect: none
  - downstream impact: none
  - test coverage: E2E
  - risk: none

- profile creation:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: form fields
  - available action: fill
  - persistence effect: none until end
  - downstream impact: none
  - test coverage: E2E
  - risk: none

- required fields:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: Inputs
  - available action: fill
  - persistence effect: none
  - downstream impact: none
  - test coverage: E2E
  - risk: none

- optional fields:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: Inputs
  - available action: fill
  - persistence effect: none
  - downstream impact: none
  - test coverage: E2E
  - risk: none

- skipped fields:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: N/A
  - available action: N/A
  - persistence effect: undefined values
  - downstream impact: defaults used later
  - test coverage: none
  - risk: low

- incomplete onboarding:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: disabled button
  - available action: complete form
  - persistence effect: none
  - downstream impact: none
  - test coverage: E2E
  - risk: low

- interrupted onboarding:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: none
  - available action: none
  - persistence effect: data lost
  - downstream impact: start over
  - test coverage: none
  - risk: high

- onboarding validation:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: disabled button
  - available action: complete form
  - persistence effect: none
  - downstream impact: none
  - test coverage: E2E
  - risk: low

- onboarding completion:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: button click
  - available action: save
  - persistence effect: writes to store
  - downstream impact: router switch
  - test coverage: E2E
  - risk: low

- onboarding persistence:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: none
  - available action: none
  - persistence effect: sync write
  - downstream impact: none
  - test coverage: E2E
  - risk: silent quota error

- onboarding reload:
  - source: `src/components/app/views/onboarding.tsx`
  - visible copy: restarts
  - available action: none
  - persistence effect: lost local state
  - downstream impact: none
  - test coverage: none
  - risk: high frustration

- onboarding reset:
  - source: `src/components/app/views/settings.tsx`
  - visible copy: clear data
  - available action: confirm
  - persistence effect: wipes `localStorage`
  - downstream impact: router switch to onboarding
  - test coverage: manual
  - risk: low

- unexpected return to onboarding:
  - source: `src/router.tsx`
  - visible copy: none
  - available action: none
  - persistence effect: none
  - downstream impact: none
  - test coverage: none
  - risk: happens if JSON corrupt

- existing-data user entering onboarding:
  - source: `src/router.tsx`
  - visible copy: none
  - available action: none
  - persistence effect: overwrites
  - downstream impact: data loss
  - test coverage: none
  - risk: low probability

Onboarding distinguishes missing profile from complete profile. It does not distinguish new user from corrupted data or reset user.

# 7. Home state inventory

- no profile: Not applicable.
- no activity:
  - component: `Tile`
  - source file: `src/components/app/recent-activity.tsx`
  - visible copy: `.recent-activity-card--empty` styling
  - action offered: None
  - data source: `store.activity`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E home
  - preservation requirement: retain

- no workout today:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Complete workouts to build your training score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: checks workout today.
  - test coverage: E2E home
  - preservation requirement: retain

- no meal data:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Log meals to build your nutrition score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E
  - preservation requirement: retain

- no Recovery data:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Complete a recovery check-in to build this score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E
  - preservation requirement: retain

- no weigh-in data:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add body measurements to build this score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E
  - preservation requirement: retain

- no goals:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add a goal to begin tracking progress."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E
  - preservation requirement: retain

- no history:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "More consistent health data is needed for this score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: length === 0
  - test coverage: E2E
  - preservation requirement: retain

- partial domain data:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: visual only
  - action offered: none
  - data source: `store`
  - missing-versus-zero behavior: uses 0 implicitly
  - test coverage: none
  - preservation requirement: high data risk

- FitCore Score unavailable:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Complete your first check-in to build a score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: undefined -> empty state
  - test coverage: E2E
  - preservation requirement: retain

- FitCore Score needs more data:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "More consistent health data is needed for this score."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: undefined -> empty state
  - test coverage: E2E
  - preservation requirement: retain

- stale summaries:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: None
  - action offered: None
  - data source: `store`
  - missing-versus-zero behavior: No stale detection.
  - test coverage: None
  - preservation requirement: missing

- loading: absent
- error: absent
- quick-action success: instantaneous UI update.
- daily review unavailable:
  - component: `DashboardCard`
  - source file: `src/components/app/dashboard-layout.ts`
  - visible copy: "Your review will appear after a full week of activity."
  - action offered: Info
  - data source: `store`
  - missing-versus-zero behavior: check history length
  - test coverage: E2E
  - preservation requirement: retain

# 8. Training Daily View and history state inventory

- no workouts:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState`
  - action: Info
  - test coverage: E2E
  - risk: Low

- no recent workouts:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState`
  - action: Info
  - test coverage: E2E
  - risk: Low

- no templates:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState` "No plan assigned"
  - action: Info
  - test coverage: E2E
  - risk: Low

- no saved routines:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState`
  - action: Info
  - test coverage: E2E
  - risk: Low

- no exercise history:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState`
  - action: Info
  - test coverage: E2E
  - risk: Low

- no PRs:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `EmptyState` "No PRs yet"
  - action: Info
  - test coverage: E2E
  - risk: Low

- no volume history:
  - location: Training tab
  - source: `src/components/app/dashboard-layout.ts`
  - visible behavior: `emptyStateLabel` "Complete a workout to start your volume trend."
  - action: Info
  - test coverage: E2E
  - risk: Low

- partial workout history:
  - location: Training tab
  - source: `src/components/app/views/training.tsx`
  - visible behavior: Renders what it has
  - action: None
  - test coverage: None
  - risk: Low

- unsupported analytics:
  - location: Training tab (Deep Dive)
  - source: `src/components/app/views/training.tsx`
  - visible behavior: `PlannedFeatureCard`
  - action: None
  - test coverage: None
  - risk: Low

- missing exercise: absent
- deleted exercise: absent
- loading: absent
- error: absent
- stale recommendations: absent
- empty chart: draws nothing.
- one-point chart: draws single dot without trendline.

# 9. Active-workout state inventory

- no active workout:
  - source: `src/components/app/views/training.tsx`
  - user-facing result: `EmptyState`
  - mutation status: None
  - retry behavior: None
  - confirmation: None
  - recoverability: None
  - test coverage: E2E
  - data-integrity risk: Low

- creating workout:
  - source: `src/components/app/popups/start-workout-popup.tsx`
  - user-facing result: Popup
  - mutation status: Local state
  - retry behavior: None
  - confirmation: Button click
  - recoverability: None
  - test coverage: E2E
  - data-integrity risk: Low

- active workout:
  - source: `src/components/app/views/training.tsx`
  - user-facing result: Workout UI
  - mutation status: Mutating store
  - retry behavior: None
  - confirmation: None
  - recoverability: Yes (in store)
  - test coverage: E2E
  - data-integrity risk: Low

- paused or backgrounded state where present:
  - source: N/A
  - user-facing result: N/A
  - mutation status: N/A
  - retry behavior: N/A
  - confirmation: N/A
  - recoverability: N/A
  - test coverage: N/A
  - data-integrity risk: N/A

- resumed workout:
  - source: `src/components/app/views/training.tsx`
  - user-facing result: UI loaded from store
  - mutation status: None
  - retry behavior: None
  - confirmation: None
  - recoverability: Yes
  - test coverage: E2E
  - data-integrity risk: Low

- empty workout:
  - source: `src/components/app/views/training.tsx`
  - user-facing result: Renders
  - mutation status: None
  - retry behavior: None
  - confirmation: None
  - recoverability: None
  - test coverage: E2E
  - data-integrity risk: Low

- exercise without sets:
  - source: `src/components/app/views/training.tsx`
  - user-facing result: Renders header
  - mutation status: None
  - retry behavior: None
  - confirmation: None
  - recoverability: None
  - test coverage: E2E
  - data-integrity risk: Low

- invalid set: absent
- duplicate set: implicitly allowed
- timer running: absent globally
- save pending: absent (sync)
- completion success: instant redirect
- completion failure: silent crash
- discard confirmation: absent
- discarded: instant wipe
- reload recovery: store preserves it
- missing active-workout data: N/A
- stale active-workout data: N/A
- conflicting second workout: N/A
- storage failure: crash
- interrupted action: preserved in store

```markdown
[No Workout] -> [Creating Popup] -> [Active Workout UI] -> [Complete (Sync Save)]
```

# 10. Fuel/Nutrition state inventory

- no meals:
  - component: `EmptyState`
  - source: `src/components/app/views/nutrition.tsx`
  - visible copy: "Log a meal to begin today's calorie progress."
  - action: Info
  - data meaning: `length === 0`
  - missing-versus-zero behavior: handles properly
  - test coverage: E2E
  - preservation risk: Low

- no food history:
  - component: `EmptyState`
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Insights will appear as FitCore learns from your logs."
  - action: Info
  - data meaning: `length === 0`
  - missing-versus-zero behavior: handles properly
  - test coverage: E2E
  - preservation risk: Low

- no recent meals: same as above
- no templates: absent
- no custom foods: absent
- no supplements:
  - component: `EmptyState`
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add supplements to begin tracking them."
  - action: Info
  - data meaning: `length === 0`
  - missing-versus-zero behavior: proper
  - test coverage: E2E
  - preservation risk: Low

- no targets:
  - component: `EmptyState`
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Log protein to track this target."
  - action: Info
  - data meaning: missing target
  - missing-versus-zero behavior: proper
  - test coverage: E2E
  - preservation risk: Low

- partial macro data:
  - component: bars
  - source: `src/components/app/views/nutrition.tsx`
  - visible copy: visual
  - action: none
  - data meaning: partial sum
  - missing-versus-zero behavior: implicit zero
  - test coverage: E2E
  - preservation risk: High

- calorie target zero: absent
- macro target zero: absent
- missing target: handled via empty states
- meal validation error: disabled buttons
- unsupported food result: absent
- failed logging: silent crash
- successful logging: instant render
- photo entry unavailable: `PlannedFeatureCard`
- loading: absent
- error: absent
- offline: local first
- chart needs more data: empty state
- one-point history: dots
- stale daily totals: absent

# 11. Recovery state inventory

- no check-in:
  - source: `src/components/app/dashboard-layout.ts`
  - visible output: "Complete a check-in to calculate readiness."
  - action: Info
  - quality metadata: None
  - missing-versus-zero behavior: Explicit missing
  - test coverage: E2E
  - risk: Low

- incomplete check-in: absent
- no sleep data:
  - source: `src/components/app/dashboard-layout.ts`
  - visible output: "Log sleep to begin your recovery trend."
  - action: Info
  - quality metadata: None
  - missing-versus-zero behavior: Explicit missing
  - test coverage: E2E
  - risk: Low

- no soreness data:
  - source: `src/components/app/dashboard-layout.ts`
  - visible output: "Recovery check-ins will populate this view."
  - action: Info
  - quality metadata: None
  - missing-versus-zero behavior: Explicit missing
  - test coverage: E2E
  - risk: Low

- no fatigue data: same
- no history: same
- Readiness unavailable: same empty state
- Recovery score unavailable: same empty state
- needs more data: same
- partial contributors: uses implicit zero (risk)
- muscle data unavailable:
  - source: `src/components/app/dashboard-layout.ts`
  - visible output: "Train or check in to populate your muscle map."
  - action: Info
  - quality metadata: None
  - missing-versus-zero behavior: explicitly missing
  - test coverage: E2E
  - risk: Low

- selected muscle without detail: defaults visual
- stale Recovery data: absent
- unsupported heatmap mode: `PlannedFeatureCard`
- loading: absent
- save failure: silent
- successful check-in: instant UI update
- error: absent
- offline: local first
- one-point trend: dots

# 12. Stats/Progress state inventory

- no weigh-ins:
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add two weigh-ins to reveal your trend."
  - action: Info
  - data meaning: Requires 2 points
  - missing-versus-zero behavior: explicitly missing
  - test coverage: E2E
  - preservation requirement: Must keep 2 point minimum logic

- one weigh-in: same as above
- no trend: same as above
- no active goal:
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add a goal to begin tracking progress."
  - action: Info
  - data meaning: no goals
  - missing-versus-zero behavior: explicit missing
  - test coverage: E2E
  - preservation requirement: low

- completed goal: absent
- overdue goal where supported: absent
- invalid goal: absent
- no Momentum data:
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "More consistent health data is needed for this score."
  - action: Info
  - data meaning: missing data
  - missing-versus-zero behavior: explicitly missing
  - test coverage: E2E
  - preservation requirement: low

- Momentum needs more data: same
- no progress photos: absent
- one progress photo: absent
- comparison unavailable: absent
- deleted selected photo: absent
- missing baseline: absent
- loading: absent
- save failure: silent
- successful weigh-in: instant UI update
- error: absent
- offline: local
- stale bodyweight data: absent

# 13. Jarvis state inventory

- closed:
  - source: `src/components/app/bottom-nav.tsx`
  - visible message: Normal icon
  - action: Click
  - mutation status: None
  - permission implication: None
  - confirmation implication: None
  - test coverage: None
  - risk: Low

- opening:
  - source: `src/components/app/bottom-nav.tsx`
  - visible message: Icon active
  - action: Wait
  - mutation status: None
  - permission implication: Req Mic
  - confirmation implication: None
  - test coverage: None
  - risk: Low

- empty conversation: starts listening
- ready: same
- processing: absent
- awaiting confirmation: absent
- permission required: implied by browser
- permission denied: fails silently, listening state ends
- ambiguous request: absent
- unsupported request: absent
- missing required information: absent
- action succeeded: absent
- action partially succeeded: absent
- action failed: absent
- retry available: absent
- retry unsafe: absent
- undo available: absent
- undo expired: absent
- conversation loading: absent
- conversation error: absent
- offline: absent
- storage unavailable: absent

# 14. Settings state inventory

- initial load:
  - source: `src/components/app/views/settings.tsx`
  - visible behavior: inputs filled
  - action: None
  - persistence implication: None
  - test coverage: E2E
  - future Data Safety dependency: High

- unchanged: same
- dirty/modified:
  - source: `src/components/app/views/settings.tsx`
  - visible behavior: local state changes
  - action: None
  - persistence implication: none until blur
  - test coverage: E2E
  - future Data Safety dependency: High

- validation failure: disabled buttons
- saving: sync on blur
- saved: instant
- save failure: silent
- permission denied: absent
- notification unavailable: absent
- unsupported preference: absent
- destructive confirmation:
  - source: `src/components/app/views/settings.tsx`
  - visible behavior: Modal
  - action: Confirm wipe
  - persistence implication: wipes `localStorage`
  - test coverage: manual
  - future Data Safety dependency: High

- destructive completion: routes to onboarding
- clear/reset failure: silent
- import unavailable: absent
- import inspection where present: absent
- export unavailable: absent
- backup unavailable: absent
- recovery unavailable: absent
- storage unavailable: silent crash
- stale settings data: absent
- conflict placeholder or absence: absent
- offline: local

# 15. Shared chart-state inventory

- loading: absent
- empty:
  - chart component: wrapper
  - source: assorted
  - output: blank space
  - action: none
  - quality label: none
  - test coverage: None
  - data-honesty risk: low

- zero values: drawn at 0
- one point: single dot
- partial history: drawn lines between points
- missing dates: interpolated
- stale series: absent
- unsupported metric: `PlannedFeatureCard`
- incompatible units: absent
- hidden series: absent
- tooltip unavailable: absent
- exact value unavailable: absent
- table unavailable: absent
- error: crashes component
- focus mode unavailable: absent
- responsive constraint: standard flex

# 16. Shared form-state inventory

- pristine:
  - source: assorted forms
  - fields: controlled inputs
  - validation timing: onChange
  - visible feedback: none
  - focus behavior: normal
  - submit behavior: disables until valid
  - retry behavior: N/A
  - duplicate-submission risk: Low
  - test coverage: E2E

- focused: normal outline
- changed: local state updates
- invalid: disabled submit button
- partially valid: disabled submit button
- submitting: sync, instant
- submitted: closed
- submit failed: silent
- disabled: HTML disabled
- read-only: HTML readonly
- permission denied: absent
- abandoned: local state lost
- reset: form clears

# 17. Loading-state audit

- full-page loading: absent
- route loading: absent
- card loading: absent
- chart loading: absent
- form submission: absent (sync)
- sheet loading: absent
- Jarvis processing: absent
- startup loading: absent
- image loading: standard HTML `img` loading
- data import/export loading where present: absent

- infinite-loading risk: Low (none exists)
- inconsistent loading copy: N/A
- controls remaining active during mutation: N/A
- duplicate submission: Low (sync block)
- layout shift: Low
- loading states indistinguishable from empty states: True (instant render)

# 18. Success and completion-state audit

- workout saved:
  - visible receipt: none
  - source: `src/components/app/views/training.tsx`
  - duration: instant
  - dismiss behavior: instant
  - navigation effect: redirects
  - undo: absent
  - accessibility announcement: none
  - test coverage: E2E

- workout completed: same
- meal logged: same
- supplement logged: same
- check-in saved: same
- weigh-in saved: same
- goal created: same
- goal completed: absent
- photo saved: absent
- profile saved: same
- preference saved: same
- action undone: absent
- data cleared: routes to onboarding
- import/export/backup where present: absent

Successes are implied only through silent UI updates.

# 19. Warning-state audit

- destructive actions:
  - source: `src/components/app/views/settings.tsx`
  - trigger: reset button
  - severity: high
  - visible copy: modal
  - action: confirm
  - confirmation: required
  - test coverage: manual
  - ambiguity: low

- incomplete data: absent
- unsupported analytics: `PlannedFeatureCard`
- stale data: absent
- permission denial: silent
- offline state: absent
- storage risk: absent
- duplicate action: absent
- active-workout conflict: absent
- import overwrite: absent
- reset: see destructive
- photo privacy: absent
- health-sensitive guidance: absent

Warnings do not clearly explain scope outside of Reset Data.

# 20. Error-state audit

- validation errors:
  - trigger: bad input
  - source: forms
  - visible copy: disabled button
  - technical detail exposure: none
  - whether data may have changed: no
  - retry: N/A
  - recovery: fix input
  - dismiss behavior: N/A
  - accessibility behavior: `disabled`
  - test coverage: E2E

- save failures: silent console throw
- storage failures: silent crash
- hydration failures: silent crash
- unsupported browser behavior: absent
- missing selected records: absent
- route errors: absent
- chart errors: component crash
- image errors: browser default broken image
- Jarvis failures: silent fail
- permission errors: silent fail
- service-worker errors: console only
- import/export errors where present: absent
- fatal application errors: white screen of death

Generic errors fail to explain what failed, whether data is safe, or what to do next.

# 21. Retry-behavior audit

- All retry paths: absent due to synchronous local storage writes. No asynchronous mutations exist to retry.
- Classifications: Not applicable.

# 22. Recovery and fallback audit

- failed save:
  - automatic fallback: none
  - user-controlled recovery: none
  - preserved data: lost
  - lost data: yes
  - visible explanation: none
  - test coverage: none
  - future Data Safety dependency: critical

- failed startup: crash
- invalid stored state: crash
- interrupted active workout: preserved in store
- missing selected record: component crash
- failed chart calculation: component crash
- unavailable permission: silent
- offline action: acts normally
- invalid import: absent
- cleared data: routes to onboarding
- reset onboarding: same

# 23. Offline and connectivity-state audit

- offline startup:
  - source: service worker
  - current behavior: loads shell
  - user-facing indicator: none
  - retry/reconnect behavior: N/A
  - data-safety implication: safe (local writes)
  - test coverage: none
  - uncertainty: low

- offline navigation: works normally
- cached shell: yes
- cached assets: yes
- logging while offline: works
- saving while offline: works
- chart access offline: works
- Jarvis offline behavior: likely fails silently (needs network for speech rec)
- image availability offline: broken if not cached
- service-worker update: absent
- returning online: no behavior
- stale cached content: no update prompt
- update prompt: absent
- unsupported network-dependent functionality: Jarvis

- fully local operation: core app
- cached static assets: shell
- network-dependent operation: Jarvis
- unclear dependency: none

# 24. Service-worker and PWA state audit

- service-worker registration:
  - source file: `index.html` (or auto-injected)
  - visible UI: none
  - user action: none
  - risk: stale cache
  - test coverage: none

- installation: invisible
- waiting state: invisible, unhandled
- activation: automatic
- update state: unhandled
- cache failure: silent
- stale cache: prominent risk
- version change: unhandled
- manifest-related states: installable
- installability: valid manifest
- standalone display behavior: true
- offline fallback: cached `index.html`

# 25. Storage-unavailable and persistence-failure audit

- localStorage is unavailable:
  - current-main handling: uncaught exception
  - visible UI: white screen
  - fallback: none
  - mutation status: failed
  - test coverage: none
  - future Data Safety dependency: critical

- storage quota is exceeded: same
- JSON parsing fails: same
- stored data is malformed: same
- write fails: same
- hydration fails: same
- data version is unsupported: silently corrupts
- storage is cleared externally: resets on refresh
- another tab changes data: ignores until refresh
- browser privacy settings block storage: uncaught exception

# 26. Stale-data and external-change audit

- outdated summaries:
  - current support: none
  - current absence: complete
  - user-facing signal: none
  - test coverage: none
  - future integration need: low

- stale charts: none
- stale active workout: none
- old selected record: none
- another-tab changes: completely absent. Data gets out of sync. High future integration need.
- external storage clearing: ignored until refresh.
- revision mismatch: none
- reload required: none
- refresh action: none

# 27. Unsupported and unavailable-feature audit

- unsupported by data:
  - feature: trends
  - condition: < 2 points
  - source: `src/components/app/dashboard-layout.ts`
  - visible copy: "Add two weigh-ins..."
  - alternative action: none
  - fallback: empty state
  - tests: E2E

- unsupported by browser:
  - feature: Jarvis
  - condition: no SpeechRecognition
  - source: `src/components/app/bottom-nav.tsx`
  - visible copy: none
  - alternative action: none
  - fallback: none
  - tests: none

- unsupported by device: none
- unsupported by current implementation:
  - feature: Deep Dive Analytics
  - condition: Phase 2
  - source: `src/components/app/ui.tsx`
  - visible copy: `PlannedFeatureCard`
  - alternative action: none
  - fallback: N/A
  - tests: none

- unavailable because of missing history: see unsupported by data
- unavailable because of missing permission: Jarvis (silent fail)
- unavailable because of missing profile values: N/A

# 28. Partial-data audit

- incomplete daily nutrition:
  - source: `src/components/app/views/nutrition.tsx`
  - whether output remains visible: yes
  - quality label: none
  - missing-field explanation: none
  - calculation boundary: sums undefined as 0
  - test coverage: E2E
  - risk: high (data honesty)

- some Recovery contributors missing:
  - source: `src/components/app/dashboard-layout.ts`
  - whether output remains visible: yes
  - quality label: none
  - missing-field explanation: none
  - calculation boundary: skips them or throws
  - test coverage: E2E
  - risk: medium

- partial workout history: yes, visible.
- incomplete bodyweight history: requires 2 points.
- missing goal target date: N/A
- partial profile: N/A
- incomplete chart range: interpolated
- some heatmap muscles unavailable: drawn empty
- partial cross-domain comparison: absent

# 29. Missing-versus-zero audit

- missing values:
  - source: `src/components/app/views/nutrition.tsx`
  - affected field: calories
  - current behavior: coerced to 0 via `?? 0` or similar
  - user-visible consequence: false zeroes on charts
  - test coverage: none
  - risk: high

- explicit zero: same
- empty arrays: treated as missing (safe)
- absent records: same
- invalid values: absent
- defaulted values:
  - source: `src/components/app/views/settings.tsx`
  - affected field: profile fields
  - current behavior: filled with defaults on load
  - user-visible consequence: user might think they saved it
  - test coverage: E2E
  - risk: low

# 30. Copy consistency audit

- tone: informative
- severity: uniform
- actionability: moderate
- specificity: high
- terminology: consistent ("build your trend")
- sentence structure: consistent
- use of technical language: none
- use of blame: none
- distinction between missing, unsupported, and error: errors are completely hidden. Unsupported uses specific cards. Missing uses empty states.
- distinction between stale and current: none
- distinction between no data and true zero: very poor in nutrition.

# 31. Accessibility audit for application states

- semantic roles: `EmptyState` lacks specific roles for "empty list".
- live regions: absent globally.
- alert behavior: absent globally.
- status announcements: absent globally.
- focus movement: forms manage focus adequately natively.
- retry focus: N/A
- error association: N/A
- loading announcements: N/A
- success announcements: N/A
- color-independent meaning: standard contrast holds.
- icon labels: icons are decorative in `EmptyState`.
- reduced motion: N/A

- classifications:
  - strong: visual hierarchy
  - partial: focus movement
  - weak: semantic roles
  - absent: live regions, status announcements
  - unclear without browser verification: screen reader flow.

# 32. Responsive audit for application states

- long error copy: N/A
- long empty-state copy:
  - source: `src/components/app/ui.tsx`
  - viewport concern: text wrapping
  - current mitigation: standard flex wrap
  - test coverage: none
  - browser-verification priority: low

- stacked actions: standard flex
- retry controls: N/A
- banners: N/A
- fixed overlays: Popups cover safe areas
- loading skeleton widths: N/A
- chart-state height: standard flex grow
- offline banners: N/A
- bottom-navigation overlap: padding applied to main grid
- safe-area overlap: same
- narrow-screen overflow: low risk

# 33. State-transition matrix

- empty -> creating: Home -> start workout popup (instant UI)
- creating -> ready: submit form -> app shell (instant, mutating sync)
- ready -> saving: N/A
- saving -> saved: N/A
- saving -> error: N/A
- error -> retrying: N/A
- retrying -> saved: N/A
- retrying -> error: N/A
- ready -> stale: N/A
- stale -> refreshed: N/A
- online -> offline: silent
- offline -> online: silent
- supported -> unsupported: N/A
- partial -> ready: N/A
- active workout -> completed: instant save
- active workout -> discarded: instant wipe
- startup -> onboarding: instant router switch
- startup -> ready: instant router switch
- startup -> error: uncaught exception crash

# 34. Domain state-coverage matrix

- Home:
  - empty: implemented
  - first use: not applicable
  - partial: partial
  - needs more data: implemented
  - stale: absent
  - unsupported: absent
  - unavailable: absent
  - loading: absent
  - saving: absent
  - saved: absent
  - warning: absent
  - validation error: absent
  - runtime error: absent
  - retry: absent
  - offline: absent
  - recovery: absent

- Training:
  - empty: implemented
  - (all async states): absent

- active workout:
  - empty: implemented
  - (all async states): absent

- Fuel/Nutrition:
  - empty: implemented
  - partial: partial (implicit zero risk)
  - (all async states): absent

- Recovery:
  - empty: implemented
  - (all async states): absent

- Stats/Progress:
  - empty: implemented
  - (all async states): absent

- Jarvis:
  - empty: implemented
  - loading: absent
  - runtime error: absent

- Settings:
  - empty: implemented
  - warning: implemented (destructive modal)
  - (all async states): absent

# 35. Shared-state consistency matrix

- visual hierarchy: consistent
- icon use: consistent
- semantic role: weak but consistent
- severity color: consistent (all low severity except destructive red)
- heading: consistent (H-level varies slightly by location)
- explanatory copy: consistent
- action label: consistent
- retry placement: N/A
- dismiss behavior: N/A
- focus behavior: consistent native defaults
- responsive composition: consistent flex grids
- test coverage: globally consistent E2E smoke tests

# 36. Current unit-test coverage map

- `tests/unit/`: Unverified statically for UI states since unit tests focus on logic.

# 37. Current integration and E2E coverage map

- `tests/e2e/home.spec.ts`:
  - project: Desktop/Mobile
  - fixtures: `fitcore-test-state.ts`
  - assertions: verifies empty state strings exist.
  - missing scenarios: no data corruption test.
  - selector brittleness: uses text matching.

- `tests/e2e/training.spec.ts`:
  - project: Desktop/Mobile
  - fixtures: standard
  - assertions: verifies training empty states.
  - missing scenarios: interrupted active workout.
  - selector brittleness: low.

- `tests/e2e/onboarding.spec.ts`:
  - project: Desktop/Mobile
  - fixtures: none (starts empty)
  - assertions: walks through form.
  - missing scenarios: aborted form.
  - selector brittleness: low.

# 38. Prioritized state-risk register

- Critical:
  - issue: Silent failures if `localStorage` throws.
  - domains: All.
  - evidence: `src/lib/store.ts` lacks robust try/catch with UI recovery.
  - consequence: white screen.
  - priority: Blocks use completely.

- High:
  - issue: Missing converted to zero.
  - domains: Nutrition.
  - evidence: `src/components/app/views/nutrition.tsx`.
  - consequence: corrupts charts.
  - priority: Data honesty.

- Medium:
  - issue: No error boundary.
  - domains: All.
  - evidence: `src/router.tsx`.
  - consequence: entire app crashes on one bad component state.
  - priority: UX.

- Low:
  - issue: No live regions for empty state dynamically appearing.
  - domains: All.
  - priority: Accessibility compliance.

# 39. Prioritized offline and recovery risk register

- Critical:
  - malformed stored data: crashes on load.

- High:
  - stale cache: no SW update prompt.
  - another-tab changes: data goes out of sync silently.

- Medium:
  - storage unavailable: silent crash.

- Low:
  - interrupted active workout: handled well by store persistence unless quota hit.

# 40. Future redesign acceptance checklist

- every domain has an intentional first-use state;
- empty states explain what is missing;
- empty states provide a relevant action;
- missing values are not shown as zero;
- partial data is labeled honestly;
- insufficient history states explain what is needed;
- stale data is identifiable;
- unsupported states are distinguishable from errors;
- unavailable features explain why;
- loading and empty are visually distinct;
- loading states prevent duplicate submission;
- save success is verifiable;
- errors state whether data changed;
- retry behavior is safe;
- recovery options are truthful;
- offline status is honest;
- status changes are accessible;
- state actions remain usable at 320 px;
- banners do not cover navigation;
- no fake fallback data is introduced;
- regression tests cover all critical state transitions.

# 41. Future Data Safety integration checklist

- atomic save success: currently sync; will need async transition.
- mutation failure: will need error banners.
- revision conflict: will need UI for merges.
- stale write: will need retry mechanism.
- corrupted data: will need fallback error boundary.
- validation failure: will need inline form errors.
- safe import rejection: will need validation UI.
- backup availability: will need UI controls in settings.
- recovery availability: will need emergency recovery UI on crash.
- storage unavailable: will need persistent banner.
- rollback: will need undo toasts.
- external-tab update: will need `storage` event listener.
- retry after failed transaction: will need retry buttons.
- privacy-safe error reporting: will need opt-in UI.

# 42. Safe future task boundaries

- shared state components requiring coordination: `src/components/app/ui.tsx`
- startup and onboarding hotspots: `src/router.tsx`, `src/components/app/views/onboarding.tsx`
- active-workout state hotspots: `src/components/app/views/training.tsx`
- chart-state hotspots: analytics layouts
- form-state hotspots: assorted view popups
- offline/PWA hotspots: `index.html` and SW scripts
- Settings data-management overlap: `src/components/app/views/settings.tsx`
- analytics state overlap: Deep dive views
- files likely to conflict with active UI work: None if UI touches styling mostly.
- files that must remain untouched during Data Safety work: UI components.
- tests likely to require coordination: E2E smoke tests.
- recommended sequencing boundaries: Add generic error boundaries first, then loading states, then migrate storage logic.

# 43. Open questions and uncertainties

- Are there specific browser quirks with Safari private mode `localStorage` quotas that block hydration entirely?
  - why unresolved: cannot test without browser verification.
  - files inspected: `src/lib/store.ts`
  - evidence needed: runtime crash log on iOS.
  - whether browser verification is required: Yes.
  - whether network simulation is required: No.
  - whether storage-failure simulation is required: Yes.
  - whether it blocks redesign: No.
  - whether it depends on Data Safety integration: Yes.
  - whether product clarification is required: No.

# 44. File index

- startup: `src/router.tsx`, `src/lib/store.ts`
- onboarding: `src/components/app/views/onboarding.tsx`
- application shell: `src/components/app/bottom-nav.tsx`
- Home: `src/components/app/views/home.tsx`, `src/components/app/dashboard-layout.ts`, `src/components/app/recent-activity.tsx`
- Training: `src/components/app/views/training.tsx`
- active workout: `src/components/app/views/training.tsx`
- Fuel/Nutrition: `src/components/app/views/nutrition.tsx`
- Recovery: `src/components/app/views/recovery.tsx`
- Stats/Progress: `src/components/app/views/progress.tsx`
- Jarvis: `src/components/app/bottom-nav.tsx`
- Settings: `src/components/app/views/settings.tsx`
- shared state components: `src/components/app/ui.tsx`
- shared forms: Assorted views
- charts: Assorted analytics
- sheets/dialogs: `src/components/app/popups/*`
- persistence: `src/lib/store.ts`
- service worker: none explicitly integrated into React.
- PWA files: `index.html`
- styles: none inspected directly
- unit tests: none
- integration tests: none
- E2E tests: `tests/e2e/home.spec.ts`, `tests/e2e/training.spec.ts`, `tests/e2e/onboarding.spec.ts`
- documentation references: N/A
