# 01 - Recovery System Overview

FitCore treats recovery not as a passive log of rest days, but as an active decision layer. The recovery system synthesizes subjective user feelings and objective sensor data to adjust daily guidance.

## Definition of FitCore Recovery

Recovery in FitCore is the ongoing measurement of the user's physical and mental readiness to perform. It encompasses sleep, muscular fatigue, nervous system stress, soreness, pain, and general lifestyle factors.

The goal is not just to display a graph of "hours slept," but to answer: _Given your current state, how should your training and nutrition adapt today?_

## Recovery as a Decision Layer

Recovery acts as a modifier on top of established training plans (Book 3) and nutrition targets (Book 4).

- It does not replace a training program; it modulates it (e.g., suggesting a deload or substituting an exercise if a specific muscle is excessively sore).
- It contextualizes nutrition (e.g., acknowledging increased fatigue when interpreting a missed meal).

## Inputs to Recovery

The system accepts inputs from multiple sources, characterized by their confidence level:

| Input Category              | Examples                                                                                    | Source Types                                    |
| :-------------------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------- |
| **Subjective Check-ins**    | Soreness, fatigue, stress, mood, pain.                                                      | User (Manual, Verified, Voice/Text via Jarvis). |
| **Sleep Data**              | Duration, quality, interruptions, schedule consistency.                                     | User (Manual), Wearable, Apple Health.          |
| **Physiological Sensors**   | Resting Heart Rate (RHR), Heart Rate Variability (HRV), respiratory rate, skin temperature. | Wearable, Apple Health.                         |
| **Training Load**           | Volume, intensity (RPE), session frequency.                                                 | Computed from FitCore Workout Logs (Book 3).    |
| **Environmental/Lifestyle** | Travel, illness, alcohol intake, hydration.                                                 | User (Manual, Voice/Text via Jarvis).           |

## Outputs Influenced by Recovery

Recovery data drives actionable outputs:

- **Daily Briefing:** Explaining _why_ the user feels a certain way based on recent data.
- **Readiness Score:** A synthesis of inputs to provide a quick snapshot of capability.
- **Workout Modifications:** Proposing reduced volume, lower intensity, or rest days.
- **AI Coaching Focus:** Jarvis emphasizing mobility, hydration, or sleep hygiene based on identified deficits.

## Subjective vs. Objective Data

FitCore values both subjective and objective data, recognizing that wearables are not perfect and human perception is essential.

- **User overrides Wearable:** If a wearable reports excellent recovery, but the user manually logs "severe fatigue" and "high stress," the subjective check-in takes precedence for immediate training decisions.
- **Contextualizing Sensors:** Subjective check-ins help explain objective anomalies (e.g., a low HRV might be explained by a user logging "drank alcohol last night").

## Recovery Confidence Model

Following the principles in Book 2, all recovery data must track its source and confidence.

| Data Source                                     | Confidence Level   | Handling Rules                                                                                |
| :---------------------------------------------- | :----------------- | :-------------------------------------------------------------------------------------------- |
| **Manual User Entry (Explicit Check-in)**       | High (1.0)         | Direct impact on readiness and decisions.                                                     |
| **Verified Wearable Data (Direct Integration)** | High (0.9 - 1.0)   | Strong influence on readiness, unless contradicted by user.                                   |
| **Inferred from Unstructured Notes**            | Medium (0.5 - 0.8) | Requires user confirmation for major training changes.                                        |
| **Stale/Missing Data**                          | Low (0.0 - 0.3)    | System must degrade gracefully; do not assume "fully recovered" just because data is missing. |

## Open Questions

- **Weighting Subjective vs Objective:** What is the specific mathematical decay of objective sensor data when contradicted by a strong subjective signal?
- **Data Expiration:** How long does a "severe soreness" check-in remain active if not explicitly updated by the user?
