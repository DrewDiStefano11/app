# App Stability, Cleanup, and Dead Code Review

## Scope

This audit focuses on app-wide stability, cleanup, dead-code, and risk review across the FitCore application. The main goal is to identify anything that could make future work harder, unstable, confusing, duplicated, dead, stale, broken, or unsafe, with particular attention to potential conflicts with an upcoming major runtime PR for the app-wide Daily View / Deep Dive toggle and finalized tab/subtab foundation.

## Executive Summary

The overall stability of the runtime application is reasonable, with core E2E tests passing. However, there are significant areas of risk, particularly around placeholder/demo functionality that looks real, and existing scaffolding for features ("Daily View", "Deep Dive") that will likely conflict with the upcoming major PR. There are also build issues (`npx tsc` fails because typescript is not locally installed/configured properly for npx use without install, though the `vite build` succeeds with warnings). Several UI components have stubbed out controls, especially in the Settings view.

## Current Stability Assessment

- Core runtime boots successfully.
- Basic navigation and logging workflows pass E2E smoke tests.
- Vite build succeeds, although with some chunk size warnings and unused import warnings in tanstack router dependencies.
- `tsc --noEmit` is currently failing in the sandbox environment because a local `typescript` bin is expected but npx is unable to resolve it properly.

## High-Risk Areas

- **Layout Primitives:** `src/components/app/layout-primitives.tsx` currently exports a `LayoutMode` ("daily" | "deepDive") which is already actively used in several places (e.g., `src/components/app/dashboard-layout.ts`). This is extremely likely to conflict with the upcoming PR from Codex which touches this exact architecture.
- **Settings View:** `src/components/app/views/settings.tsx` is heavily populated with placeholders ("Coming later", "Not connected yet") that might be confusing to users or other developers if not properly tracked.

## Dead Code / Possibly Unused Code

- `src/components/app/shared/HealthProfileFoundation.tsx`: Appears to be a presentational scaffold that is currently disconnected from real data.
- Unused imports in node_modules as reported by Vite build, but within the `src` directory, some shared UI components (e.g., in `src/components/ui/`) might be completely unused but kept for future use.

## Duplicate or Overlapping Components

- Potential overlap between `src/components/app/views/progress.tsx` and the individual domain views (`training.tsx`, `nutrition.tsx`, `recovery.tsx`) if they duplicate summary cards.

## Placeholder or Fake-Functionality Risks

- **Demo Mode:** `state.demoMode` heavily influences what is displayed, inserting fake sets, HRV, and daily targets (e.g., in `active-workout.tsx`, `home.tsx`, and `demo-data.ts`).
- **Settings View placeholders:** Sections like "Body metrics", "Recovery preferences", "Source visibility", "Smart scale", "Allergies", "Gym or PT clinic", and "Premium / Pro" are hardcoded with "Coming later" or "Not connected yet".
- **Fake Jarvis settings:** Draft keys for Groq/Gemini in `src/components/app/jarvis/settings-card.tsx`.

## Broken or Suspicious UI Actions

- The checkboxes/toggles in Settings under placeholders may look functional but have no backing logic.
- "Demo mode" toggle is functional but might mislead users if they accidentally enable it and see fake data.

## Navigation / Tabs / Subtabs Risks

- The current bottom navigation (`src/components/app/bottom-nav.tsx`) handles tab switching, but the new toggle PR might fundamentally change how "Daily View" vs "Deep Dive" modes interact with these tabs.

## Daily View / Deep Dive Readiness Risks

- `src/components/app/dashboard-layout.ts` defines "daily-plan" and `src/components/app/layout-primitives.tsx` uses "daily" and "deepDive" modes. These files are the highest risk for merge conflicts when the toggle/subtab PR lands.

## State, Storage, and Data Propagation Risks

- `localStorage` is heavily relied upon (`fitcore.v1`). Tests show a complex hydration and migration strategy (handling versions 1 through 4). Any change to the state schema by the upcoming PR must carefully handle migrations.
- `state.demoMode` merging logic in `src/lib/store.tsx` could mask real data issues if not handled carefully during the toggle refactor.

## Test Suite Risks

- E2E tests (like `app-pr-gate-smoke.spec.ts`) heavily rely on exact text matches (e.g., "FitCore Today", "FitCore Score"). If the Deep Dive PR alters these headers, multiple tests will fail.
- Tests directly manipulate `localStorage` to mock state.

## Build / TypeScript / Lint / Dependency Risks

- `npx tsc --noEmit` fails because typescript isn't resolved properly in the current npx environment.
- Vite build outputs warnings about chunks > 500kB.

## Runtime UI Stability Risks

- Bottom navigation collapsing might hide crucial actions on smaller screens.
- Overlapping popups/sheets (e.g., `QuickPopups`) might break out of their containers if not using React Portals correctly (though Portals are reportedly used).

## Files or Areas That Should Be Left Alone Until After Toggle PR

- `src/components/app/layout-primitives.tsx`
- `src/components/app/dashboard-layout.ts`
- `src/components/app/views/home.tsx` (the Daily View landing page)
- `src/components/app/bottom-nav.tsx`
- Any active E2E smoke tests targeting the main headers.

## Recommended Cleanup PRs After Toggle Lands

### Cleanup PR 1 — Remove stale unused shared card scaffolds

Goal:
Remove or consolidate unused scaffold components (like `HealthProfileFoundation.tsx`) that are superseded by the new tab/subtab foundation.

Likely files:
- `src/components/app/shared/HealthProfileFoundation.tsx`
- `src/components/app/views/settings.tsx`

Risk:
Low

Can run concurrently:
No, wait until toggle/subtab PR lands.

### Cleanup PR 2 — Standardize Demo Data Handling

Goal:
Ensure demo mode is cleanly isolated and doesn't leak into Deep Dive views inappropriately.

Likely files:
- `src/lib/store.tsx`
- `src/lib/demo-data.ts`

Risk:
Medium

Can run concurrently:
Yes, after toggle PR lands.

## Recommended Close / Recreate Candidates

- **Candidate 1:** Any existing PRs related to Daily View or Deep Dive toggling (e.g., older scaffolding PRs if they exist). They should be closed in favor of Codex's upcoming PR.
- **Candidate 2:** Any PR modifying the Settings UI layout to add functional inputs for the currently stubbed "Coming later" sections. These should be re-evaluated after the layout primitives settle.

## Validation Performed

- Checked `git status --short`.
- Ran `bun install` and `bun run build`.
- Attempted `npx tsc --noEmit` (failed due to env/tooling, documented).
- Ran targeted Playwright tests: `app-pr-gate-smoke.spec.ts`, `navigation-smoke.spec.ts`, `data-propagation-smoke.spec.ts` (all passed).

## Confidence and Open Questions

Confidence is high regarding the identification of conflict zones for the upcoming Daily View/Deep Dive PR.
Open question: Will the new PR completely replace `layout-primitives.tsx`, or just refactor it? This determines the extent of cleanup needed in PR 1.
