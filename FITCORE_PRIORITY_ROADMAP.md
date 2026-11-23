# FitCore — Prioritized Roadmap

**Purpose:** a merge-safe sequence for the final stabilization campaign. It distinguishes confirmed critical defects, missing functionality, usability work and optional improvements, and is written so the primary Codex session can pick items up without colliding with the in-progress voice / photo / WHOOP / Jarvis work.

**Ground rule for this campaign:** do not edit active-development files while the other agent is working. Known active surfaces from this audit's evidence and the README safety list: `src/components/app/jarvis/**`, `src/components/app/views/whoop-settings.tsx`, `src/lib/whoop/**`, `src/lib/types.ts`, `src/lib/store.tsx`, `src/routes/index.tsx`, `src/styles.css`, `eslint.config.js`. Prefer new small helpers + view-level edits, and coordinate before touching those.

---

## Phase 0 — Make the pipeline trustworthy (½ day, unblocks everything)

1. **Fix the failing unit baseline** — `tests/unit/whoop-background.test.ts:11` exceeds the 5 s default (10.8 s observed). Add an explicit test timeout only after checking whether the work itself is slow; otherwise trim the fixture. Acceptance: `bun test tests/unit` green, twice in a row.
2. **Add scripts** — `"typecheck": "tsc --noEmit"`, `"test:unit": "bun test tests/unit"` in `package.json`.
3. **Harden `.github/workflows/ci.yml`** — run `typecheck` and `test:unit`; stop swallowing lint/prettier failures (or add a tracked follow-up to fix the violations, then make them blocking).
4. **Add a WebKit smoke job for PRs** — iPhone 13 device, a small subset (`smoke`, `navigation-smoke`, `popup-stack-and-scroll-lock-smoke`, `nutrition-logging-validation-smoke`, `active-workout-lifecycle-smoke`).

Why first: every later fix needs a trustworthy signal, and the release gate currently fails on a clean checkout.

---

## Phase 1 — Critical data-integrity fixes (1–2 days)

Ordered by user harm per hour of work.

| Priority | Item | Files (expected) | Acceptance |
|---|---|---|---|
| P0 | **BUG-04** Compress/cap progress photos; surface storage errors | `views/progress.tsx`, possibly a new `lib/image-compression.ts`, `lib/runtime-persistence.ts` (error mapping only) | A 4 MP photo saves under ~300 kB; finishing a workout after 20 photos succeeds; quota error is specific and actionable |
| P0 | **BUG-01** Home meal logger honours `set()` failure | `popups/quick-popups.tsx` | Save failure keeps sheet open with an alert; retry persists |
| P0 | **BUG-02/03** Unreported macros are not zero | `lib/analytics/domain-metrics.ts`, `popups/quick-popups.tsx`, `views/nutrition.tsx`, `goals-panel.tsx` | Missing macros render "unreported/—" and are excluded from macro goals/scores; totals identical on Home/Fuel/Stats |
| P1 | **BUG-05** Shared weigh-in validation | `popups/quick-popups.tsx`, `views/progress.tsx` | Negative/absurd values rejected with a message; profile/goals never mutated on invalid input |
| P1 | **BUG-14** Persist provenance/confidence with AI estimates | `popups/quick-popups.tsx` | Saved AI meal carries `source`, `confidence`, `provenance`; list shows the AI badge |

Do **not** change the persisted schema for these. `macroStatus` and `DataProvenance` already exist; photos can stay base64 with compression as the minimal fix.

---

## Phase 2 — Missing / disconnected functionality (2–4 days)

| Priority | Item | Notes |
|---|---|---|
| P1 | **Unify the two meal loggers** (BUG-02/07) | Keep Fuel's logger (presets/foods/custom validation), add the photo block there, point Home's Quick Action at it. This removes a whole class of divergence and makes the "Photo Log" tile honest. Coordinate with the photo/voice work; if the photo milestone owns the component, do only the routing/removal half now. |
| P1 | **Demo mode scope decision** (BUG-08) | Cheapest correct option: pass `view` to the read-only parts of Train/Fuel/Recover/Stats. If that is too risky, change copy + chip to "Home demo preview". Either way add the per-tab assertion. |
| P1 | **Settings entry point** (BUG-09) | Wire the existing `onOpenSettings` prop into `BottomNav` (e.g. long-press or a sixth item) — lowest-risk nav fix. |
| P1 | **Reminders truthfulness** (BUG-06) | If notifications are out of scope: relabel to "Planned — not active", fix "9 PM" vs `09:00`, and remove the section's "Active" badge. If implementing: request permission lazily, schedule local notifications, and test with mocked timers. |
| P2 | **Stats correlations** (BUG-15) | Use the existing analytics correlation/readiness utilities with a paired daily series; show `n` and direction, or demote to a `PlannedFeatureCard` and remove the selectors. |
| P2 | **Goals Steps/Volume** (BUG-16) | Remove Steps until a data source exists; make the volume target configurable or derive from profile. |
| P2 | **Recovery empty states** (BUG-11/12) | Conditional strain header + proper no-sleep average. Small, self-contained. |

