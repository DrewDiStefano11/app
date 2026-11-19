# WHOOP first-account readiness implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate the merged WHOOP integration and make production setup reproducible before approved activation.
**Architecture:** Preserve the existing single-owner server integration. Correct deployment instructions and exercise its real SQL using a disposable PostgreSQL engine with restricted roles.
**Tech stack:** TanStack Start, Vercel, Neon PostgreSQL, PGlite, Bun, Playwright.
**Spec:** User's WHOOP first-account readiness assignment; docs/architecture/whoop-integration.md.

## Constraints

- No production configuration, infrastructure creation, deployment, merge, real OAuth, or personal measurements without specific approval.
- Background, durable measurement caching, and live Jarvis sharing remain disabled.
- Preserve unrelated branches and all existing tracking and backup behavior.

## Review focus

- Runtime must read webhook deletion metadata even with background work disabled.
- Runtime must not own objects, create schemas/tables, or access unrelated schemas.
- Migrations must apply in order; expired sessions and other owners must fail authorization.
- Recovery retention statements must distinguish restore history from snapshots and exports.
- Missing configuration must remain safe for startup and fail closed for manual operations.

## Task 1: Reproducible restricted-role setup

- [x] Add a disposable SQL regression in tests/unit/whoop-postgres.test.ts that applies all five migrations, loads db/whoop/operations/runtime-role.sql, switches to the runtime role, completes session/OAuth/sync/deletion, and checks denied DDL/unrelated access.
- [x] Observe the missing setup failure; implement the SQL grant script with explicit four-table grants and no role memberships/ownership.
- [x] Verify the restricted-role regression and full unit suite.

## Task 2: Verified activation handoff

- [x] Correct docs/architecture/whoop-integration.md to apply all migrations and use the tested role setup.
- [x] Write docs/architecture/whoop-first-account-readiness.md with verified production/account state, remaining external gates, retention/logging review, exact environment requirements, secure local key generation, and iPhone instructions.
- [x] Qualify the privacy policy's restore-copy statement to cover manual snapshots/exports.
- [x] Run TypeScript, Vercel build, unit tests, mobile WebKit/Chromium release tests, dependency review, and final diff review. Publish the resulting tested commit as the user-requested PR without merging or deploying it.

## Execution ledger

- Main verified at bcd3989559bf8bd996f0f6e0c4514918b40c3bf4; new branch codex/whoop-first-account-readiness in existing isolated checkout.
- Baseline: 778 unit tests pass; clean npm ci and TypeScript pass. Sandbox-only npm install failed; approved network-enabled npm ci succeeded.
- Pre-flight: Task 2 consumes the exact runtime role name and script path from Task 1. Documentation will use fitcore_whoop_runtime and db/whoop/operations/runtime-role.sql.
- User explicitly authorized autonomous execution; no intermediate plan approval needed.

- Task 1: complete. Restricted-role setup absent -> test fails; setup added -> passes. Unused session/webhook writes allowed -> test fails; grants narrowed -> passes. Final suite: 779/779.
- Task 2: checks complete. TypeScript, final Vercel artifact, changed-file lint/format and 122/122 mobile release tests pass. Local screenshot smoke passes on both engines. PR publication follows the tested commit.
- Independent review: fixed unused runtime permissions and failed-authorization recovery guidance; clarified cross-provider fallback and non-pruned session metadata. No production changes authorized or made.
