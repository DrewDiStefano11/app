# Data Flow and Integrity Audit

## Coordination & Protected Zones

This document serves as a reference for data integrity and flow. The following areas are currently under active development in other PRs and should be considered "protected zones":

- **AI PR #2:** Actively modifying Jarvis/AI logic and `src/lib/types.ts`.
- **Premium UI Codex PR:** Handling visual/UI changes and dashboard polish.
- **Jules PR #1:** Managing repository QA, general documentation, and CI/CD.

This audit does not change any runtime code but establishes the requirements for how data must be handled to support these future enhancements.

---

## App State Storage

### Persistence Mechanism

FitCore uses a local-first data model. The primary application state is stored in `localStorage` under the key `fitcore.v1`.

- **Key:** `fitcore.v1`
- **Format:** JSON-serialized `AppState` object.
- **UI Preferences:** Secondary UI-only state (like graph filters or view modes) is stored under `fitcore.ui.*` keys via the `usePersistentState` hook in `src/lib/persist.ts`.

### Migration and Default Merging

Data is hydrated on app load in `src/lib/store.tsx`.

- **Migration Strategy:** The `migrate` function performs a shallow merge of the saved state with `defaultState`.
- **Nested Merging:** Specific nested objects (`personalization`, `profile`, `nutritionTargets`, `jarvisSettings`) are explicitly merged with their respective defaults to ensure that adding new fields to the schema doesn't cause crashes or data loss for returning users.
- **Version Control:** The `AppState` includes a `version` field (currently `2`) to facilitate future structural migrations.

---

## Major Data Categories

### 1. Training Data

- **Workouts (`workouts[]`):** Historical record of completed workouts.
- **Active Workout (`activeWorkout`):** A single `Workout` object or `null`. It represents a session in progress.
- **Workout Templates (`workoutTemplates[]`):** User-saved or default templates for starting new sessions.
- **Custom Exercises (`customExercises[]`):** User-defined exercises that extend the base `EXERCISES` library.

### 2. Nutrition Data

- **Meal Entries (`mealEntries[]`):** Daily logs of food intake.
- **Supplement Logs (`supplementLogs[]`):** Specific tracking for supplements, separate from meals.
- **Nutrition Targets (`nutritionTargets`):** User-defined daily goals for calories and macros.

### 3. Recovery and Wellness

- **Bodyweight (`bodyweightEntries[]`):** Time-stamped weight logs.
- **Sleep (`sleepEntries[]`):** Logs of sleep duration and quality.
- **Recovery Check-ins (`recoveryCheckIns[]`):** Subjective daily assessments (energy, soreness, stress, motivation).
- **Muscle Fatigue (`muscleFatigue`):** A map of muscle group IDs to fatigue levels (`fresh`, `moderate`, `fatigued`, `very`). Currently a manual or AI-suggested representation of readiness.

### 4. Progress and Personalization

- **PRs (`prs[]`):** Personal records for specific exercises (1RM, max weight, or volume).
- **Goals (`goals[]`):** Trackers for various metrics (weekly workouts, bodyweight, etc.).
- **Progress Photos (`progressPhotos[]`):** Image references with view and phase metadata.
- **Profile:** Static user data (age, weight, experience, goals).
- **Personalization:** UI preferences (theme, units, reminders).

### 5. Jarvis / AI Data

- **Jarvis Settings:** Permissions, personality, and automation toggles.
- **Jarvis Audit (`jarvisAudit[]`):** A log of all AI-driven actions, including original text, tool used, and status (logged, suggested, undone).
- **Jarvis Learning (`jarvisLearning`):** A flexible record for the AI to store user-specific patterns and preferences.
- **AI Messages (`aiMessages[]`):** The chat history between the user and Jarvis.

---

## Data Flow Characteristics

### Active vs. Completed Workouts

- **Active Workout:** Volatile but persisted. If the app closes, the session remains in `activeWorkout`. It allows for real-time editing of sets, reps, and notes.
- **Completed Workout:** Once "Finished", the `activeWorkout` is moved to the `workouts` array with an `endedAt` timestamp. Completed workouts should be treated as immutable historical records, though currently they can be edited via the history UI.

### Demo Mode and View State

- **Mechanism:** In `src/lib/store.tsx`, the `view` object is derived from the `state`.
- **Effect:** When `demoMode` is true, `buildDemoState` generates a rich set of mock data (60 days of workouts, weight trends, etc.) and **merges** it with the user's real data.
- **Integrity:** Real user data is never overwritten by demo data. The UI consumes the `view` object, but the `save` function only ever writes the original `state` (containing only real user data) back to `localStorage`.

---

## Data Integrity Risks

### Risky Changes (Require Migrations)

- **Schema Renaming:** Renaming keys in `AppState` or core interfaces (e.g., `Workout`, `SetEntry`) will cause existing data to be lost during the `migrate` merge unless handled explicitly.
- **Enum Changes:** Changing allowed values for `modifier` in sets or `category` in exercises may break UI rendering or filtering.
- **Active Workout Structure:** Changes to how sets are tracked within `activeWorkout` can lead to sessions becoming unrecoverable or corrupted.

### Non-Overwritable Data (Never Silently Overwrite)

- **User Notes:** Workout, meal, and recovery notes are high-value personal data and should never be truncated or overwritten by AI without explicit confirmation.
- **Historical PRs:** These represent milestones and should be protected from accidental deletion or modification by automated cleanup routines.
- **Jarvis Audit Trail:** The audit trail is the only way to "undo" AI mistakes; it must be preserved to maintain user trust.
- **Manual Logs vs AI Logs:** Data with `source: "manual"` should always take precedence and never be "corrected" by AI without a "suggested" state first.
