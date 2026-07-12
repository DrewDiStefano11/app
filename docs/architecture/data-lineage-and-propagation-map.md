# FitCore Data Lineage and Propagation Map

## 1. Purpose and Scope
This document provides a definitive map of data lineage in FitCore. Data lineage traces how user-entered and external data flows through the system, distinguishing between raw inputs, normalized intermediate states, derived analytics, and displayed UI values.

Propagation refers to how changes in underlying data stores trigger updates across various UI surfaces and derived metrics. This audit maps existing data flows to ensure analytics integration, logging reliability, UI consistency, and safe future schema extensions. Note that this audit focuses only on the current architecture implementation on the `main` branch and explicitly avoids documenting non-existent or purely theoretical analytics pipelines unless documented as unsupported or planned.

## 2. System Data Flow Overview
The high-level data flow in FitCore typically follows this sequence:

```text
User action or import
→ validation
→ store write
→ persistence
→ normalized state/view
→ analytics
→ UI summaries
→ charts and insights
```

*   **User action or import:** Data is ingested via UI forms (e.g., `BottomSheet` popups) or JSON import functions.
*   **Validation:** Functions like `validateFitCorePayload` in `src/lib/fitcore-data.ts` ensure data integrity.
*   **Store write:** Mutations use `set` inside `src/lib/store.tsx` or specialized reducers like `saveLog` / `updateLog`.
*   **Persistence:** `store.tsx` commits the canonical state to `localStorage` under `fitcore.v1`.
*   **Normalized state/view:** React components consume the context state (`AppState`).
*   **Analytics:** Pure functions in `src/lib/analytics.ts` and `src/lib/analytics-extra.ts` compute metrics from state.
*   **UI summaries:** Components like `HomeView` use these analytics to render overview cards.
*   **Charts and insights:** Detail popups (e.g., `VolumeDetailSheet`, `MacroDetailSheet`) map these analytics into visual components.

## 3. Canonical State and Store Files

| File Path | Responsibility | Exported Types/Functions | State Categories Owned | Persistence Responsibility | Mutation Patterns | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| `src/lib/types.ts` | Schema definitions | `AppState`, `Workout`, `MealEntry`, `RecoveryCheckIn`, etc. | All core domains | N/A | Immutable types | Type mismatches if schema evolves |
| `src/lib/store.tsx` | State context & provider | `StoreProvider`, `useStore`, `todayStart` | Entire AppState | Writes to `localStorage` | Replaces whole state via `set` | React context re-renders on every mutation |
| `src/lib/fitcore-data.ts` | Data rules & migrations | `saveFitCoreData`, `loadFitCoreData`, `saveLog`, `migrateFitCoreDataIfNeeded` | Log types, JSON imports | Handles migration & validations | Immutable partial updates | Storage quota errors, stale data on import |
| `src/lib/persist.ts` | UI state persistence | `usePersistentState`, `GRAPH_PREFS` | Graph modes, display ranges | Writes to `fitcore.ui.*` | Synchronizes tabs via custom events | Desync if keys change or mismatched components |

*Note: Data versioning currently sits at `FITCORE_DATA_VERSION = 4`.*

## 4. Data Classification
*   **User-entered raw data:** Unaltered data provided by forms (e.g., bodyweight, manual meals, workout sets).
*   **Imported data:** Bulk data loaded from JSON, potentially overriding local data.
*   **Wearable data:** Imported or synced logs from external sources (e.g., Apple Health, Whoop), requiring confidence tracking.
*   **Normalized data:** Internal representations mapped to a consistent schema (e.g., all dates are numeric timestamps).
*   **Derived metrics:** Computed values using pure functions (e.g., `fitcoreScore`, `totalVolumeInRange`).
*   **Cached data:** Primarily non-existent natively; state is held in memory and local storage directly.
*   **Presentation-only state:** View toggles (Daily/Deep Dive), popup visibility, held in local component state or `persist.ts`.
*   **Temporary form state:** Buffered form inputs that validate `onBlur` before flushing to the global store.
*   **Sensitive data:** Potential future domains, though currently most health data requires generic local-only treatment.
*   **Unsupported data:** Fields like hydration, sodium, and HRV that are not represented in schema.
*   **Planned data:** Metrics shown with placeholder UIs lacking backend representation.

