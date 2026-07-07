# Meal Logging Current Behavior Audit

## 1. Purpose
To audit the current meal logging implementation, detailing what is working, what is missing compared to the Product Bible, and the data flow for nutrition tracking.

## 2. Scope
This audit covers meal entry, modification, deletion, macro tracking, and integration with the dashboard and Jarvis AI contexts.

## 3. Source files inspected
- `src/components/app/views/nutrition.tsx`
- `src/components/app/popups/macro-popup.tsx` (inferred from home.tsx)
- `src/components/app/popups/quick-popups.tsx`
- `src/lib/store.tsx`
- `src/lib/fitcore-data.ts`
- `src/lib/daily-decision.ts`

## 4. Current confirmed behavior
- Users can log meals manually via the `LogMealSheet` (bottom sheet pattern).
- Meals can be created from templates, pre-defined foods, or custom entry.
- Manual logging allows inputting Meal Name, Meal Type, and macro counts (Calories, Protein, Carbs, Fat).
- A delete confirmation dialog exists (`ConfirmDialog`) for removing logged meals.
- Daily nutrition totals are calculated and displayed on the NutritionView (`TodayTab`) and History view (`HistoryTab`).

## 5. Current missing or unclear behavior
- No clear AI/photo macro estimate flow exists in the UI currently (missing from `LogMealSheet`).
- There is no flow to explicitly review/confirm an AI estimate before saving (though manual logs are implicitly confirmed).
- No inline correction/editing behavior exists for logged meals (only deletion).

## 6. Data created or updated by this flow
- `mealEntries`: Array of `MealEntry` objects (id, name, type, calories, protein, carbs, fat, notes, createdAt, source, confidence, etc.).
- `nutritionTargets` are referenced but not updated by this flow.

## 7. Downstream displays/graphs/summaries affected
- "Nutrition" View (Today and History tabs).
- Dashboard Macros card (`home.tsx`).
- `MacroDetailSheet`.
- Progress View (graphs).

## 8. AI/Jarvis interaction points
- Jarvis tools (`logMeal`, `updateMeal`, `deleteMeal`) can manipulate the same state.
- Daily Decision engine (`src/lib/daily-decision.ts`) uses confirmed `mealEntries` to suggest next meals or macro adjustments.

## 9. Privacy/safety concerns
- No specific privacy concerns for manual meal text/macro data unless notes contain sensitive info.
- If photo AI estimation is added, photo uploads to models need strict privacy boundaries.

## 10. Demo/test account concerns
- Demo mode overlays fake meal data. The UI seamlessly displays demo meals.

## 11. Known risks
- Manual inputs don't have strict validation limits (could enter 10,000 calories accidentally).
- Deleting a meal permanently removes it from state immediately.

## 12. Recommended future implementation work
- Add AI photo scanning for meal estimation.
- Add an edit/correction flow for existing meals (currently only delete is supported).
- Ensure AI estimates have a required review/confirmation step before full inclusion in totals.

## 13. Acceptance criteria for future fixes
- AI meal estimation must flag `confidence` and `source`.
- Unconfirmed AI meals must distinctively render and prompt for user confirmation.
- Users can edit macros on existing meals.

## 14. Do-not-touch boundaries for future PRs
- Do not alter `src/lib/daily-decision.ts` logic for handling unconfirmed meals without updating AI/nutrition rules.
- Do not remove the delete confirmation dialog.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Meal Entry | Manual via sheet (Templates, Foods, Custom) | `src/components/app/views/nutrition.tsx` | No AI/Photo estimate flow | Add AI photo estimate capabilities |
| AI Confirmation | Not implemented | `src/components/app/views/nutrition.tsx` | Unclear how unconfirmed meals are handled in UI | Add review step for AI meals |
| Edit/Correct | Only deletion is supported, no editing | `src/components/app/views/nutrition.tsx` | Users must delete and recreate to fix a typo | Implement meal editing |
| Dashboard Update | Saves update `mealEntries` immediately | `src/components/app/views/nutrition.tsx`, `src/lib/store.tsx` | None | None |
