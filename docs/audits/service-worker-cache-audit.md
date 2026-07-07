# Service Worker and Cache Behavior Audit

Date: 2024-07-07
Branch: docs-sw-cache-audit

**Note:** This is a docs-only audit and does not change any runtime behavior. It was performed to safely document the current service worker, cache, offline, and update behavior so future cleanup can happen without risking data loss or stale app states.

## Executive Summary

- **Caching Strategy:** Uses a hybrid approach: static assets are Cache-First, navigation requests are Network-First (with a fallback to the cached app shell `/`), and server/AI calls are explicitly Network-Only.
- **Cache Management:** Currently utilizes a hardcoded cache name (`fitcore-v1`).
- **Update Mechanism:** Missing entirely. While the Service Worker installs and caches assets, there is no logic in the application (e.g., `updatefound` listeners, prompts) to notify users of a new version or to trigger `skipWaiting` / reloading.
- **Stale App Risk:** High. Because there is no app-side update flow, users may be stuck on an older cached version of the app shell or assets after a deployment unless they manually clear their cache or the browser automatically updates the Service Worker lifecycle.
- **Offline Capabilities:** Appears functional for loading the basic shell offline due to the Network-First fallback, but without an update prompt, users might get trapped in an outdated offline state.

## Files Inspected

- `public/sw.js`
  - _Why it matters:_ This is the core Service Worker file defining the caching strategies, cache name, and event listeners (`install`, `activate`, `fetch`).
- `src/routes/__root.tsx`
  - _Why it matters:_ This is the root TanStack Router file where the Service Worker is registered via the `ServiceWorkerRegister` component.
- `public/manifest.json`
  - _Why it matters:_ Defines the PWA metadata (icons, colors, start URL) which interacts with the Service Worker to provide an installable offline experience.

## Current Service Worker / Cache Flow

1. **Registration:** `src/routes/__root.tsx` registers `/sw.js` on `window.load` if `navigator.serviceWorker` is present.
2. **Install (`sw.js`):** Opens `fitcore-v1` cache and caches a hardcoded list of `STATIC_ASSETS` (root `/`, manifest, and icons), then calls `self.skipWaiting()`.
3. **Activate (`sw.js`):** Iterates over existing caches and deletes any that do not match `fitcore-v1`, then calls `self.clients.claim()`.
4. **Fetch (`sw.js`):**
   - Ignores non-GET requests.
   - Ignores `/server`, `ai.functions`, and cross-origin requests (Network Only).
   - Navigation (`mode === 'navigate'`): Network First, catching errors to return `caches.match('/')`.
   - Static Assets: Cache First, falling back to Network. Caches new valid asset responses (excluding `.json`) dynamically into `fitcore-v1`.
5. **Update/Reload:** There is no implemented flow for app updates. The SW calls `skipWaiting()` immediately on install, but the client application does not listen for updates or prompt the user to reload when a new version is available.

## Cache Invalidation and Stale App Risks

- **Stale App Shell / Assets:** Because the cache name is hardcoded (`fitcore-v1`) and never changes dynamically with builds, new deployments will not invalidate the existing cache through the `activate` step.
- **No User Update Prompt:** Users have no visible way to know a new deployment has occurred or to refresh the app. They must rely on the browser's default Service Worker update check (usually on navigation) and manual hard refreshes.
- **Asset Versioning:** Vite handles file hashing for compiled JS/CSS, which helps, but the root `/` (App Shell) is fetched Network-First. If the network fails, it falls back to the _initial_ cached `/`, potentially loading outdated JS bundles that no longer exist on the server.
- **Cache Versioning:** Appears purely manual. A developer would need to manually change `fitcore-v1` to `fitcore-v2` in `sw.js` to clear out the old cache.

## Offline and Failure Behavior

