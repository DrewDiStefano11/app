# FitCore PR Review and Manual Testing Script

This script is to be used for reviewing Jules/Codex PRs before merging. Follow this checklist to ensure stability, prevent regressions, and verify that AI-generated PRs meet FitCore's quality standards.

## 1. Pre-merge PR review steps
- [ ] Read the PR title and description. Ensure they accurately describe the intended changes.
- [ ] Verify the PR strictly adheres to its requested scope. If it's a docs-only PR, ensure absolutely no code files were changed.
- [ ] Check if the PR follows FitCore's 8-Wave implementation sequence.
- [ ] Ensure that parked PRs (#34, #14, and #2) are NOT modified, reused, or referenced.

## 2. How to inspect changed files
- [ ] Review the "Files changed" tab.
- [ ] Ensure any newly added files are placed in the correct directories (e.g., `docs/planning/` for planning docs).
- [ ] Verify that there are no accidental formatting changes across unrelated files (e.g., running `prettier --write .` on the entire repo).
- [ ] Confirm no unrelated baseline errors were bundled into this feature PR.

## 3. How to check for file overlap with other active PRs
- [ ] Check open PRs to see if other active tasks are modifying the same source files.
- [ ] If overlaps exist, coordinate with the team to establish merge priority and prevent silent merge conflicts.
- [ ] Ensure compliance with the Agent Concurrency Rules: file scopes must not overlap during parallel runtime tasks.

## 4. How to handle Playwright failures
- [ ] If Playwright tests fail, inspect the CI logs.
- [ ] Determine if the failure is related to the current PR's changes or a pre-existing flaky test.
- [ ] Remember: Flaky tests cannot be hidden by broad skips. Passing tests do not replace manual QA for major UX/mobile flows.
- [ ] Check if the PR broke the `seedMinimalOnboardedState` and `gotoDashboard` onboarding bypass flow.

## 5. How to handle CI passing but Playwright failing
- [ ] This often indicates a UI discrepancy, hydration mismatch, or a timing issue not caught by standard unit tests or linters.
- [ ] Run the specific failing Playwright test locally using `bun run test:e2e`.
- [ ] Manually verify the UI flow in question (see Manual Test section below).
- [ ] Do NOT ignore TypeErrors like `createServerFn(...).validator is not a function` in `src/lib/ai.functions.ts`. This should be treated as a real server-function/API mismatch unless a separate approved baseline issue explicitly tracks it. CI or Playwright failures from that error should not be dismissed as flaky.

## 6. How to identify over-deletion of functionality
- [ ] Carefully review the diff for removed code blocks (`-` lines).
- [ ] Ensure that deleted code is either truly obsolete or properly replaced by new, functional logic.
- [ ] Verify that UI copy, empty states, or error handlers were not accidentally removed.
- [ ] Ensure the 'no-wasted-data' principle is upheld: data must still be available across all relevant dashboards.

## 7. How to verify PR body claims match the diff
- [ ] Cross-reference the PR description's claims (e.g., "Added 3 new tests", "Updated layout") with the actual diff.
- [ ] If the PR claims a bug is fixed, trace the logic in the diff to ensure it fundamentally addresses the issue, rather than masking it.
- [ ] Ensure any claimed UI changes strictly use existing FitCore visual language and shared layout primitives (`src/components/app/layout-primitives.tsx`).

## 8. Manual app smoke test steps
- [ ] Start the local development server: `npm run dev` or `bun run dev`.
- [ ] Bypass onboarding (Get Started -> Continue -> Enter FitCore).
- [ ] Verify the global layout renders correctly (Daily View / Deep Dive toggle, 5-tab bottom navigation, Floating AI Shell).
- [ ] Open and close at least one global popup or sheet to check for z-index or stacking issues.

## 9. Tab-by-tab test checklist
- [ ] **Today:** Verify Daily/Deep Dive toggle works. Check for Morning Check-In/Night Review forms if due.
- [ ] **Training:** Verify workout logic and UI. Ensure AI/Jarvis interaction risks are handled.
- [ ] **Nutrition:** Verify meal logging flow.
- [ ] **Recovery:** Verify recovery metrics and UI.
- [ ] **Insights:** Verify charts and aggregate data.
- [ ] **FitCore Hub (Top Right):** Verify auxiliary views (Profile, Settings, Medical, Wearables) open correctly.

## 10. Data persistence checks
- [ ] Make a minor change (e.g., log a dummy meal or toggle Daily View).
- [ ] Refresh the page.
- [ ] Verify the change persisted (FitCore relies on synchronous `localStorage` currently).
- [ ] Ensure demo mode data enforces strict write boundaries and does not pollute real user data.

## 11. Mobile layout checks
- [ ] Use browser developer tools to simulate a mobile viewport (e.g., iPhone 12/13).
- [ ] Verify the 5-tab bottom navigation remains strictly visible and usable.
- [ ] Ensure the Floating AI shell does not obstruct critical UI elements.
- [ ] Check that bottom sheets and popups fit within the mobile viewport without breaking layout.

## 12. When to close a PR and ask Jules for a clean replacement
- [ ] The PR modified strictly prohibited files (e.g., parked PRs, lockfiles on a docs-only task, unrelated source files).
- [ ] The PR introduced massive, unrelated formatting changes across the codebase.
- [ ] The PR claims to fix an issue but the diff clearly does not address the root cause, or over-deletes critical logic.
- [ ] The PR violates core architecture rules (e.g., using `dangerouslySetInnerHTML`, breaking the bottom navigation).

## 13. Safe merge order rules
- [ ] Merge docs-only and planning PRs first.
- [ ] Merge structural/schema/backend PRs before UI/frontend PRs that depend on them.
- [ ] Do not merge multiple runtime PRs that touch overlapping file scopes simultaneously.
- [ ] Wait for CI to complete entirely on the main branch before merging the next PR.
