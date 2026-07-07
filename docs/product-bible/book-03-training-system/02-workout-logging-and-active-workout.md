# Workout Logging And Active Workout

## Active Workout Purpose

The active workout screen should be optimized for fast use while training.

It should help the user:

- Know what exercise is current.
- Log sets quickly.
- See previous performance.
- Apply set modifiers.
- Add notes.
- Flag pain or discomfort.
- Substitute exercises.
- Finish the workout cleanly.
- Save useful data for future recommendations.

## Active Workout Layout Principles

| Requirement | Status |
| :---------- | :----- |
| Each exercise should appear as an expandable card. | Planned |
| Exercise cards should start closed by default. | Planned |
| The current exercise should open automatically. | Planned |
| When an exercise is completed, it should close automatically. | Planned |
| A completed closed exercise card should show useful summary stats. | Planned |
| The next exercise should open automatically. | Planned |
| The user should still be able to manually expand or collapse cards. | Planned |
| The interface should avoid making the workout feel like a long form. | Planned |
| The current exercise should be visually obvious. | Planned |
| Logged data should be easy to review before finishing. | Planned |

## Exercise Card States

| State | Behavior | Visible Information | User Actions |
| :---- | :------- | :------------------ | :----------- |
| Not Started | Card is closed unless manually opened. | Exercise name, planned sets/reps, equipment, status. | Open, reorder if allowed, substitute, skip. |
| Current | Card opens automatically and becomes the focus. | Planned sets, logged sets, previous performance, set inputs, notes. | Log set, copy previous performance, add modifier, flag pain, substitute, complete. |
| In Progress | Card remains open while some sets are logged. | Completed sets, remaining planned sets, rest timer if available. | Edit set, add set, mark set complete, add note, finish exercise. |
| Completed | Card closes automatically by default. | Sets completed, top set, total volume, best reps, pain flag, note indicator, comparison to previous performance. | Reopen, edit, add note, mark needs review. |
| Skipped | Card remains in the workout record. | Original exercise, skipped status, optional reason. | Add reason, unskip, substitute. |
| Substituted | Original plan and replacement are both visible. | Original exercise, actual exercise, reason, completed set summary. | Edit reason, change replacement, review history impact. |
| Needs Review | Card is flagged because data may be incomplete or unusual. | Missing values, unusual load, pain flag, AI-assisted entry, correction cue. | Correct, confirm, add note, dismiss review. |

## Current Exercise Behavior

- Current exercise opens automatically. Status: Planned.
- Previous performance should be visible inside the current exercise. Status: Planned.
- Previous performance should be visually secondary, such as grayed/quiet. Status: Planned.
- The user should be able to copy or use previous performance as a starting point. Status: Planned.
- The user should see planned sets and actual logged sets clearly. Status: Planned.
- The UI should avoid confusion between planned and completed sets. Status: Planned.

## Previous Performance Display

The previous performance layer should show relevant prior data, such as:

- Last performed date.
- Previous weight/reps.
- Previous top set.
- Previous working sets.
- Previous RPE/RIR if available.
- Previous notes.
- Previous pain flags.
- Previous substitution if applicable.

Rules:

- Previous performance should help logging, not clutter the screen.
- Previous performance should be visually secondary.
- Previous performance should not overwrite today's values unless the user chooses to copy it.
- AI may use previous performance for suggested weights/reps, but suggestions must be clearly labeled.
- Status: Planned.

## Set Logging

Each set should support:

- Weight.
- Reps.
- Completed/not completed.
- RPE or RIR if available.
- Rest time if available.
- Set note.
- Set type.
- Side-specific values when applicable.
- Pain/discomfort flag.
- AI suggestion flag if AI-assisted.

Status: Partial. Existing product docs describe the desired behavior, but future implementation must verify actual runtime support before marking individual fields as `Implemented`.

## Set Modifier Buttons

FitCore should support these buttons or structured flags:

- Warmup.
- Drop Set.
- Unilateral.
- Failure.
- Partials.

