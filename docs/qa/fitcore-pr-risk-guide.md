# FitCore PR Risk Guide

This guide helps reviewers identify high-risk PRs that may require deeper scrutiny or manual testing.

## Warning Signs (Red Flags)

### 1. Unexpected Scope Creep

- **30+ files changed** for a seemingly small or focused task.
- **UI-only task** makes changes to the core store or data model.
- **Data/Logic task** changes unrelated styling or layout files.

### 2. Lockfile & Meta Changes

- `package-lock.json` or `bun.lock` changed without a corresponding dependency addition/update.
- `routeTree.gen.ts` changed significantly without any new routes being added.

### 3. Broad Formatting

- Large-scale Prettier or Lint changes across the entire app within a feature PR.
- "Rewriting" entire files instead of making targeted, surgical edits.

### 4. Overly Complex Changes

- PR touches **Home, Store, Active Workout, Jarvis, and styles** all in one go.
- Deletion of helper functions or components that were recently added in other PRs.

### 5. Data Integrity Risks

- Changes to the persistence layer without a migration strategy.
- Introduction of "mock data" that isn't clearly separated from real user data.

## Mitigation Strategies

- If a PR exhibits these signs, request the developer to split the PR into smaller, atomic changes.
- Ensure the **FitCore Manual Test Pack** is fully executed for high-risk PRs.
- Pay close attention to mobile layout impact when global CSS or UI components are modified.
