# Food Correction Learning Loop Spec

## Purpose

Establish a feedback loop where user corrections of AI nutrition estimates (photo/text) improve future estimation accuracy and build a personalized "Saved Foods" library. This ensures that corrections make future logging faster and more accurate without losing data provenance.

## Product Rule Alignment

- **Reduce Logging Friction:** Repeated corrections of the same meal lead to 1-tap "Saved Meal" suggestions.
- **Improve Trust in Data:** Users feel in control of the AI; the system "learns" their specific portion sizes and food preferences.
- **Connect Fitness Domains:** Connects the "Quick Log" (AI) to the "Reliable Log" (User Saved).

## User Problems Solved

- "Jarvis always thinks my morning oatmeal is 400 calories, but it's actually 320."
- "The camera estimate missed the olive oil I used to cook this chicken."
- "I corrected this meal yesterday; why do I have to do it again today?"

## Correction Flow

1.  **Trigger:** User views an AI/camera estimated meal (unconfirmed).
2.  **Edit:** User taps a specific macro or ingredient to change it (e.g., "4oz chicken" -> "6oz chicken").
3.  **Metadata Update:** The entry's `source` changes to `user_corrected` and `confidence` moves to `1.0`.
4.  **Learning Prompt:** If the correction is significant, FitCore asks: "Should I remember this correction for next time?"
5.  **History Preservation:** The original AI estimate is stored in the audit trail (not the primary UI) to track AI improvement over time.

## Saved Food & Meal Behavior

- **One-Tap Save:** From any corrected meal, users can select "Save as Meal" to add it to their personal library.
- **Portion Memory:** If a user consistently corrects a specific food's weight (e.g., "Medium Banana" -> "120g"), FitCore should prioritize the 120g value for that user in future estimates.
- **Ingredient Logic:** Users can add missing ingredients or remove hallucinations from an AI estimate.

## User Preference Learning

- **Common Substitutions:** If a user always replaces "White Rice" with "Brown Rice" in AI estimates, Jarvis should start suggesting "Brown Rice" first.
- **Personalized Ranges:** Learn the user's "Standard" serving sizes for common items (protein shakes, bowls of cereal, etc.).

## Provenance/Confidence Behavior

- **Corrected = Verified:** Once a user edits a value, it is treated as "High Confidence" truth.
- **Learning Source:** Future estimates that rely on past corrections should be tagged as `source: "ai_learned"` or `source: "user_saved"`.

## Jarvis Behavior

- **Proactive Suggestions:** "Last time you had this, you said it was 8oz of chicken. Should I use that weight again?"
- **Validation:** "I estimated this at 400 calories, which matches your 'Standard Breakfast' saved meal. Confirm?"
- **Correction Assistance:** If Jarvis is unsure, it can ask: "I see the chicken, but I can't tell if there's oil. Did you use any?"

## Edge Cases

- **Overwriting History:** Corrections should NEVER automatically update past meals unless explicitly requested by the user ("Update all instances of this meal this week").
- **Accidental Saves:** Users must be able to delete "Saved Foods" that were created from poor corrections.
- **Conflicting Corrections:** If a user provides different corrections for the same visual meal, FitCore should ask for clarification or use the most recent one.

## Future Implementation Checklist

- [ ] Create the "Correct & Save" UI flow in the nutrition detail view.
- [ ] Implement the "Learning Prompt" logic after user edits.
- [ ] Add a "History" tab to Saved Foods showing when/why it was saved.
- [ ] Connect the correction metadata to the Jarvis recommendation engine.
- [ ] Build a "Reset Learning" option for users who want to start over with AI defaults.

## Correction Examples

- **Calorie Correction:** "That was 8 oz chicken, not 4 oz" -> System adjusts macros and asks to save "8oz Grilled Chicken" as a preference.
- **Portion Correction:** "Use 2 servings of rice" -> System remembers "2 servings" as the default for that user/meal combo.
- **Meal Naming:** "Save this as my 'Post-Workout Shake'" -> Creates a `SavedMeal` with 1-tap accessibility.
- **Accuracy Improvement:** "The AI missed the avocado" -> User adds avocado; system associates the green shape in the photo with "Avocado" for that user.
