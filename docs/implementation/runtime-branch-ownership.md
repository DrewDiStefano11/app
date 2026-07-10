# Runtime Branch Ownership

**Note: This document represents a point-in-time implementation snapshot.** The ownership listed below is temporary and specific to the current active branches and concurrent implementation phase.

## Ownership Matrix

| Lane / Task                      | Branch or PR      | Primary Source Ownership                                              | Test Ownership               | Prohibited Files                                                                  | Known Conflict Hotspots                                                                           | Merge Prerequisites                                                                                       | Status Notes       |
| -------------------------------- | ----------------- | --------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ |
| **Fuel/Nutrition**               | #197              | Fuel/Nutrition view                                                   | Focused Fuel/Nutrition tests | `src/lib/store`, `Analytics`                                                      | Custom Log Food/Meal save flow, meal persistence, BottomSheet close, pointer interception         | Fixes go directly to #197; no force clicks/waits/fake persistence                                         | Active             |
| **Training**                     | #201              | Training view                                                         | Focused Training tests       | `src/lib/store`, `Analytics`                                                      | Programs & templates, Cardio & sports sheet runtime behavior, visible `.sheet-root`               | Fixes go directly to #201; no weakened selectors; preserve active workout; tabs exact                     | Active             |
| **Superseded Training PR**       | #199              | N/A                                                                   | N/A                          | Any continuation of implementation                                                | N/A                                                                                               | Keep open only until #201 is green and reviewed                                                           | Superseded by #201 |
| **Codex Analytics Engine**       | Analytics tasks   | Centralized analytics helpers, task-specific analytics files          | Analytics unit tests         | UI redesign, active Fuel or Training view changes, shared store (unless approved) | Trend quality, confidence, source metadata                                                        | No fake data/correlations/insights; neutral correlation language; causation warning; stop after each task | Active             |
| **Recovery Runtime Lane**        | Recovery PRs      | Recovery view                                                         | Focused Recovery tests       | Analytics engine, Fuel, Training, Progress, Settings, shared store                | Check-in persistence, sleep logging, body-status persistence, BottomSheet lifecycle               | Must not modify shared store unless separately approved                                                   | Active             |
| **Progress Runtime Lane**        | Progress PRs      | Progress view                                                         | Focused Progress tests       | Analytics engine, other views, shared store                                       | Weigh-in validation, bodyweight persistence, goal propagation, missing-trend truthfulness         | Must not modify shared store unless separately approved                                                   | Active             |
| **Settings Runtime Lane**        | Settings PRs      | Settings view                                                         | Focused Settings tests       | App shell, Home, Jarvis files, other views, store serialization                   | Profile persistence, import failure safety, export behavior, reset confirmation, section behavior | Must not modify shared store unless separately approved                                                   | Active             |
| **App-shell Contract-Test Lane** | Contract test PRs | Newly created app-shell/Home/accessibility Playwright test files only | Same                         | Production source changes, edits to existing active-view tests                    | N/A                                                                                               | Source defects are reported, not fixed in the PR                                                          | Active             |
| **Parked PRs**                   | #34, #14, #2      | None                                                                  | None                         | Any edits                                                                         | N/A                                                                                               | Remain untouched unless explicitly approved                                                               | Parked             |

## Shared files requiring explicit coordination

For every shared area listed below, an agent must stop and request coordination rather than silently expanding scope:

- `src/lib/store`
- shared types
- shared UI primitives
- shared BottomSheet/ConfirmDialog implementation
- app shell and bottom navigation
- routing
- schemas
- migrations
- analytics exports
- package files
- lockfiles
- workflows
- global styling

## Conflict decision rules

1. Preserve the branch with the narrowest legitimate ownership.
2. Do not resolve a conflict by copying both implementations.
3. Do not let docs or tests overwrite current runtime behavior.
4. Re-run affected tests after any manual conflict resolution.
5. Inspect the actual diff instead of trusting commit messages.
6. Do not accept test workarounds as conflict resolutions.
7. If both branches legitimately need the same file, sequence them rather than merging concurrently.

## Forbidden concurrent expansions

Do not undertake any of the following expansions without explicit coordination:

- broad store refactors
- shared sheet refactors
- global navigation refactors
- design-system refactors
- schema changes
- migration work
- dependency upgrades
- workflow changes
- broad test utility rewrites
