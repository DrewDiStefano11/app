# State/View Usage Map

## Purpose

This audit maps how the current FitCore app uses `useStore()`, persisted `state`, derived/demo `view`, mutation helpers, persistence helpers, and demo-mode behavior. It is documentation only. It does not change app behavior, refactor code, or alter any runtime files.

The goal is to make the current state/view split visible before cleanup work, especially around demo-mode behavior, real-user-data separation, AI/Jarvis data access, graph/dashboard data, and mutation paths.

## Executive Summary

FitCore has a clear architectural separation in `src/lib/store.tsx`: persisted app data lives in `state`, while `view` is an effective display state that becomes `buildDemoState(state)` when `state.demoMode` is true. Persistence uses `localStorage` through `src/lib/fitcore-data.ts`, with the primary key `fitcore.v1`.

Usage is mixed. Home, recent activity, goals, dashboard popups, and score/readiness/macro/volume sheets mostly read `view`, so they can display demo-derived data. Training, Nutrition, Recovery, Progress, Settings, active workout, and Jarvis tool handlers mostly read and write persisted `state` directly. That means some screens can show real persisted data while the Home dashboard shows demo-augmented data.

The highest-risk areas are mutation paths that call `set(...)` while demo mode is active, because `set` always updates persisted `state`; Jarvis tools, quick action sheets, active workout flows, nutrition/recovery/progress forms, and settings all appear able to write during demo mode. The code does not show a centralized demo-mode write guard.

Recommended next steps are to document the intended convention, add tests that lock current behavior, and only then standardize display reads and add mutation guards if product direction requires demo mode to be display-only.

## Source Files Reviewed

| File path | Exists | What was inspected | Relevance to state/view/demo-mode behavior |
|---|---:|---|---|
| `src/lib/store.tsx` | Yes | Store provider, `state`, `view`, `set`, `reset`, import/export | Defines persisted state, derived demo view, and mutation boundary |
| `src/lib/fitcore-data.ts` | Yes | Storage key, load/save/import validation, migrations, log helpers, AI context | Defines `fitcore.v1`, legacy keys, projected logs, provenance, summaries |
| `src/lib/persist.ts` | Yes | `usePersistentState`, graph preference keys | Persists UI/graph preferences under `fitcore.ui.*`, outside `AppState` |
| `src/lib/demo-data.ts` | Yes | `buildDemoState(base)` | Merges deterministic demo workouts, meals, bodyweight, sleep, check-ins, PRs over real state |
| `src/lib/ai.functions.ts` | Yes | Server AI functions and diagnostics surface | Provides AI calls; app data reads/writes occur in callers/tools, not directly here |
| `src/lib/jarvis/tools.ts` | Yes | Tool specs, read handlers, write handlers, audit undo | Central Jarvis read/write path; reads persisted `state` and writes via `set` |
| `src/routes/index.tsx` | Yes | Store mount, route-level state/view use, AI context | Builds Jarvis prompt context from `view`, but active workout/onboarding from `state` |
| `src/components/app/views/home.tsx` | Yes | Dashboard cards, quick actions, popups | Mostly reads `view`; some settings/profile/targets/template reads from `state` |
| `src/components/app/views/training.tsx` | Yes | Training tabs, workout/cardio/history/performance | Reads and mutates persisted `state`; performance graphs use `state` |
| `src/components/app/views/nutrition.tsx` | Yes | Meal summaries/history/goals/log sheet | Reads and mutates persisted `state`; does not use `view` |
| `src/components/app/views/recovery.tsx` | Yes | Readiness, muscle status, trends, check-in/sleep sheets | Reads and mutates persisted `state`; does not use `view` |
| `src/components/app/views/progress.tsx` | Yes | Score, bodyweight, photos, analytics | Reads and mutates persisted `state`; does not use `view` |
| `src/components/app/active-workout.tsx` | Yes | Active workout editing, completion, custom exercises, PRs | Reads/writes persisted `state`; uses `demoMode` only for sample previous-set placeholders |
| `src/components/app/jarvis/jarvis-panel.tsx` | Yes | AI prompt, tool call execution, confirmation flow | Prompt receives route-supplied `contextSummary`; tools execute against persisted `state` |
| `src/components/app/jarvis/activity-view.tsx` | Yes | Jarvis audit display and undo | Reads `state.jarvisAudit`; undo mutates persisted state via `undoAuditEntry` |
| `src/components/app/jarvis/goals-profile-card.tsx` | Yes | User goal/profile editing | Reads/writes `state.userGoalsProfile` |
| `src/components/app/jarvis/settings-card.tsx` | Yes | Jarvis settings, diagnostics, clears | Reads/writes `state.jarvisSettings`, `jarvisLearning`, `jarvisAudit`; also reads localStorage diagnostics |
| `src/components/app/recent-activity.tsx` | Yes | Recent activity card | Reads `view` and projects logs from effective data |
| `src/components/app/goals-panel.tsx` | Yes | Home goals card and customization | Reads both `view` and `state`; stores selected UI goals via `usePersistentState` |
| `src/components/app/popups/volume-popup.tsx` | Yes | Volume details | Reads `view`; graph prefs via `usePersistentState` |
| `src/components/app/popups/macro-popup.tsx` | Yes | Macro details | Reads `view` for meals and `state` for targets |
| `src/components/app/popups/readiness-popup.tsx` | Yes | Readiness/recovery detail | Reads `view` |
| `src/components/app/popups/score-popup.tsx` | Yes | FitCore score detail | Reads `view` |
| `src/components/app/popups/heatmap-popup.tsx` | Yes | Heatmap detail | Reads `view` |
| `src/components/app/popups/muscle-popup.tsx` | Yes | Muscle detail | Reads `view` |
| `src/components/app/popups/momentum-popup.tsx` | Yes | Momentum detail | No `useStore()`; receives computed momentum from Home |
| `src/components/app/popups/start-workout-popup.tsx` | Yes | Start workout quick sheet | Writes `state.activeWorkout` via `set` |
| `src/components/app/popups/quick-popups.tsx` | Yes | Log meal, check-in, weigh-in sheets | Writes meals, check-ins, sleep entries, bodyweight, goals via `set` |
| `src/components/app/views/settings.tsx` | Yes | Profile, demo toggle, import/export, reset | Reads/writes persisted `state`; toggles `demoMode`; import/export uses persisted state |
| `src/components/app/views/onboarding.tsx` | Yes | Initial setup | Writes profile, targets, `onboardingComplete` |

