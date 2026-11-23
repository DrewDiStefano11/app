# FitCore — Confirmed Defect Report

**Scope:** defects confirmed from source inspection plus executed checks (typecheck, build, `bun test tests/unit`, dev-server boot). Hypotheses are listed separately in §B. In-progress work (voice, photo AI, WHOOP sync changes) is **not** reported as a regression.

Severity scale: **S1** = data loss / silent corruption; **S2** = wrong numbers or broken primary flow; **S3** = confusing or broken secondary interaction; **S4** = cosmetic/maintenance.

---

## A. Confirmed defects

### BUG-01 — Quick meal logger silently discards the save when persistence fails
**Severity:** S1
**Where:** `src/components/app/popups/quick-popups.tsx:69-77` (`LogMealSheet.save`)

```ts
set(s => ({ ...s, mealEntries: [...s.mealEntries, {...}] }));
close();
```

`set()` returns `boolean` (`store.tsx` `apply`), and several other flows check it (e.g. `CheckInSheet` uses `const saved = set(...)` and keeps the sheet open on failure). This one ignores the result and closes the sheet, so a storage error (quota, blocked storage, revision conflict) looks like a successful meal log while nothing was saved.

**Repro (automated-friendly):** stub `localStorage.setItem` to throw / fill quota → open Home → Log Meal → enter name + kcal → Save. Sheet closes; meal list unchanged; no error surfaced.
**Fix:** capture the return value, keep the sheet open with `role="alert"` on failure, matching `CheckInSheet`.

---

### BUG-02 — Meal entry points disagree on macros, producing genuinely wrong totals
**Severity:** S1
**Where:** `popups/quick-popups.tsx:69-77` vs `views/nutrition.tsx` local `LogMealSheet`/custom entry; `lib/analytics/domain-metrics.ts:1229-1238`

Home's logger requires only a name and calories and writes `protein/carbs/fat: Number(p) || 0`. Fuel's custom entry requires a name and calories but leaves macro inputs empty more often and also coerces blanks to 0 (`canSaveCustom` accepts empty P/C/F). Since `calculateMealTotals` sums those numbers directly, a calorie-only meal is indistinguishable from a "0 g protein / 0 g carbs / 0 g fat" meal in every downstream surface (Home macro bars, Goals protein row, nutrition adherence score, macro trends). The UI helpfully says "Some meals have unreported macros" only when `macroStatus === "unreported"`, which Home's logger never sets.

**Repro:** Log a 500 kcal meal from Home with no macros → open Fuel: protein/carbs/fat bars show 0 and the Goals "Protein" row shows `0 / target`; momentum/nutrition score treats it as a zero-protein day.
**Fix:** either require macros in the Home logger, or set `macroStatus: "unreported"` and exclude unreported meals from macro sums/scores (do not count them as 0).

---

### BUG-03 — Unreported macros are counted as zero in goals and scores
**Severity:** S2
**Where:** `lib/analytics/domain-metrics.ts:1229-1238` (`calculateMealTotals`), consumed by `analytics.ts:todayMealTotals`, `goals-panel.tsx` rows, `personal-scores.ts`

The UI acknowledges missing macros (`home.tsx` `missingMacrosToday`, `nutrition.tsx` `missingMacros`), but the totals function has no notion of "unknown": `entry.protein` is `undefined` for `macroStatus: "unreported"` and `finiteNonNegative(undefined)` becomes 0. Goals show 0 % progress and adherence scoring is penalised, contradicting the "unreported" message.

**Fix:** return a completeness flag from `calculateMealTotals` (or filter unreported meals out of macro metrics) and render "—" rather than 0.

---

### BUG-04 — Progress photos can consume the entire localStorage budget and block all future saves
**Severity:** S1
**Where:** `views/progress.tsx:1093` (4 MB per-photo limit), `lib/runtime-persistence.ts:browserStorage` (localStorage), `types.ts:AppState.progressPhotos` (`dataUrl` strings)

All fitness state (workouts, meals, audits, photos) is serialised into one localStorage-backed transaction. A single 4 MB image becomes ~5.3 MB as base64, already above the typical 5 MB origin quota before any workouts exist. When the quota is exceeded, commits return `storage_error`/`blocked`, and every subsequent write fails until the user deletes data — which itself may not persist.