---

## Phase 3 — Usability and consistency (3–5 days, can run in parallel)

**Home**
- Time-aware greeting; remove duplicate momentum summary on short screens.
- Replace Deep Dive placeholder grid with one honest planned card.
- Fix volume card label vs plotted range.

**Fuel**
- Per-macro bars with a "meals missing macros" filter instead of hiding all bars.
- Show `meal.items` when present; remove or implement Hydration card.
- Consolidate the three placeholder Deep Dive tabs into one "Coming later" block.

**Training**
- Single "Resume" action; show the scheduled routine day (reuse `activeRoutineSession`).
- Fix "last workout" ordering (BUG-13); count custom templates in the header.
- Rename Deep Dive tabs to match content; move history into History & PRs.
- Add a 7-day cardio minutes bar vs `cardioGoalMin`.

**Recovery**
- Add a compact 7-day sleep chart on Daily (data already exists in `selectSleepEvidence`).
- Explain the heatmap window; collapse planned metrics into one card.
- Clarify check-in slider direction ("none → severe").

**Stats**
- Rolling-average weight line with dates (matches copy); unify weigh-in components.
- Replace "Top Insight" placeholder with a link to momentum detail.

**Global**
- Persist `layoutMode`; show a Deep Dive indicator on every header.
- Remove `maximum-scale=1` from the viewport meta (accessibility).
- Deduplicate Settings card ids (BUG-10).
- Fix Home-only Settings reachability if Phase 2 did not.

**Cleanup (low risk, do alongside)**
- Delete unreferenced `WorkoutsTab`, `ActiveWorkoutSubtab`, `LogWorkoutSubtab` (`training.tsx`) and `CardLikeLogMeal` (`nutrition.tsx`). Confirm zero references before deleting; these are not imported anywhere in `src`.
- Update stale README dev URL (says 3000; actual is 8080).

---

## Phase 4 — Optional / later

- Real step data and hydration model (needs schema + import, out of scope here).
- Cross-app correlation insights (the analytics engine already has pieces in `lib/analytics/fitcore-insight-readiness.ts`; wire after Phase 2 data completeness).
- Dashboard customization (`dashboard-layout.ts` is a documented, intentionally unused contract).
- Body measurements/composition, visual photo comparison, Apple Watch/Health import.
- Voice and photo AI: owned by the in-progress work; do not duplicate. Only ensure the UI states stay honest in the meantime.
- IndexedDB migration for photos/large histories (bigger project; Photo compression is the interim fix).
- Main-chunk code splitting (`index-*.js` is 1.09 MB / 297 kB gzip) if boot performance becomes a goal.

---

## What not to do in this campaign

- Do not edit `src/lib/types.ts`, `src/lib/store.tsx`, `src/routes/index.tsx` (other than the one-line settings-nav wiring if coordinated), Jarvis components, or WHOOP server modules while they are under active development.
- Do not change persistence schema or dependency versions to fix the above.
- Do not report the gated voice/photo features as broken; their disabled state is intentional and documented in `provider-models.ts`.
- Do not "fix" the WHOOP-background unit test by raising the timeout without first confirming the work it performs is legitimate; investigate the 10.8 s runtime.

---

## Suggested merge slicing

1. **PR A — CI hygiene**: scripts, unit-test fix, ci.yml, WebKit smoke. No app behaviour change.
2. **PR B — Data integrity**: BUG-01, 04, 05, 14 + tests. No layout changes.
3. **PR C — Nutrition truth**: BUG-02/03 + unified logger routing (coordinate on photo block) + tests.
4. **PR D — Navigation/state truth**: BUG-06, 08, 09, 10, 16 + tests.
5. **PR E — Screen polish**: Phases 3 per screen, one PR per screen, each with screenshots/manual QA per README.

Each PR: `npm run typecheck`, `bun test tests/unit`, targeted Playwright specs on Chromium + at least one WebKit spec; update the relevant checklist in `docs/qa/` if the behaviour is user-visible.
