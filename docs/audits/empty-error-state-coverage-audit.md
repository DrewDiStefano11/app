# Empty and Error State Coverage Audit

This document provides a docs-only audit of current empty states, loading states, validation messages, and error handling across FitCore.

## 1. Home / Today
* **Current empty states found:**
  - `EmptyMini` component used when top routines or daily goals are missing (`top.length === 0`).
  - Cards show "No Data" or zeros depending on the metric.
* **Current validation/error states found:** None explicitly rendered in the main layout (data is fetched safely from local state).
* **Missing or weak empty/error states:** Weak calls-to-action (CTAs) within the `EmptyMini` state. Lacks a loading skeleton if hydration is delayed.
* **Risk level:** Low to Medium (UX friction for new users).
* **Recommended future implementation PR scope:** Add actionable CTAs to dashboard empty states to encourage users to log their first workout/meal. Add skeleton loaders.
* **Files likely involved:** `src/components/app/views/home.tsx`, `src/components/app/ui.tsx`
* **Files that should not be touched concurrently:** Parked PRs #34, #14, #2.

## 2. Training
* **Current empty states found:**
  - `EmptyState` for "No workouts" (`<Clock />`).
  - `EmptyState` for "No cardio yet" (`<Flame />`).
  - `EmptyState` for "No PRs yet" (`<Trophy />`).
  - `EmptyState` for "No exercises yet" in active workout.
* **Current validation/error states found:** Form validation relies on basic HTML5 constraints or `useFormField`.
* **Missing or weak empty/error states:** Missing clear error states if saving a workout fails or if volume calculations error out.
* **Risk level:** Low.
* **Recommended future implementation PR scope:** Improve inline validation during active workout set logging.
* **Files likely involved:** `src/components/app/views/training.tsx`, `src/components/app/active-workout.tsx`
* **Files that should not be touched concurrently:** `src/lib/types.ts`, `src/lib/store.tsx`

## 3. Nutrition
* **Current empty states found:**
  - `EmptyState` used when no meals are logged.
* **Current validation/error states found:** Macro validation (e.g., negative numbers) is present but could be more robust in UI feedback.
* **Missing or weak empty/error states:** No dedicated error state if AI meal parsing fails silently.
* **Risk level:** Medium (potential for incorrect macros to go unnoticed).
* **Recommended future implementation PR scope:** Enhance validation feedback for manual meal entry and surface AI parsing errors explicitly.
* **Files likely involved:** `src/components/app/views/nutrition.tsx`
* **Files that should not be touched concurrently:** Parked PRs #34, #14, #2.

## 4. Recovery
* **Current empty states found:**
  - `EmptyState` for "No check-ins" (`<Heart />`).
* **Current validation/error states found:** Basic boundary checks (1-10 scale).
* **Missing or weak empty/error states:** Lack of historical missing data indication (e.g., missed previous days).
* **Risk level:** Low.
* **Recommended future implementation PR scope:** Polish empty state UI to explain how check-ins impact readiness scores.
* **Files likely involved:** `src/components/app/views/recovery.tsx`
* **Files that should not be touched concurrently:** Core shared primitives.

## 5. Progress / Insights
* **Current empty states found:**
  - `EmptyState` for "Not enough data" (`<Scale />`) - requires at least 2 weigh-ins.
  - `EmptyState` for "No pinned goals".
  - `EmptyState` for "No photos yet".
  - `EmptyState` for "No training volume".
* **Current validation/error states found:** Charts gracefully handle empty arrays.
* **Missing or weak empty/error states:** No clear error boundary if charting library throws an exception on malformed data.
* **Risk level:** Medium.
* **Recommended future implementation PR scope:** Add React Error Boundaries around Recharts components to prevent full-page crashes.
* **Files likely involved:** `src/components/app/views/progress.tsx`
* **Files that should not be touched concurrently:** Shared layout primitives.

## 6. Hub / Settings
* **Current empty states found:** API key inputs show standard empty string states.
* **Current validation/error states found:** Jarvis connection test failures show specific status text (`Groq connection failed`, etc.).
* **Missing or weak empty/error states:** Vague error messages if local storage save fails.
* **Risk level:** Medium.
* **Recommended future implementation PR scope:** Standardize error toasts for setting updates and API key validation.
* **Files likely involved:** `src/components/app/views/settings.tsx`, `src/components/app/jarvis/settings-card.tsx`
* **Files that should not be touched concurrently:** `src/lib/ai.functions.ts`

## 7. Quick popups: Log Meal, Check-in, Weigh-in
* **Current empty states found:** Blank form states on open.
* **Current validation/error states found:** `setAiError` surfaces AI failures in meal logging. HTML5 form validation for standard inputs.
* **Missing or weak empty/error states:** Modal closure logic doesn't always cleanly reset transient error states upon reopening.
* **Risk level:** Medium (stale errors might persist).
* **Recommended future implementation PR scope:** Implement strict `onOpenChange` handlers to clear form and error state when popups are closed or cancelled.
* **Files likely involved:** `src/components/app/popups/quick-popups.tsx`
* **Files that should not be touched concurrently:** `src/components/app/bottom-nav.tsx`

## 8. AI/Jarvis panels
* **Current empty states found:** Empty chat window if no messages exist.
* **Current validation/error states found:** Warning messages (`Warning: ${res.error}`) pushed into message stream. Connection test errors handled in `settings-card.tsx`.
* **Missing or weak empty/error states:** No explicit typing/loading skeleton while waiting for provider response. Silent failures on some tools.
* **Risk level:** High (AI processing delays can feel like the app is frozen).
* **Recommended future implementation PR scope:** Implement loading skeletons, typing indicators, and clear retry buttons for failed AI actions.
* **Files likely involved:** `src/components/app/jarvis/jarvis-panel.tsx`, `src/lib/jarvis/tools.ts`
* **Files that should not be touched concurrently:** `src/lib/ai.functions.ts`

## 9. Graphs/charts
* **Current empty states found:** Empty charts typically handled by `EmptyState` wrapper before rendering Recharts.
* **Current validation/error states found:** Graceful fallback to zeros or flatlines.
* **Missing or weak empty/error states:** Flatlines with '0' values can be ambiguous (missing data vs. zero value).
* **Risk level:** Low to Medium.
* **Recommended future implementation PR scope:** Distinguish between `null` (no data) and `0` in chart tooltips and lines.
* **Files likely involved:** `src/components/app/views/progress.tsx`, `src/lib/analytics.ts`
* **Files that should not be touched concurrently:** Core store implementations.

## 10. Data import/export or persistence-related UI
* **Current empty states found:** None specific to import/export.
* **Current validation/error states found:** `try/catch` blocks in `load()` fallback to `defaultState` if JSON is corrupted.
* **Missing or weak empty/error states:** Silent fallback to default state on local storage corruption wipes user data without warning. No "Restore Backup" UI flow.
* **Risk level:** High (Silent data loss perception).
* **Recommended future implementation PR scope:** Implement a critical error screen on hydration failure offering users to import a backup or explicitly reset data.
* **Files likely involved:** `src/lib/fitcore-data.ts`, `src/components/app/views/settings.tsx`
* **Files that should not be touched concurrently:** `src/lib/store.tsx`, `src/lib/types.ts`
