# Screen Inventory Audit: FitCore

This document provides a comprehensive audit of FitCore's current screens, features, and UX state as of the current repository version.

## 1. Onboarding

**File:** `src/components/app/views/onboarding.tsx`

- **Current Function:** Sequential step-by-step setup for new users.
- **Data Involved:** Profile (goal, experience, daysPerWeek, split, bodyweightLb, targetBodyweightLb), Nutrition Targets (calories, protein, carbs, fat).
- **User Actions:** Select goal, experience level, training frequency, split type, input weight, and confirm/edit default macro targets.
- **Popups/Sheets:** None (full-screen experience).
- **Graphs/Charts/Cards:** Progress bar at the top.
- **What feels complete:** Core profile data collection is functional and clean.
- **What feels missing:** Visual feedback on how choices (like goal) affect recommended macros; "Experience" level doesn't currently change the app's behavior (e.g., template selection).
- **Related PRs:** Should not be changed until `Premium UI design system and dashboard polish` merges.
- **Future Improvements:** Add a "Personalization Summary" before finishing; allow skipping steps for returning users.

## 2. Home / FitCore Today

**File:** `src/components/app/views/home.tsx`

- **Current Function:** Central dashboard showing a snapshot of all fitness pillars.
- **Data Involved:** FitCore Score, Readiness, Recovery, Streak, Muscle Load (Heatmap), Macro totals vs Targets, Volume trends.
- **User Actions:** Navigate to other sections, open Settings, trigger Jarvis, quick log (Meal, Check-in, Weigh-in), Start Workout.
- **Popups/Sheets:** VolumeDetail, MacroDetail, ReadinessDetail, HeatmapDetail, StartWorkout, FitcoreScore, LogMeal, CheckIn, WeighIn, MuscleDetail.
- **Graphs/Charts/Cards:** Ring scores, Body Heatmap (front/back), Macro bars, Volume bar chart, Streak badge.
- **What feels complete:** Data density is high and informative; "Command Center" feel is strong.
- **What feels missing:** Customization (users cannot reorder tiles); "FitCore Score" is a black box (needs better explanation of its components).
- **Related PRs:** Avoid changing until `Premium UI design system and dashboard polish` and `active AI PR #2` merge.
- **Future Improvements:** Drag-and-drop tile reordering; more dynamic AI insights that change based on the specific data being viewed.

## 3. Training

**File:** `src/components/app/views/training.tsx`

- **Current Function:** Workout planning and history hub.
- **Data Involved:** Workout templates, Cardio entries, Workout history, PRs, Volume trends (14d), Muscle balance.
- **User Actions:** Start workout from template or blank, log cardio, view workout details, delete history, view PRs.
- **Popups/Sheets:** Workout detail, Cardio log, History detail, Confirm delete.
- **Graphs/Charts/Cards:** 14d Volume bar chart, Muscle balance progress bars, PR cards.
- **What feels complete:** Good separation of Today/Workouts/Performance; template starting is smooth.
- **What feels missing:** Template editing (currently only "Starter" templates); ability to create and save custom templates outside of finishing a workout.
- **Related PRs:** Safety depends on `Active Workout refinement` roadmap item.
- **Future Improvements:** Searchable/filterable history; PR celebration animations; 1RM trend graphs per exercise.

## 4. Active Workout

**File:** `src/components/app/active-workout.tsx`

- **Current Function:** Real-time workout execution and logging.
- **Data Involved:** Sets (reps, weight, modifiers), rest time, total volume, PR detection.
- **User Actions:** Add/delete/reorder exercises, log sets, mark sets as warmup/failure/etc., use plate calculator, add notes, finish/discard workout.
- **Popups/Sheets:** Exercise picker, Custom exercise creator, Plate calculator, Finish workout summary, Confirm discard.
- **Graphs/Charts/Cards:** Active set highlighting, previous performance comparison.
- **What feels complete:** Modifiers (warmup, failure) are well-integrated; plate calculator is a great utility.
- **What feels missing:** Rest timer (visual/audio alerts); RPE (Rate of Perceived Exertion) logging; "Plate calculator" needs to remember bar weight preferences.
- **Related PRs:** Wait for `active AI PR #2` (which adds AI-suggested changes).
- **Future Improvements:** Rest timer auto-start; superset support; live volume/intensity tracking during the session.

## 5. Nutrition

**File:** `src/components/app/views/nutrition.tsx`

