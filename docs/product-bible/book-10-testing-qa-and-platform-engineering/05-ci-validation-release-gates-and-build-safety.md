# CI Validation, Release Gates and Build Safety

To protect the integrity of the FitCore application, changes must pass strict build safety standards before they merge. This document defines the *future* expectations for CI (Continuous Integration), release gating, and rollout safety.

*(Note: This Book 10 PR does not create or modify CI workflows.)*

## Likely Validation Commands (Planning Examples)

In the future, the CI pipeline is expected to run these commands sequentially to validate incoming PRs:

- Install/dependency validation (e.g., `npm ci`)
- TypeScript check (`tsc --noEmit`)
- Linting
- Format checking
- Build compilation
- Focused unit/integration tests
- End-to-end tests (where appropriate)

## Release Gates

Features and fixes must clear specific gates depending on their scope:

- **Docs-only PRs:** Must pass docs-safe checks (like markdown linting or simple formatting checks) and must not modify runtime code.
- **Runtime PRs:** Must pass the build, TypeScript checks, and linter.
- **Feature PRs:** Must include focused validation (tests or documented manual verification) proving the new behavior.
- **Large changes:** Must include comprehensive manual QA notes in the PR body.
- **Baseline failures:** Known baseline failures must be documented and not hidden.

### Handling Existing Baseline Errors

- Do not attempt to fix unrelated baseline errors (e.g., existing TS errors in `fitcore-data.ts`) inside feature PRs.
- Create separate cleanup PRs explicitly meant to resolve baseline issues.
- Do not claim CI is fully green if known failures remain; be transparent.
- Do not merge PRs intending to act as CI gates until the baseline issues are intentionally handled or accepted as known debt.

## Rollback Planning

Every PR should be built with safety and reversibility in mind:

- **Small PRs:** Easier to review and easier to revert if something breaks.
- **Risky Features:** Should be staged behind clear boundaries or feature flags.
- **Scope limitation:** Avoid bundling unrelated UI, AI, and backend changes.
- **Transparency:** Document known limitations and risks directly in the PR bodies.

## Data Integrity Release Checklist

Before any major release, future verification must clear the Data Integrity Release Checklist:

- New logs save correctly.
- Edited logs update correctly everywhere.
- Deleted logs instantly stop influencing dashboards, AI memory, and insights.
- User-corrected values override AI/imported estimates where intended.
- Duplicate records are not created during syncs or saves.
- Source labels (e.g., "Jarvis", "Manual") remain attached to data accurately.
- Timestamps and time zones are handled correctly.
- Demo data strictly does not mix with real user data.
- Graph values perfectly match the stored source data.
- AI summaries match the stored source data without hallucinations.
- Export/delete behavior is accurate (when implemented).

## Privacy and Safety Release Checklist

Before any major release, future verification must clear the Privacy and Safety Release Checklist:

- Sensitive data (photos, medical notes) is not shown casually on generic dashboard views.
- Medical, genetic, injury, photo, and conversation-derived data require stronger, explicit user controls.
- AI definitively does not use categories the user has disabled.
- Deleted data does not remain accessible in the AI context window.
- Export packages include only selected categories where applicable.
- Destructive actions (wiping data, deleting accounts) require explicit user confirmation.
- Medical and symptom insights strictly avoid using diagnosis language.
- Red-flag language reliably recommends professional care without claiming a medical cause.
- No secrets, API keys, or sensitive user data ever appear in console logs or diagnostics.
