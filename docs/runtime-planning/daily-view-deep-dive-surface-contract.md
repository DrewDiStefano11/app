# FitCore Daily View and Deep Dive Surface Contract

## 1. Purpose

The Daily View and Deep Dive modes exist to support two distinct user mindsets without fragmenting the core application logic.
* **Daily View** is designed for quick, action-oriented interactions. It answers "Where am I today?" and "What do I need to do next?"
* **Deep Dive** is designed for analysis, exploration, and education. It answers "How am I trending?" and "Why did this happen?"

These modes share the exact same underlying application state, data models, and synchronization logic. They differ purely in presentation—surfacing different levels of detail, altering visual hierarchy, and selectively exposing advanced analytics.

This document serves as the canonical implementation contract for these modes. Implementation agents and reviewers must use this document to determine the correct structure, data requirements, and behaviors for any given screen in either mode. It prevents arbitrary invention of new data types and ensures consistency across the app.

## 2. Global Mode Contract

* **Valid Mode Values:** The only valid layout mode values are `daily` and `deepDive`. Internal variables must reflect these exactly (e.g., `layoutMode === "daily"`).
* **Route Behavior:** Mode toggling is an app-wide presentational state change, not a route change.
* **Persistence Expectations:** The mode selection is persisted globally for the user session (or user preferences) so that switching tabs maintains the selected mode.
* **Data-sharing Expectations:** Both modes rely on the single truth of the global store.
* **No-subtab Daily View Rule:** Every main section (Training, Fuel/Nutrition, Recovery, Stats) must NOT use subtabs when in Daily View mode.
* **Home No-subtab Rule:** The Home tab must NEVER use subtabs in either mode.
* **Naming Contract:**
  * "Daily View" is the visible label for `daily`.
  * "Deep Dive" is the visible label for `deepDive`.
  * The progress tab is called "Stats" user-facing.
* **Settings Behavior:** Settings is NOT a bottom tab. It is accessed via a button on the Home screen.
* **Visual Hierarchy:** Daily View must use larger cards and lower information density compared to Deep Dive, which displays advanced graphs and correlations.
* **Unsupported-data Policy:** Unsupported data must NOT be represented by fabricated or "dummy" values. Planned or unavailable features must be explicitly labeled (e.g., "Planned").

## 3. Main Navigation Contract

* **Home**
  * Visible Label: Home
  * Accessible Label: Home
  * Internal ID: `home` (`src/components/app/views/home.tsx`)
  * Settings exclusion: Settings is accessible from here, but not part of bottom nav.
* **Training**
  * Visible Label: Training
  * Accessible Label: Training
  * Internal ID: `training` (`src/components/app/views/training.tsx`)
* **Fuel/Nutrition**
  * Visible Label: Fuel
  * Accessible Label: Fuel or Nutrition
  * Internal ID: `nutrition` (`src/components/app/views/nutrition.tsx`)
* **Recovery**
  * Visible Label: Recovery
  * Accessible Label: Recovery
  * Internal ID: `recovery` (`src/components/app/views/recovery.tsx`)
* **Stats**
  * Visible Label: Stats
  * Accessible Label: Stats
  * Internal ID: `progress` (`src/components/app/views/progress.tsx`)

**Shared Behavior:**
* Internal IDs must remain unchanged for existing routing logic.
* Mode preservation: The current `layoutMode` (Daily View or Deep Dive) must persist when switching between these tabs.
* Active-workout behavior: Navigating away from Training during an active workout must preserve the active workout state (often displayed via a persistent banner or floating action button).

## 4. Home Daily View Contract

**No subtabs allowed.**

**Sections & Priority Order:**
1. **Header & Settings Button:**
   * Purpose: User greeting and entry point to settings.
   * Interaction: Tapping Settings opens the Settings surface.
2. **Daily View / Deep Dive Toggle:**
   * Purpose: Switch global app layout mode.
3. **Hero (FitCore Score / Overall Status):**
   * Purpose: Top-level daily summary.
   * Required Data: Aggregate score or daily checklist status.
4. **One-Sentence Daily Status:**
   * Purpose: Immediate qualitative feedback.
5. **Next Best Action / Missing Items:**
   * Purpose: Prompt user for due actions (e.g., Log meal, Start workout).
