# FitCore Recovery Feature Preservation Map

## 1. Executive summary

- **Current Recovery Architecture:** The Recovery feature is segmented into two primary modes: "Daily View" for action-first summaries and "Deep Dive" for analytical density. The system relies heavily on `AppState` containing `recoveryCheckIns`, `sleepEntries`, `muscleFatigue`, and parsed `activeWorkout` signals. The underlying data logic is isolated within `src/lib/analytics/` files (e.g., `domain-metrics.ts`, `fitcore-insight-readiness.ts`). The UI heavily leverages Sheets and Popups (e.g., `BottomSheet`) for detailed views.
- **Major Capabilities:**
  - Synthesizing subjective check-ins (energy, soreness, stress, motivation) and objective data (sleep) into Readiness and Recovery scores.
  - Interactive visual Body Heatmap mapping volume, strength, recovery, and imbalance.
  - Granular tracking of localized muscle fatigue and volume over time.
  - Generating actionable daily recommendations (e.g., "reduce volume", "train hard") driven by `buildDailyDecision`.
- **Recovery vs. Readiness:**
  - _Readiness_ (`readinessScore` in `src/lib/analytics.ts`) reflects immediate factors: recent sleep quality/duration and subjective check-ins (energy, soreness, stress, motivation).
  - _Recovery_ (`recoveryScore` in `src/lib/analytics.ts`) is a broader metric balancing current Readiness against recent training load (total volume). Hard sessions can lower Recovery even if Readiness inputs (sleep, motivation) are solid.
- **Feature-Preservation Risks:**
  - Merging or confusing Readiness and Recovery scores.
  - Losing the distinction between missing data and a value of zero (especially for sleep or check-ins).
  - Unintentionally converting localized soreness indicators into diagnostic medical claims.
  - Breaking the interactive aspects of the Body Heatmap (front/back modes, muscle selection).
  - Losing the fallback states where users haven't provided check-ins.
- **Daily View Responsibilities:** Provide an action-first summary answering "How recovered am I today?". It features a top-level readiness score with a ring, quick action buttons (Check-in, Sleep), top-level stats (last sleep, 7d avg), and a summary Body Status card displaying fatigued muscles. It avoids subtabs.
- **Deep Dive Responsibilities:** Provide granular analysis across strictly defined subtabs: Health, Sleep, Body, and Insights. It supports historical trends (e.g., 14-day readiness chart), range comparisons, exact values, and AI insight summaries.
- **Findings for Future Redesign:** The Daily View must remain strictly actionable without introducing tabs. The heatmap's 4 modes (`load`, `strength`, `imbalance`, `recovery`) are critical and must remain intact in the Body tab. The separation of normal soreness vs. pain (which triggers medical warnings) is a critical product boundary documented in the product bible and implemented in `daily-decision.ts`.

## 2. Canonical terminology and route structure

- **Canonical runtime tab name:** Recovery
- **User-facing labels:** Recovery, Readiness, Body Status, Heat Map, Check-in, Sleep
- **Route files:** The main view is encapsulated in `src/components/app/views/recovery.tsx`.
- **Daily View route/state:** Rendered when `layoutMode === "daily"` via `DailyViewRecovery` component.
- **Deep Dive route/state:** Rendered when `layoutMode === "deepDive"`. Utilizes `SubTabs` component.
- **Subviews (Deep Dive):**
  - Health (`HealthTab`)
  - Sleep (`SleepDeepDiveTab`)
  - Body (`BodyTab`)
  - Insights (`InsightsTab`)
- **Navigation entry points:** Reached via the global shell bottom navigation (mapped to the Recovery tab).
- **Cross-domain links:** Readiness and Recovery data are heavily consumed by `src/lib/daily-decision.ts`, affecting Training recommendations.
- **Inconsistent terms:** The UI refers to "Readiness" prominently in the top ring in Daily View, while the tab and overall section are named "Recovery." "Soreness" is tracked in `recoveryCheckIns`, while "Muscle fatigue" is tracked via a separate `muscleFatigue` map (`fresh`, `moderate`, `fatigued`, `very`).

## 3. Complete feature-preservation inventory

