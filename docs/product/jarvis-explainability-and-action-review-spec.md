# Jarvis: Explainability & Action Review Spec

## Purpose

Ensure Jarvis acts as a transparent, trusted coach rather than a "black box." Every suggestion or action taken by the AI must be explainable, reviewable, and reversible.

## Product Rule Alignment

- **Improve Trust in Data:** Makes AI reasoning visible.
- **Explain What Changed:** Clarifies why a recommendation was made.
- **Help User Decide What to Do Next:** Provides clear review/confirmation steps before affecting data.

## User Problems Solved

- "Jarvis suggested a workout change, but I don't know why."
- "I'm not sure if I should trust this calorie estimate."
- "Jarvis logged something automatically and I want to undo it."

## Jarvis Explanation Principles

1. **Cite the Source:** "Based on your [Training Logs] and [Sleep Note]..."
2. **Acknowledge the Gap:** "I'm missing [Calorie Data] for today, so this is a partial recommendation."
3. **Quantify Confidence:** "I am 85% confident in this meal estimate."
4. **Be Proactive about Reversibility:** "You can always undo this or adjust the values."

## Action Review Behavior

- **Explicit Confirmation:** For high-impact actions (deleting workouts, changing program, logging large meals), Jarvis MUST present a "Review & Confirm" UI.
- **The "Suggestion" State:** Suggestions appear as "Pending" or "Draft" in the UI until the user taps "Accept."
- **Undo Capability:** Every Jarvis action should have a clear "Undo" or "Revert" option immediately available in the chat or on the affected record.

## Required Data for Explanations

- `recommendation`: The core suggestion.
- `reasoning`: A plain-text explanation of the logic.
- `inputSignals`: List of specific data points used (e.g., `WorkoutId`, `NutritionLogId`).
- `missingSignals`: List of data points that would have improved the recommendation.
- `confidence`: Numerical score (0.0 - 1.0).
- `isActionable`: Whether the user can accept/reject it directly.

## UI Behavior: The Explanation Panel

Each Jarvis recommendation should have an "Info" or "Why?" icon that opens a panel answering:

- **What am I recommending?** (Clear summary)
- **Why am I recommending it?** (The logic)
- **What data did I use?** (Linked sources)
- **What data did I ignore?** (Data considered but excluded due to low confidence or irrelevance)
- **What data was missing?** (Gaps in knowledge)
- **How confident is this?** (Visual gauge)
- **What happens if I accept?** (Expected outcome)
- **Can this be undone?** (Safety check)

## Guardrails

- **No False Certainty:** Jarvis must use hedging language ("It seems like", "I suggest") when confidence is < 0.8.
- **Manual Data Protection:** Jarvis can never overwrite manual user entries without a secondary "Are you sure?" confirmation.
- **Tone:** Maintain a "Coach" persona—supportive but data-driven.

## Future Implementation Checklist

- [ ] Build the `ExplanationPanel` UI component.
- [ ] Implement `ReviewAction` UI for Jarvis suggestions.
- [ ] Update Jarvis tool logic to include `reasoning` and `confidence` in responses.
- [ ] Add "Source Linking" to allow users to jump from an explanation to the source log.
- [ ] Implement a project-wide "Undo" registry for AI actions.
- [ ] Add "Missing Data" prompts to Jarvis recommendations.
