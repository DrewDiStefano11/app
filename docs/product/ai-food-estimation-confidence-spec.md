# AI Food Estimation & Confidence Spec

## Purpose

This document defines the behavior, data integrity rules, and user experience for FitCore’s AI-driven nutrition estimation (camera/photo and text-based). It ensures that AI guesses are useful without polluting the user's confirmed health history or driving premature coaching decisions.

## Product Rule Alignment

- **Reduce Logging Friction:** Rapidly estimate macros from a photo or a quick text description.
- **Improve Trust in Data:** Clearly distinguish between unconfirmed guesses and user-verified facts.
- **Explain What Changed:** Show the user exactly how an AI estimate was derived and which parts are uncertain.

## User Problems Solved

- "I don't know the macros for this restaurant meal and I don't want to search for 10 ingredients."
- "I want to log my dinner quickly via photo, but I'm worried the AI will get the calories wrong."
- "Jarvis gave me a recommendation based on a meal I haven't even confirmed yet."

## AI/Camera Estimation Model

FitCore uses a multi-modal approach:

1.  **Camera/Photo:** Analyzes visual data for food identification and volume estimation.
2.  **Text Description:** Parses natural language (e.g., "large bowl of pasta with meat sauce") to identify ingredients and portions.
3.  **Reference Data:** Matches identified items against the global food database and user history.

## Confidence Levels

All nutrition logs must include a `confidence` metadata field (0.0 to 1.0):

- **High Confidence (0.9 - 1.0):**
  - Confirmed manual entry.
  - Barcode scan.
  - Saved food or saved meal entry.
  - AI estimate that has been **user-confirmed** or **user-corrected**.
- **Medium Confidence (0.6 - 0.8):**
  - Reasonable AI estimate for known foods with clear portions, but not yet confirmed by the user.
  - Recent history matches for vague descriptions (e.g., "my usual breakfast").
  - Clear photo estimates where the AI has high certainty on food type and volume.
- **Low Confidence (0.1 - 0.5):**
  - Unclear photos (blurry, poor lighting, overlapping items).
  - Vague meal descriptions ("had some snacks").
  - Unknown portions or missing ingredients.
  - Conflicting estimates from multiple sources.
  - Restaurant meals where ingredients are highly variable.

## Confirmation Behavior

- Unconfirmed AI/camera estimates (Low/Medium confidence) appear in the history with a **"Pending Review"** or **"Confirm"** badge.
- Clicking "Confirm" upgrades the log to High Confidence (`confidence: 1.0`) and updates the source if necessary.
- FitCore should explicitly ask for confirmation before treating uncertain food data as reliable for long-term trends.

## Provenance Behavior

AI estimates must always be traceable to their source via metadata:

- `source: "camera"`
- `source: "text_ai"`
- `source: "manual"`
- `source: "barcode"`
- `source: "user_saved"`
- `source: "user_corrected"`

## Macro Estimate Behavior

- **Portion Uncertainty:** When the AI is unsure of volume, it should provide a "best guess" but flag the portion as the primary source of uncertainty in the UI.
- **Restaurant Meals:** Prioritize restaurant-specific database entries if location is known; otherwise, use a "Generic Restaurant Dish" estimate with medium confidence.
- **Homemade Meals:** Attempt to decompose into core ingredients (e.g., 4oz chicken, 1 cup rice, 1 tbsp oil).
- **Unknown Ingredients:** If the AI sees an unidentifiable item, it should label it "Unknown Item" with a placeholder value and prompt the user.
- **Missing Serving Sizes:** Default to "1 serving" but flag as Low Confidence if the AI cannot visually estimate weight/volume.

## User Correction Behavior

- Users can tap any macro (Calories, P, C, F) or ingredient in an AI estimate to edit it.
- **Corrected AI estimates are treated as confirmed data** (High Confidence).
- The correction flow should be frictionless, allowing the user to say "That was 2 servings" or "This had more protein."

## Jarvis Behavior

- **Acknowledge Uncertainty:** Jarvis should state, "I've estimated this lunch at 700 calories, but I'm only 60% sure about the portion of the steak."
- **Soften Recommendations:** If nutrition data for the day is mostly unconfirmed AI estimates, Jarvis should use softer language: "Based on my estimates, you might need more protein, but please confirm your lunch log first."
- **Transparency:** Always explain _how_ an estimate was reached (e.g., "Based on the photo, I see salmon, asparagus, and what looks like butter sauce").

## Daily Decision Engine (DDE) Behavior

- **Data Guardrails:** Unconfirmed AI/camera estimates should not drive strong macro decisions or training intensity adjustments.
- **Contextual Awareness:** Low-confidence nutrition can be shown as context (e.g., in daily totals), but the DDE must "soften" coaching advice.
- **Missing Data:** Treat missing meals as missing, not as zero intake, to avoid false "green" status on calorie targets.

## Edge Cases

- **Low-Confidence Overrides:** If a user logs a Low Confidence meal and never confirms it, it remains in history but is excluded from "Verified Progress" reports.
- **Conflicting Data:** If a user barcode scans a snack that the camera also saw, the manual/barcode scan always wins and overrides the AI estimate.

## Future Implementation Checklist

- [ ] Implement `confidence` and `source` metadata in the nutrition state model.
- [ ] Build the "Pending Confirmation" UI state for nutrition logs.
- [ ] Update the nutrition summary card to show "Estimated" vs "Confirmed" totals.
- [ ] Integrate confidence levels into the DDE recommendation logic.
- [ ] Add "Confirm All" shortcut for trusted AI estimates.
