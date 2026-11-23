# FitCore — Independent Feature & Implementation Audit

**Audit date:** 2026-11-23
**Repository:** DrewDiStefano11/app
**Branch/commit audited:** `freebuff/bd2ddd2dfd6e1e767988885d` at the start-of-chat snapshot (working tree clean, no app source modified by this audit)
**Method:** read-only source inspection, production build, typecheck, unit-test run, dev-server boot. No production credentials, WHOOP account, AI provider keys or real health data were used. No schema, dependency or app-source changes were made.

## Verification baseline (actually executed)

| Check | Command | Result |
|---|---|---|
| Install | `bun install --frozen-lockfile` | PASS (492 packages) |
| Typecheck | `npx tsc --noEmit` | PASS (0 errors) |
| Build | `npm run build` | PASS; main client chunk `index-7iogIsgb.js` = 1,088 kB (297 kB gzip) |
| Unit tests | `bun test tests/unit` | **873 pass, 1 fail** in 69 files / 874 tests (fail: `tests/unit/whoop-background.test.ts` timeout) |
| Dev server | `npm run dev` | Boots on **port 8080** and returns HTTP 200; `playwright.config.ts` base URL is correct |

Consequence: the codebase is structurally healthy (compiles, builds, 99.9 % of unit tests pass), so the findings below are about **behavioural completeness and consistency**, not a broken build.

## How to read status labels

- **Implemented** — wired to real state/persistence and exercised by at least one automated test.
- **Partial** — works, but a stated capability, data source or screen is missing.
- **Placeholder** — visible UI that intentionally displays no real value.
- **Disconnected** — the control does not affect the thing it claims to affect.
- **Gated** — intentionally disabled in code (do not treat as a regression; in-progress or safety-gated work).
- **No coverage** — implemented but not covered by any test that was found.

---

## 1. Shell, navigation and app lifecycle

| Feature | Status | Evidence |
|---|---|---|
| Single-page shell with 5 sections (Home, Train, Fuel, Recover, Stats) | Implemented | `src/routes/index.tsx` (`section`, `BottomNav`) |
| Bottom nav with collapse-on-scroll and compact mode | Implemented | `src/components/app/bottom-nav.tsx` |
| Settings entry point | **Partial** | Gear only on Home (`home.tsx:113-120`). `BottomNav` declares `onOpenSettings` in its props type (`bottom-nav.tsx:20`) but destructures only `{ active, onChange }`, so the prop is ignored. Users on Train/Fuel/Recover/Stats have no settings route. |
| Jarvis composer from nav | Implemented | nav dispatches `fitcore:jarvis-compose`; `jarvis-panel.tsx:355` listens |
| Active-workout takeover (forces Training, blocks nav, beforeunload guard) | Implemented | `routes/index.tsx:56-86` |
| Onboarding gate | Implemented | `Onboarding` renders until `onboardingComplete` |
| Deep Dive / Daily View toggle | **Partial** | One global `layoutMode` in `routes/index.tsx` (not persisted, resets to `daily` on reload). The control is shown inside Home but changes Train/Fuel/Recover/Stats rendering too. Settings lists "Display mode preference" as *Planned*. |
| Screen-level error/loading states | **Partial** | Root error boundary and hydration screen exist (`__root.tsx`, `routes/index.tsx:88-96`). No per-view error boundary; a throw in one view replaces the whole app shell. |
| Offline/service worker | Implemented (gated) | `__root.tsx:136-144` registers `/sw.js` only outside DEV; `public/sw.js` exists |
| PWA manifest / icons | Implemented | `public/manifest.json`, `icon-*`, `apple-touch-icon.png` |

## 2. Home

| Feature | Status | Evidence |
|---|---|---|
| Greeting | **Cosmetic defect** | Hardcoded `Good Morning` regardless of time (`views/home.tsx:99`) |
| FitCore Score + drivers + score explanation sheet | Implemented | `home.tsx` `HomeDailyView`, `popups/score-popup.tsx` |
| Readiness / Recovery / Momentum orbital scores + evidence popups | Implemented | `score-evidence.tsx`, `popups/readiness-popup.tsx`, `popups/momentum-popup.tsx` |
| Muscle heat map card | Implemented (partial data semantics) | `body-heatmap.tsx`; `heatMode` persisted under `fitcore.ui.heatmap.mode` |
| Macro card | Implemented, with unreported-macro caveat | `home.tsx` macro branch; `calculateMealTotals` treats missing macros as 0 |
| Goals panel | **Partial** | `goals-panel.tsx`: "Steps" goal is hardcoded `current: 0`; "Training Volume" target is hardcoded `25000` lb (`goals-panel.tsx:88,98`) |
| Volume card + preview modes | Implemented | `home.tsx:VolumePreview`, `GRAPH_PREFS` |
| Quick actions (Log Meal, Check In, Weigh In) | Implemented | `popups/quick-popups.tsx` |
| AI insight strip | **Partial** | Static sentence per readiness status (`home.tsx` `insight`), click opens Jarvis; no per-user insight content |
| Deep Dive cross-app insights | **Placeholder** | Hardcoded rows with source comment "Dummy cross-app analysis items" (`home.tsx:581-600`): "Needs more data to compare", "Not enough recent logs", "Planned" |
| Deep Dive AI Coach summary / dashboard customization cards | **Placeholder** | `home.tsx:739-761`, badges "Planned" |
| Demo mode | **Partial / misleading** | See §9: demo data is only merged into `view`, and only Home + popups read `view` |

