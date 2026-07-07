# Training Safety And Injury Awareness

## Purpose

FitCore should help users train intelligently when soreness, pain, fatigue, or injury limitations are present.

FitCore should:

- Distinguish normal training soreness from possible pain/injury signals when possible.
- Ask for more context when needed.
- Adjust recommendations when pain is logged.
- Suggest safer alternatives when appropriate.
- Recommend appropriate medical care for concerning symptoms.
- Avoid encouraging users to push through sharp or worsening pain.

This is product-level safety documentation. It does not give medical advice or diagnose conditions.

Status: Planned.

## Safety Principles

- User-reported pain should be taken seriously.
- Pain should override generic progression.
- Sharp pain, worsening pain, instability, swelling, numbness, or major loss of function should trigger caution.
- AI should not diagnose.
- AI should recommend medical evaluation when symptoms are concerning.
- Soreness, discomfort, fatigue, and injury pain should not all be treated the same.
- The user remains in control.

## Signal Types

| Signal                    | Example                                             | Training Impact                                              | AI Response                                             |
| :------------------------ | :-------------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------ |
| Normal soreness           | Mild quad soreness after leg day.                   | May keep plan or reduce volume slightly.                     | Acknowledge, monitor, avoid over-warning.               |
| High soreness             | Severe soreness limiting normal movement.           | Consider reducing volume/intensity or training another area. | Suggest conservative adjustment and ask context.        |
| Sharp pain                | Sharp shoulder pain during bench.                   | Stop or modify the movement; avoid progression.              | Caution, suggest safer options, avoid diagnosis.        |
| Joint pain                | Knee pain during squats.                            | Prefer pain-free alternatives or reduced range/load.         | Ask location/severity and explain adjustment.           |
| Swelling                  | Swollen ankle after training.                       | Trigger caution and avoid loading affected area.             | Recommend appropriate medical care if concerning.       |
| Instability               | Knee feels like it may give out.                    | Avoid challenging load or unstable movement.                 | Strong caution and professional evaluation suggestion.  |
| Fatigue                   | User feels drained before workout.                  | Reduce intensity, volume, or failure work.                   | Suggest lower-aggression plan.                          |
| Poor sleep                | Four hours of sleep before heavy day.               | Lower load target or avoid max-effort attempts.              | Explain sleep/readiness effect.                         |
| Low motivation            | User feels unmotivated but not physically limited.  | Consider shorter minimum effective workout.                  | Offer smaller action without shame.                     |
| Form breakdown            | Reps slow and technique degrades.                   | Stop set, reduce load, or change movement.                   | Suggest form-first adjustment.                          |
| Repeated performance drop | Three sessions below expected performance.          | Consider recovery issue, deload, or plan review.             | Explain trend and recommend review.                     |
| Post-injury limitation    | User avoids overhead pressing after shoulder issue. | Modify exercise selection and progression.                   | Respect user-controlled limitation and explain changes. |

Status: Planned.

## Pain Logging

Useful pain fields may include:

- Location.
- Side.
- Severity.
- Type.
- Exercise/set where it occurred.
- Whether it changed the workout.
- Whether it stopped the workout.
- Whether it is new or recurring.
- Whether swelling/instability is present.
- User note.

This should remain implementation-neutral until the data model is ready.

Status: Planned.

## Soreness Vs Pain

- Soreness can inform recovery and volume.
- Pain can inform safety and substitutions.
- Sharp pain should not be treated as normal soreness.
- Delayed soreness should affect volume/intensity recommendations.
- Joint pain should trigger more caution than muscle soreness.
- User wording matters.

Status: Planned.

## Training Adjustment Examples

- Knee pain after squats may suggest avoiding heavy squats and using pain-free alternatives.
- Shoulder pain during pressing may suggest reducing load, changing range of motion, substituting exercises, or ending the movement.
- High soreness may suggest reducing volume or switching muscle groups.
- Poor sleep may suggest reducing intensity or avoiding failure.
- Fatigue with repeated performance drops may suggest deload or recovery focus.

These examples are product behavior examples, not medical advice.

## Red-Flag Style Caution

FitCore should not create a medical diagnostic checklist unless a future medically reviewed product decision approves one.

At the product level, FitCore should show caution around symptoms such as:

- Severe pain.
- Sudden swelling.
- Instability.
- Numbness/tingling.
- Inability to bear weight.
- Chest pain.
- Fainting.
- Shortness of breath beyond expected exertion.
- Symptoms that worsen or do not improve.

FitCore should recommend appropriate medical care when symptoms look concerning and should avoid diagnosis.

Status: Planned.

## Injury Limitations And Exercise Selection

- User may have injury limitations.
- Injury limitations should affect exercise suggestions.
- The app should not permanently ban exercises unless the user chooses that.
- AI should explain when a limitation changes a workout.
- Injury context should be user-controlled memory.
- Sensitive injury/medical data should follow Book 2 privacy and memory principles.

Status: Planned.

## Training Through Pain Rule

FitCore should not encourage pushing through sharp, worsening, or concerning pain.

If the user chooses to continue, the app should provide safer adjustment options such as:

- Reducing load.
- Reducing range of motion.
- Substituting exercise.
- Stopping the movement.
- Seeking professional evaluation when appropriate.

The AI should avoid certainty and avoid diagnosis.

Status: Planned.

## Workout Safety Prompts

Possible prompt moments:

- When pain is logged during a set.
- When the user marks failure repeatedly.
- When performance drops sharply.
- When soreness is high before workout.
- When sleep/readiness is low.
- When an injury limitation conflicts with planned workout.
- When a user note mentions pain, swelling, instability, dizziness, or other concerning symptoms.

Status: Planned.

## Post-Workout Safety Routing

Pain/soreness/fatigue notes in the finish summary should route to recovery/readiness/training systems.

Examples:

- A note like "knee hurt during squats" should affect future lower-body recommendations.
- A note like "felt exhausted and weak" should affect readiness interpretation.
- A note like "sharp shoulder pain on bench" should trigger caution next pressing session.

These notes should not disappear into a static summary.

Status: Planned.

## Training Safety Anti-Patterns To Avoid

- Ignoring pain because the workout plan says to continue.
- Treating sharp pain as normal soreness.
- Diagnosing medical conditions.
- Hiding why exercises were changed.
- Recommending PR attempts when readiness is poor.
- Using old injury data without confirming current relevance.
- Making the user repeatedly explain the same limitation.
- Storing sensitive injury data without user control.
- Over-warning for every normal soreness note.
- Under-warning for serious symptoms.

## Safety Acceptance Criteria

- Docs distinguish soreness, fatigue, discomfort, and pain.
- Docs require pain to affect recommendations.
- Docs avoid medical diagnosis.
- Docs require caution for concerning symptoms.
- Docs connect safety notes to future recommendations.
- Docs connect injury limitations to privacy/memory principles.
