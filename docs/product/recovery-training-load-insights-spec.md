# Recovery & Training Load Insights Spec

## Purpose

Provide users with a clear understanding of their current physical state and how their recent training, nutrition, and lifestyle are impacting their readiness to perform.

## Product Rule Alignment

- **Explain What Changed:** Directly links high volume or poor nutrition to current fatigue.
- **Help User Decide What to Do Next:** Recommends whether to push, pull back, or rest.
- **Connectivity:** Bridges the gap between training logs, recovery signals, and nutrition.

## User Problems Solved

- "I feel tired but I don't know if I should push through or take a rest day."
- "My strength is dropping, and I don't know why."
- "I'm sore in my legs, but I had squats planned today. What's the best pivot?"

## Required Input Signals

- **Soreness:** Muscle-group specific ratings (0-10).
- **Tiredness:** General perceived fatigue (0-10).
- **Sleep:** Duration and perceived quality (from check-ins or notes).
- **Workout Volume:** Total sets/reps and tonnage trends.
- **Exercise Intensity:** Average RPE (Relative Perceived Exertion) or % of 1RM.
- **Muscle Group Fatigue:** Calculated based on volume per muscle group over a rolling 48-72h window.
- **Recent Deloads:** Proactive tracking of intentionally reduced volume weeks.
- **Missed Workouts:** Gaps in the planned training schedule.
- **Performance Changes:** Deviation from expected strength/reps in key movements.
- **Nutrition:** Caloric surplus/deficit and protein intake trends.
- **Notes:** Automated extraction of "pain", "soreness", "injury" from session notes.

## Decision Logic

1. **The "Green Light" (Ready):** Low soreness, low tiredness, sleep > 7h, calories on target. Action: Train as planned or push for PRs.
2. **The "Yellow Light" (Caution):** Moderate soreness (4-6) or poor sleep (1 night). Action: Maintain volume but keep RPE < 8; or swap specific sore muscle groups.
3. **The "Red Light" (Recover):** High soreness (>7), high tiredness, or multi-day caloric deficit. Action: Forced rest day or active recovery (walking/mobility).
4. **The "Nutrition Limiter":** If recovery is low and calories are < 90% of target, prioritize "Nutrition Under-eating" as the primary cause.

## Confidence/Provenance Behavior

- **Explicit Labeling:** If recommendations are based on unconfirmed AI sleep estimates or brief notes, label as: "Recommendation based on estimated data. Confirm logs for higher accuracy."
- **Source Tracking:** Distinguish between "User Reported Soreness" and "Calculated Volume Fatigue."

## UI Behavior

- **Explain the Why:** "Your readiness is 65% because your training volume increased by 20% this week while sleep decreased."
- **Visual Heatmap:** Update the body heatmap to show "Active Fatigue" vs. "Long-term Development."
- **Actionable Summary:** One clear sentence: "Today: Train light upper body; tomorrow: rest."

## Jarvis Behavior

- **Proactive Warnings:** "I noticed you mentioned 'knee pain' in your last two workouts. Should we swap today's Lunges for a low-impact alternative?"
- **Contextual Explanations:** When a user asks "Why am I so tired?", Jarvis synthesizes volume, sleep, and nutrition data into a 3-point summary.

## Guardrails

- **No Medical Diagnosis:** Never say "You have tendonitis." Say "You reported high localized soreness; consider reducing intensity."
- **Sustainability:** Do not recommend "Pushing through" high fatigue/pain scores.

## Future Implementation Checklist

- [ ] Implement `TrainingLoad` calculator (Volume \* Intensity).
- [ ] Build the "Recovery Check-in" UI (Soreness/Tiredness sliders).
- [ ] Develop the signal synthesis logic (Readiness Score).
- [ ] Create "Recovery Bottleneck" UI cards (e.g., "Protein is too low").
- [ ] Map exercise substitutions based on muscle-group soreness.
- [ ] Build the "One Action to Improve Tomorrow" generator.