**Repro:** add one 4 MB progress photo, then finish any workout → finish sheet shows "Workout could not be saved" and the pending-edit banner appears.
**Fix (minimal, no schema change):** downscale/compress images before `readAsDataURL` (e.g. max 1280 px, JPEG ~0.75) and lower the cap to ~1.5 MB; preferably move photos to IndexedDB in a separate, versioned store. Also pre-flight-check remaining quota and surface a specific "photo too large for device storage" error.

---

### BUG-05 — Weigh-ins accept negative bodyweights and poison profile/goals
**Severity:** S2
**Where:** `popups/quick-popups.tsx` `WeighInSheet.save`; `views/progress.tsx` `DailyViewContent.submitWeighIn` and `WeightSection.submit`

All three do `const wt = Number(w); if (!wt) return;` — this rejects `0` and `NaN` but accepts `-180` and `99999`. The saved value is also written to `profile.bodyweightLb` and to every `bodyweight` goal's `current`, so a typo propagates into Goal Progress, weight trend and any per-bodyweight metric (e.g. protein/kg).

**Repro:** on Stats, enter `-5` → Save → Current Weight shows `-5 lb`; Home Goals shows bodyweight `-5`.
**Fix:** single shared validator, e.g. `20 ≤ lb ≤ 1000` (or metric equivalent), disable Save otherwise, and never mutate `profile`/goals on an invalid entry.

---

### BUG-06 — Reminder toggles are presented as working but nothing schedules notifications
**Severity:** S2
**Where:** `views/settings.tsx:437-500` (section status "Active"), `types.ts` `reminders` / `personalization.reminders`

`grep -rn "Notification" src` returns no scheduling/permission code. The three checkboxes persist booleans that no code reads. Additionally the label "Weigh-in 9 PM" contradicts the default `weighInTime: "09:00"` (9 AM) in `types.ts:442`, and the times in `personalization.reminders` are never editable.

**Repro:** enable all three reminders, close and reopen the app on a device with no other FitCore code paths — no permission prompt and no notification ever appears.
**Fix:** either implement (request permission + `setTimeout`/notification scheduler) or relabel the section "Planned – not yet active" and remove the "Active" badge until scheduling exists. Correct the 9 PM/9 AM mismatch either way.

---

### BUG-07 — "Photo Log" on Fuel does not open a photo flow
**Severity:** S2 (user-facing lie), S3 (if considered copy)
**Where:** `views/nutrition.tsx:570-590`

The tile is labelled "Photo Log / AI Estimate" with a camera icon but its handler is:
```ts
onClick={() => window.dispatchEvent(new CustomEvent("fitcore:open-ai"))}
```
It opens the Jarvis chat composer. The actual photo UI lives in the *Home* meal sheet and is currently gated off (`JARVIS_PHOTO_ANALYSIS_ENABLED = false`). A user tapping "Photo Log" gets a text chat, not a camera or upload control.

**Fix:** until the photo milestone lands, route this tile to the Home meal sheet with an explicit "photo estimate unavailable" note, or relabel it "Ask Jarvis". Do not present a camera affordance that opens a chat.

---

### BUG-08 — Demo mode only affects Home and popups
**Severity:** S2 (trust/QA confusion)
**Where:** `store.tsx` (`state` vs `view`), `grep "const { state" src/components/app/views/*.tsx`

Settings says demo data "Fills charts with sample data. Your real data remains untouched." In practice `TrainingView`, `NutritionView`, `RecoveryView`, `ProgressView` and `SettingsView` all read `state`, while only Home, `GoalsPanel`, `RecentActivity`, and the score/macro/heatmap/readiness popups read `view`. Turning demo mode on leaves Train/Fuel/Recover/Stats empty.

**Repro:** enable Demo data in Settings → Home shows scores/charts → open Train, Fuel, Recover, Stats: all empty.
**Fix:** pass `view` to every read-only screen (keep `set` on `state`), or scope the setting as "Home demo preview" and adjust the copy. Add an E2E assertion per tab.

---

### BUG-09 — Settings has no entry point outside Home
**Severity:** S3
**Where:** `bottom-nav.tsx:15-23` (prop declared but not destructured), `routes/index.tsx:145`

`<BottomNav onOpenSettings={...}>` is passed on every tab, but the component ignores it. From Train/Fuel/Recover/Stats the only way to settings is to navigate Home first.

