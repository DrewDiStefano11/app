# Post-Bible Agent Task Queue

## Purpose

This document is a task queue for future agent work after Product Bible books and audits are stable. It translates the cleanup plan into specific, executable Jules/Codex tasks.

## How To Use This Queue

- pick one task at a time unless marked parallel-safe.
- create one PR per task.
- respect file scopes.
- do not mix docs/code/features.
- start from latest main.
- stop if conflicts or unexpected file changes occur.

## Agent Rules

- Jules is good for docs-only audits, mechanical cleanup, small UI follow-through, and structured PRs.
- Codex is good for review, code reasoning, targeted implementation, and complex validation.
- Do not have two agents edit the same hotspot files at once.
- Do not let agents invent Product Bible structure.
- Do not let agents implement new features from audit docs alone.

## Current Safe Parallel Work

- docs-only planning files.
- separate audit reports that write different files.
- Product Bible Book work only one at a time unless indexes are not touched.
- state/view usage map separate from Product Bible work.
- test coverage planning docs.

## Do Not Run In Parallel

- two PRs editing `src/lib/store.tsx`
- two PRs editing `src/lib/fitcore-data.ts`
- two PRs editing `src/lib/jarvis/tools.ts`
- Book PRs that both edit Product Bible indexes.
- UI popup PR and active workout UI PR if both touch shared popup/sheet files.
- dependency cleanup and CI hardening at the same time.
- data persistence migration and AI logging changes at the same time.

## Recommended Task Sequence

### Task Group A — Finish Docs/Audits

- **Task name:** Finish current data-flow audit correction
  - **Agent recommendation:** Jules
  - **Type:** docs-only audit
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/audits/current-data-flow-audit.md`
  - **Files forbidden:** Source code
  - **Output expected:** Updated audit doc
  - **Validation required:** Visual review
  - **Suggested PR title:** `Update current data flow audit`
  - **Risk level:** Low

- **Task name:** Create state/view usage map
  - **Agent recommendation:** Jules
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/state-view-usage-map.md`
  - **Files forbidden:** Source code
  - **Output expected:** New map document
  - **Validation required:** Visual review
  - **Suggested PR title:** `Add state and view usage map`
  - **Risk level:** Low

- **Task name:** Create Product Bible implementation gap matrix
  - **Agent recommendation:** Jules
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/implementation-gap-matrix.md`
  - **Files forbidden:** Source code
  - **Output expected:** New matrix document
  - **Validation required:** Visual review
  - **Suggested PR title:** `Add Product Bible implementation gap matrix`
  - **Risk level:** Low

- **Task name:** Finish Books 7-10
  - **Agent recommendation:** Jules
  - **Type:** docs-only
  - **Safe to run in parallel:** no (one book at a time)
  - **Files allowed:** `docs/product-bible/book-07-*`
  - **Files forbidden:** Source code, other books
  - **Output expected:** New book files
  - **Validation required:** Visual review
  - **Suggested PR title:** `Add Product Bible Book 7`
  - **Risk level:** Low

### Task Group B — Planning and Alignment

- **Task name:** Audit Jarvis tool ownership
  - **Agent recommendation:** Codex
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/jarvis-tool-ownership.md`
  - **Files forbidden:** Source code
  - **Output expected:** Ownership map
  - **Validation required:** Visual review
  - **Suggested PR title:** `Audit Jarvis tool ownership`
  - **Risk level:** Low

