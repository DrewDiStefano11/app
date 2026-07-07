# FitCore Merge Checklist

Every PR must confirm the following before merging to ensure codebase health and application stability.

## Standard Verification

- [ ] Changed files reviewed
- [ ] PR scope matches task
- [ ] No unrelated broad formatting (Prettier/Lint)
- [ ] No unwanted `package-lock.json` or `bun.lock` changes
- [ ] No generated route changes (`routeTree.gen.ts`) unless required by a route change
- [ ] No source files changed in docs-only PRs

## Technical Quality

- [ ] `npx tsc --noEmit` passed (TypeScript)
- [ ] `npm run lint` passed
- [ ] `npm run build` passed if applicable
- [ ] Mobile smoke test passed (Mobile viewport verification)

## Feature Integrity

- [ ] Existing tabs preserved and functional
- [ ] Floating AI assistant preserved and interactive
- [ ] Home quick actions still open their respective popups
- [ ] Data persistence checked if store/state logic changed
- [ ] Migration considered if data shape changed

## AI & Data Safety

- [ ] Manual logs and AI logs still connect to shared state
- [ ] No demo data shown as real data
- [ ] Destructive actions require confirmation
