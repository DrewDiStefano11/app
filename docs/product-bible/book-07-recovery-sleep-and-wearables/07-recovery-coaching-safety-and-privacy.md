# 07 - Recovery Coaching, Safety, and Privacy

Handling recovery data—especially sleep, pain, stress, and sensor metrics—requires strict adherence to safety boundaries and privacy principles. FitCore must act as a responsible coach, not a medical provider.

## AI Coaching Boundaries

Jarvis (the AI Assistant) can coach users on recovery habits but must respect defined limits:

- **Allowed Coaching:**
  - Explaining the relationship between sleep, nutrition, and training performance.
  - Suggesting mobility work or active recovery for soreness.
  - Recommending adjustments to training volume based on fatigue.
  - Highlighting trends in the user's data (e.g., "Your HRV drops on days you drink alcohol").
- **Prohibited Coaching (Red Flags):**
  - Diagnosing injuries, sleep disorders, or illnesses.
  - Recommending specific medical treatments, medications, or supplements for pain.
  - Advising a user to "push through" acute pain.
  - Interpreting complex medical sensor data (e.g., ECG results) beyond general wellness trends.

## Medical Disclaimer and Escalation Logic

FitCore must include a standard medical disclaimer emphasizing that it is a fitness tool, not medical advice.

When the system detects red-flag language (as defined in Chapter 4: e.g., "sharp pain," "dizziness," "chest pain") or identifies a pattern of chronic, non-resolving pain:

1.  **Stop Recommendations:** Cease suggesting exercises that affect the reported area.
2.  **Display Warning:** Show a clear, non-dismissible warning advising the user to consult a healthcare professional.
3.  **Log Event:** Record the escalation for context in future coaching interactions.

## Pain, Injury, and Illness Handling

- **Pain vs. Soreness:** As stated in Chapter 4, pain is treated differently than soreness. Reports of pain require conservative adjustments (exercise substitution or rest) and clear warnings.
- **Illness:** If a user reports being sick, FitCore should suggest suspending intense training and focusing on hydration and rest until symptoms resolve.

## Sensitive Data Handling and Privacy Controls

Recovery data, especially when imported from wearables, often falls under the category of sensitive health data.

- **Privacy by Default:** Health data should never be shared publicly or used for generic advertising profiles.
- **Local-First Priority:** Adhering to Book 2, sensitive data should ideally reside on the local device, with cloud sync being optional or strictly encrypted.
- **User Consent:** Explicit, granular consent is required before importing data from external health platforms (e.g., Apple Health). Users must be able to revoke this access easily.

## Source/Confidence Explanations ("Why do you know this?")

Transparency builds trust. When FitCore makes a recovery recommendation, it must explain its reasoning.

- **UI Requirement:** Any AI recommendation based on recovery data should include a "Why" or "Sources" component.
- **Example:** "I suggest lowering your workout volume today. _Why? Because your Apple Watch reported only 5 hours of sleep, and you manually logged high stress yesterday._"

## Data Deletion and Export Expectations

Users own their recovery data.

- **Deletion:** Users must be able to delete specific recovery entries (e.g., a mistaken pain report) or wipe all wearable history easily from the settings menu.
- **Export:** Users should be able to export their data (including recovery logs) in a portable format (e.g., CSV/JSON), supporting the open-ecosystem philosophy.

## Open Questions

- What is the exact UX flow for presenting a medical escalation warning without being overly alarming or legally burdensome?
- Should FitCore automatically delete historical sensor data (e.g., minute-by-minute heart rate) after a certain period to save local storage, retaining only the daily summaries?