No requested file from the prompt was missing in the current `origin/main` worktree. Popup/sheet components that log, edit, display, or mutate user data were also inspected.

## Store Architecture Summary

`src/lib/store.tsx` initializes `state` to `defaultState`, then hydrates on mount with `loadFitCoreData(defaultState)` and `migrateAppState(...)`. On hydration and on later state changes, it saves through `saveFitCoreData(state)`.

Persisted app state is saved in browser `localStorage` by `src/lib/fitcore-data.ts` under `FITCORE_STORAGE_KEY = "fitcore.v1"`. The loader also checks legacy keys: `fitcore.state`, `fitcore.data`, `focus-lift-data`, and `fitcore.v0`.

`view` is created in `src/lib/store.tsx`:

```ts
const view = useMemo(() => state.demoMode ? migrateFitCoreDataIfNeeded(buildDemoState(state)) : state, [state]);
```

When demo mode is off, `view` is the same object as `state`. When demo mode is on, `view` becomes a migrated demo-augmented state based on real `state`. `src/lib/demo-data.ts` prepends deterministic demo workouts, meals, bodyweight entries, sleep entries, recovery check-ins, and PRs while preserving the base state arrays.

Mutations are performed through `set((s) => nextState)`, `reset()`, and `importJson(...)` from `useStore()`. The central `set` wrapper migrates the next app state and saves it. There is no observed guard in `set` that blocks writes when `state.demoMode` is true.

`src/lib/persist.ts` is a separate persistence helper for UI preferences, not core `AppState`. It stores values under `fitcore.ui.${key}` and syncs across component instances/tabs. Current graph keys include heatmap, volume, and macro preference keys.

Import/export in `src/lib/store.tsx` operates on persisted `state`, not `view`. Therefore demo-generated entries do not appear to be exported unless similar entries were written into persisted state through a mutation path.

## State vs View Definitions

| Term | Observed meaning |
|---|---|
| `state` | Persisted `AppState` loaded from defaults/localStorage/import and saved to `fitcore.v1`. It is the write target for `set`, Jarvis tools, forms, active workouts, settings, import, and reset. |
| `view` | Effective read model returned by `useStore()`. It equals `state` when demo mode is off. It equals migrated `buildDemoState(state)` when `state.demoMode` is true. |
| Mutation helpers | The `set`, `reset`, `importJson`, and domain-specific helpers that call `set`, including Jarvis `runTool(...)`, quick sheets, active workout handlers, and log helpers. |
| Demo mode | A boolean at `state.demoMode`. It changes the derived `view` used by some dashboard surfaces. It is not observed to disable `set` or route mutations into a sandbox. |
| Persisted user data | Data stored in `state` and saved to localStorage, including workouts, meals, bodyweight, recovery data, photos, settings, goals, Jarvis audit/learning, and active workout. |
| Derived display data | Demo-augmented `view`, projected summaries/logs from `fitcore-data.ts`, analytics derived from `analytics.ts`/`analytics-extra.ts`, and UI preference state from `persist.ts`. |

