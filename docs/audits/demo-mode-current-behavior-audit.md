# Demo Mode Current Behavior Audit

## 1. Purpose
To audit the implementation of the "Demo Mode", ensuring it safely generates sample data for UI demonstration without corrupting actual user data or polluting AI context permanently.

## 2. Scope
This audit covers the toggle mechanism in settings, the generation of mock data (`demo-data.ts`), and how the store overlays this data on the read-only `view` state.

## 3. Source files inspected
- `src/lib/store.tsx`
- `src/lib/demo-data.ts`
- `src/components/app/views/settings.tsx`

## 4. Current confirmed behavior
- Demo mode is toggled via a boolean `state.demoMode` in Settings.
- When `demoMode` is true, the `StoreContext` exposes a `view` object that is a merged state of the user's real data and synthetic demo data.
- Demo data is generated deterministically using a seeded pseudo-random number generator (`seeded()` function).
- Generated demo entities are identifiable by their IDs (e.g., `id("workout", i)` which resolves to `workout-demo-i`).
- The `view` is used by UI components for rendering (graphs, history lists).
- The underlying `state` remains untouched by demo data and is what gets persisted to `localStorage`.

## 5. Current missing or unclear behavior
- While `view` safely isolates demo data from `state` storage, there is a known inconsistency risk (documented in memories) where some features might accidentally read from `useStore().state` instead of `useStore().view`, breaking the demo illusion.
- True "Test Accounts" (entirely separate user profiles for QA) do not exist; demo mode just fills an existing empty profile.

## 6. Data created or updated by this flow
- Modifies `demoMode` boolean in `state`.
- Generates thousands of synthetic records in memory (Workouts, Meals, Weigh-ins, Check-ins, PRs) but does not save them to disk.

## 7. Downstream displays/graphs/summaries affected
- All views reading from `useStore().view` (Dashboard, Volume, Heatmap, Nutrition History, Readiness graphs) instantly populate with rich data.

## 8. AI/Jarvis interaction points
- If Jarvis context generation functions read from `state`, they ignore demo data. If they read from `view`, they see demo data. AI context handlers must strictly adhere to using `state` when modifying real user records to prevent accidental persistence of demo interactions.

## 9. Privacy/safety concerns
- Safe by design: Demo data is strictly in-memory and never overrides persisted `state`.

## 10. Demo/test account concerns
- This *is* the primary demonstration feature. It works as intended for visual population.

## 11. Known risks
- Inconsistent usage of `state` vs `view` in UI components can lead to confusing behavior where some screens show demo data and others show empty real data.

## 12. Recommended future implementation work
- Conduct a codebase-wide sweep to ensure all pure UI/Graph components read from `view`, and all mutation/Jarvis handlers read from and write to `state`.

## 13. Acceptance criteria for future fixes
- Lint rules or type strictness enforces that UI components only consume `view`.

## 14. Do-not-touch boundaries for future PRs
- Do not modify the store architecture that separates `state` (persistent) from `view` (computed). This separation is vital for demo mode safety.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Demo Generation | Deterministic PRNG in `demo-data.ts` | `src/lib/demo-data.ts` | None | None |
| Data Safety | `view` merges data in memory; `state` is persisted | `src/lib/store.tsx` | Components may mix `state` and `view` | Audit UI component hook usage |
| Identification | Demo IDs use `-demo-` suffix | `src/lib/demo-data.ts` | None | None |
| Test Accounts | Demo mode fills current profile; no separate accounts | `src/components/app/views/settings.tsx` | Lack of clean multi-user testing | Consider isolated test profiles |
