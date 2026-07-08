# First Usable Testing Version - Manual QA Checklist

This checklist is meant for validating the first usable version of FitCore before inviting external testers. It covers the core scenarios required for basic user confidence.

## 1. Home / Today

- **What to test manually:** Check the layout in Daily View and Deep Dive modes. Ensure the correct routine forms appear when due, tab navigation works, and data from other modules surfaces accurately.
- **What a pass looks like:** 'Morning Check-In' and 'Night Review' appear at the correct times and compress into summaries once done. Core metrics (e.g., today's scheduled workout, current recovery state) display without errors.
- **What a blocker looks like:** The view crashes, critical components are missing, or routine forms do not show up/collapse correctly.
- **What can be deferred:** Advanced predictive insights or fully populated empty states for complex integrations.

## 2. Training

- **What to test manually:** Start an active workout, log sets/reps/weights, complete the workout, and view the finish summary.
- **What a pass looks like:** The active workout state persists correctly. Logged sets and completion metrics save successfully without duplicate entries.
- **What a blocker looks like:** Inability to start or finish a workout, state loss during a workout, or failure to save completion data.
- **What can be deferred:** Advanced workout builder, complex periodization graphs, or custom exercise creation.

## 3. Nutrition

- **What to test manually:** Log a meal manually using standard form inputs for calories and macros, and confirm the log appears in the daily summary.
- **What a pass looks like:** The manual meal log saves accurately, and the daily nutrition totals update to reflect the new entry.
- **What a blocker looks like:** Failure to save manual meals, duplicate entries being created upon save, or UI blocking the save action.
- **What can be deferred:** AI text/photo macro extraction, barcode scanning, comprehensive recipe building, and micronutrient tracking.

## 4. Recovery

- **What to test manually:** Record sleep manually or via proxy forms, and input qualitative recovery metrics (soreness/stress).
- **What a pass looks like:** Sleep and stress metrics are stored accurately, updated in the UI, and contribute to the overall daily state.
- **What a blocker looks like:** Inability to enter or view recovery scores, or inputs crashing the view.
- **What can be deferred:** Deep integrations with wearables, complex HRV analysis, and automated predictive recovery scoring.

## 5. Progress / Insights

- **What to test manually:** View basic progress graphs for training volume, weight, and consistency.
- **What a pass looks like:** Graphs render correctly and match underlying user data without throwing errors or displaying contradictory metrics.
- **What a blocker looks like:** Graphs crash the app, display incorrect aggregation, or use `useStore().state` vs `useStore().view` inconsistently in a way that breaks.
- **What can be deferred:** The complete FitCore Score calculation, predictive AI insights, and the Health Twin logic.

## 6. FitCore Hub / Settings

- **What to test manually:** Access settings from the top-right entry point, toggle Daily/Deep Dive mode, update profile information, and review privacy options.
- **What a pass looks like:** Hub opens reliably, toggles apply globally, and settings save without issues.
- **What a blocker looks like:** Hub inaccessible, saving settings fails, or privacy/deletion controls are broken.
- **What can be deferred:** Advanced genetics integrations, medical record syncing, and complex custom themes.

## 7. Core popups and sheets

- **What to test manually:** Open and close various bottom sheets and dialogs (e.g., Log Meal, Check-In, ConfirmDialog). Ensure they dismiss correctly on outside clicks or cancel actions.
- **What a pass looks like:** Popups open smoothly, do not open out-of-bounds, reset state when closed, and validate inputs before saving.
- **What a blocker looks like:** Sheets blocked by Z-index or stacking issues, forms saving invalid data without errors, or inability to dismiss the modal.
- **What can be deferred:** Highly styled animations, complex nested sheet interactions, or comprehensive offline handling.

## 8. AI/Jarvis safety

- **What to test manually:** Interact with the floating AI shell. Test logging a basic metric and asking for a summary based on user data.
- **What a pass looks like:** The AI explicitly states sources for data, asks for confirmation on destructive or logging actions, and does not provide medical diagnosis.
- **What a blocker looks like:** AI hallucinates logs into incorrect categories, silently overwrites user data, or provides medical advice.
- **What can be deferred:** Advanced conversational memory, voice input, and multi-step complex automated actions.

## 9. Data persistence

- **What to test manually:** Perform core actions (logging, checking in), close the app/refresh, and verify data persists.
- **What a pass looks like:** Data remains accessible across refreshes through synchronous localStorage. Updates propagate across screens (the 'no-wasted-data' principle).
- **What a blocker looks like:** Silent data loss, duplicate records upon refresh, or conflicting data across different views.
- **What can be deferred:** IndexedDB migration and robust conflict resolution for complex offline syncing.

## 10. Mobile layout

- **What to test manually:** Test on mobile viewport sizes to ensure readability, touch targets, and absence of overlapping elements.
- **What a pass looks like:** Bottom nav is accessible, floating AI shell does not block critical buttons, and keyboard does not obscure inputs.
- **What a blocker looks like:** Core flow buttons rendered off-screen, unreadable text, or UI elements completely obstructing each other.
- **What can be deferred:** Perfect tablet responsiveness or desktop-specific layout optimizations.

## 11. Empty states

- **What to test manually:** Log into a new account with no data. Navigate through all 5 bottom tabs.
- **What a pass looks like:** All tabs render with clear fallback text. The UI does not crash on missing data or present fake values.
- **What a blocker looks like:** The app crashes entirely due to undefined variables, or the layout breaks entirely in the absence of content.
- **What can be deferred:** Highly polished, illustrated onboarding empty states.

## 12. First-time user flow

- **What to test manually:** Go through the onboarding process (bypassable via 'Get Started' -> 'Continue' -> 'Enter FitCore').
- **What a pass looks like:** The user can navigate from onboarding to the dashboard without encountering unrecoverable errors.
- **What a blocker looks like:** Onboarding freezes or traps the user without a way to enter the main app.
- **What can be deferred:** Comprehensive interactive tutorials or deep personalization during the initial flow.

## 13. Demo/test data safety

- **What to test manually:** Toggle demo mode and verify the separation from real user data. Try logging while in demo mode.
- **What a pass looks like:** Demo data loads correctly but is strictly isolated from user accounts. Interactions do not pollute the database.
- **What a blocker looks like:** Real user data is mixed with demo data, or AI actions in demo mode leak into the real environment.
- **What can be deferred:** A fully comprehensive demo dataset covering every single edge case and edge graph.

## 14. Known blockers before external testing

- **What to test manually:** Review known outstanding critical bugs or unimplemented core features.
- **What a pass looks like:** All items listed as absolute blockers (e.g., app load failures, active workout save failure, data loss) are resolved.
- **What a blocker looks like:** Any unaddressed issue from the 'Blockers' lists in the First Usable Testing Checklist.
- **What can be deferred:** Known minor layout quirks, missing non-essential AI features, and deferred architectural migrations.
