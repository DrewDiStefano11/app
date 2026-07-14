# Stats and Progress Feature Preservation Map

## 1. Executive summary

- **Current Stats/Progress architecture**: The system separates daily overview ("Daily View") and detailed analytical breakdown ("Deep Dive"). The state is stored in `fitcore.v1` local storage, managing `bodyweightEntries`, `goals`, `progressPhotos`, and deriving `momentumScore`.
- **Canonical runtime naming**: The canonical user-facing tab name is "Stats", though the internal routing, view component (`ProgressView`), and domain logic heavily use "Progress".
- **Major existing capabilities**: Bodyweight logging (weigh-ins) and history; goal tracking (especially bodyweight targets); Momentum scoring based on consistency; progress photo capture, tagging (view, phase), and timeline viewing.
- **Major preservation risks**: The disconnect between "Stats" tab labeling and "Progress" internal naming might cause confusion. Removing raw weigh-in history or progress photo privacy (they are stored locally) are major risks. The momentum score relies on cross-domain consistency (training, nutrition) which must be preserved.
- **Current Daily View responsibilities**: Focuses on "Am I progressing?" with action-first summaries. It shows the current bodyweight vs target, a 7-day average trend line, Goal Progress (progress bars for selected goals), Momentum Score, and actionable insights.
- **Current Deep Dive responsibilities**: Analytically dense. Separated into subtabs: Analytics, Body, Goals, Insights. It includes the progress photo timeline and detailed goal states (pace, projections).
- **Relationship among features**: Bodyweight entries directly update the current value of bodyweight goals. Consistency across domains (logging nutrition, training) feeds the Momentum score. Photos act as visual milestones in the progress timeline alongside weigh-ins.
- **Most important findings for future redesign work**: Must retain the distinction between missing data and zero data. The `WeighInSheet` lacks edit/delete capabilities for past entries, which might be a future product request but current behavior just appends.

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
- **Jarvis entry points**: Jarvis can surface goal progress cards (`goals-profile-card.tsx`).
- **Goal-entry points**: `CustomizeGoalsSheet` accessed via Home `GoalsPanel`, or within Stats Goals tab.
- **Cross-domain comparison entry points**: Universal comparison builder (if implemented, referenced in Analytics Phase 2).

### Naming Inconsistencies

- **Stats vs Progress**: The tab is labeled "Stats", but the main heading is often "Progress", the file is `progress.tsx`, and history is "Progress history".
- **Momentum**: Sometimes referred to as "Momentum Score" or just "Momentum".
- **Goals**: "Goal Progress" vs "Goals".
- **Bodyweight vs Weigh-ins**: User action is "Weigh In", but the metric is "Bodyweight".

## 3. Complete feature-preservation inventory

| Feature                 | User Purpose            | Primary Files                        | Entry Point                | Data Displayed                     | Data Source                                       | Preservation Requirement                            | Known Weakness                             |
| :---------------------- | :---------------------- | :----------------------------------- | :------------------------- | :--------------------------------- | :------------------------------------------------ | :-------------------------------------------------- | :----------------------------------------- |
| Current Bodyweight      | View latest weight      | `progress.tsx`                       | Stats Daily View           | Latest bodyweight, target, delta   | `state.profile.bodyweightLb`, `bodyweightEntries` | Must show latest accurate weight                    | Disconnect if profile desyncs from entries |
| Weigh-in Logging        | Log new weight          | `quick-popups.tsx`                   | "Weigh In" Quick Action    | Input field, recent trend          | Local input                                       | Must update `bodyweightEntries`, `profile`, `goals` | No edit/delete capability                  |
| Bodyweight Trend        | See recent changes      | `progress.tsx`, `quick-popups.tsx`   | Daily View, Weigh In Sheet | 7-day average, 14-day sparkline    | `bodyweightEntries`                               | Must distinguish zero from missing                  | Simple sparkline lacks deep interaction    |
| Goal Creation/Selection | Track specific metrics  | `goals-panel.tsx`                    | Home Goals Panel           | Available goal types               | `ALL_GOALS` constant                              | Must retain goal configuration                      | Custom targets might be hardcoded          |
| Goal Progress           | View progress vs target | `progress.tsx`                       | Daily View, Deep Dive      | Current vs Target, progress bar    | `state.goals`, `analytics`                        | Must correctly handle inverse goals (weight loss)   |                                            |
| Momentum Score          | Gamify consistency      | `progress.tsx`, `momentum-popup.tsx` | Daily View                 | Score, contributing factors        | `momentumScore`                                   | Must reflect training, nutrition, recovery          | Empty state when data is sparse            |
| Progress Photos         | Visual tracking         | `progress.tsx`                       | Deep Dive (Photo Sheet)    | Uploaded image, view, phase, notes | `state.progressPhotos`                            | Must preserve local privacy (Base64 dataUrl)        | Large images might exceed quota            |
| Photo History           | View past photos        | `progress.tsx`                       | Deep Dive                  | Timeline of photos and weigh-ins   | `progressPhotos`, `bodyweightEntries`             | chronological sorting                               |                                            |

