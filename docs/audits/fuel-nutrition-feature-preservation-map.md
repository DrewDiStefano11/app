# Fuel and Nutrition Feature Preservation Map

## 1. Executive summary

- **Current Architecture**: Nutrition logic is centered in `src/components/app/views/nutrition.tsx`. The app uses a global store (`useStore`) via `src/lib/store.ts` for persisting `mealEntries` and `nutritionTargets`. The state adheres to contracts in `src/lib/types.ts`. Analytics logic resides in `src/lib/analytics/nutrition-detail-metrics.ts`, defining insights, metric tracking, and missing data behavior.
- **Major Capabilities**:
  - Macro tracking (calories, protein, carbs, fat, optionally fiber).
  - Visual representation of daily macro progression (ring chart for calories, bar charts for P/C/F).
  - Meal logging via Templates, Foods Library, and Custom Entry.
  - AI Photo Logging entry point (which dispatches an event).
  - Recently logged meal reuse.
  - Supplement tracking display.
  - Hydration tracking display (stub/placeholder, as nutrition tracking doesn't fully support hydration natively yet, but it's visualized).
- **Main Preservation Risks**: The distinction between 'missing' and 'zero' values, and honoring 'needs_more_data' vs 'unavailable' states as defined in the analytics contracts. Future redesigns must not invent fake historical data. Support for fiber is optional, and sodium, sugar, hydration remain explicitly marked unsupported by the underlying schema despite UI placeholders.
- **Daily View vs. Deep Dive**:
  - **Daily View**: Action-first. Focuses on "How am I progressing against today’s targets?" Provides quick logging actions, today's meals list, daily macro ring and bars, hydration, and supplements overview. No subtabs.
  - **Deep Dive**: Analytical. Uses subtabs (`Macros`, `Quality`, `Timing`, `Insights`). Focuses on trends, averages, compliance over time, and detailed data analysis.
- **Most Important Findings**: The UI relies on `layoutMode` to switch between Daily and Deep Dive, without using distinct routes. The state is driven heavily by `AppStore` and custom hooks. The analytics metrics (like `macroDistribution`, `targetAdherence`, `mealTiming`) must be faithfully represented in the Deep Dive redesign without fabricating data or metrics not supported by `getNutritionDetailAnalytics`.

## 2. Canonical naming and route structure

- **Canonical runtime tab name**: "Nutrition" (internally, the component is `NutritionView`, route file is `nutrition.tsx`).
- **User-facing labels**: "Fuel" (bottom nav button), "Nutrition" (page header).
- **Route names**: The component is rendered within the main app shell based on the active tab state (`currentTab === 'nutrition'`), rather than a traditional URL route.
- **Route files**: `src/components/app/views/nutrition.tsx`.
- **Daily View route or state**: Controlled via `layoutMode === "daily"` prop passed to `NutritionView`.
- **Deep Dive route or state**: Controlled via `layoutMode === "deepDive"` prop.
- **Subviews**: In Deep Dive mode, there are four subtabs: `Macros`, `Quality`, `Timing`, `Insights`.
- **Navigation entry points**: Bottom navigation bar ("Fuel").
- **Return paths**: Controlled by the global app shell's layout toggle or bottom nav.
- **Cross-domain entry points**: The "Log Meal" quick action from the Home screen or Jarvis AI interactions.
- **Naming inconsistencies**: The bottom tab uses "Fuel", but the page title and internal naming use "Nutrition".

## 3. Complete feature-preservation inventory

