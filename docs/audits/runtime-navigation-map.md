# Runtime Navigation Map Audit

## 1. Main App Navigation Structure
- The app uses a single-page architecture where the primary navigation is driven by internal React state rather than dedicated URL routes for each view.
- Main state is managed in `src/routes/index.tsx` using `useState<SectionId>("home")`.
- Navigation between major sections is primarily triggered by the `BottomNav` component when there is no active workout.
- If there is an active workout (`state.activeWorkout`), the navigation is forced to the "training" section and the `BottomNav` is hidden.
- The `SettingsView` acts as an overlay/modal state managed by `settingsOpen` boolean in `src/routes/index.tsx`, overriding the current active section when true.

## 2. Major Tabs/Views and Known Subtabs
- **Home (`HomeView`)**: Default view. Includes main dashboard and `RecentActivity`.
- **Train (`TrainingView`)**: Contains active workout controls, workout history, programs & templates, cardio & sports logging. Uses sub-panels via bottom sheets.
- **Fuel (`NutritionView`)**: Nutrition dashboard and meal logging.
- **Recover (`RecoveryView`)**: Recovery metrics, daily check-ins, sleep logging, fatigue logging.
- **Stats (`ProgressView`)**: Progress tracking, fitcore score trends, photo progress.
- **Settings (`SettingsView`)**: Accessible from Home or BottomNav, overrides other views.
- **Onboarding (`Onboarding`)**: Rendered instead of the main app shell if `state.onboardingComplete` is false.

## 3. Files Responsible for Navigation or View Switching
- `src/routes/index.tsx`: Core shell routing, holds `section` state and `settingsOpen` state. Renders the corresponding view component.
- `src/components/app/bottom-nav.tsx`: UI component for the bottom navigation bar, dispatches changes to `section` and `settingsOpen`.
- `src/lib/types.ts`: Defines `SectionId` (`"home" | "training" | "nutrition" | "recovery" | "progress"`).
- Major view components (`src/components/app/views/*.tsx`): Handle internal sub-navigation, often using Bottom Sheets to act as "subtabs" or deeper views (e.g. cardio logging inside Training).

## 4. High-Risk Navigation Areas for Overlap
- **Active Workout Override**: The `hasActiveWorkout` logic heavily overrides the standard navigation flow. Changes to navigation state must account for the active workout lock-in.
- **Settings Overlay**: Because `SettingsView` is an alternative render path to the major tabs, changes to how settings are opened/closed can conflict with active tab state or deeper popups.
- **Bottom Sheet vs Main Nav**: Subtabs are implemented as bottom sheets overlaying the main view. There's a risk of z-index or state overlaps if a user tries to navigate via the bottom nav while a sub-sheet is open (though typically BottomNav is covered or restricted).
- **Reloading Page**: Since navigation is React state-based (and local storage based), a hard page reload will reset the view to "home" unless specific local storage overrides are implemented.

## 5. Restricted Navigation Areas
- Do not touch navigation or sub-navigation related to the **Recovery** tab (`src/components/app/views/recovery.tsx`).
- Do not touch navigation or sub-navigation related to the **Progress** tab (`src/components/app/views/progress.tsx`).
- (As per PR #129 and #148 being open).

## 6. Future Safe Task Recommendations (Grouped by Exact File Scope)
- **`src/components/app/views/home.tsx`**: Add or refine empty states and loading skeletons for the Home dashboard widgets.
- **`src/components/app/views/nutrition.tsx`**: Expand meal logging form validation or refine the layout of the nutrition dashboard widgets.
- **`src/components/app/views/training.tsx`**: Refine the visual design of the workout history sub-sheet or cardio logging form (without altering the core sub-navigation mechanism).
- **`src/components/app/bottom-nav.tsx`**: Add accessibility improvements (ARIA labels, focus states) to the bottom navigation buttons.
