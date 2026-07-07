# Post-Product Bible Cleanup and Agent Task Plan

**Status:** Draft / Active Planning
**Target:** Safe coordination of agents across architecture, UI, and docs.

## The Goal
This document outlines a phased plan to clean up technical debt, resolve audit findings, and stabilize the repository **after** the primary documentation and planning phase is completed. The goal is to provide a safe sequence of tasks that prevents agents from stepping on each other, causing merge conflicts, or making architectural decisions before the foundation is stable.

## Current State Summary
The foundational planning, audit, and documentation wave is now completely finished and merged into `main`. The repository now contains:
- **Product Bible Books 1-10** (Note: Book 6 remains a Reserved Future Domain and is handled separately).
- **Book 10 (Testing, QA, and Platform Engineering)** is available to guide all release gates, validation, and agent coordination.
- **Data Propagation and No-Wasted-Data Map** (`docs/planning/data-propagation-and-no-wasted-data-map.md`) is available to guide data flow, schema usage, and UI state consistency.
- Extensive audits covering architecture, caching, testing, UI behavior, AI provenance, and state usage.

**Stop docs-only expansion:** Do not keep creating more docs unless a runtime PR discovers a specific missing planning input. Future agent work must transition from exploratory planning to targeted, safe runtime execution, provided the boundaries below are respected.

## Implementation-Start Boundary
**First Implementation Gate:** Before starting each runtime wave, future agents should run a small code-scope audit or inspect exact file ownership. Do not run runtime tasks in parallel unless file scopes are proven not to overlap.

## Safe Agent Concurrency Plan

To safely coordinate Jules/Codex tasks, follow these strict concurrency limits:

- **Docs-only new-file tasks:** Can run high concurrency.
- **Runtime implementation:** Should run at low concurrency.
- **Shared app state/data work:** Run 1-2 tasks max.
- **Active workout runtime:** Run 1-2 tasks max.
- **AI/Jarvis runtime:** Run 1-2 tasks max.
- **Schema/data model, package/lockfile, CI/workflow work:** Run one at a time.

## Merge and Parking Guidance for Open PRs
The following is the recommended merge order and strategy after PR #49 (this planning document) is merged:

1. **Docs-only audit/planning PRs** should merge first.
2. **Safe Mechanical Cleanup PRs** (e.g., fixing imports) should follow.
3. **Runtime UI polish PRs** should be rebased after docs/planning merge and carefully reviewed.
4. **Large AI/Jarvis feature PRs** should remain parked until data foundation and permission/source-explainability planning are implemented and stable.

### Explicit Runtime Hold List (Parked PRs & Areas)
The following PRs and conceptual areas must remain strictly **parked** (do not merge or build upon them) until specific foundational cleanup phases are completed:

- **PR #34 Standardize Popup Positioning & Visibility** remains parked.
- **PR #14 Add CI validation workflow** remains parked/draft.
- **PR #2 Add ChatGPT-style Jarvis voice conversation mode** remains parked/draft.
- **Any active workout runtime rebuild**
- **AI logging runtime changes**
- **Data model/schema changes**
- **Graph/dashboard runtime changes**
- **Privacy/settings runtime changes**
- **Service worker changes**
- **Dependency cleanup**
- **Package/lockfile changes**
- **Broad architecture restructure**

## Recommended First Runtime Implementation Sequence

### Wave 1: Core logging popups
- Log meal popup
- Check-in popup
- Weigh-in popup

### Wave 2: Data propagation foundation
- Dashboard propagation
- Graph propagation
- Source/confidence labels
- Correction/deletion propagation

### Wave 3: Typed AI/Jarvis logging safety
- Confirmation before save
- Source explanation
- Correction/deletion
- Duplicate prevention

### Wave 4: Active workout implementation
- Expandable exercise cards
- Set/exercise flags
- Previous performance
- Finish summary and notes
- Save template
- Plate calculator and safety checks

### Wave 5: Graph/popup/UI polish
- popup/sheet consistency.
- bottom nav safe areas.
- graph popup behavior.