| Feature                     | User Purpose           | Primary Files                 | Entry Point             | Actions                      | Data Displayed                           | Related Sheets/Dialogs       | Related Tests                                                                   | Preservation Requirement                        | Known Weakness                              |
| :-------------------------- | :--------------------- | :---------------------------- | :---------------------- | :--------------------------- | :--------------------------------------- | :--------------------------- | :------------------------------------------------------------------------------ | :---------------------------------------------- | :------------------------------------------ |
| Calorie target and progress | Track energy intake    | `nutrition.tsx`, `types.ts`   | Daily View              | N/A (View only)              | Consumed / Target kcal, % Goal           | N/A                          | `progress-rich-data-smoke.spec.ts`                                              | Must accurately sum today's `calories`.         | No visual indicator if target is 0/invalid. |
| Protein/Carb/Fat progress   | Track specific macros  | `nutrition.tsx`               | Daily View              | N/A                          | Consumed / Target grams per macro        | N/A                          |                                                                                 | Must use `protein`, `carbs`, `fat` fields.      |                                             |
| Macro summaries             | Quick status text      | `nutrition.tsx`               | Daily View              | N/A                          | "Protein still needed", "On track", etc. | N/A                          |                                                                                 | Logic for gap messages must be preserved.       |                                             |
| Meal logging                | Add a new meal entry   | `nutrition.tsx`               | "Log Meal" button       | Open sheet, add meal         | Form fields for P/C/F, Kcal              | `LogMealSheet` (BottomSheet) | `mobile-layout-overlay-smoke.spec.ts`, `core-logging-persistence-smoke.spec.ts` | Complete flow from button to state update.      | No validation on zero values.               |
| Meal deletion               | Remove a logged meal   | `nutrition.tsx`               | Trash icon on meal item | Trigger confirm, delete      | Meal details                             | `ConfirmDialog`              |                                                                                 | Deletion must remove from `mealEntries`.        |                                             |
| Recent meals                | Reuse past entries     | `nutrition.tsx`               | Log Meal -> Templates   | Click to add                 | Recent meal names                        | `LogMealSheet`               |                                                                                 | Depends on reversing `mealEntries`.             |                                             |
| Meal templates              | Quick common meals     | `nutrition.tsx`, `data.ts`    | Log Meal -> Templates   | Click to add                 | Template name, macros                    | `LogMealSheet`               |                                                                                 | Static data source must be maintained.          |                                             |
| Food search / library       | Find specific foods    | `nutrition.tsx`               | Log Meal -> Foods       | Search, add                  | Food name, serving, macros               | `LogMealSheet`               |                                                                                 | Uses static `FOODS`.                            |                                             |
| Custom entry                | Manually input macros  | `nutrition.tsx`               | Log Meal -> Custom      | Type name/macros, add        | Input fields                             | `LogMealSheet`               |                                                                                 | Must parse strings to numbers securely.         |                                             |
| Serving/quantity            | Adjust food amount     | `nutrition.tsx`               | Foods Library (static)  | N/A                          | Serving label                            | N/A                          |                                                                                 | Currently static, no active adjustment UI.      | Lacks dynamic scaling.                      |
| Supplement logging          | View taken supplements | `nutrition.tsx`               | Daily View              | N/A (View only)              | Count of today's supplements             | N/A                          | `rich-state-all-tabs-smoke.spec.ts`                                             | Must read from `supplementLogs`.                | Read-only in this view.                     |
| Photo meal / AI             | Use camera/AI to log   | `nutrition.tsx`               | Log Meal sheet          | Dispatches `fitcore:open-ai` | "AI Estimate" label                      | `LogMealSheet`               |                                                                                 | Event dispatch must remain.                     | Just a trigger, not the actual flow.        |
| Empty states                | Inform user of no data | `nutrition.tsx`               | Daily View (no meals)   | "Log Meal"                   | "No meals logged yet"                    | N/A                          | `empty-state-crash-smoke.spec.ts`                                               | Must show when `today.length === 0`.            |                                             |
| Unsupported states          | Analytics limitations  | `nutrition-detail-metrics.ts` | Analytics engine        | N/A                          | `unavailable` status                     | N/A                          |                                                                                 | `sodium`, `sugar`, `hydration` are unsupported. |                                             |

## 4. Fuel Daily View inventory

- **Page Header**:
  - **Visible Label**: "Nutrition"
  - **Purpose**: Contextualize the page and show remaining calories.
  - **Metric**: `remaining` kcal.
  - **Action**: Layout toggle (handled by shell).
  - **Component**: `PageHeader`.
