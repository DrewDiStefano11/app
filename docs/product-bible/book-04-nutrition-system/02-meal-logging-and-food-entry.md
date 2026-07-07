# Meal Logging And Food Entry

## Meal Logging Purpose

Meal logging should be fast, flexible, and confidence-aware.

FitCore should support detailed logging when the user wants accuracy and fast approximate logging when the user wants low friction. The product should make rough logging useful without pretending rough estimates are the same as weighed, scanned, or user-confirmed values.

## Food Entry Methods

| Entry Method                    | Best For                                      | Required Data                                                          | Confidence Pattern                                                | Status  |
| :------------------------------ | :-------------------------------------------- | :--------------------------------------------------------------------- | :---------------------------------------------------------------- | :------ |
| Manual search                   | Common foods, user-selected database entries. | Food, serving size, quantity.                                          | Medium to high depending on source and serving confirmation.      | Planned |
| Quick add calories/macros       | Fast rough logging.                           | Calories, optional protein/carbs/fat, optional note.                   | Usually medium or low unless user marks values as known.          | Planned |
| Barcode/label scan              | Packaged foods with nutrition facts.          | Barcode or label, serving size, quantity.                              | Usually high after serving confirmation.                          | Future  |
| Meal photo                      | Mixed meals where manual entry is too slow.   | Photo, optional note, optional portion context.                        | Medium or low depending on image clarity and portion uncertainty. | Planned |
| Voice log                       | Hands-free meal capture.                      | Transcript or audio-derived text.                                      | Medium or low depending on detail.                                | Planned |
| Text log                        | Natural-language quick capture.               | Typed meal description.                                                | Medium or low depending on detail.                                | Planned |
| Repeated meal                   | Meals the user eats often.                    | Prior meal or saved favorite, date/time, serving adjustment if needed. | High when reused exactly; medium when adjusted.                   | Planned |
| Recipe                          | Multi-ingredient meals with servings.         | Ingredients, servings, selected portion.                               | Medium to high depending on ingredient confidence.                | Planned |
| Restaurant/common meal estimate | Meals without exact nutrition data.           | Meal description, restaurant if known, portion cue.                    | Often low or medium unless verified data exists.                  | Planned |
| AI-suggested meal               | Planning meals before the user eats.          | Goal, macros remaining, preferences, context.                          | Not logged until user confirms it was eaten.                      | Planned |
| Imported nutrition data         | External nutrition sources.                   | Provider entry, timestamp, serving/quantity.                           | Depends on provider source and user confirmation.                 | Future  |

## Quick Add

Quick add should support calories and optionally protein, carbs, and fat. It is useful when the user knows a rough estimate or does not want to search every ingredient.

Product rules:

- Quick add should be clearly labeled as manually estimated when appropriate.
- Quick add should not pretend to know micronutrients unless entered.
- Quick add should still count toward daily totals.
- AI should understand that quick add may be lower confidence than weighed food.
- Quick add should allow a short note when context matters, such as "airport sandwich" or "post-workout shake."

## Manual Food Search

Manual search should let users find foods quickly and adjust what they select.

Requirements:

- User should be able to search foods quickly.
- Search results should avoid duplicates where possible.
- Common foods should be easy to reuse.
- User should be able to adjust serving size.
- User should be able to correct calories and macros.
- User corrections should be preserved.

## Barcode Or Nutrition Label Entry

Barcode or nutrition label entry is `Future` unless the repository later proves otherwise.

Requirements:

- Barcode/label entries should preserve source.
- Nutrition label values are usually higher confidence than photo estimates.
- User should still be able to edit serving size.
- User should be able to correct incorrect database results.
- Label scan should not overwrite user correction automatically.

## Meal Photo Logging

Meal photo logging should reduce friction while preserving uncertainty.

Requirements:

- User may take or upload a photo of a meal.
- The system may estimate foods, portions, calories, and macros.
- The photo estimate must be labeled as AI-estimated.
- The app should show confidence or uncertainty.
- The user should be able to correct detected foods and macros.
- The corrected value should become the accepted value for totals.
- The original estimate should be preserved as source history.
- Meal photos should follow Book 2 privacy and memory principles.

## Voice/Text Meal Logging

Voice and text logging should let the user capture meals in natural language.

Example:

> I had two eggs, toast, and a protein shake.

Requirements:

- The AI should parse foods and estimate macros when possible.
- Vague entries should be lower confidence.
- User should be able to review and correct before final acceptance when needed.
- The original text or voice transcript should be preserved if appropriate.
- AI-assisted values must be labeled.

## Repeated Meals And Favorites

Repeated meals should make frequent eating patterns easy to log without hiding provenance.

Requirements:

- The user should be able to reuse common meals.
- Corrections to repeated meals should be clear.
- The app should avoid forcing the user to rebuild the same meal repeatedly.
- Repeated meals should preserve whether the user reused exact macros or adjusted serving size.
- Favorite meals should speed up logging.

The existing saved foods and meals spec under `docs/product` supports this direction, but Book 4 should remain implementation-neutral and avoid claiming the full system is implemented.

## Recipes And Meal Templates

Recipes should support ingredients, servings, and portion selection.

Requirements:

- User should be able to save a meal as a recipe or template.
- Recipes should support edits without corrupting past logged meals.
- Past meals should preserve what was logged at that time.
- Updated recipe values should apply only when the user chooses to use the updated recipe.

## Meal Timing

Meal timing may matter for training and recovery.

Requirements:

- Meal logs should preserve time when possible.
- The app should distinguish breakfast, lunch, dinner, and snack if useful.
- Training-related meals may be linked to pre-workout or post-workout context.
- Meal timing should not be overemphasized unless it helps the user's goal.

## Logging Friction Rules

- User should not be forced into perfect tracking.
- The app should support rough logging.
- The app should explain when rough logging reduces confidence.
- The app should offer correction without judgment.
- The system should make common actions fast.
- The AI should help reduce entry time, not create more work.

## Meal Logging Acceptance Criteria

- Docs define multiple food entry methods.
- Docs distinguish high-confidence and low-confidence entries.
- Docs require corrections to be preserved.
- Docs require AI/photo estimates to be labeled.
- Docs require meal photo privacy considerations.
- Docs support quick add, repeated meals, and recipes.
- Docs connect meal logs to daily totals and future recommendations.
