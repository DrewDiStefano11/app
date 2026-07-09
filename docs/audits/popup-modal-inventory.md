# Popup & Modal Behavior Inventory

## 1. Existing Popup/Modal/Sheet Components or Patterns
- The application primarily uses a generic `BottomSheet` component (`src/components/app/sheet.tsx`) to implement modal/popup behaviors.
- The `BottomSheet` handles body overflow hidden while open to prevent background scrolling.
- **Dedicated Popup Components (in `src/components/app/popups/`)**:
  - `HeatmapDetailSheet`
  - `MacroDetailSheet`
  - `MomentumDetailSheet`
  - `MuscleDetailSheet`
  - `ReadinessDetailSheet`
  - `FitcoreScoreSheet`
  - `StartWorkoutSheet`
  - `VolumeDetailSheet`
  - Quick actions (`LogMealSheet`, `CheckInSheet`, `WeighInSheet`)
- **Inline View Sheets**: Major views (`training.tsx`, `nutrition.tsx`, `recovery.tsx`, `progress.tsx`) also define specific sheets directly within the view (e.g., `CardioSheet` in Training, `FatigueSheet` in Recovery, `PhotoSheet` in Progress) that act as deeper drill-downs.

## 2. Buttons/Actions that Trigger Popups
- In `HomeView`: Various summary tiles trigger detailed popups (e.g., clicking on Macros opens `MacroDetailSheet`, clicking on Volume opens `VolumeDetailSheet`, clicking the quick action buttons opens `LogMealSheet`, `CheckInSheet`, `WeighInSheet`, or `StartWorkoutSheet`).
- In `TrainingView`: Buttons to access "Programs & templates", "Cardio & sports", "Workout history", or "Performance" open corresponding inline `BottomSheet` elements.
- In `NutritionView`: The "Log Meal" button opens `LogMealSheet`.
- In `RecoveryView`: Buttons for daily check-in, log sleep, and muscle fatigue open their respective sheets.
- In `ProgressView`: Adding a photo opens the `PhotoSheet`.

## 3. Areas Still Navigating Away Instead of Opening a Popup
- The primary tab switching (Home, Train, Fuel, Recover, Stats) is a top-level navigation replacement, not a popup.
- `SettingsView` is treated as a top-level overlay replacement (overriding the main shell routing state) rather than a bottom sheet, though it acts somewhat like a full-screen modal.
- Active workout takes over the main `TrainingView` instead of opening in a secondary modal.

## 4. High-Risk Popup/Modal Areas
- **Z-Index & Overflow Overlaps**: Opening a sheet from within another sheet (e.g., `MuscleDetailSheet` from within `HeatmapDetailSheet`) can cause z-index conflicts or leave the body `overflow: hidden` state corrupted if not unmounted cleanly.
- **State Management**: Managing boolean state for sheet visibility across the main view and within the sheet component itself. If state gets out of sync, sheets may fail to close or open.
- **Active Workout Discard/Finish Modals**: Modals related to ending or discarding an active workout are high risk due to their connection with the complex active workout state machine.

## 5. Restricted Popup/Modal Areas
- Do not modify popups or sheets originating from or related to the **Recovery** tab (`CheckInSheet`, `SleepSheet`, `FatigueSheet`).
- Do not modify popups or sheets originating from or related to the **Progress** tab (`PhotoSheet` and any photo detail views).
- Do not modify **Active Workout** popups (e.g., discard/finish modals).
- (Wait until current PRs #129 and #148 clear, and active workout state machine stabilizes).

## 6. Future Safe Popup/Modal Task Recommendations (Grouped by Exact File Scope)
- **`src/components/app/popups/macro-popup.tsx`**: Add granular error states or loading indicators for macro data retrieval within the popup.
- **`src/components/app/views/nutrition.tsx`**: Refine the internal form layout of the `LogMealSheet` (e.g., spacing, input padding) without changing how it opens/closes.
- **`src/components/app/popups/start-workout-popup.tsx`**: Enhance the empty state messaging when no recent workouts are found to select from.
- **`src/components/app/sheet.tsx`**: Add an optional `aria-label` or `aria-labelledby` prop to the base `BottomSheet` component to improve screen reader accessibility.