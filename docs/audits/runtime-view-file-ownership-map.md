# Runtime View File Ownership Map

This audit identifies major FitCore runtime view files and components, documenting their current safety status for new work to avoid merge conflicts and overlapping PRs.

## 1. Recovery View
- **File path:** `src/components/app/views/recovery.tsx`
- **Current purpose:** Renders the main Recovery tab, showing readiness, muscle status, and recovery trends.
- **Current PR risk/status:** Blocked by active/open PR #129.
- **New work safe now?:** No. Blocked.
- **Safe later:** File-scoped UI improvements, new recovery data visualizations, minor bug fixes, once PR #129 is merged.
- **Should wait:** Any changes touching layout, tab switching, or data dependencies within the file.
- **File overlap risks:** High risk of overlap with #129 and any changes to the `FatigueLevel` type or muscle definitions.

## 2. Progress/Stats View
- **File path:** `src/components/app/views/progress.tsx`
- **Current purpose:** Renders the Stats tab, displaying FitCore score, weekly volume, bodyweight delta, and progress photos.
- **Current PR risk/status:** Blocked by active/open PR #148.
- **New work safe now?:** No. Blocked.
- **Safe later:** File-scoped charts, new progress metrics, photo UI enhancements, once PR #148 is merged.
- **Should wait:** Modifications to core progress data tracking, analytics calculations.
- **File overlap risks:** High risk of overlap with #148 and analytics lib changes.

## 3. Settings/Hub View
- **File path:** `src/components/app/views/settings.tsx`
- **Current purpose:** Renders the Settings dashboard, managing profile, data export/import, and Jarvis preferences.
- **Current PR risk/status:** Conditionally safe for highly scoped changes.
- **New work safe now?:** Yes, but ONLY if file-scoped and not tied to global toggle/state/schema changes.
- **Safe later:** Adding new purely UI settings options, styling tweaks.
- **Should wait:** Any work involving global state changes, schema updates, or Daily View / Deep Dive toggle logic.
- **File overlap risks:** Medium risk. Be careful not to alter existing Jarvis components or base layout structures.

## 4. Nutrition View
- **File path:** `src/components/app/views/nutrition.tsx`
- **Current purpose:** Displays nutrition tracking, macro goals, and meal logging.
- **Current PR risk/status:** Blocked.
- **New work safe now?:** No. Blocked.
- **Safe later:** Unblocking AI macro extraction, photo estimation, full macro validation, when permitted.
- **Should wait:** Any structural changes to meal rendering, UI state updates.
- **File overlap risks:** High risk with any ongoing or planned feature updates regarding food tracking.

## 5. Active Workout View
- **File path:** `src/components/app/active-workout.tsx`
- **Current purpose:** Manages the active workout session UI, including sets, rest timers, and exercise tracking.
- **Current PR risk/status:** Generally safe if isolated.
- **New work safe now?:** Yes, for isolated, localized UI or logic bug fixes that do not alter the workout data schema.
- **Safe later:** Adding new exercise variants, layout enhancements for specific workout states.
- **Should wait:** Changes to core workout timer behavior, how sets are saved to the global store, or persistence changes.
- **File overlap risks:** Low-to-Medium risk unless modifying underlying workout types.

## 6. Quick Popups / Modal Components
- **File path:** `src/components/app/popups/quick-popups.tsx` (and other files in `src/components/app/popups/`)
- **Current purpose:** Contains various bottom sheets and popups like LogMealSheet, ReadinesPopup, etc.
- **Current PR risk/status:** Conditionally safe.
- **New work safe now?:** Yes, for adding new isolated popups or fixing scoped UI bugs inside existing popups, provided it doesn't touch blocked domains (Nutrition).
- **Safe later:** Enhancing animations, expanding shared popup logic.
- **Should wait:** Structural changes to how popups integrate with global state or routing.
- **File overlap risks:** Medium risk. Ensure new popups don't interfere with existing `BottomSheet` usage or overlap with active PR domains (e.g., Recovery popups).

## 7. Main App Shell / Navigation Files
- **File paths:** `src/components/app/views/home.tsx`, `src/components/app/bottom-nav.tsx`, `src/routes/__root.tsx`
- **Current purpose:** Manages top-level routing, app shell layout, global navigation, and the main dashboard view.
- **Current PR risk/status:** High risk.
- **New work safe now?:** No. Blocked.
- **Safe later:** Safe for Daily View / Deep Dive toggle implementation, but ONLY when specifically instructed.
- **Should wait:** Daily View / Deep Dive toggle implementation, structural navigation changes, global UI shells.
- **File overlap risks:** Very high. These files are the core backbone and overlap with any major structural work.

## 8. State / Storage / Lib Files
- **File paths:** `src/lib/store.tsx`, `src/lib/types.ts`, `src/lib/persist.ts`
- **Current purpose:** Defines the global app state, typescript interfaces, local storage persistence, and the data schema.
- **Current PR risk/status:** High risk.
- **New work safe now?:** No. Blocked.
- **Safe later:** Schema migrations, large data structure additions (after foundation is fully stable).
- **Should wait:** Global state changes, schema updates, persistence changes, any modifications to `AppState`.
- **File overlap risks:** Very high. Touching these files can break the entire app or conflict with virtually any ongoing work.