**Fix:** add a gear item/long-press to the nav, or wire the existing prop.

---

### BUG-10 — Settings subtab scrolling targets duplicate element ids
**Severity:** S3
**Where:** `views/settings.tsx`: `changeSubtab` → `document.getElementById(id)?.scrollIntoView`, ids `profile` ×4 (238, 286, 357, 402), `preferences` ×2, `data` ×3, `integrations` ×3

Duplicate ids are invalid DOM, and `getElementById` returns the first card, so the tab does not reliably scroll to its section. When switching to a subtab that is not yet rendered, the call is a no-op.

**Fix:** give each `HubCard` a unique id (`profile-basic`, `profile-training`, …) or drop the scroll behaviour and rely on the subtab filter.

---

### BUG-11 — Empty "Strain Tracking" section in Recovery without WHOOP
**Severity:** S3
**Where:** `views/recovery.tsx` `HealthTab` (SectionHeader "Strain Tracking" → `<WhoopDashboard />`), `whoop-dashboard.tsx:12-18`

`WhoopDashboard` returns `null` when there is no snapshot/history, leaving a heading with nothing beneath it on a very common state (no WHOOP account).

**Fix:** render the section header only when the dashboard has content, or show a "Connect WHOOP to see strain" empty state.

---

### BUG-12 — "7d sleep avg" renders `—h` when no sleep is logged
**Severity:** S4
**Where:** `views/recovery.tsx` `DailyViewRecovery` (`value={`${avgSleep}h`}` with `avgSleep = "—"`)

**Fix:** render `—` without the unit when `averageHours` is null.

---

### BUG-13 — "Last workout" is array-order dependent
**Severity:** S3
**Where:** `views/training.tsx:125`

`state.workouts[state.workouts.length - 1]` assumes append order. Imported backups, Jarvis-created history entries and history edits can reorder or insert, so the "Last workout" card can show an older session. History uses `.reverse()` too (`training.tsx` `filtered`), with the same assumption.

**Fix:** derive `lastWorkout` with `max(startedAt)`; sort history by `startedAt` descending.

---

### BUG-14 — AI photo estimate is discarded on save (no source/confidence/provenance)
**Severity:** S2 (data trust)
**Where:** `popups/quick-popups.tsx:69-77`; displayed confidence from `estimateMealMacros` is set in local state only

Even when the photo estimate is enabled in a future build, `save()` writes only name/type/macros/timestamp — no `source: "camera"`, `confidence`, `provenance.source: "ai-estimated"`, assumptions or `originalText`. The Fuel list's "AI estimate" badge (`nutrition.tsx` `MealRows`) therefore never appears for estimates logged from Home.

**Fix:** carry `aiConfidence`/`aiNotes` into the saved `MealEntry` (`source`, `confidence`, `provenance: { source: "ai-estimated", confidence, confirmation: "confirmed", assumptions }`).

---

### BUG-15 — Correlation analysis never uses data
**Severity:** S3
**Where:** `views/progress.tsx:690-710` (`AnalyticsTab` correlation card/sheet)

The card always displays "Needs more data" and the sheet always says "Ensure you are logging …", irrespective of how much data exists. The metric selectors (`metricA`/`metricB`) only change the prose.

**Fix:** either compute a real paired daily series and show `n`, direction and strength (the repo already has `getFitCoreAnalytics…correlation` utilities in `lib/analytics/fitcore-insight-readiness.ts`), or replace the card with a clearly labelled "Planned" state and remove the interactive selects.

---

### BUG-16 — Goals "Steps" and "Training Volume" present fabricated targets
**Severity:** S3
**Where:** `goals-panel.tsx:88` (`current: 0` for steps) and `:98` (`target: 25000` lb)

There is no step data model, so the Steps goal is permanently 0/target and always "behind". Training Volume compares a real 7-day total against an unexplained hardcoded 25 000 lb.

**Fix:** remove Steps from the selectable goals until data exists; derive the volume target from `profile`/`userGoalsProfile` or let the user set it.

---

### BUG-17 — Home greeting is time-invariant
**Severity:** S4
**Where:** `views/home.tsx:99` — literal `Good Morning`

**Fix:** derive from local hour (morning/afternoon/evening), or use a neutral greeting.

---