6. **Training Summary:**
   * Purpose: Summary of today's training plan.
7. **Nutrition Summary:**
   * Purpose: High-level macro/calorie status.
8. **Recovery Summary:**
   * Purpose: Readiness score or sleep summary.
9. **Body Heatmap (Compact):**
   * Purpose: Visual indicator of muscle recovery/soreness.
   * Interaction: Non-interactive preview (renders as a single accessible button).
10. **Coach Insight:**
    * Purpose: Brief AI/logic-driven tip (supported data only).
11. **Quick Actions:**
    * Start workout, Log meal, Recovery check-in, Bodyweight.
    * Interaction: Opens respective BottomSheet or action flow.
12. **Honest Empty States:**
    * Missing data must show clear empty states ("No data yet").

**Prohibited Behavior:**
* Do not show unsupported charts.
* Do not fabricate data for the hero score if insufficient data exists.

## 5. Home Deep Dive Contract

**No subtabs allowed.**

* **Detail Changes:** The cards from Daily View (Training, Nutrition, Recovery, Body) expand to show more detailed metrics, trends, and contextual explanations.
* **Persistence:** The same core sections remain visible, just with higher data density.
* **Advanced Information:** May display mini-trend graphs (using simple inline SVG/CSS bars) or more detailed score breakdowns.
* **Prohibited Behavior:** It must NOT turn into a separate tab system. All deep dive info on Home must scroll vertically.

## 6. Training Daily View Contract

**No subtabs allowed.**

**Prohibited Legacy Tabs:** Overview, Active Workout, Log Workout, Exercises, Programs, Performance, History must NOT appear as subtabs.

**Structure:**
* **Training Status Hero:** Readiness to train today.
* **Workout in Progress (if active):** Priority card to resume.
* **Training Logged Today:** Summary if already completed.
* **Start Today's Plan:** Primary action if a workout is scheduled.
* **Start Workout / Resume Workout / Blank Workout:** Quick actions.
* **Templates / Assigned Workout / Recent Workout:** Quick selection options.
* **Weekly Summary:** Small overview of week's progress.
* **Cardio and Sports:** Quick log for non-lifting activities.
* **Performance Preview:** Snippet of recent performance.
* **Planned Soreness/AI Cards:** Clearly labeled as planned if not implemented.

**Active-workout Preservation:** State must be preserved and clearly visible to resume.
**BottomSheet Behavior:** Logging uses BottomSheets to avoid losing context.

## 7. Training Deep Dive Contract

**Exact Subtabs Required:**
1. **Performance:** Purpose: Detailed lift history and PRs.
2. **Strength:** Purpose: Volume and 1RM trends.
3. **Library:** Purpose: View all available exercises and templates.
4. **Insights:** Purpose: AI/logic-driven correlations (requires evidence).

**Data Rules:**
* Supported content only.
* Empty states must explain what data is needed to generate trends/insights.
* Prohibited fabricated content: Do not invent 1RM trends if no history exists.

## 8. Fuel/Nutrition Daily View Contract

**No subtabs allowed.**

**Structure:**
* **Daily Macros Hero:** Visual rings/bars for today's intake.
* **Calories Consumed & Calories Remaining.**
* **Protein, Carbohydrates, Fat:** Quick progress.
* **Log Meal:** Primary action.
* **Hydration Status:**
  * Rule: Must NOT display `0 fl oz` when hydration state does not exist. Show "Log water" or empty state.
* **Supplement Status:**
  * Rule: Values must come from actual logs.
* **Meals Today & Meal Macros:** List of logged meals with option for deletion.
* **Validation:** Prevent invalid macro inputs.
* **No Photo Meal on main surface:** (Unless fully supported and implemented).

**Prohibited Behavior:** Unsupported nutrients (e.g., specific vitamins) must NOT be invented if the app only tracks macros.

## 9. Fuel/Nutrition Deep Dive Contract

**Exact Subtabs Required:**
1. **Macros:** Detailed breakdown and weekly averages.
2. **Quality:** Analysis of food sources (if supported).
3. **Timing:** Meal timing analysis.
4. **Insights:** Educational correlations (e.g., "High protein days correlate with better recovery"). Real-data rules apply.

## 10. Recovery Daily View Contract

**No subtabs allowed.**