## 4. Stats Daily View inventory

- **Header**: "Progress" heading, Layout mode toggle (Daily View / Deep Dive).
- **Bodyweight Section**:
  - **Heading/Label**: None explicitly, just shows the metric.
  - **Primary Metric**: Current Bodyweight (e.g., 185 lb).
  - **Supporting Context**: Delta vs 7-day average, Target weight, sparkline of recent entries.
  - **User Action**: "Log weigh-in" button (opens detail sheet).
  - **Component**: Inline in `ProgressView`.
  - **Source File**: `src/components/app/views/progress.tsx`.
  - **Data Dependency**: `state.profile.bodyweightLb`, `state.profile.targetBodyweightLb`, `state.bodyweightEntries`.
  - **Empty Behavior**: Shows default/profile weight.
- **Goal Progress Section**:
  - **Heading/Label**: "Goal Progress".
  - **Primary Metric**: Progress percentage for active goals.
  - **Supporting Context**: Target vs Current values.
  - **Component**: Maps over `goalList`.
  - **Source File**: `src/components/app/views/progress.tsx`.
  - **Empty Behavior**: Displays "No active goals".
- **Momentum Section**:
  - **Heading/Label**: "Momentum Score".
  - **Primary Metric**: Momentum status (e.g., "Building").
  - **Supporting Context**: Description of consistency.
  - **User Action**: Click to open `momentum-popup.tsx` sheet.
  - **Source File**: `src/components/app/views/progress.tsx`.

**Does it answer "Am I progressing?"**: Yes, primarily through the bodyweight delta, goal progress bars, and momentum score shown in the first viewport. Information is action-first, allowing immediate logging.

## 5. Stats Deep Dive inventory

- **Subtabs**: Analytics, Body, Goals, Insights.
- **Analytics Tab**: (Not fully detailed in provided source, likely placeholders for phase 2 charts).
- **Body Tab**: Focuses on body composition or measurements if supported.
- **Goals Tab**:
  - **Heading**: "Goals".
  - **Analytical Purpose**: Detailed goal tracking, pace, projections.
  - **Metric**: Goal current vs target, weekly pace, projected completion date.
  - **Component**: `GoalsTab` inside `progress.tsx`.
  - **Data Dependency**: `getGoalDetailAnalytics`.
- **Insights Tab**:
  - **Heading**: "Actionable Insights", "AI Progress Coach", "Education".
  - **Purpose**: Textual analysis of trends ("What's Improving", "What Needs Attention").
- **Progress History (Photo/Weigh-in Timeline)**:
  - **Component**: `ProgressHistoryTab` in `progress.tsx`.
  - **Analytical Purpose**: Chronological timeline of bodyweight and photo events.

**Deep Dive Support**: Supports bodyweight history (via timeline), goal progress (via Goals tab), momentum (via popup/insights), progress photos (via PhotoSheet and timeline), insufficient history states (via `needs_more_data` statuses in analytics).

