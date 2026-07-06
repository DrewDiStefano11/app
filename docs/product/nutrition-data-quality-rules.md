# Nutrition Data Quality Rules

## Purpose

Define the standards for nutrition data integrity in FitCore. These rules prevent "fake precision," manage uncertain AI estimates, and ensure that coaching recommendations are based on reliable data.

## Product Rule Alignment

- **Improve Trust in Data:** Clearly distinguish between what we _know_ and what we _guess_.
- **Help User Decide What to Do Next:** Provide coaching advice that reflects the quality of the underlying data.
- **Explain What Changed:** Use data quality levels to explain why a recommendation was made (or withheld).

## Nutrition Data Quality Categories

Every nutrition entry must be tagged with one of these quality levels:

1.  **confirmed_precise:** Manual entry with known weights, verified barcode scans, or verified saved foods.
2.  **confirmed_estimated:** User-confirmed AI estimates or manual entries where weights were estimated.
3.  **user_corrected:** AI estimates that were edited by the user (High Confidence).
4.  **ai_estimated_unconfirmed:** Unprocessed camera or text AI logs (Medium/Low Confidence).
5.  **low_confidence_estimate:** AI logs with high uncertainty (e.g., blurry photos, vague text).
6.  **missing:** Identified gaps in the user's daily log (e.g., no breakfast logged by 11 AM).
7.  **conflicting:** Multiple entries for the same time period that don't match.

## Core Rules

### 1. No Fake Precision

FitCore will not show decimals for calories or grams unless the data source is `confirmed_precise` (e.g., a laboratory-verified food database entry). AI estimates should be rounded to the nearest 10 calories and 1g macro.

### 2. Totals vs. Recommendations

- **Daily Totals:** Can include `ai_estimated_unconfirmed` data to give the user a "rough idea" of their day.
- **Coaching Recommendations:** The Daily Decision Engine (DDE) must prioritize `confirmed` data. If >30% of daily calories are `ai_estimated_unconfirmed`, coaching advice must include a disclaimer: "Based on estimates."

### 3. Graphs & History

- Uncertain data (`ai_estimated_unconfirmed`, `low_confidence_estimate`) should be visually distinct in graphs (e.g., striped or semi-transparent bars).
- Clicking a "fuzzy" bar in a graph should prompt the user to confirm the underlying logs.

### 4. Handling Missing Data

- Missing meals should NEVER be treated as 0 calories.
- If a user has not logged a meal by their usual time, Jarvis should ask: "Did you have breakfast yet?" rather than assuming the user is in a calorie deficit.

### 5. Partial Day Logs

- If a user has only logged one meal, daily progress rings (Protein, Carbs, Fat) should show a "Partial Data" state rather than implying they are failing their targets.

### 6. Late-Night Meals

- Meals logged after 10 PM should be checked: "Is this a late snack or your first meal of tomorrow?" to prevent data pollution across days.

## Daily Decision Engine (DDE) Behavior

- **DDE Confidence Score:** Every DDE recommendation should calculate a confidence score based on the nutrition data quality.
- **Low Confidence Suppression:** If nutrition data quality is mostly `low_confidence_estimate` or `missing`, the DDE should suppress aggressive fat-loss or muscle-gain recommendations and instead focus on "Log your meals for better accuracy."

## Jarvis Behavior

- **Explain Uncertainty:** "Your protein intake looks low today, but I see two unconfirmed meal estimates. If those had protein, you might actually be on track."
- **Data Quality Nudges:** "You've used camera estimates for your last 3 meals. Taking a moment to confirm them will help me give you better advice."

## Future Implementation Checklist

- [ ] Define the `DataQualityLevel` enum in the codebase.
- [ ] Implement visual styles for "Uncertain" vs "Confirmed" data in graphs.
- [ ] Update the DDE to calculate and report its own confidence level.
- [ ] Build the "Missing Meal" detection logic.
- [ ] Add the "Partial Day" state to the Dashboard progress rings.

## Edge Cases

- **Imported Data:** Data from Apple Health/Google Fit should be treated as `confirmed_estimated` unless it includes high-fidelity metadata.
- **Deleted Logs:** Deleting an AI estimate should be tracked in the audit log to improve the AI's "hallucination" detection.
- **Bulk Confirm:** Allow users to "Mark all as confirmed" at the end of the day to quickly clean up history.
