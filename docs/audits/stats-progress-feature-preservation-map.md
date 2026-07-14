# Stats and Progress Feature Preservation Map

## 1. Executive summary

- **Current Stats/Progress architecture**: The system separates a daily overview ("Daily View") and an analytical breakdown ("Deep Dive"). State is stored in `fitcore.v1` local storage, tracking `bodyweightEntries`, `goals`, `progressPhotos`, and deriving `momentumScore`.
- **Canonical runtime naming**: The canonical user-facing tab name is "Stats" (confirmed via bottom nav in `tests/e2e/navigation-smoke.spec.ts`), though the internal view component is `ProgressView` (`src/components/app/views/progress.tsx`).
- **Major existing capabilities**: Bodyweight logging (weigh-ins); goal tracking; Momentum scoring based on consistency; progress photo capture, tagging (view, phase), and timeline viewing.
- **Major preservation risks**: The disconnect between "Stats" UI labeling and "Progress" internal naming. Removing raw weigh-in history or progress photo privacy (stored locally via Base64) are major risks. The momentum score relies on cross-domain consistency which must be preserved.
- **Current Daily View responsibilities**: Focuses on "Am I progressing?". It shows current bodyweight vs target, a 7-day average trend sparkline, Goal Progress bars, Momentum Score status, and actionable insights.
- **Current Deep Dive responsibilities**: Separated into subtabs: Analytics, Body, Goals, Insights. It includes the progress photo timeline and detailed goal states.
- **Relationship among features**: Bodyweight entries directly update the current value of bodyweight goals.
- **Most important findings for future redesign work**:
  - **Weigh-ins**: Confirmed unsupported: there is no UI to edit or delete historical weigh-ins (`WeighInSheet` in `src/components/app/popups/quick-popups.tsx` only appends).
  - **Photos**: Confirmed implemented: Photos can be deleted via a `ConfirmDialog` in `src/components/app/views/progress.tsx`.
  - **Comparisons**: Confirmed unsupported in UI: The universal comparison builder is contract-only (found in `src/lib/analytics/insight-interactions.ts` and `domain-metrics.ts`), while the UI only has a hardcoded static placeholder in `AnalyticsTab` (`src/components/app/views/progress.tsx`).

## 2. Canonical terminology and route structure

- **Canonical runtime tab name**: Stats
- **Alternate product terminology**: Progress
- **User-facing labels**: Stats, Progress, Goal Progress, Momentum Score
- **Route names**: The bottom navigation selects "Stats" which renders the `progress.tsx` view.
- **Route files**: `src/components/app/views/progress.tsx`
- **Daily View route or view state**: `layoutMode = "daily"` prop in `ProgressView`
- **Deep Dive route or view state**: `layoutMode = "deepDive"` prop in `ProgressView`
- **Subtabs**: Analytics, Body, Goals, Insights (available in Deep Dive only)
- **Internal view identifiers**: `progress.tsx`
- **Navigation entry points**: Bottom navigation bar ("Stats" button).
- **Return paths**: Mode toggles between Daily View and Deep Dive.
- **Home-to-Stats entry points**: Home goals panel, FitCore Score tile interactions.
- **Quick-action entry points**: "Weigh In" via `WeighInSheet` from quick popups or Home.
- **Goal-entry points**: `CustomizeGoalsSheet` accessed via Home `GoalsPanel`, or within Stats Goals tab.

### Naming Inconsistencies

- **Stats vs Progress**: The tab is labeled "Stats", but the main heading is "Progress", and the file is `progress.tsx`.

## 3. Complete feature-preservation inventory

