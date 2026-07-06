# Daily Decision Engine UI Integration Plan

## 1. Goal

Integrate the output of the Codex Daily Decision Engine into the FitCore Home screen and Detail sheets to provide clear, actionable coaching.

---

## 2. "Command Center" (Home Screen)

The Home screen should feature a high-priority "Daily Directive" card.

### Content Requirements:

- **Today's Training:** e.g., "Push Day (Heavy)" or "Active Recovery".
- **Suggested Intensity:** e.g., "80% Intensity - focus on slow eccentrics".
- **Recovery Limiter:** e.g., "Sleep is the bottleneck today (-15%)".
- **Nutrition Priority:** e.g., "Prioritize Protein (40g remaining)".
- **One Clear Action:** e.g., "Go for a 15-min walk to improve recovery".

### Visual Priority:

- Use the `Tile` component with a distinct border color (FitCore Blue or Readiness Color).
- Confidence indicator (e.g., "Based on 95% data completeness").

---

## 3. "What Changed" Cards

Surfacing significant trends that influenced today's recommendation.

| Trigger               | Message Example                               | Next Action                      |
| :-------------------- | :-------------------------------------------- | :------------------------------- |
| **Volume Spike**      | "Workout volume up 25% vs. 7-day average."    | "Deload suggested for tomorrow." |
| **Poor Sleep**        | "Sleep quality down 2 nights in a row."       | "Focus on hydration today."      |
| **Protein Gap**       | "Consistent 20g protein deficit over 3 days." | "Add a high-protein snack."      |
| **Macro Consistency** | "Best macro adherence in 14 days!"            | "Keep this rhythm."              |

---

## 4. UI States & Fallbacks

### Empty State (No Data)

- **Display:** "Log your first workout or meal to unlock daily coaching."
- **Visual:** Greyscale placeholder card with "Unlock" icon.

### Partial Data / Low Confidence

- **Display:** "Recommendation Pending: More data needed (Weight/Sleep)."
- **Warning:** Yellow "!" icon indicating that the suggestion is less reliable.

### Missing Data Prompts

- Instead of a recommendation, show a "Data Request" card: "How did you sleep last night?" or "What is your current bodyweight?".

---

## 5. "Why This Recommendation?" (Detail Sheet)

When a user taps the directive card, open a detail sheet with:

- **Contributing Factors:** List of data points used (e.g., Yesterday's RPE, Sleep Duration, Macro Adherence).
- **Engine Logic Explanation:** 1-2 sentences of natural language (e.g., "We're suggesting a deload because your fatigue signals are high while your volume has peaked.")
- **Data Completeness Meter:** Visual bar showing how much of the "Ideal" daily data was available for this calculation.

---

## 6. Constraints & Rules

- **Non-Duplication:** The UI must not recalculate formulas found in the Engine.
- **No Invention:** If the Engine returns `null` for a field, the UI must hide that field, not guess.
- **Mobile First:** Ensure the directive card is fully visible without scrolling on standard viewports (390x844).
- **Interactivity:** Every element of the recommendation (Training, Nutrition, Recovery) should link to its respective full view.
