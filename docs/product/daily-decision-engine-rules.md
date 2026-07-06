# Daily Decision Engine Rules

## Purpose

The Daily Decision Engine is the core intelligence layer of FitCore. Its goal is to synthesize disparate data points (training, nutrition, recovery) into actionable, daily decisions that reduce user cognitive load and drive progress.

## Product Rule Alignment

- **Reduce Friction:** Decisions should be clear and one-tap where possible.
- **Data Trust:** Every decision must cite its source (e.g., "Based on your high soreness today...").
- **Connectivity:** Decisions must bridge domains (e.g., "Eat more carbs because you have a heavy leg session tomorrow").

## What FitCore Decides Daily

1.  **Training Volume:** Should today be a heavy session, a light session, or a rest day?
2.  **Specific Focus:** What muscle group or movement pattern is prioritized?
3.  **Intensity Adjustment:** Should the user push for a PR or focus on technique?
4.  **Nutrition Targets:** How should macros be adjusted based on today's and tomorrow's activity?
5.  **Recovery Priority:** Is sleep, hydration, or active recovery the primary "missing link"?
6.  **The "One Thing":** One clear, specific action to improve tomorrow's readiness.

## Required Input Signals

- **Training logs:** Volume (sets/reps), intensity (RPE/Weight).
- **Nutrition logs:** Total calories, macro balance (Protein/Carbs/Fat).
- **Bodyweight:** 7-day trend vs. Goal.
- **Recovery Signals:** Soreness, tiredness, sleep quality (from check-ins and notes).
- **Progress Trends:** Strength trends, body composition changes.

## Trust & Confidence Rules

- **High-Confidence Only:** FitCore should not make strong recommendations from low-confidence or unconfirmed data (e.g., unconfirmed AI estimates).
- **Transparency:** If data is missing or low-confidence, the engine must state: "Data confidence is low; please confirm your logs for a better recommendation."
- **User is Boss:** Recommendations can always be overridden. User overrides are high-signal data for future decisions.

## Decision Priority Order

1.  **Safety/Injury Prevention:** (e.g., High soreness/low sleep -> Forced deload).
2.  **Adherence to Goal:** (e.g., Weight trend mismatch -> Calorie adjustment).
3.  **Performance Optimization:** (e.g., Heavy training day tomorrow -> Higher carbs today).
4.  **Efficiency:** (e.g., Consolidating movements based on equipment availability).

## Example Daily Outputs

### Normal Training Day

> "You're well-recovered. Today is Push Day. Target: 10% more volume on Bench Press to stay on trend."

### Deload/Recovery Day

> "Bodyweight is down and soreness is high. Today is a forced rest day. Prioritize hydration and 8+ hours of sleep."

### High Soreness Day

> "Leg soreness is peak. Switch today's Squat session for Upper Body or Light Cardio to allow recovery."

### Under-eating Day

> "You're 500kcal below target for the last 2 days. Strength might dip today. Increase carbs by 50g before training."

### Weight Trend Mismatch

> "Weight is static despite a 2500kcal target. Increasing daily target to 2700kcal to support your muscle gain goal."

### Low-Confidence Data Day

> "I see a meal estimate from a photo that hasn't been confirmed. Please confirm your macros so I can adjust today's targets."

### One Clear Action

> "One thing for tomorrow: Log your sleep quality. We need more data to optimize your recovery score."

## Guardrails

- **No Medical Advice:** Do not diagnose pain or injuries. Refer to "soreness" or "fatigue."
- **Sustainable Changes:** Do not suggest calorie drops > 500kcal or increases > 500kcal in a single step.
- **Consistency over Perfection:** Prioritize keeping the user logging over absolute accuracy.

## Future Implementation Checklist

- [ ] Implement `RecoverySignal` extraction from notes.
- [ ] Build the `DecisionAggregator` to weight signals.
- [ ] Create UI components for "Daily Recommendation" tiles.
- [ ] Add "Why?" drill-downs for every recommendation.
- [ ] Track recommendation acceptance rate as a performance metric.