## 6. Weigh-in lifecycle map

1.  **Entry Point**: User clicks "Weigh In" from Quick Actions (Home) or Stats view.
2.  **Opening Control**: Opens `WeighInSheet` (BottomSheet) defined in `quick-popups.tsx`.
3.  **Input Fields**: Numeric input (`type="number"`, `inputMode="decimal"`).
4.  **Units**: Fixed to `lb` in the UI display (though tied to `profile.units` conceptually).
5.  **Date Field**: Defaults to current timestamp (`Date.now()`). No explicit date picker for backdating.
6.  **Validation**: Requires a non-zero, valid number (`if (!wt) return;`).
7.  **Submit Behavior**: Clicks "Save weigh-in". Updates `bodyweightEntries` (appends), `profile.bodyweightLb` (overwrites), and `goals` (updates current bodyweight target).
8.  **Edit/Delete Behavior**: Currently unsupported (no UI to edit or delete past weigh-ins).
9.  **Success Feedback**: Sheet closes, UI updates reactively. A toast "Weigh-in saved" may appear (based on tests).
10. **Data Dependency**: `fitcore.v1` local storage via `useStore`.
11. **Tests**: `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`.

## 7. Bodyweight data-model and presentation map

- **Stored value**: Numeric float (`weightLb`).
- **Unit**: Pounds (lb).
- **Date**: Unix timestamp (`createdAt`).
- **Source**: User manual entry.
- **Current value selection**: Latest entry by `createdAt`, or fallback to `profile.bodyweightLb`.
- **Previous value selection**: Previous entry in chronologically sorted array.
- **Change calculation**: Delta between current and last entry, or 7-day average difference.
- **Trend direction**: Visualized in sparkline and text color (green for positive delta, red for negative - though this might be inverted for weight loss goals).
- **Missing-value behavior**: Handled safely, shows placeholders or omits sparkline if < 2 points.
- **Tests**: `tests/e2e/chart-empty-data-smoke.spec.ts` handles empty bodyweight arrays.

## 8. Goal lifecycle and goal-state map

- **Goal types**: `weekly_workouts`, `protein`, `calories`, `weight`, `steps`, `sleep`, `volume`. (As seen in `GoalsPanel`).
- **Goal creation**: Via `CustomizeGoalsSheet` on Home, selecting predefined goals.
- **Target value**: Pulled from `profile` or `nutritionTargets` (e.g., `state.profile.targetBodyweightLb`).
- **Starting value**: Baseline implicitly tracked in analytics engine, but simple UI just uses 0 or current.
- **Goal status**: Handled by `statusFor` function: "Goal hit" (>= 100%), "Almost there" (>= 80%), "On track" (>= 50%), "Behind" (> 0%), "Not started" (0%).
- **Goal Analytics (`goal-detail-metrics.ts`)**:
  - Calculates `currentWeeklyPace`, `neededWeeklyPace`, `projection` (projected completion date).
  - Handles states: `ready`, `needs_more_data`, `unavailable`.
  - Stale behavior: Flags if latest measurement is older than `GOAL_STALE_MEASUREMENT_DAYS`.
- **Multiple-goal behavior**: UI limits to `MAX_GOALS` (5) on Home.
- **Tests**: `tests/unit/goal-detail-metrics.test.ts`.

## 9. Momentum inventory

- **Canonical symbol**: `momentumScore` (analytics), `Momentum` (UI).
- **Definition**: Combines consistency across training, nutrition logging, and recovery check-ins.
- **Display locations**: Home (potentially), Stats Daily View, Momentum BottomSheet.
- **Contributors**: Exposed via `mScore.factors` in `MomentumScore` popup.
- **Historical behavior**: Summarizes recent past (e.g., 7-14 days).
- **Empty behavior**: Shows "Momentum becomes more useful as FitCore learns your normal rhythm."
- **Tests**: E2E tests check for presence of "Momentum Score" heading.

