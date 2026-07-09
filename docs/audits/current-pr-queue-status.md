# Current PR Queue Status Audit

## PR 159: Recheck Recovery Daily View layout
* **PR Type:** unknown (no-op)
* **Current changed files:** 0 files changed
* **File scope expected:** No
* **Current mergeability:** null
* **Current check status:** Unknown
* **Current unresolved review thread/blocker status:** None
* **Recommendation:** close
* **Exact reason for the recommendation:** This PR has 0 changed files and overlaps with the active Recovery area work.
* **Suggested next action:** Close this as a no-op duplicate PR. Active Recovery runtime work should continue through PR #129 instead.

## PR 158: Restore CodeQL workflow
* **PR Type:** workflow-only
* **Current changed files:**
  * `.github/workflows/codeql.yml`
* **File scope expected:** Yes
* **Current mergeability:** true (state: unstable)
* **Current check status:** Failing (`Analyze: failure`)
* **Current unresolved review thread/blocker status:** None noted (implicitly blocked by failing checks).
* **Recommendation:** hold/recheck
* **Exact reason for the recommendation:** The CI checks (`Analyze`) are currently failing and need to be fixed before merge.
* **Suggested next action:** Fix the workflow configuration to ensure CodeQL checks pass.

## PR 148: Rebuild Progress/Stats Daily View layout cleanly
* **PR Type:** mixed/unsafe
* **Current changed files:**
  * `src/components/app/views/progress.tsx`
  * `tests/e2e/helpers/fitcore-test-state.ts`
  * 27 various `.spec.ts` files across the E2E suite
* **File scope expected:** No. Modifies many unrelated tests rather than just Progress view and tests.
* **Current mergeability:** null (state: unknown)
* **Current check status:** Failing (`test: failure`)
* **Current unresolved review thread/blocker status:** COMMENTED (Unresolved blockers).
* **Recommendation:** send back for fix (or close/recreate)
* **Exact reason for the recommendation:** The file scope is completely unexpected, touching dozens of unrelated test files. It has failing checks and unresolved blockers.
* **Suggested next action:** Re-scope the PR to only include changes related to the Progress view and its specific tests.

## PR 147: Add active workout lifecycle smoke coverage
* **PR Type:** tests-only
* **Current changed files:**
  * `tests/e2e/active-workout-lifecycle-smoke.spec.ts`
* **File scope expected:** Yes
* **Current mergeability:** true (state: unstable)
* **Current check status:** Passing/Pending (`test: null`)
* **Current unresolved review thread/blocker status:** None
* **Recommendation:** merge candidate
* **Exact reason for the recommendation:** Clean file scope, isolated tests-only PR with no blockers.
* **Suggested next action:** Verify tests pass and merge.

## PR 146: Add corrupt localStorage boot-safety smoke coverage
* **PR Type:** mixed/unsafe
* **Current changed files:**
  * `.github/workflows/codeql.yml`
  * `tests/e2e/corrupt-localstorage-boot-safety-smoke.spec.ts`
  * `tests/e2e/settings-hub-render-smoke.spec.ts`
* **File scope expected:** No. A tests-only PR should not modify workflow files.
* **Current mergeability:** true (state: unstable)
* **Current check status:** Passing/Pending (`test: null`)
* **Current unresolved review thread/blocker status:** COMMENTED (Unresolved blockers).
* **Recommendation:** send back for fix
* **Exact reason for the recommendation:** Unresolved blockers and unexpected file scope (modifies workflow file).
* **Suggested next action:** Revert changes to `.github/workflows/codeql.yml` and resolve blockers.

## PR 129: Rebuild Recovery Daily View layout
* **PR Type:** runtime UI
* **Current changed files:**
  * `src/components/app/views/recovery.tsx`
* **File scope expected:** Yes
* **Current mergeability:** null (state: unknown)
* **Current check status:** Failing (`test: failure`, `Analyze JavaScript/TypeScript: failure`)
* **Current unresolved review thread/blocker status:** COMMENTED (Unresolved blockers).
* **Recommendation:** hold/recheck, wait for manual UI review
* **Exact reason for the recommendation:** Runtime UI PR requires manual UI review. Currently has failing checks and unresolved blockers.
* **Suggested next action:** Fix failing checks, resolve comments, and perform manual UI review.

---

## Final Section

### Recommended merge/check order
1. **PR 147** (Tests-only, clean scope)
2. **PR 158** (Workflow fix, once checks pass)
3. **PR 146** (Once workflow files are reverted and blockers resolved)
4. **PR 129** (Once checks pass, blockers resolved, and manual UI review completed)
5. **PR 148** (Needs major file-scope cleanup or recreation)

### PRs that must not merge yet
* PR 159 (0 files changed, duplicate work - should be closed)
* PR 158 (Failing checks)
* PR 148 (Unexpected file scope, failing checks, unresolved blockers, no manual UI review)
* PR 146 (Unexpected file scope, unresolved blockers)
* PR 129 (Failing checks, unresolved blockers, no manual UI review)

### PRs requiring manual UI review
* PR 148
* PR 129

### PRs requiring file-scope cleanup
* PR 148 (Touches unrelated tests)
* PR 146 (Touches workflow file)

### PRs blocked by workflow/CodeQL cleanup
* PR 158

### Areas where no new work should be started yet
* Recovery Daily View layout (Blocked by PR 129. Do not use PR 159)
* Progress/Stats Daily View layout (Blocked by PR 148)
* Daily View / Deep Dive toggle implementation (Per policy, do not recommend yet)
* Broad state/schema/storage work (Per policy, do not recommend yet)
* Nutrition changes (Per policy, do not recommend yet)
* Popup standardization (Per policy, do not recommend yet)
