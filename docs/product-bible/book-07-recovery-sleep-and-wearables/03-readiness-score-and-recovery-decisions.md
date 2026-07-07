# 03 - Readiness Score and Recovery Decisions

The Readiness Score is FitCore’s synthesis of all available recovery data into a single, actionable metric. It represents the user's capacity to take on physical strain on a given day.

## Purpose of the Readiness Score

The Readiness Score is not meant to be a medical diagnostic tool. Its purposes are:

1.  **Quick Status Check:** To give the user an immediate understanding of their recovered state upon opening the app.
2.  **Decision Anchor:** To serve as a baseline variable for AI coaching recommendations regarding training volume, intensity, and nutrition.
3.  **Trend Identification:** To help users visualize the long-term impact of their lifestyle habits on their physical capacity.

## Inputs to Readiness

The score is calculated from a weighted combination of:

- **Sleep Data:** Duration, quality, debt, and consistency (Chapter 2).
- **Subjective Check-ins:** Soreness, fatigue, stress, mood, and perceived recovery (Chapter 4).
- **Objective Sensor Data:** Resting Heart Rate (RHR), Heart Rate Variability (HRV), and temperature trends (Chapter 5).
- **Recent Training Load:** Volume and intensity of workouts over the past 24-72 hours (from Book 3).
- **Nutrition Context:** Caloric deficit/surplus and macro adherence (from Book 4).

## Suggested Scoring Philosophy

While the exact mathematical formula is an implementation detail (and currently an Open Question), the philosophy must adhere to these rules:

- **Subjective Override:** A strong negative subjective signal (e.g., "I feel exhausted and sick") must heavily penalize the score, even if objective sensor data looks fine.
- **Rolling Baseline:** Sensor data (like HRV) must be compared against the user's personal rolling baseline (e.g., a 14-day or 30-day average), not against absolute population norms.
- **Graceful Degradation:** If data is missing (e.g., no wearable worn, no check-in logged), the score should trend towards a neutral baseline rather than penalizing the user heavily or artificially inflating the score. The UI must clearly indicate that the score is based on incomplete data.

## Missing and Stale Data Handling

- **Stale Data:** Sensor data or check-ins older than 24 hours lose relevance rapidly. The Readiness algorithm must decay the weight of old data.
- **Missing Data:** If no data is available for a day, the Readiness Score should either not be shown or shown as a neutral estimate with a low-confidence warning (see Book 2 for confidence UI rules).

## Confidence and Source Explanation

The Readiness Score UI (defined in Book 5) must be transparent. The user should always be able to see _why_ their score is what it is.

- **"Why this score?"** The UI must list the primary contributing factors (e.g., "Your score is low because your sleep was 2 hours below average and you reported high muscular fatigue yesterday.").
- **Data Provenance:** The UI should indicate where the data came from (e.g., Apple Health for sleep, Manual Entry for soreness).

## Influence on Decisions

The Readiness Score directly influences daily guidance:

- **High Readiness:** Suggests progressing in workouts, attempting PRs, or handling a higher training volume.
- **Moderate Readiness:** Suggests maintaining the current plan or making minor adjustments based on specific local soreness.
- **Low Readiness:** Strongly suggests reducing workout volume, shifting to active recovery, or taking a rest day.

## Rule: Do Not Overreact

FitCore must not drastically alter a long-term training plan based on a single data point. One night of poor sleep should prompt a slight modification (e.g., "Take it easy today"), not a complete abandonment of the training block. Trends matter more than isolated events.

## Open Questions

- What is the specific decay rate for stale subjective data? (e.g., If I report severe fatigue on Monday morning, how does that affect Tuesday morning if I don't provide a new update?)
- What is the exact weighting algorithm for combining HRV, Sleep Debt, and Subjective Fatigue?
