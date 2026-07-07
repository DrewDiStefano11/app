# Book 2 - System Architecture, Data Philosophy, and AI Memory

Book 2 defines how FitCore connects data, AI context, user control, and daily decision-making.

FitCore should not become a set of disconnected trackers. It should preserve useful data, explain where conclusions came from, and turn connected health data into practical next actions.

## Files

| File                                                         | Purpose                                                                                                                                   |
| :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| [01-system-overview.md](./01-system-overview.md)             | Defines the high-level connected system, module map, decision loop, architecture values, and anti-patterns.                               |
| [02-data-model-philosophy.md](./02-data-model-philosophy.md) | Defines product-level data principles for raw data, normalized data, provenance, confidence, corrections, conflicts, deletion, and reuse. |
| [03-ai-context-and-memory.md](./03-ai-context-and-memory.md) | Defines how FitCore AI should use context, memory, uncertainty, sensitive data, source transparency, feedback, and safety boundaries.     |

## Core Principle

FitCore should preserve useful data, show where important conclusions came from, and convert connected training, nutrition, recovery, body composition, goal, wearable, and feedback data into one practical next action.

Every major feature should do at least one of the following:

- Reduce logging friction.
- Improve trust in the data.
- Explain what changed.
- Help the user decide what to do next.
- Connect training, nutrition, recovery, body composition, injury, and progress together.

## What This Book Does Not Cover

This book does not define final database schemas, production APIs, finished UI designs, migrations, or provider-specific integration code.

It defines product-level architecture principles that future implementation should follow. Future PRs should still verify current runtime behavior in the repository before marking anything as `Implemented`.
