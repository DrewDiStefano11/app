# 01. Analytics, Insights, and Health Twin Overview

## Purpose of Analytics and Insights

The primary purpose of analytics and insights in FitCore is to turn disconnected logs into useful, actionable feedback. FitCore is not merely a data collection tool; it is an intelligence layer that connects training, nutrition, recovery, progress, health context, and AI to provide a holistic view of the user's journey.

Analytics should bridge the gap between *what* the user did and *why* it matters, ultimately guiding them toward their goals.

## Analytics Terms and Definitions

To ensure consistency in future code, UI labels, AI responses, and documentation, the following terms are defined in plain language:

*   **Metric:** A specific, measurable data point (e.g., total volume, sleep duration, daily calories).
*   **Raw Data:** The direct inputs provided by the user, sensors, or imports before any processing or aggregation (e.g., a single logged set of squats).
*   **Calculated Metric:** A value derived from raw data through mathematical operations (e.g., weekly average protein intake, estimated 1RM).
*   **Trend:** A recognizable pattern or direction in metrics over a specific period (e.g., a gradual increase in body weight over a month).
*   **Insight:** A meaningful observation drawn from metrics, trends, and context, often highlighting correlations or areas requiring attention (e.g., "Your sleep duration has decreased over the last 3 days while workout intensity has increased.").
*   **Recommendation:** A suggested action based on an insight, intended to improve outcomes or address an issue (e.g., "Consider prioritizing an earlier bedtime tonight to support recovery from this week's heavy training.").
*   **Score:** An aggregated, often weighted, numerical or categorical representation of a broader state (e.g., a Readiness Score summarizing sleep, soreness, and stress).
*   **Confidence:** A measure of reliability for an insight or recommendation, based on the volume, quality, and consistency of the underlying data.
*   **Stale Data:** Data that is too old to be considered relevant or accurate for current insights (e.g., a weigh-in from 3 weeks ago).
*   **Missing Data:** The absence of expected logs necessary for accurate calculations or insights (e.g., missing protein logs for the day).
*   **Conflicting Data:** Data points that contradict each other or typical patterns, requiring clarification (e.g., logging extremely high soreness alongside an unusually high readiness check-in).
*   **Source-Backed Insight:** An insight that can clearly trace its origin back to specific raw data, user logs, or calculated metrics, ensuring transparency.
*   **User-Corrected Value:** Data that has been manually adjusted by the user, overriding AI estimates or previous entries. These values carry high confidence.
*   **Health Twin Context:** The comprehensive, long-term, and personalized model of the user that informs insights, encompassing history, preferences, goals, and health constraints.

## Data Distinctions

It is crucial to distinguish between the different types of information presented to the user:

*   **Raw Data:** The unvarnished facts (e.g., "You lifted 100 lbs for 10 reps").
*   **Calculated Metrics:** Objective summaries (e.g., "Your total volume for this session was 5,000 lbs").
*   **AI-Generated Insights:** Observations and patterns recognized by the system (e.g., "You consistently lift heavier on days you log 8+ hours of sleep").
*   **User-Facing Recommendations:** Actionable advice derived from insights (e.g., "Aim for 8 hours of sleep tonight to maximize your strength output tomorrow").

## Major Insight Categories

Insights are grouped into specific categories to organize feedback and allow users to focus on relevant areas:

*   **Training Insights:** Observations regarding workout volume, intensity, exercise performance, and strength progression.
*   **Recovery Insights:** Observations based on recovery logs, rest days, and readiness markers.
*   **Readiness Insights:** Daily assessments of preparedness for training, combining sleep, soreness, and stress data.
*   **Nutrition Insights:** Observations on calorie intake, macronutrient adherence, and meal timing.
*   **Bodyweight/Body Composition Insights:** Trends and patterns related to weigh-ins and body measurements.
*   **Consistency Insights:** Observations on habit adherence, workout frequency, and logging streaks.
*   **Sleep Insights:** Patterns relating sleep duration and quality to other metrics (e.g., training performance or recovery).
*   **Soreness and Pain Insights:** Tracking the frequency, duration, and intensity of reported soreness or pain, particularly in relation to specific exercises or volume.
*   **Habit Insights:** Observations on lifestyle factors and their correlation with fitness goals.
*   **Goal-Progress Insights:** High-level tracking of progress toward primary objectives (e.g., "muscle gain," "fat loss").
*   **Risk/Friction Insights:** Early warnings of potential issues, such as overtraining, severe under-eating, or escalating pain.
*   **AI Coach Summary Insights:** Synthesized overviews provided by the Jarvis assistant, summarizing key takeaways across multiple categories.

Insights must be **useful, actionable, and explainable**. They should not be generic motivational messages (e.g., avoiding empty phrases like "Keep up the good work!").

## Metric Taxonomy

FitCore utilizes several major metric groups to support these insight categories:

*   **Training Metrics:** Volume, intensity, 1RM estimates, sets, reps, rest times. Used for progression and fatigue tracking.
*   **Nutrition Metrics:** Calories, protein, carbs, fats, hydration, meal timing. Used for adherence and energy availability insights.
*   **Recovery Metrics:** HRV (future wearable integration), resting heart rate, active recovery sessions. Used for overall physiological status.
*   **Readiness Metrics:** Subjective check-in scores (energy, stress, motivation). Used to adjust daily training expectations.
*   **Body Metrics:** Weight, body fat percentage estimates, measurements. Used for long-term goal tracking.
*   **Sleep Metrics:** Duration, perceived quality, wake events. Used to contextualize recovery and training performance.
*   **Pain/Soreness Metrics:** Location, intensity (e.g., 1-10 scale), duration. Used to identify potential injury risks or overtraining.
*   **Habit and Consistency Metrics:** Logging streaks, target hit rates (e.g., hitting protein goal 5 days/week). Used for behavioral insights.
*   **Health-Context Metrics:** (From Book 8) Known conditions, allergies, or cycle tracking (where applicable and permitted). Used to provide necessary boundaries for insights.
*   **AI/Context Metrics:** Confidence scores, data freshness, user feedback (helpful/not helpful). Used to refine the AI's understanding and recommendation quality.

## Non-Goals

To maintain focus and safety, the following are explicit non-goals for Book 9:

*   **Implementing the analytics engine:** This documentation is for planning; it does not involve writing the code to perform these calculations.
*   **Making medical diagnoses:** FitCore will *never* diagnose illnesses, injuries, or medical conditions based on analytics.
*   **Presenting uncertain data as fact:** Insights derived from low-confidence or sparse data must be clearly labeled as such.
*   **Hiding data sources:** Users must always be able to see the data that led to an insight ("why do you know this?").
*   **Replacing professional medical or coaching judgment:** FitCore provides data-driven support, not definitive medical or professional athletic directives.