## 3. Recovery

| Feature | Status | Evidence |
|---|---|---|
| Readiness + Recovery summary with evidence sheet | Implemented | `views/recovery.tsx:RecoveryReadinessSummary` |
| WHOOP sleep/health native fields | Implemented (gated by WHOOP connection) | `native-whoop-fields.tsx`, `lib/whoop/evidence.ts` |
| Manual check-in (energy/soreness/stress/motivation + optional sleep) | Implemented | `CheckInSheet`; validates sleep ≤ 24 h; requires confirmation checkbox |
| Manual sleep log (hours, quality, bed/wake notes) | Implemented | `SleepSheet` |
| 7-day sleep average card | **Minor defect** | Renders `—h` when there is no data (`recovery.tsx` `DailyViewRecovery`) |
| Strain tracking section | **Partial** | `SectionHeader "Strain Tracking"` renders unconditionally; `WhoopDashboard` returns `null` when there is no WHOOP data (`whoop-dashboard.tsx:12-18`), leaving an empty section |
| Body heatmap (front/back) | Implemented | `BodyTab`; mode label says "relative logged load over the last three days" |
| Muscle fatigue quick-tap + fatigue sheet | Implemented | `FatigueSheet`, `muscleFatigue` persisted |
| Check-in history with computed score | Implemented | `BodyTab` history list |
| Deep Dive Health/Sleep/Body/Insights tabs | Mostly **Placeholder** | `Temperature`, `SpO2`, `Stress`, `Body Age`, "Sleep Debt", "Consistency", "HRV vs Performance" etc. are `PlannedFeatureCard`/`Planned` (`recovery.tsx:249-300, 560-590, 640-700`) |
| Supplements today | Implemented | `SupplementsTodayCard` reads `supplementLogs` + `userProfile.supplementRoutine` |

## 4. Fuel / Nutrition

| Feature | Status | Evidence |
|---|---|---|
| Daily macro tile, rings, per-macro bars | Implemented | `views/nutrition.tsx` daily branch |
| Nutrition targets editor (two-way sync to `userGoalsProfile`) | Implemented | `NutritionTargetsEditor`, `nutrition.tsx` save handler |
| Meal logging: templates, foods library, saved presets, custom entry | Implemented | local `LogMealSheet` in `nutrition.tsx:502+` |
| Meal editing/deleting with optimistic-concurrency guard | Implemented | `commitMeal`, `MealEditor`, `ConfirmDialog` |
| Meal history by date | Implemented | `historyDate` + `dayKey` filter |
| Saved foods/meals library | Implemented | `saved-nutrition.ts` |
| Hydration | **Placeholder** | Daily card renders a literal `—` (`nutrition.tsx:159-161`); Deep Dive card marked "Not connected yet" |
| AI photo estimate on Fuel screen | **Disconnected** | "Photo Log" tile dispatches `fitcore:open-ai` (opens Jarvis chat), not a camera/upload flow (`nutrition.tsx:577`). The real photo flow lives in the *Home* meal sheet and is globally gated by `JARVIS_PHOTO_ANALYSIS_ENABLED = false` (`lib/jarvis/provider-models.ts:31`) |
| Barcode | **Gated / planned** | Disabled tile with "Coming soon" (`nutrition.tsx`) |
| Two independent meal loggers | **Architectural risk** | `nutrition.tsx` defines a local `LogMealSheet` (presets/foods/templates) *and* Home imports a different `LogMealSheet` from `popups/quick-popups.tsx` (photo + manual only). Features and validation differ between entry points. |
| Deep Dive Quality/Timing/Insights | **Placeholder** | All `PlannedFeatureCard`s (`nutrition.tsx:246-300`) |
| Macro trend chart | Implemented | `macro-trend-chart.tsx`, covered by `tests/e2e/macro-trends.spec.ts` |

## 5. Training

