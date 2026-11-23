# FitCore — Prioritized Test Plan (for the final stabilization campaign)

**Baseline observed in this audit**

- 66 Playwright spec files (`tests/e2e`) and 69 unit test files (`tests/unit`, `node:test` style, run with `bun test`).
- `bun test tests/unit` → 873 pass / **1 fail** (`whoop-background.test.ts` timeout).
- `npx tsc --noEmit` and `npm run build` pass.
- Dev server boots on **8080**; Playwright's `webServer` configuration matches.
- Default PR matrix = Chromium at 3 viewports. WebKit is opt-in (`FITCORE_TEST_IPHONE_WEBKIT=1`) and only runs in the release gate for a subset.

**How to use:** run P0 before any merge; P1 before a build goes to a real user; P2/P3 progressively. Prefer extending existing helpers (`tests/e2e/helpers/fitcore-test-state.ts`) and deterministic synthetic data (`lib/demo-data.ts`) — no real health data, no production keys, no uncontrolled provider calls.

---

## 0. Make the existing suite trustworthy (do this first)

| # | Scenario | Where | Why |
|---|---|---|---|
| 0.1 | `bun test tests/unit` is green on a clean checkout | `tests/unit/whoop-background.test.ts` | Currently red; blocks the release gate |
| 0.2 | `npm run typecheck` script exists and runs `tsc --noEmit` | `package.json` | No script today; typecheck only run manually/here |
| 0.3 | `ci.yml` runs unit tests + typecheck; lint can fail the job | `.github/workflows/ci.yml` | Lint/prettier are `continue-on-error`, tests absent |
| 0.4 | Playwright WebKit smoke on every PR | `playwright.config.ts`, `playwright.yml` | iPhone product, zero routine WebKit coverage |
| 0.5 | Remove or quarantine flaky tests deterministically (no `waitForTimeout`) | search `waitForTimeout` in `tests/e2e` | Only if flakiness is observed; don't rewrite stable tests |

---

## P0 — Data integrity and silent-loss scenarios (must be automated)

1. **Meal save under storage failure (BUG-01).** Stub `localStorage.setItem` to throw after hydration → open Home → Log Meal → Save. Expect: sheet stays open, `role="alert"` visible, meal not counted, retry succeeds after stub restored.
2. **Quota exhaustion with a large photo (BUG-04).** Seed a ~2 MB base64 photo into persisted state, then finish a workout. Expect: explicit storage error, pending-edit/backup path available, no half-written state; after deleting the photo, save succeeds.
3. **Workout finish persistence failure.** Existing `workout-release-safety` / `settings-data-safety-lifecycle-smoke` cover much of this — extend with a photo-inflated state to reproduce realistic near-quota conditions.
4. **Reload during active workout.** Start workout, log 2 sets, reload. Expect: same workout id, sets, rest timer state (not "rest complete"), and no duplicate workout after finishing.
5. **Double finish / double delete.** Two rapid clicks on "Confirm & save" and on "Delete workout" must create/remove exactly one record (guard exists via `s.workouts.some(...)`; assert it).
6. **Import → export round-trip.** Import a synthetic backup containing workouts/meals/photos/templates, reload, export; assert semantic equality (already partially covered by `data-backup` unit tests; add a UI-level round trip).
7. **Corrupt persisted JSON.** Seed invalid JSON/checksum in the transaction key → app must show a recoverable state (not a white screen) and must not overwrite the corrupt blob silently.
8. **Cross-tab revision conflict.** Open two pages, write in both. Expect the second writer to surface the reload/conflict state rather than silently losing the first write.

## P1 — Correct numbers and cross-screen consistency

1. **Unreported macros (BUG-02/03).** Log a calorie-only meal from Home → assert Home/Fuel/Goals show "unreported" and do **not** show 0 g protein as a real value; nutrition score does not treat it as zero.
2. **Macro totals agree across screens.** Seed a fixed day; read Home macro card, Fuel ring/bars, Goals protein row, and momentum/nutrition score; assert identical numbers.
3. **Demo mode (BUG-08).** Toggle demo → assert each of Home, Train, Fuel, Recover, Stats renders non-empty (or, if scope is intentionally Home-only, assert the copy says so). Keep this as an executable spec of the decision.
4. **Weigh-in validation (BUG-05).** `-5`, `0`, `abc`, `5000` rejected at all three entry points; valid update changes profile + bodyweight goal exactly once.
5. **Timezone/day boundary.** Meals/workouts logged at 23:59 local appear in "today" and move to the previous day after midnight; existing `date-boundary-today-rollup-smoke` is the base — add a meal at the boundary and a check-in.
6. **Last workout ordering (BUG-13).** Import/insert an older workout after a newer one; Training "Last workout" shows the newest by `startedAt`.
7. **WHOOP with missing measurements.** Snapshot with `score_state: PENDING_SCORE`, `calibrating`, and missing fields → all WHOOP surfaces render `—`, no `NaN`, no zero substituted for recovery/HRV/strain.
8. **Score evidence.** Each score sheet lists at least one record source or a "what's missing" line; no score is shown without a status label.

