# FitCore Feature Readiness and Dependency Matrix

## 1. Purpose

This document serves as a runtime implementation and merge-planning document grounded in the current repository state.

* **why this document exists:** To coordinate Jules, Codex, and human-reviewed PRs without creating overlapping branches or repeatedly auditing the same areas.
* **how it differs from the Product Bible:** The Product Bible sets the requirements and direction. This document maps the actual current runtime implementation and branch state.
* **how it differs from a backlog:** This is a dependency-aware map of implementation state, not just a prioritized list of user stories.
* **how implementation agents should use it:** To discover what is safe to implement next, avoid high-conflict files, and understand prerequisites.
* **how PR reviewers should use it:** To verify that incoming PRs align with the current implementation phase and do not introduce out-of-order changes.
* **how it should prevent file overlap and unsafe merges:** By explicitly mapping feature ownership to source files and defining parallelization rules.

## 2. Repository Snapshot

* **Inspection date:** 2026-07-12
* **Inspected main SHA:** `d8d635683c2588a09ab3167a6d129d5899fdf977`
* **Relevant open PRs:** #216 (Settings), #215 (Recovery), #208 (Privacy)
* **Relevant recently merged PRs:** N/A for this snapshot.
* **Active parked PRs:** None known.
* **Active large workstreams:** Privacy Engine, Analytics Engine.
* **Known replacement/supersession relationships:** None currently active.
* **Whether each item is actually on main:** Documented per item below.

| PR | Title | Category | State | Draft | Mergeability | Scope | Replacement | Recommendation | Dependency Impact |
|---|---|---|---|---|---|---|---|---|---|
| #216 | fix(settings): harden profile and data-management flows | Settings | Open | No | Unknown | Settings UI | None | Needs repair/review | Blocks further Settings hardening |
| #215 | fix(recovery): harden daily logging and sheet lifecycle | Recovery | Open | No | Unknown | Recovery logging | None | Needs repair/review | Blocks Recovery Analytics |
| #208 | feat(privacy): Add AI memory and data-use policy engine | Privacy | Open | No | Unknown | AI/Privacy Core | None | Needs repair/review | Blocks AI context expansion |

## 3. Runtime Architecture Overview