| Feature | Status | Evidence |
|---|---|---|
| Daily training view, quick start (blank/templates/library) | Implemented | `views/training.tsx:DailyTrainingView` |
| Programs & templates (starter + custom), template editor | Implemented | `training-program.tsx`, `workout-template-editor.tsx`, `lib/training-routines.ts` |
| Cardio logging | Implemented | `CardioSection`, `CardioSheet` |
| Workout history, filters, detail sheet | Implemented | `HistorySection` |
| Workout history editing/deleting with concurrency check | Implemented | `replaceSavedWorkout` (`lib/fitcore-data.ts`) |
| "Last workout" card | **Minor defect** | Uses `state.workouts[state.workouts.length - 1]` (`training.tsx:125`) instead of max `startedAt`; imports/edits can reorder |
| Strength / PR / performance tabs | Implemented | `workout-personal-records.ts`, `training-detail-metrics.ts` |
| Training Deep Dive "Insights" | **Placeholder** | Single `PlannedFeatureCard` |
| Dead components | **Maintenance risk** | `WorkoutsTab`, `ActiveWorkoutSubtab`, `LogWorkoutSubtab` in `training.tsx` are never rendered (0 references); `CardLikeLogMeal` in `nutrition.tsx` likewise unused |

## 6. Active Workout

| Feature | Status | Evidence |
|---|---|---|
| Session lifecycle (start/resume/finish/discard), rest timer, per-set logging, tags | Implemented | `active-workout.tsx`, `active-workout-state.ts`; E2E `active-workout-lifecycle-smoke`, `workout-rest-timer` |
| Persistence failure handling with retry/keep/backup | Implemented (strong) | `commitEdit`, pending-edit banner, `WorkoutBackupButton` |
| Finish summary, PRs, goals, note-driven fatigue suggestions, template save | Implemented | `FinishWorkoutSheet` |
| Exercise picker, substitutions, custom exercises, plate calculator | Implemented | `ExercisePicker`, `CustomExerciseSheet`, `PlateCalculatorSheet` |
| Finish with zero completed sets | **Missing validation (possible)** | `confirmSave` accepts an empty workout (no minimum) — confirm product intent before treating as a bug |
| Voice logging | **Gated** | Jarvis mic button disabled with title "Voice mode - coming in Phase 6" (`jarvis-panel.tsx:480`); bottom-nav mic permanently disabled (`bottom-nav.tsx` "Voice input unavailable") |

## 7. Stats / Progress

| Feature | Status | Evidence |
|---|---|---|
| Daily weigh-in form | Implemented, **validation gap** | `progress.tsx:DailyViewContent.submitWeighIn` rejects 0/NaN only; negative values accepted |
| Weight trend + context sheet | Implemented | `Sparkline`, `bodyweightDelta` |
| Goal progress cards/sheet | Implemented | `state.goals` |
| Momentum card/sheet | Implemented | `momentumScore` |
| Progress photos (add/list/view/delete) | Implemented, **storage risk** | `PhotoSheet`, `PhotosSection`; base64 stored in the same persisted state |
| Deep Dive Analytics: range chips, volume chart, bodyweight chart, momentum | Implemented | `AnalyticsTab`, `GoalsTab` |
| Metric correlation card | **Placeholder** | Always renders "Needs more data" regardless of data volume (`progress.tsx:705`), with a prose sheet |
| Body measurements / composition / visual comparison | **Placeholder** | `PlannedFeatureCard`s in `BodyTab` |
| AI progress coach / insight | **Placeholder** | `InsightsTab` |
| Chart claim accuracy | **Copy defect** | Bodyweight sheet says the "trend line filters out daily noise"; the chart plots raw weigh-ins (`Sparkline(points = raw weights)`) |

## 8. Settings & Integrations

| Feature | Status | Evidence |
|---|---|---|
| Subtab layout (Profile / Preferences / Data / Integrations) | Implemented | `views/settings.tsx` |
| Bodyweight + days/week editing with validation | Implemented | `onBlur` guards |
| Split, experience, units | Implemented | `updateProfile` |
| Display name / DOB / height | **Placeholder** | Disabled inputs labelled "Planned" (`settings.tsx:244-262`), even though `profile.name` exists and is displayed on Home |
| Reminders (workout/weigh-in/lunch) | **Disconnected** | Toggles persist booleans but nothing schedules or requests notification permission (no `Notification` usage in `src`). Section is labelled "Active". Label "Weigh-in 9 PM" contradicts default `weighInTime: "09:00"` (`settings.tsx:478`, `types.ts:442`) |
| Demo data toggle | Implemented as toggle, **partial effect** (see §9) | `state.demoMode` |
| Jarvis settings + audit activity | Implemented | `jarvis/settings-card.tsx`, `activity-view.tsx` |
| WHOOP connect/sync UI | Implemented (in-progress area) | `whoop-settings.tsx`, `lib/whoop/*`; E2E `whoop-*` specs |
| Export / import / reset | Implemented | `exportJson`, `parseFitCoreImport`, `ConfirmDialog` |
| Privacy policy link | Implemented | `/privacy` route |
| Many "Planned"/"Presentational only" cards | **Placeholder** | Health context, emergency profile, Apple Watch, coach/Pro/Business, terms |
| Section scroll on subtab change | **Broken** | `changeSubtab` calls `getElementById(id)?.scrollIntoView` while four cards share `id="profile"` (also 3×`data`, 3×`integrations`, 2×`preferences`) — duplicate ids, jumps to first match (`settings.tsx:238-402, 607-811`) |

