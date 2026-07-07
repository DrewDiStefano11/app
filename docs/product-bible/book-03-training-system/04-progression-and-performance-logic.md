# Progression And Performance Logic

## Purpose

Progression logic should help FitCore recommend smarter training changes without blindly increasing weight.

Progression should consider:

- Previous performance.
- Target reps.
- Target sets.
- RPE/RIR.
- Readiness.
- Soreness.
- Pain.
- Sleep.
- Nutrition.
- User goal.
- Recent volume.
- Missed workouts.
- Exercise type.
- User feedback.

Status: Planned.

## Progression Principles

- Progression should be explainable.
- Progression should not only mean adding weight.
- Progression can include more reps, more sets, better form, better range of motion, shorter rest, slower tempo, or easier pain-free performance.
- AI should avoid aggressive progression when readiness is low or pain is present.
- A single bad day should not cause overreaction.
- A trend matters more than one workout.
- User feedback should matter.

## Types Of Progression

| Progression Type | Example | Best Used For | Risks |
| :--------------- | :------ | :------------ | :---- |
| Weight increase | Move from 185 lb to 190 lb. | Stable lifts with completed target reps. | Too aggressive when recovery is low or pain is present. |
| Rep increase | Keep 50 lb dumbbells and add one rep per set. | Dumbbells, isolation lifts, conservative progress. | Can become junk volume if form degrades. |
| Set increase | Add a fourth working set. | Hypertrophy blocks or undertrained muscles. | Recovery cost may exceed benefit. |
| Volume increase | Add more total hard work across the week. | Muscles below target volume. | May worsen soreness or stall recovery. |
| Density/rest-time improvement | Same work with shorter rest. | Conditioning, time-efficient training. | Can reduce strength output and confuse load comparisons. |
| Form improvement | Same weight with cleaner reps. | Technique-limited movements. | Hard to quantify without notes or video. |
| Range of motion improvement | Deeper squat or fuller curl. | Mobility or technique goals. | Misleading if compared directly to shorter-range sets. |
| Tempo control | Slower eccentric at same load. | Hypertrophy, control, rehab/prehab. | Makes load/reps comparisons less direct. |
| Pain-free progression | Same work with lower pain or discomfort. | Return-to-training and rehab-like contexts. | Should avoid implying medical treatment or diagnosis. |
| Consistency progression | Complete planned sessions for multiple weeks. | Habit rebuilding, busy schedules. | Should not pressure user into training through concerning symptoms. |

## Exercise-Specific Progression

Progression may differ by exercise type:

- Compound barbell lifts may progress slower and need more readiness context.
- Dumbbell lifts may use smaller jumps or rep progression.
- Machines may allow more stable progression but can vary by machine.
- Cables may require equipment-specific context.
- Bodyweight exercises may progress through reps, assistance, load, tempo, or range.
- Unilateral movements may need side-specific tracking.
- Isolation exercises may use smaller jumps, rep targets, or form quality.
- Rehab/prehab movements should prioritize pain-free quality over load.
- Cardio/conditioning may progress duration, intensity, distance, intervals, or perceived effort.

Status: Planned.

## Previous Performance Comparison

FitCore should compare today's workout to:

- Last time the exercise was performed.
- Recent average.
- Best recent performance.
- All-time PR if relevant.
- Same workout template if available.
- Same rep range if possible.

It should avoid misleading comparisons.

Examples:

- Comparing a warmup set to a working set is misleading.
- Comparing partial reps to full reps is misleading.
- Comparing a set done at RPE 10 to a set done at RPE 7 may need context.
- Comparing a machine exercise across different machines may be uncertain.
- Comparing post-injury performance to pre-injury PRs may need caution.

Status: Planned.

## Performance Interpretation

FitCore may interpret performance as:

- Improving.
- Stable.
- Stalling.
- Regressing.
- Under-recovered.
- Pain-limited.
- Fatigue-limited.
- Nutrition-limited.
- Sleep-limited.
- Inconsistent data.
- Insufficient history.

The AI should explain why it picked an interpretation and identify the source data used.

Status: Planned.

## Suggested Weight/Reps Logic

Desired behavior:

- Suggestions should be based on previous performance and current readiness.
- Suggestions should show confidence.
- Suggestions should not overwrite user control.
- Suggestions should be easy to ignore or edit.
- If data is missing, suggestions should be conservative or ask for user preference.
- Pain notes should lower aggressiveness.
- Fatigue or poor sleep should lower aggressiveness.
- Strong performance and good recovery may support progression.

Status: Planned.

## Stalling And Deload Logic

- A stall should not be declared from one bad workout.
- Repeated misses may suggest a stall.
- High fatigue, poor sleep, pain, or high soreness may suggest a recovery issue instead of lack of progress.
- Deload suggestions should be explainable.
- Deload does not always mean no training.
- Deload may mean reduced volume, reduced intensity, exercise substitution, or technique focus.

Status: Planned.

## PR And Achievement Logic

PRs should be meaningful and contextual.

Separate PR types:

- Weight PR.
- Rep PR.
- Volume PR.
- Estimated 1RM PR.
- Consistency PR.
- Pain-free PR.
- Post-injury PR.

Rules:

- Avoid celebrating misleading PRs from partial reps, bad form notes, or accidental entries.
- User should be able to correct/remove false PRs.
- PRs should include enough context to explain why they count.

Status: Planned.

## Muscle Volume And Balance

- FitCore should track volume by muscle group when possible.
- Volume should account for primary and secondary muscles carefully.
- Volume should avoid pretending exact muscle stimulus is perfectly known.
- AI should identify undertrained or overworked areas cautiously.
- Muscle heatmaps/charts should connect to workout data.
- Left/right imbalance may be tracked in future when unilateral data exists.

Status: Planned.

## AI Progression Recommendation Format

AI progression recommendations should use a clear, explainable format:

Recommendation:
Increase dumbbell bench by 5 lb next time or aim for 1 extra rep per set.

Reason:
You completed all planned sets at the target reps and reported RPE below 8.

Confidence:
Medium-high.

Watch-out:
Sleep was slightly low, so stop if reps slow down.

Source data:
Last two dumbbell bench sessions, today's RPE, current readiness.

Next action:
Start with the same warmup, then attempt the new target on working sets.

Status: Planned.

## Progression Anti-Patterns To Avoid

- Always adding weight regardless of recovery.
- Ignoring pain.
- Comparing different set types as if identical.
- Treating AI estimates as certain.
- Overreacting to one bad workout.
- Celebrating accidental data as PRs.
- Hiding why a recommendation changed.
- Recommending max effort too often.
- Ignoring user goal.
- Using bodyweight changes without context.
- Treating soreness as always bad.
- Treating soreness as always good.

## Progression Acceptance Criteria

- Docs define progression beyond weight increases.
- Docs require explainable recommendations.
- Docs include readiness/pain/soreness context.
- Docs define performance interpretations.
- Docs define PR types.
- Docs explain stalling/deload caution.
- Docs define AI recommendation format.