| Feature Name             | User Purpose                          | Primary Files                                         | Data Source                        | Preservation Requirement                                                        | Known Weakness/Risk                                         |
| :----------------------- | :------------------------------------ | :---------------------------------------------------- | :--------------------------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------------- |
| **Readiness Score**      | Immediate daily status check.         | `analytics.ts`, `recovery.tsx`, `readiness-popup.tsx` | `sleepEntries`, `recoveryCheckIns` | Must combine sleep (qty/qual) and check-in (energy/soreness/stress/motivation). | Cannot drop to 0 if data is just missing; uses baseline 70. |
| **Recovery Score**       | Status check factoring in load.       | `analytics.ts`, `readiness-popup.tsx`                 | `ReadinessScore`, `workoutVolume`  | Must balance readiness against recent training volume.                          | Can be confusing vs Readiness; needs clear UI copy.         |
| **Recovery Check-in**    | Capture subjective feelings.          | `recovery.tsx`                                        | User input to `AppState`           | Must retain Energy, Soreness, Stress, Motivation (1-10 sliders).                | Subjective scales must remain bounded 1-10.                 |
| **Sleep Logging**        | Manually record sleep.                | `recovery.tsx`                                        | User input to `AppState`           | Must retain Hours (decimal) and Quality (1-10).                                 | Missing sleep should not count as 0 hours.                  |
| **Muscle Fatigue Entry** | Localized muscle status.              | `recovery.tsx`                                        | User input to `muscleFatigue`      | Must map `fresh`, `moderate`, `fatigued`, `very` to specific muscles.           |                                                             |
| **Body Heatmap**         | Visualize muscle load/recovery.       | `body-heatmap.tsx`, `heatmap-popup.tsx`               | `muscleMap(state, mode)`           | Must support Front/Back and 4 modes.                                            | SVG interaction can trap touch events if not careful.       |
| **Heatmap: Load Mode**   | Show 7-day volume stress.             | `analytics.ts`, `heatmap-popup.tsx`                   | `workoutsInRange(state, 7)`        | Must reflect relative set count across muscles.                                 |                                                             |
| **Heatmap: Strength**    | Show 30-day relative strength.        | `analytics.ts`, `heatmap-popup.tsx`                   | `workoutsInRange(state, 30)`       | Must reflect volume-load contribution over 30d.                                 |                                                             |
| **Heatmap: Imbalance**   | Highlight neglected/overworked areas. | `analytics.ts`, `heatmap-popup.tsx`                   | `workoutsInRange(state, 7)`        | Must calculate distance from mean volume.                                       |                                                             |
| **Heatmap: Recovery**    | Estimate muscle readiness.            | `analytics.ts`, `heatmap-popup.tsx`                   | `workoutsInRange(state, 3)`        | Must invert recent load to show recovery.                                       |                                                             |
| **Muscle Detail Sheet**  | Specific muscle stats/tips.           | `muscle-popup.tsx`                                    | `muscleStats()`                    | Must show sets/vol/last trained and AI Tip.                                     | Requires `muscleStats` analytic helper.                     |
| **14-Day Trend**         | Show historical readiness.            | `readiness-popup.tsx`                                 | Computed series in component       | Must correctly blend historical sleep/checkins.                                 | Currently synthesized on-the-fly in UI layer.               |

## 4. Recovery Daily View inventory

- **Readiness Ring & Recommendation:**
  - _Visible Label:_ "Today's readiness", `{score}%`
  - _Purpose:_ Primary status indicator.
  - _Component:_ `Ring`, `DailyViewRecovery` in `recovery.tsx`.
  - _Empty Behavior:_ Shows "—" for score, "Add a check-in or sleep entry to get a recommendation."
  - _Action:_ None directly on ring.
- **Quick Actions:**
  - _Visible Label:_ "Check-in", "Sleep"
  - _Purpose:_ Fast logging.
  - _Component:_ `PrimaryButton`, `GhostButton`.
  - _Action:_ Opens `CheckInSheet` or `SleepSheet`.
- **Sleep Stats:**
  - _Visible Label:_ "Last sleep", "7d avg"
  - _Purpose:_ Top-level sleep context.
  - _Component:_ `StatCard`.
  - _Empty Behavior:_ Shows "—" if no sleep data.
