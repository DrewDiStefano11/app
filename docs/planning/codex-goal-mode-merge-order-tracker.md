# Codex Goal Mode Merge Order Tracker

This tracker is used to manage the review and merge sequence for the 8 Codex Goal Mode tasks.

## Merge Rules
1. **Task 1 First:** Task 1 must be merged first if later PRs depend on its foundational changes (e.g., the `.validator()` SSR crash fix).
2. **Sequential Stacking:** Stacked PRs must be merged and/or rebased in strict order. Merge the base PR into `main`, then rebase the dependent PR onto `main` and merge.
3. **No Blocked Merges:** PRs marked `[BLOCKED]` must not be merged under any circumstances until the block is resolved.
4. **Runtime Requires Playwright:** Any PR modifying runtime code (`src/**`) requires a passing Playwright run (ignoring known flaky tests like the data-integrity Recover button timeout).
5. **Docs-Only Verification:** Tests-only or docs-only PRs require manual verification of the "Files changed" tab to ensure restricted runtime files were not touched.

## Safety Flags
- 🛑 **Do not merge yet:** Indicates a PR that is either blocked, failing CI, or waiting on a dependency.
- ♻️ **Safe to close stale PRs after replacement:** Indicates that merging this task will render specific old PRs obsolete, allowing them to be safely closed.

## Merge Tracker Table

| Task | Branch | PR Number | Base Branch | Stacked On | Files Changed | CI Result | Playwright Result | Merge Recommendation | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Task 1** | | | | | | | | | 🛑 Do not merge yet |
| **Task 2** | | | | | | | | | 🛑 Do not merge yet |
| **Task 3** | | | | | | | | | 🛑 Do not merge yet |
| **Task 4** | | | | | | | | | 🛑 Do not merge yet |
| **Task 5** | | | | | | | | | 🛑 Do not merge yet |
| **Task 6** | | | | | | | | | 🛑 Do not merge yet |
| **Task 7** | | | | | | | | | 🛑 Do not merge yet |
| **Task 8** | | | | | | | | | 🛑 Do not merge yet |

*(Update this table as PRs are created and CI runs complete)*
