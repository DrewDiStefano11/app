# Body Weight And Feedback Loops

## Purpose

FitCore should help the user understand body-weight trends without overreacting to normal daily fluctuations.

Body weight should be interpreted with context:

- Calories.
- Protein.
- Carbs.
- Sodium.
- Hydration.
- Training soreness.
- Sleep.
- Digestion.
- Stress.
- Menstrual cycle if applicable in future.
- Weigh-in timing.
- Goal phase.
- Recent adherence.
- Body-composition data if available.

## Body-Weight Principles

- Trends matter more than single weigh-ins.
- Daily weight changes are not always fat gain or fat loss.
- Carbs, sodium, hydration, soreness, digestion, and timing can affect scale weight.
- AI should avoid shame or blame.
- AI should explain uncertainty.
- Adjustments should usually require enough data.
- Goal phase matters.

## Weigh-In Data

A weigh-in may preserve:

- Date/time.
- Weight.
- Source.
- Scale/device if available.
- Manual vs imported status.
- Confidence.
- Note.
- Weigh-in timing context if available.
- Related body composition if available.
- User correction if edited.

## Body-Composition Data

Body-composition data is `Planned` or `Future` unless the repository later proves otherwise.

Potential fields:

- Body fat estimate.
- Lean mass estimate.
- Muscle mass estimate.
- Waist measurement.
- Progress photos.
- Measurement notes.
- Source/confidence.
- Privacy/sensitivity level.

Body-composition estimates can be noisy and should not be treated as exact.

## Nutrition-To-Weight Feedback Loop

The desired loop is:

Food logs -> daily totals -> weekly averages -> weigh-ins -> trend analysis -> explanation -> recommendation -> user feedback/correction.

This loop should help the user decide whether to:

- Keep calories the same.
- Increase calories.
- Decrease calories.
- Improve protein.
- Improve consistency.
- Wait for more data.
- Check logging accuracy.
- Focus on hydration, sodium, or sleep.

## Weight Trend Windows

- Single-day change should be treated cautiously.
- 7-day average may be useful.
- 14-day or longer trends may be more reliable.
- The app should explain the time window used.
- The app should not make major recommendations from one noisy weigh-in.

## Explaining Weight Changes

Example explanations:

- "Weight is up, but calories were not high enough to suggest fat gain; carbs/sodium and soreness may explain water retention."
- "Weight is flat over two weeks while calories are consistent, so a small calorie adjustment may be reasonable."
- "Weight dropped quickly, but training performance and energy are down, so the deficit may be too aggressive."
- "One high-calorie day does not erase the week; weekly average is still near target."

## Goal-Phase Logic

| Goal Phase | Interpretation Pattern |
| :--------- | :--------------------- |
| Cut | Look for a sustainable downward trend while preserving performance and recovery. |
| Bulk | Look for a controlled upward trend while avoiding unnecessary fat gain. |
| Maintain | Look for stable average and performance/recovery quality. |
| Recomposition | Look beyond scale weight, including performance, measurements, photos, and consistency. |
| Performance focus | Prioritize fueling training and recovery. |
| Recovery focus | Avoid aggressive restriction when recovery is poor. |

## Adjustment Logic

- Adjustments should be explainable.
- Adjustments should usually be based on trends, not single days.
- AI should consider adherence before changing targets.
- If logging is low confidence, AI may recommend improving tracking before changing calories.
- If performance/recovery is suffering, AI should avoid blindly cutting calories.
- Protein may be adjusted separately from calories.

## Weight And Training Connection

- Low calories may affect performance and recovery.
- High training volume may increase hunger and recovery needs.
- Soreness and inflammation may temporarily increase scale weight.
- Weight loss with strength loss may need attention.
- Weight gain with better performance may be acceptable depending on goal.
- AI should connect training and nutrition instead of analyzing weight alone.

## Body-Weight Feedback Anti-Patterns To Avoid

- Treating one weigh-in as a trend.
- Telling user they gained fat from one high day.
- Ignoring sodium/carbs/water/glycogen.
- Changing calories before checking adherence.
- Ignoring training performance.
- Ignoring recovery signals.
- Hiding confidence/completeness issues.
- Making body-composition estimates sound exact.
- Using shame-based coaching.
- Overreacting to normal fluctuation.

## Body-Weight Feedback Acceptance Criteria

- Docs define trend-first interpretation.
- Docs explain nutrition-to-weight feedback loop.
- Docs include goal-phase logic.
- Docs include adjustment caution.
- Docs connect weight to training/recovery.
- Docs avoid single-day overreaction.
- Docs preserve source/confidence for weigh-ins.
