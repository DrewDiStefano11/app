# Workflow Sanity Audit

## Purpose

This document outlines the current GitHub Actions workflow setup to ensure future PRs do not accidentally delete, duplicate, or broaden workflow files.

## Current Workflow Files

The following files exist under `.github/workflows/`:

- `ci.yml`
- `dependency-review.yml`
- `manual.yml`
- `playwright.yml`

## Expected Purpose of Each Workflow

- **CI (`ci.yml`)**: Runs standard build, linting, and formatting checks to ensure code quality on push and PRs.
- **Dependency Review (`dependency-review.yml`)**: Scans dependency manifest files for vulnerabilities and surfaces known-vulnerable versions of packages updated in PRs.
- **Manual Full Validation (`manual.yml`)**: Allows manual triggering of a full validation suite (build, TypeScript check, Playwright tests) with extended timeouts.
- **Playwright Tests (`playwright.yml`)**: Runs the full Playwright End-to-End test suite automatically on push and PRs.

## Execution Triggers

### Should Run on Pull Requests:

- `ci.yml` (branches: `main`)
- `dependency-review.yml` (branches: `main`)
- `playwright.yml` (branches: `main`)

### Should Run on Push to Main:

- `ci.yml`
- `playwright.yml`

### Manual Trigger:

- `manual.yml` (`workflow_dispatch`)

## Permissions

### Read-Only Permissions:

The following workflows should explicitly define `permissions: { contents: read }` to comply with the repository's security requirements:

- `ci.yml`
- `manual.yml`
- `playwright.yml`

### Broader Permissions Required:

- `dependency-review.yml`: Requires `pull-requests: write` to allow the action to comment on the PR summary (`comment-summary-in-pr: always`). It still explicitly limits `contents: read`.

## Expected Merge-Blocking Checks

The following checks are expected to be mandatory before a PR can be merged:

- CI build/lint/formatting passes (`ci.yml`)
- Playwright tests pass (`playwright.yml`)
- Dependency review passes without vulnerable packages (`dependency-review.yml`)

## High-Risk Workflow Files

Any modification to the files in `.github/workflows/` should be considered high-risk. Specifically:

- `ci.yml` and `playwright.yml`: Critical for merge gates. Disabling them or lowering their strictness could lead to broken main builds.
- `dependency-review.yml`: Essential for supply-chain security.

## Accidental Workflow Deletion Detection

- When reviewing PRs, closely monitor the list of changed files for `.github/workflows/`.
- Verify any file deletion in this directory. A deleted workflow file will show up as a removed file (usually in red with a minus sign in the diff view) and won't trigger CI runs as expected.
- If a CI check normally runs but is missing from the PR checks list (e.g., "CodeQL" or "Playwright Tests"), it's a strong indicator the workflow was either deleted or its triggers misconfigured.

## Guidance for Future Workflow PRs

- **Explicit Permissions:** All workflows must explicitly define permissions. The default should always be `permissions: { contents: read }` at the workflow level unless broader access is strictly required and documented.
- **No Force-Pushes or Disabling Checks:** Workflows should not be modified to skip checks simply to speed up a PR.
- **PR Scope:** Any changes to workflow files should ideally be in an isolated "Infrastructure" or "DevOps" PR, not bundled with feature work or documentation updates.

## Missing Workflows to be Restored

- **CodeQL (`codeql.yml`)**: A previous PR accidentally deleted `.github/workflows/codeql.yml`. The repository has GitHub's CodeQL 'Default Setup' enabled, which may cause conflicts with advanced configurations. The CodeQL setup needs to be evaluated and appropriately restored separately if advanced configuration is needed, or left to default setup while ensuring proper analysis occurs.