## 10. Progress-photo lifecycle map

- **Entry points**: "Add photo" button in Stats Deep Dive.
- **Camera/Upload**: Standard HTML file input (`<input type="file" accept="image/*">`).
- **Supported file**: Images, converted to Base64 `dataUrl` via `FileReader`. Max 4MB size limit.
- **Fields**: View (front, side, back), Phase (bulk, cut, maintenance), Notes.
- **Date assignment**: `Date.now()`.
- **Delete behavior**: Supported via "Delete photo" button in detail view.
- **Photo history**: Displayed in `ProgressHistoryTab` timeline.
- **Privacy**: Handled entirely client-side in local storage.
- **Tests**: `tests/e2e/data-contract-invariants.spec.ts` (checks `photo-front` id).

## 11. Comparison-selector inventory

- **Metric selector**: Implicit in Daily View (scroll to section).
- **Date selector**: Implicit in 7-day averages and 14-day sparklines. No explicit date range picker in current simple UI.
- **Before-and-after selection**: Side-by-side mode mentioned in requirements, basic timeline implemented.
- **Missing-data behavior**: Safely handles empty arrays without crashing (`chart-empty-data-smoke.spec.ts`).

## 12. Action and interaction matrix

| Action Label  | Location              | Triggering Control  | Result                      | Overlay Behavior   | State Mutation                 |
| :------------ | :-------------------- | :------------------ | :-------------------------- | :----------------- | :----------------------------- |
| Weigh In      | Quick Actions / Stats | "Weigh In" button   | Opens `WeighInSheet`        | BottomSheet        | Appends to `bodyweightEntries` |
| Add goals     | Home                  | "Customize" button  | Opens `CustomizeGoalsSheet` | BottomSheet        | Updates `STORE_KEY`            |
| Add photo     | Stats                 | "Add photo" button  | Opens `PhotoSheet`          | BottomSheet (tall) | Appends to `progressPhotos`    |
| Delete photo  | Stats                 | "Delete photo" btn  | Confirm dialog              | Standard alert     | Removes from `progressPhotos`  |
| Open Momentum | Stats                 | Momentum card click | Opens Momentum popup        | BottomSheet        | None (Read-only)               |

## 13. Sheet, dialog, and popup inventory

- **`WeighInSheet`**: Triggered by Weigh In action. Input: weight, notes. Validation: must be non-zero. Dismissal: save or click outside.
- **`CustomizeGoalsSheet`**: Triggered by Home goals customize. Content: list of available goals with toggles. Dismissal: click outside.
- **`PhotoSheet`**: Triggered by Add Photo. Input: file upload, view select, phase select, notes text. Validation: max 4MB size. Dismissal: save or click outside.
- **`Momentum` Popup**: Triggered by Momentum card. Content: read-only breakdown of factors.

## 14. Data and analytics dependency map

- **`bodyweightEntries`**: Core state. Used for current weight, trend sparkline, goal progress baseline.
- **`goals`**: Core state. Array of user goals.
- **`progressPhotos`**: Core state. Array of Base64 images with metadata.
- **`goal-detail-metrics.ts`**: Derives pace (`currentWeeklyPace`), required pace (`neededWeeklyPace`), and projections based on bodyweight entries. Used in Deep Dive Goals tab.
- **`daily-decision.ts`**: Likely handles overarching daily aggregations for Home/Stats.

## 15. Chart and visualization inventory

- **Sparkline (`Sparkline` component)**: Simple SVG line chart for 14-day bodyweight trend.
  - **Metric**: Bodyweight.
  - **Empty behavior**: Hidden if < 2 points.
  - **Interaction**: None (non-interactive).
- **Goal Progress Bars**: Horizontal filled bars representing completion percentage.
  - **Metric**: Various (weight, workouts, protein).
  - **Interaction**: None.
- **Momentum Bars**: Horizontal bars in popup showing factor scores.

## 16. Data-quality and state-coverage matrix

