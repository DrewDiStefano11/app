# 06 - Recovery-Aware Training and Nutrition

The primary value of collecting recovery data is to make intelligent, contextual adjustments to the user's training and nutrition plans. FitCore is a dynamic system that adapts to the user's current state.

## How Recovery Affects Training Readiness

The Daily Decision Engine uses the Readiness Score (Chapter 3) and specific subjective signals (Chapter 4) to modify the planned workout (Book 3).

### When to Modify

FitCore should suggest modifications when:

- **Systemic Fatigue is High:** (Low Readiness Score, poor sleep, high stress).
- **Local Soreness is Severe:** (User reports specific muscle groups are highly fatigued).
- **Time or Energy is Limited:** (User explicitly states they have less time or energy today).

### Types of Modifications

Instead of a binary "train or don't train," FitCore offers nuanced adjustments:

1.  **Reduce Volume:** Drop a set from every exercise, or remove accessory movements entirely.
2.  **Reduce Intensity:** Suggest lower weights (lower RPE) for the planned rep ranges.
3.  **Exercise Substitution:** If the lower back is heavily fatigued, swap Barbell Squats for Leg Extensions or Leg Press.
4.  **Change Session Goal:** Shift a heavy lifting day to a mobility, active recovery, or light cardio session.
5.  **Rest Day:** Suggest taking a full rest day if systemic fatigue is critical or illness is suspected.

## How Recovery Affects Nutrition Advice

Recovery context also influences nutrition coaching (Book 4), primarily through the AI Assistant (Jarvis).

### Contextualizing Adherence

- **Poor Sleep & Cravings:** If a user reports poor sleep and then overeats carbohydrates, Jarvis should connect the two: _"It's normal to crave carbs after a night of poor sleep. Let's aim to get to bed earlier tonight to help regulate your appetite tomorrow."_
- **High Fatigue:** May warrant a slight increase in caloric intake (if aligned with long-term goals) to aid recovery.

### Actionable Nutrition Advice

- **Hydration:** If HRV is low or muscle soreness is exceptionally high, Jarvis should proactively emphasize hydration.
- **Protein Context:** If severe DOMS (soreness) is reported, FitCore should verify that the user is hitting their protein targets to facilitate repair.

## Avoiding Extreme Recommendations

FitCore must maintain a steady course. Recovery data should act as a gentle steering mechanism, not cause erratic swings in programming.

- Do not slash weekly training volume by 50% due to one bad night of sleep.
- Do not drastically alter macro targets daily based on minor fluctuations in resting heart rate.
- Recommendations should be framed as _options_ ("You look fatigued; consider dropping a set today") rather than absolute mandates, keeping the user in control.

## Integration with Briefings

Recovery context is surfaced at key touchpoints defined in Book 5:

- **Morning Briefing:** "Your sleep was solid, but HRV is slightly down. See how you feel during your warm-up."
- **Workout Readiness Briefing (Pre-Workout):** "You reported your hamstrings are still sore. I've suggested swapping RDLs for Leg Curls today. Does that sound good?"
- **Post-Workout Recap:** "You pushed hard today. Focus on hydration and aim for 8 hours of sleep to recover."

## Open Questions

- What are the precise algorithmic thresholds for suggesting a volume reduction vs. a full rest day?
- How aggressively should FitCore suggest exercise substitutions based on localized soreness? (e.g., auto-suggesting vs. just highlighting the sore area and letting the user decide).
