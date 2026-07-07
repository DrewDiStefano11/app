# Post-Bible Agent Task Queue

This queue organizes future AI agent tasks into safe, non-conflicting groups. It assumes the foundational planning documents and audits (including Product Bible Books 1-10 and the Data Propagation map) have already been merged into `main`.

Agents should pull from this queue based on priority. Do not pull a task if its underlying architectural dependencies are not yet stable.

## Already Completed Planning Inputs

The following foundational tasks are complete and merged into `main`. They should be used as source materials:
- **Product Bible Books 1-5** (Core Systems)
- **Product Bible Books 7 through 10** (Including Book 10 for Testing/QA guidance)
- **State and View Usage Map** (`docs/planning/state-view-usage-map.md`)
- **Data Propagation and No-Wasted-Data Map** (`docs/planning/data-propagation-and-no-wasted-data-map.md`)
- All preliminary system audits

## Safe Agent Task Queue

Tasks within a single group generally touch similar files. Do not assign multiple agents to tasks within the same group simultaneously unless the file bounds are strictly separated.

### Task Group A — Audits and Missing Documentation

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
  - **Output expected:** Coverage map using Book 10 principles
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
  - **Output expected:** Test plan conforming to Book 10
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
*(Future tasks to be fully detailed once docs are complete, relying heavily on the Data Propagation Map)*
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

- `Add Product Bible implementation gap matrix`
- `Audit Jarvis tool ownership`
- `Add testing coverage gap map`
- `Remove unnecessary exported API surface`
- `Extract home dashboard presentational cards`
- `Add demo-mode safety test plan`
- `Audit service worker cache versioning`
- `Document feature-sliced architecture migration plan`

## Implementation Task Quality Standard

When assigning future implementation tasks to an agent, the prompt must meet this quality standard (informed by Book 10 Testing/QA policies). Each task must explicitly define:
- **Exact scope**: What is being done.
- **Files/systems expected to be touched**: Clear boundaries for the PR.
- **Files/systems forbidden to touch**: Specifically highlighting hotspot files to avoid.
- **Dependency assumptions**: What must be merged or stable beforehand.
- **User-facing behavior**: How the app should look and feel post-change.
- **Data persistence expectations**: How localStorage, IndexedDB, or state behaves.
- **AI/source/privacy expectations**: Where relevant (e.g. data provenance badges).
- **Validation commands**: Exact commands to run (tests, linting).
- **Rollback or safety notes**: Instructions on what to do if tests fail (don't break baseline).
- **PR creation requirement**: Reminders to limit scope to the current task.
- **Final response requirements**: Format of the response upon completion.

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

## Current Do-Not-Touch List (Runtime Hold List)

Do not merge or implement changes in these areas until their prerequisite foundations are entirely clear:
- PR #34 Popup Positioning
- PR #14 CI validation workflow
- PR #2 Jarvis voice mode
- Any active workout runtime rebuild
- AI logging runtime changes
- Data model/schema changes
- Graph/dashboard runtime changes
- Privacy/settings runtime changes
- Service worker changes
- Dependency cleanup
- Package/lockfile changes
- Broad architecture restructure
