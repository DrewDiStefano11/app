# 03. Progress Analytics and Trend Detection

## Progress Analytics Overview

FitCore tracks progress across multiple domains to provide a comprehensive view of the user's journey. Progress analytics should not look at one metric in isolation, but rather how metrics interact over time across training, nutrition, recovery, and body metrics.

Examples of tracked progress include:
*   Strength progression (e.g., estimated 1RM trends, performance on key lifts)
*   Volume progression (e.g., total weekly tonnage per muscle group)
*   Workout consistency (e.g., adherence to planned frequency)
*   Exercise performance trends (e.g., rep continuity at a given weight)
*   Bodyweight trend (e.g., moving averages smoothing out daily fluctuations)
*   Calorie and protein consistency (e.g., percentage of days hitting targets)
*   Soreness trends (e.g., is soreness decreasing as adaptation occurs?)
*   Pain recurrence (e.g., identifying patterns of pain associated with specific movements)
*   Sleep consistency (e.g., maintaining regular sleep/wake times)
*   Recovery trend (e.g., improving readiness scores over consecutive training blocks)

## Pattern Recognition and Confidence

The system uses pattern recognition over time to identify meaningful trends. Crucially, FitCore should **avoid overreacting to one unusual day**. A single bad night of sleep or one missed meal does not constitute a negative trend.

*   **Confidence Levels:** Trends must be associated with confidence levels. A trend observed over 4 weeks with daily data has high confidence. A trend observed over 1 week with sparse data has low confidence and should not trigger major insights or recommendations.
*   **User Corrections:** When a user corrects an underlying value (e.g., adjusting an AI-estimated meal macro), the system must immediately recalculate and update the associated trends.
*   **Missing Data vs. Regression:** Analytics must distinguish between actual regression (e.g., performance dropping despite consistent logging) and a lack of data (e.g., performance appearing to drop because the user didn't log their heaviest sets).

## Plateau Detection (Future Planning)

Future phases will implement plateau detection to help users when progress stalls. This applies across multiple areas:
*   Strength plateau (failure to increase load or reps over several weeks)
*   Bodyweight plateau (weight failing to move in the desired direction despite adherence)
*   Nutrition adherence plateau (struggling to maintain consistency after an initial period of success)
*   Recovery plateau (chronic low readiness scores despite adequate rest days)
*   Consistency plateau (workout frequency stabilizing below the target)

### Requirements for Plateau Detection

FitCore must avoid labeling a plateau too early. A true plateau requires sustained, high-confidence data. Plateau detection must consider the full context before firing an insight:
*   Missing data (are they actually stalled, or just not logging?)
*   Inconsistent logging (are the logs reliable enough to declare a plateau?)
*   Sleep/recovery issues (is poor recovery masking strength gains?)
*   Training volume changes (did they recently change programs, causing a temporary dip?)
*   Nutrition consistency (are they eating enough to support the desired progress?)
*   Injury or pain limitations (is pain preventing them from pushing harder?)

## Correlation Without Causation

Analytics should identify correlations but must **avoid overclaiming causation**. The system observes relationships; it does not definitively prove one thing caused another.

**Safe Examples (Correlation):**
*   "Your lower-energy workouts often happen after shorter sleep nights."
*   "Your soreness tends to be higher after higher-volume leg days."
*   "Your weight trend appears more stable when protein targets are met more consistently."

**Unsafe Examples (Causation - Avoid These):**
*   "Poor sleep caused your bad workout."
*   "This specific food caused your weight gain."
*   "This soreness means you are injured."

## Goal Change Handling

User goals change over time (e.g., moving from a bulk to a cut). Analytics must handle these transitions gracefully:

*   **Preserve History:** Previous insights generated under an old goal should not be automatically erased, but they should be archived or contextualized.
*   **Adapt Recommendations:** Current recommendations must immediately adapt to the new goal.
*   **Reinterpret Trends:** Trends should be reinterpreted in the new context where appropriate. A weight gain trend is positive during a bulk, but negative during a cut.
*   **Contextualize Insights:** FitCore should clearly show when a historical insight was based on an older goal (e.g., "Insight generated during previous 'Muscle Gain' phase").

**Examples of Goal Changes:**
*   Bulk to cut
*   Fat loss to maintenance
*   Strength focus to injury recovery support
*   General health to sport performance