| Feature              | User Purpose            | Primary Files                        | Entry Point              | Data Displayed                     | Data Source                                       | Preservation Requirement                            | Evidence Label        |
| :------------------- | :---------------------- | :----------------------------------- | :----------------------- | :--------------------------------- | :------------------------------------------------ | :-------------------------------------------------- | :-------------------- |
| Current Bodyweight   | View latest weight      | `progress.tsx`                       | Stats Daily View         | Latest bodyweight, target, delta   | `state.profile.bodyweightLb`, `bodyweightEntries` | Must show latest accurate weight                    | Confirmed implemented |
| Weigh-in Logging     | Log new weight          | `quick-popups.tsx`                   | "Weigh In" Action        | Input field, recent trend          | Local input                                       | Must update `bodyweightEntries`, `profile`, `goals` | Confirmed implemented |
| Weigh-in Editing     | Fix mistakes            | `quick-popups.tsx`                   | N/A                      | N/A                                | N/A                                               | N/A                                                 | Confirmed unsupported |
| Weigh-in Deletion    | Remove mistakes         | `quick-popups.tsx`                   | N/A                      | N/A                                | N/A                                               | N/A                                                 | Confirmed unsupported |
| Bodyweight Trend     | See recent changes      | `progress.tsx`, `quick-popups.tsx`   | Daily View               | 7-day average, 14-day sparkline    | `bodyweightEntries`                               | Must distinguish zero from missing                  | Confirmed implemented |
| Goal Creation        | Track specific metrics  | `goals-panel.tsx`                    | Home Goals Panel         | Available goal types               | `ALL_GOALS` constant                              | Must retain goal configuration                      | Confirmed partial     |
| Goal Progress        | View progress vs target | `progress.tsx`                       | Daily View, Deep Dive    | Current vs Target, progress bar    | `state.goals`, `analytics`                        | Must correctly handle inverse goals                 | Confirmed implemented |
| Momentum Score       | Gamify consistency      | `progress.tsx`, `momentum-popup.tsx` | Daily View               | Score, contributing factors        | `momentumScore`                                   | Must reflect training, nutrition                    | Confirmed implemented |
| Progress Photos      | Visual tracking         | `progress.tsx`                       | Deep Dive                | Uploaded image, view, phase, notes | `state.progressPhotos`                            | Must preserve local privacy                         | Confirmed implemented |
| Photo Deletion       | Remove photos           | `progress.tsx`                       | Deep Dive (Photo Detail) | Confirmation dialog                | `state.progressPhotos`                            | Must remove item from array                         | Confirmed implemented |
| Universal Comparison | Cross-metric analysis   | `analytics/insight-interactions.ts`  | N/A                      | N/A                                | N/A                                               | Must preserve backend contracts                     | Contract-only         |

## 4. Stats Daily View inventory

- **Header**: "Progress" heading, Layout mode toggle (Daily View / Deep Dive).
- **Bodyweight Section**:
  - **Primary Metric**: Current Bodyweight (`state.profile.bodyweightLb`).
  - **Supporting Context**: Delta vs 7-day average, Target weight, sparkline.
  - **User Action**: "Log weigh-in" button (opens detail sheet).
  - **Source File**: `src/components/app/views/progress.tsx`.
  - **Empty Behavior**: Shows default/profile weight.
- **Goal Progress Section**:
  - **Heading/Label**: "Goal Progress".
  - **Primary Metric**: Progress percentage for active goals.
  - **Source File**: `src/components/app/views/progress.tsx`.
  - **Empty Behavior**: Displays "No active goals".
- **Momentum Section**:
  - **Heading/Label**: "Momentum Score".
  - **User Action**: Click to open `momentum-popup.tsx` sheet.
  - **Source File**: `src/components/app/views/progress.tsx`.

**Does it answer "Am I progressing?"**: Yes, primarily through the bodyweight delta, goal progress bars, and momentum score shown in the first viewport. Information is action-first, allowing immediate logging.

## 5. Stats Deep Dive inventory

- **Subtabs**: Analytics, Body, Goals, Insights.
- **Analytics Tab**: Presentation-only static placeholder with hardcoded text about correlations (`src/components/app/views/progress.tsx`).
- **Body Tab**: Presentation-only UI framework.
- **Goals Tab**:
  - **Heading**: "Goals".
  - **Metric**: Goal current vs target, weekly pace, projected completion date.
  - **Component**: `GoalsTab` inside `progress.tsx`.
  - **Data Dependency**: `getGoalDetailAnalytics`.
- **Insights Tab**: Textual analysis placeholders ("What's Improving", "What Needs Attention").
- **Progress History**: Chronological timeline of bodyweight and photo events (`ProgressHistoryTab` in `progress.tsx`).

## 6. Weigh-in lifecycle map

1.  **Entry Point**: User clicks "Weigh In".
2.  **Opening Control**: Opens `WeighInSheet` (`src/components/app/popups/quick-popups.tsx`).
3.  **Input Fields**: Numeric input (`type="number"`, `inputMode="decimal"`).
4.  **Units**: Fixed to `lb` in the UI display.
5.  **Date Field**: Defaults to current timestamp (`Date.now()`). No explicit date picker.
6.  **Validation**: Requires a non-zero, valid number (`if (!wt) return;`).
7.  **Submit Behavior**: Updates `bodyweightEntries` (appends), `profile.bodyweightLb` (overwrites), and `goals` (updates current bodyweight target).
8.  **Edit Behavior**: Confirmed unsupported. No UI exists to edit past entries.
9.  **Delete Behavior**: Confirmed unsupported. No UI exists to delete past entries.
10. **Confirmation Behavior**: None for creation.
11. **Success Feedback**: Sheet closes.

## 7. Bodyweight data-model and presentation map