The code makes the `state`/`view` distinction explicit in `src/lib/store.tsx`, but the consumer convention is not uniformly applied across screens.

## useStore Consumer Inventory

| File path | Reads `state` | Reads `view` | Uses mutation helpers | Writes data | Domain | Demo-mode risk | Notes |
|---|---:|---:|---:|---:|---|---|---|
| `src/routes/index.tsx` | Yes | Yes | No | No | Other | Medium | Uses `state` for onboarding/active workout and `view` for AI context. |
| `src/lib/store.tsx` | Yes | Yes | Yes | Yes | Other | High | Defines `set`; no observed demo write guard. |
| `src/components/app/views/home.tsx` | Yes | Yes | No | No | Home | Medium | Dashboard metrics read `view`; profile/targets/templates/demo badge read `state`. Opens mutating sheets. |
| `src/components/app/recent-activity.tsx` | No | Yes | No | No | Home | Low | Recent activity derives from `view`. |
| `src/components/app/goals-panel.tsx` | Yes | Yes | No | No | Home | Medium | Goal progress uses `view`; targets/profile use `state`; UI goal choices use `fitcore.ui.*`. |
| `src/components/app/views/training.tsx` | Yes | No | Yes | Yes | Training | High | Reads/writes persisted workouts, active workout, cardio, PR-related display. |
| `src/components/app/active-workout.tsx` | Yes | No | Yes | Yes | Training | High | Active workout edits and completion write persisted state. Demo only affects sample previous-set placeholders. |
| `src/components/app/views/nutrition.tsx` | Yes | No | Yes | Yes | Nutrition | High | Summaries/history/goals/logging all use persisted `state`. |
| `src/components/app/views/recovery.tsx` | Yes | No | Yes | Yes | Recovery | High | Readiness/trends/muscle status use persisted `state`; check-in/sleep/fatigue writes persist. |
| `src/components/app/views/progress.tsx` | Yes | No | Yes | Yes | Progress | High | Score/body/analytics/photos all use persisted `state`; weigh-in/photo delete/add writes persist. |
| `src/components/app/views/settings.tsx` | Yes | No | Yes | Yes | Settings | High | Profile/reminders/demo/import/export/reset mutate persisted state. |
| `src/components/app/views/onboarding.tsx` | Yes | No | Yes | Yes | Settings | Low | Initial onboarding writes profile/targets/completion before normal app use. |
| `src/components/app/jarvis/jarvis-panel.tsx` | Yes | No | Yes | Yes | Jarvis | High | Tool execution uses `stateRef.current` and `set`; prompt context is supplied from route `view`. |
| `src/components/app/jarvis/activity-view.tsx` | Yes | No | Yes | Yes | Jarvis | High | Undo actions mutate persisted state. |
| `src/components/app/jarvis/goals-profile-card.tsx` | Yes | No | Yes | Yes | Jarvis | Medium | Writes `userGoalsProfile`. |
| `src/components/app/jarvis/settings-card.tsx` | Yes | No | Yes | Yes | Jarvis | Medium | Writes Jarvis settings/learning/audit; local API-key storage is separate. |
| `src/components/app/popups/volume-popup.tsx` | No | Yes | No | No | Popup | Low | Graphs read demo-aware `view`; graph prefs persist separately. |
| `src/components/app/popups/macro-popup.tsx` | Yes | Yes | No | No | Popup | Medium | Meals from `view`; targets from persisted `state`. |
| `src/components/app/popups/readiness-popup.tsx` | No | Yes | No | No | Popup | Low | Reads demo-aware sleep/check-ins. |
| `src/components/app/popups/score-popup.tsx` | No | Yes | No | No | Popup | Low | Reads score drivers from `view`. |
| `src/components/app/popups/heatmap-popup.tsx` | No | Yes | No | No | Popup | Low | Reads heatmap from `view`. |
| `src/components/app/popups/muscle-popup.tsx` | No | Yes | No | No | Popup | Low | Reads muscle stats from `view`. |
| `src/components/app/popups/start-workout-popup.tsx` | No | No | Yes | Yes | Popup | High | Starts persisted active workout from Home. |
| `src/components/app/popups/quick-popups.tsx` | Yes | No | Yes | Yes | Popup | High | Logs meal/check-in/sleep/weigh-in directly to persisted state. |

## View-by-View Findings

### Home

Home is mostly demo-aware. `src/components/app/views/home.tsx` reads both `view` and `state`; score, readiness, recovery, momentum, streak, muscle map, meals, week volume, best muscle, daily target completion, and volume preview use `view`. The demo badge, athlete name, nutrition targets, assigned workout, and workout templates use `state`.

