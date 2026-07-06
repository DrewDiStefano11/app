# Previous Performance and Progression Spec

## Purpose

Provide users with the necessary historical context and actionable suggestions to ensure progressive overload while respecting current recovery and readiness states.

## Product Rule Alignment

- **Explain What Changed:** Directly compare today's performance to the last session's results.
- **Decide What to do Next:** Suggest weight/rep increases (or deloads) based on specific data.
- **Connect Training, Nutrition, & Recovery:** Adjust suggestions based on sleep, soreness, and calorie intake.

## User Problems Solved

- Forgetting what weight/reps were used in the previous session.
- Uncertainty about whether to increase intensity or stay at the same weight.
- Pushing too hard when recovery is low, leading to burnout or injury.
- Not pushing hard enough when readiness is high, stalling progress.

## Required Data

To provide accurate context and suggestions, the engine needs:

- **Historical Logs:** At least 1-3 previous sessions for the current exercise.
- **Personal Records (PRs):** All-time best set and 1RM (one-rep max) estimates.
- **Recovery Signals:** Soreness, tiredness, and sleep quality from the last 24-48 hours.
- **Nutrition Context:** Adherence to calorie/carb targets over the last 48 hours.

## Previous Performance Display Rules

- **Contextual Visibility:** Show the previous session's sets directly within the active exercise card.
- **Visual Hierarchy:** Use secondary styling (e.g., greyed out or smaller font) to distinguish history from current inputs.
- **Key Metrics:** Highlight the "Best Set" (highest weight x reps) and total volume from the last session.
- **Comparison:** Show a real-time delta (e.g., "+5 lbs vs last time") as the user enters today's data.

## Progression Suggestion Rules

Suggestions should be generated using a "Safe-to-Push" algorithm:

1.  **Repeat Performance:** Suggest repeating the same weight/reps if:
    - Recovery is low (High soreness, low sleep).
    - Nutrition is significantly below target.
    - Last session's performance was a significant struggle.
2.  **Incremental Progression:** Suggest adding 2.5-5 lbs (or 1-2 reps) if:
    - Recovery is high (Low soreness, 7+ hours sleep).
    - Nutrition targets were met.
    - Last session felt "easy" or "moderate."
3.  **Deload Suggestion:** Suggest reducing weight/volume if:
    - Recovery is critical (Injury concern flag, very poor sleep).
    - User has missed multiple sessions recently.
    - Performance has been trending downward for 3+ sessions.

## Confidence/Provenance Behavior

- **Data Age:** Suggestions from data > 30 days old should be flagged as "Low Confidence - Test Weight."
- **Incomplete Logs:** If the previous session was unfinished, the engine should state: "Incomplete data from last time; suggesting a conservative start."
- **Transparency:** Every suggestion must be explainable (e.g., "Suggested: repeat 185 today because recovery is low").

## UI Behavior

- **One-Tap Acceptance:** Users can tap a suggestion to auto-fill today's first set.
- **Non-Intrusive:** Suggestions should be visible but never overwrite user-entered data without a tap.
- **Override behavior:** User overrides are high-signal data; if a user consistently pushes harder than suggested, the engine should adjust its future "aggressiveness."

## Jarvis Behavior

- **Real-time Coaching:** Jarvis can provide verbal cues: _"Last time you did 185 for 8. You're well-rested, try for 190 today."_
- **Explain the "Why":** If asked, Jarvis should explain the suggestion: _"I suggested a deload because your sleep has been under 6 hours for three days and you reported knee discomfort."_

## Edge Cases

- **New Exercise:** No history available. Suggest a "Feeler Set" to find the right weight.
- **Equipment Change:** User is using a different machine/barbell. Allow the user to flag "Different Equipment" to reset the baseline.
- **Significant Time Gap:** User hasn't done this exercise in 6 months. Treat as a new baseline.

## Future Implementation Checklist

- [ ] Implement `getPreviousPerformance(exerciseId)` logic.
- [ ] Build the `ProgressionEngine` to synthesize recovery and history.
- [ ] Add the "Previous Performance" sub-component to the `ExerciseCard`.
- [ ] Create the "Suggestion Badge" UI element with "Why?" drill-down.
- [ ] Track "Suggestion Adherence" as a metric for AI improvement.
