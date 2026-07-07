# 02. FitCore Score and Readiness Insights

## The FitCore Score Concept

The FitCore Score is an aggregated representation of a user's overall trajectory and adherence to their goals. It is designed to provide a high-level summary, but it must **never be a mysterious number**. The score must be entirely explainable and transparent.

### Inputs for the FitCore Score

The FitCore score is derived from a combination of underlying metrics and behaviors, including:
*   Sleep (duration and quality)
*   Soreness (intensity and location)
*   Pain (reports and severity)
*   Fatigue (subjective check-ins)
*   Stress (subjective check-ins)
*   Workout load (volume, intensity, frequency)
*   Nutrition consistency (adherence to calorie and macro targets)
*   Bodyweight trend (alignment with current goals)
*   Recovery trend
*   Missed logs or stale data (which negatively impact confidence and potentially the score itself)

## Explainable Score Breakdowns

Users must be able to understand exactly what comprises their score. The app will provide detailed breakdowns for various sub-scores:

*   **FitCore Score:** The overall summary metric.
*   **Readiness Score:** A daily assessment of preparedness for training (primarily sleep, soreness, fatigue, stress).
*   **Recovery Score:** An assessment of how well the body is recovering from recent strain.
*   **Nutrition Consistency Score:** A measure of adherence to dietary targets over a given period.
*   **Training Consistency Score:** A measure of adherence to the planned workout schedule and volume.
*   **Progress Score (Future):** A measure of actual physiological progress (e.g., strength gains, favorable weight trends) toward the stated goal.

### Explanation Requirements

For every score (the main FitCore score and all sub-scores), the UI and AI must be able to explain:

1.  **What inputs contributed:** The specific metrics used in the calculation.
2.  **Which inputs helped:** The factors driving the score up (e.g., "Consistent protein intake").
3.  **Which inputs hurt:** The factors driving the score down (e.g., "High reported stress").
4.  **What data was missing:** Any lack of data that limits the score's accuracy.
5.  **What changed since the previous score:** The delta and its primary cause.
6.  **What the user can do next:** Actionable advice to improve the score.

## Safe User-Facing Wording

The language used to explain scores must be objective, supportive, and cautious. It must avoid medical claims or definitive causation.

**Examples of Safe Wording:**

*   "Your readiness score is lower today mainly because sleep and soreness are trending worse than your weekly average."
*   "This recovery score is limited because your daily check-in data has not been updated today."
*   "Your training load increased significantly this week while recovery markers declined, so FitCore is recommending a lighter session today."
*   "Your nutrition consistency score improved this week due to hitting your protein target 6 out of 7 days."

## Popup Behavior for Score Details

When a user interacts with a score (e.g., tapping the FitCore Score on the dashboard):

1.  A popup or sheet opens providing the detailed breakdown.
2.  The UI clearly visualizes the positive and negative contributing factors.
3.  The UI explicitly states if the score is limited by missing or stale data (e.g., displaying a warning icon and text like "Score confidence is low due to missing sleep data").
4.  The user is provided with actionable next steps or the option to log missing data directly from the popup.

## Boundaries and Limitations

It must be made explicitly clear to the user that **the score is a wellness and readiness estimate, not a medical diagnosis.**

The app should actively show when a score is limited. A score based on comprehensive, recent data should look visually distinct (e.g., solid colors, high confidence indicators) from a score based on sparse or stale data (e.g., muted colors, warning icons).
