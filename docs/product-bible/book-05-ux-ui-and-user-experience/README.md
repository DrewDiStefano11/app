# Book 5 - UX/UI and User Experience

Book 5 is the canonical Product Bible source for FitCore UX/UI and user experience. It defines how FitCore should feel, navigate, display data, open popups and sheets, behave on mobile, explain AI recommendations, and keep users in control.

FitCore should feel like a fast, mobile-first health operating system: easy to log into, clear at a glance, calm under complexity, transparent about recommendations, and respectful of sensitive user data.

## Files

| File | Purpose |
| :--- | :------ |
| [01-ux-system-overview.md](./01-ux-system-overview.md) | Defines FitCore's UX purpose, core principles, interaction model, and anti-patterns. |
| [02-navigation-and-screen-hierarchy.md](./02-navigation-and-screen-hierarchy.md) | Defines primary navigation, section tabs, quick actions, screen hierarchy, and back/close behavior. |
| [03-popups-sheets-and-interaction-patterns.md](./03-popups-sheets-and-interaction-patterns.md) | Defines popup, sheet, modal, confirmation, correction, and quick-action interaction standards. |
| [04-dashboard-cards-graphs-and-data-visualization.md](./04-dashboard-cards-graphs-and-data-visualization.md) | Defines dashboard cards, graph detail behavior, FitCore Score display, empty states, and data visualization principles. |
| [05-onboarding-settings-and-user-control.md](./05-onboarding-settings-and-user-control.md) | Defines onboarding, settings, privacy controls, AI memory controls, corrections, and data control surfaces. |
| [06-mobile-first-accessibility-and-polish.md](./06-mobile-first-accessibility-and-polish.md) | Defines mobile-first layout, accessibility expectations, polish standards, and device smoke checks. |
| [07-ai-assistant-ux-and-explainability.md](./07-ai-assistant-ux-and-explainability.md) | Defines AI assistant entry points, answer modes, explainability, AI logging UX, and safety behavior. |

## What This Book Owns

Book 5 owns product-level UX/UI standards for:

- Navigation.
- Screen hierarchy.
- Dashboard layout.
- Dashboard card behavior.
- Popup, sheet, and modal behavior.
- Graph interaction behavior.
- Mobile-first layout expectations.
- Accessibility.
- Onboarding.
- Settings.
- AI assistant interaction patterns.
- Explainability UI.
- User control surfaces.

## What This Book Does Not Own

Book 5 does not define:

- Domain-specific training logic owned by [Book 3 - Training System](../book-03-training-system/README.md).
- Domain-specific nutrition logic owned by [Book 4 - Nutrition System](../book-04-nutrition-system/README.md).
- Data architecture, privacy architecture, and AI memory rules owned by [Book 2 - System Architecture, Data Philosophy, and AI Memory](../book-02-system-architecture/README.md).
- Implementation-level code decisions, final component APIs, database schemas, migrations, runtime source code, or dependency choices.

Book 5 defines how product systems should appear, behave, explain themselves, and preserve context in the interface. Future implementation PRs should still inspect the repository before marking any behavior as `Implemented`.

## Relationship To Earlier Books

Book 5 depends on Book 2 for data, privacy, provenance, source/confidence, and AI memory principles. UX surfaces that show AI estimates, user corrections, sensitive data, or memory controls should follow Book 2.

Book 5 depends on Book 3 for training-specific behavior. Training UX should make active workout logging, set editing, progression explanations, substitutions, and safety cues clear without duplicating Book 3's training rules.

Book 5 depends on Book 4 for nutrition-specific behavior. Nutrition UX should make meal logging, macro estimates, food AI confidence, user corrections, body-weight feedback, and nutrition coaching clear without duplicating Book 4's nutrition rules.

## Status Guidance

Use conservative status labels in Book 5:

| Status | Meaning |
| :----- | :------ |
| Implemented | Use only when the repository clearly proves the behavior exists. |
| Partial | Some supporting behavior or documentation exists, but the full requirement is not complete. |
| Planned | Desired product behavior that future implementation should support. |
| Deferred | Desired behavior intentionally delayed until explicitly approved. |
| Future | Longer-term behavior that depends on broader product maturity. |
| Needs Decision | A product, UX, privacy, safety, or implementation decision is required before work proceeds. |
| Open Question | A decision, scope boundary, or safety rule needs clarification before implementation. |
