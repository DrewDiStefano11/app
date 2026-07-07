# Wave 4 Active Workout Code-Scope Audit

## 1. Purpose and scope
This audit prepares the codebase for Wave 4 runtime implementation, focusing on the active workout experience. Wave 4 will implement expandable exercise cards, auto-collapsing/expanding behavior, set/exercise flags, previous performance displays, the finish summary flow, workout template saving, a plate calculator, and safety checks.

## 2. Source docs checked
* `docs/planning/implementation-start-handoff.md`
* `docs/planning/post-product-bible-cleanup-plan.md`
* `docs/planning/post-bible-agent-task-queue.md`
* `docs/planning/active-workout-implementation-readiness-checklist.md`
* `docs/planning/training-implementation-dependency-map.md`
* `docs/audits/active-workout-state-machine-audit.md`
* `docs/audits/popup-sheet-behavior-inventory.md`

## 3. Runtime files inspected
| File path | Ownership | Active workout area affected | Risk level | Likely Wave 4 changes | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/components/app/active-workout.tsx` | Active workout state and UI | Entire active workout flow | Very High | Implementing expandable cards, flag selectors, plate calculator integration, finish notes UI. | Massive, monolithic file; extremely high risk for merge conflicts. |
| `src/components/app/views/training.tsx` | Entry points | Starting blank/plan workouts | Low | Ensuring template selection works. | |
| `src/lib/types.ts` | Data models | Sets, flags, templates | Medium | Ensuring `SetEntry` and `Workout` schemas support new flags and notes properly. | |

## 4. Current active workout behavior
* **Exercise display**: Uses an accordion-style `ExerciseCard` component.
* **Current exercise state**: Auto-expands the first uncompleted exercise.
* **Completed exercise state**: Shows a summary of volume and top sets upon completion.
* **Set logging**: Driven by UI incrementers/decrementers in `SetRow`. Changes dispatch atomic updates to the main store.
* **Set flags**: Modifiers exist per-set (`s.modifier`), handled UI-side via color-coded chips.
* **Previous performance**: Fetched from `previousWorkout?.exercises`.
* **Workout finish flow**: Aggregates time, volume, reps, and calculates PRs.
* **Notes**: A textarea captures qualitative text, and a parser extracts fatigue keywords.
* **Template saving**: Basic template structure exists (`WORKOUT_TEMPLATES`), but user-saved templates flow needs UI.
* **Plate calculator**: Not fully implemented or integrated as a robust standalone utility.
* **Safety checks**: Pain/discomfort notes are parsed, but strict medical blocking or anomaly warnings during sets are weak.

## 5. File overlap analysis
`src/components/app/active-workout.tsx` contains nearly all the logic, state, and UI components for this entire feature. Modifying the cards, adding the plate calculator, and changing the finish flow in parallel PRs would guarantee severe merge conflicts on this single, highly volatile file.

## 6. Recommended Wave 4 PR breakdown
* **Recommendation**: **One combined PR**.
* **Reasoning**: While a 2-3 PR split (e.g., 4A: cards/performance, 4B: flags/finish, 4C: templates/safety) might seem appealing, the extreme centralization of state and UI within `src/components/app/active-workout.tsx` makes parallel execution too risky. The state machine relies heavily on local component state (`openMap`, timers) intertwined with the global `activeWorkout` store. To avoid blocking integration issues, it is safer to group these tightly related UI/state updates into a single comprehensive PR for Wave 4.

## 7. Out-of-scope list
* AI/Jarvis implementation
* graph/dashboard redesign
* nutrition logging
* recovery system rebuild
* schema migrations unless absolutely required
* package/lockfile/config/workflow changes
* service worker changes

## 8. Final recommendation table

| Area | Likely files | Recommended PR | Parallel safe? | Risk | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Active Workout Flow | `active-workout.tsx`, `types.ts`, `training.tsx` | 4A (Combined) | No | Very High | Heavily monolithic file; splitting risks conflicts. |
