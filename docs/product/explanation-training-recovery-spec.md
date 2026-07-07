# Explanation Specs: Training & Recovery

## Purpose

Define the standard for how FitCore explains its recommendations to the user.

## Product-Rule Alignment

- **Explain changes:** Don't just change a number; say why.
- **Improved data trust:** Cite specific logs (e.g., "Based on your 3rd set of Squats yesterday...").
- **Help user decision-making:** Provide context so users can choose to override AI suggestions safely.

## Training Recommendation Explanations

When suggesting weight/reps/exercises:

- **Primary Factor:** Current fatigue, recovery signals, or previous performance.
- **Context:** "You've hit this weight for 8 reps in the last 2 sessions."
- **Modifier:** "Reduced due to reported knee pain."

## Recovery Limiter Explanations

When calculating readiness or training load:

- **Sleep:** "4h sleep is 50% below your goal."
- **Stress:** "High reported stress is impacting CNS recovery."
- **Soreness:** "Localized soreness in Chest suggests avoiding heavy pressing today."
- **Fatigue:** "General fatigue is high; consider a deload session."

## UI Patterns

- **"Why?" Tooltips:** Small info icon next to AI suggestions.
- **Insight Cards:** Dedicated dashboard cards for major limiters.
- **Jarvis Summary:** Jarvis voice/text should prioritize these explanations in its responses.

## Acceptance Criteria

- Every training suggestion has an associated "reason" field in the logic.
- UI displays this reason when the user interacts with the suggestion.
- Explanations are factual and data-driven, avoiding "hallucinated" coaching advice.

## Future Checklist

- [ ] Implement "Limiter" icons in the Training view.
- [ ] Add "What data was used?" link to all DDE insights.
- [ ] Create a "Recovery Timeline" view showing how signals have trended against load.