Requirements:

- Each modifier should work. Status: Planned.
- The user should be able to apply a modifier to one specific set. Status: Planned.
- The user should be able to apply a modifier to the whole exercise when appropriate. Status: Planned.
- It should be visually clear whether a modifier applies to a set or the full exercise. Status: Planned.
- Modifiers should be saved as structured data, not only as text notes. Status: Planned.
- Modifiers should be available later for progress analysis and AI interpretation. Status: Planned.

Examples:

- Warmup set should not be treated the same as a working set for progression.
- Drop set should count toward volume but be interpreted differently.
- Failure set should inform fatigue and recovery.
- Unilateral set may need side-specific tracking.
- Partials should not be treated exactly like full reps.

## Planned Vs Actual Workout

- Planned workout data and actual completed data should be distinct. Status: Planned.
- Skipped exercises should remain visible in the workout record. Status: Planned.
- Substituted exercises should preserve both original planned exercise and actual completed exercise. Status: Planned.
- Changed weights/reps should not erase the plan. Status: Planned.
- The AI should be able to compare what was planned vs what happened. Status: Planned.

## Exercise Substitutions

The user should be able to substitute an exercise during the workout. FitCore should preserve the original planned exercise, record the replacement exercise, and optionally capture a reason.

Common reasons:

- Equipment unavailable.
- Pain.
- Preference.
- Time constraint.
- Fatigue.
- Gym crowding.
- AI suggestion.

Substitutions should affect future planning. Status: Planned.

## Plate Calculator

The plate calculator should:

- Be available where weight entry happens.
- Stay compact.
- Avoid cluttering the workout screen.
- Support quick loading decisions.
- Use the target weight and available bar/plate assumptions if configured.
- Be optional for users who do not need it.

Status: Planned.

## Notes During Workout

FitCore should preserve these note types:

- Exercise note.
- Set note.
- Workout note.
- Pain note.
- Fatigue note.
- Substitution note.
- Form note.
- Equipment note.

Rules:

- Notes should not be wasted.
- Notes should flow into AI context where relevant.
- Pain, tiredness, soreness, fatigue, discomfort, or injury-related notes should influence recovery/readiness/safety systems.
- Notes should remain available in workout history.
- Notes should be summarized in the post-workout summary.
- Status: Planned.

## Finish Workout Summary

The finish workout summary should include:

- Workout duration.
- Exercises completed.
- Exercises skipped.
- Exercises substituted.
- Total sets.
- Estimated volume.
- Top sets.
- PRs if applicable.
- Performance changes.
- Soreness/pain flags.
- User notes.
- Optional final reflection.
- Save as template option.
- AI summary if available.

Status: Planned.

## Optional Finish Notes

The user should be able to add optional notes before finishing.

Notes may include what felt good, what felt bad, pain, soreness, fatigue, motivation, energy, pump, form issues, or equipment issues.

If the notes mention pain, tiredness, soreness, fatigue, discomfort, injury, poor sleep, or other tracked signals, FitCore should route those signals into the relevant recovery/readiness/training safety systems.

AI should consider these notes in future recommendations. The app should not bury the notes as dead text.

Status: Planned.

## Save Workout As Template

After finishing, the user should be able to save the workout as a template.

Requirements:

- The user should be able to name the template.
- Saved template should preserve exercise order and planned structure.
- The user should be able to choose whether to include exact weights/reps or save only exercise/set structure.
- Template should not accidentally include one-time pain/fatigue notes as permanent instructions unless the user chooses to include notes.

Status: Planned.

## Active Workout Acceptance Criteria

- Exercise cards can open/collapse.
- Only current exercise opens automatically by default.
- Completed exercises close and show summary stats.
- Set modifiers work at set and exercise level.
- Previous performance is visible but secondary.
- Finish summary includes optional notes.
- Pain/soreness/fatigue notes are routed to relevant systems.
- Save as template option exists.
- Planned vs actual differences are preserved.