### Wave 6: Privacy/settings/deletion controls
- user controls
- privacy logic

### Wave 7: Demo/test account safety
- state write separation

### Wave 8: QA/CI hardening
- Playwright coverage
- validation workflow

## High-Risk Files and Conflict Zones

| File/Path | Why Risky | Related Audit Finding | Recommended Handling | Parallel Execution? |
|-----------|-----------|-----------------------|----------------------|---------------------|
| `src/lib/store.tsx` | Central state management, touches everything. | Current Code Structure | Refactor slowly, isolate changes. | No |
| `src/lib/fitcore-data.ts` | Foundational data types/logic. | Current Code Structure | Incremental extraction, add type safety. | No |
| `src/lib/daily-decision.ts` | Centralizes decision logic. | Current Code Structure | Extract to feature logic carefully. | No |
| `src/lib/ai.functions.ts` | Core AI boundary. | Current Code Structure | Boundary isolation. | No |
| `src/lib/jarvis/tools.ts` | Cross-domain hotspot, centralizes actions. | Code Structure | Very high risk; do not edit with other PRs. | No |
| `src/components/app/active-workout.tsx` | Complex state, UI mix. | Code Structure | Extract logic, componentize. | No |
| `src/components/app/views/home.tsx` | Key user entry point, heavy rendering. | Code Structure | Extract presentational parts. | No |
| `src/components/app/views/training.tsx` | Domain specific complex view. | Code Structure | Extract presentational parts. | No |
| `src/components/app/views/nutrition.tsx` | Domain specific complex view. | Code Structure | Extract presentational parts. | No |
| `src/components/app/views/progress.tsx` | Domain specific complex view. | Code Structure | Extract presentational parts. | No |
| `src/components/app/views/recovery.tsx` | Domain specific complex view. | Code Structure | Extract presentational parts. | No |
| `src/components/app/jarvis/jarvis-panel.tsx` | AI interaction view. | Code Structure | Careful extractions. | No |
| `public/sw.js` | Service worker cache behaviour. | Build/Dependency/Deployment | Audit and verify caching strategy. | No |
| `package.json` / lockfiles | Dependencies effect entire app. | Build/Dependency/Deployment | Verify dependency usage first. | No |



## Validation Standards

- docs-only PR: Verify with visual review.
- safe mechanical cleanup PR: Build, lint, automated test suite pass.
- UI PR: Playwright tests, manual mobile smoke checks across viewports.
- data/persistence PR: Local storage migration tests, load mock data.
- AI/Jarvis PR: Unit tests for logic flows, E2E for UI, manual verification.
- dependency/build PR: Build output size check, full test run.
- service worker/cache PR: Deployment smoke test, cache invalidation check.

## Merge Strategy

- merge docs-only audits first.
- do not run multiple PRs touching same hotspot file.
- squash merge preferred for small docs/planning PRs if that is repository convention.
- rebase/sync with main before review.
- do not merge while checks are failing or running.

## Accuracy Verification Table

| Area | Current status | Source checked | Next action |
| :--- | :--- | :--- | :--- |
| Product Bible Books 1-5 | Complete and merged | Repo main | Use as specification foundation |
| Book 6 reserved/special handling | Reserved Future Domain | Repo main | Maintain separate handling; do not populate |
| Product Bible Books 7 through 10 | Complete and merged | Repo main | Use as specification foundation |
| Book 10 testing/QA/platform guidance | Complete and merged | `docs/product-bible/book-10-testing-qa-and-platform-engineering/` | Enforce test/QA gates |
| Data propagation/no-wasted-data map | Complete and merged | `docs/planning/data-propagation-and-no-wasted-data-map.md` | Guide data flow implementation |
| PR #49 planning docs | Updated | This PR branch | Merge to establish task bounds |
| Parked runtime PRs | On hold | PR list | Do not merge until foundations stable |
| Remaining docs-only planning tasks | Queued | `docs/planning/post-bible-agent-task-queue.md` | Execute one by one |
| Runtime implementation start boundary | Active | This document | Halt new logic until planning done |
