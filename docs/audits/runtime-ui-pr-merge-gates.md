# FitCore Runtime UI PR Merge Gates

This document outlines the strict requirements and checks that must be passed before merging any Pull Request that modifies FitCore runtime UI or runtime logic. These gates ensure high quality, maintain stability, and reduce the risk of regressions.

## 1. Required File-Scope Check
- [ ] The PR modifies ONLY the files explicitly requested or allowed for the task.
- [ ] The PR does not accidentally bundle unrelated changes, formatting overhauls, or sweeping refactors outside the core task.
- [ ] No `package.json`, `.github/workflows/`, or root configuration files are modified unless explicitly approved.
- [ ] No test files are removed or modified to hide failures. Tests should only be updated if the intended behavior has legitimately changed.

## 2. Required Automated Checks
- [ ] All automated CI pipelines pass successfully (Playwright tests, build checks, linting).
- [ ] `bun run build` succeeds locally without warnings or errors.
- [ ] `bun run test:e2e` passes locally.
- [ ] No strict mode violations, hydration errors, or unhandled exceptions appear in the test logs or console output.

## 3. Required Codex/Jules Review-Thread Check
- [ ] The AI agent (Codex/Jules) has provided a summary of what was changed and verified.
- [ ] The agent's proposed plan was reviewed and approved before implementation.
- [ ] Any questions, ambiguities, or out-of-scope issues raised during the review thread have been explicitly resolved.
- [ ] If the agent encountered limitations, they are clearly documented and acceptable for the PR's scope.

## 4. Required Manual UI Review
- [ ] A human reviewer has completed the `docs/audits/manual-ui-review-checklist.md`.
- [ ] The reviewer has provided necessary screenshots/recordings proving the UI works as intended on Desktop and Mobile.
- [ ] The PR has been reviewed on an actual device or simulator, not just relying on code logic.

## 5. Reasons to Block Merge
- [ ] Failing tests or failing build pipeline.
- [ ] Unrelated files or out-of-scope logic changes are included.
- [ ] The PR introduces horizontal scrolling, unreadable text, or critical UI clipping on mobile.
- [ ] Missing empty states or error handling where required.
- [ ] No manual UI review screenshots or validation provided.

## 6. Reasons to Park/Close/Recreate a PR
- [ ] The PR fundamentally misunderstands the architecture (e.g., trying to use deep URL routing instead of the standard internal React state tab layout).
- [ ] The PR attempts to introduce major new dependencies or frameworks without approval.
- [ ] The PR conflicts heavily with the planned implementation waves (`docs/planning/implementation-start-handoff.md`).
- [ ] The PR has become overly bloated or tangled (e.g., trying to solve multiple large tickets at once). It is better to close and recreate smaller, focused PRs.

## 7. Special Notes for Recovery #129 and Progress #148
- [ ] **Recovery #129:** Ensure changes adhere strictly to the "Daily View" pattern (mobile-first, vertically scrollable summary pushing deeper interactions into bottom sheets). Beware of logic that might leak data across days.
- [ ] **Progress #148:** For Progress/Insights charts, smoke tests and code should focus on stable empty-states and safe fallback UI renders. Do not over-assert on exact graph math, bars, or styling which may be volatile. Avoid asserting exact ID/timestamp generated values.

## 8. Why Runtime UI PRs Should Not Be Merged Based Only on Passing CI
Passing CI tests (like Playwright smoke tests) prove that the app doesn't fatally crash and that specific core flows still exist. However, **automated tests do not verify visual aesthetics, UX fluidity, complex responsive layouts, or edge-case overflow behavior.** A button might be clickable by Playwright but visually invisible or misaligned to a human. Therefore, passing CI is a baseline requirement, but manual visual verification and scope-checking remain strictly mandatory before merging runtime UI PRs.
