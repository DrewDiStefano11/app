# Active Workout Experience Spec

## Purpose

Provide a frictionless, resilient, and context-aware environment for users to log their training sessions in real-time. The active workout experience is the heart of FitCore's training domain, where raw data is captured for future intelligence.

## Product Rule Alignment

- **Reduce Logging Friction:** One-handed, high-contrast, and "sweaty-hand" friendly UI.
- **Improve Trust:** Real-time persistence ensures no data loss, even if the app or tab is closed.
- **Explain What Changed:** Collapsed completed exercises show summary stats immediately.
- **Decide What to do Next:** Current exercise remains focus-locked while providing clear progression paths.

## User Problems Solved

- Accidental data loss when switching apps or refreshing.
- Cluttered UI making it hard to see previous performance while logging.
- Difficulty interacting with small targets mid-workout.
- Cognitive load of deciding weights/reps while fatigued.

## Active Workout Layout Rules

- **Full-Screen Focus:** When a workout is active, navigation is locked to protect session data.
- **Modal-First for Details:** Use sheets/popups for exercise selection or info to avoid losing workout state.
- **Sticky Actions:** "Finish Workout" and "Add Exercise" should be easily accessible but not in the way of logging.

## Exercise Card Behavior

- **Accordion Style:** Each exercise is an expandable card.
- **Auto-Collapse:** All cards start collapsed except the current (active) exercise.
- **Visual State:** Clear distinction between `Pending`, `Current`, and `Completed` exercises.

## Current Exercise Behavior

- **Expanded by Default:** Shows all sets, inputs, and previous performance context.
- **Input Focus:** Large tap targets for weight and reps.
- **Progression Context:** Secondary display of last session's performance for this specific exercise.

## Completed Exercise Behavior

- **Collapsed Summary:** Automatically collapses upon completion of the last set or manual "Finish Exercise" action.
- **Quick Stats:** Displays total volume, top set (best weight/reps), and a comparison to the previous session (e.g., "+5 lbs").
- **Editability:** Can be re-expanded easily if a correction is needed.

## Set Logging Behavior

- **Atomic Updates:** Every set logged is saved immediately to local state.
- **Visual Feedback:** Haptic-like visual confirmation when a set is marked complete.
- **Rest Timer:** Integrated rest timer triggers automatically after marking a set as done.

## Mobile-First UX Rules

- **Tap Targets:** Minimum 44x44px for all interactive elements.
- **One-Handed Use:** Primary logging inputs positioned within the "thumb zone."
- **High Contrast:** Clear readability in bright gym lighting.
- **Reduced Motion Support:** Respect user settings for minimal animations.

## Data Persistence Behavior

- **Session Recovery:** The active workout state must persist across tab refreshes, app restarts, and accidental closures.
- **Auto-Save:** Every change (set, rep, weight, note) triggers an immediate state update.
- **Navigation Lock:** Prevent accidental "Back" navigation without a "Discard" or "Save" confirmation.

## Jarvis Behavior

- **Voice Commands:** Support for "Jarvis, log 225 for 5 reps."
- **Real-time Adjustments:** Jarvis can suggest exercise swaps if the user mentions equipment is busy or an area is sore.
- **Motivation/Context:** Jarvis can provide "Best set ever!" or "You're 2 reps away from a PR" cues.

## Edge Cases

- **App Crash:** Restore the exact state of the workout upon re-opening.
- **No Internet:** Full offline support; sync logs when connection returns.
- **Multiple Tabs:** Ensure state is synced across tabs if the user has FitCore open in multiple places.
- **Accidental Discard:** Require double-confirmation before wiping an active session.

## Future Implementation Checklist

- [ ] Implement `ActiveWorkoutState` persistence in `localStorage`/`IndexedDB`.
- [ ] Create the `ExpandableExerciseCard` component.
- [ ] Build the "Finish Workout" summary sheet.
- [ ] Add "Save as Template" functionality to the workout completion flow.
- [ ] Integrate the automated rest timer logic.
