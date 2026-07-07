# Book 7 — Recovery, Sleep and Wearables

Book 7 defines how FitCore understands recovery, sleep, soreness, fatigue, stress, readiness, wearable data, sensor data, and recovery-aware decisions.

FitCore treats recovery as a connected decision system, not just a log. This book outlines how subjective user check-ins and objective sensor data combine to influence daily guidance, workout progression, and nutrition context.

## What This Book Owns

Book 7 owns the product-level requirements for:

- Recovery check-ins (soreness, pain, fatigue, stress).
- Sleep intelligence (duration, quality, trends).
- Readiness score philosophy.
- Wearable integrations (Apple Health, Apple Watch, Fitbit, WHOOP, etc.).
- Sensor data utilization (resting heart rate, HRV, etc.).
- Recovery-aware decision principles (how recovery affects training and nutrition).
- Recovery coaching safety boundaries and privacy rules.

## What This Book Does Not Own

Book 7 does not define:

- **General Data Architecture:** Data philosophy, local-first storage, AI memory, and general privacy architecture belong to [Book 2](../book-02-system-architecture/README.md).
- **Training Progression Details:** Exercise selection, volume logic, and workout progression belong to [Book 3](../book-03-training-system/README.md).
- **Nutrition Target Logic:** Macro estimation and body-weight feedback loops belong to [Book 4](../book-04-nutrition-system/README.md).
- **UI/UX:** Screen layout, dashboard cards, popup behavior, and mobile patterns belong to [Book 5](../book-05-ux-ui-and-user-experience/README.md).
- **Implementation Code:** Final database schemas, production APIs, component implementations, or exact algorithms.

## Chapters

| File                                                                                                         | Purpose                                                                                                                 |
| :----------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| [01-recovery-system-overview.md](./01-recovery-system-overview.md)                                           | Defines FitCore recovery, inputs, outputs, confidence model, and the relationship between subjective and wearable data. |
| [02-sleep-logging-and-sleep-intelligence.md](./02-sleep-logging-and-sleep-intelligence.md)                   | Defines sleep logging, sensor data, interpretation of sleep trends, data confidence, and coaching boundaries.           |
| [03-readiness-score-and-recovery-decisions.md](./03-readiness-score-and-recovery-decisions.md)               | Explores readiness score philosophy, handling missing data, and how readiness influences daily decisions.               |
| [04-check-ins-soreness-pain-fatigue-and-stress.md](./04-check-ins-soreness-pain-fatigue-and-stress.md)       | Defines subjective check-ins, soreness vs. pain, user corrections, and red-flag escalation rules.                       |
| [05-wearables-health-integrations-and-sensor-data.md](./05-wearables-health-integrations-and-sensor-data.md) | Covers Apple Health, Apple Watch, Fitbit, WHOOP/Noop, future integrations, data freshness, conflicts, and permissions.  |
| [06-recovery-aware-training-and-nutrition.md](./06-recovery-aware-training-and-nutrition.md)                 | Explains how recovery context modifies training volume/intensity and adjusts nutrition advice.                          |
| [07-recovery-coaching-safety-and-privacy.md](./07-recovery-coaching-safety-and-privacy.md)                   | Defines AI coaching boundaries, medical escalation, sensitive data handling, and privacy controls.                      |

## Cross-Book Dependencies

- **Book 2 (System Architecture):** Wearable imports and recovery logs must follow source tracking, confidence, and local-first storage rules.
- **Book 3 (Training System):** Recovery signals directly impact training recommendations, substitutions, and volume/intensity logic.
- **Book 4 (Nutrition System):** Sleep and fatigue can influence nutrition recommendations and coaching context.
- **Book 5 (UX/UI):** Dashboards, graphs, and AI explanations must present recovery data clearly, especially source and confidence levels.

## Implementation Status Notes

Use conservative status labels in Book 7.

| Status            | Meaning                                                                                       |
| :---------------- | :-------------------------------------------------------------------------------------------- |
| **Implemented**   | Use only when the repository clearly proves the feature is implemented.                       |
| **Partial**       | Some foundational behavior or UI exists, but full logic/integration is not complete.          |
| **Planned**       | Desired product behavior for future implementation.                                           |
| **Future**        | Speculative or dependent on major platform maturity (e.g., complex Garmin/Oura integrations). |
| **Deferred**      | Intentionally delayed until explicitly approved.                                              |
| **Open Question** | A specific rule, formula, or integration strategy requires a decision before implementation.  |

## Open Questions Summary

| Topic                  | Question                                                                                                           | Status         |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------- | :------------- |
| **Readiness Formula**  | How should resting heart rate, HRV, and subjective soreness be weighted into a single score?                       | Open Question  |
| **Wearable Syncing**   | Should background sync be supported for all devices, or only when the app is foregrounded?                         | Needs Decision |
| **Conflicting Data**   | When Apple Health and WHOOP report different sleep durations, how does the user set a global preference?           | Open Question  |
| **Medical Boundaries** | At what exact threshold of reported "pain" should AI coaching refuse to recommend any exercise for that body part? | Needs Decision |
