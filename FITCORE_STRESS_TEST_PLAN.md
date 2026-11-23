# FitCore Stress Test Plan

Generated: Mon Nov 23 2026
Branch: `kilo/async-queue-f7d` (rebased onto origin/main `dfe29ab`)

## Purpose

Define stress testing scope for FitCore beyond the e2e regression suite. Covers load, concurrency, persistence, and resilience scenarios that are not captured by the six new gap-filling test files.

## Coverage areas

### 1. Concurrent writes (data integrity)

**Scenario:** Rapid successive meal/workout writes from multiple tabs or rapid user actions.

**Related e2e test:** `tests/e2e/data-integrity-interruption.spec.ts` — rapid successive meal writes are all persisted without data loss.

**Stress extensions:**
- Concurrent meal writes from 2+ browser contexts targeting the same user state.
- Workout set edits overlapping with auto-save intervals.
- Verify atomic persistence keys (`slotA`/`slotB`/`manifest`) are not corrupted under concurrent write load.
- Verify revision counter increments monotonically under concurrent writes.

### 2. Reload resilience

**Scenario:** Page reload at arbitrary points during user flows.

**Related e2e tests:**
- `tests/e2e/settings-reload-behavior.spec.ts` — settings changes persist across reload.
- `tests/e2e/cross-screen-workflows.spec.ts` Workflow 2 — reload mid-meal-edit does not lose data; totals persist across screens.

**Stress extensions:**
- Reload during active workout timer (timer state preserved or gracefully reset).
- Reload during Jarvis compose (draft preserved or discarded with confirmation).
- Reload during WHOOP sync (no duplicate syncs, no data loss).
- Reload during meal sheet open (in-progress edit not lost).

### 3. WHOOP sync resilience

**Scenario:** Network flakiness, expired auth, rate limiting, and failed refreshes.

**Related e2e test:** `tests/e2e/whoop-sync-continuity.spec.ts` — valid authorized data survives a failed refresh and is replaced on success (blocked by test-harness timing; see FITCORE_BUG_REPORT.md).

**Stress extensions:**
- 502/503/429 responses from WHOOP sync endpoint — valid data must not be blanked.
- 401 unauthorized — sync stops, UI shows disconnected state, no silent re-auth.
- Expired access token — renewal lead time (15s) triggers refresh before expiry.
- Clock skew / system sleep — sync coordinator handles time jumps gracefully.
- Manual records never overwritten by WHOOP sync.

### 4. Active workout interruption

**Scenario:** Navigating away from Training with an active workout.

**Related e2e test:** `tests/e2e/cross-screen-workflows.spec.ts` Workflow 4 — active workout survives navigation away and back.

**Stress extensions:**
- Active workout persists across full page reload (not just client-side navigation).
- Multiple tab switches while workout is active — no duplicate active workouts.
- Rest timer state survives section switches.
- Workout draft notes survive interruption.

### 5. Macro integrity (no silent fabrication)

**Scenario:** Nutrition macro values are never silently fabricated or guessed.

**Related e2e test:** `tests/e2e/nutrition-macro-integrity.spec.ts` — macro integrity gaps must never be silently fabricated.

**Stress extensions:**
- Meal with missing macro data shows "—" or calculated estimate, never a fabricated value.
- Macro targets vs actuals — discrepancies shown honestly.
- Imported/legacy meal data — missing macros flagged, not inferred.

## Environments

| Environment | Browser | Viewport | Notes |
|-------------|---------|----------|-------|
| Desktop | Chromium | 1280x720 | Primary stress target |
| Mobile | Chrome | 390x844 | iPhone-sized, no WebKit available |
| Mobile | Chrome | 360x800 | Secondary mobile target |

## Success criteria

- No data loss under concurrent writes.
- No fatal runtime errors under reload at any point.
- WHOOP authorized data never blanked by failed refresh.
- Active workout state preserved across navigation and reload.
- Macro values never silently fabricated.
- All atomic persistence writes complete without corruption.

## Exclusions

- iPhone WebKit (`iphone-webkit` project) is not available in this environment. See `FITCORE_IPHONE_CHECKLIST.md`.
- No load testing against production WHOOP API (no real provider requests).
- No testing against real user records or credentials.
