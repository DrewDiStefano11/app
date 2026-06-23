# Logging Integrity Plan

This document outlines the future implementation plan for ensuring data integrity across all logging categories in FitCore. The goal is to ensure that every logged item correctly updates all relevant screens, charts, scores, and AI contexts without data loss or "wasted" data.

---

## Logged Item Categories

### 1. Training & Workouts
Includes: `workout`, `active workout`, `set`, `reps`, `weight`, `RPE`, `warmup set`, `drop set`, `failure set`, `partials`, `unilateral work`, `exercise notes`, `workout summary notes`, `cardio`.

- **Creation Points:** Training Section, Active Workout Screen, Quick Log, Jarvis AI.
- **Display Points:** Training History, Dashboard Cards, Exercise Detail view, Weekly Review.
- **Charts/Graphs to Update:**
    - Volume over time (Total & Muscle-specific).
    - Intensity / 1RM trends.
    - Consistency / Frequency heatmap.
    - Cardio duration/intensity graph.
- **Scores Influenced:**
    - **Training Score:** Based on volume and consistency.
    - **Readiness Score:** Adjusted by recent workload.
    - **Muscle Readiness:** Updated per muscle group based on sets/intensity.
- **AI Context:** Used for workout suggestions, progression advice, and identifying fatigue patterns.
- **Validation:**
    - Weights must be non-negative.
    - Reps must be integers.
    - Timestamps must be in the past or present.
- **Empty State:** "No workouts logged this week. Start a session to see your progress."
- **Backup Behavior:** Must preserve the full relational hierarchy: Workout -> Exercise -> Set -> Modifiers.

### 2. Nutrition
Includes: `meal`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `water`, `supplements`.

- **Creation Points:** Nutrition Section, Quick Log, Jarvis AI (Natural Language), Barcode Scanner (future).
- **Display Points:** Nutrition Dashboard, Daily Log, Weekly Summary, Hub.
- **Charts/Graphs to Update:**
    - Calorie/Macro bars (Actual vs Target).
    - Water intake trend.
    - Supplement adherence timeline.
- **Scores Influenced:**
    - **Nutrition Score:** Macro accuracy and consistency.
    - **Meal Quality Score:** Based on fiber and variety (future).
    - **Data Coverage Score:** Rewards logging all meals.
- **AI Context:** Estimating macros from descriptions, suggesting meal adjustments, and supplement reminders.
- **Validation:**
    - Calories should roughly equal `(4*P) + (4*C) + (9*F)`.
    - Macros must be non-negative.
- **Empty State:** "Hungry? Log your first meal of the day to track your macros."
- **Backup Behavior:** Preserve meal items, source metadata (manual vs AI), and confidence levels.

### 3. Wellness & Recovery
Includes: `bodyweight`, `sleep`, `recovery check-in`, `soreness`, `pain`, `fatigue`, `stress`, `motivation`.

- **Creation Points:** Recovery Section, Daily Check-in Popup, Jarvis AI, Health App sync (Whoop/Apple Health).
- **Display Points:** Recovery Dashboard, Readiness Card, Bodyweight Trend graph.
- **Charts/Graphs to Update:**
    - Bodyweight (7-day moving average).
    - Sleep duration vs Quality.
    - Subjective wellness radar (Stress, Fatigue, Motivation).
    - Body Heatmap (Soreness/Pain).
- **Scores Influenced:**
    - **Recovery Score:** Based on sleep and check-ins.
    - **Readiness Score:** Combines recovery with recent training fatigue.
    - **Longevity Score:** Influenced by stress and sleep consistency.
- **AI Context:** Warning before workouts if pain/soreness is high; adjusting daily plans.
- **Validation:**
    - Weights within a reasonable range of recent history (trigger confirmation if >5% change).
    - Qualitative scores on a defined scale (e.g., 1-5 or 1-10).
- **Empty State:** "How are you feeling today? Complete your daily check-in."
- **Backup Behavior:** Time-series integrity is critical for trend calculations.

### 4. Progress & Goals
Includes: `progress photo`, `goals`, `PRs`.

- **Creation Points:** Progress Section, Profile/Hub, Automatic (for PRs during workout).
- **Display Points:** Dashboard Focus, Photo Gallery, Milestone Card.
- **Charts/Graphs to Update:**
    - Goal progress rings.
    - PR timeline per exercise.
- **Scores Influenced:**
    - **Body Score:** Weight trend and photo consistency.
    - **FitCore Score:** Overall progression toward set goals.
- **AI Context:** Identifying plateaus and celebrating milestones.
- **Validation:**
    - PRs must be verified against workout data.
    - Photos require camera/album permissions and view metadata.
- **Empty State:** "No goals set yet. What are you working toward?"
- **Backup Behavior:** Photos require external storage references or base64 (local); metadata must match.

---

## Data Integrity Checklists

### “No Wasted Data” Checklist
- [ ] Does this log update the primary dashboard?
- [ ] Is this data visible in a relevant chart or graph?
- [ ] Does this log influence at least one FitCore score?
- [ ] Is this log included in the Jarvis/AI context for future recommendations?
- [ ] Is the data preserved in the daily/weekly review?
- [ ] Can this data be exported and re-imported without loss of detail?

### “Do Not Lose User Data” Checklist
- [ ] **Local-First Safety:** Save to `localStorage` immediately after any change.
- [ ] **Conflict Resolution:** If multiple tabs are open, ensure `storage` events sync state without overwriting newer data.
- [ ] **Explicit Undo:** AI-created logs must have an "Undo" path and audit entry.
- [ ] **Non-Destructive AI:** AI should "suggest" changes to existing manual logs rather than overwriting them.
- [ ] **Validation Before Save:** Ensure malformed data (NaN, undefined) never enters the persistent state.

### Future Migration Checklist
- [ ] Increment `version` in `AppState`.
- [ ] Add explicit mapping for renamed fields in `store.tsx:migrate`.
- [ ] Provide default values for all new schema additions.
- [ ] Test import/export with "legacy" JSON files before shipping.
- [ ] Document all schema changes in `data-flow-audit.md`.

### Future AI Logging Acceptance Checklist
- [ ] **Audit Trail:** Every AI action must be logged in `jarvisAudit`.
- [ ] **Confidence Threshold:** If AI confidence is "Low", the log must remain as "Suggested" until user confirmation.
- [ ] **Original Text Preservation:** Always store the `originalText` that generated the log.
- [ ] **Undo Logic:** Deleting an AI log should revert the state to exactly what it was before the log (using `undoId`).
- [ ] **Context Awareness:** AI should check for existing manual logs for the same time period to avoid duplication.

### Future Dashboard Customization Compatibility Checklist
- [ ] **Modular State:** Ensure dashboard cards depend on discrete slices of state (e.g., `mealEntries` only).
- [ ] **Data-Driven Visibility:** Cards should automatically hide or show based on the presence of data.
- [ ] **Unit Agnostic:** All data must be stored in base units (e.g., Lb) but displayed according to `personalization.units`.
- [ ] **Refresh Safety:** Toggling dashboard focus or customization should not trigger unnecessary re-renders or state saves.
