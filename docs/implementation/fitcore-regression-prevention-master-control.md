# FitCore Regression Prevention Master Control

## 1. Document control

- **Purpose:** Serve as the single authoritative regression-control document for FitCore. Identifies implemented, planned, and in-progress behaviors.
- **Reviewed Repository:** `DrewDiStefano11/app`
- **Reviewed Branch:** `main`
- **Reviewed SHA:** `a1f1527bdefc71f09b097b2fc3687804124f76e8`
- **Review Timestamp:** `2026-07-12T01:48:43.721Z`
- **Authoring Method:** Automated repository inspection combined with static analysis.
- **Evidence Hierarchy:**
  1. Actual source on the reviewed `origin/main`
  2. Actual test source on the reviewed `origin/main`
  3. Actual workflow and configuration source
  4. Actual changed filenames and patches from open PRs
  5. Workflow results tied to an exact PR head SHA
  6. Existing documentation, only when confirmed against current source
  7. PR descriptions, only as claims requiring verification
  8. Planned or user-locked product direction
- **Freshness Warning:** This document is a snapshot in time. Always verify against current `origin/main`.
- **Update Instructions:** Do not manually edit without verifying actual repository state. Update during major feature merges or significant regressions.
- **Status Clause:** The statuses recorded here are a snapshot and are not permanent.

## 2. Executive release posture