`src/components/app/recent-activity.tsx` reads `view`, so recent activity can show demo-projected logs. `src/components/app/goals-panel.tsx` reads progress from `view` but targets/profile from `state`.

Home also opens mutation sheets: start workout, log meal, check-in, and weigh-in. Those sheet implementations write persisted `state`, so demo mode does not appear to make Home purely display-only.

### Training

Training appears to bypass demo-mode display data. `src/components/app/views/training.tsx` uses persisted `state` for active workout detection, today's workouts, last workout, cardio, history, performance graphs, PRs, and muscle balance. It starts active workouts, logs cardio, deletes cardio, and deletes workouts through `set`.

`src/components/app/active-workout.tsx` also uses persisted `state` throughout. It updates `activeWorkout`, saves custom exercises, discards active workouts, finishes workouts into `workouts`, updates PRs/goals/muscle fatigue, and reads previous performance from `state.workouts`. The only demo-specific logic observed there is `makeDemoPrevSets(...)`, which supplies sample previous-set placeholders when `state.demoMode` is true and no real previous sets exist.

This creates a likely inconsistency: Home can show demo workouts/volume while Training history/performance can show only real persisted workouts.

### Nutrition

Nutrition appears to bypass demo-mode display data. `src/components/app/views/nutrition.tsx` uses persisted `state.mealEntries` and `state.nutritionTargets` for today's summary, history, goals, and meal logging. It logs template/food/custom meals and deletes meals via `set`.

Home macro cards and `src/components/app/popups/macro-popup.tsx` read meal entries from `view`, so demo mode can show populated macros on Home while the Nutrition screen may show empty or real-only meal history.

The AI/camera estimate path in `src/components/app/popups/quick-popups.tsx` calls `estimateMealMacros(...)`, fills local form state, and saves the reviewed meal into persisted `state.mealEntries`.

### Recovery

Recovery appears to bypass demo-mode display data. `src/components/app/views/recovery.tsx` computes readiness from persisted `state.recoveryCheckIns` and `state.sleepEntries`, uses `muscleMap(state, "recovery")`, and displays sleep/check-in trends from persisted state.

It mutates persisted `recoveryCheckIns`, `sleepEntries`, and `muscleFatigue`. Home readiness/recovery detail sheets use `view`, so demo mode can make Home look populated while the Recovery view remains real-only.

### Progress

Progress appears to bypass demo-mode display data. `src/components/app/views/progress.tsx` uses persisted `state` for FitCore score, bodyweight trend, goals, last workout, analytics volume, photos, and weigh-ins. It writes bodyweight entries, profile bodyweight, bodyweight goals, progress photos, and deletes entries/photos through `set`.

Because Home score/progress cards use `view`, demo mode can show a richer dashboard than Progress. Graph consistency should be tested before changing the read source.

### AI/Jarvis

AI/Jarvis has a split data source. `src/routes/index.tsx` builds `contextSummary = buildAICoachContext(view, section)`, so the system prompt can include demo-augmented data. `src/components/app/jarvis/jarvis-panel.tsx` separately passes `stateRef.current` into `runTool(...)`, and `src/lib/jarvis/tools.ts` handlers read and write persisted `state`.

This means Jarvis conversational context can reflect `view` while tool reads such as `getTodaySummary`, `getNutritionStatus`, `getTrainingStatus`, `getRecoveryStatus`, `getProgressTrends`, and `getDailyDecision` use persisted state. Mutating tools write persisted state via `set`.

### Popups and Sheets

Display detail popups are mostly demo-aware: volume, score, readiness, heatmap, muscle, and macro detail sheets read `view` for displayed data. `macro-popup.tsx` also reads persisted `state.nutritionTargets`.

Mutation sheets are persisted-state writers: `quick-popups.tsx` logs meals, check-ins, optional sleep, and weigh-ins; `start-workout-popup.tsx` starts an active workout; Training/Nutrition/Recovery/Progress local sheets also write persisted state. No popup/sheet mutation path inspected checks `state.demoMode` before writing.

## Mutation Path Map