- **Stored value**: Numeric float (`weightLb`).
- **Date**: Unix timestamp (`createdAt`).
- **Change calculation**: Delta between current and last entry.
- **Trend direction**: Visualized in sparkline and text color (green for positive delta, red for negative).
- **Missing-value behavior**: Handled safely, shows placeholders or omits sparkline if < 2 points (`tests/e2e/chart-empty-data-smoke.spec.ts`).

## 8. Goal lifecycle and goal-state map

- **Goal types**: `weekly_workouts`, `protein`, `calories`, `weight`, `steps`, `sleep`, `volume` (`src/components/app/goals-panel.tsx`).
- **Goal creation**: Via `CustomizeGoalsSheet` on Home.
- **Target value**: Pulled from `profile` or `nutritionTargets`.
- **Goal status**: "Goal hit" (>= 100%), "Almost there" (>= 80%), "On track" (>= 50%), "Behind" (> 0%), "Not started" (0%).
- **Goal Analytics (`src/lib/analytics/goal-detail-metrics.ts`)**: Calculates `currentWeeklyPace`, `neededWeeklyPace`, `projection`.
- **Multiple-goal behavior**: UI limits to `MAX_GOALS` (5).

## 9. Momentum inventory

- **Canonical symbol**: `momentumScore` (analytics), `Momentum` (UI).
- **Definition**: Combines consistency across training, nutrition logging, and recovery check-ins.
- **Display locations**: Stats Daily View, Momentum BottomSheet (`src/components/app/popups/momentum-popup.tsx`).
- **Contributors**: Exposed via `mScore.factors` in `MomentumScore` popup.
- **Empty behavior**: Shows "Momentum becomes more useful as FitCore learns your normal rhythm."

## 10. Progress-photo lifecycle map

- **Entry points**: "Add photo" button in Stats Deep Dive (`src/components/app/views/progress.tsx`).
- **Camera/Upload**: Standard HTML file input (`<input type="file" accept="image/*">`).
- **Supported file**: Images, converted to Base64 `dataUrl` via `FileReader`. Max 4MB size limit.
- **Date assignment**: `Date.now()`.
- **Delete behavior**: Confirmed implemented. Supported via "Delete photo" button in detail view which triggers a `ConfirmDialog` with destructive styling.
- **Photo history**: Displayed in `ProgressHistoryTab` timeline.
- **Side-by-side comparison**: Confirmed unsupported in current UI (timeline only).

## 11. Comparison-selector inventory

- **Universal Comparison**: Confirmed unsupported in UI. Exists as contract-only in `src/lib/analytics/insight-interactions.ts` and `src/lib/analytics/domain-metrics.ts` (e.g., `missing_comparison_period`, `comparisonEntryIds`).
- **UI Implementation**: Presentation-only dummy UI in `AnalyticsTab` (`src/components/app/views/progress.tsx`) allows toggling static string metrics, but does not render a real chart or consume the analytics contracts.

## 12. Action and interaction matrix

| Action Label    | Location              | Triggering Control | Result                      | Overlay Behavior   | State Mutation                | Evidence Label        |
| :-------------- | :-------------------- | :----------------- | :-------------------------- | :----------------- | :---------------------------- | :-------------------- |
| Weigh In        | Quick Actions / Stats | "Weigh In" button  | Opens `WeighInSheet`        | BottomSheet        | Appends `bodyweightEntries`   | Confirmed implemented |
| Edit Weigh In   | N/A                   | N/A                | N/A                         | N/A                | N/A                           | Confirmed unsupported |
| Delete Weigh In | N/A                   | N/A                | N/A                         | N/A                | N/A                           | Confirmed unsupported |
| Add goals       | Home                  | "Customize" button | Opens `CustomizeGoalsSheet` | BottomSheet        | Updates `STORE_KEY`           | Confirmed implemented |
| Add photo       | Stats                 | "Add photo" button | Opens `PhotoSheet`          | BottomSheet (tall) | Appends `progressPhotos`      | Confirmed implemented |
| Delete photo    | Stats                 | "Delete photo" btn | Confirm dialog              | Standard alert     | Removes from `progressPhotos` | Confirmed implemented |
| Compare photos  | N/A                   | N/A                | N/A                         | N/A                | N/A                           | Confirmed unsupported |

## 13. Sheet, dialog, and popup inventory

- **`WeighInSheet`**: Triggered by Weigh In action. Validation: must be non-zero.
- **`CustomizeGoalsSheet`**: Content: list of available goals with toggles.
- **`PhotoSheet`**: Validation: max 4MB size.
- **`ConfirmDialog` (Photo Delete)**: Destructive confirmation alert before data mutation.

## 14. Data and analytics dependency map

