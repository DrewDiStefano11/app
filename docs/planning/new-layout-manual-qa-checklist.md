# New Layout Manual QA Checklist

## 1. Bottom Nav
- [ ] Bottom navigation contains exactly 5 tabs: Today, Training, Nutrition, Recovery, Insights.
- [ ] Ensure no extra tabs exist (Log, Coach, Body, More, Health, Profile, Settings).
- [ ] Tapping a tab navigates to the correct primary section.
- [ ] Tab accent colors apply correctly when active (Today=Purple, Training=Cyan, Nutrition=Red, Recovery=Green, Insights=Teal).
- [ ] Bottom nav hides or transitions appropriately during Active Workout.

## 2. Daily View / Deep Dive Mode Toggle
- [ ] Segmented toggle `[Daily View] [Deep Dive]` is visible at the top of the Today view.
- [ ] Segmented toggle is visible within the FitCore Hub settings.
- [ ] Toggling the mode updates the content of the currently active tab.
- [ ] The app remembers the last selected mode across hard refreshes and sessions.
- [ ] New users default to Daily View.

## 3. Today Daily View
- [ ] Displays core summaries without overwhelming detail.
- [ ] Quick Actions and Routine Forms appear appropriately.
- [ ] Toggling to Deep Dive shows subtabs (Score breakdown, Next Best Action, Timeline, etc.).

## 4. Training Daily View
- [ ] Displays active workout status and immediate plan.
- [ ] Toggling to Deep Dive shows subtabs (Overview, Active, Plan, Programs, Exercises, etc.).

## 5. Nutrition Daily View
- [ ] Displays daily macro targets and recent meals.
- [ ] Toggling to Deep Dive shows subtabs (Overview, Food Log, Targets, Meals, Supplements, etc.).

## 6. Recovery Daily View
- [ ] Displays sleep summary, readiness score, and prominent body map indicators.
- [ ] Toggling to Deep Dive shows subtabs (Overview, Sleep, Readiness, Body Map, Check-Ins, etc.).

## 7. Insights Daily View
- [ ] Displays high-level weekly trends and primary FitCore score changes.
- [ ] Toggling to Deep Dive shows subtabs (Overview, Training, Nutrition, Body, Correlations, etc.).

## 8. FitCore Hub
- [ ] Hub is accessible via a top-right full-screen entry point.
- [ ] Hub is NOT a bottom tab.
- [ ] Contains all required sections: Profile, Goals & Phases, Daily View/Deep Dive toggle, Notifications, Privacy & AI, Medical/Health, Wearables/Devices, Data Management, Appearance, App Settings, About/QA.
- [ ] Closing the Hub returns the user to their previous view smoothly.

## 9. Floating AI Shell
- [ ] Always visible on screen, not buried in menus.
- [ ] No separate global plus/FAB button exists.
- [ ] Toggling between Coach and Jarvis modes updates the visual appearance distinctly.
- [ ] The shell inherits the accent glow of the currently active bottom tab.
- [ ] Opening the shell defaults to the last-used mode (Coach or Jarvis).
- [ ] Jarvis mode accepts logging/action intents.
- [ ] Coach mode provides analysis/recommendation interactions.

## 10. Routine Forms
- [ ] Exactly two forms exist: Morning Check-In and Night Review.
- [ ] Morning Check-In appears only between 5 AM and 12 PM local time.
- [ ] Night Review appears only between 7 PM and 2 AM local time.
- [ ] Only one due form shows at a time on the Today view.
- [ ] Completing a form collapses it into a concise summary state.
- [ ] Recovery history correctly displays completed form data.
- [ ] Overdue logic (if applicable) temporarily elevates form priority.

## 11. Mobile Layout
- [ ] Verify tap targets (min 44x44px) for the mode toggle, hub icon, and floating AI.
- [ ] Ensure Floating AI shell does not obscure critical bottom nav or view content on small screens (e.g., iPhone SE).
- [ ] Forms remain usable and scrollable in compact mobile viewports.
- [ ] FitCore Hub scrolling is smooth and sections are easily tapable.

## 12. Empty States and Missing Data
- [ ] Toggling to Deep Dive on a fresh account displays helpful, concise fallback text, not fake data.
- [ ] Missing data in Today Deep Dive is clearly flagged without breaking the layout.
- [ ] Forms handle partial completions gracefully (if permitted) or show clear validation.

## 13. Accessibility Basics
- [ ] Segmented toggle has clear aria-labels and indicates the pressed state (`aria-pressed`).
- [ ] FitCore Hub entry point has an aria-label (e.g., "Open FitCore Hub").
- [ ] Floating AI toggle has distinct labels for Coach vs. Jarvis.
- [ ] Color changes in the Floating AI (accent glow) are accompanied by readable text or clear iconography.

## 14. Data Integrity Smoke Checks
- [ ] Completing a Morning Check-In properly updates the global store and persists across reloads.
- [ ] Logging pain via Jarvis correctly updates the Recovery Body Map.
- [ ] Demo Mode securely resets or overrides data without polluting real user storage.

## 15. Regression Checks for Parked-Risk Areas
- [ ] **Popup/Sheet Behavior**: Verify `VolumeDetailSheet`, `MacroDetailSheet`, etc., still open and close correctly (avoiding conflicts with parked PR #34).
- [ ] **Quick Popups**: Verify Quick Actions (Log Meal, Check In, Weigh In) function normally.
- [ ] **Jarvis Voice Mode**: Verify existing voice mode triggers (if any remain active) do not crash the new Floating AI shell (avoiding conflicts with parked PR #2).
- [ ] **Package/Lockfile/Workflow Changes**: Confirm `package.json`, `bun.lockb`, and `.github/workflows/` are untouched.
- [ ] **Schema/Migration Changes**: Confirm no breaking changes were introduced to `src/lib/types.ts` that corrupt existing `fitcore.v1` local storage.