| File/function | What it writes | User data affected | Can run during demo mode | Appears guarded against demo-mode writes | Risk level | Notes |
|---|---|---|---:|---:|---|---|
| `src/lib/store.tsx` `set` | Any returned `AppState` | All persisted app data | Yes | No | High | Central mutation boundary; saves migrated next state. |
| `src/lib/store.tsx` `reset` | `defaultState` | All persisted app data | Yes | No | High | Settings reset calls this. |
| `src/lib/store.tsx` `importJson` | Imported/migrated state | All persisted app data | Yes | No | High | Imports into persisted state, not demo sandbox. |
| `src/components/app/views/settings.tsx` demo toggle | `demoMode` | App display mode | Yes | N/A | Low | Toggles persisted boolean; no write sandbox. |
| `src/components/app/views/settings.tsx` profile/reminders | `profile`, `reminders` | Profile/reminder data | Yes | No | Medium | Direct persisted state edits. |
| `src/components/app/views/onboarding.tsx` finish | `profile`, `nutritionTargets`, `onboardingComplete` | Setup data | Unlikely normal demo flow | No | Low | Before normal app dashboard. |
| `src/components/app/popups/start-workout-popup.tsx` `startBlank/startTemplate` | `activeWorkout` | Active workout | Yes | No | High | Starts a real active workout from Home demo dashboard. |
| `src/components/app/views/training.tsx` `startBlank/startPlan/startTemplate` | `activeWorkout` | Active workout | Yes | No | High | Training reads real state, but can run while demo mode is enabled. |
| `src/components/app/active-workout.tsx` active workout edits | `activeWorkout` | Exercise/set details, notes, custom exercises | Yes | No | High | All active workout edits persist. |
| `src/components/app/active-workout.tsx` `confirmSave` | `workouts`, `activeWorkout`, `prs`, `goals`, `muscleFatigue` | Completed workout/history/progress | Yes | No | High | Can save a workout created while demo mode is active. |
| `src/components/app/active-workout.tsx` `addCustom` | `customExercises`, `activeWorkout` | Exercise library and active workout | Yes | No | Medium | Custom exercise persists. |
| `src/components/app/views/training.tsx` `CardioSheet.submit` | `cardioEntries` | Cardio history | Yes | No | Medium | Direct persisted write. |
| `src/components/app/views/training.tsx` delete cardio/workout | `cardioEntries`, `workouts` | Training history | Yes | No | High | Destructive persisted deletes. |
| `src/components/app/views/nutrition.tsx` `LogMealSheet.addMeal` | `mealEntries` | Meal log | Yes | No | High | Uses persisted state; duplicated by Home quick sheet. |
| `src/components/app/views/nutrition.tsx` delete meal | `mealEntries` | Meal log | Yes | No | High | Destructive persisted delete. |
| `src/components/app/views/nutrition.tsx` goals save | `nutritionTargets` | Nutrition targets | Yes | No | Medium | Direct persisted target edit. |
| `src/components/app/popups/quick-popups.tsx` `LogMealSheet.save` | `mealEntries` | Meal log | Yes | No | High | AI/photo estimates become real persisted meals after save. |
| `src/components/app/popups/quick-popups.tsx` `CheckInSheet.save` | `recoveryCheckIns`, optional `sleepEntries` | Recovery and sleep | Yes | No | High | Home quick check-in writes real data. |
| `src/components/app/popups/quick-popups.tsx` `WeighInSheet.save` | `bodyweightEntries`, `profile.bodyweightLb`, bodyweight goals | Bodyweight/progress/goals | Yes | No | High | Home quick weigh-in writes real data. |
| `src/components/app/views/recovery.tsx` `CheckInSheet.submit` | `recoveryCheckIns` | Recovery check-ins | Yes | No | High | Direct persisted write. |
| `src/components/app/views/recovery.tsx` `SleepSheet.submit` | `sleepEntries` | Sleep history | Yes | No | Medium | Direct persisted write. |
| `src/components/app/views/recovery.tsx` fatigue controls | `muscleFatigue` | Recovery/muscle status | Yes | No | Medium | Direct persisted write. |
| `src/components/app/views/progress.tsx` `WeightSection.submit` | `bodyweightEntries`, `profile.bodyweightLb`, goals | Bodyweight/progress/goals | Yes | No | High | Direct persisted write. |
| `src/components/app/views/progress.tsx` delete weigh-in | `bodyweightEntries` | Bodyweight history | Yes | No | High | Does not update profile/goal in same delete path. |
| `src/components/app/views/progress.tsx` `PhotoSheet.submit/delete` | `progressPhotos` | Progress photos | Yes | No | High | Stores/deletes image data in persisted state. |
| `src/components/app/jarvis/goals-profile-card.tsx` `upd` | `userGoalsProfile` | Jarvis/user goals profile | Yes | No | Medium | Direct persisted write. |
| `src/components/app/jarvis/settings-card.tsx` `upd/clear` | `jarvisSettings`, `jarvisLearning`, `jarvisAudit` | Jarvis config/history | Yes | No | Medium | Some localStorage key settings are outside `AppState`. |
| `src/components/app/jarvis/activity-view.tsx` undo | Domain entities and `jarvisAudit` | Meals/workouts/check-ins/etc. | Yes | No | High | Calls `undoAuditEntry(...)` against persisted state. |
| `src/lib/jarvis/tools.ts` `updateUserGoalsProfile` | `userGoalsProfile` | Goals/profile | Yes | No | Medium | Requires/uses confirmation depending on permission flow, not demo mode. |
| `src/lib/jarvis/tools.ts` `updateJarvisSettings` | `jarvisSettings` | Jarvis settings | Yes | No | Medium | Persisted app settings. |
| `src/lib/jarvis/tools.ts` `logBodyWeight` | `bodyweightEntries` | Bodyweight | Yes | No | High | Adds provenance/audit. |
| `src/lib/jarvis/tools.ts` `logSupplement` | `supplementLogs` | Supplement log | Yes | No | Medium | Adds provenance/audit. |
| `src/lib/jarvis/tools.ts` `logDailyCheckIn` | `recoveryCheckIns` | Recovery check-ins | Yes | No | High | Adds provenance/audit. |
| `src/lib/jarvis/tools.ts` `saveJarvisLearning` | `jarvisLearning` | Learned preferences | Yes | No | Medium | Controlled by learning setting. |
| `src/lib/jarvis/tools.ts` `logMeal/logUsualMeal` | `mealEntries` | Meal log | Yes | No | High | Low-confidence confirmation exists, but no demo guard. |
| `src/lib/jarvis/tools.ts` `updateMeal/deleteMeal` | `mealEntries`, `jarvisAudit` | Meal log | Yes | No | High | Update/delete persisted meal data. |
| `src/lib/jarvis/tools.ts` `saveUsualMeal` | `userGoalsProfile`, `jarvisLearning` | Usual meals/preferences | Yes | No | Medium | Stores macro preference memory. |
| `src/lib/jarvis/tools.ts` `updateDailyCheckIn` | `recoveryCheckIns` | Recovery check-ins | Yes | No | High | Patches latest persisted check-in. |
| `src/lib/jarvis/tools.ts` `logWorkout` | `workouts` | Workout history | Yes | No | High | Can create real workout from AI. |
| `src/lib/jarvis/tools.ts` `updateWorkout/deleteWorkout` | `workouts`, `jarvisAudit` | Workout history | Yes | No | High | Destructive/update persisted workout. |
| `src/lib/jarvis/tools.ts` `logExerciseSet/updateExerciseSet/deleteExerciseSet` | `activeWorkout` | Active workout sets | Yes | No | High | Mutates persisted active workout. |
| `src/lib/jarvis/tools.ts` `logCardio` | `cardioEntries` | Cardio history | Yes | No | Medium | Adds provenance/audit. |
| `src/lib/jarvis/tools.ts` `updateActiveWorkout/finishActiveWorkout` | `activeWorkout`, `workouts` | Active/completed workouts | Yes | No | High | Can finish active workout into persisted history. |
| `src/lib/jarvis/tools.ts` `saveWorkoutTemplate` | `workoutTemplates` | Templates | Yes | No | Medium | Uses source from persisted workouts or active workout. |
| `src/lib/jarvis/tools.ts` `logWorkoutNote/logWorkoutPainOrSoreness` | Workout notes, `recoveryCheckIns`, `jarvisAudit` | Recovery/training notes | Yes | No | High | Pain/soreness writes a check-in and active workout notes. |
| `src/lib/jarvis/tools.ts` `undoAuditEntry` | Domain entities and audit status | Meals/workouts/check-ins/etc. | Yes | No | High | Reverts persisted Jarvis actions. |
| `src/lib/fitcore-data.ts` `saveLog/updateLog/deleteLog` | Domain arrays when called | Meals, weigh-ins, check-ins, workouts, recovery signals | Unknown from inspected consumers | No | Medium | Generic helpers do not inspect demo mode. |

