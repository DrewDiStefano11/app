# Core Principles

Every FitCore PR should preserve these principles. If a proposed feature violates one, either redesign it or explicitly document the tradeoff before implementation.

## 1. Reduce Logging Friction

Logging should become faster, easier, and more natural over time. FitCore should support manual entry, voice, camera, barcode, saved items, recent items, repeat actions, imports, sensor sync, and conversational capture where appropriate.

Future agents should avoid adding workflows that require the user to re-enter data FitCore already has or can infer with acceptable confidence.

## 2. Connect Every Data Point

No logged data should be isolated. Every feature must route its data to the correct dashboards, graphs, metrics, AI memory, recommendations, trends, reports, future check-ins, and long-term analytics.

If data does not yet have a destination, the feature spec must define the future destination before collecting it.

## 3. Explain Why

FitCore should explain what changed, why it thinks the change happened, and what evidence influenced the conclusion. "Do this" is not enough. Recommendations need a rationale, confidence, and source data.

## 4. Personalize Over Time

FitCore should become more useful as the user logs, confirms, corrects, and completes experiments. Personalization should learn from the user's own history before relying on broad defaults.

## 5. Earn Trust

Trust depends on transparency, provenance, reversibility, and humility. FitCore should show what it knows, what it estimated, what it inferred, and what is uncertain.

## 6. Stay Actionable

Insights should lead to a useful decision, behavior, adjustment, question, or experiment. Passive summaries can exist, but the product should prioritize clear next actions.

## 7. Preserve Raw Data And Structured Data

Raw user input must always be preserved. AI-structured data must be stored separately. Derived metrics must trace back to their sources.

This supports explainability, correction, migrations, audits, and future model improvements.

## 8. Avoid Isolated Features

Features should not live as disconnected tabs, popups, or widgets. A food log affects nutrition targets, recovery, training recommendations, progress trends, and AI memory. A poor sleep night affects readiness, training intensity, caffeine suggestions, and recovery recommendations.

## 9. Do Not Add Charts Without Insight Or Action

Charts should answer a question or support a decision. A graph that does not explain relevance, trend, confidence, or action should be delayed.

## 10. Do Not Add AI Recommendations Without Evidence

AI recommendations must include source data, assumptions, confidence, missing-data notes, and edit or confirm options when needed.

## 11. Make AI-Estimated Data Editable

AI-estimated calories, workouts, symptoms, sleep, readiness, or context should never become uneditable fact. The user must be able to correct estimates and those corrections should improve future behavior.

## 12. Let The App Grow With The User

FitCore should support beginners, advanced athletes, busy professionals, rehab phases, travel, illness, changing goals, and long-term health history without requiring a new app or a full reset.

## 13. Conversation-First Where Appropriate

Conversation is valuable for ambiguous, contextual, or multi-step capture: pain, symptoms, work stress, lifestyle events, workout notes, travel, or "what changed?" questions.

Conversation should not replace faster controls when a button, scanner, saved item, or import is more efficient.

## 14. Never Ask For Information FitCore Can Already Infer

FitCore should use stored data, recent patterns, device context, and integrations before asking the user. When it does ask, it should explain why the question matters.

## 15. Sensitive Data Must Have Privacy Controls

Medical, mental health, location, calendar, photos, sexual health, family history, finances, and similar sensitive data require explicit controls, clear permissions, and safe defaults.

## 16. Route Data To Metrics, Analytics, AI Memory, And Recommendations

Every feature must define how its data reaches:

- Metrics and dashboards
- Graphs and trends
- AI memory
- Recommendations
- Insights
- Future check-ins
- Reports and exports

## 17. Preserve Provenance For Every Derived Metric

Raw user input is always preserved. AI-structured data is stored separately. Every derived metric must trace back to source data, transformation logic, confidence, and timestamp.

## 18. Explain AI Estimates, Recommendations, And Insights

Every AI estimate, recommendation, or insight should include:

- Why it was generated
- Confidence
- Source data
- Missing data, if relevant
- Edit, confirm, reject, or undo options where needed

## Principle Checklist For Future PRs

- [ ] Does the feature reduce friction or clearly justify added friction?
- [ ] Does it connect data to the rest of FitCore?
- [ ] Does it preserve raw input and structured output separately?
- [ ] Does it include provenance and confidence where needed?
- [ ] Does AI explain evidence and uncertainty?
- [ ] Does the user retain control over sensitive or estimated data?
- [ ] Does the feature support long-term personalization?
- [ ] Does the PR include appropriate tests or QA notes?