- **Daily Macros Tile**:
  - **Visible Label**: "Daily Macros", Dynamic Status ("On track", etc).
  - **Purpose**: Primary visualization of today's progress.
  - **Metric**: Calories (Ring), P/C/F (Bars).
  - **Component**: `Tile`, `Ring`, `MacroBar`.
  - **Empty Behavior**: Shows 0 / Target.
- **Log Meal Button**:
  - **Visible Label**: "Log Meal" (with Plus icon).
  - **Action**: Opens `LogMealSheet`.
  - **Component**: `PrimaryButton`.
- **Hydration Card**:
  - **Visible Label**: "Hydration"
  - **Metric**: "0 fl oz"
  - **Component**: Premium card styling.
  - **Empty Behavior**: Static "0".
- **Supplements Card**:
  - **Visible Label**: "Supplements"
  - **Metric**: Count of today's supplements.
  - **Component**: Premium card styling.
  - **Empty Behavior**: "None logged" (italic).
- **Meals Today List**:
  - **Visible Label**: "Meals Today"
  - **Purpose**: List today's entries.
  - **Action**: Delete (Trash icon).
  - **Component**: `SectionHeader`, custom list items.
  - **Empty Behavior**: `EmptyState` component with "Log Meal" action.

**Evaluation**: The current Daily View effectively answers "How am I progressing against today’s targets?" through the prominent Macro Ring/Bars and the status message.

## 5. Fuel Deep Dive inventory

- **Subtabs**:
  - **Heading**: `Macros`, `Quality`, `Timing`, `Insights`.
  - **Component**: `SubTabs`.
- **Content Modules** (Note: Deep Dive UI implementation is currently partial or uses placeholders/PlannedFeatureCard. Analytics engine in `nutrition-detail-metrics.ts` dictates future capabilities).
  - **Macros**: Uses `consistencyMetric`, `targetAdherence`, `macroDistribution`.
  - **Quality**: Uses `fiberAnalytics`, handles missing data for unsupported items.
  - **Timing**: Uses `mealTiming`, `workoutFuel`.
  - **Insights**: Powered by confidence and reasons arrays in analytics.

**Evaluation**: The underlying analytics support history, trends, exact values, and underlying entries, but the UI component `nutrition.tsx` currently only renders `PlannedFeatureCard` or placeholders for these tabs in Deep Dive mode.

## 6. Logging-flow map

1.  **Entry**: User clicks "Log Meal" on Daily View.
2.  **Action**: `setLogOpen(true)` opens `LogMealSheet` (a `BottomSheet`).
3.  **Mode Selection**: User selects "Templates", "Foods Library", or "Custom Entry" via `Chip`s.
4.  **Flows**:
    - **Templates/Recent**: User clicks a chip (Recent) or card (Template).
    - **Foods**: User types in search `Input`, selects type from `Select`, clicks food card.
    - **Custom**: User fills `Input` for Name, `Select` for Type, and `Input` for Kcal, P, C, F. Clicks "Add to Daily Log" `PrimaryButton`.
    - **Photo**: User clicks "Photo Log" card, dispatches `fitcore:open-ai` event (closes sheet externally/handles via AI).
5.  **Completion**: `addMeal()` is called with the constructed `MealEntry`.
6.  **State Mutation**: `mealEntries` in global store is updated with the new entry (prepended).
7.  **Success Feedback**: Sheet closes automatically (or remains open depending on exact `addMeal` implementation, typically UI updates instantly). Daily View macros and list update immediately.

## 7. Action and interaction matrix

