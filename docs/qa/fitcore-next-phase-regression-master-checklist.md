# FitCore Next-Phase Regression Master Checklist

This checklist covers the essential verification points for all FitCore releases in the next build phase.

## 1. Data Foundation & Persistence

- [ ] **Fresh Install:** App loads correctly with no data; "Onboarding" or "Empty State" visible.
- [ ] **Legacy Migration:** Seeding `version: 1` data results in a successful migration to the current version with no data loss.
- [ ] **Reload Persistence:** Logging a meal/workout, then refreshing the browser, preserves the entry.
- [ ] **Import/Export:** Exported JSON can be re-imported to produce an identical app state.
- [ ] **Audit Trail:** Every new entry has correct `source` and `timestamp` metadata in the state.

## 2. Nutrition & AI Estimation

- [ ] **Manual Entry:** Adding calories/macros manually updates the Daily Summary instantly.
- [ ] **Jarvis Entry:** Text-based logging (e.g., "I ate an apple") creates a log with the `jarvis` badge.
- [ ] **Correction Flow:** Editing an AI-generated meal upgrades its badge to `verified`.
- [ ] **Saved Foods:** Selecting a saved food populates all fields correctly.
- [ ] **Macro Logic:** Carbs/Protein/Fat sums match the total calorie count (within 5% tolerance).

## 3. Training & Active Workout

- [ ] **Manual Workout:** Exercises and sets can be added/deleted/edited without UI glitches.
- [ ] **Active Workout State:** Navigating away from the active workout and back preserves the current timer and sets.
- [ ] **Exercise Modifiers:** Tags like "Warmup" or "Failure" are saved and visible in history.
- [ ] **Progression Suggestions:** Suggestions to increase weight/reps appear based on history (if data exists).
- [ ] **Set Completion:** Checking a set collapses it or changes its visual state as intended.

## 4. Recovery & Decision Engine

- [ ] **Readiness Score:** Changes in sleep or soreness check-ins immediately update the Readiness score.
- [ ] **Engine Visibility:** The Home screen "Directive" card updates when new recovery data is logged.
- [ ] **Limiter Logic:** The correct bottleneck (e.g., "Sleep") is highlighted when its value is the lowest.
- [ ] **Safety Disclaimer:** Any mention of "Pain" triggers the medical disclaimer.
- [ ] **Partial Data:** Engine shows a "More Data Needed" state if core metrics (Weight/Sleep) are missing.

## 5. UI/UX & Mobile Usability

- [ ] **Popup/Sheet Positioning:** Sheets open to the correct height (`dvh`) and the backdrop is clickable to close.
- [ ] **Mobile Overflow:** No horizontal scrolling on 390x844 (iPhone) or 360x800 (Android) viewports.
- [ ] **Accessibility:** All logging buttons meet the 44x44px tap target requirement.
- [ ] **Empty States:** Every view (Training, Nutrition, Progress) has a meaningful "No Data" message.
- [ ] **Backdrop/Blur:** Opening a sheet applies the correct blur/opacity to the background.

## 6. Edge Cases & Recovery

- [ ] **Corrupted State:** Deleting the `fitcore.v1` localStorage key triggers a graceful app reset.
- [ ] **Invalid Import:** Uploading a non-JSON file shows an error toast, not a white screen.
- [ ] **Offline Mode:** PWA loads and shows basic UI without an internet connection (if previously installed).
- [ ] **Rapid Logging:** Spamming the "Add Set" or "Log Meal" button does not result in duplicate entries (Audit key check).