## Demo Mode Risk Analysis

Demo mode appears to be demo-aware for selected display surfaces, but mutation-safety is uncertain and likely incomplete. `view` protects real data from being overwritten during display derivation because `buildDemoState(state)` returns a derived object; however, any call to `set` writes to persisted `state`.

Risk categories:

| Risk category | Assessment | Evidence |
|---|---|---|
| Inconsistent demo display | High | Home/recent activity/dashboard popups read `view`; Training/Nutrition/Recovery/Progress read `state`. |
| Accidental real-state mutation while demo mode is active | High | `set` has no demo-mode guard; quick sheets, active workout, Jarvis tools, and forms can run while `state.demoMode` is true. |
| Graphs/cards showing different data than detail screens | High | Home volume/macro/readiness cards use `view`; Training/Nutrition/Recovery/Progress graph/detail tabs use `state`. |
| AI context receiving different data than visible UI | Medium/High | Route prompt context uses `buildAICoachContext(view, section)`, but Jarvis tools read persisted `state`. |
| User confusion after toggling demo mode | Medium/High | Turning demo mode off would remove demo-derived display entries while any user-created records saved during demo mode remain persisted. |
| Persistence/import/export complications | Medium | Export uses `state`; demo data is not exported unless similar user/demo-like data has been written through mutation paths. Import can run while demo mode is active and replaces/merges persisted state. |

