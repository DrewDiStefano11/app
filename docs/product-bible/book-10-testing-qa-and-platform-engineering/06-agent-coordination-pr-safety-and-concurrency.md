# Agent Coordination, PR Safety and Concurrency

FitCore is built through the collaboration of multiple AI agents (e.g., Jules, Codex). To avoid catastrophic merge conflicts, broken state, and lost work, agents must follow strict coordination and concurrency guidelines.

## PR Safety Rules

When operating on FitCore, agents must adhere to the following:

- **One focused purpose per PR.**
- Docs-only and runtime changes should not be mixed unless explicitly requested by the user.
- Product Bible changes should not be mixed with feature implementation.
- Audits should not modify runtime code.
- Avoid touching unrelated files (even for formatting).
- Rebase/update from the latest `main` branch before finalizing a PR.
- Report merge conflicts clearly if they arise.
- Always include validation commands in the final response.
- Create PRs when instructed, rather than stopping at a local commit.

## Safe Concurrency Rules

Running multiple agents simultaneously is powerful but risky.

**Safe Concurrency:**
- Safe to run multiple docs-only tasks when they create separate files.
- Safe to run isolated audits in parallel.
- Safe to run docs planning tasks in parallel with non-overlapping audits.

**Unsafe Concurrency:**
- Unsafe to run multiple tasks editing the same Product Bible index file (e.g., `README.md` or `BOOK_STRUCTURE.md`).
- Unsafe to run multiple tasks changing the active workout flow at the same time.
- Unsafe to run graph/dashboard work before the underlying data propagation is stable.
- Unsafe to run AI logging work while the core data model is actively changing.
- Unsafe to merge large Jarvis/AI feature PRs before source, permission, and audit rules are stable.

## Merge-Order Guidance

To ensure foundation stability before complex feature building, work should be merged in this general order:

1. Product Bible and audit docs first.
2. Planning docs second.
3. Cleanup/stabilization third.
4. Data foundation before major features.
5. Training, nutrition, and recovery flows before advanced analytics.
6. AI source explainability after data routes are stable.
7. CI hardening after baseline issues are understood.

## PR Size and Reviewability Guidelines

Agent-generated PRs must be digestible by human reviewers:

- Prefer small, focused PRs.
- Avoid bundling unrelated UI, data, AI, and docs changes.
- Split large implementation work into: foundation, UI, data wiring, tests, and polish PRs.
- Large PRs should include stronger validation and clearer manual QA notes.
- Docs-only PRs should remain docs-only.
- Runtime PRs should clearly explain user-facing behavior and validation results.
- Risky AI/data/privacy changes should be structured so they are easier to revert if needed.

## Expectations for Final PR Responses

When an agent completes a task, the final response must include:

- The PR link.
- The branch name.
- The PR title.
- A list of files created.
- A list of files modified.
- The validation commands run (e.g., `git status`, `npm run build`).
- Confirmation of docs-only or runtime scope.
- Known limitations.

## Agent Handoff Standard

When an agent finishes a block of work, it must clearly define the state of the system for the next agent or human reviewer. Handoffs must:

- Summarize what changed.
- List files created and modified.
- List validation commands run.
- State clearly what was *not* tested.
- State known limitations.
- State whether the PR is docs-only or runtime.
- State whether any conflicts were resolved.
- State whether follow-up PRs are needed.
- Avoid claiming features are complete if only docs/planning were changed.