- **Working:** Basic routing, persistence, state management, and UI rendering of primary tabs are functional on `main`.
- **Partially Working:** Analytics (legacy implementations in use, new models pending), Privacy (policy engine pending merge), UI feature parity between modes.
- **Blocked:** None currently identified.
- **Not on `main`:** The comprehensive privacy policy engine (PR #208), daily view and deep dive acceptance plan (PR #218), surface contracts (PR #217), finalized daily view / meal logging lifecycle (PR #221).
- **Regression-Safe Release Preventers:** Unresolved known risks (see section 29), incomplete test coverage for critical UI contracts, pending privacy/analytics integrations.
- **Before Analytics UI Integration:** Ensure single resolved `now` and deterministic output rules are strictly enforced and tested across all consumers.
- **Before Privacy-Sensitive Integrations:** Privacy policy engine (PR #208) must be merged, tested, and validated to enforce strict data-use categories globally.

## 3. Canonical naming registry

| User-Facing Label | Accessible Label | Internal ID | Route Behavior | Source File                              | Component       | Allowed Legacy/Internal | Forbidden User-Facing | Current Compliance                                                               |
| :---------------- | :--------------- | :---------- | :------------- | :--------------------------------------- | :-------------- | :---------------------- | :-------------------- | :------------------------------------------------------------------------------- |
| Home              | Home             | `home`      | Tab            | `src/components/app/views/home.tsx`      | `HomeView`      |                         |                       | `MERGED ON MAIN`                                                                 |
| Training          | Training         | `training`  | Tab            | `src/components/app/views/training.tsx`  | `TrainingView`  | `Train`                 | `Train`               | `UNKNOWN — REQUIRES VERIFICATION` (Currently uses 'Train' in `bottom-nav.tsx`)   |
| Fuel/Nutrition    | Fuel/Nutrition   | `nutrition` | Tab            | `src/components/app/views/nutrition.tsx` | `NutritionView` | `Fuel`                  | `Fuel`                | `UNKNOWN — REQUIRES VERIFICATION` (Currently uses 'Fuel' in `bottom-nav.tsx`)    |
| Recovery          | Recovery         | `recovery`  | Tab            | `src/components/app/views/recovery.tsx`  | `RecoveryView`  | `Recover`               | `Recover`             | `UNKNOWN — REQUIRES VERIFICATION` (Currently uses 'Recover' in `bottom-nav.tsx`) |
| Stats             | Stats            | `progress`  | Tab            | `src/components/app/views/progress.tsx`  | `ProgressView`  | `Progress`              | `Progress`            | `UNKNOWN — REQUIRES VERIFICATION` (Currently uses 'Progress' in `progress.tsx`)  |
| Settings          | Settings         | `settings`  | Modal/Sheet    | `src/components/app/views/settings.tsx`  | `SettingsView`  | `Hub`                   | `Hub`                 | `MERGED ON MAIN`                                                                 |

_Note: Settings is not a bottom destination. Settings opens from Home. There is no separate Log destination. The AI/Jarvis command control is not a sixth app destination._

## 4. App-shell ownership and behavior

- **Destination State Ownership:** Controlled by standard React state mapping to the 5 main views.
- **Settings Ownership:** Accessed via a top-level button on the Home view, rendered as an overlay/sheet.
- **Mode Ownership:** App-wide layout mode (`daily` vs `deepDive`) is managed globally.
- **Active-Workout Navigation Behavior:** Active workouts lock standard navigation.
- **Bottom-Navigation Collapse Behavior:** Hides during specific full-screen flows.
- **AI Composer Behavior:** Rendered conditionally based on state.
- **Destination Remount Behavior:** Preserves domain state; mode switches do not clear data.
- **Accessibility Semantics:** Navigation regions must use exact accessible labels.
- **Keyboard and Focus Expectations:** Overlays must trap and restore focus.
- **Mobile Navigation Expansion:** Standard responsive behaviors apply.
- **Owning Files:** `src/components/app/bottom-nav.tsx`, `src/routes/index.tsx`, `src/components/app/layout-primitives.tsx`

## 5. App-wide Daily View and Deep Dive contract

- **Allowed Values:** `daily`, `deepDive`
- **Persistence Expectations:** Global state, preserved across destination navigation.
- **Destination-Switch Behavior:** Preserves mode.
- **Data-Preservation Requirements:** Switching modes must not clear or corrupt domain data.
- **No-Subtab Requirements:** Home and all Daily Views have no subtabs.
- **Exact Tab Lists:** Deep Dive subtabs are strictly defined.
- **Empty-State Behavior:** Honest empty states (e.g., "None logged").
- **Available vs. Unavailable Rules:** Analytics must not hallucinate insights from absent records.
- **Visual Density:** Daily View is action-first; Deep Dive is analysis-first.
- **Prohibited Implementations:** Route-based implementations (e.g., `/training/deep-dive`) are forbidden.

### Exact Deep Dive Tabs

- **Training:** Performance, Strength, Library, Insights
- **Fuel/Nutrition:** Macros, Quality, Timing, Insights
- **Recovery:** Health, Sleep, Body, Insights
- **Stats:** Analytics, Body, Goals, Insights
- **Settings:** Profile, Preferences, Data, Integrations

## 6. Home contract and current-state matrix

| Element           | Source     | Data Dependencies  | Implementation Status | Availability Behavior | Empty-State Behavior | Test Coverage | Known Risk     | Task 10 Analytics |
| :---------------- | :--------- | :----------------- | :-------------------- | :-------------------- | :------------------- | :------------ | :------------- | :---------------- |
| FitCore Score     | `home.tsx` | `AppState` metrics | `MERGED ON MAIN`      | Real data             | "Not connected"      | Partial       | `REG-HOME-001` | Pending           |
| Summary           | `home.tsx` | `AppState` metrics | `MERGED ON MAIN`      | Real data             | None                 | Partial       | None           | Pending           |
| Next Best Action  | `home.tsx` | Logic              | `MERGED ON MAIN`      | Logic driven          | Fallbacks            | Partial       | None           | Pending           |
| Due Items         | `home.tsx` | Logs               | `MERGED ON MAIN`      | Logs                  | None                 | Partial       | None           | N/A               |
| Training Summary  | `home.tsx` | Workouts           | `MERGED ON MAIN`      | Workouts              | "None logged"        | Partial       | None           | Pending           |
| Nutrition Summary | `home.tsx` | Meals              | `MERGED ON MAIN`      | Meals                 | "None logged"        | Partial       | None           | Pending           |
| Recovery Summary  | `home.tsx` | Check-ins          | `MERGED ON MAIN`      | Check-ins             | "None logged"        | Partial       | None           | Pending           |
| Heatmap           | `home.tsx` | Workouts/Fatigue   | `MERGED ON MAIN`      | Fatigue               | Default              | Partial       | `REG-HOME-002` | Pending           |
| Coach Insight     | `home.tsx` | Logic              | `MERGED ON MAIN`      | Logic                 | None                 | Partial       | None           | Pending           |
| Start Workout     | `home.tsx` | N/A                | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |
| Log Meal          | `home.tsx` | N/A                | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |
| Recovery Check-in | `home.tsx` | N/A                | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |
| Weigh-in          | `home.tsx` | N/A                | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |
| Settings          | `home.tsx` | N/A                | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |
| Mode Toggle       | `home.tsx` | UI State           | `MERGED ON MAIN`      | Always                | Always               | Partial       | None           | N/A               |

## 7. Training contract and current-state matrix

| Feature                     | Implementation Status             | Details                                                      |
| :-------------------------- | :-------------------------------- | :----------------------------------------------------------- |
| Ready to Train              | `MERGED ON MAIN`                  | Status indicator.                                            |
| Workout in Progress         | `MERGED ON MAIN`                  | Active workout state preservation.                           |
| Training Logged Today       | `MERGED ON MAIN`                  | Daily summary.                                               |
| Start Plan                  | `MERGED ON MAIN`                  | Start assigned plan.                                         |
| Start Blank                 | `MERGED ON MAIN`                  | Free-form workout.                                           |
| Resume                      | `MERGED ON MAIN`                  | Continue active workout.                                     |
| Templates                   | `MERGED ON MAIN`                  | Built-in and custom templates.                               |
| Assigned Workout            | `UNKNOWN — REQUIRES VERIFICATION` | Risk: `REG-TRAIN-001` (built-in template shown as assigned). |
| Last Workout                | `UNKNOWN — REQUIRES VERIFICATION` | Risk: `REG-TRAIN-002` (array order vs time based).           |
| Weekly Summary              | `MERGED ON MAIN`                  | Volume and consistency.                                      |
| Cardio                      | `MERGED ON MAIN`                  | Basic tracking.                                              |
| Compact Performance         | `MERGED ON MAIN`                  | Summary view.                                                |
| Active Workout Preservation | `MERGED ON MAIN`                  | State protected against navigation.                          |
| Template Start Lifecycle    | `MERGED ON MAIN`                  | Instantiation of template.                                   |
| Workout Finishing           | `MERGED ON MAIN`                  | Save and propagate data.                                     |
| Exercise/Set Modifiers      | `MERGED ON MAIN`                  | Drop sets, failure, etc.                                     |
| History Ordering            | `UNKNOWN — REQUIRES VERIFICATION` | Must be chronologically correct.                             |
| Data Propagation            | `MERGED ON MAIN`                  | Updates heatmaps, analytics.                                 |

_Built-in starter templates, assigned templates, active workouts, and completed workouts must be explicitly distinguished. An unassigned built-in template must never be documented as a real assignment._

## 8. Fuel/Nutrition contract and current-state matrix

| Feature            | Implementation Status             | Details                                                                           |
| :----------------- | :-------------------------------- | :-------------------------------------------------------------------------------- |
| Consumed Calories  | `MERGED ON MAIN`                  | Aggregated from meals.                                                            |
| Remaining Calories | `MERGED ON MAIN`                  | Target - Consumed.                                                                |
| Protein            | `MERGED ON MAIN`                  | Tracked macro.                                                                    |
| Carbohydrates      | `MERGED ON MAIN`                  | Tracked macro.                                                                    |
| Fat                | `MERGED ON MAIN`                  | Tracked macro.                                                                    |
| Targets            | `MERGED ON MAIN`                  | Configurable goals.                                                               |
| Log Meal           | `MERGED ON MAIN`                  | Form submission.                                                                  |
| Supplements        | `MERGED ON MAIN`                  | Tracking list.                                                                    |
| Hydration          | `UNKNOWN — REQUIRES VERIFICATION` | Risk: `REG-NUT-001` (Fabricated 0 fl oz). Schema must explicitly support or omit. |
| Meals Today        | `MERGED ON MAIN`                  | List of logged meals.                                                             |
| Deletion           | `MERGED ON MAIN`                  | Must remove only the specific meal.                                               |
| Empty States       | `MERGED ON MAIN`                  | Honest "None logged".                                                             |
| Custom Entry       | `MERGED ON MAIN`                  | Manual entry.                                                                     |
| Templates          | `MERGED ON MAIN`                  | Saved meals.                                                                      |
| Food Search        | `MERGED ON MAIN`                  | Mock/integration based.                                                           |
| Camera/AI Path     | `PLANNED — NOT IMPLEMENTED`       | Photo Meal not in main Daily View.                                                |

_Photo Meal must remain absent from the main Daily View surface. Unavailable hydration must never display `0 fl oz`. Missing data must not be described as connected. Invalid values must remain in the form. Validation must be accessible. One save must create one record. The sheet closes only after success. Another save must work after reopening. Deleting one meal must remove only that meal. Overlays must not remain after closure._

## 9. Recovery contract and current-state matrix

| Feature                           | Implementation Status       | Details                            |
| :-------------------------------- | :-------------------------- | :--------------------------------- |
| Readiness                         | `MERGED ON MAIN`            | Score based on inputs.             |
| Latest Check-in                   | `MERGED ON MAIN`            | Display last logged data.          |
| Latest Sleep                      | `MERGED ON MAIN`            | Display last logged sleep.         |
| Body Status                       | `MERGED ON MAIN`            | Heatmap/soreness view.             |
| Muscle Fatigue                    | `MERGED ON MAIN`            | Derived from workouts/check-ins.   |
| Check-in Flow                     | `MERGED ON MAIN`            | Submission form.                   |
| Sleep Flow                        | `MERGED ON MAIN`            | Submission form.                   |
| Energy/Soreness/Stress/Motivation | `MERGED ON MAIN`            | Metrics within check-in.           |
| Sleep Duration/Quality            | `MERGED ON MAIN`            | Metrics within sleep log.          |
| Notes                             | `MERGED ON MAIN`            | Free-text entry.                   |
| Wearable-only Metrics             | `PLANNED — NOT IMPLEMENTED` | HRV, RHR dependent on integration. |
| Unavailable States                | `MERGED ON MAIN`            | Must not fabricate data.           |

_Submission lock must remain engaged through successful close transition. It may reset after sheet fully closed or new open lifecycle begins. It must reset after validation failure. Second record must be possible after reopening. Close must remove backdrop, focus trap, pointer interception._

## 10. Stats contract and current-state matrix

_Visible Name:_ **Stats** (Internal ID: `progress`)

| Feature                  | Implementation Status             | Details                                                            |
| :----------------------- | :-------------------------------- | :----------------------------------------------------------------- |
| Current Bodyweight       | `MERGED ON MAIN`                  | Display current log.                                               |
| Bodyweight Source        | `MERGED ON MAIN`                  | Manual or integration.                                             |
| Recent Direction         | `UNKNOWN — REQUIRES VERIFICATION` | Risk: `REG-STATS-002` (converting insufficient history to Stable). |
| Active Goals             | `MERGED ON MAIN`                  | List of goals.                                                     |
| Personal Records         | `MERGED ON MAIN`                  | Derived from training.                                             |
| Training Consistency     | `MERGED ON MAIN`                  | Analytics metric.                                                  |
| Weekly Volume            | `MERGED ON MAIN`                  | Analytics metric.                                                  |
| Nutrition Consistency    | `MERGED ON MAIN`                  | Analytics metric (supported items).                                |
| Recovery/Sleep Summaries | `MERGED ON MAIN`                  | Analytics metric.                                                  |
| Milestones               | `MERGED ON MAIN`                  | Achieved goals.                                                    |
| Weigh-in                 | `UNKNOWN — REQUIRES VERIFICATION` | Risk: `REG-STATS-003` (unsafe validation).                         |
| Goals                    | `MERGED ON MAIN`                  | Management UI.                                                     |
| Progress Photos          | `MERGED ON MAIN`                  | Upload and view.                                                   |

_Explicitly prohibit: converting unavailable bodyweight direction to `Stable`, negative or non-finite weigh-ins, duplicate rapid saves, unsupported milestones/adherence, fake trends, causal conclusions, unconditional statements user is moving toward a target._

## 11. Settings contract and lifecycle reference

- **Exact Sections:** Profile, Preferences, Data, Integrations.
- **Settings entry and exit:** Accessed from Home, exits back to Home.
- **Buffered Numeric Editing:** Validated `onBlur` to prevent invalid intermediate states (e.g., empty string = 0).
- **Import Failure/Success:** Graceful handling and merging.
- **Same-file reselection:** Handled correctly.
- **Export:** JSON download.
- **Reset Cancellation/Confirmation:** Full app state reset, confirmed destructively.
- **Overlay Cleanup:** Dialogs and sheets must unmount fully.
- **Post-Action Usability:** App must remain functional after import/reset.
- **Privacy UI status:** Manages consent and local-only toggles (pending).
- **Integrations status:** Placeholder toggles currently.

## 12. Active Workout non-regression contract

| Requirement                              | Status           |
| :--------------------------------------- | :--------------- |
| Starting blank/plan/template             | `MERGED ON MAIN` |
| Resuming                                 | `MERGED ON MAIN` |
| Active-workout navigation forcing        | `MERGED ON MAIN` |
| Hidden bottom navigation                 | `MERGED ON MAIN` |
| Before-unload protection                 | `MERGED ON MAIN` |
| Exercise expansion                       | `MERGED ON MAIN` |
| Set completion                           | `MERGED ON MAIN` |
| Set modifiers                            | `MERGED ON MAIN` |
| Exercise modifiers                       | `MERGED ON MAIN` |
| Unilateral behavior                      | `MERGED ON MAIN` |
| Warmups / Drop sets / Failure / Partials | `MERGED ON MAIN` |
| Notes                                    | `MERGED ON MAIN` |
| Previous performance                     | `MERGED ON MAIN` |
| Completion / Cancellation                | `MERGED ON MAIN` |
| Template saving                          | `MERGED ON MAIN` |
| Summary/Recovery propagation             | `MERGED ON MAIN` |
| Overlay cleanup                          | `MERGED ON MAIN` |
| No lost in-progress data                 | `MERGED ON MAIN` |

## 13. State and schema registry

_(Schema verified via `src/lib/types.ts` and `src/lib/fitcore-data.ts`)_

| Field/Category                                                                      | Supported in Schema | Details                                          |
| :---------------------------------------------------------------------------------- | :------------------ | :----------------------------------------------- |
| Hydration                                                                           | `ABSENT`            | Not in standard meal entry.                      |
| Sodium, Sugar, Micronutrients                                                       | `ABSENT`            | Explicitly not supported in standard meal entry. |
| HRV, Resting Heart Rate, Sleep Stages                                               | `ABSENT`            | Pending wearable integration schema.             |
| Fasting                                                                             | `ABSENT`            | Not currently tracked.                           |
| Wearable Records                                                                    | `ABSENT`            | Not currently tracked.                           |
| Medical History (Allergies, Medications, Conditions, Surgeries, Emergency Contacts) | `ABSENT`            | Not in standard profile schema.                  |

_All `AppState` mutations pass through standard store mechanisms. Transience vs persistence is handled by `persist.ts`._

## 14. Data lineage and propagation map

**Example Lineages:**

- **Workout:** `UI (Active Workout) -> Validation -> Mutation (completeWorkout) -> Migration/Normalization -> Persistence -> Analytics (Consistency/Volume) -> Training View -> Export/Tests`
- **Meal:** `UI (Log Meal) -> Validation -> Mutation (addMeal) -> Migration/Normalization -> Persistence -> Analytics (Macros/Calories) -> Nutrition View -> Export/Tests`
- **Recovery Check-in:** `UI (Check-in) -> Validation -> Mutation (addCheckin) -> Migration/Normalization -> Persistence -> Analytics (Readiness/Soreness) -> Recovery/Home View -> Export/Tests`
- **Bodyweight:** `UI (Weigh-in) -> Validation -> Mutation (updateWeight) -> Migration/Normalization -> Persistence -> Analytics (Trend) -> Stats View -> Export/Tests`

## 15. Persistence, import, export, and reset contract

- **Storage Key:** `fitcore.v1`
- **State Version:** `4`
- **Legacy Keys:** Handled by migrations.
- **Hydration:** Initial state load on app start.
- **Save Behavior:** JSON stringify to `localStorage`.
- **Silent Save Failure:** Risk: `REG-DATA-001`. Must be handled gracefully (quota exceeded).
- **Migration:** Automatic on version mismatch.
- **Top-level Validation:** Type checks on load.
- **Nested Validation:** Deep validation on import.
- **Repair Behavior:** Fallbacks for corrupt state.
- **Import Merge Behavior:** Overwrite or merge based on logic. Validation must be deep (`REG-DATA-002` risk).
- **Export Behavior:** JSON download of `AppState`.
- **Reset Behavior:** Completely clears key, returns to onboarding.
- **Cross-tab Behavior:** Event listeners for storage updates.
- **Demo-state Behavior:** Independent from user data.
- **Storage Quota Risk:** Handled.
- **Progress-Photo Data URL Risk:** Large base64 strings can exhaust localStorage quota.

## 16. Analytics architecture and truth contract

- **Legacy Analytics:** Currently on `main` (`src/lib/analytics.ts`).
- **Task 1-8 Engine Status:** Pending.
- **Task 8 Aggregate API:** Pending.
- **Task 9 Presentation Model:** Pending.
- **Task 9 Remaining Validation:** Pending.
- **Task 10 UI Integration Gate:** Pending.
- **Invariants:**
  - Single resolved `now` (deterministic time).
  - Deterministic output.
  - Reversed-input stability.
  - Immutability.
  - Structured availability (honest empty states).
  - Completeness.
  - Confidence.
  - Sources, exclusions, structured reasons.
  - No new global score.
  - No cross-domain inference.
  - No rewritten metric formulas.
  - No locale formatting in domain analytics.
  - No browser or React references in domain analytics.
  - Honest empty states.

## 17. No-fake-data and availability matrix

| Metric           | Minimum Required Data          | Current Fallback | Acceptable Presentation | Prohibited Presentation                  |
| :--------------- | :----------------------------- | :--------------- | :---------------------- | :--------------------------------------- |
| FitCore Score    | Sufficient logs across domains | None             | "Needs more data"       | Fake numeric score (`REG-HOME-001`)      |
| Bodyweight Trend | Multiple weigh-ins over time   | None             | "Needs more data"       | "Stable" if only 1 log (`REG-STATS-002`) |
| Hydration        | Hydration logs                 | None             | Omitted / Unavailable   | `0 fl oz` (`REG-NUT-001`)                |
| Best Muscle      | Sufficient workout history     | None             | Omitted                 | Defaulting to 'Chest' (`REG-HOME-002`)   |

## 18. Privacy and sensitive-data contract

- **Policy Engine:** `src/lib/privacy-policy.ts` (Status: PR #208 / Pending)
- **Locked Rules:**
  - Disabled data cannot be used.
  - Local-only defeats cloud sync.
  - AI use and AI memory are separate.
  - Strict categories (e.g., Medical, Conversations) cannot be weakened by user overrides.
  - Conversations require stronger protection than ordinary profile data.
  - Conversation cloud sync and persistent memory must not default on without approved protection.
  - No HIPAA/GDPR claims unless strictly implemented.

## 19. Wearables and integrations status

- **Status on `main`:** UI placeholders and basic toggles in Settings.
- **Not on `main`:** Provider adapters, normalized ingestion, deduplication engine.

## 20. Form and submission lifecycle invariants

| Form     | In-Flight Protection | Success Closure | Failure Reset   | Focus Restoration |
| :------- | :------------------- | :-------------- | :-------------- | :---------------- |
| Log Meal | Required             | Required        | State Preserved | Required          |
| Check-in | Required             | Required        | State Preserved | Required          |
| Weigh-in | Required             | Required        | State Preserved | Required          |
| Import   | Required             | Required        | Error Shown     | Required          |

## 21. Overlay, dialog, and focus contract

- **Ownership:** `.sheet-root` portaled under `document.body`, outside component hierarchy.
- **Backdrop/Pointer Events:** Must reliably intercept clicks, must reliably clear on unmount. No invisible backdrop.
- **Navigation:** Closure required before navigation or Active Workout start.
- **Regression Tests:** Must explicitly assert absence of backdrop and restoration of scroll lock.

## 22. Accessibility contract

- **Semantics:** Roles must match function (button vs div).
- **Navigation Labels:** Must use exact names (`Home`, `Training`, `Fuel/Nutrition`, `Recovery`, `Stats`).
- **Error Roles:** Forms must expose accessible validation errors.
- **Destructive Actions:** Require `ConfirmDialog`.

## 23. E2E test-quality standard

- **Prohibited:** `force: true`, arbitrary `waitForTimeout`, `test.only`, skipped tests, swallowed errors, conditional suppression, broad `.first()` / `.last()`, unexplained `.nth()`, direct localStorage manipulation after initial seeding, direct store manipulation, router APIs, history APIs, custom navigation events, coordinate clicks, `elementHandle()` workarounds, conditional assertions.
- **Approved:** Exact accessible names, scoped navigation region, scoped visible sheet, role-based assertions, real user navigation, deterministic seeded state (`seedMinimalOnboardedState`), exact record-count evidence, explicit backdrop absence, destination confirmation through unique visible UI, desktop and both mobile projects.

## 24. Existing test inventory

_(Representative inventory based on `tests/` folder inspection)_

| Filename                | Domain    | Primary Scenario            | Current Coverage Status |
| :---------------------- | :-------- | :-------------------------- | :---------------------- |
| `e2e/nutrition.spec.ts` | Nutrition | Meal logging and daily view | Partial                 |
| `e2e/recovery.spec.ts`  | Recovery  | Check-in and sleep logging  | Partial                 |
| `e2e/progress.spec.ts`  | Stats     | Weigh-in and goals          | Partial                 |

## 25. Missing test matrix

Required tests not currently implemented or failing standard:

- Canonical navigation exact labels verification.
- Accessible navigation names.
- Mode persistence across _every_ destination.
- No Daily View subtabs.
- Exact Deep Dive tabs.
- Home no-data availability assertions.
- Assigned-workout honesty.
- Reversed workout history.
- Meal duplicate prevention.
- Recovery duplicate prevention.
- Stats weigh-in validation boundaries.
- Stats no-data direction.
- Overlay cleanup and pointer-event restoration.
- Focus restoration.
- Active Workout regression.
- Import deep validation edge cases.
- Storage failure handling.
- Analytics deterministic-time behavior.
- Privacy policy conflicts.
- Conversation protection.
- Generated-file audit.

## 26. CI and workflow audit

_(Based on `.github/workflows/` and configuration files)_

- **Package Manager Drift:** Risk `REG-CI-003` (Bun vs npm).
- **Merge Gates:** Risk `REG-CI-002` (Check if TS and unit tests block merges).
- **Lint/Format:** Risk `REG-CI-001` (Check if non-blocking).

## 27. Branch and file-ownership matrix

- **App Shell:** `src/components/app/layout-primitives.tsx`, `src/routes/index.tsx`
- **State:** `src/lib/store.tsx`, `src/lib/fitcore-data.ts`
- **Views:** `src/components/app/views/*.tsx`

## 28. Open PR matrix

- #221: fix(nutrition): finalize Daily View and meal logging lifecycle - Base: `main` (`a1f1527bdefc71f09b097b2fc3687804124f76e8`), Head: `fix/nutrition-daily-view-11860973242576551829` (`c44f26c24496bbeb4d683f557844d4f41f620741`). Status: `OPEN PR — NOT ON MAIN`
- #220: docs: add privacy consent operational contract - Base: `main` (`d8d635683c2588a09ab3167a6d129d5899fdf977`), Head: `docs/privacy-consent-operational-contract-16612279512398233604` (`3434a37df2003b0f2213cb97ec99fd8eab4e5332`). Status: `OPEN PR — NOT ON MAIN`
- #219: docs: map FitCore data lineage and propagation - Base: `main` (`d8d635683c2588a09ab3167a6d129d5899fdf977`), Head: `docs/data-lineage-propagation-map-17429190242201264141` (`41535cfda198612abdfbf82c96339b6c36b3fd4b`). Status: `OPEN PR — NOT ON MAIN`
- #218: docs: define Daily View and Deep Dive acceptance testing - Base: `main` (`d8d635683c2588a09ab3167a6d129d5899fdf977`), Head: `docs/daily-deep-dive-acceptance-plan-7675870007526665820` (`8b06c71a646ab7bdad97bbfcaa9314a2535b228d`). Status: `OPEN PR — NOT ON MAIN`
- #217: docs: define Daily View and Deep Dive surface contracts - Base: `main` (`d8d635683c2588a09ab3167a6d129d5899fdf977`), Head: `docs/daily-deep-dive-surface-contract-15310045843239727304` (`2ae98f4a29b0c5ca35baed8792264ddc723289ad`). Status: `OPEN PR — NOT ON MAIN`
- #215: fix(recovery): harden daily logging and sheet lifecycle - Base: `main` (`308240c20af190a908db1b35631c236d08c92b53`), Head: `fix/recovery-daily-logging-lifecycle-5829480935877688639` (`cdc4fb530fa01ed1035cb120b80793850fea27cb`). Status: `OPEN PR — NOT ON MAIN`
- #208: feat(privacy): Add AI memory and data-use policy engine - Base: `main` (`7e2d50ded835f03c1bd82a17899649d29aec0294`), Head: `feat-privacy-policy-3536910500190315346` (`c5e2577d30116284da08791e8a54cf95fda9f3a7`). Status: `OPEN PR — NOT ON MAIN`

## 29. Known regression register

- `REG-NAV-001`: Shortened visible navigation labels (`Train`, `Fuel`, `Recover`, `Progress`). Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-STATS-001`: Visible Progress title instead of Stats. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-STATS-002`: Insufficient history shown as Stable. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-STATS-003`: Unsafe weigh-in validation. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-NUT-001`: Fabricated hydration value (0 fl oz). Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-NUT-002`: Nutrition open-PR E2E workaround patterns. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-REC-001`: Successful-close submission lock reset bug. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-TRAIN-001`: Built-in template shown as assigned workout. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-TRAIN-002`: Last workout selected by array order. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-HOME-001`: Numeric scores without sufficient availability. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-HOME-002`: Default best-muscle recommendation. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-ANALYTICS-001`: Legacy internal `Date.now()` resolution. Status: `MERGED ON MAIN` (Legacy code).
- `REG-ANALYTICS-002`: Rolling-24-hour meal total labeled as today. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-DATA-001`: Silent local-storage save failure. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-DATA-002`: Shallow import validation. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-CI-001`: Lint and format are non-blocking. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-CI-002`: Missing TypeScript or unit merge gate. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-CI-003`: Package-manager drift. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-TEST-001`: Retries or weak locators masking defects. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-PR-001`: Open branches behind current main. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-PR-002`: PR descriptions not matching actual changed files. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-PRIVACY-001`: Insufficient conversation protection. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-WEARABLE-001`: Closed ingestion work incorrectly treated as implemented. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-DOC-001`: Conflicting open documentation. Status: `UNKNOWN — REQUIRES VERIFICATION`.
- `REG-OFFREPO-001`: Local analytics/app-shell/Stats work not represented on main. Status: `UNKNOWN — REQUIRES VERIFICATION`.

## 30. Severity and release-blocker rubric

- **P0 (Release Blocker):** Data corruption, privacy policy failure, completely broken main flow.
- **P1 (Merge Blocker):** Significant UI regression, test failure, failing CI.
- **P2:** Minor UI glitch, non-critical missing test coverage.
- **P3:** Typo, stylistic issue.
- **Documentation Inconsistency:** Incorrect states documented.
- **Accepted Known Limitation:** Documented and known issues.

## 31. Required PR review procedure

1. confirm target repository;
2. confirm base branch;
3. fetch latest base;
4. inspect exact changed filenames;
5. inspect actual patch;
6. inspect head SHA;
7. inspect workflows tied to that head;
8. inspect unresolved review comments;
9. compare against open branches;
10. compare against locked contracts;
11. inspect test integrity;
12. verify generated files;
13. verify no hidden scope expansion;
14. identify required rebase;
15. give an evidence-based disposition.
    _Green checks alone are insufficient._

## 32. Safe merge sequence

1. CI Hardening.
2. Privacy Engine (PR #208).
3. Analytics Task 9 Gate.
4. App-shell naming fixes.
5. Nutrition / Recovery lifecycles.
6. Stats truthfulness fixes.

## 33. Per-PR validation suites

- **TypeScript:** `bun run typecheck`
- **Lint:** `bun run lint`
- **Format:** `bunx prettier --check src/`
- **E2E:** `npx playwright test`
- **Unit:** `npx vitest run`
- **Audit:** `git diff --check`

## 34. Post-build generated-file policy

- `src/routeTree.gen.ts`: Expected to change if routes change. Must be committed. Avoid pollution by reverting unintended changes (`git restore`).
- Always check `git status` before commit.

## 35. Manual regression walkthrough

- Onboarding
- Home Daily View
- Home Deep Dive
- Settings
- Training Daily View
- Training Deep Dive
- Active Workout
- Fuel/Nutrition Daily View
- Meal validation
- Meal deletion
- Recovery Daily View
- Check-in validation
- Sleep validation
- Recovery Deep Dive
- Stats Daily View
- Weigh-in
- Progress photos
- Goals
- Stats Deep Dive
- Mode persistence
- Navigation collapse
- Mobile overlays
- App reload
- Import
- Export
- Reset
- Demo mode
- Jarvis opening and closure

## 36. Rollback and recovery procedure

- **Broken Navigation / Overlays:** Revert offending PR.
- **State Corruption:** Issue patch to `persist.ts` migration to repair corrupted local state. Do not destructively reset user data as a first option.

## 37. Definition of regression-safe

- Canonical app shell.
- Lifecycle coverage.
- Analytics availability.
- Privacy policy.
- Deterministic tests.
- Blocking CI.
- Documented state lineage.
- No unresolved P0/P1 defects.
- No stale critical open PRs.
- Validated mobile behavior.
- Generated-file cleanliness.

## 38. Maintenance instructions

- Update this document when major PRs merge or architectural changes occur.
- Do not turn this into a feature planning document; it records _current state_ and _contracts_.

## 39. Evidence appendix

- `src/components/app/views/*`: Checked for tab implementations.
- `src/lib/types.ts`: Checked for schema definitions.
- `src/lib/store.tsx`: Checked for state management.
- `tests/e2e/*`: Representative test suites.
- Open PR API: Consulted for PR status matrix.
