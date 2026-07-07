# Post-Product Bible Cleanup and Agent Task Plan

**Status:** Draft / Active Planning
**Target:** Safe coordination of agents across architecture, UI, and docs.

## The Goal
This document outlines a phased plan to clean up technical debt, resolve audit findings, and stabilize the repository **after** the primary documentation and planning phase is completed. The goal is to provide a safe sequence of tasks that prevents agents from stepping on each other, causing merge conflicts, or making architectural decisions before the foundation is stable.

## Current State Summary
The foundational planning and documentation phase is now largely complete and merged into `main`. The repository now contains:
- **Product Bible Books 1-10** (Note: Book 6 remains a Reserved Future Domain and is handled separately).
- **Book 10 (Testing, QA, and Platform Engineering)** is available to guide all release gates, validation, and agent coordination.
- **Data Propagation and No-Wasted-Data Map** (`docs/planning/data-propagation-and-no-wasted-data-map.md`) is available to guide data flow, schema usage, and UI state consistency.
- Extensive audits covering architecture, caching, testing, UI behavior, AI provenance, and state usage.

Because these critical inputs are now present, future agent work can transition from exploratory planning to targeted, safe execution, provided the boundaries below are respected.

## Implementation-Start Boundary
**STOP:** Runtime implementation of new features must not begin until the required planning, audit, and dependency maps are reviewed, finalized, and merged.

Agents must prioritize docs-only audit/planning PRs before starting runtime feature PRs. Any PR introducing significant new features or logic before the completion of the baseline cleanup phases (listed below) is considered high risk and violates the implementation boundary.

## Safe 6-Agent Concurrency Plan

To safely run up to six Jules/Codex tasks at a time, follow these guidelines:

**Safe Examples:**
- Six docs-only tasks that create separate new files (e.g., test coverage map, state view map).
- One runtime cleanup task (e.g., fixing imports) plus several docs-only tasks.
- Separate feature areas **only after** the shared data foundation is completely stable.
- Testing/docs tasks in parallel with isolated UI polish tasks (e.g., fixing a specific popup's styling).

**Unsafe Examples (Do Not Do):**
- Multiple tasks editing the same state/data model files (`store.tsx`, `fitcore-data.ts`).
- Multiple tasks changing the active workout flow at the same time.
- AI logging work running while the core data schema is actively changing.
- Graph/dashboard work running before data propagation logic is stable.
- Large Jarvis/AI feature PRs merging before permission, audit, and data-source rules are stable.
- CI gate merging before known baseline TypeScript/lint/format issues are fixed.

## Merge and Parking Guidance for Open PRs
The following is the recommended merge order and strategy after PR #49 (this planning document) is merged:

1. **Docs-only audit/planning PRs** should merge first.
2. **Safe Mechanical Cleanup PRs** (e.g., fixing imports) should follow.
3. **Runtime UI polish PRs** should be rebased after docs/planning merge and carefully reviewed.
4. **Large AI/Jarvis feature PRs** should remain parked until data foundation and permission/source-explainability planning are implemented and stable.

### Explicit Runtime Hold List (Parked PRs & Areas)
The following PRs and conceptual areas must remain strictly **parked** (do not merge or build upon them) until specific foundational cleanup phases are completed:

- **PR #34 Popup Positioning** (Parked until UI standard audits are fully resolved)
- **PR #14 CI validation workflow** (Parked until baseline TypeScript/lint errors are fixed)
- **PR #2 Jarvis voice mode** (Parked until AI boundary/privacy rules are implemented)
- **Any active workout runtime rebuild**
- **AI logging runtime changes**
- **Data model/schema changes**
- **Graph/dashboard runtime changes**
- **Privacy/settings runtime changes**
- **Service worker changes**
- **Dependency cleanup**
- **Package/lockfile changes**
- **Broad architecture restructure**

## Phase 1 — Docs and Planning Cleanup

Docs-only cleanup tasks that should be addressed before code changes:
- consolidate audit findings.
- create implementation gap matrix.
- create Product Bible-to-code alignment map.
- create testing coverage gap map.

Why this phase is low risk: It only touches markdown files.
Tasks that can run in parallel: Planning files that do not touch the same areas.
Tasks that should wait: Code implementation tasks.

## Phase 2 — Safe Mechanical Cleanup

Small, low-risk code cleanup tasks that can happen after docs stabilize:
- remove clearly unused files only after confirming imports/build/tests.
- remove unnecessary `export` keywords before deleting internal helpers.
- standardize imports.
- split obvious presentational subcomponents where behavior does not change.
- clean production console/debug comments only where safe.
- avoid package removals until dependency usage is confirmed.

Validation needed: Full suite tests, build checks.
PR size guidance: Keep small, single purpose.
Rollback considerations: Easily reversible since it's mechanical.

## Phase 3 — Data and State Safety Work

Cleanup needed around:
- localStorage limits.
- state migrations.
- demo mode.
- state vs view separation.
- data provenance.
- AI-confirmed vs unconfirmed logs.
- graph/dashboard consistency.
- backup/export/import safety.

Tests needed before changes: Persistence, mock data load, and edge-case state tests.
High-risk files: `src/lib/store.tsx`, `src/lib/fitcore-data.ts`.
Why this should not run in parallel with large UI/AI work: Risk of data loss and complicated merge conflicts.

## Phase 4 — UI and Popup Stabilization

Cleanup around:
- popup/sheet consistency.
- bottom nav safe areas.
- graph popup behavior.
- dashboard card click behavior.
- mobile readability.
- active workout layout.
- quick action popups.

Why PR #34 or similar runtime UI PRs should be reviewed after docs/audits are stable: To ensure architectural alignment.
What manual mobile smoke checks should be required: Testing across standard mobile viewports (e.g., iphoneModern 390x844).

## Phase 5 — AI/Jarvis Boundary Cleanup

Cleanup around:
- `src/lib/ai.functions.ts`
- `src/lib/jarvis/tools.ts`
- AI tool handlers.
- confirmation/undo/audit paths.
- source/confidence display.
- privacy and memory boundaries.
- preventing AI from writing uncertain data without confirmation.

Why this should be split into small PRs: High complexity and significant product risk.
Which Product Bible books should guide it: Books covering architecture, UX, and specific domain systems.
Which tests/manual checks are needed: Unit tests for logic flows, E2E for UI, and manual verification of the confirmation loops.

## Phase 6 — Architecture / Feature Slicing

Larger structural cleanup:
- feature folders.
- domain-specific hooks.
- domain-specific state modules.
- extracting pure business logic.
- separating UI from domain logic.
- reducing hotspot file conflicts.

This should wait until Product Bible structure is stable and should be done gradually.

## Phase 7 — Testing and CI Hardening

- smoke test coverage.
- Playwright coverage.
- graph tests.
- persistence tests.
- demo mode tests.
- AI/Jarvis tool tests.
- mobile popup tests.
- CI validation improvements.

Any stronger CI workflow (like PR #14) should not be merged while it is known to fail on baseline issues unless intentionally draft.

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

## Safe First PRs

Safest early cleanup PRs after docs are complete:

1. **Title:** `Add Product Bible implementation gap matrix`
   - **Scope:** Docs-only.
   - **Allowed files:** `docs/planning/implementation-gap-matrix.md`
   - **Validation:** Visual review.
   - **Risk level:** Low
   - **Agent:** Jules

2. **Title:** `Remove unnecessary exported API surface`
   - **Scope:** Mechanical cleanup.
   - **Allowed files:** Specific `src/lib/` files where only export keyword is removed.
   - **Validation:** Full build, lint, and test suite.
   - **Risk level:** Low
   - **Agent:** Jules

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
