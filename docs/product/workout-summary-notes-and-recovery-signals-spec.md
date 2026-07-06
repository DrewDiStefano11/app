# Workout Summary Notes and Recovery Signals Spec

## Purpose

Transform unstructured workout notes into structured recovery intelligence. This spec ensures that qualitative user feedback (how they felt) is captured and used to drive quantitative recommendations.

## Product Rule Alignment

- **Reduce Logging Friction:** Simple, optional notes at the end of a workout; no mandatory forms.
- **Improve Trust:** Extracted recovery signals are shown back to the user for confirmation.
- **Connect Training & Recovery:** Notes about pain or fatigue directly influence the next day's readiness score.
- **Explain What Changed:** Summary highlights how today's session compared to recent averages.

## User Problems Solved

- Qualitative data (like "my lower back is tight") being buried in a text field and never used.
- Difficulty remembering _why_ a specific workout was poor (e.g., "very tired today").
- Missing the connection between training stress and physical symptoms.

## Finish Workout Summary Behavior

Upon finishing a workout, the user is presented with a summary sheet including:

- **Total Duration:** How long the session lasted.
- **Total Volume:** Aggregated weight x reps.
- **Best Sets:** A highlight reel of today's top performances.
- **Optional Notes Field:** A large, easy-to-tap text area for qualitative feedback.

## Optional Notes Behavior

- **Non-Required:** Users can skip notes and finish the workout in one tap.
- **Voice-to-Text Support:** Integrated microphone icon for fast dictation mid-sweat.
- **Real-time Extraction:** As the user types, Jarvis can subtly highlight recognized "Signals."

## Recovery Signal Extraction Rules

The engine scans notes for specific keywords and sentiment related to:

- **Pain:** "pain," "hurt," "injury," "discomfort," "sharp," "stinging."
- **Soreness:** "sore," "stiff," "tight," "achy," "doms."
- **Fatigue:** "tired," "exhausted," "no energy," "drained," "sleepy."
- **Performance Drops:** "weak," "heavy," "struggled," "slow."
- **Positive Signals:** "strong," "fast," "easy," "explosive," "great pump."

### Extraction Logic:

1.  **Keyword Match:** Identify the signal type (e.g., "Tightness").
2.  **Location Match (Optional):** Identify the body part if mentioned (e.g., "Knee").
3.  **Intensity Match:** Identify modifiers (e.g., "Very," "Slightly").

## Data/Provenance Behavior

- **Extracted Signals:** These are stored in the `AppState.recoverySignals` array with a `source: "workout_note"` tag.
- **Provenance Link:** Each signal maintains a reference to the original `workoutId` it was extracted from.
- **Confidence Level:** Signals extracted from text are marked as "Medium Confidence" until the user confirms them.

## Jarvis Behavior

- **Proactive Asking:** Jarvis can ask a follow-up if a note is vague: _"You mentioned your knee felt 'weird'—was that pain or just stiffness?"_
- **Future Coaching:** Jarvis remembers these signals: _"Last time you did squats, you noted lower back tightness. How is it feeling today?"_
- **Summary Generation:** Jarvis can write a one-sentence summary of the workout: _"A strong push session despite reporting poor sleep."_

## UI Behavior

- **Signal Review:** After finishing a workout, any extracted signals are displayed as "badges" for the user to confirm or delete.
- **History View:** Notes and signals appear in the workout history detail view.
- **Recovery View:** These signals feed into the main Recovery dashboard.

## Guardrails

- **No Medical Diagnosis:** FitCore should never say "You have tendonitis." It should say "You reported persistent knee discomfort over 3 sessions."
- **Privacy:** Notes are stored locally-first; ensure they are handled according to the user's data privacy settings.
- **Noise Filtering:** Ignore common non-recovery words to avoid false positives.

## Future Implementation Checklist

- [ ] Build the `RecoverySignalExtractor` utility using NLP/RegEx.
- [ ] Create the "Workout Summary" sheet component.
- [ ] Update `AppState` to support structured `recoverySignals` from notes.
- [ ] Implement the "Confirm Signal" UI badges in the summary flow.
- [ ] Connect notes to the "What Changed?" dashboard card logic.