**Structure:**
* **Readiness/Recovery Status:** Top-level score.
* **Latest Check-in & Latest Sleep:** Quick summary cards.
* **Body Status & Muscle Fatigue:** Overview of physical state.
* **Check-in Action & Sleep Action:** Quick log entry points.
* **Energy, Soreness, Stress, Motivation:** Individual metrics from check-in.
* **Data rules:** Actual wearable data only. Missing-data states must prompt for connection or manual logging.
* **Validation & Duplicates:** Check-ins must validate inputs. Duplicate prevention rules apply. Second-save behavior must be handled gracefully.

## 11. Recovery Deep Dive Contract

**Exact Subtabs Required:**
1. **Health:** Wearable metrics (HRV, RHR).
2. **Sleep:** Detailed sleep stages and trends.
3. **Body:** Detailed heatmap and localized soreness.
4. **Insights:** Correlations between recovery and training/nutrition.

## 12. Stats Daily View Contract

**User-Facing Name:** `Stats` (Internal file may remain `progress.tsx`).

**No subtabs allowed.**

**Structure:**
* **Current Bodyweight & Recent Direction:** (e.g., "180 lbs, down 2 lbs").
* **Active Goals & Personal Records:** High-level summary.
* **Training Consistency & Weekly Volume:** Simple charts/bars.
* **Supported Nutrition & Sleep Summary:** Averages.
* **Milestones.**
* **Actions:** Weigh-in, Goals, Progress-photo.

**Prohibited Behavior:** No unsupported correlation claims.

## 13. Stats Deep Dive Contract

**Exact Subtabs Required:**
1. **Analytics:** Detailed volume/intensity graphs.
2. **Body:** Bodyweight trends and measurements.
3. **Goals:** Detailed goal tracking.
4. **Insights:** Long-term trend analysis.

## 14. Settings Contract

* **Not a bottom tab.** Opens from Home.
* **Mode-independent:** Largely ignores Daily/Deep Dive mode.
* **Exact Sections (Subtabs):**
  1. Profile
  2. Preferences
  3. Data
  4. Integrations
* **Nature:** It is a configuration surface, not a dashboard.

## 15. Logging Interaction Contract

**Workout Start/Resume:**
* Handled via full-screen overlay or sheet. State must be preserved (inFlight protection).

**Meal Logging:**
* Validation: Macros must be valid numbers. Controlled inputs to prevent empty-string corruption.
* Successful persistence closes sheet; failed validation preserves input and shows error.

**Recovery Check-in:**
* Validates 1-5 scales or equivalent. Duplicate prevention (only one per day, or overwrite).

**Sleep Logging:**
* Handles overlapping sessions properly (overlapMs > 0).

**Bodyweight Logging:**
* Controlled input buffering (write to global store `onBlur` or on explicit submit).

**Progress-Photo Logging:**
* (If implemented) Handled securely.

**Common Rules:**
* Overlay cleanup required.
* Propagation to store must happen immediately on success.
* Second-save behavior must not duplicate data.

## 16. Missing, Unsupported, and Planned Data Contract

* **No data yet:** User can log data, but hasn't.
* **Need more data:** User has some data, but not enough for a trend/insight (e.g., needs 7 days).
* **Not connected:** Requires a wearable/integration that isn't set up.
* **Planned / Coming later:** Feature is on the roadmap but UI is just a placeholder (must look non-functional, e.g., low opacity).
* **Unsupported / Unavailable:** App currently does not support this metric at all. Do not show or invent.

## 17. Accessibility Contract

* **Accessible Names:** Use exact, descriptive names (e.g., `aria-label="Daily status scores"`).
* **Tab Semantics:** Deep Dive subtabs must use `role="tablist"`, `role="tab"`, and `aria-selected`.
* **Daily View:** Must NOT contain tablists for main sections.
* **Focus & Keyboards:** Dialogs/BottomSheets must manage focus restoration.
* **BottomSheet Titles:** Scope queries by `.sheet-root` and filter by exact heading name.
* **Touch-target:** Minimum 44x44px for actions.

## 18. Responsive and Mobile Contract