- **Body Status:**
  - _Visible Label:_ "Body Status"
  - _Purpose:_ Summary of localized fatigue.
  - _Component:_ `Card` acting as button.
  - _Action:_ Opens `FatigueSheet`.
  - _Empty Behavior:_ "All muscles fresh."
- **Last Check-in Summary:**
  - _Visible Label:_ "Last check-in"
  - _Purpose:_ Context of recent subjective state.
  - _Empty Behavior:_ Hidden if no check-ins exist.

- _How recovered am I?_ Answered immediately at the top via the Readiness score ring and the descriptive text (e.g., "Solid recovery — normal training day"). All critical info is visible without scrolling. The view is action-first (Check-in/Sleep buttons are prominent).

## 5. Recovery Deep Dive inventory

- _Subtabs:_ Health, Sleep, Body, Insights.
- **Health Tab:**
  - Contains `StatCard` grid (Avg Readiness, 7d checks, Avg sleep, Fatigue areas).
  - `ReadinessTrendCard` .
  - `RecentCheckInsList` (shows history of `recoveryCheckIns`).
- **Sleep Tab (`SleepDeepDiveTab`):**
  - `SleepChartCard`: Shows 7-day bar chart of sleep hours. Empty behavior: "No sleep logged this week."
  - `PlannedFeatureCard`s for Sleep Debt, Consistency, Wake Time.
  - "Log sleep" button to open `SleepSheet`.
- **Body Tab (`BodyTab`):**
  - `Card` wrapping `BodyHeatmap` (defaulting to front).
  - "Expand heat map" action opening `HeatmapDetailSheet`.
  - `PlannedFeatureCard`s for Mobility Routine and Injury Tracking.
- **Insights Tab (`InsightsTab`):**
  - `SupplementsTodayCard`.
  - `PlannedFeatureCard`s for correlations (HRV vs Performance, Strain vs Recovery, etc.) and Safety Alerts.

- _Capabilities:_ Supports historical sleep charts, check-in history lists, and detailed muscle heatmap exploration (via the expand sheet).
- _Gaps (Not to be invented):_ Exact 14-day trend charts exist only inside the `ReadinessDetailSheet` popup, not directly on the Deep Dive tab surfaces.

## 6. Recovery check-in flow map

1.  **Entry:** User taps "Check-in" button on Daily View.
2.  **Sheet Opens:** `CheckInSheet` renders via `BottomSheet`.
3.  **Fields Shown:**
    - Energy (1-10 slider, default 7)
    - Soreness (1-10 slider, default 3)
    - Stress (1-10 slider, default 3)
    - Motivation (1-10 slider, default 8)
    - Notes (Textarea, optional)
4.  **Validation/Constraints:** Sliders naturally constrain 1-10. Empty strings in notes are converted to `undefined`.
5.  **Submit Behavior:** Tapping "Save check-in" appends a new record to `state.recoveryCheckIns` with a timestamp and unique ID. Sheet closes.
6.  **Cancel/Dismiss:** Tapping outside or close button dismisses sheet without mutating state.
7.  **Refresh:** State update automatically triggers React re-render of `DailyViewRecovery` (updating Readiness score and ring).
8.  **Dependencies:** Tests rely on exact button names ("Save check-in").

## 7. Sleep feature map

- **Sleep Logging:** Manual via `SleepSheet`. Collects Hours (decimal input, default "7.5") and Quality (1-10 slider, default 7). Optional text fields for Bedtime/Wake time are concatenated into the `notes` field.
- **Display Locations:**
  - Daily View (Last sleep hours/quality, 7d avg hours).
  - Deep Dive > Sleep Tab (7-day bar chart).
  - Readiness Popup (Last sleep hours pill).
- **Score Contribution:** Sleep heavily drives `readinessScore`. Formula `Math.min(100, (lastSleep.hours / 8) * 50 + lastSleep.quality * 5)`.
- **Data Quality:** "—" is rendered when missing. A value of 0 is treated as actual 0 hours, not missing data.
- **Preservation Requirement:** Manual entry must retain decimal support for hours. Missing sleep must gracefully degrade the Readiness score to a baseline (70) rather than punishing the user with a 0 score.

