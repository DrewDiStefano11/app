# Product Bible Book Structure

The Product Bible is organized into Books so each major body of knowledge can evolve independently while staying connected to the same source of truth.

Book 1 establishes the shared philosophy, roadmap, inventory, and implementation system. Later Books should deepen specific domains without duplicating Book 1.

## Book Index

| Book    | Name                                                  | Purpose                                                                                                                                                                  | Expected Depth                           |
| :------ | :---------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------- |
| Book 1  | Vision, Product Strategy and Documentation Foundation | Defines FitCore's North Star, principles, product scope, phased roadmap, feature inventory, statuses, priorities, lanes, merge rules, and open questions.                | Broad product strategy and coordination. |
| Book 2  | [System Architecture, Data Philosophy, and AI Memory](./book-02-system-architecture/README.md) | Defines FitCore's connected system architecture, data philosophy, AI context, memory, and privacy/control principles.                                             | Product-level architecture and AI data principles. |
| Book 3  | AI Intelligence and Decision Engine                   | Defines AI memory, recommendations, confidence scoring, explainability, experiments, debate mode, personal knowledge graph, and specialized agents.                      | AI behavior and safety.                  |
| Book 4  | UX/UI and User Experience                             | Defines navigation, screen hierarchy, design system usage, interaction patterns, accessibility, onboarding, settings, and conversation-first flows.                      | User experience and interface specs.     |
| Book 5  | Training System                                       | Defines training logs, active workouts, exercise substitutions, programs, progression, readiness-aware changes, equipment context, and advanced performance metrics.     | Training product and algorithms.         |
| Book 6  | Nutrition System                                      | Defines meal logging, food search, photo estimates, barcode scanning, saved meals, supplements, hydration, grocery planning, macro targets, and nutrition periodization. | Nutrition product and data model.        |
| Book 7  | Recovery, Sleep and Wearables                         | Defines recovery check-ins, sleep intelligence, Apple Health, Apple Watch, Fitbit, WHOOP/Noop, future Garmin/Oura, sensors, readiness, and environmental context.        | Recovery and integration strategy.       |
| Book 8  | Medical, Genetics and Precision Health                | Defines labs, imaging, documents, medications, conditions, allergies, illness mode, medical safety boundaries, red flags, and future precision health inputs.            | Medical data and safety.                 |
| Book 9  | Analytics, Insights and Health Twin                   | Defines dashboards, graph explanations, long-term memory, simulations, Health Biography, Health Twin, Personal Operating Manual, and alternate futures.                  | Long-term intelligence.                  |
| Book 10 | Testing, QA and Platform Engineering                  | Defines automated testing, manual QA, visual regression, accessibility, performance, release safety, CI, agent coordination, and platform operations.                    | Quality and engineering operations.      |

## Cross-Reference Rules

- Put broad feature existence, status, phase, and owner lane in Book 1.
- Put data schemas, storage rules, migrations, and sync behavior in Book 2.
- Put recommendation logic, confidence, memory, and AI guardrails in Book 3.
- Put screen behavior, user flows, copy rules, and accessibility in Book 4.
- Put domain-specific feature specifications in Books 5 through 9.
- Put test strategy and release safety in Book 10.

If a concept belongs to multiple Books, one Book should own the detailed specification and the others should link to it.

## Naming Standards

- Use kebab-case folder names.
- Keep Book file names numbered when order matters.
- Keep Book 1 broad. Do not deeply specify every feature in the inventory.
- Prefer focused Markdown files over one very large file.
- Use tables for inventories and coordination rules.
- Use checklists for PR gates, implementation readiness, and open decisions.

## Relationship To Existing Repo Docs

The Product Bible does not replace current implementation docs. It organizes and references them.

Existing docs remain useful for current-state details:

- `docs/product/*` contains feature-level product specs and execution planning.
- `docs/architecture/*` contains architecture maps.
- `docs/qa/*` contains PR safety and test plans.
- `docs/data-flow-audit.md` contains current data integrity requirements.
- `docs/data-safety-and-backup.md` contains local-first storage and backup expectations.
- `docs/automated-testing.md` and `docs/manual-qa-checklist.md` contain current validation practices.

Future Books should either link to these docs or absorb their content through intentional, reviewed consolidation.
