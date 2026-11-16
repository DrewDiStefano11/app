# FitCore completion campaign

## Release target

Use the existing `gym-app` project in Drew's Vercel Hobby workspace, connected to
`DrewDiStefano11/app`. The Jarvis project is outside the release scope.
Use the repository root, TanStack Start framework preset, Node.js 24, `npm ci`
and `npm run build`. Leave the output directory override unset. Vercel sets
`VERCEL=1`, which selects Nitro's Vercel preset. Workout logging requires
zero AI environment variables or provider credentials.

Baseline main is `c94398e6eee239c03d038f5f09bbf362470c6dcc`. Drew connected
`app` and created `gym-app`. Vercel rejected the first deployment of
that SHA during dependency installation for CVE-2026-102989. The candidate
pins a matching Vite 7-compatible TanStack package set with React Start
1.168.61 and Start Server Core 1.169.40. The production URL and deployment
ID are pending.

## Production backup and rollback

- Keep one canonical HTTPS origin for installed apps. A deployment URL, a
  preview URL and the canonical origin have separate browser storage. Safari
  and the installed web app can also have separate storage. Install FitCore
  before the first real session and log from the Home Screen app.
- In the app that holds the history, open **Settings → Data → Export** and
  save the dated JSON to private Files or iCloud Drive. Export after the first
  real workout, after important sessions and before a data-changing release.
  Open the saved file or check its size to confirm it downloaded. Keep prior
  backups and treat their contents as private health data.
- **Settings → Data → Import** restores a backup. Export current data before
  importing. Rehearse recovery on an isolated preview or local origin using
  fabricated data. Verify workout counts, notes, exercise order and set
  values after reopening the app.
- Use isolated browser contexts and fabricated records for functional tests.
  Run resets, quota failures, migrations and substantial load on local or
  preview origins. Keep production browser data and backups out of CI.
- Record the SHA, deployment ID and canonical URL at each release. Test the
  candidate on an isolated URL before assigning production traffic. For the
  first deployment there is no prior FitCore release to restore. Retain the
  first accepted deployment as the rollback target for the next release.
- If a subsequent release regresses, use **Deployments → Instant Rollback**
  for the last known-good production deployment, keeping the canonical
  domain. Reopen the app and verify asset, SSR and history access. Rollback
  changes the code served. Browser data can require separate recovery, so
  every schema change needs a tested forward migration, a backup and a
  documented compatibility or restore path before promotion.

[Vercel rollback procedure](https://vercel.com/docs/instant-rollback)

## Release checks and next work

1. Build locked dependencies with `VERCEL=1`. Confirm the Vercel function,
   routing configuration, manifest, icons and service worker are present.
2. Verify clean onboarding, workout edits, interrupted-session resume, a
   single history record on finish, and export and restore. Run at iPhone
   size in Playwright WebKit and Chromium using synthetic records.
3. Verify the same critical flows on the deployed artifact from a fresh
   browser context. Verify the HTTPS origin and PWA assets without Vercel
   authentication using the canonical release URL.
4. Share the canonical URL and ask Drew to verify Safari over cellular, Add
   to Home Screen, numeric keyboard, background/reopen, and a workout saved
   once with the expected history and sets. Track physical-device confirmation
   separately from automated WebKit results.
5. Continue routine management, persistence stress cases and offline startup
   while physical-device confirmation is pending. Follow with the rest of
   training, nutrition, recovery, analytics and the premium UI and Jarvis
   integration work.

Baseline `bun test tests/unit` passed 712 tests across 45 files. A build
using the npm lockfile and Vercel environment produced a version 3 Build
Output API artifact with a Node 24 function and static PWA assets.

The patched candidate passed a clean `npm ci` and a clean Bun frozen-lockfile
install. Both installed one Start Server Core version, 1.169.40. TypeScript
and the Node 24 Vercel build passed. The candidate unit suite passed 713
tests, including 100 synthetic workout sessions, 800 completed sets,
300 verified commits, and five controller reopenings during active sessions.
The first run of the patched production artifact passed 10 focused browser
checks across WebKit (iPhone 13 emulation) and Chromium (390 × 844).
All six final release-safety checks passed after adding explicit server
route and post-reload history assertions.

The initial patched revision `8e99ab0` reached **Ready** in
[`gym-app` preview](https://vercel.com/drew-d611/gym-app/BVWMuKZ34YEyU6GB44tHM2LW41Pq).
FitCore rendered its onboarding page over HTTPS. PR #276 includes the
dependency upgrade and release gate. Review found that a rejected set edit
could be left out of a later finished session. The follow-up keeps the edit
available for retry and blocks finish while it is pending. The updated
candidate passed all 10 release-safety tests across both mobile browsers,
including a workout JSON export and restore in a clean browser context.
The same edit retry preserves exercise notes when storage rejects the
first write. Both browser engines passed the rejection-and-retry check
with edited weight and exercise notes.

The GitHub runner's Bun 1.4.4 exposed four prototype-sensitive backup
assertions. The portable assertions compare the actual exported JSON
values and separately check that the in-memory payload retains its null
prototype. All 30 backup tests passed locally on Bun 1.4.4.

The initial npm audit of the patched lockfile reported zero critical,
seven high, and one moderate finding. CVE-2026-102989 is absent. Review the
remaining build-tool findings and the Zod server-input validation advisory
in a follow-up dependency pass. Keep AI provider keys unset for the
workout-only release. The premium UI PR #262 still has a cancelled
Playwright check. PRs #272–274 each include unrelated deletions of merged
Jarvis material and need isolated reconstruction before integration.

To rerun the focused suite, set `FITCORE_TEST_IPHONE_WEBKIT=1` and
`FITCORE_TEST_PRODUCTION_BUILD=1` after building with `VERCEL=1`. Then run
`npm run test:e2e -- --project=iphone-webkit --project=mobile-390x844
workout-release-safety settings-data-safety-lifecycle-smoke
active-workout-lifecycle-smoke`. For the hosted smoke test, set
`FITCORE_TEST_BASE_URL` to the verified HTTPS origin and select the
first-use and normal workout cases from `workout-release-safety`.