* **app shell:** `src/routes/__root.tsx`, `src/components/app/bottom-nav.tsx`, `src/components/app/layout-primitives.tsx`
* **Home:** `src/routes/index.tsx`, `src/components/app/views/home-view.tsx`
* **Training:** `src/routes/index.tsx`, `src/components/app/views/training-view.tsx`
* **Active Workout:** `src/components/app/active-workout.tsx`
* **Fuel/Nutrition:** `src/routes/index.tsx`, `src/components/app/views/nutrition-view.tsx`
* **Recovery:** `src/routes/index.tsx`, `src/components/app/views/recovery-view.tsx`
* **Stats:** `src/routes/index.tsx`, `src/components/app/views/progress-view.tsx`
* **Settings:** `src/components/app/views/settings-view.tsx`
* **store and persistence:** `src/lib/store.tsx`, `src/lib/fitcore-data.ts`, `src/lib/persist.ts`, `src/lib/types.ts`
* **analytics:** `src/lib/analytics.ts`, `src/lib/analytics-extra.ts`
* **goals:** `src/components/app/goals-panel.tsx`, `src/lib/store.tsx`, `src/lib/types.ts`
* **bodyweight and body tracking:** `src/lib/store.tsx`, `src/lib/types.ts`, `src/components/app/views/progress-view.tsx`
* **progress photos:** Not implemented
* **wearables ingestion:** `src/lib/wearables/`
* **privacy policy:** `src/lib/privacy-policy.ts`, `src/lib/privacy-policy-defaults.ts` (In PR #208)
* **AI/Jarvis:** `src/lib/ai.functions.ts`, `src/components/app/jarvis/`
* **import/export:** `src/components/app/views/settings-view.tsx`, `src/lib/fitcore-data.ts`
* **notifications and daily briefings:** Not implemented
* **safety and medical information:** Partially in `src/lib/types.ts`
* **integrations:** Not implemented
* **tests and CI:** `tests/`, `tests/e2e/`

## 4. Capability Inventory

### App Shell

* **capability name:** Five Main Destinations
* **user outcome:** User can navigate between Home, Training, Fuel/Nutrition, Recovery, and Stats.
* **current visible surface:** Bottom navigation bar.
* **current source files:** `src/routes/__root.tsx`, `src/components/app/bottom-nav.tsx`
* **current state fields:** URL Route state.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E shell tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/bottom-nav.tsx`

* **capability name:** Settings Entry
* **user outcome:** User can enter Settings from the Home view.
* **current visible surface:** Top right icon on Home.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** Daily View/Deep Dive mode
* **user outcome:** User can toggle between Daily and Deep Dive modes app-wide.
* **current visible surface:** Toggle switch in header.
* **current source files:** `src/components/app/layout-primitives.tsx`, `src/lib/store.tsx`
* **current state fields:** `AppState.layoutMode`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/store.tsx`


* **capability name:** mode persistence
* **user outcome:** Mode saves to local storage.
* **current visible surface:** None.
* **current source files:** `src/lib/store.tsx`
* **current state fields:** `AppState.layoutMode`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/store.tsx`

* **capability name:** focus and accessibility
* **user outcome:** Keyboard/screen reader support.
* **current visible surface:** App wide.
* **current source files:** All view files.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E (partial).
* **readiness status:** `Implemented, validation incomplete`
* **release-readiness status:** `Integration testable`
* **known defects:** Contrast issues.
* **missing prerequisite:** None.
* **next recommended action:** Audit passes.
* **expected file hotspots:** All view files.

* **capability name:** selected state
* **user outcome:** Navigation highlights active tab.
* **current visible surface:** Bottom nav bar.
* **current source files:** `src/components/app/bottom-nav.tsx`
* **current state fields:** Route state.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/bottom-nav.tsx`

* **capability name:** final visible labels
* **user outcome:** Visible labels match terminology.
* **current visible surface:** App wide.
* **current source files:** `src/components/app/bottom-nav.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/bottom-nav.tsx`

* **capability name:** mobile navigation
* **user outcome:** Bottom nav for mobile.
* **current visible surface:** App wide.
* **current source files:** `src/components/app/bottom-nav.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/bottom-nav.tsx`

### Home

* **capability name:** Command Center
* **user outcome:** User sees an overview of their day.
* **current visible surface:** Home view with cards.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** Pulls from all domain states.
* **current analytics dependency:** Aggregate metrics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** Full Analytics engine.
* **next recommended action:** Wire real analytics.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** FitCore Score
* **user outcome:** User sees an aggregate score of their health.
* **current visible surface:** Top score UI.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** Derived state.
* **current analytics dependency:** `analytics.ts` FitCore Score logic.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Not testable`
* **known defects:** Fake math used currently.
* **missing prerequisite:** Aggregate Analytics Engine.
* **next recommended action:** Implement math in `analytics.ts`.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** Heatmap
* **user outcome:** User sees their muscle soreness visually.
* **current visible surface:** Body Map component.
* **current source files:** `src/components/app/body-heatmap.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/body-heatmap.tsx`

* **capability name:** Daily and Deep Dive behavior
* **user outcome:** Home has no subtabs in either mode.
* **current visible surface:** Home View.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None.


* **capability name:** daily summary
* **user outcome:** Quick overview text.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Aggregate analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** Analytics engine.
* **next recommended action:** Wire real analytics.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** next action
* **user outcome:** Recommended next step.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** AI context.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Hardcoded for now.
* **missing prerequisite:** AI context logic.
* **next recommended action:** Wire AI.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** attention items
* **user outcome:** Alerts for user.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** Training summary
* **user outcome:** Training card on home.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** Training analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** Nutrition summary
* **user outcome:** Nutrition card on home.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** `AppState.nutrition`
* **current analytics dependency:** Nutrition analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** Recovery summary
* **user outcome:** Recovery card on home.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** Recovery analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** quick actions
* **user outcome:** Quick log buttons.
* **current visible surface:** Home view.
* **current source files:** `src/components/app/views/home-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/home-view.tsx`

* **capability name:** coach insight
* **user outcome:** AI generated insight.
* **current visible surface:** Insight card.
* **current source files:** `src/components/app/ai-insight.tsx`
* **current state fields:** None.
* **current analytics dependency:** AI logic.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Missing real context.
* **missing prerequisite:** Privacy Engine (PR #208).
* **next recommended action:** Wire AI context.
* **expected file hotspots:** `src/components/app/ai-insight.tsx`

### Training

* **capability name:** Daily View
* **user outcome:** Summary of training without subtabs.
* **current visible surface:** Training tab, daily mode.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** Training analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** Deep Dive tabs
* **user outcome:** Performance, Strength, Library, Insights subtabs exist.
* **current visible surface:** Training tab, deep dive mode.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Domain Analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** Data missing from some tabs.
* **missing prerequisite:** Analytics.
* **next recommended action:** Wire analytics to tabs.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** Active Workout
* **user outcome:** User can log a workout live.
* **current visible surface:** Active workout full-screen sheet.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.activeWorkout`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** Hardening needed around state validation.
* **missing prerequisite:** None.
* **next recommended action:** Validation hardening.
* **expected file hotspots:** `src/components/app/active-workout.tsx`


* **capability name:** assigned workouts
* **user outcome:** Scheduled workouts.
* **current visible surface:** Training view.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** `AppState.assignedWorkouts`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Sync backend.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** set logging
* **user outcome:** Logging individual sets.
* **current visible surface:** Active workout full-screen sheet.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.activeWorkout`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** workout completion
* **user outcome:** Finishing and saving workout.
* **current visible surface:** Active workout full-screen sheet.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** workout history
* **user outcome:** Viewing past workouts.
* **current visible surface:** Training view.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** cardio
* **user outcome:** Cardio specific logging.
* **current visible surface:** Active workout.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Cardio logic.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** PRs
* **user outcome:** Personal records tracking.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Training analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics engine.
* **next recommended action:** Implement PR check.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** performance
* **user outcome:** Analytics on performance.
* **current visible surface:** Training view Deep Dive.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Domain Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Data missing.
* **missing prerequisite:** Analytics.
* **next recommended action:** Wire analytics.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** exercise library
* **user outcome:** List of known exercises.
* **current visible surface:** Training view Library tab.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

* **capability name:** modifiers
* **user outcome:** Set tags (drop set, failure).
* **current visible surface:** Active workout.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.activeWorkout`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** previous performance
* **user outcome:** Showing past set data during active workout.
* **current visible surface:** Active workout.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Not always showing.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** workout notes
* **user outcome:** Notes on workouts.
* **current visible surface:** Active workout.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.activeWorkout.notes`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** template saving
* **user outcome:** Saving current workout as template.
* **current visible surface:** Active workout.
* **current source files:** `src/components/app/active-workout.tsx`
* **current state fields:** `AppState.workouts`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Not fully working.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/active-workout.tsx`

* **capability name:** templates
* **user outcome:** Reusable workout plans.
* **current visible surface:** Training view.
* **current source files:** `src/components/app/views/training-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/training-view.tsx`

### Fuel/Nutrition

* **capability name:** Daily Macros
* **user outcome:** User sees their daily macro intake.
* **current visible surface:** Nutrition view daily mode.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** `AppState.nutrition`
* **current analytics dependency:** Daily macro calc.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** Needs full meal logger.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** Implement Meal Logger.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** Meal logging
* **user outcome:** User can log a meal.
* **current visible surface:** Sheet for adding food.
* **current source files:** `src/components/app/views/nutrition-view.tsx` (partially)
* **current state fields:** `AppState.nutrition` array.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Form is incomplete.
* **missing prerequisite:** Form implementation.
* **next recommended action:** Build Meal logger form.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`


* **capability name:** templates
* **user outcome:** Meal templates.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** food library
* **user outcome:** Database of foods.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** custom meals
* **user outcome:** User created meals.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** meal deletion
* **user outcome:** Removing logged meals.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** `AppState.nutrition`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** nutrition targets
* **user outcome:** Goal macros.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** `AppState.goals`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** supplements
* **user outcome:** Supplement tracking.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** hydration support
* **user outcome:** Water tracking.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** quality
* **user outcome:** Food quality tracking.
* **current visible surface:** Nutrition view Deep Dive.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Nutrition Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Data missing.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** timing
* **user outcome:** Nutrient timing tracking.
* **current visible surface:** Nutrition view Deep Dive.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Nutrition Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Data missing.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** nutrition insights
* **user outcome:** AI nutrition insights.
* **current visible surface:** Nutrition view Deep Dive.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Jarvis.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** AI Context Builder.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

* **capability name:** unsupported nutrients
* **user outcome:** Handling missing micro data.
* **current visible surface:** Nutrition view.
* **current source files:** `src/components/app/views/nutrition-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/nutrition-view.tsx`

### Recovery

* **capability name:** Check-ins
* **user outcome:** User can complete daily morning check-in.
* **current visible surface:** Check-in bottom sheet.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main` (PR #215 pending)
* **release-readiness status:** `E2E testable`
* **known defects:** Bug with sheet lifecycle (addressed in PR #215).
* **missing prerequisite:** PR #215 merge.
* **next recommended action:** Review and merge PR #215.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`


* **capability name:** sleep logging
* **user outcome:** Manual sleep entry.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** muscle fatigue
* **user outcome:** Heatmap/soreness tracking.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** body status
* **user outcome:** General body feeling.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** readiness
* **user outcome:** Readiness score calculation.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics engine.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Math incomplete.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** wearable metrics
* **user outcome:** Wearable data display.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Fake data.
* **missing prerequisite:** Wearable sync.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** Daily View
* **user outcome:** Summary layout.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** `AppState.recovery`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** Deep Dive
* **user outcome:** Detailed analytics layout.
* **current visible surface:** Recovery view.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Domain Analytics.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** duplicate prevention
* **user outcome:** Wearable duplicate logic.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Wearable API.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** validation
* **user outcome:** Check-in data validation.
* **current visible surface:** Check-in sheet.
* **current source files:** `src/components/app/views/recovery-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** Addressed in PR #215.
* **missing prerequisite:** PR #215 merge.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/recovery-view.tsx`

* **capability name:** data propagation
* **user outcome:** Updating global state from check-in.
* **current visible surface:** App wide.
* **current source files:** `src/lib/store.tsx`
* **current state fields:** All.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/store.tsx`

### Stats

* **capability name:** Bodyweight
* **user outcome:** User can view and log bodyweight.
* **current visible surface:** Stats view bodyweight section.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** `AppState.bodyTracking`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** Goals
* **user outcome:** User can manage and track goals.
* **current visible surface:** Goals panel in Stats.
* **current source files:** `src/components/app/goals-panel.tsx`
* **current state fields:** `AppState.goals`
* **current analytics dependency:** Analytics for goal progress tracking.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** Integration with analytics for auto-tracking is incomplete.
* **missing prerequisite:** Domain Analytics completion.
* **next recommended action:** Connect goals to analytics.
* **expected file hotspots:** `src/components/app/goals-panel.tsx`, `src/lib/analytics.ts`


* **capability name:** bodyweight trends
* **user outcome:** Trend graphs.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** `AppState.bodyTracking`
* **current analytics dependency:** Analytics Engine.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** PRs
* **user outcome:** Training PRs.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** training consistency
* **user outcome:** Consistency metrics.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** weekly volume
* **user outcome:** Volume charts.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** nutrition summary
* **user outcome:** Historical nutrition.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Meal Logging UI.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** recovery summary
* **user outcome:** Historical recovery.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** Analytics.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Analytics.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** progress photos
* **user outcome:** Visual progress tracking.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Camera/Storage integration.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** milestones
* **user outcome:** Achieved milestones.
* **current visible surface:** Stats view.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** Analytics Engine.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** Analytics
* **user outcome:** Deep dive tab.
* **current visible surface:** Stats view Deep Dive.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** Body
* **user outcome:** Deep dive tab.
* **current visible surface:** Stats view Deep Dive.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** Goals
* **user outcome:** Deep dive tab.
* **current visible surface:** Stats view Deep Dive.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

* **capability name:** Insights
* **user outcome:** Deep dive tab.
* **current visible surface:** Stats view Deep Dive.
* **current source files:** `src/components/app/views/progress-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/progress-view.tsx`

### Settings

* **capability name:** Profile
* **user outcome:** User manages profile info.
* **current visible surface:** Settings -> Profile tab.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** `AppState.profile`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main` (PR #216 pending)
* **release-readiness status:** `E2E testable`
* **known defects:** UI validation issues (addressed in PR #216).
* **missing prerequisite:** PR #216 merge.
* **next recommended action:** Review and merge PR #216.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** Privacy controls
* **user outcome:** User configures AI and privacy settings.
* **current visible surface:** Settings -> Privacy tab.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** `AppState.privacyPolicy`
* **current analytics dependency:** None.
* **current tests:** Integration.
* **readiness status:** `Open PR needs repair` (PR #208)
* **release-readiness status:** `Integration testable`
* **known defects:** Core engine not merged.
* **missing prerequisite:** PR #208 merge.
* **next recommended action:** Repair and merge PR #208.
* **expected file hotspots:** `src/lib/privacy-policy.ts`, `src/lib/types.ts`


* **capability name:** Preferences
* **user outcome:** App preferences.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** `AppState.preferences`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** Data
* **user outcome:** Data management tab.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main` (PR #216 pending)
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** PR #216 merge.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** Integrations
* **user outcome:** Connected apps tab.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** import
* **user outcome:** Import state.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`, `src/lib/fitcore-data.ts`
* **current state fields:** All.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/fitcore-data.ts`

* **capability name:** export
* **user outcome:** Export state.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`, `src/lib/fitcore-data.ts`
* **current state fields:** All.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/fitcore-data.ts`

* **capability name:** reset
* **user outcome:** Clear all data.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** All.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** units
* **user outcome:** Unit selection.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** `AppState.preferences`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** demo mode
* **user outcome:** Toggle demo data.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** `AppState.demoMode`
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

* **capability name:** wearable connections
* **user outcome:** Wearable setup.
* **current visible surface:** Settings view.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** Wearable API.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/views/settings-view.tsx`

### Analytics

* **capability name:** Domain metrics
* **user outcome:** Calculations for distinct areas.
* **current visible surface:** Used across Deep Dive views.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses all state.
* **current analytics dependency:** N/A.
* **current tests:** Vitest Unit Tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Component testable`
* **known defects:** Missing advanced queries.
* **missing prerequisite:** None.
* **next recommended action:** Expand for Deep Dive.
* **expected file hotspots:** `src/lib/analytics.ts`


* **capability name:** safe math
* **user outcome:** Non-throwing math helpers.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** None.
* **current analytics dependency:** N/A.
* **current tests:** Vitest Unit Tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Component testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** date/time
* **user outcome:** Deterministic date helpers.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** None.
* **current analytics dependency:** N/A.
* **current tests:** Vitest Unit Tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Component testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** Training detail
* **user outcome:** Granular training stats.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses state.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** Nutrition detail
* **user outcome:** Granular nutrition stats.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses state.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** Recovery detail
* **user outcome:** Granular recovery stats.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses state.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** Goal detail
* **user outcome:** Progress against goals.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses state.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** aggregate analytics
* **user outcome:** Combined score logic.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** Uses state.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** invariants
* **user outcome:** Defensive assertions.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** None.
* **current analytics dependency:** N/A.
* **current tests:** Vitest Unit Tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Component testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** deterministic behavior
* **user outcome:** Predictable outputs.
* **current visible surface:** None.
* **current source files:** `src/lib/analytics.ts`
* **current state fields:** None.
* **current analytics dependency:** N/A.
* **current tests:** Vitest Unit Tests.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `Component testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/analytics.ts`

* **capability name:** UI integration status
* **user outcome:** Hooked to charts.
* **current visible surface:** Views.
* **current source files:** Views.
* **current state fields:** None.
* **current analytics dependency:** N/A.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** Views

### Privacy and Sensitive Data

* **capability name:** Category policies
* **user outcome:** Enforces what data can be synced or sent to AI.
* **current visible surface:** Background engine.
* **current source files:** `src/lib/privacy-policy.ts`
* **current state fields:** `AppState.privacyPolicy`
* **current analytics dependency:** None.
* **current tests:** Integration Tests.
* **readiness status:** `Open PR needs repair` (PR #208)
* **release-readiness status:** `Not testable`
* **known defects:** Needs repair.
* **missing prerequisite:** PR repair.
* **next recommended action:** Merge PR #208.
* **expected file hotspots:** `src/lib/privacy-policy.ts`


* **capability name:** local-only behavior
* **user outcome:** Enforcement of no-sync.
* **current visible surface:** None.
* **current source files:** `src/lib/privacy-policy.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** AI-use permissions
* **user outcome:** Toggle AI context inclusion.
* **current visible surface:** Settings view.
* **current source files:** `src/lib/privacy-policy.ts`
* **current state fields:** `AppState.privacyPolicy`
* **current analytics dependency:** None.
* **current tests:** Integration Tests.
* **readiness status:** `Open PR needs repair` (PR #208)
* **release-readiness status:** `Integration testable`
* **known defects:** Needs repair.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** AI memory
* **user outcome:** Persisted AI context.
* **current visible surface:** None.
* **current source files:** `src/lib/privacy-policy.ts`
* **current state fields:** `AppState.privacyPolicy`
* **current analytics dependency:** None.
* **current tests:** Integration Tests.
* **readiness status:** `Open PR needs repair` (PR #208)
* **release-readiness status:** `Integration testable`
* **known defects:** Needs repair.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** explicit consent
* **user outcome:** Required for sensitive info.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** sensitive unlock
* **user outcome:** Re-auth for access.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** export
* **user outcome:** Exporting privacy settings.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** deletion
* **user outcome:** Purging sensitive data.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

* **capability name:** source explanations
* **user outcome:** Why AI knows something.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`

### Wearables

* **capability name:** Wearable UI integration
* **user outcome:** Users see synced wearable status.
* **current visible surface:** Settings Integrations.
* **current source files:** `src/components/app/views/settings-view.tsx`
* **current state fields:** Wearable connection state.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** Real sync not built.
* **missing prerequisite:** Wearable API provider setup.
* **next recommended action:** Build mock provider.
* **expected file hotspots:** `src/lib/wearables/`


* **capability name:** providers
* **user outcome:** Provider definitions.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** normalization
* **user outcome:** Standardizing incoming data.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** units
* **user outcome:** Standardizing units.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** deduplication
* **user outcome:** Preventing double counting.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** updates
* **user outcome:** Modifying synced records.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** revocations
* **user outcome:** Removing synced records.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** conflicts
* **user outcome:** Handling overlapping sessions.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** manual-data protection
* **user outcome:** Priority of manual data.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

* **capability name:** persistence integration
* **user outcome:** Saving wearable state.
* **current visible surface:** None.
* **current source files:** `src/lib/wearables/`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/wearables/`

### AI and Jarvis

* **capability name:** Chat
* **user outcome:** User chats with Jarvis.
* **current visible surface:** Floating AI shell.
* **current source files:** `src/components/app/jarvis/ai-shell.tsx`
* **current state fields:** AI memory state.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** Context integration incomplete.
* **missing prerequisite:** Privacy engine (PR #208).
* **next recommended action:** Merge #208 to unlock.
* **expected file hotspots:** `src/lib/ai.functions.ts`


* **capability name:** memory
* **user outcome:** Persistent AI facts.
* **current visible surface:** AI Shell.
* **current source files:** `src/lib/ai.functions.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Open PR needs repair`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/ai.functions.ts`

* **capability name:** explanations
* **user outcome:** Justifying answers.
* **current visible surface:** Insight cards.
* **current source files:** `src/components/app/ai-insight.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/ai-insight.tsx`

* **capability name:** logging through AI
* **user outcome:** NLP to structured logs.
* **current visible surface:** AI Shell.
* **current source files:** `src/lib/ai.functions.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/ai.functions.ts`

* **capability name:** voice
* **user outcome:** Voice input.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** health context
* **user outcome:** Passing state to AI.
* **current visible surface:** None.
* **current source files:** `src/lib/ai.functions.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/ai.functions.ts`

* **capability name:** recommendation boundaries
* **user outcome:** Safety rails.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** privacy dependencies
* **user outcome:** Honoring privacy settings.
* **current visible surface:** None.
* **current source files:** `src/lib/privacy-policy.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Open PR needs repair`
* **release-readiness status:** `Integration testable`
* **known defects:** None.
* **missing prerequisite:** PR #208.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/privacy-policy.ts`


* **capability name:** current AI entry points
* **user outcome:** Floating shell, Insight cards.
* **current visible surface:** App wide.
* **current source files:** `src/components/app/jarvis/ai-shell.tsx`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** Playwright E2E.
* **readiness status:** `Implemented on main`
* **release-readiness status:** `E2E testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/components/app/jarvis/ai-shell.tsx`

### Safety and Future Platform


* **capability name:** medical data
* **user outcome:** Base types only.
* **current visible surface:** None.
* **current source files:** `src/lib/types.ts`
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Partially implemented`
* **release-readiness status:** `Not testable`
* **known defects:** None.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** `src/lib/types.ts`

* **capability name:** medications
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** allergies
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** conditions
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** surgeries
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** emergency contacts
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** injury red flags
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** concerning-symptom guidance
* **user outcome:** Documented only.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** notifications
* **user outcome:** Push infrastructure.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** busy detection
* **user outcome:** Context awareness.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** Do Not Disturb
* **user outcome:** Silence windows.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** morning briefing
* **user outcome:** Summary push.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

* **capability name:** bedtime recap
* **user outcome:** Summary push.
* **current visible surface:** None.
* **current source files:** None.
* **current state fields:** None.
* **current analytics dependency:** None.
* **current tests:** None.
* **readiness status:** `Documented only`
* **release-readiness status:** `Not testable`
* **known defects:** N/A.
* **missing prerequisite:** None.
* **next recommended action:** None.
* **expected file hotspots:** None

*(Future capabilities: Progress photos, advanced medical features, voice integrations, push notifications)*


## 5. Dependency Graph

### Core Dependency Chain
* `Types/Schemas` (src/lib/types.ts) [**hard dependency**]
  → `Store/Persistence` (src/lib/store.tsx) [**hard dependency**]
  → `Feature Data Logging` (Active Workout, Check-in, Nutrition Log) [**hard dependency**]
  → `Domain Analytics` (src/lib/analytics.ts) [**hard dependency**]
  → `Aggregate Analytics` (FitCore Score) [**optional enhancement**]
  → `Daily View summaries` [**hard dependency**]
  → `Deep Dive analytics` [**soft dependency**]
  → `AI interpretation` [**soft dependency**]

### Training Dependency Chain
* `Exercise Library` [**hard dependency**]
  → `Active Workout UI` [**hard dependency**]
  → `Workout Persistence` [**hard dependency**]
  → `Training Domain Analytics` [**soft dependency**]
  → `PRs & Volume Stats` [**soft dependency**]

### Nutrition Dependency Chain
* `Food Library/Database` [**hard dependency**]
  → `Meal Logging UI` [**hard dependency**]
  → `Nutrition Persistence` [**hard dependency**]
  → `Macro Calculation` [**hard dependency**]
  → `Nutrient Timing/Quality Stats` [**optional enhancement**]

### Recovery Dependency Chain
* `Check-in UI` [**hard dependency**]
  → `Recovery Persistence` [**hard dependency**]
  → `Soreness Heatmap Map` [**soft dependency**]
  → `Readiness Score Calculation` [**soft dependency**]

### Stats Dependency Chain
* `Domain Analytics (All)` [**hard dependency**]
  → `Aggregate Stats Engine` [**hard dependency**]
  → `Chart Components` [**soft dependency**]
  → `Goal Progress Updates` [**soft dependency**]

### Wearables Dependency Chain
* `Wearable Provider API` [**hard dependency**]
  → `Data Normalization` [**hard dependency**]
  → `Deduplication Logic` [**hard dependency**]
  → `Overlap/Conflict Resolution` [**hard dependency**]
  → `Persistence Integration` [**hard dependency**]
  → `UI Integration` [**soft dependency**]

### Privacy Dependency Chain
* `Privacy Engine (PR #208)` [**hard dependency**]
  → `Local Storage Policy Enforcement` [**hard dependency**]
  → `AI Context Builder` [**hard dependency**]
  → `Jarvis Explanations` [**soft dependency**]
  → `Data Export/Deletion Tools` [**hard dependency**]

### AI Dependency Chain
* `Privacy Engine` [**hard dependency**]
  → `Health Context Builder` [**hard dependency**]
  → `Jarvis Memory` [**hard dependency**]
  → `Chat UI` [**hard dependency**]
  → `Insight Generation` [**optional enhancement**]

### Testing Dependency Chain
* `Stable UI Routes` [**test dependency**]
  → `Valid Form Interactions` [**test dependency**]
  → `Data Persistence Verification` [**test dependency**]
  → `Complete E2E Suite` [**test dependency**]
  → `Release-Candidate Ready` [**merge-order dependency**]

## 6. Feature-to-File Ownership Matrix

| Feature | Source File | Shared Component | Store | Schema/Types | Analytics | Tests | Routes | Configuration | Generated Files | Documentation |
|---|---|---|---|---|---|---|---|---|---|---|
| Active Workout | `src/components/app/active-workout.tsx` | `src/components/app/shared/` | `src/lib/store.tsx` | `src/lib/types.ts` | `src/lib/analytics.ts` | E2E | N/A | N/A | N/A | Product Bible Book 3 |
| Recovery Check-in | `src/components/app/views/recovery-view.tsx` | `src/components/app/sheet.tsx` | `src/lib/store.tsx` | `src/lib/types.ts` | `src/lib/analytics.ts` | E2E | N/A | N/A | N/A | Product Bible Book 7 |
| Settings Management | `src/components/app/views/settings-view.tsx` | `src/components/app/ui.tsx` | `src/lib/store.tsx` | `src/lib/types.ts` | None | E2E | N/A | N/A | N/A | Product Bible Book 5 |
| Privacy Policy | `src/lib/privacy-policy.ts` | None | `src/lib/store.tsx` | `src/lib/types.ts` | None | Unit | N/A | N/A | N/A | Product Bible Book 2 |
| App Shell | `src/components/app/layout-primitives.tsx` | None | `src/lib/store.tsx` | `src/lib/types.ts` | None | E2E | `src/routes/__root.tsx` | None | `src/routeTree.gen.ts` | Product Bible Book 5 |

* **Safe for parallel work:** Self-contained UI components (e.g., a new chart component not touching store).
* **Moderate overlap risk:** View components sharing identical domain concepts.
* **High overlap risk:** Cross-cutting UI features (e.g., global layout changes).
* **Serialize all changes:** `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/fitcore-data.ts`.

## 7. Current Workstream Map

* **Settings hardening**
  * **Current PR:** #216
  * **Exact scope:** Settings UI, profile form validation, import/export controls.
  * **Allowed files:** `src/components/app/views/settings-view.tsx`
  * **Prohibited overlap:** Other settings work.
  * **Blockers:** None.
  * **Next approval gate:** Manual UI review.

* **Recovery hardening**
  * **Current PR:** #215
  * **Exact scope:** Check-in bottom sheet lifecycle, form state validation.
  * **Allowed files:** `src/components/app/views/recovery-view.tsx`
  * **Prohibited overlap:** Other recovery state changes.
  * **Blockers:** None.
  * **Next approval gate:** E2E Check.

* **Privacy policy engine**
  * **Current PR:** #208
  * **Exact scope:** Core privacy engine and AI data usage types.
  * **Allowed files:** `src/lib/privacy-policy.ts`, `src/lib/types.ts`
  * **Prohibited overlap:** Any AI context or data sync logic.
  * **Blockers:** Needs repair.
  * **Next approval gate:** Unit test pass.

## 8. Parallelization Rules

* **Shared State:** Any PR touching `types.ts`, `store.tsx`, or `fitcore-data.ts` MUST be serialized. Do not run concurrent agents on these files.
* **View Independence:** Work on isolated view files (e.g., `nutrition-view.tsx` vs `training-view.tsx`) can run concurrently IF they do not require new shared state properties.
* **Test Isolation:** E2E test files should map 1:1 with views when possible. Changes to shared helpers (`fitcore-test-state.ts`) must be serialized.
* **Dependencies:** Package/lockfile changes must run in isolation.
* **Generated Files:** Route tree (`routeTree.gen.ts`) updates automatically; avoid manual edits to prevent merge conflicts.
* **Replacement PRs:** Must close/abandon previous attempts to prevent split brain.

## 9. Recommended Implementation Waves

### Wave 1: Clean Up Active PRs (Current)
* **Wave goal:** Merge or replace #216 (Settings), #215 (Recovery), and #208 (Privacy).
* **Prerequisites:** None.
* **Task candidates:** (Only 3 safe tasks)
    1. Resolve PR #216 (Settings).
    2. Resolve PR #215 (Recovery).
    3. Resolve PR #208 (Privacy).
* **Exact probable file scope:** `settings-view.tsx`, `recovery-view.tsx`, `privacy-policy.ts`, `types.ts`.
* **Concurrency safety:** Strict serialization required due to shared types in #208.
* **Likely merge order:** #215, #216, then #208.
* **Shared validation:** E2E test suite.
* **Approval gate:** Master is green with basic privacy and fixed settings/recovery.
* **Rollback point:** Pre-merge SHA of #208.

### Wave 2: Logging Reliability & Complete Daily Views
* **Wave goal:** Ensure all daily logging forms (Meals, Workouts, Recovery) are robust and feed the state correctly.
* **Prerequisites:** Wave 1 completion.
* **Task candidates:**
    1. Nutrition meal logging form completion.
    2. Active workout validation hardening.
    3. Home screen summary metric calculation (wiring).
    4. Goal creation/editing flow.
    5. Unit conversion standard enforcement.
    6. Mock data generator for testing bounds.
* **Exact probable file scope:** `nutrition-view.tsx`, `active-workout.tsx`, `home-view.tsx`, `goals-panel.tsx`.
* **Concurrency safety:** Safe if divided strictly by domain.
* **Likely merge order:** Nutrition log -> Workout hard -> Home wiring.
* **Shared validation:** Integration tests.
* **Approval gate:** Users can reliably log daily data in all 3 primary areas without crashes.
* **Rollback point:** Pre-Wave 2 main branch.

### Wave 3: Deep Dive Analytics Integration
* **Wave goal:** Wire up Charts and Insights tabs in Deep Dive views to real data.
* **Prerequisites:** Wave 2 logging to be solid.
* **Task candidates:**
    1. Expand `analytics.ts` for Training metrics.
    2. Expand `analytics.ts` for Nutrition metrics.
    3. Wire Progress Charts.
    4. Wire Recovery Insights.
    5. Wire Training Insights.
* **Exact probable file scope:** `analytics.ts`, `progress-view.tsx`, `training-view.tsx`.
* **Concurrency safety:** Highly parallelizable after base `analytics.ts` expansion.
* **Likely merge order:** Analytics TS -> Progress Views -> Specific Deep Dive Views.
* **Shared validation:** Unit tests on Analytics.
* **Approval gate:** Deep Dive tabs show meaningful (non-placeholder) graphs and data.
* **Rollback point:** Pre-Wave 3 main branch.


### Wave 4: AI & Wearables Integration
* **Wave goal:** Connect Jarvis to context, implement wearable duplicate prevention logic.
* **Prerequisites:** Wave 3 completion.
* **Task candidates:**
    1. Build mock Wearable API Provider.
    2. Implement Wearable deduplication rules.
    3. Expose Wearable metrics in Recovery views.
    4. Connect Jarvis context to Domain states.
    5. Wire Jarvis explanations to AI Insight cards.
    6. Implement NLP logging translation to `AppState`.
* **Exact probable file scope:** `wearables/`, `ai.functions.ts`, `ai-insight.tsx`, `recovery-view.tsx`.
* **Concurrency safety:** Highly parallelizable across the two domains (AI vs Wearables).
* **Likely merge order:** Wearable deduplication -> Wearable UI -> Jarvis context -> Jarvis logging.
* **Shared validation:** Integration and mock tests.
* **Approval gate:** Jarvis can read all domains and summarize them; Wearable sync simulates correctly without duplicate data.
* **Rollback point:** Pre-Wave 4 main branch.

### Wave 5: Safety and Future Platform Foundation
* **Wave goal:** Lay groundwork for advanced platform features (Notifications, Medical types).
* **Prerequisites:** Wave 4 completion.
* **Task candidates:**
    1. Define base medical data types (if approved).
    2. Add notification permission flows to Settings.
    3. Scaffold basic morning briefing worker.
    4. Scaffold basic bedtime recap worker.
* **Exact probable file scope:** `types.ts`, `settings-view.tsx`, `worker.ts` (future).
* **Concurrency safety:** Serialization required for `types.ts`.
* **Likely merge order:** Types -> Workers -> UI toggles.
* **Shared validation:** Unit tests.
* **Approval gate:** Platform is ready for push notifications (even if just dummy logs).
* **Rollback point:** Pre-Wave 5 main branch.



## 10. Merge Sequencing Plan

1. **Merge #216 (Settings) or #215 (Recovery):** These are relatively isolated UI hardening tasks. They should merge before Wave 2 begins.
2. **Merge #208 (Privacy):** This touches core types and will require rebasing any open PRs that modify state definitions. It is foundational and should merge before AI context features.
3. **New Work:** Begin Wave 2 only after #208 is merged to ensure the privacy engine is available for new data categories.
4. **Replacement branches:** If an old PR like #208 becomes too stale or conflicted with types, it should be recreated instead of repaired to avoid messy merge commits on `types.ts`.
5. **Closing old PRs:** PRs inactive for more than a wave phase with significant conflicts should be closed to unblock parallel work, preserving their intent in this document.
6. **Testing enforcement:** Tests should move from future-facing (mocked) to enforced (blocking CI) after Wave 2 stabilizes the core logging capabilities.

## 11. Release-Critical Path

* **Required before internal testing:**
    * app-shell stability
    * safe state persistence (no silent data loss on refresh).
    * valid logging (Training, Recovery).
    * Daily View completeness.
    * Import/Export functions properly.
    * reset clears all state.
    * mobile overlays work.
    * accessibility baseline.
    * no fabricated data.
    * production build succeeds.
    * regression suite green.

* **Required before external beta:**
    * active-workout stability.
    * Deep Dive stability.
    * analytics safety.

* **Helpful but deferrable:**
    * Complete AI Jarvis integration.
    * Real wearable sync.

* **Future:**
    * Advanced trend analysis.

## 12. Blocker Register

| Blocker | Affected Capability | Evidence | Source or PR | Severity | Dependency | Workaround | Correct Resolution | Owner | Target Wave |
|---|---|---|---|---|---|---|---|---|---|
| Open Privacy PR | AI Context Builder | PR #208 modifies types needed for context | PR #208 | High | AI Features | None | Merge or Reimplement | Unknown | Wave 1 |
| Incomplete Meal Logging | Nutrition Analytics | `nutrition-view.tsx` lacks full form | `src/components/app/views/nutrition-view.tsx` | High | Nutrition | None | Build Meal Logger | Unknown | Wave 2 |

## 13. Decision Register

* **Daily View has no subtabs:** Enforced.
* **Home has no subtabs:** Enforced.
* **Stats is the visible name:** Internal ID may be "progress", but UI must say "Stats".
* **Settings is not a bottom tab:** Accessed via Home top icon.
* **Daily/Deep Dive are modes, not routes:** They use local state, not URL paths.
* **No fake data:** Unsupported values show empty states, not fabricated numbers.
* **Photo Meal is not on the main Fuel Daily View:** Enforced.
* **advanced analysis belongs in Deep Dive:** Enforced.
* **internal IDs should not be renamed merely for visible-label changes:** Enforced.

## 14. Deferred and Future Capabilities

* **Progress Photos:**
  * product intent: Visual progress tracking.
  * why it is deferred: Requires file storage/camera integration.
  * prerequisites: Storage infra.
  * current source support: None.
  * risk: High privacy risk.
  * likely implementation phase: Phase 3.

* **Voice Integration:**
  * product intent: Log via voice.
  * why it is deferred: High complexity.
  * prerequisites: Speech-to-text API.
  * current source support: None.
  * risk: Medium.
  * likely implementation phase: Phase 4.

* **Medical Data (Labs/Genetics):**
  * product intent: Precision health.
  * why it is deferred: High privacy risk.
  * prerequisites: Robust privacy engine.
  * current source support: Base types only.
  * risk: Extreme.
  * likely implementation phase: Deferred until privacy engine is audited in production.

## 15. Recommended Next Actions

### Immediate
* **Action:** Audit and resolve PR #215 (Recovery) and #216 (Settings).
* **Scope:** `recovery-view.tsx`, `settings-view.tsx`.
* **Dependency:** None.

### After current PRs merge
* **Action:** Resolve PR #208 (Privacy).
* **Scope:** `privacy-policy.ts`, `types.ts`.
* **Dependency:** PR #215, #216 merge.

### Before testing release
* **Action:** Wire up Home screen summary cards to actual analytics engine.
* **Scope:** `home-view.tsx`, `analytics.ts`.
* **Dependency:** Logging components.

## 16. Maintenance Rules

Update this document when:
* major feature merged
* state schema changed
* analytics contract changed
* PR replacement created
* release gate passed
* capability explicitly deferred or removed