| Action Label   | Location   | Triggering Control | Destination/Result  | State Mutation             | Close Behavior | Keyboard Concerns   | Mobile Concerns    |
| :------------- | :--------- | :----------------- | :------------------ | :------------------------- | :------------- | :------------------ | :----------------- |
| "Fuel" nav     | App Shell  | Bottom Tab         | Nutrition tab view  | Updates `currentTab`       | N/A            | Focus management    | Safe area nav      |
| "Deep Dive"    | App Header | Toggle             | Switch to Deep Dive | `layoutMode` prop          | N/A            | None                | None               |
| "Log Meal"     | Daily View | PrimaryButton      | Opens LogMealSheet  | `setLogOpen(true)`         | N/A            | Focus trap in sheet | Sheet height       |
| Subtab click   | Deep Dive  | SubTabs            | Changes active tab  | `setTab(...)`              | N/A            | Arrow key nav?      | Tap targets        |
| Trash icon     | Meals List | IconButton         | Opens ConfirmDialog | `setConfirmDel(id)`        | N/A            | Focus visible       | Accidental taps    |
| Confirm Delete | Dialog     | Button             | Deletes meal        | Removes from `mealEntries` | Closes dialog  | Enter to confirm    | None               |
| Add Custom     | Log Sheet  | PrimaryButton      | Adds custom meal    | Adds to `mealEntries`      | N/A            | Numeric keyboards   | Input obscuring    |
| Search Food    | Log Sheet  | Input              | Filters foods list  | Updates `search` state     | N/A            | Type to search      | Keyboard dismissal |

## 8. Sheet, dialog, and popup inventory

- **Log Meal Sheet**:
  - **Name**: `LogMealSheet` (inline in `nutrition.tsx`)
  - **Trigger**: "Log Meal" button.
  - **Component**: `BottomSheet` (`height="tall"`).
  - **Content**: Modes (Templates, Foods, Custom), Photo Log entry.
  - **Actions**: Add meal variants.
  - **Dismiss Behavior**: Controlled via `open`/`onClose` props.
- **Confirm Delete Dialog**:
  - **Name**: `ConfirmDialog`
  - **Trigger**: Trash icon on a meal.
  - **Component**: `ConfirmDialog`.
  - **Content**: "Delete this meal?", "This will remove..."
  - **Actions**: Cancel (closes), Delete (mutates state, closes).
  - **Data Dependency**: Needs `confirmDel` string (meal ID).

## 9. Data and analytics dependency map

- **Store `state.mealEntries`**: Core data for all lists and calculations. Used directly in `nutrition.tsx`.
- **Store `state.nutritionTargets`**: Used for `remaining`, ring `max`, and bar `target`s.
- **Store `state.supplementLogs`**: Used for the Supplements summary card.
- **Analytics `getNutritionDetailAnalytics`** (`src/lib/analytics/nutrition-detail-metrics.ts`):
  - **Purpose**: Deep Dive metric calculation (consistency, adherence, timing).
  - **Data Quality**: Strictly handles `missing`, `partial`, and `stale` states via `confidence` and `reasons`.
  - **Missing-data behavior**: Uses `needs_more_data` or `unavailable` (e.g., for `sodium`, `sugar`, `hydration`). Does not fabricate 0s.

## 10. Chart and visualization inventory

- **Daily Macros Ring**:
  - **Component**: `Ring`
  - **Metric**: Calories (value vs max).
  - **Preservation**: Must handle `t.c` (value) and `tg.calories` (max). Shows % Goal.
- **Macro Bars**:
  - **Component**: `MacroBar` (inline/local).
  - **Metric**: Protein, Carbs, Fat (value vs target).
  - **Preservation**: Must maintain unit (g) and distinct colors (Green/Amber/Green).

## 11. State-coverage matrix

| State           | Implemented     | Location                      | Visible Copy              | User Action  | Gap/Risk                                       |
| :-------------- | :-------------- | :---------------------------- | :------------------------ | :----------- | :--------------------------------------------- |
| Ready           | Yes             | Daily View                    | Progress bars, meals list | View, Delete | None                                           |
| Empty           | Yes             | Daily View                    | "No meals logged yet"     | "Log Meal"   | None                                           |
| Needs more data | Yes (Analytics) | `nutrition-detail-metrics.ts` | N/A (Engine level)        | N/A          | UI doesn't fully surface engine reasons yet.   |
| Unsupported     | Yes             | Analytics & UI                | `unavailable` / Stubs     | N/A          | Hydration UI shows "0" instead of unsupported. |

