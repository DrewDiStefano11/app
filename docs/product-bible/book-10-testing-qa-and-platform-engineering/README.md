# Book 10 - Testing, QA and Platform Engineering

This book defines FitCore’s long-term testing, QA, CI validation, release safety, platform engineering, agent coordination, demo/test data, and reliability strategy.

It is the quality and release-safety layer that turns Product Bible requirements into safe implementation and testing practices.

**Important Note:** This book is for **planning and specification only**. No tests, workflows, CI changes, configs, runtime code, or platform tooling are being created by the documentation in this PR.

## Contents

- [01 - Testing, QA and Platform Engineering Overview](./01-testing-qa-and-platform-engineering-overview.md)
  Defines the purpose of testing, QA, and platform engineering, breaking down the strategy and acceptance standards for future testing versions.
- [02 - Automated Testing Strategy](./02-automated-testing-strategy.md)
  Defines the future automated testing strategy across unit, integration, and end-to-end tests, specifying critical flows and test guidelines.
- [03 - Manual QA and Regression Testing](./03-manual-qa-and-regression-testing.md)
  Defines manual QA expectations, bug reporting requirements, and a core flow quality matrix.
- [04 - Mobile, Visual, Accessibility and Cross-Device QA](./04-mobile-visual-accessibility-and-cross-device-qa.md)
  Defines mobile-first QA standards, visual expectations, and accessibility requirements.
- [05 - CI Validation, Release Gates and Build Safety](./05-ci-validation-release-gates-and-build-safety.md)
  Defines future CI, release gates, build safety rules, and validation checklists.
- [06 - Agent Coordination, PR Safety and Concurrency](./06-agent-coordination-pr-safety-and-concurrency.md)
  Defines how Jules, Codex, and other agents should work safely on FitCore, outlining concurrency rules and PR reviewability guidelines.
- [07 - Test Data, Demo Mode, Seed Data and Fixtures](./07-test-data-demo-mode-seed-data-and-fixtures.md)
  Defines future expectations for safe test data, clear demo mode boundaries, and standard seed data.
- [08 - Platform Hardening, Performance, Monitoring and Reliability](./08-platform-hardening-performance-monitoring-and-reliability.md)
  Defines future platform stability guidelines, performance expectations, observability, and release note planning.
