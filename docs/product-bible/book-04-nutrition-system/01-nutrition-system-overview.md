# Nutrition System Overview

## System Purpose

FitCore's nutrition system should help the user log food quickly, reduce friction compared to traditional calorie tracking, support AI-assisted meal logging, preserve confidence and source data, let users correct estimates easily, connect nutrition to body weight, training, and recovery, explain trends instead of overreacting to single days, and recommend practical next actions.

The system should answer practical questions:

- What should I eat today?
- Am I on track for calories and protein?
- Is my macro estimate reliable?
- Why did my body weight change?
- Should I adjust calories or wait for more data?
- Is my nutrition helping or hurting training?
- Am I underfueling recovery?
- What meal choices fit my goal?
- What one clear nutrition action would improve tomorrow?

## Core Nutrition Modules

| Module                            | Purpose                                                   | Example Inputs                                                         | Example Outputs                                               | Status  |
| :-------------------------------- | :-------------------------------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------ | :------ |
| Nutrition Goals                   | Define what nutrition is trying to support.               | Cut, bulk, maintain, recomposition, performance focus, recovery focus. | Goal phase, nutrition priority, coaching bias.                | Planned |
| Macro Targets                     | Set calorie, protein, carb, and fat targets.              | Goal phase, body weight, training day, adherence history.              | Daily targets, protein priority, remaining macros.            | Planned |
| Meal Logger                       | Capture meals with low friction.                          | Manual entry, quick add, photo, text, voice, saved meal.               | Meal record, daily totals, source/confidence.                 | Partial |
| Food Search                       | Find foods from a local or provider-backed food database. | Query, brand, serving size, aliases.                                   | Candidate foods, serving options, macro values.               | Planned |
| Quick Add                         | Let users enter rough calories and macros fast.           | Calories, optional protein/carbs/fat, note.                            | Low-friction meal entry, estimated daily total.               | Planned |
| Barcode/Label Entry               | Capture packaged-food nutrition with source preservation. | Barcode, label image, serving size.                                    | Higher-confidence food entry, source reference.               | Future  |
| Photo Meal Estimation             | Estimate meal components and macros from photos.          | Meal photo, optional note, goal context.                               | AI-estimated foods, portions, macros, confidence.             | Planned |
| Voice/Text Meal Logging           | Parse natural-language meal descriptions.                 | Voice transcript, typed meal, portion note.                            | Parsed meal items, estimate, clarification if needed.         | Planned |
| Recipe and Repeated Meal System   | Reuse common meals without rebuilding them.               | Saved recipe, previous meal, favorite breakfast.                       | Reusable meal, serving selection, copied or updated values.   | Planned |
| Food Database Layer               | Keep food identity, source, and nutrition values usable.  | Provider data, user foods, aliases, corrections.                       | Normalized foods, duplicate handling, confidence.             | Planned |
| User Corrections Layer            | Preserve edits and make accepted values explicit.         | Corrected calories, portion edit, food replacement.                    | Accepted values, correction history, learning signal.         | Planned |
| Nutrition Analytics               | Turn logs into trends and useful context.                 | Daily totals, weekly averages, confidence, adherence.                  | Trends, target progress, uncertainty warnings.                | Planned |
| Body-Weight Feedback Loop         | Explain weight changes with nutrition context.            | Weigh-ins, calorie averages, carbs, sodium, soreness, sleep.           | Trend explanation, adjustment caution, next action.           | Planned |
| Training and Recovery Integration | Connect food choices to workout and readiness decisions.  | Training day, performance, soreness, recovery, sleep.                  | Fueling insight, recovery warning, training-aware coaching.   | Planned |
| AI Nutrition Coach                | Recommend practical, goal-aware nutrition actions.        | Targets, logs, training status, body-weight trend, preferences.        | Recommendation, reason, confidence, next action.              | Planned |
| Privacy and Photo Control Layer   | Keep sensitive nutrition media under user control.        | Meal photo, progress photo, deletion request, memory setting.          | Storage/deletion behavior, AI-use disclosure, privacy status. | Planned |

