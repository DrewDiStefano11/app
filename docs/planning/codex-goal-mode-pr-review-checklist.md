# Codex Goal Mode PR Review Checklist

This document provides a checklist for reviewing and merging the Codex Goal Mode sequence PRs to ensure stability, proper stacking, and adherence to file-modification boundaries.

## 1. Confirm Separate PR per Task
- [ ] Check the active pull requests list.
- [ ] Verify that each Codex task (Task 1 through Task 8) has its own distinct PR.
- [ ] Reject any PR that bundles multiple tasks into a single branch.

## 2. Check PR Stacking Correctness
- [ ] If a task depends on a previous task, verify that the PR base branch is set to the branch of the preceding task, rather than `main`.
- [ ] Check the commit history of the stacked PR to ensure it includes the commits from its base branch and adds only the new task's commits.

## 3. Identify Incorrect PR Bases
- [ ] Task 1 should be based on `main`.
- [ ] If a subsequent task does not depend on the previous task, it can be based on `main`. If it does depend on it, it must be based on the previous task's branch.
- [ ] If a PR is targeting `main` but contains code from another unmerged task, the base is incorrect.

## 4. Inspect Changed Files
- [ ] Review the "Files changed" tab for each PR.
- [ ] Ensure the modified files strictly align with the documented scope for that specific task.
- [ ] Verify there are no unrelated formatting changes or accidental inclusions.

## 5. Verify Forbidden Files
- [ ] Confirm that no changes were made to the following restricted areas unless explicitly authorized for that specific task:
    - `src/**` (for docs-only tasks)
    - `tests/**` (for docs-only tasks)
    - Package files (`package.json`, `package-lock.json`, etc.)
    - Lockfiles (`bun.lockb`, etc.)
    - Workflows (`.github/workflows/**`)
    - Schemas/Migrations
    - Product Bible files
    - `docs/audits/empty-error-state-coverage-audit.md`
- [ ] Ensure parked PRs (#34, #14, and #2) were not touched or overwritten.

## 6. Handling `[BLOCKED]` PRs
- [ ] Do **not** merge any PR with `[BLOCKED]` in the title or description.
- [ ] Resolve the blocking issue (e.g., waiting for a previous PR to merge, test failure, clarification needed) before removing the block and proceeding.

## 7. Decide Merge Order
- [ ] Use the `codex-goal-mode-merge-order-tracker.md` to dictate the merge order.
- [ ] Merge foundational tasks (like Task 1) first.
- [ ] For stacked PRs, merge the base PR into `main` first, then rebase the dependent PR onto `main` and merge it.

## 8. Verify Playwright Failures Are Not Hidden
- [ ] Review the CI output for Playwright tests on runtime PRs.
- [ ] Ensure no tests were skipped (`test.skip`) or commented out to bypass failures.
- [ ] Note: The known flaky timeout in `tests/e2e/data-integrity.spec.ts` (Recover button click) should be ignored if it's the only failure, as documented.

## 9. Verify Task 1 Fixed `.validator()` SSR Crash
- [ ] For Task 1 (or the relevant task fixing the crash): Verify that `createServerFn` usage with `.validator()` was changed to `.inputValidator(z.object({...}))`.
- [ ] Confirm that SSR no longer crashes and the application loads correctly without TypeErrors.

## 10. Verify Runtime PRs Preserve Existing Functionality
- [ ] Run the `post-codex-manual-qa-script.md` for any PR that modifies runtime code.
- [ ] Ensure core flows (logging, navigation, dashboard rendering) still function as expected.
- [ ] Confirm no existing features were broken by the new changes.