## 12. Responsive and accessibility observations

- **Mobile breakpoints**: Designed for mobile (`pb-24` for nav bar, sheets).
- **Touch targets**: `PrimaryButton` and `BottomSheet` list items have ample padding.
- **Horizontal overflow**: `SubTabs` and `Chip` lists use `overflow-x-auto no-scrollbar`.
- **Keyboard access**: Custom inputs lack explicit form submission (`onSubmit`).
- **Semantic headings**: `PageHeader` and `SectionHeader` used. `BottomSheet` manages its own header.
- **Risk**: Custom entry inputs use `inputMode="numeric"`, which is good, but value changes aren't strictly clamped or validated against non-numeric chars in the component itself (relies on `Number(val) || 0`).

## 13. Current test-coverage map

- **`tests/e2e/core-logging-persistence-smoke.spec.ts`**: Tests "persists a meal logged from the Home quick action" (covers `Log Meal` sheet, input, save, and persistence).
- **`tests/e2e/empty-state-crash-smoke.spec.ts`**: Navigates to Fuel tab with empty state, asserts no fatal errors and "Nutrition" heading visibility.
- **`tests/e2e/progress-rich-data-smoke.spec.ts`**: Loads rich state, navigates to Fuel, asserts no fatal errors.
- **`tests/e2e/mobile-layout-overlay-smoke.spec.ts`**: Tests opening and closing the `Log Meal` sheet, asserting visibility toggles.
- **Missing scenarios**: No E2E tests specifically for Deep Dive subtabs, deletion flow, or analytics contract validation in UI.

## 14. Preservation checklist for future implementation

- [ ] Daily View macro calculations (c, p, cb, f) perfectly match the `isToday` reduction logic.
- [ ] The distinction between missing data and zero values is preserved (do not default hydration to 0 in store).
- [ ] The "Log Meal" button always opens a functional `BottomSheet` containing Templates, Foods, and Custom options.
- [ ] Custom entry correctly parses text to numbers without crashing or inserting `NaN`.
- [ ] AI Photo Log correctly dispatches `fitcore:open-ai` rather than attempting direct inline routing.
- [ ] Deep Dive tabs (`Macros`, `Quality`, `Timing`, `Insights`) map directly to properties returned by `getNutritionDetailAnalytics`.
- [ ] No fake history or fabricated mock data is introduced for Deep Dive visuals.

## 15. Safe future task boundaries

- **Safe**: Modifying `src/components/app/views/nutrition.tsx` presentation, adding Deep Dive charts using existing primitive components.
- **Coordinate**: Changes to `LogMealSheet` (if extracted), global `BottomSheet` styles, or `layoutMode` prop definitions.
- **Restricted**: `src/lib/store.ts`, `src/lib/types.ts`, and `src/lib/analytics/nutrition-detail-metrics.ts` must not be altered for pure UI redesigns.

## 16. Open questions and uncertainties

- **Hydration/Supplement Display**: Are Hydration and Supplements permanently housed in the Fuel tab, or will they move to Recovery? _Files inspected: `nutrition.tsx`._ Blocks redesign if layout structure changes drastically.
- **Serving Size Scaling**: The Foods library includes a `servingLabel` but no interactive multiplier. Is quantity scaling required for Phase 1? _Files inspected: `nutrition.tsx`, `data.ts`._

## 17. File index

- **Routes/Views**: `src/components/app/views/nutrition.tsx`
- **Data Dependencies**: `src/lib/store.ts`, `src/lib/types.ts`, `src/lib/data.ts`
- **Analytics**: `src/lib/analytics/nutrition-detail-metrics.ts`
- **Tests**:
  - `tests/e2e/core-logging-persistence-smoke.spec.ts`
  - `tests/e2e/empty-state-crash-smoke.spec.ts`
  - `tests/e2e/progress-rich-data-smoke.spec.ts`
  - `tests/e2e/mobile-layout-overlay-smoke.spec.ts`
