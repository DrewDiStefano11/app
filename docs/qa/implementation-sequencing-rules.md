# FitCore Implementation Sequencing & PR Rules

## Overview

This document outlines the rules for sequencing PRs and maintaining boundaries to ensure the stability of the FitCore application during rapid development phases.

## PR Scoping Rules

1. **Single Responsibility:** Each PR should focus on a single feature, bug fix, or documentation update.
2. **Docs-Only PRs:** Documentation PRs must be strictly documentation-only. Do not modify `src/`, `tests/`, or configuration files.
3. **No Hidden Refactors:** Avoid large-scale refactors in feature PRs. If a refactor is needed, it should be its own PR.
4. **Test-First or Test-With:** Every feature PR must include relevant Playwright E2E tests.

## Sequencing Rules

1. **Foundation Before UI:** Core data structures (`src/lib/types.ts`) and migration logic (`src/lib/fitcore-data.ts`) must be merged before UI components that depend on them.
2. **Codex Before Jules:** Foundational logic tasks (Codex) must be completed before implementation tasks (Jules).
3. **Atomic State Updates:** Any change to the app state shape must include a corresponding update to `FITCORE_DATA_VERSION` and migration logic in the same PR.

## Boundary Rules

1. **Data Integrity:** Never silently drop or downgrade user data. Use the `validateFitCorePayload` and `migrateFitCoreDataIfNeeded` patterns.
2. **UI Consistency:** Use standard components (`Tile`, `PageHeader`, `EmptyState`) to maintain the premium mobile look and feel.
3. **Selector Stability:** Use `getByRole` and text-based selectors in tests. Do not rely on brittle CSS classes.

## Merge Checklist

Before any PR is merged, it must pass:

- `npm run build`
- `npx tsc --noEmit`
- Project-wide linting (`npm run lint`)
- Relevant Playwright E2E tests
- Verification against the `fitcore-merge-checklist.md`
