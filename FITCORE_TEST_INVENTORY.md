# FitCore Test Inventory

Baseline commit: `44ff20b` (Integrate Jarvis text logging with WHOOP and canonical nutrition records (#302))
Branch: `kilo/async-queue-f7d` (== `main`, origin/main)
Repo: https://github.com/DrewDiStefano11/app
Working directory: /workspace/app

## 1. Test infrastructure

- Runner: Playwright (`@playwright/test` ^1.61.1), configured in `playwright.config.ts`.
- No unit test runner (vitest) is installed/configured. `tests/unit/*.test.ts` files exist but are not wired to an `npm test` script; only `test:e2e` / `test:e2e:ui` / `test:e2e:headed` exist in `package.json`.
- Projects: `desktop-chromium`, `mobile-360x800`, `mobile-390x844` (iPhone-sized). `iphone-webkit` only when `FITCORE_TEST_IPHONE_WEBKIT=1`.
- Web server: `npm run dev` (vite) on http://localhost:8080, started by Playwright's `webServer`.
- State seeding helpers: `tests/e2e/helpers/fitcore-test-state.ts` (`seedMinimalOnboardedState`, `seedRevisionedFitCoreState`, `seedFitCoreAppState`, `readPersistedFitCoreState`, `gotoDashboard`, `setMobileViewport`, `FITCORE_MOBILE_VIEWPORTS`).
- Browsers: Chromium installed; system deps via `npx playwright install-deps chromium`. WebKit not installed in this sandbox.

## 2. Application areas mapped

All "screens" are client-side sections rendered within the root route `/` (TanStack Router). WHOOP has server routes `/integrations/whoop` and `/api/whoop/$action`.

| Area | Screens / components | Persistence | Server routes |
|------|----------------------|-------------|---------------|
| Home Dashboard | `views/home.tsx` (Daily + Deep Dive), score sheet, quick actions (Log Meal/Check In/Weigh In/Start Workout), popups | localStorage (revisioned) | none |
| Training / Active Workouts | `views/training.tsx`, `components/app/active-workout.tsx`, exercise library, templates, cardio, history editor | localStorage | none |
| Nutrition / Fuel | `views/nutrition.tsx`, `meal-editor.tsx`, `nutrition-targets-editor.tsx`, `macro-trend-chart.tsx`, `saved-nutrition.ts` | localStorage | none |
| Recovery | `views/recovery.tsx`, `whoop-dashboard.tsx`, `native-whoop-fields.tsx`, `sleep-quality-select.tsx`, check-in/sleep/fatigue sheets | localStorage + WHOOP | `/api/whoop/*` |
| Stats / Progress | `views/progress.tsx` (analytics, body, goals, insights), weigh-in, photos | localStorage | none |
| Jarvis AI | `components/app/jarvis/*` (panel, confirm-card, settings-card, activity-view), `lib/jarvis/*` (tools, actions, providers, text-commands) | localStorage (audit, learning, messages) | `/api/whoop/$action` (jarvisSnapshot), ai Chat server fn |
| Settings | `views/settings.tsx`, `whoop-settings.tsx` | localStorage + backup export/import | none |
| WHOOP integration | `lib/whoop/*` (sync-coordinator, oauth, token-vault, sync, webhook, postgres, evidence, format, dashboard) | Postgres (PGlite) + localStorage | `/integrations/whoop`, `/api/whoop/$action` |
| Navigation / Shell | `routes/index.tsx`, `routes/__root.tsx`, `bottom-nav.tsx`, Jarvis panel overlay | — | — |

Section IDs: `home` | `training` | `nutrition` | `recovery` | `progress`.
Data source enum: `manual | jarvis | jarvis-confirmed | barcode | camera | whoop | apple-health | imported | edited`.
Provenance: `manual | jarvis | ai-estimated | imported | wearable | apple-health | health-connect | barcode | system-derived`.

## 3. Existing test coverage inventory

### E2E (`tests/e2e/*.spec.ts`) — 55 spec files

**Home / Dashboard**
- `dashboard-smoke.spec.ts` — dashboard loads with seeded onboarded state (desktop + mobile)
- `home-daily-heatmap-polish-smoke.spec.ts` — home heatmap
- `date-boundary-today-rollup-smoke.spec.ts` — today rollup
- `rich-state-all-tabs-smoke.spec.ts` — rich state across tabs

**Training / Active Workouts**
- `active-workout-lifecycle-smoke.spec.ts` — start/pause/resume/complete active workout
- `workout-offline-reopen.spec.ts` — close/reopen active workout (skipped unless production build)
- `workout-rest-timer.spec.ts` — rest timers
- `workout-substitutions.spec.ts` — exercise substitutions
- `workout-history-management.spec.ts` — edit/delete history
- `workout-release-safety.spec.ts` — release safety
- `workout-storage-headroom.spec.ts` — storage limits
- `reusable-workouts.spec.ts` — reusable workouts/templates
- `training-routines.spec.ts` — routines
- `bench-program.spec.ts` — bench program
- `exercise-library.spec.ts` — exercise library
- `training-daily-view-panels-smoke.spec.ts` — training daily view

**Nutrition / Fuel**
- `nutrition-logging-validation-smoke.spec.ts` — valid/invalid/empty/cancel meal logging
- `saved-nutrition.spec.ts` — saved foods/meals
- `nutrition-targets.spec.ts` — nutrition target editing
- `nutrition-daily-view-panels-smoke.spec.ts` — daily view panels
- `macro-trends.spec.ts` — macro trends
- `meal-corrections.spec.ts` — meal corrections
- `unit-conversions.spec.ts` — unit conversions

**WHOOP**
- `whoop-sync.spec.ts` — sync scheduling, foreground refresh, retry/409, cooling down
- `whoop-dashboard.spec.ts` — WHOOP dashboard presentation
- `whoop-jarvis.spec.ts` — WHOOP + Jarvis
- `whoop-jarvis-isolation.spec.ts` — WHOOP/Jarvis isolation
- `whoop-callback.spec.ts` — OAuth callback
- `recorded-sleep.spec.ts` — recorded sleep

**Recovery**
- `recovery-check-in-validation-smoke.spec.ts` — check-in validation
- `personal-scores.spec.ts` — readiness/recovery scores

**Stats / Progress**
- `progress-rich-data-smoke.spec.ts` — progress with rich data
- `analytics-workout-volume.spec.ts` — workout volume analytics
- `analytics-invariants.spec.ts` — analytics invariants
- `bodyweight-weigh-in-validation-smoke.spec.ts` — bodyweight/weigh-in
- `daily-decision.spec.ts` — daily decision engine

**Jarvis AI**
- `jarvis-text-provider.spec.ts` — Jarvis text provider
- `jarvis-text-records.spec.ts` — Jarvis text records
- `jarvis-workout-history.spec.ts` — Jarvis workout history
- `jarvis-active-workout.spec.ts` — Jarvis active workout
- `jarvis-provider-policy.spec.ts` — Jarvis provider policy
- `jarvis-active-workout.spec.ts` — Jarvis active workout

**Settings**
- `settings-hub-render-smoke.spec.ts` — settings hub render
- `settings-hub-safety-smoke.spec.ts` — settings safety
- `settings-data-safety-lifecycle-smoke.spec.ts` — settings data lifecycle

**Navigation / General**
- `navigation-smoke.spec.ts` — navigation paths
- `mobile.spec.ts` — mobile layout
- `mobile-layout-overlay-smoke.spec.ts` — mobile overlays
- `keyboard-focus-accessibility-smoke.spec.ts` — keyboard focus / a11y
- `popup-stack-and-scroll-lock-smoke.spec.ts` — popups / scroll lock
- `quick-popup-open-close-regression.spec.ts` — quick popups
- `empty-state-crash-smoke.spec.ts` — empty states
- `no-fatal-app-errors-smoke.spec.ts` — no fatal errors
- `reload-stability-smoke.spec.ts` — reload stability
- `localstorage-compatibility-smoke.spec.ts` — localStorage
- `legacy-startup-compatibility.spec.ts` — legacy startup
- `privacy-policy.spec.ts` — privacy
- `app-pr-gate-smoke.spec.ts` — app PR gate
- `smoke.spec.ts` — onboarding, navigation, quick actions, settings, AI launcher

**Data integrity / persistence**
- `data-integrity.spec.ts` — workout/meal/check-in/weigh-in survive reload; Jarvis dedupe/undo
- `data-contract-invariants.spec.ts` — data contract invariants
- `data-propagation-smoke.spec.ts` — meal propagates to Nutrition + survives reload
- `data-safety-runtime-lifecycle.spec.ts` — runtime lifecycle
- `data-safety-runtime-concurrency.spec.ts` — runtime concurrency
- `provenance.spec.ts` — provenance
- `chart-empty-data-smoke.spec.ts` — empty chart data

### Unit (`tests/unit/*.test.ts`) — ~55 test files (not currently runnable; no runner configured)

Analytics: `analytics-version`, `anomaly-detection`, `data-provenance`, `date-time`, `domain-metrics`, `evidence-attribution`, `fitcore-analytics-*` (8), `fitcore-insight-readiness`, `goal-detail-metrics`, `insight-*` (5), `meaningful-change`, `metric-dependency-graph`, `metric-freshness`, `metric-quality`, `metric-trust`, `nutrition-detail-metrics`, `personal-baselines`, `personal-scores`, `recovery-detail-metrics`, `rolling-trends`, `safe-math`, `training-detail-metrics`, `training-routines`.
Persistence: `atomic-persistence`, `data-backup`, `data-import-inspection`, `data-integrity`, `data-repair-plan`, `revisioned-persistence`, `runtime-persistence`, `store-runtime-persistence`, `store-transaction`, `saved-nutrition`.
Jarvis: `jarvis/actions`, `jarvis/contracts/runtime-contracts`, `jarvis-meal-corrections`, `jarvis/normalization/*` (2), `jarvis/nutrition-consistency`, `jarvis/provider-keys`, `jarvis/providers`, `jarvis/text-context`.
WHOOP: `whoop-background`, `whoop-dashboard`, `whoop-integration`, `whoop-jarvis-context`, `whoop-native-evidence`, `whoop-oauth`, `whoop-postgres`, `whoop-sync-coordinator`, `whoop-sync`, `whoop-token-vault`, `whoop-v2`, `whoop-webhook`.
Workout: `workout-history`.

### Benchmarks
- `tests/benchmarks/persistence-edits.ts`

## 4. Implementation status by feature

| Feature | Status | Notes |
|---------|--------|-------|
| Home dashboard / score / quick actions | Implemented | Daily + Deep Dive modes |
| Workout logging (start/complete, sets, notes, history, PRs) | Implemented | Active workout persistence |
| Exercise substitutions | Implemented | `workout-substitutions.spec.ts` |
| Rest timers | Implemented | `workout-rest-timer.spec.ts` |
| Manual food logging + macros | Implemented | unreported macroStatus supported |
| Saved foods / meals | Implemented | `saved-nutrition.ts` |
| Nutrition targets editing | Implemented | `nutrition-targets.spec.ts` |
| Meal edit / delete / undo | Implemented | commitMeal with conflict detection |
| WHOOP connect / sync / records / disconnect | Implemented (server) | sync-coordinator, oauth, token-vault |
| WHOOP dashboard / native fields | Implemented | `whoop-dashboard.tsx`, `native-whoop-fields.tsx` |
| Recovery check-ins / sleep / fatigue | Implemented | manual + WHOOP-driven |
| Bodyweight / progress photos / goals | Implemented | `views/progress.tsx` |
| Jarvis text chat + review-before-saving | Implemented | permission 1-4, confirm cards, undo |
| Jarvis workout/nutrition queries | Implemented | `jarvis/*` tools |
| Settings (profile, prefs, data, integrations) | Implemented | backup export/import |
| Deep Dive tabs (training/nutrition/recovery/progress) | Partially | several "Planned" placeholder cards |
| Voice logging (microphone) | Not integrated | button present, disabled ("coming in Phase 6") |
| Food photo estimation (camera) | Not integrated | Photo Log chip present, no camera flow |
| WHOOP v2 background/webhooks | Implemented server-side | webhook.server, postgres |

## 5. Identified coverage gaps (prioritized for new tests)

1. **Cross-screen calculation consistency** — Home macros vs Nutrition tab vs Nutrition Deep Dive vs MacroTrendChart; no single integration test asserts all agree after a meal log/edit/undo.
2. **Unreported macros never fabricated** — requirement: missing macros never silently converted to fabricated values. `calculateMealTotals` sums calories but macros default to 0 for unreported and target completion is `null`/`needs_more_data`. Needs an explicit e2e assertion across screens.
3. **WHOOP refresh does not blank valid authorized data** — sync-coordinator `block()`/`resetEvidence("clear")` can publish null on authorization loss; needs a test that valid cached data survives a failed refresh.
4. **Cross-feature integration workflows** (Phase 3) — the 5 named workflows (workout logging, nutrition logging, WHOOP sync, interrupted workout, Jarvis logging) are not covered end-to-end as multi-screen journeys.
5. **Data integrity under interruption** — rapid successive edits, interrupted writes, duplicate submissions partially covered (`data-integrity.spec.ts`, `data-safety-runtime-*`) but not as user-facing UI flows.
6. **Jarvis provider failure / invalid AI responses** — provider errors handled in `ai.functions.ts`, but no e2e test intercepts the external Groq/Gemini HTTP to simulate failure.
7. **iPhone WebKit** — `iphone-webkit` project exists but WebKit browser not installed; cannot run in this sandbox. Covered by `mobile-390x844` (Chrome) only.
8. **Long-running / large dataset rendering** — hundreds of workouts / thousands of sets / long Jarvis conversations: partially covered by `workout-storage-headroom.spec.ts`; no large-meal-history or long-conversation test.
9. **Settings reload behavior / API key clearing** — `settings-hub-safety-smoke.spec.ts` covers some; AI provider key clearing flow not directly tested through UI.

## 6. Existing tests to avoid duplicating

Do not rewrite coverage already present in: `dashboard-smoke`, `nutrition-logging-validation-smoke`, `saved-nutrition`, `nutrition-targets`, `whoop-sync`, `whoop-dashboard`, `active-workout-lifecycle-smoke`, `workout-offline-reopen`, `workout-rest-timer`, `workout-substitutions`, `workout-history-management`, `recovery-check-in-validation-smoke`, `recorded-sleep`, `progress-rich-data-smoke`, `analytics-workout-volume`, `bodyweight-weigh-in-validation-smoke`, `jarvis-text-*`, `jarvis-workout-history`, `jarvis-active-workout`, `settings-hub-*`, `navigation-smoke`, `data-integrity`, `data-propagation-smoke`, `reload-stability-smoke`, `empty-state-crash-smoke`, `no-fatal-app-errors-smoke`, `smoke`.

## 7. Planned new test files (gap-filling, integration-focused)

| File | Area | Purpose |
|------|------|---------|
| `tests/e2e/nutrition-macro-integrity.spec.ts` | Nutrition | Unreported macros never fabricated; calories/macros consistent Home ↔ Nutrition ↔ Deep Dive; edit/undo preserves totals |
| `tests/e2e/whoop-sync-continuity.spec.ts` | WHOOP | Valid authorized snapshot survives a failed/interrupted refresh; timestamps preserved; replacement of old values |
| `tests/e2e/cross-screen-workflows.spec.ts` | Integration | Workflow 1 (workout→stats→jarvis), Workflow 2 (nutrition→fuel→home→deep dive→undo), Workflow 4 (interrupted workout close/reopen/resume) |
| `tests/e2e/jarvis-provider-failure.spec.ts` | Jarvis | Intercept Groq/Gemini HTTP → provider failure, invalid response, long message, multiline input, conversation reset + draft preservation |
| `tests/e2e/data-integrity-interruption.spec.ts` | Data integrity | Rapid successive edits, reload mid-edit, duplicate submit, storage error persistence |
| `tests/e2e/settings-reload-behavior.spec.ts` | Settings | Preference persistence across reload, AI key modes, backup export, reset |

## 8. Deliverables to produce

- `FITCORE_TEST_INVENTORY.md` (this file)
- `FITCORE_BUG_REPORT.md` — confirmed defects
- `FITCORE_TEST_RESULTS.md` — executed tests, pass/fail, commands, limitations
- `FITCORE_STRESS_TEST_PLAN.md` — extended campaign for post-development
- `FITCORE_IPHONE_CHECKLIST.md` — real-device acceptance tests
