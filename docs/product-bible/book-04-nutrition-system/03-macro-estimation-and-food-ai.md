# Macro Estimation And Food AI

## Purpose

Food AI should help users log faster and understand nutrition, but it should never pretend estimates are exact.

Food AI should:

- Estimate foods and portions.
- Explain confidence.
- Ask for clarification only when needed.
- Allow easy correction.
- Learn from user corrections where appropriate.
- Connect food data to training, recovery, and body-weight trends.

## AI Estimation Sources

AI may estimate from:

- Meal photos.
- Natural-language text.
- Voice transcript.
- Restaurant or common meal description.
- Nutrition label image.
- Previous similar meals.
- User's common foods.
- User corrections.
- Goal targets.

## AI Estimate Fields

AI-estimated meals should preserve:

- Detected food items.
- Estimated portions.
- Estimated calories.
- Estimated protein.
- Estimated carbs.
- Estimated fat.
- Optional fiber/micronutrients if available.
- Confidence level.
- Source type.
- Image, text, or voice reference if applicable.
- Assumptions made.
- User corrections.
- Final accepted values.
- Whether the entry was used in totals.

## Confidence Levels

| Confidence | Meaning | Example | AI Behavior |
| :--------- | :------ | :------ | :---------- |
| High | Source and serving details are strong. | Scanned label with confirmed serving size. | Use in totals with normal source disclosure; still allow edits. |
| Medium | Estimate is useful but has uncertain portions or ingredients. | Clear photo with common foods. | Show uncertainty, avoid precise claims, invite correction. |
| Low | Meal could vary widely or details are vague. | "Big plate of pasta." | Use as rough estimate, label confidence clearly, ask only if it matters. |
| Unknown | Missing details prevent meaningful confidence. | Meal logged without portion or source. | Avoid strong recommendations and request context when the value materially affects the plan. |

## Uncertainty Language

The AI should use clear uncertainty language.

Examples:

- "Estimated from photo."
- "Portion size is uncertain."
- "This may be off because the sauce or oil amount is unclear."
- "Protein is likely more reliable than total calories here."
- "This entry is good enough for a rough daily total, but not precise."

## Avoid False Precision

- AI should avoid pretending it knows exact calories from photos.
- Estimates should use reasonable ranges or confidence notes when needed.
- The app should not display excessive decimal precision for uncertain estimates.
- The AI should distinguish weighed/scanned foods from guessed portions.

## User Correction Loop

User corrections should become final accepted values. Original AI estimates should be preserved.

Requirements:

- Corrections should improve similar future estimates when appropriate.
- The app should not assume one correction applies globally without context.
- User can correct food item, portion, calories, macros, or serving size.

Example:

AI estimates a chicken rice bowl at 900 calories. User corrects it to 700 calories. FitCore should store:

- Original estimate: 900 calories.
- Accepted value: 700 calories.
- Correction source: user.
- Confidence changed after correction.
- Possible learning signal for similar future meals.

## Clarifying Questions

AI should ask a question when:

- Portion size is impossible to estimate.
- Food item is ambiguous.
- Meal could vary widely in calories.
- User's goal requires higher accuracy.
- The estimate would strongly affect the daily plan.

AI should avoid asking when:

- The user is logging quickly.
- The estimate is good enough for a rough total.
- The uncertainty can be labeled.
- Asking would create more friction than value.

## Common Food Intelligence

- AI may remember common foods or meals if memory is enabled.
- AI should distinguish preferences from actual logged food.
- AI should not assume the user ate something just because they often eat it.
- AI should use common meals to speed logging, not fabricate logs.

## Restaurant And Packaged Food

- Restaurant meals often have high uncertainty unless nutrition data is available.
- Packaged foods with labels/barcodes may be higher confidence.
- User should be able to override database entries.
- AI should explain uncertainty for restaurant, oil, sauce, and portion-heavy meals.

## AI Nutrition Explanations

Food AI should be able to explain:

- Why a macro estimate was made.
- What part is uncertain.
- How a correction affected totals.
- How today compares to target.
- What food choice would best support the user's goal.
- Whether nutrition may be affecting training or recovery.

## Food AI Anti-Patterns To Avoid

- Treating meal photos as exact.
- Hiding assumptions.
- Asking too many questions.
- Saving photos without clear privacy control.
- Overwriting user corrections.
- Using common foods to invent meals.
- Giving diet advice without considering goal.
- Ignoring training day vs rest day.
- Making body-weight claims from one meal.
- Presenting low-confidence estimates as precise facts.

## Macro Estimation Acceptance Criteria

- Docs define AI-estimated meal fields.
- Docs define confidence levels.
- Docs require uncertainty language.
- Docs require user correction handling.
- Docs require source transparency.
- Docs require privacy caution for photos.
- Docs avoid false precision.
