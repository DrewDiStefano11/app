# Training Implementation Dependency Map

## 1. Purpose
To map the implementation dependencies required before starting the development of the FitCore Training system features. This ensures that data, UI, AI, privacy, and QA prerequisites are met before code is written, reducing technical debt and rework.

## 2. Scope
This dependency map covers the following planned features:
- Active workout logging
- Exercise cards
- Set logging
- Warmup/drop/unilateral/failure/partials flags
- Previous performance display
- Workout finish summary
- Optional workout notes
- Pain/tiredness/soreness note propagation
- Workout template saving
- Progression logic
- Plate calculator
- Smart exercise behavior
- Workout safety checks
- Dashboard/graph propagation
- AI/Jarvis logging and explanation

## 3. Product Bible Sources to Check
- `docs/product-bible/book-03-training-system/README.md`
- `docs/product-bible/book-03-training-system/01-training-system-overview.md`
- `docs/product-bible/book-03-training-system/02-workout-logging-and-active-workout.md`
- `docs/product-bible/book-03-training-system/03-exercise-and-set-data-model.md`
- `docs/product-bible/book-03-training-system/04-progression-and-performance-logic.md`
- `docs/product-bible/book-03-training-system/05-training-safety-and-injury-awareness.md`
- `docs/product-bible/book-02-system-architecture/README.md` (for Data Philosophy)
- `docs/product-bible/book-05-ux-ui-and-user-experience/README.md` (for UI Standards)

## 4. Related Planning/Audit Inputs
- `docs/audits/active-workout-state-machine-audit.md`
- `docs/audits/current-data-flow-audit.md`
- `docs/audits/popup-sheet-behavior-inventory.md`
- `docs/audits/storage-persistence-readiness-audit.md`
- `docs/planning/fitcore-next-phase-implementation-map.md`
- `docs/planning/fitcore-pr-boundary-and-sequencing-guide.md`

## 5. Required Data Dependencies
- **Workout State Object Model:** Re-architecting the global `activeWorkout` object (as highlighted in `active-workout-state-machine-audit.md`) before expanding active workout functionality.
- **Set Data Schema:** Updates to support tags like warmups, drops, partials, unilateral tags, and pain metrics.
- **Persistence/Recovery Mechanics:** A strategy for saving/restoring the active workout object from `localStorage` effectively during app termination or accidental navigation.
- **Progression Logic Formulas:** The explicit math/engine logic for interpreting performance against past metrics (needs definition based on Book 3).
- **Data Provenance System:** Support for provenance tagging and origin on workout entries.

## 6. Required UI Dependencies
- **Bottom Sheet Standardization:** Fixes to `BottomSheet` and portal-based rendering to prevent z-index issues (`popup-sheet-behavior-inventory.md`) before building workout completion flows.
- **Card and Component Scaling:** Ensuring `BottomSheet` viewport handling and expandable row/cards inside workout logs don't have hardcoded `max-h` properties.

## 7. Required AI/Jarvis Dependencies
- **AI Tools Hotspot De-risking:** Addressing the `src/lib/jarvis/tools.ts` hotspot architecture to prevent cross-domain collision while adding workout log parsing.
- **Jarvis Action Logging Standard:** Defining the prompt and permission flows for logging training data via text/voice, and how "unconfirmed" versus "user_corrected" training inputs modify suggestions.

## 8. Required Privacy/Safety Dependencies
- **Medical/Injury Boundaries:** Finalizing rules on how pain/tiredness logs filter exercise suggestions, acting as a block on dangerous recommendations.
- **Data Opt-In:** Verifying storage boundaries so demo modes do not pollute real data (`dashboard-graph-data-consistency-audit.md`).

## 9. Required QA/Testing Dependencies
- `docs/qa/fitcore-merge-checklist.md` validation points mapped for active workouts.
- E2E testing standard for the training tab using specific selector rules (e.g., App Bottom Nav).
- Related Test Plans (e.g., from Book 10, Testing/QA) mapped to verify recovery states during workout logging.

## 10. Implementation Sequence
1.  **Architecture:** Refactor `activeWorkout` state/persistence schemas. Update Core Types.
2.  **UI Scaffolding:** Implement the correct `BottomSheet` rules and list views.
3.  **Core Features:** Implement Exercise Cards, Set logging with basic tags.
4.  **Advanced Fields:** Add Unilateral/Failure/Pain tags. Implement previous performance pulls.
5.  **Completion Tools:** Build finish summary and Workout Template saving.
6.  **Engine Support:** Hook up Progression logic, Smart exercise behavior, and Safety checks.
7.  **AI Layer:** Implement Jarvis logging and explanation functionality.

## 11. Unsafe Shortcuts
- Modifying `src/lib/jarvis/tools.ts` directly for training without a clear separation plan.
- Putting state inline in the Active Workout component instead of utilizing the defined Data Model/State boundaries.
- Hardcoding popup heights instead of utilizing dynamic viewport sizing.

## 12. Suggested Future PR Breakdown
- PR 1: Data Model Updates (Exercise, Sets, Tags, Persistence setup).
- PR 2: UI Foundation updates (Detail Sheets/Cards).
- PR 3: Core Logging Loop (Add/Remove exercises, Add/Remove sets).
- PR 4: Advanced Logging (Modifiers, Tags, Pain Tracking).
- PR 5: Active Workout Context (Previous performance, Safety Limits, Finish Summary).
- PR 6: AI Tooling (Jarvis interpretation and logging integration).

## 13. Acceptance Criteria Before Runtime Work Starts
- Schema definitions for extended workout sets and pain logs are confirmed.
- UI rules for `BottomSheet` fixes are implemented and verified.
- The `jarvis/tools.ts` refactoring strategy is defined.
- State-machine refactor strategy for active workout recovery is defined.

## 14. Final Dependency Table

| Dependency | Required before implementation? | Source/planning input | Risk if missing | Recommended next action |
| :--- | :--- | :--- | :--- | :--- |
| `activeWorkout` state machine refactor | Yes | `docs/audits/active-workout-state-machine-audit.md` | Persistent crash loops or data loss during log execution | Execute state persistence strategy PR |
| UI BottomSheet standardization | Yes | `docs/audits/popup-sheet-behavior-inventory.md` | Popups overlapping keyboard, layout breaking | Complete UI Portal refactoring |
| Training Set Schema Updates (Modifiers, Unilateral) | Yes | `docs/product-bible/book-03-training-system/03-exercise-and-set-data-model.md` | Having to migrate live data structure | Build Types and DB validation PR |
| Jarvis Tools Hotspot separation | Yes | `docs/audits/current-code-structure-audit.md` | Merge conflicts across teams | Adopt a horizontal slicing architecture for tools |
| QA E2E Baseline Coverage | Yes | Book 10 / Smoke Check Audits | Regressions during training tab overhauls | Review test suite coverage for existing workout flow |
