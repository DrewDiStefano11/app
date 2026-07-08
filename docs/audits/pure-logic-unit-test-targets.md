# Pure Logic Unit Test Targets

## 1. Purpose
Identify the safest pure logic functions and data helpers to test first before adding unit test code. This ensures a stable and risk-free first step into unit testing, separating UI complexity from core data calculations and invariants.

## 2. Selection criteria
*   **Pure Functions**: Functions that take arguments and return a value without side effects (no DOM manipulation, no local storage access, no global state mutation).
*   **Isolated**: Functions that don't depend on complex browser APIs or external systems.
*   **Core Value**: Functions related to FitCore calculations (scores, totals, volumes, parsing).
*   **Stability**: Avoid functions heavily tied to in-progress layout PRs or parked PRs (like Jarvis voice mode).

## 3. High-priority unit test targets

### FitCore Score & Readiness Score
*   **File**: `src/lib/analytics.ts`
*   **Functions**: `fitcoreScore(state: AppState)`, `readinessScore(state: AppState)`, `recoveryScore(state: AppState)`
*   **Why it is safe**: These are pure functions taking the serializable `AppState` and returning numbers.
*   **Inputs to test**: Various states (empty state, fully onboarded, exhausted state, recovering state).
*   **Expected outputs**: Number between 0-100 or specific numeric derivations.
*   **Needs mocking**: No.
*   **Touches state/storage**: No, accepts `AppState` as an argument directly.
*   **Risk level**: Low.
*   **Recommended priority**: High.

### Workout Volume
*   **File**: `src/lib/analytics.ts`
*   **Function**: `workoutVolume(w: Workout)`
*   **Why it is safe**: Takes a single `Workout` object and calculates total volume based on sets/reps/weight.
*   **Inputs to test**: Workouts with completed sets, empty sets, zero weight, skipped sets.
*   **Expected outputs**: Total volume as a number.
*   **Needs mocking**: No.
*   **Touches state/storage**: No.
*   **Risk level**: Low.
*   **Recommended priority**: High.

### Nutrition Macro Totals
*   **File**: `src/lib/fitcore-data.ts`
*   **Function**: `getDailyMacroSummary(s: AppState, at?: number)` and `getNutritionSummary(s: AppState, at?: number)`
*   **Why it is safe**: Calculates macro sums by filtering `mealEntries` in the given `AppState`.
*   **Inputs to test**: State with no meals, multiple meals on the same day, meals across different days.
*   **Expected outputs**: Object matching `{ calories, protein, carbs, fat }`.
*   **Needs mocking**: No.
*   **Touches state/storage**: No.
*   **Risk level**: Low.
*   **Recommended priority**: High.

### Meal Totals (Templates)
*   **File**: `src/lib/data.ts`
*   **Function**: `mealTotals(items: MealTemplateItem[])`
*   **Why it is safe**: Sums up items based on quantity and per-100g/per-serving stats.
*   **Inputs to test**: Array of `MealTemplateItem`.
*   **Expected outputs**: Calculated macros object.
*   **Needs mocking**: No.
*   **Touches state/storage**: No.
*   **Risk level**: Low.
*   **Recommended priority**: High.

### Recovery Signals (Parsing Notes)
*   **File**: `src/lib/fitcore-data.ts`
*   **Function**: `extractRecoverySignalsFromNotes(notes: string, sourceLogId?: string, createdAt?: number, src?: FitCoreLogSource)`
*   **Why it is safe**: Regex-based parsing of strings into categorized signal objects.
*   **Inputs to test**: Sentences with pain keywords (e.g., "My knee hurts"), fatigue keywords, or neutral notes.
*   **Expected outputs**: Array of `RecoverySignal` objects.
*   **Needs mocking**: No.
*   **Touches state/storage**: No.
*   **Risk level**: Low.
*   **Recommended priority**: High.

## 4. Medium-priority targets

### Graph/Trend Data Shaping
*   **File**: `src/lib/analytics-extra.ts`
*   **Functions**: `volumeSeries(state, days, bucket)`, `volumeByMuscle(state, days)`, `compareWindows(state, days)`
*   **Why it is safe**: Mostly data transformation for recharts/UI consumption.
*   **Inputs to test**: Full `AppState` with history spanning weeks.
*   **Expected outputs**: Array of objects formatted for charts (e.g., `{ label: string, volume: number }`).
*   **Needs mocking**: No, but requires complex fixture data.
*   **Touches state/storage**: No.
*   **Risk level**: Low-Medium (due to date boundary math).
*   **Recommended priority**: Medium.

### Active Workout Derived Values / Daily Decision Context
*   **File**: `src/lib/daily-decision.ts`
*   **Functions**: `buildDailyDecisionContext(state, now)`, `buildDailyDecision(state, now)`
*   **Why it is safe**: Extremely important business logic for AI/Coach boundaries.
*   **Inputs to test**: `AppState` with various sleep/workout conditions.
*   **Expected outputs**: Structured context objects determining if user should rest, train, etc.
*   **Needs mocking**: No.
*   **Touches state/storage**: No.
*   **Risk level**: Medium (complex logic, but pure).
*   **Recommended priority**: Medium.

## 5. Avoid for now

*   **Store Selectors/Reducers**: `src/lib/store.tsx`. Wait until the store structure and active layout PRs stabilize.
*   **Jarvis Action Logic**: `src/lib/jarvis/tools.ts` and `src/lib/ai.functions.ts`. Avoid anything touching voice mode or complex LLM tool interactions for now.
*   **UI Components**: Anything in `src/components/app/`. Needs a proper DOM testing setup (e.g., `@testing-library/react`), which increases the PR scope significantly.

## 6. Dependencies/mocking concerns
*   **Dates/Time**: Functions that use `Date.now()` typically accept a `now` or `at` parameter for overriding. This must be utilized to ensure deterministic tests without using global `vi.setSystemTime` initially.
*   **IDs**: ID generation (e.g., `uid()`) should be mocked or ignored in snapshots if testing functions that generate new entities.

## 7. Suggested first unit-test PR scope
1.  Add `vitest` to `devDependencies`.
2.  Add a `test:unit` script to `package.json`.
3.  Create `tests/unit/analytics.test.ts` focusing *only* on `fitcoreScore`, `readinessScore`, and `workoutVolume`.
4.  Create `tests/unit/fitcore-data.test.ts` focusing *only* on `getNutritionSummary` and `extractRecoverySignalsFromNotes`.

## 8. Suggested acceptance criteria
*   No runtime code modified.
*   No UI component files tested.
*   `vitest` runs successfully and passes.
*   CI workflows remain unmodified.

## 9. Risks and notes for future agents
*   **Fixture Hell**: Building a massive `AppState` for every test is tedious. Future agents should utilize the existing `tests/e2e/helpers/fitcore-test-state.ts` (like `seedMinimalOnboardedState`) or create a dedicated `tests/unit/fixtures.ts` to share common state setups.
*   **Timezones**: Be careful with day boundaries (e.g., `isoDay`) in pure logic tests. Pass explicitly controlled timestamps.
