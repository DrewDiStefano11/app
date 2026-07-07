# Build, Dependency, Script, Deployment, and Cache Risk Audit

## Executive Summary
The FitCore project is in a healthy, buildable state using the Vite, TanStack Router/Start, and Nitro (Cloudflare module target) ecosystem. Standard CI/CD processes (`npm ci`, `npm run build`, `npm run lint`, `npm test`) function correctly. There are no major blockages, syntax errors, or failing tests that would prevent safe deployment. However, there are minor technical debt items, including extensive Prettier formatting errors, deprecated dependency warnings, and some module directive warnings during the build step. The Service Worker strategy is correctly configured to protect sensitive data while enabling offline capability for the app shell, but it will require manual cache version bumping on significant updates.

## Commands Run and Results
The following commands were executed to validate the repository:

*   **`npm ci`**: **Pass** (Added 466 packages in 21s. Found 0 vulnerabilities. 2 deprecation warnings.)
*   **`npm run build`**: **Pass** (Completed Vite and Nitro builds in ~11s. Generated several "use client" ignored warnings, "Unknown input options" for rollup, and chunk size warnings.)
*   **`npm run lint`**: **Fail (Formatting Only)** (Found 2521 problems, 2506 of which are potentially fixable Prettier formatting errors.)
*   **`npx playwright test`**: **Pass** (All 130+ E2E tests across desktop and mobile viewports passed.)
*   **`node --version`**: **v22.22.1** (Matches `.nvmrc`).

## Build Risks
*   **Build Warnings**: The build successfully completes but throws several module level directive warnings (`"use client" in node_modules/... was ignored`), an `Unknown input options: platform` warning, and a chunk size warning (> 500kB after minification for `index-BByLaBdl.js`).
*   **Missing Files**: No missing files were referenced by build scripts. `src/fitcore-bootstrap.js`, `scripts/server.mjs`, and `src/app.js` were suggested in the prompt but do not exist in the repository; the entry point is handled by TanStack Start via `src/server.ts`.
*   **Syntax Errors**: None found.
*   **Production Build Breakage Risk**: Low. The build outputs cleanly to `.output/`.

## Dependency Risks
*   **Package Files**: Both `package-lock.json` and `bun.lock` are present. `package-lock.json` is preferred/verified.
*   **Unused/Suspicious Dependencies**: The `dependencies` and `devDependencies` appear standard for a TanStack/Vite/Radix-UI stack.
*   **Deprecation Warnings**: `tsconfck@3.1.6` (unmaintained) and `recharts@2.15.4` (1.x and 2.x branches inactive) show deprecation warnings during install.

## Script Risks
*   **`dev`, `build`, `build:dev`, `preview`**: Standard Vite commands. Safe.
*   **`lint`, `format`**: Standard ESLint/Prettier commands.
*   **`test:e2e*`**: Playwright E2E commands. Clear and functional.
*   **Risks**: No unsafe or unclear scripts identified.

## Deployment Risks
*   **Assumptions about Local Paths**: No hardcoded absolute local paths detected in config.
*   **Environment Assumptions**: Relies on Node 22 (`.nvmrc`). The Nitro build explicitly targets `cloudflare-module` as the preset for deployment via Wrangler.
*   **Static Hosting Concerns**: As a server-side rendered (SSR) application using Nitro, this cannot be purely statically hosted; it requires a Node.js or edge (Cloudflare Workers) runtime.

## Service Worker / Cache Concerns
*   **Service Worker File (`public/sw.js`)**: Evaluated cache strategies.
*   **Cache Strategy**: Cache First for static assets (`/manifest.json`, icons) and Network First for navigation requests. Server functions and AI endpoints (`/_server/*`, `ai.functions`) are strictly excluded from caching (Network Only), which aligns with the memory directive to protect data integrity.
*   **Stale Assets Risk**: Vite appends hashes to asset filenames, which mitigates stale asset issues for JS/CSS. However, the root `/` app shell and fixed assets (like icons) are cached indefinitely under the `CACHE_NAME = 'fitcore-v1'`. If the root HTML shell changes significantly without bumping the `CACHE_NAME`, users may see a stale UI.
*   **Cache Versioning Cleanup**: Currently manual (`CACHE_NAME`). Consider automating cache versioning or ensuring a process to bump this version during major UI updates.

## Node / NPM Assumptions
*   **Required Node Version**: Node v22 is explicitly requested via `.nvmrc` and is currently used.
*   **Package Manager**: `npm` is the verified package manager (with `package-lock.json`), although `bun.lock` and `bunfig.toml` indicate potential dual-use or past use of Bun.

## Product Bible / Docs Impact
*   **Risk**: None. Modifying or adding files under `docs/audits/` or `docs/product-bible/` has zero impact on the application source, build, or deployment, as these are ignored by the application bundler.

## Recommended Fixes
### Fixes Safe to Do Now (No code changes in this PR per constraints)
*   Run `npm run format` (which executes `prettier --write .`) to resolve the 2500+ lint formatting errors.
*   Address the chunk size warning by reviewing module code-splitting (e.g., lazy loading large dependencies like Recharts).

### Fixes That Should Wait
*   **Recharts Update**: Bumping `recharts` to v3 requires careful QA of all charting components to avoid regressions.
*   **Service Worker Cache Bumping**: Do not change `CACHE_NAME` until a deployment requires a forced cache eviction.
*   **Dual Lockfiles**: Evaluate whether `bun.lock` should be removed to prevent confusion about the authoritative package manager.

## Validation Performed
*   `npm ci` (passed)
*   `npm run build` (passed)
*   `npm run lint` (identified errors)
*   `npx playwright test` (passed)