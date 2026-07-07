# 04 - Check-ins, Soreness, Pain, Fatigue, and Stress

Subjective user feedback is often the most accurate indicator of true recovery state. FitCore uses structured check-ins and unstructured conversational parsing to capture this data.

## Subjective Check-in Fields

FitCore tracks several distinct categories of subjective feeling:

- **Soreness (DOMS):** Normal muscular discomfort resulting from training.
- **Pain:** Sharp, acute, or chronic discomfort that suggests injury or structural issue.
- **Fatigue:** General physical or central nervous system tiredness.
- **Stress:** Mental or emotional load.
- **Motivation/Mood:** Psychological readiness to train.
- **Energy Level:** General feeling of vitality.
- **Illness/Sickness:** Symptoms of being unwell (cold, flu, etc.).

## Soreness vs. Pain Distinction

This is a critical product boundary. FitCore must clearly distinguish between soreness (a normal training adaptation) and pain (a potential injury).

- **Soreness:** May lead to recommendations to train a different muscle group, do active recovery, or work through it lightly if mild.
- **Pain:** Must trigger safety protocols. FitCore should _never_ advise a user to "push through" pain. It should recommend avoiding exercises that aggravate the area and suggest seeking medical advice if persistent.

## Body Area Tracking

Soreness and pain must be localized. A check-in should identify specific areas (e.g., "Left Knee," "Lower Back," "Chest," "Hamstrings"). This allows the Daily Decision Engine to make intelligent exercise substitutions (e.g., swapping a barbell squat for a leg press if the lower back is sore, but the quads are recovered).

## Generating Signals from Unstructured Notes

Users may not always use structured UI forms. They might leave a note on a workout: _"Felt completely drained today, couldn't finish the last set."_ or say to Jarvis: _"My right shoulder is really aching."_

- The AI (Codex/Jarvis) is responsible for parsing these unstructured notes and extracting structured recovery signals (e.g., `fatigue_level: high`, `pain_location: right_shoulder`).
- These extracted signals must be assigned a `Medium` confidence level until confirmed by the user.

## User Correction and Confirmation

Following Book 2 principles, AI-extracted signals must be presented to the user for confirmation.

- If Jarvis infers "High Stress" from a journal entry, the UI should show: "I noticed you might be feeling stressed. Is this correct?"
- If the user corrects the assumption, the user's manual input becomes the canonical, `High Confidence` data point.

## Red-Flag Language and Medical Escalation

FitCore must implement keyword detection for red-flag symptoms in unstructured text or voice inputs.

- **Red Flags include:** "dizzy," "chest pain," "can't breathe," "numbness," "severe swelling," "fainted," "popping sound."
- **Action:** When detected, FitCore must immediately cease training recommendations, display a clear safety warning, and advise the user to seek immediate medical attention.
- FitCore is a coaching tool, not a diagnostic medical device. (Further defined in Chapter 7 and Book 8).

## Open Questions

- What specific UX pattern should be used for the daily subjective check-in to minimize friction while gathering adequate data?
- How granular should the "body map" be for tracking localized soreness/pain? (e.g., "Legs" vs. "Quads/Hamstrings/Calves" vs. specific muscles).