## 5. Training Data Lineage
*   **Workout template:** Sourced from `WORKOUT_TEMPLATES` in `src/lib/data.ts`.
*   **Active workout:** Writer: `StartWorkoutSheet`; Store field: `AppState.activeWorkout`.
*   **Exercise:** Writer: Workout logging view; validation inside component.
*   **Set:** Writer: Workout logging view (updates rep/weight/completed).
*   **Completed workout:** Writer: `saveLog` / `updateLog`; Store field: `AppState.workouts`.
*   **Cardio entry:** Store field: `AppState.cardioEntries`.
*   **PR:** Writer: Analyzed natively or stored in `AppState.prs`.
*   **Weekly volume:** Computed in `totalVolumeInRange` (analytics).
*   **Muscle load:** Computed in `muscleMap` (analytics).
*   **Training consistency:** Computed in `trainingConsistencyScore`.
*   **Streak:** Computed in `trainingStreak`.
*   **Performance summaries:** Derived via `performanceScore`.

**Propagation:**
Immediate to Training view and Home Command Center via context updates. Deep Dive subtabs dynamically re-fetch from `analytics.ts` selectors.
**Known risks:** Stale active workout buffer if browser is closed forcefully.

## 6. Nutrition Data Lineage
*   **Meal entry:** Writer: `LogMealSheet`; Store field: `AppState.mealEntries`.
*   **Calories, protein, carbohydrates, fat:** Native fields on `MealEntry`.
*   **Fiber:** Optional `fiber?` field on `MealEntry`.
*   **Supplement logs:** Stored in `AppState.supplementLogs`.
*   **Nutrition targets:** Stored in `AppState.nutritionTargets` (cal, pro, carb, fat).

**Explicit Documentations:**
*   **Fiber:** Supported optionally.
*   **Sodium:** Does not exist in schema.
*   **Sugar:** Does not exist in schema.
*   **Hydration:** Does not exist in schema.
*   **Micronutrients:** Does not exist in schema.
*   Missing-data surfaces: Fuel Daily View and Details popups must gracefully fall back without assuming values.

## 7. Recovery and Sleep Data Lineage
*   **Recovery check-in:** Writer: `CheckInSheet`; Store field: `AppState.recoveryCheckIns`.
*   **Energy, soreness, stress, motivation, notes:** Native fields on `RecoveryCheckIn`.
*   **Sleep duration, quality:** Native fields on `SleepEntry` in `AppState.sleepEntries`.
*   **Recovery signals:** Extracted from notes via `extractRecoverySignalsFromNotes` or logged directly; Store field: `AppState.recoverySignals`.
*   **HRV & Resting Heart Rate:** Unsupported.
*   **Readiness:** Computed via `readinessScore` in analytics.

*Separation:* Manually entered data populates the respective stores. Wearable or imported logs carry `provenance` metadata. Derived data is solely calculated at runtime.

## 8. Bodyweight, Body, and Stats Data Lineage
*   **Profile bodyweight:** Stored implicitly as latest entry or profile metric.
*   **Bodyweight entries:** Writer: `WeighInSheet`; Store field: `AppState.bodyweightEntries`.
*   **Target bodyweight:** Handled via goals.
*   **Measurements:** Unsupported beyond basic bodyweight.
*   **Progress photos:** Store field: `AppState.progressPhotos`.
*   **Milestones / Personal records:** Stored in `AppState.prs`.
*   **Stats cards / Deep Dive:** Updates immediately upon bodyweight save.

*Propagation:* One bodyweight save propagates to Home heatmap, Progress stats daily view, Deep dive charts, and AI context instantly via React context.

