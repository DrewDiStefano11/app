# Non-AI Product Roadmap: FitCore

This roadmap outlines the recommended sequence of work to strengthen FitCore's UI, data integrity, and core product features before proceeding with major AI upgrades.

## Roadmap Overview

1.  **Merge Premium UI PR** (Foundation)
2.  **Full Customizable Dashboard System**
3.  **Unified Logging & Data Integrity Foundation**
4.  **Onboarding & Settings Personalization Upgrade**
5.  **Goal System Upgrade**
6.  **Workout Template & Active Workout Refinement**
7.  **Graph & Chart Expansion**
8.  **Recovery & Body Readiness Expansion**
9.  **Nutrition Quality & Meal Logging Improvements**
10. **Advanced AI Upgrades** (Building on the above)

---

## 1. Merge Premium UI PR

- **Purpose:** Establish a consistent, high-end visual language across the entire app.
- **Why it matters:** User trust in a "premium" app starts with visual polish and tactile feedback.
- **Files likely involved:** `src/styles.css`, `src/components/app/ui.tsx`, various views.
- **Risk Level:** Low.
- **What should be avoided:** Introducing breaking changes to data structures.
- **Acceptance Criteria:** All screens use the new design tokens; animations are smooth; typography is consistent.
- **Suggested PR Title:** `Premium UI design system and dashboard polish`

## 2. Full Customizable Dashboard System

- **Purpose:** Allow users to reorder, hide, and resize tiles on the Home screen.
- **Why it matters:** "Command Center" implies the user is in control of what information is most important to them.
- **Files likely involved:** `src/components/app/views/home.tsx`, `src/lib/store.tsx`, `src/lib/types.ts`.
- **Risk Level:** Medium (state management complexity).
- **What should be avoided:** Complex drag-and-drop libraries that bloat the bundle; stick to simple, mobile-friendly reordering.
- **Acceptance Criteria:** Users can enter an "Edit Mode" on the Home screen and rearrange tiles.
- **Suggested PR Title:** `Customizable dashboard: dynamic tile reordering and visibility`

## 3. Unified Logging & Data Integrity Foundation

- **Purpose:** Standardize how data is validated, saved, and synced to localStorage.
- **Why it matters:** AI is only as good as the data it acts on. We need a "safe path" for all logging.
- **Files likely involved:** `src/lib/store.tsx`, `src/lib/persist.ts`, `src/lib/types.ts`.
- **Risk Level:** High (potential for data loss if handled incorrectly).
- **What should be avoided:** Changing storage schemas without robust migrations.
- **Acceptance Criteria:** Centralized validation for all log entries (Workouts, Meals, etc.); atomic updates to state.
- **Suggested PR Title:** `Data integrity: unified logging foundation and validation`

## 4. Onboarding & Settings Personalization Upgrade

- **Purpose:** Deepen the personalization of the app based on user experience and goals.
- **Why it matters:** Beginner lifters need different guidance and defaults than advanced athletes.
- **Files likely involved:** `src/components/app/views/onboarding.tsx`, `src/components/app/views/settings.tsx`.
- **Risk Level:** Low.
- **What should be avoided:** Making onboarding too long or tedious.
- **Acceptance Criteria:** Experience level affects default template suggestions; goal selection updates macro recommendations dynamically.
- **Suggested PR Title:** `Personalization: adaptive onboarding and goal-driven defaults`

## 5. Goal System Upgrade

- **Purpose:** Move beyond simple "weekly workouts" to more granular performance and body goals.
- **Why it matters:** Users stay engaged when they can track specific milestones (e.g., "Bench 225 lb" or "Lose 5 lb").
- **Files likely involved:** `src/components/app/goals-panel.tsx`, `src/lib/types.ts`.
- **Risk Level:** Medium.
- **What should be avoided:** Over-complicating the UI with too many goal types.
- **Acceptance Criteria:** Users can set target dates for goals; progress is automatically calculated from logged data (PRs, Weight).
- **Suggested PR Title:** `Goal system: performance milestones and target tracking`

## 6. Workout Template & Active Workout Refinement

- **Purpose:** Improve the flexibility of template creation and the logging experience during a workout.
- **Why it matters:** The workout log is the most frequent interaction point.
- **Files likely involved:** `src/components/app/active-workout.tsx`, `src/components/app/views/training.tsx`.
- **Risk Level:** Medium.
- **What should be avoided:** Interfering with the "active AI" features being developed concurrently.
- **Acceptance Criteria:** Users can edit existing templates; rest timer added to active workout; RPE logging enabled.
- **Suggested PR Title:** `Training UX: template editor and active workout refinements`

## 7. Graph & Chart Expansion

- **Purpose:** Provide deeper insights through more varied and interactive visualizations.
- **Why it matters:** "Data-rich" is a core product pillar.
- **Files likely involved:** `src/lib/analytics.ts`, various view files.
- **Risk Level:** Low.
- **What should be avoided:** Charts that are too cluttered for mobile screens.
- **Acceptance Criteria:** Added volume-by-muscle-group history; 1RM trend lines; nutrition consistency heatmaps.
- **Suggested PR Title:** `Analytics: expanded performance and consistency visualizations`

## 8. Recovery & Body Readiness Expansion

- **Purpose:** Integrate more metrics into the readiness score, like HRV and better sleep analysis.
- **Why it matters:** Recovery is often the most overlooked part of fitness.
- **Files likely involved:** `src/components/app/views/recovery.tsx`, `src/lib/analytics.ts`.
- **Risk Level:** Low.
- **What should be avoided:** "Black box" scores; keep the logic transparent to the user.
- **Acceptance Criteria:** Readiness score factors in workout intensity from the previous 48 hours.
- **Suggested PR Title:** `Recovery: advanced readiness logic and metric integration`

## 9. Nutrition Quality & Meal Logging Improvements

- **Purpose:** Improve the speed of logging and add "quality" metrics (e.g., fiber, processed vs. whole foods).
- **Why it matters:** Macro counting is tedious; the app should make it as fast as possible.
- **Files likely involved:** `src/components/app/views/nutrition.tsx`.
- **Risk Level:** Low.
- **What should be avoided:** Building a massive cloud-based food database (keep it local/lightweight).
- **Acceptance Criteria:** "Quick log" from previous meals improved; basic micronutrient tracking added.
- **Suggested PR Title:** `Nutrition: logging speed and diet quality metrics`

## 10. AI Upgrades

- **Purpose:** Deploy advanced AI coaching, proactive suggestions, and image recognition.
- **Why it matters:** This is the "Command Center" vision fully realized.
- **Files likely involved:** `src/components/app/jarvis/*`, `src/lib/ai.functions.ts`.
- **Risk Level:** Medium.
- **What should be avoided:** AI taking actions without clear user consent (keep "Local-first" control).
- **Acceptance Criteria:** AI can suggest workout adjustments based on readiness; AI can log meals from photos.
- **Suggested PR Title:** `Advanced AI: proactive coaching and visual food logging`
