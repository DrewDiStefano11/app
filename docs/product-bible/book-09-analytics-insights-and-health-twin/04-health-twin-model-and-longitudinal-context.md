# 04. Health Twin Model and Longitudinal Context

## The Health Twin Concept

The Health Twin is a long-term, explainable model of the user. It is a digital representation encompassing their training history, recovery patterns, nutritional adherence, body metrics, symptoms, injuries, preferences, and relevant health context.

Unlike short-term analytics that only look at the past 7 days, the Health Twin builds a longitudinal understanding that improves over time as the user logs more data. It serves as the foundational context for all AI-driven insights and coaching.

## Timeline and Event Modeling

The Health Twin is built upon a timeline-based model of events. It contextualizes current behavior against a history of:
*   Workouts (volume, intensity, exercise selection)
*   Meals (macros, timing, adherence)
*   Weigh-ins (body composition trends)
*   Check-ins (readiness, fatigue, stress)
*   Injuries (onset, recovery duration, affected movements)
*   Pain notes (frequency, triggers)
*   Soreness notes (duration, intensity)
*   Sleep changes (periods of insomnia, shift work, etc.)
*   Stress changes (high-stress life events)
*   Medication or health context (where applicable, explicitly permitted, and within safety boundaries defined in Book 8)

## Editability and Provenance

The Health Twin must be fully transparent, editable, and source-backed.
*   The user must be able to view the data forming the model.
*   Outdated, incorrect, or user-deleted information must not continue influencing AI recommendations. If a user deletes an old injury log, the Health Twin must "forget" that constraint when generating new workout plans.
*   Health Twin context supports future personalization without creating unsafe medical claims. It uses history to guide fitness decisions, not to diagnose.

## The "No Wasted Data" Principle

A core tenet of FitCore's architecture is that **no logged data should be wasted.** Data should not become trapped on a single screen or isolated feature.

*   Logged data must be utilized where appropriate across dashboards, graphs, summaries, AI context, and recommendations.
*   Qualitative data such as workout notes, meal notes, check-in notes, pain notes, soreness notes, fatigue notes, and recovery notes must transfer into relevant analytics and influence the Health Twin.
*   FitCore should avoid duplicate or disconnected metrics that confuse the user. For example, if a user logs severe fatigue in a check-in, that data should be visible in the recovery dashboard, inform the daily FitCore score, and be referenced by the AI coach during workout planning.

## Goal-Aligned Analytics

The Health Twin interprets data through the lens of the user's current goal. The same data may be interpreted differently depending on the objective.

Supported goals include:
*   Muscle gain (bulk)
*   Fat loss (cut)
*   Strength gain
*   Recomposition
*   General health
*   Injury recovery support
*   Sport performance
*   Habit consistency
*   Maintenance

**Example:**
A small, consistent weight gain of 0.5 lbs per week over a month.
*   **During a muscle gain phase:** The analytics interpret this positively, confirming the caloric surplus is working as intended.
*   **During a strength focus phase:** The analytics interpret this neutrally, noting the increase but prioritizing performance metrics.
*   **During a fat-loss phase:** The analytics interpret this as a negative trend, generating an insight suggesting a review of nutrition adherence or energy expenditure.