The strongest evidence is the direct implementation in `src/lib/store.tsx`: `view` is derived conditionally from `state.demoMode`, while `set` always migrates and saves the updater result. No inspected call site checks `state.demoMode` before writing.

## AI and Provenance Implications

`buildAICoachContext(view, section)` can place demo-augmented summaries, recent workouts, nutrition totals, recovery signals, and recent activity into the Jarvis system prompt. In contrast, `runTool(...)` receives `stateRef.current`, so getter tools and mutating tools operate against persisted data.

This affects AI context generation because Jarvis may reason from a context summary that includes demo data, then call tools that see only real user data. It affects user trust if visible Home cards show demo meals/workouts but Jarvis getter responses or tool actions refer to empty/real-only logs.

Jarvis write paths add provenance through `createJarvisProvenance`, `createAiEstimateProvenance`, and `markProvenanceEdited` in `src/lib/fitcore-data.ts`. Confirmed and unconfirmed states are represented in provenance, and low-confidence logs can require confirmation in `runTool(...)`. These confidence/provenance controls are about AI uncertainty and user confirmation, not demo-mode isolation.

`jarvisAudit` records tool activity and enables undo for many entity kinds. Audit trails themselves are persisted state and can be cleared or mutated. If demo-mode writes are later intended to be sandboxed, audit entries, provenance `auditId`s, and undo behavior need to be included in that plan.

Privacy expectations are local-first in Settings copy: data stays on device and backups export persisted state. Demo mode could complicate expectations if AI prompt context includes demo-augmented data, even though persisted export remains real-state only.

## Testing Gaps

| Test | Purpose | Suggested level | Files/features covered | Priority |
|---|---|---|---|---|
| Demo mode display test | Verify Home cards, recent activity, and detail popups use demo-augmented `view` when `demoMode` is true | Integration or Playwright | `store.tsx`, `home.tsx`, dashboard popups, `recent-activity.tsx` | High |
| Demo mode write-guard test | Capture current write behavior or future guard behavior for `set` while demo mode is active | Unit/integration | `store.tsx`, quick sheets, Jarvis tools | High |
| Dashboard vs detail consistency test | Compare Home macro/volume/readiness cards against Nutrition/Training/Recovery detail screens under demo mode | Playwright/manual | Home, Training, Nutrition, Recovery | High |
| Graph consistency test | Verify graph data sources match intended convention for Home popups and Progress/Training/Recovery graphs | Integration/Playwright | `volume-popup.tsx`, `macro-popup.tsx`, `progress.tsx`, `training.tsx`, `recovery.tsx` | High |
| AI context data-source test | Ensure Jarvis prompt context and getter tools use the intended source (`state` or `view`) in demo mode | Unit/integration | `routes/index.tsx`, `jarvis-panel.tsx`, `jarvis/tools.ts`, `fitcore-data.ts` | High |
| Meal mutation tests | Verify manual, template, AI/photo, and Jarvis meal logs update expected state with provenance where applicable | Unit/integration | `nutrition.tsx`, `quick-popups.tsx`, `jarvis/tools.ts` | High |
| Workout mutation tests | Verify active workout start/edit/finish, PR updates, cardio logs, and Jarvis workout tools | Integration | `training.tsx`, `active-workout.tsx`, `start-workout-popup.tsx`, `jarvis/tools.ts` | High |
| Check-in/recovery mutation tests | Verify check-ins, sleep logs, fatigue, pain/soreness notes, and recovery signals | Integration | `recovery.tsx`, `quick-popups.tsx`, `fitcore-data.ts`, `jarvis/tools.ts` | High |
| Persistence reload test | Verify saved state survives reload and `view` is reconstructed rather than persisted as demo data | Integration/Playwright | `store.tsx`, `fitcore-data.ts`, `demo-data.ts` | High |
| Import/export test | Verify backups export persisted `state`, imports validate/merge correctly, and demo mode behavior is explicit | Integration/manual | `settings.tsx`, `store.tsx`, `fitcore-data.ts` | Medium/High |
| Jarvis audit/undo test | Verify audit entries, undo, provenance, and entity restores work with confirmed and unconfirmed writes | Unit/integration | `jarvis/tools.ts`, `activity-view.tsx`, `fitcore-data.ts` | Medium/High |