## 8. Soreness, fatigue, stress, and energy map

- **Energy:** Tracked 1-10 in Check-ins. Higher is better. Drives Readiness.
- **Motivation:** Tracked 1-10 in Check-ins. Higher is better. Drives Readiness.
- **Stress:** Tracked 1-10 in Check-ins. _Lower_ is better. Formula uses `(10 - stress)` or `(6 - stress)` depending on context (Daily View vs `domain-metrics.ts`).
- **Soreness (General):** Tracked 1-10 in Check-ins. _Lower_ is better. Formula uses `(10 - soreness)` or `(6 - soreness)`.
- **Muscle Fatigue (Localized):** Tracked via `FatigueSheet`. Uses a discrete scale (`fresh`, `moderate`, `fatigued`, `very`). Displayed as colored chips in Daily View.
- **Inconsistencies:** The Readiness formula inside `recovery.tsx` uses a base-10 inversion `(10 - check.soreness)`, while `recoveryCheckInReadinessScore` in `domain-metrics.ts` uses a base-6 inversion `(6 - check.soreness)`. This is existing behavior; preserve the exact logic in their respective files.

## 9. Body heatmap and muscle-recovery inventory

- **Visuals:** SVGs mapped to anatomical zones (`shoulders`, `chest`, `biceps`, `core`, `quads`, `calves`, `back`, `triceps`, `glutes`, `hamstrings`).
- **Interaction:** Clicking a muscle opens `MuscleDetailSheet`.
- **Modes:**
  1.  _Load:_ Highlights 7-day relative volume. Colors scale `var(--section-rgb)`.
  2.  _Strength:_ Highlights 30-day relative strength contribution. Colors scale Blue.
  3.  _Imbalance:_ Highlights absolute distance from mean volume (red).
  4.  _Recovery:_ Inverts recent load to show readiness (green to red scale).
- **Legend/Scale:** Present in `HeatmapDetailSheet` ("Low" to "High").
- **Mobile Concerns:** Compact mode disables SVG `onClick` and delegates to a parent button to avoid touch trapping.
- **Medical Disclaimer:** Code does not infer injury, only volume-derived "recovery" or "fatigue".

## 10. Recommendation and explanation inventory

- **Readiness Recommendation (Daily View):**
  - `>= 75`: "Great recovery — train hard today."
  - `>= 60`: "Solid recovery — normal training day."
  - `>= 40`: "Reduce volume or intensity ~20%."
  - `< 40`: "Rest, mobility, or light cardio only."
- **Missing Data (Daily View):** "Add a check-in or sleep entry to get a recommendation."
- **Readiness/Recovery Explanation (`ReadinessDetailSheet`):**
  - Recovery: "It balances your current readiness with recent training load..."
  - Readiness: "It reflects your recent sleep quality, energy, motivation..."
- **AI Tip (`MuscleDetailSheet`):** Suggests volume bumps if recovered, or waiting 24-48h if still recovering.
- **Requirement:** Do not rewrite static copy. Ensure the distinction between Readiness and Recovery explanations remains exact.

## 11. Action and interaction matrix

| Action                       | Location              | Component         | Result/Destination                        |
| :--------------------------- | :-------------------- | :---------------- | :---------------------------------------- |
| **Check-in**                 | Daily View            | `PrimaryButton`   | Opens `CheckInSheet`                      |
| **Log Sleep**                | Daily View, Deep Dive | Buttons           | Opens `SleepSheet`                        |
| **Update Body Status**       | Daily View            | `Card`            | Opens `FatigueSheet`                      |
| **Expand heat map**          | Deep Dive (Body tab)  | `GhostButton`     | Opens `HeatmapDetailSheet`                |
| **Toggle Side (Front/Back)** | Heatmap Component     | Toggle Buttons    | Updates `BodyHeatmap` side state          |
| **Select Muscle**            | Heatmap SVG           | `<path>` click    | Opens `MuscleDetailSheet` for that muscle |
| **View Readiness Details**   | Various (assumed)     | Trigger to popups | Opens `ReadinessDetailSheet`              |

