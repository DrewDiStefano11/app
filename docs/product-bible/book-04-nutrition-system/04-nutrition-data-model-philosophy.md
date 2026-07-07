# Nutrition Data Model Philosophy

## Purpose

FitCore must preserve enough nutrition data to support daily macro totals, meal history, goal adherence, body-weight interpretation, AI coaching, user corrections, repeated meals, recipes, training/recovery connections, and future analytics.

This file defines implementation-neutral product requirements. It does not define final database schemas, migrations, provider contracts, or production APIs.

## Nutrition Entity Concepts

Product-level nutrition concepts may include:

- Food item.
- Meal.
- Meal item.
- Recipe.
- Serving.
- Daily nutrition summary.
- Macro target.
- Nutrition goal phase.
- Hydration log.
- User correction.
- AI estimate.
- Imported food entry.
- Body-weight link.
- Training-day context.

## Food Item Data

A food item may need:

- Name.
- Brand if applicable.
- Serving size.
- Calories.
- Protein.
- Carbs.
- Fat.
- Fiber if available.
- Micronutrients if available.
- Source.
- Confidence.
- User correction status.
- Aliases.
- Barcode/label reference if applicable.

## Meal Data

A meal may need:

- Meal name/type.
- Time/date.
- Food items.
- Portions.
- Total calories/macros.
- Source type.
- Confidence level.
- Photo, text, or voice reference if applicable.
- User corrections.
- Notes.
- Hunger/fullness if tracked.
- Digestion note if tracked.
- Training relation, such as pre-workout or post-workout.
- Whether included in daily totals.

## Macro Targets

Targets may change by goal phase.

Goal phases may include:

- Cut.
- Bulk.
- Maintain.
- Recomposition.
- Performance focus.
- Recovery focus.

Requirements:

- Macro targets should preserve effective date.
- Past days should not be rewritten when targets change.
- Protein target may be especially important for training/recovery.
- Targets should be explainable.

## Daily Nutrition Summary

Daily summary should include:

- Calories logged.
- Protein.
- Carbs.
- Fat.
- Percent or amount remaining.
- Confidence/completeness indicator.
- Missing meal warning if useful.
- Estimated vs confirmed calories.
- Hydration if tracked.
- Fiber/micronutrients if tracked.
- Notes.
- Relation to goal.
- Relation to training day/rest day.

## Estimated Vs Confirmed Data

Confirmed data may come from weighed foods, labels, or user-confirmed entries. Estimated data may come from photos, vague text, restaurant estimates, or AI assumptions.

Requirements:

- Daily totals should be able to show when a large portion is estimated.
- AI should use confidence when making recommendations.
- Estimated data should remain useful but should not be treated as equally precise.
- Confirmed data should still allow edits when the user identifies an error.

## Past Meal Preservation

- Editing a saved food or recipe should not corrupt past logs.
- Past meals should preserve what was accepted at the time.
- If user wants to update a past meal, that should be explicit.
- Repeated meals should distinguish copied historical values from updated template values.

## Nutrition Corrections

- User corrections should preserve original value.
- Corrected value should become accepted value.
- Correction reason/note may be optional.
- AI should learn from correction where appropriate.
- Corrections should be reflected in daily totals and analytics.

## Nutrition Data Transfer Rule

No nutrition data should be trapped in one screen.

Nutrition data should flow into:

- Daily summary.
- Weekly review.
- Progress charts.
- Body-weight explanations.
- AI recommendations.
- Training readiness.
- Recovery interpretation.
- Goal adherence.
- Meal suggestions.
- Future estimates.

## Privacy And Photo Data

- Meal photos should be treated as potentially sensitive.
- Body/progress photos are even more sensitive and should follow stronger controls.
- User should understand whether photos are stored, analyzed, or used for memory.
- Local-only handling may be needed for sensitive media.
- Deleting a photo should not leave misleading derived data behind without clear handling.

## Nutrition Data Acceptance Criteria

- Docs define product-level nutrition entities.
- Docs distinguish estimated vs confirmed data.
- Docs preserve corrections and source data.
- Docs explain target history.
- Docs require past meals to remain historically accurate.
- Docs route nutrition data to body-weight, recovery, training, and AI systems.
- Docs include privacy expectations for meal photos.