- **`bodyweightEntries`**: Core state array. Used for current weight, trend sparkline.
- **`goals`**: Core state array.
- **`progressPhotos`**: Core state array.
- **`src/lib/analytics/goal-detail-metrics.ts`**: Derives pace, required pace, and projections based on bodyweight entries. Used in Deep Dive Goals tab.

## 15. Chart and visualization inventory

- **Sparkline (`Sparkline` component in `progress.tsx`)**: Simple SVG line chart for 14-day bodyweight trend.
  - **Metric**: Bodyweight.
  - **Empty behavior**: Hidden if < 2 points.
  - **Interaction**: None (non-interactive).
- **Goal Progress Bars**: Horizontal filled bars representing completion percentage.

## 16. Data-quality and state-coverage matrix

| State           | Weigh-ins                         | Goals                                           | Momentum                          | Progress Photos       | Metric Comparisons |
| :-------------- | :-------------------------------- | :---------------------------------------------- | :-------------------------------- | :-------------------- | :----------------- |
| Ready           | Shows delta/sparkline             | Shows progress bar                              | Shows score breakdown             | Shows timeline        | Contract-only      |
| Empty           | Shows default profile wt          | "No active goals"                               | "Momentum becomes more useful..." | "No progress history" | Contract-only      |
| Needs More Data | N/A (requires 2 points for chart) | `goal-detail-metrics` handles `needs_more_data` | N/A                               | N/A                   | Contract-only      |

## 17. Cross-domain dependency and presentation map

- **Home Daily View**: Displays `GoalsPanel` (`src/components/app/goals-panel.tsx`) which pulls data from Training, Nutrition, Recovery, and Stats. Modifying the shape of `bodyweightEntries` or `goals` will break the Home dashboard.

## 18. Privacy and trust observations

- **Accidental exposure**: Progress photos are visible in the Deep Dive timeline. Large images could cause local storage quota errors.
- **Data Safety Phase Integration**: These surfaces are prime candidates for AI-memory policy enforcement (ensuring photos/weights aren't arbitrarily synced or sent to LLMs without consent).

## 19. Responsive and accessibility observations

- **Confirmed implementation**: Bottom sheets use native/portal behavior. Focus management generally handled by standard dialog patterns.
- **Confirmed gap**: `Sparkline` SVG lacks robust accessible text alternatives (relies on adjacent numerical text).

## 20. Current test-coverage map

- `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`: Covers weigh-in sheet submission and validation.
- `tests/e2e/progress-rich-data-smoke.spec.ts`: Checks Stats tab rendering with rich data.
- `tests/e2e/chart-empty-data-smoke.spec.ts`: Checks Stats tab rendering with empty arrays (prevents crashes).
- `tests/e2e/data-propagation-smoke.spec.ts`: Ensures logged weigh-ins propagate to the Stats tab.
- `tests/unit/goal-detail-metrics.test.ts`: Covers domain logic for goal pace and projections.

## 21. Preservation checklist for future implementation

- [ ] "Stats" and "Progress" terminology must remain understandable and consistent.
- [ ] The `WeighInSheet` must continue to append to `bodyweightEntries` and update `profile`.
- [ ] Zero values must not be conflated with missing data in trend charts.
- [ ] Goal progress bars must correctly handle inverse targets (e.g., losing weight).
- [ ] Progress photo base64 storage must remain under the 4MB safety limit to prevent quota crashes.
- [ ] Daily View must remain action-first; Deep Dive must contain the analytical tabs.
- [ ] All E2E smoke tests (e.g., `chart-empty-data-smoke.spec.ts`) must pass without weakening selectors.

## 22. Safe future task boundaries

- **Safe for UI work**: `src/components/app/views/progress.tsx`.
- **Require coordination**: `src/lib/store.tsx` (state shape), `src/components/app/goals-panel.tsx`.
- **Untouchable**: `src/lib/analytics/goal-detail-metrics.ts` (complex domain logic).

## 23. Open questions and uncertainties

- **Weigh-in editing**: There is currently no UI to edit or delete a weigh-in. Blocks full history management.

## 24. File index

- **Routes**: `src/components/app/views/progress.tsx`
- **Shared components**: `src/components/app/goals-panel.tsx`
- **Weigh-in components**: `src/components/app/popups/quick-popups.tsx`
- **Momentum components**: `src/components/app/popups/momentum-popup.tsx`
- **Analytics/data dependencies**: `src/lib/analytics/goal-detail-metrics.ts`, `src/lib/analytics/domain-metrics.ts`, `src/lib/analytics/insight-interactions.ts`
- **Tests**: `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`, `tests/e2e/progress-rich-data-smoke.spec.ts`, `tests/unit/goal-detail-metrics.test.ts`