## 9. Demo mode (cross-cutting)

`StoreProvider` exposes `state` (real) and `view` (demo-merged when `demoMode`). `view` is consumed by Home, GoalsPanel, recent activity and the score/macro/heatmap popups. **Training, Nutrition, Recovery, Progress and Settings read `state`** (`grep "const { state" src/components/app/views/*.tsx`), so demo mode does **not** populate their charts, histories or counters — contradicting the Settings copy "Fills charts with sample data".

## 10. WHOOP integration

| Feature | Status | Evidence |
|---|---|---|
| OAuth start/callback, token vault, sync coordinator, webhook, V2 records | Implemented (active development) | `lib/whoop/*`, `routes/api/whoop/$action.ts`, `db/whoop/*.sql` |
| Missing/partial measurements | Implemented well | `dashboard.ts` `measurement()` returns `null`; `measurementState()` distinguishes calibrating/pending/scored/unavailable. UI must render `null`, and does in `whoop-dashboard.tsx` |
| Snapshot subscription in React | Implemented | `hooks/use-whoop-snapshot.ts` (`useSyncExternalStore`) |
| Jarvis isolation from WHOOP when not shared | Implemented | `whoop-jarvis-isolation.spec.ts`, `jarvis-context.server.ts` |
| Unit baseline | **Fragile test** | `tests/unit/whoop-background.test.ts:11` times out at 5 s (took 10.8 s in this run) |

## 11. Jarvis / AI

| Feature | Status | Evidence |
|---|---|---|
| Chat panel, tool cards, confirmations, audit log, undo snackbar | Implemented (active development) | `jarvis/jarvis-panel.tsx`, `lib/jarvis/*` |
| Deterministic text commands and record actions | Implemented | `text-commands.ts`, `record-actions.ts`; unit + E2E coverage |
| Provider policy (Groq; Gemini personal data blocked) | Implemented | `provider-models.ts` `JARVIS_GEMINI_PERSONAL_DATA_ENABLED = false` |
| Voice input / spoken responses | **Gated** | Mic disabled ("coming in Phase 6"); `jarvisSettings.voiceModeEnabled`/`spokenResponses` default false |
| Photo nutrition estimation | **Gated** | `JARVIS_PHOTO_ANALYSIS_ENABLED = false` with explicit comment "Photo analysis reopens with explicit image review and consent in the photo milestone" |
| "Deep Dive" AI coach summaries | **Placeholder** | Home/Training/Progress AI cards marked "Planned" |

## 12. Data layer

| Feature | Status | Evidence |
|---|---|---|
| Revisioned, checksummed persistence with conflict/reload detection | Implemented (strong) | `runtime-persistence.ts`, `store-transaction.ts`, `atomic-persistence.ts`; `tests/unit/store-transaction.test.ts` etc. |
| Legacy key migration (`fitcore.v1`/`.state`/`.data`/`.v0`) | Implemented | `runtime-persistence.ts:155-160, 701` |
| Import validation / repair planning / backup | Implemented | `data-import-inspection.ts`, `data-repair-plan.ts`, `data-backup.ts` |
| Storage backend | localStorage only | `runtime-persistence.ts:browserStorage`; no IndexedDB, so ~5 MB total budget shared with base64 photos |
| Cross-tab sync | **Not found** | `persist.ts` syncs only `fitcore.ui.*` UI prefs across tabs; the main state has no `storage` event listener — a second tab can hit revision conflicts (handled as errors, but not live-synced) |

---

## Summary of the largest gaps

1. Demo mode is only half-connected (Home yes, other screens no).
2. Nutrition has two different loggers with different rules and persistence behaviour.
3. Unreported macros silently count as zero in goals/scores while the UI says "unreported".
4. Progress photos share the same ~5 MB localStorage budget as all fitness data.
5. Several controls are presented as active but do nothing (reminders, steps goal, hydration, photo tile).
6. Stats and Recovery contain large "Planned" surfaces that read as finished features to a casual user.
7. Unit tests exist but are not part of `ci.yml`, have no npm script, and have one failing baseline test.

Detailed defect reproduction and fixes: `FITCORE_BUG_REPORT.md`.
Screen-level UX recommendations: `FITCORE_UI_RECOMMENDATIONS.md`.
Test gaps and scenarios: `FITCORE_TEST_PLAN.md`.
Sequenced work plan: `FITCORE_PRIORITY_ROADMAP.md`.
