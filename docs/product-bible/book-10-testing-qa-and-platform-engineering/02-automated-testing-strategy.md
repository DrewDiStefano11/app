# Automated Testing Strategy

The future automated testing strategy for FitCore is intended to establish high confidence in core application behavior, data integrity, and privacy boundaries. Tests must verify user-facing behavior and correct data persistence, rather than simply checking if a React component renders successfully.

## Test Categories

FitCore’s automated testing strategy will rely on multiple layers:

- **Unit Tests:** For isolated business logic, data formatting, and utility functions.
- **Integration Tests:** To ensure data connects correctly between internal state, API mocks (where applicable), and UI layers.
- **End-to-End (E2E) Tests:** Verifying full user journeys, checking the interaction of components, storage layers, and routing.
- **Smoke Tests:** Fast checks ensuring the application boots and crucial views render without crashing.
- **Regression Tests:** Automated tests confirming previously fixed bugs stay fixed or core features remain unbroken by new changes.
- **Data Propagation Tests:** Ensuring that data entered in one place updates correctly everywhere it is displayed.
- **AI Logging Tests:** Verifying that simulated AI interactions log data exactly where intended, with correct categories.
- **Privacy/Export/Delete Tests:** Validating that data controls (hiding categories, deletion requests) function correctly and cascade through the system.
- **Accessibility Checks:** Automated sweeps for basic accessibility standard violations (contrast, ARIA roles, missing labels).
- **Visual Regression Checks:** Comparing snapshots of critical UI areas to detect unintended layout shifts.

## Critical FitCore Flows to Test

Automated testing efforts should eventually prioritize verifying:

- The homepage loads reliably.
- Main navigation tabs load and transition smoothly.
- The Log Meal popup opens, accepts input, and saves correctly.
- The Check In popup opens and saves.
- The Weigh In popup opens and saves.
- An active workout starts, logs sets accurately, finishes, and saves the full record.
- A completed workout updates progress and training analytics appropriately.
- Workout notes route pain, soreness, and fatigue signals into the correct recovery areas.
- Graph popups open correctly and display expected values.
- Graph mode toggles persist their state outside the popup.
- FitCore Score explanations match the underlying source data without hallucination.
- AI features correctly log data into the respective records.
- AI behavior strictly respects disabled memory or data categories.
- Deleted data immediately stops influencing AI behavior, dashboard insights, or graphs.
- Demo mode operates securely and cannot pollute real user data.

*Note: Tests should be added in small, focused PRs over time.*

## Flaky Test and False Confidence Policy

FitCore requires a strict policy for handling test unreliability to prevent a false sense of security:

- Flaky tests should not be ignored forever. They undermine the entire suite.
- Failing tests must not be hidden by broad `skip` commands.
- If a test must be skipped temporarily, the reason and a follow-up action plan must be documented alongside the skip.
- Tests should not merely check that components render; they must verify behavior and resulting data changes where relevant.
- Passing tests do not replace the need for manual QA on major UX flows.
- Screenshots or manual observations may still be needed to catch complex mobile visual behaviors that automation misses.
- Agents (Codex, Jules) should not claim full validation if only partial validation was possible or run.

## Environment and Browser Assumptions

Automated tests and manual verifications will rely on specific environment assumptions:

- **Local Development Environment:** Where agents and developers do primary implementation validation.
- **Preview/Deployment Environment:** For staging if available.
- **Production Environment:** Future state.
- **Seeded/Demo Testing Mode:** For consistent test data generation.
- **Empty New-User Account Testing Mode:** For verifying onboarding and first-time usage.
- **Mobile Viewport Testing:** To validate safe areas, bottom navigation overlaps, and touch targets.
- **Desktop Browser Testing:** For general desktop layouts.

**Browser Specifics:**
- Chrome and Edge are prioritized for Jarvis, voice, and modern browser API validation.
- Safari and mobile Safari must be considered due to distinct viewport handling, keyboard overlays, audio policies, and safe-area layouts.
- Android Chrome should be tested for mobile layout consistency.
- Any browser-specific behavior should be clearly documented in test failures or bug reports.