## 9. Goals Data Lineage
*   **Goal creation:** Writer: Goal panel. Store field: `AppState.goals`.
*   **Goal type:** `lift`, `weekly_workouts`, `bodyweight`, etc.
*   **Current value / Target:** Kept in `Goal` schema (`target`, `current`).
*   **Pinned state:** `pinned?: boolean`.

*Note:* Stored goals reflect static targets. Derived analytics calculate the dynamic progression toward the goal (e.g. projecting current metrics vs target).

## 10. Home Command-Center Data Lineage
*   **FitCore Score:** Dependent on `fitcoreScore(state)`.
*   **Daily summary:** Dependent on `AppState` logs for the current day.
*   **Training card:** Dependent on `AppState.workouts`, `trainingStreak`.
*   **Nutrition card:** Dependent on `todayMealTotals(state)`.
*   **Recovery card:** Dependent on latest check-ins, `readinessScore`.
*   **Heatmap:** Dependent on `muscleMap(state)`.
*   **Next Action / Missing items:** Evaluates presence of today's workouts, meals, check-ins.

## 11. Import and Export Lineage
*   **Export source:** Full dump of `AppState` via `exportJson()` in `store.tsx`.
*   **Import validation:** Checked by `parseFitCoreImport` and `validateFitCorePayload`.
*   **State replacement:** Wholesale context replacement; triggers mass re-render.
*   **Version handling:** Managed by `migrateFitCoreDataIfNeeded`.
*   **Risks:** Same-file reselection can be tricky if file-input isn't cleared. Stale component state might persist if forms don't unmount on full context swap.

## 12. Reset and Deletion Lineage
*   **Full reset:** Wipes `localStorage` and resets `AppState` to `defaultState`. Returns user to onboarding.
*   **Deletion paths:** `deleteLog` removes records via ID.
*   **Dependent UI:** Overlays close or update immediately. Charts recompute automatically due to pure analytical functions.

## 13. Analytics Consumption Map

