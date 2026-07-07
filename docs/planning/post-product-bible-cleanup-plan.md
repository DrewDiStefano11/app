# Post-Product-Bible Cleanup Plan

## Purpose

This document is a staged cleanup plan based on merged audits and Product Bible direction. This is not an implementation plan for new features. The goal is to provide a safe, staged strategy for what should happen after the Product Bible books are complete, focusing on cleanup without introducing giant refactors, mixed feature PRs, or accidental deletion of internally used code.

## Source Documents Reviewed

The following source documents were reviewed:
- `docs/audits/dead-files-unused-code-audit.md`
- `docs/audits/build-dependency-deployment-audit.md`
- `docs/audits/bootstrap-layer-audit.md`
- `docs/audits/current-code-structure-audit.md`
- `docs/audits/current-testing-smoke-check-audit.md`
- `docs/product-bible/README.md`
- `docs/product-bible/BOOK_STRUCTURE.md`
- `docs/product-bible/book-01-vision-product-strategy-and-documentation-foundation/README.md`
- `docs/product-bible/book-02-system-architecture/README.md`
- `docs/product-bible/book-03-training-system/README.md`
- `docs/product-bible/book-04-nutrition-system/README.md`
- `docs/product-bible/book-05-ux-ui-and-user-experience/README.md`

Documents not present (and therefore not reviewed):
- `docs/audits/current-data-flow-audit.md`
- Product Bible Book 6+

## Executive Summary

- docs/audits have identified structural, data-flow, bootstrap, dependency, and testing concerns.
- the app works but has hotspot files.
- cleanup should happen in stages.
- Product Bible completion should come before major implementation/refactor work.

## Cleanup Principles

- one concern per PR.
- docs-only tasks stay docs-only.
- do not mix cleanup with feature work.
- do not delete code based only on unused export analysis.
- do not edit major hotspot files in parallel.
- tests before risky behavior changes.
- preserve user data and local persistence.
- avoid breaking AI/Jarvis flows.
- maintain mobile-first UX.

## Phase 0 — Finish Documentation Foundation

Before runtime cleanup starts, the documentation foundation must be completed:
- Product Bible remaining books.
- remaining audits.
- unresolved audit corrections.
- planning docs.
- merge/close stale docs PRs.

Tasks safe now:
- Finishing remaining books one by one.
- Resolving pending docs PRs.

Tasks not safe now:
- Architectural or code cleanup.

Suggested PR titles:
- `Finish Book 6 documentation`
- `Merge pending test coverage planning docs`

## Phase 1 — Docs and Planning Cleanup

Docs-only cleanup tasks:
- consolidate audit findings.
- create implementation gap matrix.
- create state/view usage map if not already merged.
- create Product Bible-to-code alignment map.
- create testing coverage gap map.
- create agent task queue.

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

Why #34 or similar runtime UI PRs should be reviewed after docs/audits are stable: To ensure architectural alignment.
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

Any stronger CI workflow should not be merged while it is known to fail on baseline issues unless intentionally draft.

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

1. **Title:** `Add state and view usage map`
   - **Scope:** Docs-only.
   - **Allowed files:** `docs/planning/state-view-usage-map.md`
   - **Validation:** Visual review.
   - **Risk level:** Low
   - **Agent:** Jules

2. **Title:** `Add Product Bible implementation gap matrix`
   - **Scope:** Docs-only.
   - **Allowed files:** `docs/planning/implementation-gap-matrix.md`
   - **Validation:** Visual review.
   - **Risk level:** Low
   - **Agent:** Jules

3. **Title:** `Remove unnecessary exported API surface`
   - **Scope:** Mechanical cleanup.
   - **Allowed files:** Specific `src/lib/` files where only export keyword is removed.
   - **Validation:** Full build, lint, and test suite.
   - **Risk level:** Low
   - **Agent:** Jules

## PRs That Must Wait

Cleanup/implementation work that should wait:
- state overhaul: Needs thorough planning and tests first.
- feature directory restructure: Waiting for Book 6+ and clear migration plan.
- IndexedDB migration: Needs persistence test coverage first.
- dependency removals: Needs confirmed usage map.
- Jarvis tool rewrite: Extremely high risk, needs clear boundaries.
- CI hardening that would fail current baseline: Must fix baseline first.
- large UI overhaul: Needs complete UI Product Bible book.
- medical/safety behavior implementation: Needs explicit design and validation.

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
- one Product Bible Book PR at a time.
- do not run multiple PRs touching same hotspot file.
- squash merge preferred for small docs/planning PRs if that is repository convention.
- rebase/sync with main before review.
- do not merge while checks are failing or running.

## Open Questions

- final Book 6 decision.
- feature-sliced architecture timing.
- storage upgrade timing.
- AI memory categories.
- demo mode behavior.
- wearable sync ownership.
- testing gates.
- CI strictness.
