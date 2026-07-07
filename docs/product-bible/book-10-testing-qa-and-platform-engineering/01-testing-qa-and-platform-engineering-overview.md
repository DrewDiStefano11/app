# Testing, QA and Platform Engineering Overview

FitCore aims to be an AI-powered personal health operating system. Because it acts on a user's sensitive medical context, lifestyle, training, and recovery data, FitCore needs strong QA before major feature expansion. It is essential that trust is established and that data is never lost, mixed up, or hallucinated.

The purpose of testing, QA, and platform engineering in FitCore is to ensure correct logic, protect data integrity, and guarantee stable user experiences.

## The Testing Ecosystem

FitCore's quality strategy distinguishes between various testing and safety layers:

- **Automated Tests:** Code-driven tests verifying individual components (unit), connected systems (integration), and full user journeys (end-to-end).
- **Manual QA:** Human-driven exploration checking exploratory paths, device quirks, visual spacing, and complex AI chat interactions.
- **Smoke Tests:** Quick validations of core functionality (app loading, saving) meant to fail fast if something is fundamentally broken.
- **Regression Tests:** Checks (manual or automated) run to ensure existing functionality remains unbroken after a change.
- **Visual Checks:** Verification that UI elements match expected layout, spacing, and styling.
- **Accessibility Checks:** Ensuring standard usability guidelines (contrast, screen reader text, tap targets) are met.
- **Release Gates:** Defined thresholds (e.g., passing build, tests, and manual verification) that must be cleared before merging or deploying a feature.
- **Monitoring/Reliability:** Ongoing observation and metrics tracking for app load times, error rates, and failure states in production.

Testing closely connects to the Product Bible requirements. Implementation PRs must include validation appropriate to their scope, ensuring that the defined product boundaries and data behaviors are strictly honored.

### Non-Goals for Planning PRs

When establishing or updating these documents, we adhere strictly to planning. **Non-goals include:**

- Implementing tests in a docs PR.
- Creating or changing CI workflows in a docs PR.
- Changing build tooling.
- Fixing unrelated baseline errors.
- Using tests as a substitute for product review.
- Merging large risky feature PRs without staged validation.

## Implementation Task Acceptance Standard

Future implementation PRs should be robust and verifiable. To be accepted, an implementation PR should include:

- The exact scope of the changes.
- Expected files/systems touched.
- Forbidden files/systems (areas that should explicitly not be altered).
- Dependency assumptions.
- Expected user-facing behavior.
- Data persistence expectations.
- AI, source tracking, and privacy expectations (where relevant).
- Validation commands used.
- Manual QA notes (where relevant).
- Rollback/safety notes for risky changes.
- Known limitations or deferred scope.

The implementation must also adhere to the requirement of PR creation.

## First Usable Testing Version

Before FitCore can be considered ready for its first real testing version (a stage stable enough for real user feedback), the following must be true:

- The homepage loads reliably.
- Main tabs work correctly.
- Log Meal, Check In, and Weigh In flows work and save accurately.
- An active workout can be completed fully.
- Completed data appears in the relevant summaries/graphs.
- Core data is never lost or duplicated during usage.
- AI does not log data into the wrong category.
- Settings and privacy basics are understandable to the user.
- Empty and low-data states are not confusing.
- The mobile UI is usable.
- Major known bugs are clearly documented.
- A manual regression checklist exists.

The first usable testing version does not need every long-term feature from the Product Bible, but it must be reliable within its restricted scope.

## QA Severity Levels and Bug Triage

For future bug reporting and release decisions, bugs will be categorized by severity:

- **Critical:** Data loss, privacy leak, destructive action without confirmation, app cannot load, or real user data is mixed with demo/test data.
- **High:** Core flows broken, active workout cannot finish, meal/check-in/weigh-in cannot save, AI logs to the wrong category, deleted data still affects insights.
- **Medium:** Confusing UI, graph mismatch, stale data not labeled, popup layout issue, incorrect empty state, non-blocking mobile layout bug.
- **Low:** Copy issue, minor spacing issue, non-critical visual polish, small documentation mismatch.

Triage should consider the risk to user data, privacy, whether a core flow is blocked, how AI recommendations are impacted, whether it breaks trust in analytics, and whether it is a mobile-specific or cross-platform issue.

## Docs-to-Implementation Traceability

Future implementation tasks should trace back directly to Product Bible sections or audit findings.

- PRs should mention which Product Bible book or audit they satisfy when applicable.
- If an implementation intentionally deviates from the documented Product Bible requirements, the PR must explain why.
- Product Bible changes must be handled in separate docs PRs, not quietly changed inside unrelated feature PRs.
