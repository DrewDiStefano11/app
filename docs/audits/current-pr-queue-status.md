# Current PR Queue Status Audit

This is a point-in-time audit of the current open PR queue.

## Open PRs

### PR #164
- **Title:** Add baseline Playwright failure triage audit
- **File Scope:** `docs/audits/baseline-playwright-failure-triage.md`
- **Scope Status:** Clean (Docs-only)
- **Checks Status:** Pending (Check Runs indicate success, but commit status pending)
- **Review Blockers:** Absent
- **Recommended Action:** Merge

### PR #163
- **Title:** Rebuild Settings Hub layout cleanly
- **File Scope:** `src/components/app/views/settings.tsx`
- **Scope Status:** Clean (Runtime UI)
- **Checks Status:** Failing
- **Review Blockers:** Absent
- **Recommended Action:** Manual review (Runtime UI PRs require manual visual review before merge)

### PR #161
- **Title:** Add workflow sanity audit
- **File Scope:** `docs/audits/workflow-sanity-check.md`
- **Scope Status:** Clean (Docs-only)
- **Checks Status:** Pending (Check Runs indicate success, but commit status pending)
- **Review Blockers:** Absent
- **Recommended Action:** Merge

### PR #160
- **Title:** Add current PR queue status audit
- **File Scope:** `docs/audits/current-pr-queue-status.md`
- **Scope Status:** Clean (Docs-only)
- **Checks Status:** Pending (Check Runs indicate success, but commit status pending)
- **Review Blockers:** Absent
- **Recommended Action:** Close / Recreate (Superseded by this audit)

### PR #158
- **Title:** Restore CodeQL workflow
- **File Scope:** `.github/workflows/codeql.yml`
- **Scope Status:** Clean (Workflow)
- **Checks Status:** Pending (Check Runs indicate success, but commit status pending)
- **Review Blockers:** Absent
- **Recommended Action:** Hold

### PR #148
- **Title:** Rebuild Progress/Stats Daily View layout cleanly
- **File Scope:** 28 files (Runtime UI and numerous Tests)
- **Scope Status:** Dirty (Broad scope)
- **Checks Status:** Failing
- **Review Blockers:** Absent
- **Recommended Action:** Hold (Not mergeable)

### PR #146
- **Title:** Add corrupt localStorage boot-safety smoke coverage
- **File Scope:** `.github/workflows/codeql.yml`, `tests/e2e/corrupt-localstorage-boot-safety-smoke.spec.ts`, `tests/e2e/settings-hub-render-smoke.spec.ts`
- **Scope Status:** Dirty (Tests and Workflow mixed)
- **Checks Status:** Pending (Check Runs indicate success, but commit status pending)
- **Review Blockers:** Absent
- **Recommended Action:** Hold (Not mergeable)

### PR #129
- **Title:** Rebuild Recovery Daily View layout
- **File Scope:** `src/components/app/views/recovery.tsx`
- **Scope Status:** Clean (Runtime UI)
- **Checks Status:** Failing
- **Review Blockers:** Absent
- **Recommended Action:** Manual review / Hold

## Current Strategy
- Do not start Daily View / Deep Dive toggle implementation.
- Do not start Nutrition runtime work.
- Do not merge dirty PRs.
- Do not merge runtime UI PRs without manual review.
- Do not treat stale closed PRs as active blockers.
- Do not let old no-op PRs remain in the merge queue.