| State           | Weigh-ins                         | Goals                                           | Momentum                          | Progress Photos       |
| :-------------- | :-------------------------------- | :---------------------------------------------- | :-------------------------------- | :-------------------- |
| Ready           | Shows delta/sparkline             | Shows progress bar                              | Shows score breakdown             | Shows timeline        |
| Empty           | Shows default profile wt          | "No active goals"                               | "Momentum becomes more useful..." | "No progress history" |
| Needs More Data | N/A (requires 2 points for chart) | `goal-detail-metrics` handles `needs_more_data` | N/A                               | N/A                   |
| Loading         | Instant (local storage)           | Instant                                         | Instant                           | Instant               |

## 17. Cross-domain dependency and presentation map

- **Home Daily View**: Displays `GoalsPanel` which pulls data from Training (workouts, volume), Nutrition (protein, calories), Recovery (sleep), and Stats (bodyweight).
- **Jarvis**: `goals-profile-card.tsx` allows Jarvis to surface goal state.
- **Preservation risk**: Modifying the shape of `bodyweightEntries` or `goals` will break the Home dashboard and Jarvis integrations.

## 18. Privacy and trust observations

- **Bodyweight & Photos**: Highly sensitive personal data.
- **Current privacy messaging**: Photo upload sheet does not explicitly state "stored locally", but the architecture is purely client-side local storage (`fitcore.v1`).
- **Accidental exposure**: Progress photos are visible in the Deep Dive timeline. Large images could cause local storage quota errors, leading to silent data loss if not handled robustly (current 4MB check exists).
- **Data Safety Phase Integration**: These surfaces are prime candidates for AI-memory policy enforcement (ensuring photos/weights aren't arbitrarily synced or sent to LLMs without consent).

## 19. Responsive and accessibility observations

- **Confirmed implementation**: Bottom sheets use native/portal behavior. Focus management generally handled by standard dialog patterns.
- **Confirmed gap**: `Sparkline` SVG lacks robust accessible text alternatives (relies on adjacent numerical text).
- **Probable risk**: Large progress photos on narrow screens might cause horizontal scrolling if not strictly contained with `object-cover` and max-widths.

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
- [ ] The Momentum score popup must retain its factor breakdown.
- [ ] Progress photo base64 storage must remain under the 4MB safety limit to prevent quota crashes.
- [ ] Daily View must remain action-first; Deep Dive must contain the analytical tabs.
- [ ] All E2E smoke tests (e.g., `chart-empty-data-smoke.spec.ts`) must pass without weakening selectors.

## 22. Safe future task boundaries

- **Safe for UI work**: `src/components/app/views/progress.tsx`, `src/components/app/popups/momentum-popup.tsx`.
- **Require coordination**: `src/lib/store.tsx` (state shape), `src/components/app/goals-panel.tsx` (used on Home).
- **Untouchable**: `src/lib/analytics/goal-detail-metrics.ts` (complex domain logic must not be broken by UI changes).

## 23. Open questions and uncertainties

- **Weigh-in editing**: There is currently no UI to edit or delete a weigh-in. Will the premium redesign include this? (Blocks full history management).
- **Photo Comparison**: The requirements mention "before-and-after selection" and "overlay mode", but the current code only supports a basic chronological list/timeline. Are these planned for the immediate redesign phase?

## 24. File index

- **Routes**: `src/components/app/views/progress.tsx`
- **Shared components**: `src/components/app/goals-panel.tsx`
- **Weigh-in components**: `src/components/app/popups/quick-popups.tsx`
- **Momentum components**: `src/components/app/popups/momentum-popup.tsx`
- **Analytics/data dependencies**: `src/lib/analytics/goal-detail-metrics.ts`, `src/lib/analytics.ts`
- **Tests**: `tests/e2e/bodyweight-weigh-in-validation-smoke.spec.ts`, `tests/e2e/progress-rich-data-smoke.spec.ts`, `tests/unit/goal-detail-metrics.test.ts`