* **Target Sizes:** 360x800, 390x844, and desktop Chromium (responsive app shell).
* **Layout:** Card stacking on mobile. Overflow handled gracefully.
* **Navigation:** Bottom navigation on mobile, potentially sticky side/top on desktop.
* **Actions:** Full-width buttons for primary actions on mobile.
* **Sheets:** BottomSheets must not exceed viewport height; should scroll internally.
* **Interactions:** No blocked pointer events (except for explicit "Planned" placeholders).

## 19. Screen-by-Screen Acceptance Matrix

| Main screen | Display mode | Required sections | Required actions | Exact subtabs | Data source category | Missing-data behavior | Prohibited behavior | Acceptance result |
|---|---|---|---|---|---|---|---|---|
| Home | Daily View | Hero, Action, Summaries | Log, Start | None | All | Honest empty | Fake data, subtabs | Pass if no subtabs & clear actions |
| Home | Deep Dive | Detailed cards | (Same as Daily) | None | All | "Need more data" | Subtabs | Pass if trends show |
| Training | Daily View | Status, Resume, Start | Start, Resume | None | Training | "No data yet" | Legacy tabs | Pass if action-focused |
| Training | Deep Dive | Advanced metrics | (Secondary) | Performance, Strength, Library, Insights | Training | "Need more data" | Fake trends | Pass if exactly 4 subtabs |
| Fuel | Daily View | Macros hero, Quick log | Log Meal | None | Nutrition | "No data yet" | Invented nutrients | Pass if quick log visible |
| Fuel | Deep Dive | Trends | (Secondary) | Macros, Quality, Timing, Insights | Nutrition | "Need more data" | - | Pass if exactly 4 subtabs |
| Recovery | Daily View | Readiness, Quick log | Check-in | None | Recovery | "Not connected" | - | Pass if action-focused |
| Recovery | Deep Dive | Wearable data, trends | (Secondary) | Health, Sleep, Body, Insights | Recovery | "Need more data" | - | Pass if exactly 4 subtabs |
| Stats | Daily View | Highlights | Weigh-in | None | Progress | "No data yet" | Subtabs | Pass if named Stats |
| Stats | Deep Dive | Long-term analytics | (Secondary) | Analytics, Body, Goals, Insights | Progress | "Need more data" | Fake correlations | Pass if exactly 4 subtabs |

## 20. Implementation Review Checklist

* [ ] **Exact file scope:** Changes isolated to correct view files.
* [ ] **Naming:** Stats is labeled "Stats"; modes are "Daily View" / "Deep Dive".
* [ ] **Subtabs:** Confirmed NO subtabs in Daily View (or Home). Confirmed EXACT 4 subtabs in Deep Dive.
* [ ] **Real-data use:** No fabricated data.
* [ ] **Planned states:** Placeholders visually distinct and labeled.
* [ ] **Form lifecycle:** Validation prevents bad state; `inFlight` managed properly.
* [ ] **Propagation:** Updates hit global store correctly.
* [ ] **Mobile:** Tested 360x800 and 390x844.
* [ ] **Accessibility:** Verified touch targets and ARIA attributes.
* [ ] **Overlays:** Portaled correctly (`.phone-shell` support) and cleaned up on close.
* [ ] **Active-workout preservation:** Checked state doesn't reset on nav.
* [ ] **Generated-file cleanup:** Clean workspace.
* [ ] **Test integrity:** Tests pass without hacks or forces.

## 21. Known Current Gaps

* **Home:** Currently implements the ViewModeToggle. Needs audit to ensure Deep Dive doesn't introduce subtabs accidentally (already correct).
* **Training:** Currently implements DEEP_DIVE_TABS (`performance`, `strength`, `library`, `insights`). Correctly hides them in `daily` (already correct).
* **Nutrition:** Currently implements NUTRITION_TABS (`macros`, `quality`, `timing`, `insights`). Correctly hides them in `daily` (already correct).
* **Recovery:** Currently implements TABS (`health`, `sleep`, `body`, `insights`). Needs renaming internal constant to DEEP_DIVE_TABS for consistency, but functionality aligns (needs runtime correction).
* **Stats:** Internally `progress.tsx`. Implements DEEP_DIVE_TABS (`analytics`, `body`, `goals`, `insights`). Tab named "Stats" in UI (already correct).
* **Settings:** Internally uses SETTINGS_TABS. Requires verification that it is only opened via Home, not a bottom tab (already correct).

*Note: This section is an observation of the current state and not a backlog for immediate implementation.*
