# FitCore Product Bible

The FitCore Product Bible is the source of truth for product direction, architecture planning, AI behavior, data routing, UX decisions, testing strategy, and future Codex/Jules PR planning.

FitCore is an AI-powered personal health and life operating system. Its purpose is not to collect disconnected logs. Its purpose is to understand the user's training, nutrition, recovery, lifestyle, environment, medical context, preferences, and long-term history well enough to explain what changed, why it changed, and what the user should do next.

## How Future Agents Should Use This

Before planning or implementing FitCore work, future agents should:

1. Read this README.
2. Read [BOOK_STRUCTURE.md](./BOOK_STRUCTURE.md).
3. Read the relevant Book for the task.
4. Check existing repo docs that the Book references.
5. Confirm the feature status, owner lane, dependencies, and testing requirements.
6. Keep docs-only PRs docs-only.

This Product Bible should be treated as canonical when it conflicts with ad hoc comments, one-off prompts, or outdated planning notes. Existing implementation still wins for questions about current runtime behavior.

## Current Books

| Book                                                                                                                                       | Status  | Purpose                                                                                                                                  |
| :----------------------------------------------------------------------------------------------------------------------------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------- |
| [Book 1 - Vision, Product Strategy and Documentation Foundation](./book-01-vision-product-strategy-and-documentation-foundation/README.md) | Active  | Defines the North Star, product principles, phase roadmap, feature inventory, status rules, scope, and parallel implementation strategy. |
| [Book 2 - System Architecture, Data Philosophy, and AI Memory](./book-02-system-architecture/README.md)                                     | Active  | Defines FitCore's connected system architecture, data philosophy, AI context, memory, and privacy/control principles.                    |
| [Book 3 - Training System, Workout Logging, Exercise Intelligence, and Progression Logic](./book-03-training-system/README.md)             | Active  | Defines FitCore's training system, active workout logging, exercise/set data requirements, progression logic, and training safety principles. |
| [Book 5 - UX/UI and User Experience](./book-05-ux-ui-and-user-experience/README.md)                                                        | Active  | Defines navigation, screen hierarchy, popups/sheets, dashboard cards, graph interactions, onboarding, settings, accessibility, mobile polish, and AI assistant UX. |
| Book 6 - Reserved Future Domain                                                                                                            | Planned | Placeholder from the earlier structure. The canonical nutrition system requirements now live in Book 4.                                  |
| Book 7 - Recovery, Sleep and Wearables                                                                                                     | Planned | Will specify recovery logging, sleep intelligence, wearable integrations, sensor data, and readiness signals.                            |
| Book 8 - Medical, Genetics and Precision Health                                                                                            | Planned | Will specify medical records, labs, imaging, medications, safety boundaries, and precision health inputs.                                |
| Book 9 - Analytics, Insights and Health Twin                                                                                               | Planned | Will specify long-term analytics, dashboards, graph explanations, simulations, Health Twin, and personal operating manual outputs.       |
| Book 10 - Testing, QA and Platform Engineering                                                                                             | Planned | Will specify automated tests, manual QA, release safety, platform hardening, and agent-safe implementation workflows.                    |

See [BOOK_STRUCTURE.md](./BOOK_STRUCTURE.md) for the full Book plan.

## Status Labels

Feature statuses are conservative:

| Status         | Meaning                                                                               |
| :------------- | :------------------------------------------------------------------------------------ |
| Planned        | The feature is desired but not necessarily implemented.                               |
| Partial        | Some supporting behavior or documentation exists, but the full requirement is not complete. |
| Deferred       | The feature is desired later and should not be implemented until explicitly approved. |
| Future         | The feature is long-term, speculative, or dependent on major platform maturity.       |
| Open Question  | A decision, scope boundary, or safety rule needs clarification before implementation. |
| Needs Decision | The feature, scope, provider, safety model, or implementation path is unclear.        |
| Implemented    | Use only when the repository clearly confirms the feature exists.                     |

Do not mark features as Implemented from product intent alone.

## Phases

Phases describe product maturity, not strict release numbers. A later PR may prepare infrastructure for a future phase, but user-facing feature implementation should follow the priorities and dependencies in [Book 1's phased roadmap](./book-01-vision-product-strategy-and-documentation-foundation/02_PHASED_ROADMAP.md).

## Lanes

Lanes define ownership boundaries for parallel work. A PR should usually stay within one lane. Cross-lane work should be split into foundation, UI, logic, integration, and testing PRs unless the Product Bible explicitly calls for an integration PR.

See [Book 1's parallel implementation strategy](./book-01-vision-product-strategy-and-documentation-foundation/04_PARALLEL_IMPLEMENTATION_STRATEGY.md).

## Adding New Features

When adding a new proposed feature:

1. Add it to the correct domain in [03_FEATURE_INVENTORY.md](./book-01-vision-product-strategy-and-documentation-foundation/03_FEATURE_INVENTORY.md).
2. Assign a phase, priority, status, owner lane, purpose, data involved, AI involvement, dependencies, and testing notes.
3. Update the roadmap if the feature changes phase sequencing.
4. Add open questions if decisions remain.
5. Reference or create a deeper spec in the appropriate future Book instead of overloading Book 1.

## Avoiding Conflicts

- Do not edit the same large runtime file from multiple PRs at once.
- Prefer new focused modules over expanding monolithic files.
- Split cross-lane work into smaller PRs.
- Use existing docs under `docs/product`, `docs/architecture`, `docs/qa`, and top-level docs as supporting references.
- Docs-only PRs must not modify `src`, runtime config, lockfiles, generated route files, or app behavior.

## Existing Docs To Reference

- [Product execution roadmap](../product/fitcore-execution-roadmap.md)
- [Data flow and integrity audit](../data-flow-audit.md)
- [Data safety and backup](../data-safety-and-backup.md)
- [Automated testing](../automated-testing.md)
- [Manual QA checklist](../manual-qa-checklist.md)
- [Merge checklist](../qa/fitcore-merge-checklist.md)
- [Screen data flow map](../architecture/fitcore-screen-data-flow-map.md)
- [UI design system](../ui-design-system.md)
