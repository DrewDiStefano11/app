# Automated Testing Foundation

This document outlines the automated testing infrastructure for FitCore using Playwright.

## Getting Started

### 1. Install Playwright

If you haven't already, you need to install Playwright and its browser binaries:

```bash
bunx playwright install --with-deps
```

### 2. Running Tests

You can run the e2e tests using the following commands:

- **Run all tests (headless):**
  ```bash
  npm run test:e2e
  ```
- **Run tests with UI Mode (recommended for development):**
  ```bash
  npm run test:e2e:ui
  ```
- **Run tests in headed mode:**
  ```bash
  npm run test:e2e:headed
  ```

## Configuration

The testing configuration is located in `playwright.config.ts`. It includes:

- **Projects:** Chromium (Desktop) and mobile viewports (360x800, 390x844).
- **Web Server:** Automatically starts the dev server using `npm run dev`.
- **Artifacts:** Captures traces on first retry and screenshots/videos on failure.

## Test Coverage

The current "smoke" tests cover:

1.  **Onboarding:** Fresh state detection and completion.
2.  **Navigation:** Bottom navigation between Home, Training, Nutrition, Recovery, and Progress.
3.  **Core UI:** Presence of key elements and quick-log buttons.
4.  **Responsiveness:** Horizontal overflow checks on mobile viewports.
5.  **Integration Points:** Jarvis (AI) presence check.

## Viewing Reports

After running tests, Playwright generates an HTML report. You can view it by running:

```bash
bunx playwright show-report
```

Traces for failed tests can be viewed in the report or via [trace.playwright.dev](https://trace.playwright.dev/).

## What Requires Manual Testing

Currently, the following are NOT covered by automated tests and require manual QA:

- Real AI (Jarvis) logic, voice interaction, and network responses.
- Complex data persistence scenarios (beyond simple onboarding).
- Pixel-perfect visual regressions.
- Third-party integrations or complex hardware-simulated sensors.

## Future Test Expansion Plan

We plan to expand the test suite to include:

- **Data Integrity:** Detailed verification of logged data across sessions.
- **Export/Import:** Tests for data portability features.
- **Active Workout:** End-to-end flow from starting to finishing and saving a workout.
- **Nutrition & Recovery:** Detailed persistence tests for specific logging flows.
- **Dashboard Customization:** Verification of UI state persistence for personalized views.
- **AI Logging:** Integration tests for AI-triggered data logging once stable.
- **Safari/WebKit:** Expansion to include WebKit for comprehensive mobile testing.