## 12. Sheet, dialog, and popup inventory

- **`CheckInSheet`:** Captures 4 sliders + notes.
- **`SleepSheet`:** Captures hours, quality, bed/wake times.
- **`FatigueSheet`:** Renders discrete selectors for 10 muscle groups. Uses a tall BottomSheet.
- **`ReadinessDetailSheet`:** Shows dual Readiness/Recovery scores, text explanations, 14-day trend line chart (Recharts), and "Best Today" muscle recommendation.
- **`HeatmapDetailSheet`:** Contains 4-mode toggle, dual front/back mini-heatmaps, and color scales.
- **`MuscleDetailSheet`:** Shows Sets this week, Volume, Last trained, vs Last week delta, Recovery/Strength/Imbalance progress bars, and AI Tips.

## 13. Data and analytics dependency map

- `readinessScore(state)` (`src/lib/analytics.ts`): Blends recent sleep and checkins. Output 0-100.
- `recoveryScore(state)` (`src/lib/analytics.ts`): Blends `readinessScore` with volume load ratio. Output 0-100.
- `muscleMap(state, mode)` (`src/lib/analytics.ts`): Core engine for heatmap calculations based on 3, 7, or 30-day workout history.
- `bestMuscleToTrainToday(state)` (`src/lib/analytics.ts`): Finds highest recovery score minus load penalty.
- `recoveryCheckInReadinessScore(checkIn)` (`src/lib/analytics/domain-metrics.ts`): Formula scoring a single check-in.
- `muscleStats(state, muscle)` (`src/lib/analytics-extra.ts`): Generates specific volume and delta metrics for detail sheets.
- _Contracts:_ Recovery UI strictly consumes from these pure functions; it does not mutate state directly except via the dedicated logging sheets.

## 14. Chart and visualization inventory

- **Readiness Ring:** Circular SVG stroke, `DailyViewRecovery`.
- **Readiness Trend:** `LineChart` (Recharts) in `ReadinessDetailSheet`. Shows 14 days. Custom tooltips.
- **Sleep Chart:** `BarChart` (Recharts) in `SleepDeepDiveTab`. Shows 7 days of hours.
- **Body Heatmap:** Custom SVG path collection in `body-heatmap.tsx`. Maps `muscleMap` intensities to CSS colors via `colorFor` function.
- **Muscle Detail Bars:** Standard HTML `div` bars showing % fill for Recovery, Strength, Imbalance in `muscle-popup.tsx`.
- _Preservation Risk:_ Missing dates in charts are generally handled safely, but ensure Recharts components are not stripped of their `ResponsiveContainer` wrappers, which prevent layout overflow.

## 15. Data-quality and state-coverage matrix

| State                 | Readiness Score    | Body Heatmap  | Muscle Details | Chart Trends                |
| :-------------------- | :----------------- | :------------ | :------------- | :-------------------------- |
| **Ready**             | Shows 0-100        | Vivid colors  | Full stats     | Full lines/bars             |
| **Empty/No Data**     | Shows "—"          | Gray baseline | Zeroed stats   | Empty state copy            |
| **Missing Check-ins** | Uses baseline (70) | N/A           | N/A            | Chart skips gaps gracefully |

- _Distinction:_ "Missing" data must not be computed as 0 (e.g. 0 hours of sleep). The app applies a baseline (70) for readiness when data is absent.

## 16. Cross-domain dependency and presentation map

- **Training Domain:** The `daily-decision.ts` engine (used by Training and AI Jarvis) deeply inspects `recoveryCheckIns`, `sleepEntries`, and `muscleFatigue`.
- _Preservation Risk:_ Changing the schema or value ranges (e.g., 1-10 to 1-100) of `recoveryCheckIns` in a UI redesign will break the `daily-decision.ts` logic, which checks for things like `soreness > 7`. Do not alter the underlying data structures.

## 17. Responsive and accessibility observations

- **Confirmed Implementation:** BottomSheets use `tall` prop for better mobile height management. The compact mode of the Heatmap explicitly disables interactive elements to prevent touch-trapping on parent cards.
- **Confirmed Gap:** Some stat pills and slider labels have very small text (`text-[10px]`) which may fail minimum readable text accessibility guidelines if contrast is low.
- **Probable Risk:** The Recharts `ResponsiveContainer` can sometimes fail to resize down correctly on rotation or narrow mobile viewports, potentially causing horizontal scrolling.

