# System Overview

Status: `Planned`

FitCore should operate as a connected daily decision engine. The product is not only a dashboard and not only a logbook. It should connect daily health inputs into useful decisions the user can act on today.

## System Purpose

FitCore should help answer:

- What should I train today?
- Should I push or back off?
- What changed since yesterday?
- What changed since last week?
- What should I eat today?
- What is limiting recovery?
- What is the one thing I should do today to improve tomorrow?

The system should reduce friction, improve trust, explain change, guide decisions, and connect training, nutrition, recovery, body composition, injury, and progress together.

## Core System Modules

| Module | Purpose | Example Inputs | Example Outputs | Status |
| :----- | :------ | :------------- | :-------------- | :----- |
| Logging Inputs | Capture user-entered health and training data with minimal friction. | Workout sets, meals, body weight, soreness, pain, notes, check-ins. | Saved logs, recent activity, updated totals, candidate AI context. | `Partial` |
| Wearable and Imported Inputs | Bring in external signals without treating them as perfect truth. | Sleep, heart rate, steps, calories, device recovery metrics, third-party nutrition data. | Imported records, source labels, completeness warnings, normalized metrics. | `Planned` |
| Goals and Preferences | Store what the user is trying to achieve and how they prefer to train, eat, and recover. | Current goal, schedule, equipment, disliked exercises, diet style, injuries. | Recommendation constraints, plan priorities, personalization context. | `Partial` |
| Data Normalization Layer | Convert raw inputs into consistent values used by product surfaces and calculations. | Raw meal text, imported sleep payloads, workout notes, photo estimates. | Normalized foods, macro estimates, readiness inputs, structured events. | `Planned` |
| Provenance and Source Layer | Preserve where important data came from and how much trust it deserves. | Manual entry, AI estimate, photo, wearable, correction, import timestamp. | Source badges, confidence labels, audit trail, explanation evidence. | `Planned` |
| Daily Decision Engine | Combine current context and recent history into one clear next action. | Workouts, soreness, pain, sleep, nutrition, weight trend, goals, feedback. | Today's training recommendation, intensity guidance, nutrition focus, one action. | `Planned` |
| Training Planner | Recommend and adjust training based on goals, readiness, performance, equipment, and limitations. | Plan, previous sets, soreness, pain, schedule, progression rules. | Workout suggestion, substitutions, volume/intensity guidance, warnings. | `Partial` |
| Nutrition Planner | Help the user understand what to eat today and how food affects goals and recovery. | Meal logs, targets, weight trend, training plan, preferences, corrections. | Macro focus, meal suggestions, adherence notes, weight-change explanations. | `Partial` |
| Recovery Engine | Interpret sleep, soreness, pain, fatigue, stress, and training load. | Check-ins, wearable sleep, recent workouts, pain notes, stress, fatigue. | Readiness note, recovery warning, intensity adjustment, recovery action. | `Partial` |
| Progress Analytics | Explain trends and changes across training, nutrition, recovery, and body composition. | Logs, derived metrics, goals, timelines, events, milestones. | Trend summaries, change explanations, progress cards, likely drivers. | `Partial` |
| AI Coach Explanation Layer | Explain recommendations, uncertainty, sources, and tradeoffs in plain language. | Recommendation context, evidence, confidence, missing data, user questions. | "Why" explanations, source lists, confidence notes, next-step language. | `Planned` |
| Privacy and Control Layer | Give the user control over sensitive data, AI memory, export, deletion, and sync decisions. | Memory categories, photos, medical context, wearable data, consent settings. | Privacy controls, data export, deletion confirmation, AI access limits. | `Planned` |

## Connected System Rule

No major feature should stay isolated. Logged or imported data should flow to every relevant area that can use it responsibly.

Examples:

- A painful knee note after a workout should affect readiness, exercise recommendations, lower-body training suggestions, and future AI coaching.
- A poor sleep night should affect training intensity recommendations, recovery score explanation, and nutrition suggestions.
- A high-calorie day should not only live in nutrition. It should help explain weight change, performance, and recovery.
- A missed workout should affect weekly volume, goal progress, and next workout planning.
- A user correction to AI-estimated macros should improve trust and future food estimates.

## FitCore Decision Loop

FitCore's main loop should be:

`Log/import -> normalize -> preserve source -> analyze change -> explain meaning -> recommend action -> capture feedback -> improve next recommendation`

| Step | Product Meaning | Status |
| :--- | :-------------- | :----- |
| Log/import | The user logs data or FitCore imports it from another source. | `Partial` |
| Normalize | FitCore converts raw input into values useful for calculations and comparison. | `Planned` |
| Preserve source | FitCore keeps the original source, raw value, and confidence where practical. | `Planned` |
| Analyze change | FitCore identifies what changed since yesterday, last week, or the relevant baseline. | `Planned` |
| Explain meaning | FitCore explains why the change matters for training, nutrition, recovery, or progress. | `Planned` |
| Recommend action | FitCore recommends one clear next action instead of only showing a score or chart. | `Planned` |
| Capture feedback | The user confirms, corrects, rejects, or comments on the recommendation. | `Planned` |
| Improve next recommendation | FitCore uses feedback and corrections to improve future recommendations. | `Planned` |

## Daily Decision Engine

Status: `Planned`

The Daily Decision Engine should be the center of the product. It should combine:

- Recent workouts.
- Planned workouts.
- Soreness.
- Pain.
- Sleep.
- Nutrition.
- Body weight trends.
- Goal priority.
- Schedule constraints.
- Previous user feedback.

It should produce:

- Today's recommended training.
- Intensity guidance.
- Nutrition focus.
- Recovery warning or readiness note.
- One clear action.
- Explanation of why.

Example daily output concept:

- Train: Upper push hypertrophy.
- Intensity: Moderate; avoid failure on compound lifts.
- Why: Sleep was low and chest soreness is still elevated.
- Nutrition: Prioritize protein and hydration.
- One action: Finish the workout, but keep RPE under 8.

This example describes desired behavior and should not be treated as implemented until the repository clearly proves it.

## Architecture Values

| Value | Product Rule | Status |
| :---- | :----------- | :----- |
| Mobile-first | Core logging and decision flows should work quickly on a phone. | `Partial` |
| Fast daily use | The user should get to today's decision without digging through dashboards. | `Planned` |
| Minimal logging friction | FitCore should capture useful data without making the user repeat themselves. | `Partial` |
| Explainable recommendations | Recommendations should show why they changed and which data mattered. | `Planned` |
| User override | The user can correct, reject, or override AI and system assumptions. | `Planned` |
| Privacy by design | Sensitive data should require clear control, export, and deletion principles. | `Planned` |
| Source transparency | Important facts, estimates, and recommendations should trace back to sources. | `Planned` |
| No wasted data | Logged data should help relevant screens, engines, and explanations. | `Planned` |
| Progressive enhancement | FitCore should work with manual data first and improve when imports or AI are available. | `Planned` |
| Wearable-ready | External device data should fit the provenance and confidence model. | `Planned` |
| Coach/pro mode ready | Future coaching views should reuse trusted data instead of creating separate records. | `Future` |
| Health-twin/medical expansion ready | Future medical and health-twin capabilities should build on the same source and control rules. | `Future` |
| Avoid duplicate disconnected systems | Training, nutrition, recovery, and progress should share context and meaning. | `Planned` |

## Architecture Anti-Patterns to Avoid

- Building trackers that do not talk to each other.
- Overwriting manual data without preserving the original.
- Hiding why the AI made a recommendation.
- Treating AI estimates as facts.
- Showing scores without explanations.
- Making the user log the same information in multiple places.
- Creating charts that do not help the user decide what to do.
- Collecting data that is never used.
- Giving generic advice that ignores user context.