## Recommended Cleanup Strategy

1. Document the intended state/view convention. Decide which screens should read `view`, which must read persisted `state`, and how demo mode should behave.
2. Add tests around current behavior before changing code. Focus first on demo display, mutation writes during demo mode, dashboard/detail consistency, Jarvis context, and persistence reload.
3. Standardize display reads. If demo mode is meant to be app-wide display data, align Training/Nutrition/Recovery/Progress read paths with that convention. If demo mode is dashboard-only, document that explicitly in UI/product docs.
4. Guard mutation paths if needed. If demo mode should be display-only, centralize the guard near `set` or route writes into a sandbox. Avoid scattered checks until the intended behavior is defined.
5. Align AI context with visible user data. Decide whether Jarvis prompt context and getter tools should use `view`, `state`, or an explicit data-source label in demo mode.
6. Validate persistence/import/export. Confirm backups never include derived demo entries unless a user explicitly created persisted data, and define import behavior when demo mode is active.
7. Only then consider refactoring store structure. Avoid broad store rewrites before tests define the expected user-visible behavior.

## Suggested Future PRs

| PR title | Scope | Files likely touched | Risk level | Validation required | Jules or Codex better | Can run in parallel |
|---|---|---|---|---|---|---:|
| `Document state/view usage convention` | Product/architecture doc defining `state`, `view`, demo writes, and AI source policy | `docs/architecture/*`, maybe `docs/product/*` | Low | Docs review | Codex | Yes |
| `Add demo-mode display consistency tests` | Tests for Home cards/popups/recent activity under demo mode | `tests/e2e/*`, possibly test helpers | Medium | Playwright | Codex | Yes |
| `Add demo-mode mutation guard tests` | Lock current/future behavior for writes while demo mode is active | `tests/e2e/*` or unit tests | Medium | Unit/integration/Playwright | Codex | Yes, after convention |
| `Standardize dashboard data source` | Align Home, Recent Activity, Goals, and popup read conventions | `src/components/app/views/home.tsx`, popups, `goals-panel.tsx` | Medium | Dashboard/detail tests | Codex | No, should follow tests |
| `Audit Jarvis AI context data source` | Decide and test Jarvis prompt vs tool data source | `src/routes/index.tsx`, `src/components/app/jarvis/jarvis-panel.tsx`, `src/lib/jarvis/tools.ts` | High | AI context/tool tests | Codex | No |
| `Align graph data with visible app state` | Make graph/card/detail sources consistent across demo and real modes | Home popups, Training, Recovery, Progress | High | Graph consistency tests | Jules or Codex | No |
| `Add central demo-mode write policy` | Implement display-only guard or sandbox writes if product decides so | `src/lib/store.tsx`, mutation call sites as needed | High | Mutation guard, persistence reload, import/export | Codex | No |
| `Strengthen Jarvis provenance and undo tests` | Test audit/provenance/undo for meals, workouts, check-ins, active sets | `src/lib/jarvis/tools.ts`, tests | Medium | Unit/integration | Codex | Yes |
| `Validate import/export with demo mode` | Ensure backup behavior is explicit and tested | `src/lib/store.tsx`, `src/lib/fitcore-data.ts`, settings tests | Medium | Import/export tests | Codex | Yes, after convention |

## Do Not Change Yet

Do not change these until tests and product/architecture decisions are ready:

- Core store architecture.
- Persistence format.
- Data migrations.
- Jarvis tool writes.
- Demo mode mutation behavior.
- Graph aggregation logic.
- Import/export behavior.
- localStorage-to-IndexedDB migration.

## Open Questions

- Should demo mode be fully display-only?
- Should mutation actions be disabled in demo mode?
- Should mutations in demo mode write to a separate sandbox state?
- Should AI context use `view` or persisted `state` during demo mode?
- Should graph/detail views always use the same source?
- How should import/export behave with demo mode?
- What should happen to active workout state in demo mode?
- Should Settings copy say demo mode affects only dashboards if detail screens continue to read real `state`?
- Should Jarvis disclose when its prompt context includes demo-derived data?
- Should `jarvisAudit` be included in any future demo sandbox, or always remain real/persisted?

## Final Recommendation

The safest next action is to document the intended state/view convention and add focused tests around current demo-mode display, writes, AI context, and dashboard/detail consistency. Do not refactor the store or change mutation behavior until those tests make the desired product behavior explicit.

For the current code, use conservative language: FitCore has a real persisted-state and derived-view separation, but demo-mode write isolation is not proven by the inspected implementation.
