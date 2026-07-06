# AI Nutrition Estimation Test Plan

## Purpose

This document outlines the testing strategy for AI-driven nutrition logging in FitCore. It ensures that camera/photo and text estimations are accurate, corrections work as intended, and unconfirmed data does not lead to unsafe or confusing coaching advice.

## QA Principles

- **Accuracy over Speed:** It is better for the AI to admit uncertainty than to provide a confident wrong answer.
- **User Trust:** User corrections must always be honored and should never be overwritten by the AI.
- **Safety First:** Nutrition recommendations must always account for data confidence levels.

## Test Matrix

| Feature             | Scenario               | Expected Outcome                                                 | Confidence |
| :------------------ | :--------------------- | :--------------------------------------------------------------- | :--------- |
| **Manual Entry**    | Log 100g Chicken       | High confidence (1.0), `source: manual`.                         | High       |
| **Barcode Scan**    | Scan Protein Bar       | High confidence (1.0), `source: barcode`.                        | High       |
| **Camera Estimate** | Clear photo of apple   | Medium/High confidence, `source: camera`, "Confirm" badge shown. | Medium     |
| **Camera Estimate** | Blurry photo of pasta  | Low confidence, `source: camera`, "Pending Review" warning.      | Low        |
| **Text AI**         | "I had a sandwich"     | Medium confidence, asks for ingredients/size.                    | Medium     |
| **User Correction** | Edit AI chicken weight | `source: user_corrected`, `confidence: 1.0`, UI badge removed.   | High       |
| **Saved Meal**      | Log "Power Oats"       | High confidence (1.0), `source: user_saved`.                     | High       |
| **Partial Day**     | Log only breakfast     | Daily total shows "Partial", DDE soft recommendation.            | N/A        |
| **Missing Meal**    | No lunch logged by 2PM | Jarvis asks about lunch; totals don't treat as 0.                | N/A        |

## Required Scenarios

### 1. The Correction Loop

- **Test:** Use camera to estimate a meal -> Correct the calorie count -> Save as "My Regular Dinner".
- **Verification:** Ensure the new saved meal has `confidence: 1.0` and that original AI metadata is preserved in the audit log.

### 2. Low-Confidence DDE Interaction

- **Test:** Add 3 "Low Confidence" meals to a single day.
- **Verification:** Ensure the Daily Decision Engine (DDE) includes a "Based on estimates" disclaimer and avoids aggressive macro adjustments.

### 3. Jarvis Explainability

- **Test:** Ask Jarvis "Why is my protein target yellow?"
- **Verification:** Jarvis should cite unconfirmed logs: "You have 2 unconfirmed meals that might contain protein."

### 4. Regression Risks

- **AI Overwrite:** Ensure a user-corrected log is NOT overwritten if the user later takes another photo of the same meal.
- **Fake Precision:** Ensure AI estimates are rounded (e.g., 400kcal, not 402.3kcal) in the history view.
- **Missing Data Zeroing:** Ensure days with missing meals do not show "Perfect Balance" in history graphs just because totals are low.

## Manual QA Checklist

- [ ] UI: "Pending Review" badge is visible on unconfirmed AI logs.
- [ ] UI: Tapping an unconfirmed log opens the correction/confirmation sheet.
- [ ] DDE: Recommendations are "softened" when data quality is low.
- [ ] Saved Foods: Corrected items can be saved for future use with 1 tap.
- [ ] Graphs: Uncertain data is visually distinguished from confirmed data.

## Future Automated Test Checklist (E2E/Playwright)

- [ ] `test:log-unconfirmed-meal-shows-badge`
- [ ] `test:correct-ai-meal-updates-confidence`
- [ ] `test:dde-shows-disclaimer-on-low-confidence`
- [ ] `test:missing-meal-nudge-from-jarvis`
- [ ] `test:saved-meal-reuse-maintains-high-confidence`

## Key Rule

AI nutrition should be helpful, but user trust matters more than confident-looking guesses. If the AI is unsure, it must defer to the user.
