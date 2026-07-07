# Layout Deep Dive Mode Code Scope Audit

## Purpose
This document outlines the scope, planning, and requirements for implementing the "Daily View / Deep Dive" mode layout within FitCore. It addresses the structural updates needed to support a segmented toggle that switches the app between a streamlined daily overview and a detailed deep dive view, without altering the global bottom navigation.

## Current Files Inspected
The following files were inspected to understand the current layout architecture and dependency points:
- `src/routes/index.tsx` (Global routing and state shell)
- `src/components/app/bottom-nav.tsx` (Current bottom navigation behavior)
- `src/components/app/views/home.tsx` (Current structure of the Today view)
- `src/components/app/views/settings.tsx` (Current setting screen handling)
- `src/lib/types.ts` (App state interfaces)
- `src/lib/store.tsx` (Global state management)

## Likely Files Needed for Daily View / Deep Dive Mode
Implementing the core toggle functionality will likely involve:
- **State Updates:** Modifying `src/lib/types.ts` and `src/lib/store.tsx` to include `layoutMode: 'daily' | 'deepDive'` in the user's persistent settings.
- **Top-Level Layout:** Updating `src/components/app/layout-primitives.tsx` or `src/components/app/views/home.tsx` to include the segmented toggle `[Daily View] [Deep Dive]`.
- **View Logic:** Updating all core view files (Home, Training, Nutrition, Recovery, Progress/Insights) to consume the `layoutMode` state and conditionally render either daily summaries or deep dive subtabs.

## Likely Files Needed for Deep Dive Subtabs
To support the extensive Deep Dive hierarchies without bloating single files, new sub-components or directories will likely be required for each section.
*   **Today (`src/components/app/views/home/`):**
    *   `score-breakdown.tsx`
    *   `next-action.tsx`
    *   `daily-timeline.tsx`
    *   `tomorrow-preview.tsx`
*   **Training (`src/components/app/views/training/`):**
    *   `training-overview.tsx`, `training-active.tsx`, `training-plan.tsx`, `training-programs.tsx`, `training-exercises.tsx`, `training-history.tsx`, `training-progression.tsx`, `training-sports.tsx`, `training-safety.tsx`
*   **Nutrition (`src/components/app/views/nutrition/`):**
    *   `nutrition-overview.tsx`, `nutrition-food-log.tsx`, `nutrition-targets.tsx`, `nutrition-meals.tsx`, `nutrition-supplements.tsx`, `nutrition-hydration.tsx`, `nutrition-trends.tsx`, `nutrition-ai-review.tsx`
*   **Recovery (`src/components/app/views/recovery/`):**
    *   `recovery-overview.tsx`, `recovery-sleep.tsx`, `recovery-readiness.tsx`, `recovery-body-map.tsx`, `recovery-check-ins.tsx`, `recovery-wearables.tsx`, `recovery-interventions.tsx`, `recovery-health-context.tsx`
*   **Insights (`src/components/app/views/insights/` or `progress/`):**
    *   `insights-overview.tsx`, `insights-training.tsx`, `insights-nutrition.tsx`, `insights-body.tsx`, `insights-recovery.tsx`, `insights-correlations.tsx`, `insights-reports.tsx`, `insights-health-twin.tsx`

## Files to Avoid While Current Layout PRs are Active
Do **not** modify the following files while baseline layout/nav foundation PRs are unmerged or while PRs #2, #14, and #34 remain parked:
*   `src/components/app/views/home.tsx`
*   `src/routes/index.tsx`
*   `src/components/app/views/hub/hub.tsx` (if it exists)
*   `src/components/app/views/training.tsx`
*   `src/components/app/active-workout.tsx`
*   `src/components/app/views/nutrition.tsx`
*   `src/components/app/views/recovery.tsx`
*   `src/components/app/layout-primitives.tsx`

## Recommended Implementation Sequence
1.  **State Foundation:** Introduce `layoutMode` to the global store and persistence layer.
2.  **Toggle UI:** Implement the segmented toggle component. Place it conditionally at the top of the Today view and inside the new FitCore Hub settings.
3.  **View Routing Shells:** Update the core section views to accept the mode and render placeholder shells for the Deep Dive subtabs.
4.  **Subtab Implementation (Iterative):** Gradually build out the Deep Dive subtabs per section (Today, Training, Nutrition, Recovery, Insights).

## Conflict Risk Table
| Area | Risk Level | Description | Mitigation |
| :--- | :--- | :--- | :--- |
| **Global State** | Low | Adding a simple `layoutMode` flag is non-destructive. | Define clear defaults in `store.tsx`. |
| **Bottom Nav** | Medium | Overlapping work on bottom nav structure (e.g., locking tabs to 5). | Do not touch `bottom-nav.tsx` during mode toggle work. The mode should not affect bottom tabs. |
| **View Components** | High | Massive file bloat if all deep dive logic is put in `home.tsx`, `training.tsx`, etc. | Strictly follow the architectural directive to extract subtabs into feature-local files/directories. |
| **FitCore Hub** | High | Collision with ongoing work to centralize settings/profile into the Hub. | Wait for Hub foundation before adding the toggle there. Start with the Today view toggle. |

## Explicit Warning
**WARNING: Do not implement Deep Dive runtime logic while the core navigation and mode foundation PR is unmerged. Attempting to build out subtabs before the structural shells and mode toggles are finalized will result in severe merge conflicts.**

## Acceptance Criteria
- [ ] App retains the locked 5-tab bottom navigation (Today, Training, Nutrition, Recovery, Insights).
- [ ] Segmented toggle `[Daily View] [Deep Dive]` exists at the top of Today and in FitCore Hub.
- [ ] App remembers the last selected layout mode across sessions.
- [ ] Daily View is the default for new users.
- [ ] Toggling the mode switches the content within the current active tab.
- [ ] No extraneous bottom tabs (Log, Coach, Body, More, Health, Profile, Settings) are present.

## Mapping for Deep Dive Hierarchy

### Today Deep Dive:
*   FitCore Score breakdown
*   Next Best Action
*   What Changed Today
*   Completed form details
*   Daily Timeline
*   Missing Data
*   Low-Confidence Data
*   Source/Confidence Summary
*   Training + Nutrition + Recovery interaction cards
*   Tomorrow Preview

### Training Deep Dive subtabs:
*   Overview
*   Active
*   Plan
*   Programs
*   Exercises
*   History
*   Progression
*   Sports
*   Safety

### Nutrition Deep Dive subtabs:
*   Overview
*   Food Log
*   Targets
*   Meals / Recipes
*   Supplements
*   Hydration / Fasting
*   Trends
*   Food AI Review

### Recovery Deep Dive subtabs:
*   Overview
*   Sleep
*   Readiness
*   Body Map
*   Check-Ins
*   Wearables
*   Interventions
*   Health Context

### Insights Deep Dive subtabs:
*   Overview
*   Training
*   Nutrition
*   Body
*   Recovery
*   Correlations
*   Reports
*   Health Twin
