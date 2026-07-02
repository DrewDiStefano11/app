# CI validation

GitHub Actions validates the repository for every pull request and every push to `main`. Pull requests should not be merged until the CI workflow passes because a failure means the proposed commit may contain a TypeScript, lint, formatting, dependency, or production build problem.

## Automated checks

The workflow uses Node.js 20 and npm's dependency cache, then runs these commands in order:

1. `npm ci` installs the exact dependency versions recorded in `package-lock.json` from a clean state.
2. `npx tsc --noEmit` type-checks the TypeScript project without writing compiled files.
3. `npm run lint` runs the repository's ESLint rules.
4. `npx prettier --check .` verifies formatting without rewriting files.
5. `npm run build` creates the production bundle and catches build-time failures.

A failed step stops the job, so the first reported error may hide later errors. Fix that error, run all five commands locally, and push the correction. In the GitHub Actions log, expand the failed step to see its command output. Do not bypass a failure without understanding and resolving its cause.

## Manual review

CI covers deterministic code validation, but it does not replace code review or product checks. Review the changed behavior and test relevant flows manually before merge. In particular, mobile UI smoke testing across supported viewport sizes remains a manual check.

Playwright end-to-end tests are not part of this required workflow because they may depend on browser and environment setup that is less reliable than the core validation checks. Run appropriate end-to-end tests separately when a change affects a covered user flow.
