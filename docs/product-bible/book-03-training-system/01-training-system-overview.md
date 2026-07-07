# Training System Overview

## System Purpose

FitCore's training system should help the user start the right workout, log it quickly, preserve set-level data, compare today against previous performance, adapt to soreness/readiness/pain, explain what changed, recommend useful next steps, and prevent bad training decisions when the user is tired, sore, or injured.

The system should answer practical questions:

- What workout should I do today?
- What exercise should I start with?
- How much weight should I use?
- How many sets should I do?
- Should I push harder or back off?
- Why did performance change?
- What muscles are getting too much or too little work?
- Should this exercise be substituted?
- Is this pain, soreness, or fatigue important?
- What should change next time?

## Core Training Modules

| Module | Purpose | Example Inputs | Example Outputs | Status |
| :----- | :------ | :------------- | :-------------- | :----- |
| Training Goals | Define what training is trying to improve. | Strength goal, hypertrophy goal, injury limitation, schedule constraint. | Training priority, target volume, progression bias. | Planned |
| Workout Plan | Represent what the user is expected to train. | Program day, AI recommendation, user-selected routine. | Planned exercises, target sets, target reps, ordering. | Partial |
| Workout Templates | Save reusable workout structures. | Finished workout, named routine, exercise order. | Reusable template, planned set structure. | Planned |
| Active Workout Session | Guide the user while training. | Selected plan, manual start, substitutions, logged sets. | Live workout state, completed workout record. | Partial |
| Exercise Library | Keep exercise identity consistent. | Exercise names, aliases, muscles, equipment. | Exercise options, substitutions, history grouping. | Planned |
| Set Logger | Preserve set-level performance data. | Weight, reps, set type, RPE/RIR, notes, modifiers. | Logged set, volume inputs, performance history. | Partial |
| Previous Performance Layer | Show relevant history while logging. | Last session, recent average, best recent set, notes. | Quiet context, suggested starting point, comparison. | Planned |
| Progression Engine | Recommend smarter next steps. | History, readiness, pain, RPE/RIR, goals. | Load/reps/set suggestion, deload cue, explanation. | Planned |
| Substitution Engine | Help replace exercises safely and usefully. | Equipment limits, pain, preference, fatigue, AI suggestion. | Replacement exercise, preserved original plan, reason. | Planned |
| Recovery and Readiness Integration | Connect training to sleep, soreness, nutrition, and fatigue. | Recovery check-ins, sleep, notes, nutrition adherence. | Adjusted training intensity, caution, next action. | Planned |
| Pain and Injury Awareness | Prevent generic training advice from overriding pain signals. | Pain note, injury limitation, severity, affected movement. | Caution, substitution, reduced intensity, safety routing. | Planned |
| Muscle Volume Tracker | Estimate training stress by muscle group. | Completed sets, exercise muscles, modifiers, substitutions. | Weekly volume, undertrained/overworked cues. | Planned |
| Exercise Notes and Feedback | Preserve qualitative context. | "Too heavy", "felt great", form note, equipment note. | AI context, future suggestion adjustment, history note. | Planned |
| Post-Workout Summary | Turn a completed session into useful feedback. | Completed sets, skipped exercises, notes, flags. | Summary, PRs, signals, save-as-template option. | Planned |
| AI Training Coach | Explain and recommend training actions. | Goals, history, readiness, notes, pain, nutrition. | Recommendation, reason, confidence, watch-out, next action. | Planned |
| Progress Analytics | Show trends without misleading comparisons. | Set history, volume, PRs, templates, readiness. | Charts, trend labels, muscle balance, insights. | Planned |

## Training System Loop

The desired loop is:

Plan workout -> start workout -> show current exercise -> log sets -> compare to previous performance -> capture notes/pain/fatigue -> summarize workout -> update progress/recovery/readiness -> recommend next adjustment.

1. Plan workout: FitCore starts from a template, program day, AI suggestion, or manual user choice.
2. Start workout: The app creates an active session that keeps planned data distinct from actual logged data.
3. Show current exercise: The current exercise is visually obvious and opened by default.
4. Log sets: The user records weight, reps, completion, modifiers, notes, and optional intensity data with low friction.
5. Compare to previous performance: FitCore shows relevant history quietly so the user can decide what to attempt.
6. Capture notes/pain/fatigue: Qualitative signals are saved and routed to recovery, readiness, safety, and AI context.
7. Summarize workout: The user sees what happened, what changed, what was skipped/substituted, and any signals worth reviewing.
8. Update progress/recovery/readiness: Logged training data flows into charts, muscle volume, readiness, and future planning.
9. Recommend next adjustment: FitCore explains one useful next training action.

## Connected Training Rule

Training data must flow across the app. No useful training signal should be trapped on one screen.

Examples:

- A logged set should update exercise history, workout summary, muscle volume, progress charts, and AI recommendations.
- A knee pain note should affect exercise recommendations, readiness, safety warnings, substitutions, and future lower-body planning.
- A failed set should affect progression recommendations and fatigue interpretation.
- A skipped exercise should affect weekly volume and next workout planning.
- A user note that "this felt too heavy" should influence future load suggestions.
- A user note that "this felt great" should be available to the AI when planning progression.

## Training Inputs

FitCore training inputs may include:

- Planned workout.
- Selected template.
- Manual workout start.
- AI-suggested workout.
- Exercise selection.
- Set weight and reps.
- RPE or RIR.
- Set type.
- Rest time.
- Side-specific performance.
- Soreness.
- Pain.
- Fatigue.
- Warmup quality.
- User notes.
- Previous performance.
- Wearable readiness or sleep if available.
- User schedule constraints.

## Training Outputs

FitCore training outputs should include:

- Completed workout summary.
- Exercise performance history.
- Estimated volume.
- Muscle group volume.
- Progression recommendations.
- Substitution suggestions.
- Recovery impact.
- Readiness impact.
- Pain or injury flags.
- Future training adjustments.
- AI explanation.
- Charts and analytics inputs.

## Training Architecture Values

- Mobile-first active workout use.
- Low-friction logging.
- Current exercise always obvious.
- Previous performance visible but not distracting.
- Set-level accuracy.
- Fast edit/correction.
- Notes should matter.
- Pain should not be ignored.
- AI should explain recommendations.
- Logged data should transfer everywhere relevant.
- Workout flow should support both planned and spontaneous training.
- User remains in control.

## Training System Anti-Patterns To Avoid

- Logging sets that do not update progress charts.
- Asking the user to enter the same workout data twice.
- Hiding previous performance.
- Using generic progression rules without considering readiness.
- Ignoring pain notes.
- Treating soreness and injury pain the same.
- Losing notes after workout completion.
- Making active workout screens too crowded.
- Showing too many AI suggestions during a workout.
- Letting skipped or substituted exercises disappear from history.
- Failing to explain why a recommendation changed.
- Treating every failed set as weakness instead of possible fatigue or recovery issue.

