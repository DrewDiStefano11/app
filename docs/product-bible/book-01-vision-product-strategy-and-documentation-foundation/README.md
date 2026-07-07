# Book 1 - Vision, Product Strategy and Documentation Foundation

Book 1 defines the foundation for FitCore's long-term product direction and implementation coordination.

It should answer:

- What is FitCore?
- Why does it exist?
- What principles govern product and engineering decisions?
- What features are planned, deferred, or future-facing?
- Which phase does each feature belong to?
- Which lane owns each feature?
- How should Jules/Codex split safe parallel PRs?
- What decisions remain open?

Book 1 is intentionally broad. Later Books should expand architecture, AI, UX, training, nutrition, recovery, medical, analytics, and testing in deeper technical detail.

## Files

| File                                                                                   | Purpose                                                                                                            |
| :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| [00_PRODUCT_VISION.md](./00_PRODUCT_VISION.md)                                         | Defines the FitCore North Star, mission, product promise, and long-term Health Twin direction.                     |
| [01_CORE_PRINCIPLES.md](./01_CORE_PRINCIPLES.md)                                       | Defines the core product, data, AI, privacy, and UX principles every future PR should follow.                      |
| [02_PHASED_ROADMAP.md](./02_PHASED_ROADMAP.md)                                         | Defines phases 0 through 9, deferred items, dependencies, and sequencing logic.                                    |
| [03_FEATURE_INVENTORY.md](./03_FEATURE_INVENTORY.md)                                   | Groups all known features by domain with phase, priority, status, lane, data, AI, dependencies, and testing notes. |
| [04_PARALLEL_IMPLEMENTATION_STRATEGY.md](./04_PARALLEL_IMPLEMENTATION_STRATEGY.md)     | Defines implementation lanes, PR splitting rules, merge order, conflict avoidance, and testing expectations.       |
| [05_FEATURE_STATUS_AND_PRIORITY_SYSTEM.md](./05_FEATURE_STATUS_AND_PRIORITY_SYSTEM.md) | Defines status labels, priority levels, readiness gates, and how future agents should update the inventory.        |
| [06_PRODUCT_SCOPE_AND_NON_GOALS.md](./06_PRODUCT_SCOPE_AND_NON_GOALS.md)               | Defines what belongs in FitCore, what does not, and what is intentionally deferred.                                |
| [99_OPEN_QUESTIONS.md](./99_OPEN_QUESTIONS.md)                                         | Tracks assumptions, unknowns, research needs, safety questions, integration risks, and oversized early features.   |

## Current Repo Context

The current app is a local-first TanStack Start, React, TypeScript, Vite, Tailwind/Radix-style mobile-first application. It already contains training, nutrition, recovery, progress, settings, demo data, local storage, and Jarvis/AI surfaces.

Relevant existing docs:

- [Existing product execution roadmap](../../product/fitcore-execution-roadmap.md)
- [Data flow and integrity audit](../../data-flow-audit.md)
- [Data safety and backup](../../data-safety-and-backup.md)
- [Automated testing](../../automated-testing.md)
- [Manual QA checklist](../../manual-qa-checklist.md)
- [Merge checklist](../../qa/fitcore-merge-checklist.md)
- [Screen data flow map](../../architecture/fitcore-screen-data-flow-map.md)
- [UI design system](../../ui-design-system.md)

## Docs-Only Rule

This Book may define runtime behavior, but changes to this Book must not implement runtime behavior. Docs-only PRs must not modify application source, state logic, UI components, APIs, tests, generated files, or lockfiles unless explicitly approved as part of a separate non-docs task.
