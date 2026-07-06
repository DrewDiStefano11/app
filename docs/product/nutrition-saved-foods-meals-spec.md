# Nutrition: Saved Foods & Meals Spec

## Purpose

Streamline the nutrition logging process by allowing users to quickly access and reuse their most frequent and favorite foods and meals, while maintaining high data integrity and trust.

## Product Rule Alignment

- **Reduce Logging Friction:** Makes common meals 1-tap to log.
- **Improve Trust in Data:** Clearly distinguishes between verified saved items and unverified AI estimates.
- **Connectivity:** Connects past logging behavior to future ease of use.

## User Problems Solved

- "I eat the same breakfast every day, but I have to search for every ingredient every time."
- "Jarvis estimated my lunch, but I want to save this specific custom meal for later without it being 'estimated' next time."
- "I can't remember the exact macros of the protein bar I logged last week."

## Core Flows

1. **Saving a Food/Meal:** Users can manually save a single food item or a combination of items (a meal) from their history or during the logging flow.
2. **Logging from Saved:** A dedicated "Saved" tab in the nutrition logger allows 1-tap logging of these items.
3. **AI Estimation to Saved:** When Jarvis estimates a meal via camera or text, it is NOT saved automatically. Only after the user confirms/corrects the macros can they choose to "Save as Meal".
4. **Repeat Meal Logging:** A "Recent" section shows the last 5-10 meals/foods logged for rapid re-entry.
5. **Editing Saved Items:** Users can manage their library, updating macros or names of saved foods/meals.

## Required Data

- **SavedFood:** `id`, `name`, `calories`, `protein`, `carbs`, `fat`, `servingSize`, `isVerified` (true for user-saved).
- **SavedMeal:** `id`, `name`, `components` (list of foods/weights), `totalMacros`, `lastUsed`.
- **Audit Metadata:** `source: "user_saved"`, `confidence: 1.0`.

## Confidence/Provenance Behavior

- **Confirmed Only:** Only foods/meals with a `confidence: 1.0` (manually entered or confirmed AI estimates) can be added to the "Saved" library.
- **Camera Estimates:** Camera-estimated meals must display their original `confidence` score and `source: "camera"` until saved by the user, at which point the new saved instance becomes `source: "user_saved"`.
- **Macro Corrections:** If a user corrects a saved meal's macros during a specific log, they should be prompted: "Update saved meal macros permanently?"

## UI Behavior

- **Speed First:** The "Saved" and "Recent" sections should be the default or most accessible views in the nutrition logger.
- **Visual Distinction:** Saved meals should have a distinct icon/badge compared to searching the global database.
- **Duplicate Prevention:** When saving a food, the system checks for existing entries with the same name and macros to prevent clutter.
- **Confidence Labels:** Even for saved items, the UI should briefly show "Source: Saved" in the entry detail to maintain provenance.

## Jarvis Behavior

- **Smart Suggestions:** "I see you're logging breakfast. Would you like to use your saved 'Power Oatmeal'?"
- **Learning from Corrections:** If a user consistently corrects an AI estimate of a specific meal to match a saved meal, Jarvis should ask: "This looks like your 'Chicken & Rice' saved meal. Should I use those macros next time?"

## Edge Cases

- **Deleting a Food used in a Meal:** If a constituent food is deleted, the meal should be "flattened" into its raw macros or the user should be prompted to update it.
- **Ingredient Availability:** A saved meal might have 5 ingredients, but the user only has 4 today. The UI should allow "Log all but [item]" or "Adjust weights" easily.

## Future Implementation Checklist

- [ ] Create `SavedFood` and `SavedMeal` schemas.
- [ ] Build the "Saved & Recent" UI tab in the nutrition logger.
- [ ] Implement the "Save as Meal" flow from the nutrition summary.
- [ ] Add duplicate detection logic for saved items.
- [ ] Integrate saved meals into Jarvis's recommendation logic.
- [ ] Implement "Repeat Last Meal" shortcut on the dashboard.
