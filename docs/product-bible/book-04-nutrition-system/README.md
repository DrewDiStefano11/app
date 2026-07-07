# Book 4 - Nutrition System, Meal Logging, Macro Estimation, Food AI, and Body-Weight Feedback Loops

Book 4 defines how FitCore handles meal logging, food entries, macro targets, food AI, photo estimates, user corrections, nutrition analytics, body-weight interpretation, and nutrition coaching.

FitCore's nutrition system should not become a disconnected calorie tracker. It should help the user understand what to eat today, whether they are on track, why body weight changed, how food choices affect training and recovery, and what one clear nutrition action would improve tomorrow.

## Files

| File                                                                             | Purpose                                                                                                                                                                    |
| :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01-nutrition-system-overview.md](./01-nutrition-system-overview.md)             | Defines the high-level nutrition system, modules, loop, inputs, outputs, architecture values, and anti-patterns.                                                           |
| [02-meal-logging-and-food-entry.md](./02-meal-logging-and-food-entry.md)         | Defines food entry methods, quick add, manual search, barcode/label entry, photo logging, voice/text logging, repeated meals, recipes, timing, and logging friction rules. |
| [03-macro-estimation-and-food-ai.md](./03-macro-estimation-and-food-ai.md)       | Defines AI macro estimation, source transparency, confidence levels, uncertainty language, user corrections, clarifying questions, and food AI anti-patterns.              |
| [04-nutrition-data-model-philosophy.md](./04-nutrition-data-model-philosophy.md) | Defines implementation-neutral nutrition data requirements, entity concepts, target history, estimated vs confirmed data, corrections, privacy, and data transfer rules.   |
| [05-body-weight-and-feedback-loops.md](./05-body-weight-and-feedback-loops.md)   | Defines body-weight trend interpretation, nutrition-to-weight feedback loops, goal-phase logic, adjustment caution, and training/recovery connections.                     |
| [06-nutrition-coaching-and-safety.md](./06-nutrition-coaching-and-safety.md)     | Defines nutrition coaching style, recommendation format, meal suggestions, adherence support, recovery connections, sensitive data handling, and safety boundaries.        |

## Core Principle

FitCore should make nutrition logging fast, preserve trust in food data, explain uncertainty, and connect nutrition to training, recovery, body weight, body composition, and goals.

Every nutrition feature should do at least one of the following:

- Reduce meal logging friction.
- Improve trust in calorie and macro data.
- Preserve source data and user corrections.
- Connect nutrition to training, recovery, body weight, and goals.
- Explain body-weight changes without overreacting to normal fluctuations.
- Make AI food estimates transparent and correctable.
- Avoid wasting any meal, weight, photo, note, or correction data the user already logged.

## What This Book Does Not Cover

This book does not define final database schemas, production APIs, final UI components, medical nutrition therapy, or implemented runtime behavior.

It defines product-level nutrition requirements and principles. Future PRs should still inspect the repository before marking any behavior as `Implemented`.

## Relationship To Earlier Books

Book 4 builds on [Book 2 - System Architecture, Data Philosophy, and AI Memory](../book-02-system-architecture/README.md).

Nutrition features should follow Book 2's data philosophy:

- Preserve raw, normalized, and derived values where useful.
- Track provenance, source, confidence, and user corrections.
- Label AI-generated or AI-assisted values.
- Give users privacy and memory controls for sensitive data.
- Avoid wasting data that can improve future decisions.

Book 4 also builds on [Book 3 - Training System, Workout Logging, Exercise Intelligence, and Progression Logic](../book-03-training-system/README.md).

Nutrition should connect to training performance, readiness, recovery, soreness, workout progression, and safety decisions instead of being analyzed in isolation.

## Status Guidance

Use conservative status labels in Book 4:

| Status        | Meaning                                                                                     |
| :------------ | :------------------------------------------------------------------------------------------ |
| Implemented   | Use only when the repository clearly proves the behavior exists.                            |
| Partial       | Some supporting behavior or documentation exists, but the full requirement is not complete. |
| Planned       | Desired product behavior that future implementation should support.                         |
| Future        | Longer-term behavior that depends on broader product maturity.                              |
| Open Question | A decision, scope boundary, or safety rule needs clarification before implementation.       |
