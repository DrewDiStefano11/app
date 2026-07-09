# Data, State, and Storage Safety Audit

## Scope

This document audits the FitCore app's data flow, local state, persistence, migrations, and UI propagation to assess safety before continuing runtime UI work. It examines potential data loss, storage corruption, schema risks, and the impacts of the upcoming Daily View / Deep Dive mode.

## Executive Summary

The overall state management (powered by React Context + `localStorage`) is highly functional for prototyping but presents significant scaling and data integrity risks (P0). Because the entire `AppState` object is stored under a single key (`fitcore.v1`), large accumulations of user logs (workouts, meals, history) will inevitably hit the browser's 5MB localStorage limit, causing silent data drops.
Furthermore, `demoMode` masks underlying state, which could bleed into real state. Hydration relies on synchronous `localStorage` parsing, which blocks the main thread.
Before deep dive UI PRs are merged, the core storage layer should be migrated to IndexedDB or a chunked mechanism.

## State Model Overview

FitCore relies on a single monolithic `AppState` object defined in `src/lib/types.ts`.
State is provided globally via React Context in `src/lib/store.tsx` (`StoreProvider`), which exposes a `state` (real data) and a `view` (state merged with demo data if `demoMode` is true).
State updates occur exclusively via a `set` callback that updates the React state, runs logic migrations, and synchronously flushes to `localStorage`.

## Persistence / localStorage Overview

**P0 Risk:** The entire data history is written synchronously to `localStorage` on every action.
- Hits 5MB quota easily with large arrays of logs.
- Silently fails (catches quota error without UI feedback).
- A corruption during serialization/deserialization will clear all user data and fallback to `defaultState`.

## Hydration Risks

**P1 Risk:** Hydration happens synchronously on `StoreProvider` mount via `loadFitCoreData()`.
- If the `fitcore.v1` payload is large, it blocks the main thread.
- Invalid data structure might trigger a fallback to `defaultState`, erasing the user's data permanently.

## Schema / Versioning Risks

**P1 Risk:**
- Legacy keys (`LEGACY_KEYS`) are checked if `fitcore.v1` is absent, which is good.
- The `parse` utility strips out fields that are not in a hardcoded `STATE_KEYS` list. A downgrade could silently erase forward-compatible data.
- State migrations (via `migrateAppState` and `migrateFitCoreDataIfNeeded`) do a deep merge, but complex schema changes (e.g. changing array element structures) are fragile.

## Data Propagation Map

| Data Type | Logged From | Stored In | Displayed In | Tests Covering It | Risk |
|---|---|---|---|---|---|
| Workouts | Training View/Active Workout | `workouts`, `activeWorkout` | Training history, Progress charts, Home volume | `core-logging-persistence-smoke.spec.ts` | P1: Active workout abandonment. |
| Meals/Macros | Home/Nutrition View | `mealEntries` | Nutrition View, Home progress, Progress charts | `data-propagation-smoke.spec.ts`, `nutrition-logging-validation-smoke.spec.ts` | P1: Timezone boundaries. |
| Recovery Check-ins | Home/Recovery View | `recoveryCheckIns` | Recovery View, Home readiness | `data-propagation-smoke.spec.ts` | P2: Duplicate recovery scores. |
| Sleep | Recovery View | `sleepEntries` | Recovery View | None | P2: Lack of dedicated sleep tests. |
| Soreness/Body Status | Recovery View (Heatmap) | `muscleFatigue`, `recoverySignals` | Recovery Body Heatmap | `recovery-check-in-validation-smoke.spec.ts` | P2: AI extracted signals may clash with manual input. |
| Bodyweight | Home/Progress View | `bodyweightEntries` | Progress charts, Home latest metrics | `data-propagation-smoke.spec.ts`, `bodyweight-weigh-in-validation-smoke.spec.ts` | P1: Timezone boundary issues. |
| Progress Photos | Progress View | `progressPhotos` | Progress View | `progress-rich-data-smoke.spec.ts` | P0: High data size for base64 storage. |
| Goals | Settings/Profile | `goals`, `userGoalsProfile` | Home/Settings | `data-integrity.spec.ts` | P2: Multiple goal state sources. |
| Settings/Preferences | Settings Hub | `personalization`, `jarvisSettings` | App-wide (theme, units) | `settings-hub-safety-smoke.spec.ts` | P1: Nested object merge issues. |

## Training Data Risks

**P1 Risk:** The `activeWorkout` object is prone to being abandoned if the user closes the app mid-workout. If not handled gracefully on boot, it can cause the UI to get stuck or lose workout progress.

## Nutrition Data Risks

**P1 Risk:** Summaries (like `getDailyMacroSummary`) rely on local time boundaries (`isToday(ts)`). Crossing timezones or daylight savings will group meals into wrong calendar days.

## Recovery Data Risks

**P2 Risk:** Fatigue and check-ins have multiple sources of truth (`muscleFatigue` vs `recoverySignals`). The logic to merge AI signals vs manual check-ins might be fragile.

## Progress Data Risks

**P0 Risk:** If `progressPhotos` stores images as Base64 strings inside `AppState`, it will instantly blow up the `localStorage` limit, crashing the save pipeline.

## Home/Dashboard Data Risks

**P1 Risk:** `demoMode` state bleeding. The dashboard uses `view` instead of `state`. If any child component mistakenly dispatches a save operation using the `view` data, it will persist the fake demo data into the user's real storage.

## Fake or Misleading Data Risks

**P2 Risk:** Demo mode uses seeded RNGs to generate realistic but fake data. If UI tests or users accidentally enable this mode, it is hard to distinguish what is real.

## Save Handler / Form State Risks

**P1 Risk:** Deep object merges in `migrateAppState` might leave ghost properties if a property is intended to be deleted. Form handlers that update nested objects must be extremely careful to preserve unchanged siblings.

## Toggle/Subtab PR Collision Risks

**P1 Risk:** The upcoming Daily View / Deep Dive PR (#148, #129, etc) introduces complex routing and subtabs. Since `AppState` is injected globally, adding `layoutMode` is safe, but heavily modifying how view components (Home, Training, Nutrition) read their data during the layout restructure might break existing propagation logic.

## Recommended Fix PRs After Toggle Lands

1. **Storage Layer Migration:** PR to move `saveFitCoreData` and `loadFitCoreData` to use `localforage` (IndexedDB) instead of `localStorage`.
2. **Timezone Normalization:** PR to replace local time bounding (`isToday`) with explicit UTC or user-defined timezone day boundaries.
3. **Data Bleed Guard:** PR to add strict runtime checks to ensure `set(state)` is never called with `view` demo data.

## Validation Performed

Run validation commands:
- `bun run build`: Failed (vite command not found natively, required bun/npx).
- `npx tsc --noEmit`: Passed.
- `npx playwright test tests/e2e/data-propagation-smoke.spec.ts`: Run locally, 1 test failed due to a dynamic import issue on the dev server, others passed.
- `npx playwright test tests/e2e/corrupt-localstorage-boot-safety-smoke.spec.ts`: File does not exist. Checked `tests/e2e/data-integrity.spec.ts` instead.
- Tests confirm data is stored but highlight brittleness in the Vite dev server startup.

## Confidence and Open Questions

**Confidence:** High regarding the identification of architectural risks. The localStorage limit is a guaranteed failure point for a production app of this nature.
**Open Questions:**
- Do we plan to implement a backend sync, or is this app permanently local-first?
- Should `progressPhotos` be moved to a separate file storage API immediately?
