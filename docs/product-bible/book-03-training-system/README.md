# Book 3 — Training System, Workout Logging, Exercise Intelligence, and Progression Logic

Book 3 defines how FitCore handles training plans, active workout logging, exercise and set data, progression logic, safety signals, and AI coaching around workouts.

FitCore's training system should not become a disconnected workout notebook. It should make workouts easier to log, preserve accurate training data, explain performance changes, and turn that data into better future training decisions.

## Files

| File | Purpose |
| :--- | :------ |
| [01-training-system-overview.md](./01-training-system-overview.md) | Defines the high-level training system, connected modules, training loop, inputs, outputs, architecture values, and anti-patterns. |
| [02-workout-logging-and-active-workout.md](./02-workout-logging-and-active-workout.md) | Defines the active workout experience, expandable exercise card behavior, previous performance display, set modifiers, notes, substitutions, plate calculator support, finish summary, and save-as-template behavior. |
| [03-exercise-and-set-data-model.md](./03-exercise-and-set-data-model.md) | Defines product-level exercise identity, set-level data requirements, planned vs actual data, unilateral support, pain data, workout session data, corrections, and data transfer rules. |
| [04-progression-and-performance-logic.md](./04-progression-and-performance-logic.md) | Defines progression principles, performance interpretation, previous performance comparisons, suggested weights/reps, deload caution, PR logic, muscle volume, and AI recommendation format. |
| [05-training-safety-and-injury-awareness.md](./05-training-safety-and-injury-awareness.md) | Defines product-level safety, pain, soreness, fatigue, injury limitations, caution boundaries, safety prompts, and safety anti-patterns. |

## Core Principle

FitCore should make workouts easier to log, preserve accurate set-level training data, explain performance changes, and convert that data into safer, clearer future training decisions.

Every training feature should do at least one of the following:

- Reduce workout logging friction.
- Preserve accurate set-level data.
- Connect training to recovery and nutrition.
- Explain performance changes.
- Improve progression decisions.
- Make the active workout easier to use.
- Keep the user safer when pain, fatigue, soreness, or injury risk is present.
- Avoid wasting any data the user already logged.

## What This Book Does Not Cover

This book does not define final database schemas, production APIs, final UI components, migrations, or implemented runtime behavior.

It defines product-level training requirements and principles that future implementation should follow. Future PRs should still inspect the repository before marking anything as `Implemented`.

## Relationship To Book 2

Book 3 builds on [Book 2 - System Architecture, Data Philosophy, and AI Memory](../book-02-system-architecture/README.md).

Training features should follow Book 2's data philosophy:

- Preserve source data.
- Track provenance.
- Label AI-generated values.
- Keep user corrections.
- Avoid wasting data.
- Make recommendations explainable.
- Give users control over sensitive data, including injury and pain context.

## Status Guidance

Use conservative status labels in Book 3:

| Status | Meaning |
| :----- | :------ |
| Implemented | Use only when the repository clearly proves the behavior exists. |
| Partial | Some supporting behavior or documentation exists, but the full requirement is not complete. |
| Planned | Desired product behavior that future implementation should support. |
| Future | Longer-term behavior that depends on broader product maturity. |
| Open Question | A decision, scope boundary, or safety rule needs clarification before implementation. |
