# Test Script and Tooling Audit

## 1. Purpose
Audit the current test scripts, package scripts, and available test tooling before adding new unit/store tests. This document ensures we understand the existing infrastructure and defines a safe path forward without modifying existing workflows or dependencies prematurely.

## 2. Current package manager signals
*   **Preferred Manager**: Bun (`bun install`, `bun run ...`) is explicitly set as the preferred package manager and task runner for FitCore according to project directives.
*   **CI Usage**: `.github/workflows/ci.yml` uses `setup-bun` to install dependencies and run linting/build tasks.
*   **Discrepancies**: The `playwright.yml` workflow and the `playwright.config.ts` (`webServer.command`) still reference `npm run`, but future agent interactions should default to Bun as per instructions.

## 3. Current package scripts
*   `dev`: `vite dev`
*   `build`: `vite build`
*   `build:dev`: `vite build --mode development`
*   `preview`: `vite preview`
*   `lint`: `eslint .`
*   `format`: `prettier --write .`
*   `test:e2e`: `playwright test`
*   `test:e2e:ui`: `playwright test --ui`
*   `test:e2e:headed`: `playwright test --headed`

## 4. Current CI-related scripts
*   `.github/workflows/ci.yml`: Runs on main pushes/PRs. Sets up Bun, installs dependencies, runs `bun run lint` (with continue-on-error), runs formatting check (`bunx prettier --check .`), and runs `bun run build`.
*   `.github/workflows/playwright.yml`: Runs on main pushes/PRs. Sets up Node, runs `npm install`, installs Playwright browsers, and runs `npm run test:e2e`.
*   **Note**: PR #14 (CI workflow) is parked and should not be relied upon.

## 5. Current Playwright setup
*   Configured in `playwright.config.ts` to run against a local server (`npm run dev` at `http://localhost:8080`).
*   Configured for three projects: `desktop-chromium`, `mobile-360x800`, and `mobile-390x844`.
*   Includes helpers in `tests/e2e/helpers/fitcore-test-state.ts` (e.g., `seedMinimalOnboardedState`) for bypassing onboarding and seeding data.
*   Tests reside in `tests/e2e/` (e.g., `smoke.spec.ts`, `daily-decision.spec.ts`, etc.).

## 6. Current TypeScript/build setup
*   Uses `vite` with `@tanstack/react-start` plugin and `typescript` (`^5.8.3`).
*   Uses `zod` for runtime validation.
*   Framework: TanStack Start.

## 7. Current lint/format setup
*   Linter: `eslint` (`^9.32.0`) with `@eslint/js` (`^9.32.0`) and TypeScript support.
*   Formatter: `prettier` (`^3.7.3`).
*   **Known Debt**: There are pre-existing lint configuration errors (e.g., `Cannot find package '@eslint/js'`). These should be safely ignored during targeted feature PRs as per project guidelines. Global format updates should be avoided to prevent modifying unrelated files.

## 8. Whether a unit test framework already exists
*   **Does the repo already have a unit test runner?**: No.
*   The `package.json` only includes Playwright for E2E testing. There is no `vitest`, `jest`, or other unit-testing library installed.

## 9. Whether adding unit tests would require a new dependency
*   **Yes**. Adding traditional unit tests would require introducing a dependency like `vitest` (recommended for Vite projects) or `@testing-library/react` for component tests.
*   **Are tests currently Playwright-only?**: Yes.

## 10. Recommended future test command structure
*   **E2E Tests**: Future agents should use `bun run test:e2e`.
*   **Build Validation**: Future agents should use `bun run build`.
*   **Unit Tests (Future)**: When a unit test runner is added, the expected command would likely be `bun run test:unit` or `bun run test`.

## 11. Risks of touching package/lock/workflow files
*   **Should package/lockfile changes be avoided until PR #14 is resolved?**: Yes. PR #14 deals with CI workflows, and touching lockfiles or package definitions could cause conflicts or disrupt the sequence.
*   **Should future test PRs avoid modifying workflows until CI is unparked?**: Yes, workflows should remain untouched to maintain stable PR boundaries.

## 12. Suggested small PR sequence for future test implementation
*   **Safest first test-code PR**: The safest first step is a pure-logic unit testing setup PR that:
    1. Introduces `vitest` dependency in isolation.
    2. Adds a `test:unit` script.
    3. Adds non-UI, pure-function tests (e.g., scoring logic, data calculation).
    4. Does *not* change `ci.yml` or `playwright.yml` to run the new tests yet (to avoid CI breakage while PR #14 is parked).

## 13. Open questions / assumptions
*   **Assumption**: Vitest is the implicitly preferred choice for unit tests given the Vite/TanStack Start foundation, but this requires confirmation.
*   **Question**: Should E2E CI checks eventually be migrated to Bun entirely instead of the current `npm` usage in `playwright.yml`? (To be addressed in future workflow updates, not this PR).

## Direct Answers to Prompt Questions

*   **Does the repo already have a unit test runner?** No.
*   **Are tests currently Playwright-only?** Yes.
*   **What command should future agents use for existing E2E tests?** `bun run test:e2e` (or `npm run test:e2e` in CI).
*   **What command should future agents use for build validation?** `bun run build`.
*   **Are there known lint/typecheck issues that should be treated as baseline debt?** Yes, known configuration errors (e.g., missing `@eslint/js` resolutions) exist and should not block targeted PRs.
*   **Should package/lockfile changes be avoided until PR #14 is resolved?** Yes.
*   **What is the safest first test-code PR after this audit?** Adding a unit test runner (like Vitest) and testing isolated pure functions (calculations, formatters) without modifying CI workflows.
*   **Should future test PRs avoid modifying workflows until CI is unparked?** Yes.