- **Offline Loading:** If offline, navigation requests fall back to the cached root `/`.
- **Missing Assets:** If the cached `/` references an old JS file that was cleared from the server but isn't in the dynamic cache, the app will break (white screen).
- **Dynamic Data:** Server functions, AI, and external APIs are strictly Network Only. If offline, these features will fail. The app currently does not appear to have robust offline queueing or fallback UI defined in the SW for these specific failures.
- **State/Data Risk:** Because data fetches are Network Only, users won't see _stale_ data from the SW cache, but they might not see any data at all if offline, depending on how `react-query` or `localStorage` handles persistence (which is outside the SW scope).

## Deployment and Smoke Check Implications

After each deployment, the following should be manually validated until an automated update flow is built:

- **First Load:** Does the app load successfully and register the SW?
- **Reload:** Does a standard refresh load the new version or the old version?
- **Hard Refresh:** Does a hard refresh correctly clear the cache and load the latest assets?
- **App Update After Deployment:** If a user keeps the tab open during a deployment, do they ever get the new code? (Currently, likely no).
- **Offline/Online Transition:** Turn off network, reload. Does the shell load? Turn network back on. Does it fetch fresh data?
- **Mobile Browser Behavior:** Test in iOS Safari and Android Chrome, as their SW lifecycle management differs.
- **Installed/PWA Behavior:** If added to homescreen, does it open without network?
- **Cache Clearing:** Verify that manually changing `CACHE_NAME` in `sw.js` correctly purges the old cache on activate.

## Risk Table

| Risk                        | Evidence                                                                                  | User Impact                                                                  | Severity | Recommended Future Action                                                   | Safe to Fix Now?      |
| :-------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :------- | :-------------------------------------------------------------------------- | :-------------------- |
| Hardcoded Cache Version     | `const CACHE_NAME = 'fitcore-v1'` in `sw.js`                                              | Users may not get updated assets unless cache name is manually bumped.       | High     | Automate cache versioning or implement cache-busting strategy during build. | No, future runtime PR |
| Missing Update Prompt       | `src/routes/__root.tsx` registers SW but has no `onUpdate` listener.                      | Users sit on stale code until browser forces an update or they hard refresh. | High     | Add a PWA update prompt/toast in the UI that triggers a reload.             | No, future runtime PR |
| Unpredictable Offline Shell | `fetch` fallback for navigation relies on cached `/` which might point to dead JS chunks. | White screen if offline and the cached HTML points to old hashed files.      | Medium   | Pre-cache the specific hashed assets during build (e.g. via Workbox).       | No, future runtime PR |

## Recommended Future Tasks

### Docs/Planning Tasks

- [ ] Define the ideal offline experience for FitCore (e.g., read-only access to logged data, queueing offline logs).
- [ ] Research Workbox integration for Vite to replace the manual `sw.js` script with a safer, automated asset caching strategy.

### Test/Smoke Validation Tasks

- [ ] Create a Playwright E2E test that specifically tests offline mode and service worker caching (using Playwright's network routing capabilities).
- [ ] Add a mandatory manual PWA installation and update smoke test to the QA checklist (`docs/qa/fitcore-merge-checklist.md`).

### Runtime Code Cleanup Tasks

- [ ] **Implement Workbox / Vite-PWA:** Replace manual `sw.js` with `vite-plugin-pwa` to automate manifest generation, asset pre-caching, and SW updates. _(Depends on planning phase approval)._
- [ ] **Add Update Toast:** Build a UI component that listens to the SW lifecycle and shows "New version available! Click to reload." when an update is found. _(Depends on Workbox implementation)._

## Stop Conditions for Future Runtime Work

A future agent should **STOP and ask for review** before changing service worker/cache behavior if:

- **Unclear Cache Ownership:** It is unclear which files are dynamically cached vs pre-cached.
- **Risk of Breaking Offline App:** The proposed changes to `sw.js` might cause the navigation fallback (`caches.match('/')`) to fail.
- **Data Integrity Risk:** The changes might accidentally cache dynamic API responses, leading to stale user health/fitness data.
- **Deployment Ambiguity:** The build process (Vite/Nitro) changes how assets are hashed, breaking the existing SW logic.
- **Touching High-Risk Files:** The work requires modifying `src/routes/__root.tsx` or other core bootstrap files simultaneously with other major feature PRs. Wait for a clear integration window.
