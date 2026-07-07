# Product Scope And Non-Goals

## Scope Rule

FitCore can include life data only when it meaningfully affects health, performance, recovery, longevity, stress, decision-making, or quality of life.

The app can grow far beyond traditional fitness tracking, but only when the data connects back to useful health or life intelligence.

## In Scope

| Area                      | In Scope When                                                                                                    |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| Training                  | It affects strength, endurance, skill, injury risk, readiness, goals, or long-term performance.                  |
| Nutrition                 | It affects energy, body composition, recovery, biomarkers, adherence, cravings, or health goals.                 |
| Recovery and sleep        | It affects readiness, fatigue, stress, illness, performance, or health risk.                                     |
| Wearables and sensors     | They provide reliable context for metrics, recommendations, alerts, or trend detection.                          |
| Lifestyle                 | It explains stress, fatigue, adherence, recovery, decision load, or health behavior.                             |
| Work and calendar         | It affects training time, stress, sleep, travel, fatigue, or recovery planning.                                  |
| Mental and cognitive data | It affects motivation, focus, decision fatigue, stress, or behavior change.                                      |
| Medical data              | It informs safety, trend awareness, training/recovery context, and professional-care prompts without diagnosing. |
| Analytics                 | It explains trends, uncertainty, and next actions rather than presenting decorative charts.                      |
| AI                        | It uses evidence, confidence, source data, and user control.                                                     |

## Out Of Scope By Default

| Area                               | Reason                                                                                           |
| :--------------------------------- | :----------------------------------------------------------------------------------------------- |
| Generic social feeds               | Distracts from the personal operating system and creates moderation/product complexity.          |
| Leaderboards and public challenges | Can encourage unsafe comparison and ego-driven training.                                         |
| Generic content libraries          | High maintenance and low personalization unless tied to user data.                               |
| Medical diagnosis                  | FitCore may inform and recommend professional care, but must not replace clinicians.             |
| Isolated productivity tools        | Only in scope when they affect health, stress, recovery, or decision-making.                     |
| Isolated finance tracking          | Only in scope if explicitly connected to fitness, health, nutrition, or stress costs.            |
| Entertainment-only journaling      | Journaling is in scope when it informs mental wellbeing, stress, recovery, or behavior patterns. |

## Deferred Until Explicit Approval

These features may remain in the backlog but should not be implemented until the user explicitly approves them:

- Coach/friend sharing
- Social sharing/community features
- Community feed
- Leaderboards
- Family health dashboard
- Smart rest timer
- Pet ownership/caregiving tracking
- Sexual health tracking
- Anonymous similar-user comparisons
- Sport-specific skill tracking
- Competition history
- Smart clothing
- AR glasses
- Brain-computer interfaces
- Robotics/home gym robots
- AI marketplace

## Medical Safety Boundary

Medical data may inform recovery, training, and insight context, but FitCore must:

- Avoid diagnosis.
- Avoid claiming to replace professional medical care.
- Identify concerning patterns as "consider seeking care" rather than certainty.
- Preserve source documents and structured interpretations separately.
- Show confidence and uncertainty.
- Allow users to edit AI-extracted medical data.
- Treat emergency or red-flag workflows as safety-critical.

## Docs-Only Boundary

Book 1 is a planning artifact. It can define future behavior, but it must not implement:

- UI components
- App state changes
- APIs
- Storage migrations
- AI calls
- Test code
- Generated routes
- Build configuration
