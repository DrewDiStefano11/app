# Automated Testing with Playwright

This repository uses [Playwright](https://playwright.dev/) for automated end-to-end smoke testing. The tests are designed to verify that the core application flows work correctly and that there is no horizontal overflow on mobile viewports.

## Prerequisites

- Node.js (v22+)
- npm

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Install Playwright browsers:**

    ```bash
    npx playwright install chromium
    ```

## Running Tests

### Local Execution

Run all tests headlessly:

```bash
npm run test:e2e
```

### UI Mode

Run tests with the Playwright UI for interactive debugging:

```bash
npm run test:e2e:ui
```

### Headed Mode

Run tests in a visible browser:

```bash
npm run test:e2e:headed
```

## View Reports and Traces

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

Traces are collected on the first retry of a failed test. You can view them within the HTML report or by opening them in the Playwright trace viewer.

## Test Coverage

The current smoke test suite covers:

- **Initial Load**: App loads without crashing and displays the onboarding screen.
- **Onboarding**: Successful completion of the multi-step onboarding flow.
- **Navigation**: Switching between all main sections (Home, Train, Fuel, Recover, Stats).
- **Quick Actions**: Opening and closing "Log Meal", "Check In", and "Weigh In" sheets.
- **Settings**: Opening and closing the Hub/Settings screen.
- **AI Launcher**: Verification that the AI coaching entry points are rendered.
- **Mobile Layout**: Verification that main screens do not have horizontal overflow on standard mobile widths (360px and 390px).

## Known Testability Gaps / Recommended Future Improvements

The following areas are currently difficult to test reliably without modifying the application code. Future PRs should consider adding `data-testid` attributes or improving accessibility roles to address these:

1.  **Active Workout Discard Flow**: The confirmation dialog for discarding a workout uses a generic "Discard" button that is shared with other parts of the UI, making it hard to target uniquely without brittle selectors.
2.  **Chart Mode Toggles**: Buttons like "Muscle", "Exercise", and "Day" in charts are sometimes hard to target reliably due to timing or Recharts rendering. Stable labels or test IDs would help.
3.  **Ambiguous Sheet Titles**: Many quick action sheets have titles that exactly match the button that triggered them (e.g., "Log Meal"). Distinguishing between the trigger and the modal title is currently handled via scoping, but dedicated IDs would be more robust.
4.  **LocalStorage Persistence**: Tests currently rely on manual `localStorage` manipulation to skip onboarding for navigation tests. A dedicated testing utility in the app could provide a cleaner way to seed state.

## Future Expansion Plan

- [ ] Add functional tests for logging a meal (manual entry).
- [ ] Add functional tests for starting and completing a workout.
- [ ] Implement visual regression testing for key dashboard states.
- [ ] Expand browser coverage beyond Chromium if required.
- [ ] Integrate Playwright tests into the deployment pipeline as a blocking check.