| Analytics Function | Module | Input State | Raw Fields Used | Date Range | Current Time Dependency | Output | Consumers | Missing Data Behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fitcoreScore` | `analytics.ts` | `AppState` | workouts, nutrition, recovery | Past 7-14 days | High | `number` (0-100) | Home Score popup | Returns defaults/0 |
| `trainingStreak` | `analytics.ts` | `AppState` | workouts.startedAt | Historical | High | `number` | Home Training Card | Returns 0 |
| `todayMealTotals` | `analytics.ts` | `AppState` | mealEntries | Today | High | `{calories, protein, ...}` | Fuel Card | Returns zeros |
| `muscleMap` | `analytics.ts` | `AppState` | workouts.exercises | Configurable | Medium | `Record<string, number>` | Heatmap | Returns empty object |
| `momentumScore` | `analytics.ts` | `AppState` | workouts, meals | Recent | High | `MomentumResult` | Home Command Center | Returns neutral |
| `volumeByDayOfWeek` | `analytics-extra.ts` | `AppState` | workouts | X days | Medium | Array of objects | Progress Charts | Returns empty arrays |

## 14. Surface Propagation Matrix

| Event | Home Daily | Home Deep Dive | Training Daily | Training Deep Dive | Fuel Daily | Fuel Deep Dive | Recovery Daily | Recovery Deep Dive | Stats Daily | Stats Deep Dive | Settings | Persistence | Analytics |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Workout started | Immediate | Immediate | Immediate | Immediate | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Immediate | Immediate |
| Workout finished | Immediate | Immediate | Immediate | Immediate | N/A | N/A | N/A | N/A | Immediate | Immediate | N/A | Immediate | Immediate |
| Meal logged | Immediate | Immediate | N/A | N/A | Immediate | Immediate | N/A | N/A | Immediate | Immediate | N/A | Immediate | Immediate |
| Check-in logged | Immediate | Immediate | N/A | N/A | N/A | N/A | Immediate | Immediate | Immediate | Immediate | N/A | Immediate | Immediate |
| Bodyweight logged| Immediate | Immediate | N/A | N/A | N/A | N/A | N/A | N/A | Immediate | Immediate | Immediate | Immediate | Immediate |
| Goal updated | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Immediate | Immediate | Immediate | Immediate | Immediate |
| Data imported | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate |
| Data reset | Immediate (Onboard) | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate | Immediate |

*Uncertain:* Most views immediately re-render via React context. Cross-tab propagation is immediate for UI prefs via `persist.ts`, but core store changes across tabs require manual refreshes unless specific storage events are fully caught (currently handled via `useStore` limitations).

## 15. Data Integrity Invariants
*   **No duplicate records:** From one intended submission (e.g. strict `onBlur` buffering).
*   **Unique IDs:** Mandated for all list entries (`uid()`).
*   **Finite numeric values:** Forms must validate against empty strings or NaN.
*   **Valid timestamps:** `createdAt` and `startedAt` must be valid JS timestamps.
*   **Deterministic deduplication:** `inFlight` refs in components prevent dual-submits.
*   **No fake zero for missing data:** Missing fields must be omitted or `undefined`, not coerced to `0` artificially in storage (though analytics may return `0`).

## 16. Identified Risk Areas
| Risk | Affected Data | Source File | Failure Mode | Affected Screens | Severity | Current Protection | Recommended Test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stale Form Buffers | Forms in popups | UI components | Invalid partial data saved | Settings, Loggers | Medium | Local `useState` tied to `onBlur` | E2E form test |
| Import State Sync | `AppState` | `fitcore-data.ts` | Popups remain open with old data | All | Low | Context forces top-level re-render | E2E import |
| Zero Coercion | Numbers | Analytics | Missing data skews averages | Stats | Medium | Validation filters | Unit test analytics |

## 17. Unsupported and Unrepresented Data

| Data Concept | Current Schema Support | Writer | Analytics Support | UI Support | Correct Display State |
| --- | --- | --- | --- | --- | --- |
| Hydration | None | N/A | N/A | N/A | Omit or 'Planned' placeholder |
| Sodium | None | N/A | N/A | N/A | Omit |
| Sugar | None | N/A | N/A | N/A | Omit |
| Micronutrients | None | N/A | N/A | N/A | Omit |
| HRV / RHR | None | N/A | N/A | N/A | Omit |
| Fasting | None | N/A | N/A | N/A | Omit |
| Sleep Stages | None | N/A | N/A | N/A | Omit |

*Note: The app should strictly avoid inventing fake analytics or assuming metrics that do not exist.*

## 18. Privacy and Sensitivity Overlay
*   **Level:** High for biometric and location/health notes.
*   **Local-only expectation:** All state resides in `localStorage`.
*   **Export expectation:** User has full control to export via JSON.
*   **AI context:** Must honor user consent layers before including in AI prompts (enforced by product policy).

## 19. Recommended Test Coverage Map
*   **Workout Write Path:** Unit (store logic), E2E (popup UI -> Home propagation).
*   **Meal Write Path:** Unit (macros math), Integration (Analytics aggregation).
*   **Import/Export:** E2E (Data survival post-import, schema migration).
*   **Empty States:** E2E (New user onboarding bypass, empty charts).

## 20. Merge-Safety Guidance
*   **Hotspots:** `src/lib/types.ts` and `src/lib/store.tsx` are critical. Any schema modification blocks other features.
*   **Serialization:** Schema and Analytics changes should be serialized. UI component changes (e.g., Domain Views) can largely proceed concurrently.

## 21. Open Questions
*   How should cross-tab state syncing be comprehensively handled for `AppState` given that `fitcore.v1` changes might not forcefully re-render all contexts identically without a storage event listener on the core store? *(Affects `src/lib/store.tsx`; suggested owner: Core Arch)*
