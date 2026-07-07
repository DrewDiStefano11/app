# 02 - Sleep Logging and Sleep Intelligence

Sleep is a primary driver of recovery. FitCore aims to track not just the duration of sleep, but its quality, consistency, and impact on the user's readiness.

## Logging Sleep

FitCore supports multiple methods for acquiring sleep data:

1.  **Manual Logging:** The user inputs estimated sleep time and wake time, or simply a total duration.
2.  **Imported Data (Wearables/Health Apps):** Automated syncing from Apple Health, wearables (Fitbit, WHOOP, Apple Watch, future Oura/Garmin). See [Chapter 5](./05-wearables-health-integrations-and-sensor-data.md).
3.  **Conversational Logging (Jarvis):** The user can say, "I slept terribly last night, only about 4 hours," and the AI must parse this into structured sleep data.

## Sleep Metrics Tracked

Beyond simple duration, FitCore strives to build intelligence around:

- **Duration:** Total time asleep.
- **Quality:** Subjective user rating (e.g., Poor, Fair, Good, Excellent) or objective wearable scores (e.g., REM/Deep sleep proportions).
- **Consistency (Schedule):** Variations in bedtime and wake time. Irregular schedules negatively impact recovery even if total duration is adequate.
- **Interruptions:** Waking up during the night.
- **Naps:** Short sleep sessions during the day that contribute to total daily recovery but are tracked separately from the primary sleep period.

## Sleep Debt and Trends

FitCore calculates and interprets trends, focusing on the rolling average rather than isolated nights.

- **Sleep Debt:** If a user establishes a baseline need (e.g., 8 hours), consistently sleeping less accumulates sleep debt, which heavily influences the Readiness Score.
- **Trend Interpretation:** Jarvis should identify patterns. ("You've averaged 6 hours of sleep this week, which is 1.5 hours below your normal baseline.")

## Confidence Rules for Sleep Data

Sleep data follows strict confidence tracking:

- **High Confidence:** Direct sync from a validated wearable or explicit manual entry.
- **Medium Confidence:** Vague conversational input ("I didn't sleep much").
- **Low/Zero Confidence:** Missing data. FitCore must _never_ assume 8 hours of perfect sleep if data is missing.

If conflicting data exists (e.g., Apple Health says 8 hours, user manually logs 5 hours due to a baby waking them), the **user's explicit manual entry or correction always wins**.

## Impact on Readiness and Training

Sleep data directly feeds into the Readiness Score (Chapter 3) and influences training recommendations (Chapter 6):

- **Severe Sleep Restriction (< 5 hours):** Should trigger safety warnings for high-intensity training or heavy lifting due to increased injury risk and CNS fatigue. Recommendations should lean toward active recovery, mobility, or a rest day.
- **Moderate Sleep Debt:** May suggest reducing total workout volume or avoiding absolute failure.
- **Excellent Sleep:** Can contribute to recommendations for progression or PR attempts, assuming other recovery signals are green.

## Sleep Coaching Boundaries

Jarvis can provide sleep hygiene coaching based on data, but must adhere to safety and scope boundaries:

- **Allowed:** Suggesting consistent bedtimes, highlighting the link between late-night meals (Book 4) and poor sleep, or recommending wind-down routines.
- **Prohibited:** Diagnosing sleep disorders (e.g., Sleep Apnea, Insomnia). If chronic, severe sleep issues are detected, FitCore should recommend consulting a medical professional.

## Open Questions

- How exactly should sleep consistency (variability in bedtime) be weighted mathematically against total sleep duration in the readiness algorithm?
- How should we handle overlapping nap data and primary sleep data if a wearable syncs a nap as a main sleep session by mistake?
