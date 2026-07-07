# Active Workout State Machine Audit

Date of audit: 2024-07-07
Branch/task name: docs/audit-active-workout-state-machine
**Note:** This is a docs-only audit and does not change any runtime behavior.

## Executive Summary
This document provides an audit of the current state machine and data flow for the active workout logging experience in FitCore. Currently, an active workout is represented as a monolithic, centralized object (`activeWorkout: Workout | null`) within the global `AppState` via `src/lib/store.tsx`. Local component state in `ActiveWorkoutView` (such as `openMap`, `confirmCancel`, and `finishOpen`) orchestrates the UI representation. When completed, the active workout object is finalized and pushed into the `workouts` history array.

Future implementation risks focus on persistence during accidental navigation, handling of demo mode pollution, edge cases around AI interference while a session is active, and handling of granular exercise progression metrics based on set-level tagging.

## Scope
This audit maps the current implementation state of the active workout feature, covering:
- State data structures and where they live.
- Entry points, execution behavior, and completion handoffs.
- Exercise and set-level mechanics (modifiers, completion logic).
- Cross-feature interactions (Jarvis, progress, readiness context).
- Current known limitations, edge cases, and safety flags.
- Does **not** include structural refactoring, bug fixes, or modifications to the active application runtime.

## Files Inspected
- `src/components/app/active-workout.tsx`: Contains the main view, state controllers, UI sheets, timers, and finish flow.
- `src/components/app/views/training.tsx`: Contains entry points (Starting Blank, Starting Today's Plan) and workout plan templates.
- `src/lib/store.tsx`: Core `StoreProvider`, providing `state.activeWorkout`, PR computations, and local storage persistence mapping.
- `src/lib/types.ts`: Type definitions including `Workout`, `WorkoutExercise`, and `SetEntry`.
- `src/lib/jarvis/tools.ts`: Tool functions handling interactions like `updateActiveWorkout`, `finishActiveWorkout`, `logExerciseSet`.
- `docs/audits/storage-persistence-readiness-audit.md`: Current persistence context for LocalStorage.
- `docs/product/active-workout-experience-spec.md`: The intended product behavior and specification.

## Current Behavior Map

### 1. Active Workout Entry Points
- **Starting a Blank Workout:** In `training.tsx`, clicking "+ Blank" initializes a new workout object with `startedAt: Date.now()` and an empty `exercises` array via the global `set()` updater.
- **Starting a Plan:** In `training.tsx`, clicking "Start today's plan" populates the `activeWorkout` based on a predefined template (from `workoutTemplates` / `WORKOUT_TEMPLATES`).
- **View Ownership:** If `state.activeWorkout` is present, `TrainingView` short-circuits and immediately renders `<ActiveWorkoutView />` which acts as a full-screen lockdown.

### 2. Current Active Workout State Model
- **Data Structure:**
  - `Workout` object holding `id`, `name`, `startedAt`, `endedAt`, `exercises`, and `notes`.
  - `WorkoutExercise` holds `sets`, `exerciseTags`, and `completed`.
  - `SetEntry` tracks `weight`, `reps`, `completed`, and optional `modifier` (`normal`, `warmup`, `drop`, `failure`, `partials`, `unilateral`, `paused`, `tempo`).
- **Data Location:** Lives in `AppState.activeWorkout`, managed by React context and globally written to `localStorage` (`fitcore.v1`).
- **Persistence:** Because it relies on `localStorage` bound to the global store, the active workout currently survives page reloads, tab closes, and app restarts.

### 3. Exercise-Card Behavior
- **Layout and Visuals:** Uses an accordion-style `ExerciseCard` component.
- **Active / Collapsed Logic:** The first uncompleted exercise automatically becomes the "active" one (`activeId` memoized based on `!e.completed`). Completed exercises show a summary of volume and top sets.
- **Previous Performance:** Fetched from `previousWorkout?.exercises`, with a fallback to deterministic seeded numbers if `demoMode` is true.

### 4. Set-Level Behavior
- **Adding/Editing Sets:** Driven by UI incrementers/decrementers in `SetRow`. Changes dispatch atomic updates to the main store.
- **Modifiers:** Exist per-set (`s.modifier`) but can also be applied as whole-exercise tags (`we.exerciseTags`). Handled UI-side via color-coded chips (e.g., Warmup, Drop).
- **Safety Flags:** Pain/discomfort notes are not strictly bound to the Set Level, but handled holistically in `FinishWorkoutSheet`.

### 5. Workout Completion Flow
- **Finish Screen:** The `FinishWorkoutSheet` aggregates time, volume, and reps.
- **Metrics/PRs:** PRs are calculated synchronously (using `e1RM`) and pushed to `AppState.prs`.
- **Notes/Recovery:** A `notes` textarea captures qualitative text. A parser (`extractNoteSuggestions`) extracts keywords (pain, sore, hurt) to update `AppState.muscleFatigue` with freshness levels.
- **Data Handoff:** The `activeWorkout` object gets `endedAt` appended, is pushed to `workouts`, and `activeWorkout` is set to `null`. Goals (e.g., `weekly_workouts`) are updated.

## Active Workout State Ownership Table

| State Element | Managed By | Storage Location | Scope / Lifespan |
| :--- | :--- | :--- | :--- |
| `activeWorkout` Object | `StoreProvider` (`store.tsx`) | `localStorage` (`fitcore.v1`) | Persists across sessions until completed or discarded. |
| Accordion Expanded State (`openMap`) | Local `useState` in `activeWorkout.tsx` | In-memory Component State | Lost on reload. Auto-calculated based on completion. |
| Custom Exercise Flow State | Local `useState` | In-memory Component State | Lost on reload. Saved to `customExercises` global array when confirmed. |
| Finish/Discard Dialog State | Local `useState` | In-memory Component State | Lost on reload. |
| Live Timer | Local `useNow` Hook | In-memory | Computed based on `startedAt`. |

## State Transition Table

| Trigger | From Phase | To Phase | Action Taken |
| :--- | :--- | :--- | :--- |
| Click "Blank" or "Plan" | Idle / Training View | Active | Global store updates `activeWorkout` to non-null. |
| Click X -> Discard | Active | Idle / Training View | `activeWorkout` set to null. Data is erased. |
| Checkmark Final Set | Active | Active (Complete Ex) | Exercise `completed` set to true. UI auto-collapses card. |
| Open Finish Sheet | Active | Finishing | Local `finishOpen` set to true. Stats computed. |
| Confirm & Save | Finishing | Completed | Appends to `workouts`, calculates PRs/Fatigue, `activeWorkout` -> null. |

## Data Persistence and Handoff Table

| Entity | Origin | Destination on Finish | Notes |
| :--- | :--- | :--- | :--- |
| Set Volume/Metrics | Live Session | `Workout` object inside `workouts` | Immutable history record. |
| Personal Records (PR) | `activeWorkout.tsx` (Finish) | `AppState.prs` | Evaluated against existing 1RMs. |
| Post-Workout Notes | `activeWorkout.tsx` (Finish) | `Workout.notes` & AI extraction | Extract fatigue metrics directly to `AppState.muscleFatigue`. |
| Templates | Finish Options | `AppState.workoutTemplates` | User can save an active session as a new base template. |

## AI/Jarvis Interaction Risks

- **Concurrent Modification:** Jarvis tools (`logExerciseSet`, `updateActiveWorkout`) map directly to the store. If a user is actively tapping while Jarvis is streaming an update, race conditions or overwrites in the global state could occur.
- **Confidence Overrides:** Changes to active workouts via natural language (e.g., "Swap bench press for dumbbell press") might alter sets currently in progress without clear UI warnings.
- **AI Tooling Gaps:** The Jarvis tool `finishActiveWorkout` allows the AI to finalize a session but might bypass the immediate visual PR review or specific note-based fatigue parsing triggered in the manual UI.

## Safety and Injury-Context Risks

- **No Medical Blocking:** Fatigue and pain are parsed from notes text (`heavySignals`), which updates `muscleFatigue`, but the app does not actively lock out a user from lifting based on a pain flag during an active session.
- **Soreness Context:** Currently applied *after* the workout completes via the note parser, rather than mid-workout. A user experiencing pain mid-set must use the global notes at the end or explicitly mention it to Jarvis.

## Demo Mode Risks

- **Demo State Bleed:** `demoMode` uses deterministic hashes to fabricate previous workout sets for the UI context if real history is missing. Currently handled safely (read-only for view), but if UI interactions during active workouts (like auto-population or "copy previous") copy from `view` instead of `state`, fake data will become persisted history.

## Known Gaps

1. **Tab/Refresh UI State Loss:** Expanding/collapsing cards and active timers reset on page reload, though the global session data is safe.
2. **Offline Resilience:** Relies on synchronous LocalStorage. If IndexedDB/Cloud sync is added, active workouts need local-first locking to prevent network latency from ruining set logging.
3. **Rest Timer Mechanics:** Spec mentions an integrated rest timer that triggers automatically on set completion; current component inspection shows a live session timer, but no distinct per-set countdown rest timer logic.

## Recommended Future Implementation Sequence

1. **Phase 1: Rest Timer and UI State Persistence:** Add robust per-set rest countdowns and persist local UI state (`openMap`) to prevent disorientation on tab reload.
2. **Phase 2: Jarvis Mid-Workout Guardrails:** Implement explicit locking or conflict-resolution UI when Jarvis attempts to modify the `activeWorkout` while the user is actively logging a set.
3. **Phase 3: Real-Time Safety Flags:** Integrate mid-workout pain/soreness tagging directly onto sets (rather than just end-of-workout notes) to feed realtime AI warnings.
4. **Phase 4: State Machine Decoupling:** Refactor `activeWorkout` into a more robust state machine context (idle -> active -> paused -> finishing) to safely support future asynchronous IndexedDB migrations without blocking the main render thread.

## Stop Conditions for Future Agents

- **Do Not Extract to Asynchronous Storage Without Blocking UI:** `localStorage` is synchronous. Moving to IndexedDB will require a completely new hydration and commit-blocking mechanism for mid-workout atomic saves.
- **Do Not Modify Store Structure Without Review:** `activeWorkout` relies on the global store pipeline. Any changes must respect `migrateFitCoreDataIfNeeded` versioning.

## Validation Performed
- Validated `src/components/app/active-workout.tsx` for state ownership, components, and save behavior.
- Validated `src/components/app/views/training.tsx` for start conditions.
- Validated `src/lib/store.tsx` and `src/lib/types.ts` for schema compliance and `localStorage` relationships.
- Verified absence of medical/injury blockage beyond note extraction.
- Verified AI tool surface area against `src/lib/jarvis/tools.ts`.
