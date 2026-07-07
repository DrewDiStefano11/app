# Feature Status And Priority System

This file defines how future agents should classify features in [03_FEATURE_INVENTORY.md](./03_FEATURE_INVENTORY.md).

## Status Labels

| Status         | Use When                                                                                                             | Do Not Use When                                                   |
| :------------- | :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| Planned        | The feature is desired and belongs in the roadmap, but implementation is not confirmed by the repo.                  | The feature is speculative, unsafe, or explicitly deferred.       |
| Deferred       | The feature is desired later but should not be implemented until the user explicitly approves it.                    | The feature is a near-term dependency or active product priority. |
| Future         | The feature is long-term, platform-dependent, futuristic, or not practical until later Books and architecture exist. | The feature has a clear near-term workflow and dependencies.      |
| Needs Decision | Scope, provider, legal/safety model, data model, or UX path is unresolved.                                           | The feature is straightforward and already accepted into a phase. |
| Implemented    | The repository clearly implements the feature.                                                                       | The feature appears in a prompt, mockup, or roadmap only.         |

## Priority Levels

| Priority | Meaning                                                    | Typical Examples                                                 |
| :------- | :--------------------------------------------------------- | :--------------------------------------------------------------- |
| P0       | Required foundation before dependent work can safely ship. | Data model, provenance, privacy controls, migration safety.      |
| P1       | Core product value for early testable app.                 | Home dashboard, logging, FitCore Score, basic recommendations.   |
| P2       | Important expansion after foundations are stable.          | Voice logging, saved meals, Apple Health, sleep debt.            |
| P3       | Advanced or specialized value.                             | Gym profiles, experiment mode, travel intelligence.              |
| P4       | Long-term, speculative, or explicitly deferred.            | AR glasses, robotics, AI marketplace, social/community surfaces. |

## Implementation Readiness Gates

A feature is not ready for implementation until it has:

- Clear owner lane
- Phase and priority
- Product purpose
- Main data involved
- AI involvement, if any
- Provenance/confidence needs
- Privacy and safety classification
- Dependencies
- Required test coverage
- Acceptance criteria or a linked spec

## How To Update The Inventory

When updating a feature row:

1. Keep the feature name stable unless renaming improves clarity.
2. Update status conservatively.
3. Add a linked spec when deeper detail exists.
4. Do not mark Implemented without checking runtime code or current docs.
5. Add open questions for unresolved provider, privacy, medical, or AI decisions.
6. If a feature crosses lanes, split the work plan rather than assigning ambiguous ownership.

## Evidence Rules For Implemented Status

Acceptable evidence includes:

- A source file that implements the workflow.
- A test that exercises the workflow.
- A current-state doc that accurately describes existing behavior.
- A verified route, component, or store field in the repo.

Do not rely on:

- Prompt text
- Future roadmap language
- Placeholder UI labels
- Mock data alone
- Unmerged PR descriptions