- **Task name:** Add testing coverage gap map
  - **Agent recommendation:** Jules
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/testing-coverage-map.md`
  - **Files forbidden:** Source code
  - **Output expected:** Coverage map
  - **Validation required:** Visual review
  - **Suggested PR title:** `Add testing coverage gap map`
  - **Risk level:** Low

### Task Group C — Safe Mechanical Cleanup

- **Task name:** Remove unnecessary exported API surface
  - **Agent recommendation:** Jules
  - **Type:** mechanical cleanup
  - **Safe to run in parallel:** yes (if different files)
  - **Files allowed:** `src/lib/*.ts`
  - **Files forbidden:** UI components, tests
  - **Output expected:** Removed `export` keywords
  - **Validation required:** Build, test
  - **Suggested PR title:** `Remove unnecessary exported API surface`
  - **Risk level:** Low

- **Task name:** Audit service worker cache versioning
  - **Agent recommendation:** Codex
  - **Type:** code cleanup
  - **Safe to run in parallel:** no
  - **Files allowed:** `public/sw.js`, build configs
  - **Files forbidden:** UI components
  - **Output expected:** Cache updates
  - **Validation required:** Deployment tests
  - **Suggested PR title:** `Audit service worker cache versioning`
  - **Risk level:** Medium

- **Task name:** Extract home dashboard presentational cards
  - **Agent recommendation:** Jules
  - **Type:** UI
  - **Safe to run in parallel:** yes
  - **Files allowed:** `src/components/app/views/home.tsx`, new components
  - **Files forbidden:** Core state, Jarvis tools
  - **Output expected:** Split UI components
  - **Validation required:** E2E, mobile smoke checks
  - **Suggested PR title:** `Extract home dashboard presentational cards`
  - **Risk level:** Medium

### Task Group D — Testing Before Risky Work

- **Task name:** Add demo-mode safety test plan
  - **Agent recommendation:** Jules
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/demo-mode-tests.md`
  - **Files forbidden:** Source code
  - **Output expected:** Test plan
  - **Validation required:** Visual review
  - **Suggested PR title:** `Add demo-mode safety test plan`
  - **Risk level:** Low

- **Task name:** Document feature-sliced architecture migration plan
  - **Agent recommendation:** Codex
  - **Type:** docs-only
  - **Safe to run in parallel:** yes
  - **Files allowed:** `docs/planning/architecture-migration.md`
  - **Files forbidden:** Source code
  - **Output expected:** Migration plan
  - **Validation required:** Visual review
  - **Suggested PR title:** `Document feature-sliced architecture migration plan`
  - **Risk level:** Low

### Task Group E — Data and State Cleanup
*(Future tasks to be fully detailed once docs are complete)*
- state/view separation convention
- demo mode write guard planning
- provenance cleanup
- localStorage quota handling
- future IndexedDB migration planning

### Task Group F — AI/Jarvis Cleanup
*(Future tasks to be fully detailed once docs are complete)*
- Jarvis tool inventory
- tool handler ownership map
- confirmation/undo/audit path cleanup
- source/confidence explanation surfaces
- privacy and memory controls

### Task Group G — UI Cleanup
*(Future tasks to be fully detailed once docs are complete)*
- popup/sheet positioning PR review
- dashboard card popup consistency
- graph interaction behavior
- active workout card extraction
- mobile readability checks

### Task Group H — Architecture Cleanup
*(Future tasks to be fully detailed once docs are complete)*
- domain folder proposal
- feature-local hooks
- gradual extraction from hotspot files
- state module boundaries
- avoiding giant rewrites

## Suggested PR Titles

- `Add state and view usage map`
- `Add Product Bible implementation gap matrix`
- `Audit Jarvis tool ownership`
- `Add testing coverage gap map`
- `Remove unnecessary exported API surface`
- `Extract home dashboard presentational cards`
- `Add demo-mode safety test plan`
- `Audit service worker cache versioning`
- `Document feature-sliced architecture migration plan`

## Task Prompt Templates

### Docs-only audit template
- start from latest main
- one PR only
- strict file scope: only target docs file
- do not implement unrelated features
- validation commands: visual review, markdown lint if available
- PR summary requirements: declare docs-only, list file added/changed

### Safe mechanical cleanup template
- start from latest main
- one PR only
- strict file scope: isolate target files
- do not implement unrelated features
- validation commands: build, test
- PR summary requirements: describe mechanical change, provide before/after examples

### UI cleanup template
- start from latest main
- one PR only
- strict file scope: target UI components
- do not implement unrelated features
- validation commands: Playwright tests, mobile layout checks
- PR summary requirements: include screenshots if possible, explain UI change

### Data/persistence cleanup template
- start from latest main
- one PR only
- strict file scope: target state files
- do not implement unrelated features
- validation commands: migration tests, mock data loads
- PR summary requirements: describe state change, prove data loss is avoided

### AI/Jarvis cleanup template
- start from latest main
- one PR only
- strict file scope: target specific AI tool
- do not implement unrelated features
- validation commands: logic unit tests, tool E2E
- PR summary requirements: explain boundary logic changes, test cases covered

### Testing task template
- start from latest main
- one PR only
- strict file scope: target tests folder
- do not implement unrelated features
- validation commands: test execution
- PR summary requirements: describe scenarios covered

## Stop Conditions

Stop and report instead of opening a PR if:
- unexpected Product Bible structure
- missing required source docs
- conflicts in high-risk files
- source changes in docs-only task
- package/lockfile changes outside scope
- failing validation not caused by known baseline
- uncertainty about deleting code
- unclear ownership of feature behavior

## Review Checklist

For Drew before merging:
- Is this docs-only or code?
- Does the PR match the requested files?
- Did it touch Product Bible unexpectedly?
- Did it touch source unexpectedly?
- Are CI/Playwright green?
- Are comments from Codex/Jules addressed?
- Is it mergeable?
- Does it conflict with an active PR?
- Is the PR too large?
- Does it implement features before the Bible is complete?

## Current Do-Not-Touch List

- Do not merge large Jarvis voice feature PR yet.
- Do not merge draft CI validation workflow until baseline failures are resolved.
- Do not start major feature implementation until Product Bible remaining books and audit alignment are stable.
- Do not do dependency removals until tests and import validation are complete.
- Do not do storage migration until data model and persistence tests are planned.
- Do not do broad architecture restructure until there is a dedicated migration plan.