### BUG-18 — Health/correlation copy claims more than the chart does
**Severity:** S4
**Where:** `views/progress.tsx` Bodyweight Trend sheet ("filters out daily noise to reveal your actual direction") vs `Sparkline` plotting raw weigh-in points

**Fix:** either compute a rolling average and plot both series, or change the copy to "shows each logged weigh-in".

---

### BUG-19 — Unit-test baseline is red in the WHOOP background suite
**Severity:** S2 (release gate)
**Where:** `tests/unit/whoop-background.test.ts:11` — "background routes authenticate, fence concurrent writes, and reconcile WHOOP v2 deletions"

Observed in this audit: `bun test tests/unit` → 873 pass, **1 fail**: the test exceeded the default 5 000 ms timeout (reported 10 775 ms). The release workflow runs exactly this command (`.github/workflows/fitcore-release.yml:27`), so the gate fails on a clean checkout of this branch.

**Note:** this is in the actively developed WHOOP area; it may be transient under load, but it is reproducible here and must be stabilised (explicit timeout, fake timers, or reduce work) before the gate can be trusted. It is **not** evidence of a WHOOP product regression by itself.

---

### BUG-20 — CI does not run unit tests or typecheck on PRs; lint can't fail the build
**Severity:** S2 (quality gate)
**Where:** `.github/workflows/ci.yml` (lint and prettier both `continue-on-error: true`; no `bun test`, no `tsc`), `package.json` (no `test`, `test:unit` or `typecheck` script)

Local developers cannot run the unit suite with a documented script; `ci.yml` can go green with failing lint and failing logic tests. Only `fitcore-release.yml` runs `bun test tests/unit`.

**Fix:** add `"test:unit": "bun test tests/unit"`, `"typecheck": "tsc --noEmit"`; make lint blocking (or explicitly non-blocking with a tracked issue); run unit tests in `ci.yml`.

---

### BUG-21 — Mobile Safari/WebKit coverage is opt-in only
**Severity:** S2 (platform risk)
**Where:** `playwright.config.ts` (`testIPhoneWebKit` env flag), `.github/workflows/playwright.yml` (Chromium only), release workflow runs WebKit only for a fixed spec subset

The product is explicitly iPhone-first (viewport meta, safe-area CSS, PWA), yet routine PRs never execute WebKit. iOS-only regressions (range input styling, `dvh`, `input type=date`, focus/keyboard scrolling) are invisible to the default pipeline.

**Fix:** add a WebKit project (iPhone 13) to the PR matrix for a smoke subset; keep the full WebKit run in the release gate.

---

## B. Hypotheses / needs product confirmation (not confirmed defects)

1. **Finishing a workout with zero completed sets** is allowed (`FinishWorkoutSheet.confirmSave`). Could be intentional. If not, require ≥ 1 completed set or an explicit "save empty session" confirmation.
2. **Keyboard-induced page scrolling on iOS** when focusing sheet inputs: `BottomSheet` sets `body.overflow = hidden` but does not lock scroll position; iOS can still scroll the body under the fixed sheet. Not reproduced here (no device). Candidate for a manual iPhone check.
3. **Cross-tab edits**: main state has no `storage` event subscription; two open tabs can produce revision conflicts that surface as `requiresReload`, not live merge. Intentional safety design, but the UX of that state deserves a check.
4. **`reset()` reuses the shared `defaultState` object** (`store.tsx`): `apply(() => defaultState)` persists a migration copy, but any code holding a reference to `defaultState` and mutating it would leak. Currently no such mutation was found — low risk, worth a unit assertion.
5. **Jarvis-created meals and manual meals** may differ in `macroStatus`/provenance; not fully traced because that area is under active development.

---

## C. What is demonstrably solid (do not "fix")

- Revisioned, checksummed persistence with explicit reload/conflict states and UI recovery (`runtime-persistence.ts`, pending-edit banner in Active Workout).
- WHOOP missing-measurement handling: `measurement()` → `null`, `measurementState()` distinguishes calibrating/pending/scored/unavailable.
- Focus management and Escape/Tab trapping in `BottomSheet`/`ConfirmDialog` (`manageFocus`).
- Optimistic-concurrency guards on meal/workout edits (`commitMeal`, `replaceSavedWorkout`).
- Import validation and backup tooling (`data-import-inspection.ts`, `data-repair-plan.ts`).
- Typecheck and production build pass cleanly.