- **Current Function:** Calorie and macro tracking.
- **Data Involved:** Meal entries, Nutrition targets, Bodyweight goal.
- **User Actions:** Log meal (templates, foods, custom), view history, set targets.
- **Popups/Sheets:** Log Meal, Confirm delete.
- **Graphs/Charts/Cards:** Macro rings, daily target progress bars, 7d history bars.
- **What feels complete:** Recent meals "quick tap" is very efficient; macro targets are easy to adjust.
- **What feels missing:** Barcode scanning; water tracking; micronutrient tracking (fiber, etc.).
- **Related PRs:** Safe for UI polish, but avoid data schema changes.
- **Future Improvements:** Meal frequency/timing analysis; integration with external food databases (optional/local-first focus).

## 6. Recovery

**File:** `src/components/app/views/recovery.tsx`

- **Current Function:** Readiness and body status tracking.
- **Data Involved:** Recovery check-ins (energy, soreness, stress, motivation), Sleep entries, Muscle fatigue levels.
- **User Actions:** Log check-in, log sleep, update muscle soreness/fatigue.
- **Popups/Sheets:** Check-in, Sleep, Fatigue update.
- **Graphs/Charts/Cards:** Readiness ring, 7d sleep sparkline, Body Heatmap (recovery mode).
- **What feels complete:** Body heatmap for recovery is a standout feature.
- **What feels missing:** Automatic sleep import (e.g., HealthKit/Google Fit); HRV (Heart Rate Variability) logging.
- **Related PRs:** `active AI PR #2` uses this data heavily; avoid touching logic.
- **Future Improvements:** "Readiness Score" should factor in previous day's workout intensity automatically.

## 7. Progress

**File:** `src/components/app/views/progress.tsx`

- **Current Function:** Long-term trend analysis and visual tracking.
- **Data Involved:** FitCore score, Bodyweight entries, Progress photos, Goal completion status.
- **User Actions:** Log weight, add photos, view timeline, view analytics.
- **Popups/Sheets:** Photo detail, Add photo, Confirm delete weigh-in.
- **Graphs/Charts/Cards:** Bodyweight sparkline, Training volume trend (14/30d), Goal progress bars, Photo grid.
- **What feels complete:** Photo timeline is a great visual motivator.
- **What feels missing:** Multi-photo comparison view (side-by-side); body measurement tracking (waist, chest, etc.).
- **Related PRs:** safe for UI enhancements.
- **Future Improvements:** "Transformation" generator (GIF/Video from photos); correlation graphs (e.g., Weight vs. Calories).

## 8. Settings / Hub

**File:** `src/components/app/views/settings.tsx`

- **Current Function:** Profile management, data safety, and Jarvis configuration.
- **Data Involved:** User profile, reminders, demo mode, Jarvis settings.
- **User Actions:** Update profile, toggle reminders, toggle Demo Mode, Export/Import/Reset data, configure Jarvis.
- **Popups/Sheets:** Confirm reset.
- **Graphs/Cards:** Jarvis Settings card, Goals Profile card, Jarvis Activity card.
- **What feels complete:** Local-first backup (Export/Import) is robust.
- **What feels missing:** Theme selection (Light/Dark/System); more granular notification controls.
- **Related PRs:** Avoid changing `JarvisSettingsCard` as it is active in `active AI PR #2`.
- **Future Improvements:** Cloud sync (optional); multi-profile support.

## 9. Jarvis / AI Launcher

**File:** `src/components/app/jarvis/jarvis-panel.tsx`

- **Current Function:** Persistent AI assistant for natural language interaction.
- **Data Involved:** Chat history, app state context, AI model settings.
- **User Actions:** Send text/voice (coming soon), confirm/cancel AI actions, undo last action.
- **Popups/Sheets:** Jarvis BottomSheet, Confirm cards.
- **Graphs/Charts/Cards:** AI chat messages, Action confirmation cards.
- **What feels complete:** Seamless integration with app data for "context-aware" replies.
- **What feels missing:** Voice input (UI exists but is disabled); "Proactive" suggestions (AI starting the conversation).
- **Related PRs:** This is the core of `active AI PR #2`. **DO NOT TOUCH.**
- **Future Improvements:** Image recognition (food logging via photo); workout "Coaching" mode during active sessions.

## 10. Demo Mode

- **Current Function:** Fills the app with sample data for demonstration.
- **Data Involved:** Mock workouts, meals, sleep, and PRs.
- **Location:** Toggled in Settings/Hub.
- **What feels complete:** Effectively showcases the app's potential without needing weeks of user data.
- **What feels missing:** Ability to "Reset Demo Data" without resetting real user data.

## 11. Data Management (Export/Import/Reset)

- **Current Function:** Ensures user data ownership and safety.
- **Data Involved:** Entire `fitcore-v1-store` (localStorage).
- **Location:** Settings/Hub -> Data section.
- **What feels complete:** JSON export is easy to read and backup.
- **What feels missing:** Automated backup reminders; "Append" mode for imports (currently overwrites).
