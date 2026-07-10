# Runtime Merge Sequence

This document provides a merge and rebase playbook. While a fixed order is not always correct and the actual order must be adjusted based on changed files, a recommended default sequence is provided based on file isolation and dependency.

## Recommended default sequence

1. merge fully green isolated test-only/docs-only PRs when they do not encode currently broken behavior
2. merge narrow runtime view PRs after latest-head GitHub checks and local visual QA
3. merge Codex analytics tasks according to their approval sequence
4. integrate analytics into views only in a later dedicated wave
5. close superseded PRs after replacement PRs are green and reviewed

## Before merging any PR

Require the following before proceeding with a merge:

- latest head SHA recorded
- mergeability checked
- changed files reviewed
- diff reviewed
- Playwright status checked
- CI checked
- CodeQL checked
- dependency review checked
- local visual QA performed where relevant
- test changes inspected for weakening
- unrelated files rejected
- base branch freshness checked

## Rebase or update-branch rules

Require a branch update when:

- its base predates merged changes in the same or adjacent files
- mergeability becomes false
- GitHub reports conflicts
- shared component behavior changed
- a contract test was merged that affects the PR
- analytics exports changed and the branch imports them

_Note: Do not require needless rebases for entirely isolated docs-only changes._

## Latest-head rule

**A prior green workflow run does not prove the latest head SHA is green.**

After every Jules or Codex update:

- record the new head SHA
- inspect workflows for that exact SHA
- disregard success claims tied to an older commit
- do not merge while required checks are missing, pending, cancelled, or failing

## Test-change review

Require inspection for:

- `force: true`
- broad `.first()`
- broad `.nth()`
- arbitrary waits
- skipped tests
- swallowed errors
- increased timeouts
- removed assertions
- existence-only assertions replacing visibility or behavior
- Escape/Enter workarounds

## Superseded PR procedure

For PR #199:

1. keep it open only until #201 is proven green and reviewed
2. do not merge #199
3. compare changed files before closing
4. ensure no unique required behavior was lost
5. close as superseded
6. reference #201 in the closing note

## Conflict-resolution procedure

1. stop both branches from modifying the conflicting file
2. identify canonical owner
3. determine whether the second change can wait
4. merge the canonical owner first
5. update the dependent branch
6. reapply only necessary changes
7. rerun focused and regression tests
8. inspect latest-head workflows