## 18. Current test-coverage map

- `tests/unit/recovery-detail-metrics.test.ts`: Covers analytic functions.
- `tests/unit/fitcore-insight-readiness.test.ts`: Covers readiness calculations.
- `tests/e2e/recovery-check-in-validation-smoke.spec.ts`: E2E verification that check-in sheets open, validate inputs, save correctly to localStorage, and handle empty saves without crashing.
- `tests/e2e/daily-decision.spec.ts`: Extensively tests how recovery data impacts training recommendations (e.g., "legs very sore" triggering a yellow/red light).
- _Requirement:_ Any UI redesign must ensure the "Save check-in" exact match remains, or the E2E tests will fail.

## 19. Preservation checklist for future implementation

- [ ] `readinessScore` and `recoveryScore` remain distinctly separate concepts in the UI and underlying logic.
- [ ] Check-in sliders retain 1-10 ranges.
- [ ] Sleep hours allows decimal input.
- [ ] Missing data results in empty UI states ("—"), not 0 values.
- [ ] Body heatmap retains 4 explicit modes (`load`, `strength`, `imbalance`, `recovery`).
- [ ] Muscle detail sheet remains accessible for all 10 defined muscle groups.
- [ ] Daily View has exactly 0 subtabs.
- [ ] Deep Dive has exactly 4 subtabs (Health, Sleep, Body, Insights).
- [ ] UI text does not diagnose injuries (e.g., "Pain").
- [ ] `Save check-in` button retains its accessible name for Playwright.

## 20. Safe future task boundaries

- **Safe for UI Redesign:** `src/components/app/views/recovery.tsx` layout and styling. CSS classes within `CheckInSheet` and `SleepSheet`.
- **Requires Coordination:** Modifying `src/components/app/body-heatmap.tsx` (used in popups). Modifying any popup in `src/components/app/popups/` (they are globally shared).
- **Untouchable (Phase A):** `src/lib/analytics.ts`, `src/lib/analytics/domain-metrics.ts`, `src/lib/daily-decision.ts`, `src/lib/types.ts` (State schemas).

## 21. Open questions and uncertainties

- **Inconsistent Readiness Formula:** Why does `recovery.tsx` use `(10 - soreness)` while `domain-metrics.ts` uses `(6 - soreness)`?
  - _Why unresolved:_ Both exist in `main` without documented clarification.
  - _Action:_ Preserve both as they are. Does not block redesign, but requires exact porting of logic.
- **App Mode Routing:** Does `layoutMode` toggle trigger a URL change or just a state change?
  - _Why unresolved:_ Memory notes indicate it's an app-wide presentational state, not distinct routes.
  - _Action:_ Redesign must not convert the toggle into router `<Link>` elements.

## 22. File index

- **Routes & Views:**
  - `src/components/app/views/recovery.tsx`
- **Shared Components & Heatmap:**
  - `src/components/app/body-heatmap.tsx`
- **Sheets / Popups:**
  - `src/components/app/popups/readiness-popup.tsx`
  - `src/components/app/popups/heatmap-popup.tsx`
  - `src/components/app/popups/muscle-popup.tsx`
- **Analytics / Data:**
  - `src/lib/analytics.ts`
  - `src/lib/analytics-extra.ts`
  - `src/lib/analytics/domain-metrics.ts`
  - `src/lib/daily-decision.ts`
- **Tests:**
  - `tests/e2e/recovery-check-in-validation-smoke.spec.ts`
  - `tests/e2e/daily-decision.spec.ts`
- **Documentation:**
  - `docs/product-bible/book-07-recovery-sleep-and-wearables/01-recovery-system-overview.md`
  - `docs/product-bible/book-07-recovery-sleep-and-wearables/03-readiness-score-and-recovery-decisions.md`
  - `docs/product-bible/book-07-recovery-sleep-and-wearables/04-check-ins-soreness-pain-fatigue-and-stress.md`
