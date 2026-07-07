# AI Context and Memory

Status: `Planned`

FitCore AI should be more than a chatbot. It should act as a contextual coach and decision assistant that helps the user log faster, understand change, connect data, and decide what to do next.

## AI Role in FitCore

The AI should help the user:

- Log faster.
- Understand trends.
- Compare today to previous days or weeks.
- Connect training, food, recovery, and progress.
- Make one clear next decision.
- Understand why a recommendation was made.

The AI should support the Daily Decision Engine rather than replacing user control.

## AI Context Types

| Context Type        | Time Range                                               | Examples                                                                                                      | How AI Should Use It                                                              | Risk                                                                     |
| :------------------ | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| Short-term context  | Today, current session, current conversation.            | Today's logs, current workout, recent meals, current soreness or pain, current goal focus.                    | Guide immediate logging, answer current questions, adjust today's recommendation. | Treating incomplete same-day data as a full picture.                     |
| Medium-term context | Usually the last 7 days or current training block slice. | Recent workouts, sleep trends, nutrition adherence, weight trend, soreness/pain pattern, performance changes. | Explain what changed, detect likely causes, avoid overreacting to one entry.      | Overweighting stale or sparse data.                                      |
| Long-term memory    | Persistent user context across weeks, months, and years. | Goals, preferences, recurring limitations, injuries, equipment, common foods, training style, feedback.       | Personalize recommendations and reduce repeated setup.                            | Using sensitive or old context without user control or freshness checks. |

## What the AI Should Know

The AI may use:

- User goals.
- Current training plan.
- Recent workouts.
- Previous performance.
- Nutrition targets.
- Meal history.
- Sleep trends.
- Soreness trends.
- Pain or injury limitations.
- Body weight trend.
- Body composition trend if available.
- User preferences.
- Schedule constraints.
- Equipment access.
- Previous recommendations.
- User feedback.
- Notes from workout summaries.
- Notes from check-ins.

## What the AI Should Not Do

The AI should not:

- Treat estimates as facts.
- Ignore uncertainty.
- Hide why it made a recommendation.
- Use sensitive data without clear user control.
- Assume missing data means everything is fine.
- Give medical diagnosis.
- Override user-reported pain.
- Recommend unsafe training through pain.
- Make large plan changes without explaining why.
- Use old context as if it is current.
- Forget user corrections when they matter.
- Invent data that was never logged.

## Uncertainty and Missing Data

The AI should clearly explain when recommendations are based on:

- Estimated food data.
- Missing sleep data.
- Incomplete workout history.
- Stale wearable sync.
- Conflicting subjective and wearable data.
- Low-confidence photo estimates.
- Limited check-ins.
- User-provided notes.

Example language:

- "This recommendation is based mostly on your soreness check-in because sleep data is missing."
- "Your food total may be off because lunch was photo-estimated with low confidence."
- "I am lowering intensity because you reported knee pain, even though your sleep looked good."

## Memory Control

Status: `Planned`

FitCore should provide memory controls that let the user understand and manage what AI can remember.

Planned memory controls:

- AI memory can be toggled by category.
- User can review what the AI remembers.
- User can delete specific memories if supported.
- User can disable memory for sensitive categories.
- Sensitive data can be local-only unless approved for cloud sync.
- The AI should be able to explain why it knows something.
- The app should support full export.
- The app should support full deletion with confirmation.

