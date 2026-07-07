# Data Model Philosophy

Status: `Planned`

This document defines how FitCore should think about data at the product level. It does not define final database tables, migrations, production APIs, or storage implementation.

## Data Philosophy Summary

FitCore should preserve useful raw data, track where data came from, label AI-generated or estimated values, and make important derived conclusions traceable.

The goal is not to store everything forever without judgment. The goal is to keep enough context that FitCore can explain what changed, why it matters, and what the user should do next without pretending uncertain data is certain.

## Core Data Principles

| Principle                                              | Product Rule                                                                                                          | Status    |
| :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :-------- |
| Preserve raw data when possible                        | Keep the original input or import reference when it may explain future differences.                                   | `Planned` |
| Never silently overwrite important user data           | Manual entries and accepted values should not disappear because AI or imports disagree.                               | `Planned` |
| Manual edits should create a correction trail          | Corrections should preserve original value, corrected value, time, source, and learning preference when practical.    | `Planned` |
| AI-generated data must be labeled                      | AI-created logs, estimates, summaries, and interpretations should be visibly distinct from user-confirmed facts.      | `Planned` |
| Estimated values need confidence levels                | Photo estimates, vague text logs, and inferred values should carry confidence or uncertainty.                         | `Planned` |
| Derived metrics should be traceable                    | Scores, trends, and recommendations should link back to the inputs that affected them.                                | `Planned` |
| Important data needs source/provenance                 | Training, nutrition, recovery, body, wearable, and sensitive data should preserve source information where practical. | `Planned` |
| Conflicting inputs should be visible or explainable    | FitCore should explain conflicts when they affect decisions.                                                          | `Planned` |
| Summaries should not destroy important detail          | A weekly summary should not erase the specific pain note or corrected meal that explains a recommendation.            | `Planned` |
| Deleted data should be handled intentionally           | Deletion should explain consequences for derived summaries, recommendations, and export.                              | `Planned` |
| User corrections should improve future recommendations | Accepted corrections should become learning signals when the user allows it.                                          | `Planned` |
| Data should be reusable across screens and engines     | A log should not be trapped in one screen if it matters elsewhere.                                                    | `Planned` |

## Data Source Types

| Source Type                  | What It Means                                            | Trust Level                                                    | Required Metadata                                                                       | Example                                                       |
| :--------------------------- | :------------------------------------------------------- | :------------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| Manual user entry            | The user entered the value directly.                     | High when specific; medium when vague.                         | Source type, created time, raw value, final accepted value.                             | User logs 185 lb for 5 reps.                                  |
| AI-assisted entry            | AI helped structure or create a log from user intent.    | Medium until confirmed; higher after correction or acceptance. | Source type, prompt/note reference, AI generated flag, confidence, accepted status.     | User says "log chicken and rice" and AI creates a meal draft. |
| Photo estimate               | AI estimates data from an image.                         | Medium or low unless confirmed.                                | Image reference, detected items, confidence, estimate, correction status.               | Meal photo estimated as 850 calories.                         |
| Voice/text assistant log     | Natural language input becomes a structured record.      | Medium until reviewed; depends on specificity.                 | Raw transcript/text, parsed values, source, confidence, accepted status.                | "Squat 225 for 5, felt knee pain."                            |
| Wearable import              | Data from a wearable or health platform.                 | Useful but not perfect.                                        | Provider, device, sync time, raw value, normalized value, imported timestamp.           | Imported sleep duration from a device.                        |
| Device sync                  | Data from connected equipment or sensors.                | Depends on device reliability.                                 | Device/provider, timestamp, raw payload or reference, normalized value.                 | Smart scale weight import.                                    |
| Third-party app import       | Data imported from another app or service.               | Depends on source and mapping quality.                         | Provider, import time, source record id/reference, mapping confidence.                  | Food log imported from a nutrition app.                       |
| System-generated calculation | FitCore calculates a value from stored inputs.           | High if inputs are complete; lower if inputs are estimated.    | Formula/version where practical, input references, calculation time.                    | Weekly training volume.                                       |
| AI-generated interpretation  | AI explains, summarizes, or recommends based on context. | Must show confidence and sources.                              | AI generated flag, source data used, confidence, timestamp, model/version if relevant.  | "Lower intensity today because soreness is high."             |
| User correction              | The user changes an estimated or existing value.         | High for accepted value; also a learning signal.               | Original value, corrected value, editor, time, reason/note, learn-from-correction flag. | User changes photo-estimated calories from 850 to 700.        |

## Provenance Metadata

FitCore should preserve the following source/provenance metadata when practical:

- Source type.
- Source detail.
- Created time.
- Edited time.
- Whether the value was user corrected.
- Whether the value was AI generated.
- Confidence score when estimated.
- Raw value.
- Normalized value.
- Final accepted value.
- Related note.
- Related image, audio, or import reference when applicable.

## Raw Value vs Normalized Value vs Derived Value

| Value Type       | Meaning                                                         | Example                                                                             |
| :--------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| Raw value        | Original user input or imported value.                          | User logs "about 200g chicken" as raw text.                                         |
| Normalized value | Cleaned value used by the app for calculations.                 | FitCore maps the text to a food item and macro estimate.                            |
| Derived value    | A calculated or interpreted result based on one or more inputs. | FitCore derives protein total, nutrition trend, and whether protein target was met. |

Raw values preserve truth. Normalized values make the product usable. Derived values explain meaning. FitCore should not confuse these layers.

## Manual Corrections

When a user corrects a value, FitCore should preserve:

- Original value.
- Corrected value.
- Who or what changed it.
- Time changed.
- Reason or note if provided.
- Whether future AI should learn from it.

Example:

A meal photo estimates 850 calories. The user corrects it to 700 calories. FitCore should not simply erase the 850 estimate. It should store that the original AI estimate was 850 and the accepted corrected value is 700.

## Confidence and Uncertainty

FitCore should treat confidence as product context, not decoration.

Examples:

- Barcode scan may be high confidence.
- Manual weighed food may be high confidence.
- Photo macro estimate may be medium or low confidence.
- Vague text like "big bowl of pasta" may be low confidence.
- Wearable sleep data may be useful but not perfect.
- Subjective soreness may be important even though it is self-reported.

The AI should be able to say:

- "This is estimated."
- "This is based on incomplete data."
- "This recommendation may change if you log sleep."
- "This macro estimate has low confidence."
- "Your soreness note is the main reason I adjusted the workout."

## Example: Meal Photo Macro Estimate

Status: `Planned`

A meal photo estimate should preserve:

- Image/source reference.
- Detected foods.
- Estimated calories.
- Estimated protein, carbs, and fat.
- Confidence level.
- User correction.
- Final accepted macros.
- Whether the estimate was used in daily totals.
- Whether the correction should improve future estimates.

Acceptance criteria for future implementation:

- The user can distinguish estimated macros from confirmed macros.
- Corrections do not erase the original estimate.
- Daily totals show whether low-confidence values are included.
- AI recommendations can explain when a meal estimate affected nutrition guidance.

## Example: Workout Set Data

Status: `Partial`

A workout set should preserve:

- Exercise name.
- Set number.
- Weight.
- Reps.
- RPE or RIR if available.
- Set type.
- Warmup, drop, failure, partial, or unilateral flag when applicable.
- Side-specific data when applicable.
- Pain flag.
- Soreness note.
- Substitution note.
- Rest time when available.
- Whether manually entered or AI-assisted.
- Link to workout session.
- Link to previous performance if used for recommendation.

## Example: Recovery Data

Status: `Partial`

Recovery data should preserve:

- Sleep duration.
- Sleep quality.
- Wearable sleep data if available.
- Soreness.
- Pain.
- Stress.
- Fatigue.
- Subjective check-in.
- Readiness score.
- AI interpretation.
- Source of each input.
- Confidence or completeness warning.

## Conflicting Data

FitCore should not hide conflicts. It should explain them when they affect recommendations.

Examples:

- Wearable says sleep was good, but the user says they feel terrible.
- AI estimates macros, then the user corrects them.
- Body weight spikes after high sodium or carbs.
- Exercise performance drops despite a good readiness score.
- User says knee pain exists, but the workout plan suggests squats.

Rule:

FitCore should not force one source to win silently. It should preserve the conflict, choose a cautious product behavior when needed, and explain the decision in the surfaces where it matters.

## Data Reuse Rule

Logged data should flow to every relevant area.

Examples:

- Meal logs should affect nutrition, body weight explanation, recovery, and AI daily plan.
- Workout logs should affect progress charts, readiness, muscle fatigue, and next workout recommendations.
- Pain notes should affect recovery, training safety, exercise selection, and AI warnings.
- Body weight logs should affect progress, nutrition interpretation, and goal tracking.
- Sleep should affect readiness, training intensity, and recovery recommendations.

## Data Deletion and Export

Status: `Planned`

FitCore should follow these principles:

- Full data export should exist.
- Full deletion should exist with confirmation.
- Deleting important data should explain consequences.
- Sensitive data deletion should be especially clear.
- Deletion should not leave misleading derived summaries behind.

This section is implementation-neutral. Future implementation should define exact storage, sync, deletion, and export mechanics separately.