## P2 — Usability, states and platform behaviour

1. **Empty states on every tab** (fresh install → onboarding complete → each of the 5 sections + all sub-tabs). Assert no crash, no `NaN`, no bare "—" without explanation. `empty-state-crash-smoke` exists; extend to Deep Dive sub-tabs.
2. **Loading/hydration.** Assert the "Loading FitCore…" status appears and disappears; no flash of onboarding after hydration.
3. **Settings reachability (BUG-09).** From each section, Settings must be reachable in ≤ 2 taps (currently impossible outside Home).
4. **Reminders (BUG-06).** Either assert a notification is scheduled (if implemented) or assert the UI is labelled "not active"; do not test a toggle that has no effect.
5. **Duplicate ids (BUG-10).** Assert all rendered element ids in Settings are unique (`page.$$eval("[id]")`), and each subtab scrolls to its section.
6. **Photo tile behaviour (BUG-07).** Tapping "Photo Log" on Fuel opens the meal/photo flow, not the Jarvis composer (assert composer not open).
7. **Keyboard and sheet behaviour on iPhone WebKit.** Focus the meal name input inside a tall sheet; assert the focused field is visible, page scroll position unchanged after dismiss, and Escape/backdrop close works (existing `popup-stack-and-scroll-lock-smoke` runs Chromium only — add WebKit).
8. **Active workout nav.** With an active workout, bottom nav hidden; back returns to Training with session intact; beforeunload prompt present.
9. **Audio/voice gating.** Mic buttons are disabled and labelled; no attempted microphone permission when voice is off (guard against future regressions).

## P3 — Stress, scale and long-horizon

1. **Large workout history** (e.g. 1 500 workouts / 60 k sets) → app boot < 3 s on CI, charts still render, no stack overflow. Existing `workout-storage-headroom` is the base; add a synthetic-volume fixture.
2. **Large nutrition history** (3 650 days × 4 meals) → Fuel, macro trend, goals and scores remain responsive; history date picker remains usable.
3. **Many progress photos** (20 × 500 kB) → storage usage warning appears before failure; photo listing remains responsive.
4. **Long AI failure modes** (no provider key, 500 response, timeout, malformed tool JSON): assert a user-visible error, no partial record, retry works, audit log does not claim success. Use mocked providers only (`jarvis-provider-policy` / `jarvis-text-provider` patterns).
5. **Offline boot and reopen.** With the service worker active (production build), open offline: app shell loads, data readable, writes either queue or fail visibly; reconnect and verify. `workout-offline-reopen` is skipped unless `FITCORE_TEST_PRODUCTION_BUILD=1` — run it in the gate.
6. **Rapid navigation** between all 5 tabs + Deep Dive while a workout is active and a meal sheet is open; assert no lost state, no duplicate portals, no scroll-lock leak.

## Security and privacy checks

1. **No health data in AI requests when sharing is off.** Existing `whoop-jarvis-isolation` covers WHOOP; extend to meal/workout context and assert the request body excludes data when the toggle is off. Intercept network calls (mock), never call a real provider.
2. **Export contains only local data and downloads as a file**, never posts anywhere.
3. **No secrets in client bundle.** `grep` the built `dist/client` for `GROQ_API_KEY`, `WHOOP_CLIENT_SECRET`, token patterns; must be absent.
4. **Privacy route** reachable without onboarding, copy matches actual local-storage behaviour. Existing `privacy-policy` spec.
5. **Deleted data stays deleted** after reload (meal, workout, weigh-in, photo) and is removed from derived scores/history.

## Test-design guardrails

- Use synthetic fixtures; never exercise real WHOOP/AI endpoints.
- Prefer `getByRole`/`aria-label` selectors (the app already has good labels) over CSS classes.
- For storage-failure tests, inject a wrapper around `localStorage` rather than filling the real disk.
- Keep the per-PR suite fast: tag P0/P1 for PRs, P2/P3 nightly or release-only.
- When a test fails, fix the cause; do not increase timeouts to hide slow code without evidence (the WHOOP background test is the current example to investigate).