| Memory Category          | Example                                                | Default Sensitivity | User Control Needed                                   | Status    |
| :----------------------- | :----------------------------------------------------- | :------------------ | :---------------------------------------------------- | :-------- |
| Goals                    | Cut to a target weight, build strength, improve sleep. | Medium              | Review, edit, delete, disable AI use.                 | `Planned` |
| Preferences              | Short workouts, disliked exercises, preferred foods.   | Medium              | Review, edit, delete.                                 | `Planned` |
| Training history         | Exercises, sets, performance trends, substitutions.    | Medium              | Export, delete, restrict AI use.                      | `Partial` |
| Nutrition patterns       | Common meals, macro adherence, corrections.            | Medium              | Review, delete, disable learning.                     | `Planned` |
| Recovery patterns        | Sleep, soreness, fatigue, stress.                      | High                | Review, delete, restrict AI use.                      | `Planned` |
| Injuries and limitations | Knee pain, shoulder history, movement restrictions.    | High                | Explicit review, edit, delete, cautious use.          | `Planned` |
| Medical information      | Conditions, medications, allergies, surgeries.         | Very high           | Explicit consent, category toggle, delete/export.     | `Future`  |
| Photos/body images       | Meal photos, progress photos, body images.             | Very high           | Explicit consent, local/cloud control, delete/export. | `Planned` |
| Conversations            | AI chat history and user corrections.                  | High                | Review, delete, disable memory.                       | `Partial` |
| Wearable data            | Sleep, heart rate, steps, recovery metrics.            | High                | Provider control, sync control, delete/export.        | `Planned` |
| Coach feedback           | Notes from coach/pro mode or external guidance.        | High                | Review, source visibility, delete/export.             | `Future`  |

## Sensitive Data Handling

These categories need extra caution:

- Medical history.
- Injuries.
- Medications.
- Allergies.
- Surgeries.
- Blood type.
- Health conditions.
- Genetics.
- Body images.
- Meal photos.
- Progress photos.
- Conversations.
- Health records.
- Wearable health metrics.

FitCore should avoid unnecessary exposure, preserve user control, and be transparent about use. This is product philosophy, not a legal compliance definition.

## "Why Do You Know This?"

Status: `Planned`

The AI should support source transparency. The user should be able to ask:

- "Why do you know this?"
- "Where did that recommendation come from?"
- "What data caused this?"
- "Did you use my injury history?"
- "Are you using my photos?"
- "Is this from my wearable or from something I typed?"

The AI should be able to answer with sources such as:

- Workout log from a specific date.
- User check-in.
- Imported sleep data.
- Meal photo estimate.
- User correction.
- Stated preference.
- Previous AI recommendation.
- Saved goal.
- Injury limitation.

## AI Recommendations

AI recommendations should usually include:

- Recommendation.
- Reason.
- Confidence.
- Source data used.
- What would change the recommendation.
- One clear next action.

Example:

Recommendation:
Train upper body today at moderate intensity.

Reason:
Lower-body soreness is still high and knee pain was noted after the last leg workout.

Confidence:
Medium, because sleep data is missing.

Sources:

- Last workout summary.
- Soreness check-in.
- Knee pain note.

Next action:
Avoid heavy squats today and choose upper-body training.

## Feedback Loop

Status: `Planned`

User feedback should improve future AI recommendations without forcing the user to repeat themselves.

Examples:

- User says a workout felt too hard.
- User says a recommendation was helpful.
- User corrects a meal estimate.
- User says an exercise caused pain.
- User says they prefer shorter workouts.
- User says they are cutting, bulking, or maintaining.
- User says they are busy or traveling.

FitCore should treat feedback as context with source, time, and scope. A one-time travel constraint should not become a permanent training preference unless the user confirms it.

## Safety Boundaries

Product-level safety principles:

- Pain and injury notes should affect recommendations.
- AI should not diagnose medical issues.
- Concerning symptoms should trigger a recommendation to seek appropriate medical care.
- The app should distinguish discomfort, soreness, pain, and red flags where possible.
- The AI should not encourage training through sharp pain.
- The AI should be cautious when data is incomplete.
- The user should remain in control.

## AI Anti-Patterns to Avoid

- Generic coaching that ignores logged data.
- Hiding data sources.
- Using sensitive data without user control.
- Pretending estimates are exact.
- Giving long explanations when the user needs one action.
- Forgetting user corrections.
- Giving recommendations without confidence or context.
- Ignoring pain notes.
- Overreacting to one bad day without trend context.
- Making every answer sound certain.