## Nutrition System Loop

The desired loop is:

Set goal -> define targets -> log meals -> estimate/normalize macros -> preserve source/confidence -> update daily totals -> compare to targets -> connect to training/recovery/body weight -> explain trend -> recommend next action -> capture corrections/feedback.

1. Set goal: FitCore starts from the user's goal phase and constraints.
2. Define targets: The app sets explainable calorie and macro targets that can vary by phase and context.
3. Log meals: The user can log with detailed entries, quick estimates, photos, text, voice, saved meals, or recipes.
4. Estimate/normalize macros: FitCore converts food inputs into usable nutrition totals without pretending estimates are exact.
5. Preserve source/confidence: The system records whether values came from a label, user entry, AI estimate, search result, or correction.
6. Update daily totals: Accepted meal values affect calories, protein, carbs, fat, and optional hydration/fiber/micronutrient views.
7. Compare to targets: FitCore shows remaining needs and confidence/completeness.
8. Connect to training/recovery/body weight: Nutrition context helps explain performance, readiness, soreness, and scale trends.
9. Explain trend: The app prefers weekly context over single-day reactions.
10. Recommend next action: FitCore gives one useful nutrition action when enough context exists.
11. Capture corrections/feedback: User edits and feedback improve the accepted record and future suggestions where appropriate.

## Connected Nutrition Rule

Nutrition data must flow across the app. No useful food, weight, hydration, hunger, digestion, photo, note, or correction signal should be trapped on one screen.

Examples:

- A high-calorie day should help explain body-weight change and recovery.
- Low protein should affect nutrition coaching and recovery interpretation.
- Poor carbs around training may help explain low workout performance.
- Meal photo corrections should improve future AI estimates when appropriate.
- A skipped meal note should affect energy and training recommendations.
- Hydration notes should connect to recovery/readiness when relevant.
- Body-weight changes should be interpreted alongside sodium, carbs, calories, training, soreness, and sleep.

## Nutrition Inputs

FitCore nutrition inputs may include:

- Manual food entry.
- Quick calorie/protein entry.
- Searched food.
- Barcode or label scan.
- Meal photo.
- Voice meal log.
- Text meal log.
- Recipe.
- Repeated meal.
- Restaurant meal.
- User correction.
- Body-weight log.
- Body-composition log.
- Hunger note.
- Digestion note.
- Hydration note.
- Training day or rest day.
- Goal phase.
- AI suggestion.

## Nutrition Outputs

FitCore nutrition outputs should include:

- Daily calorie total.
- Macro totals.
- Protein target progress.
- Carb/fat breakdown.
- Hydration status if tracked.
- Fiber/micronutrient highlights if tracked.
- Meal history.
- Weekly averages.
- Adherence trends.
- Body-weight explanation.
- Training-fueling insight.
- Recovery-fueling insight.
- AI nutrition recommendation.
- Confidence warning when data is estimated or incomplete.

## Nutrition Architecture Values

- Fast daily logging.
- Minimal friction.
- Confidence-aware macro estimates.
- Easy correction.
- Source transparency.
- Photo privacy.
- No wasted meal notes.
- Avoid false precision.
- Practical coaching over perfect tracking.
- Trends over single-day overreaction.
- Goal-aware recommendations.
- Training-aware recommendations.
- User remains in control.

## Nutrition System Anti-Patterns To Avoid

- Treating photo estimates as exact.
- Hiding confidence levels.
- Burying user corrections.
- Making users log every detail when a quick estimate is enough.
- Overreacting to one high-calorie day.
- Blaming weight fluctuation on fat gain without enough data.
- Ignoring training demands.
- Ignoring protein intake when assessing recovery.
- Making the AI sound certain when data is incomplete.
- Storing meal photos without clear user control.
- Disconnecting food logs from body-weight explanations.
- Collecting nutrition notes that never affect recommendations.
