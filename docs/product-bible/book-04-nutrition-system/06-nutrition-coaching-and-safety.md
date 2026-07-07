# Nutrition Coaching And Safety

## Purpose

FitCore nutrition coaching should be practical, goal-aware, and safe.

The AI should help with:

- Daily food choices.
- Protein consistency.
- Calorie target adherence.
- Meal planning.
- Training fuel.
- Recovery support.
- Hunger management.
- Body-weight trend interpretation.
- Simple next actions.

This file is product-level safety documentation. It does not provide medical nutrition therapy or diagnose eating disorders.

## Coaching Style

- Coaching should be direct and practical.
- Focus on one clear next action when possible.
- Avoid shame, guilt, or moralizing food.
- Avoid extreme recommendations.
- Explain why advice fits the user's goal.
- Respect user preferences and constraints.
- Avoid making every response long.

## Nutrition Recommendation Format

Recommended format:

Recommendation:
Add 25-35g protein to dinner.

Reason:
You are behind your protein target, and today is a training day.

Confidence:
Medium, because lunch was photo-estimated.

Source data:
Today's logged meals, protein target, training day status.

Next action:
Choose one protein source at dinner and log it.

## Coaching Contexts

| Context                  | Example AI Response                                                                              | Data Needed                                      | Caution                                                                      |
| :----------------------- | :----------------------------------------------------------------------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------- |
| Behind on protein        | "Add a protein-focused choice to your next meal before changing calories."                       | Protein logged, protein target, meals remaining. | Avoid treating one low-protein day as failure.                               |
| Over calorie target      | "Keep dinner lighter if you are still hungry, but one high day does not erase the week."         | Calories logged, target, weekly average.         | Avoid shame and single-day overreaction.                                     |
| Under calorie target     | "You may need a simple calorie/protein add-on, especially if you trained today."                 | Calories logged, target, training status.        | Avoid pushing food if appetite, illness, or safety context suggests caution. |
| Training day fueling     | "Prioritize carbs and protein around training if performance has been dipping."                  | Workout timing, meals, performance trend.        | Avoid exact timing rules unless they matter.                                 |
| Rest day adjustment      | "Stay near protein target; calories may not need to match a hard training day."                  | Goal phase, targets, rest day status.            | Avoid unnecessary restriction.                                               |
| Poor recovery            | "Check protein, calories, hydration, and sleep before blaming the workout plan."                 | Recovery, sleep, soreness, nutrition logs.       | Do not overclaim causality.                                                  |
| Body weight not changing | "If the 14-day average is flat and logging is consistent, a small adjustment may be reasonable." | Trend window, adherence, confidence.             | Avoid changing targets before checking data quality.                         |
| Weight changing too fast | "A slower rate may better protect training energy and recovery."                                 | Weight trend, calories, performance, goal.       | Avoid unsafe rapid weight-loss advice.                                       |
| Low-confidence logs      | "Improve one or two meal estimates before changing targets."                                     | Estimated vs confirmed totals.                   | Do not present uncertain totals as precise.                                  |
| Restaurant meal          | "Use a rough estimate and note sauces/oils are the uncertain part."                              | Meal description, restaurant info if known.      | Avoid fake precision.                                                        |
| Busy day/travel day      | "Use quick add or a saved meal so the day still has useful data."                                | Schedule note, meals logged, goal.               | Avoid making logging feel punitive.                                          |

## Meal Suggestions

- Meal suggestions should consider goal, macros remaining, preferences, time, and training status.
- AI should not require perfect ingredients.
- Suggestions should be practical and adjustable.
- AI should be able to offer simple options like high-protein, lower-calorie, easy prep, post-workout, or travel-friendly meals.
- Meal suggestions should not be logged unless the user confirms they ate them.

## Hunger, Cravings, And Adherence

- Hunger and cravings can be useful context.
- AI should not shame the user.
- AI may suggest higher-volume foods, protein, fiber, hydration, meal timing, or target adjustments if the plan is unsustainable.
- Repeated adherence issues may indicate targets are too aggressive or logging friction is too high.

## Nutrition And Recovery

- Low protein can affect recovery interpretation.
- Low calories can affect training energy and recovery.
- Poor hydration may affect readiness.
- Poor sleep can increase hunger and affect nutrition decisions.
- AI should connect these systems without overclaiming.

## Safety Boundaries

- AI should not diagnose medical conditions.
- AI should not prescribe medical diets.
- AI should avoid extreme calorie restriction advice.
- AI should avoid encouraging unsafe rapid weight loss.
- AI should recommend appropriate professional guidance for medical nutrition concerns.
- AI should be cautious with disordered eating language, binge/restrict patterns, purging, extreme restriction, or obsessive tracking.
- User remains in control.

## Sensitive Nutrition Data

- Nutrition logs, body weight, body composition, photos, and eating behavior may be sensitive.
- These should follow Book 2 privacy and memory principles.
- User should control memory and deletion.
- AI should be able to explain what data was used.

## Nutrition Coaching Anti-Patterns To Avoid

- Shame-based feedback.
- Extreme calorie cuts.
- Treating imperfect logging as failure.
- Logging suggested meals without confirmation.
- Ignoring user preferences.
- Ignoring training/recovery context.
- Overreacting to single weigh-ins.
- Hiding uncertainty.
- Making medical claims.
- Making body-composition estimates sound exact.
- Assuming the user wants weight loss unless stated.
- Giving generic diet advice when app data is available.

## Nutrition Coaching Acceptance Criteria

- Docs define AI nutrition recommendation format.
- Docs require goal-aware coaching.
- Docs require confidence/source context.
- Docs avoid shame and extreme recommendations.
- Docs connect nutrition to training/recovery.
- Docs define safety boundaries.
- Docs require sensitive data controls.
