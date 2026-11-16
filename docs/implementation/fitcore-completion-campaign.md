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
ID are recorded below.

## Initial production release

- Production URL: [gym-app-jade-eight.vercel.app](https://gym-app-jade-eight.vercel.app).
- Vercel project: `gym-app`, Drew Hobby. Deployment: [BDK8JdkikrNcMuxYNYVmWRJ5zSk9](https://vercel.com/drew-d611/gym-app/BDK8JdkikrNcMuxYNYVmWRJ5zSk9).
- Release commit: `1d04ace4b5ca0fe31f5e12f94718b5daec78832f`, merged in [PR #276](https://github.com/DrewDiStefano11/app/pull/276).
- GitHub passed 713 unit tests, 408 full Playwright tests, 14 focused
  production-artifact mobile checks, CodeQL, build and dependency review.
- The public HTTPS origin passed four fresh-context WebKit and mobile
  Chromium cases. They verified onboarding, install assets, the sitemap
  server route, set entry, resume after reload, and a single history
  record with the expected set and note. The isolated backup round-trip
  restored an actual synthetic workout in both engines.
- Drew confirmed the installed iPhone app preserved an unfinished workout
  after closing and reopening. He requested that startup open that session
  directly. The auto-resume follow-up waits for storage hydration before
  displaying a screen. In Safari over cellular, open
  the production URL, choose **Share → Add to Home Screen**, enable
  **Open as Web App** if offered, and launch from the new icon. Check
  numeric entry, backgrounding, force-close/reopen, finish/history, and
  **Settings → Data → Export** using a test session.

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

## Offline and volume follow-up

An isolated server-connection outage test passed in iPhone-sized WebKit
and Chromium with the revised service worker. It entered a set, closed
the page, reopened and resumed while the origin was unavailable, finished
the workout, then verified the same set and one saved history record
after connectivity returned. WebKit's `setOffline` emulation returns an
internal navigation error even for a literal service-worker response, so
the test disconnects a local proxy instead.

The release's synchronous persistence path was measured on Windows with
Bun 1.4.4 and a synthetic, byte-counted 5 MiB storage adapter. Each
workout contained 3 exercises and 15 completed sets.

| Workouts | Sets | Bytes after two commits | Initial write | Edit | Reopen |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 15 | 8,411 | 11 ms | 9 ms | 1 ms |
| 50 | 750 | 133,313 | 47 ms | 98 ms | 16 ms |
| 250 | 3,750 | 650,213 | 273 ms | 489 ms | 73 ms |
| 1,000 | 15,000 | 2,595,713 | 814 ms | 1,635 ms | 296 ms |
| 2,000 | 30,000 | 5,227,713 | 2,115 ms | 4,220 ms | 631 ms |

Expanding notes after the 2,000-workout case exceeded the injected
quota. The controller reported `storage_error` and a fresh controller
recovered all 2,000 unchanged workouts. These times cover the storage
controller. Browser and physical-device latency measurements remain
pending. The 250-workout edit exceeded the 250 ms target and large
histories need a narrower write path.

[Playwright WebKit offline emulation issue](https://github.com/microsoft/playwright/issues/42775)

## Production follow-ups

| Change | Production revision | Verification |
| --- | --- | --- |
| Resume unfinished workout directly after loading its saved data | [PR #278](https://github.com/DrewDiStefano11/app/pull/278), `fb76651` | Six public WebKit and Chromium cases passed for active and inactive relaunch and finish/history. |
| Recurring bench strength program and reusable workout templates | [PR #279](https://github.com/DrewDiStefano11/app/pull/279), `909c704` | All 10 public WebKit and Chromium cases passed. They cover schedule selection, target and actual values, relaunch, duration, progression approval and older mixed sets. |

The program deployed to [gym-app on Vercel Hobby](https://vercel.com/drew-d611/gym-app/7A9rtxZurXot32ai6wjfwCbTMcNc) at the canonical origin. An isolated same-origin WebKit update test switched from the old release to the new release with an active service worker and preserved the unfinished set. One already-open tab on the live origin loaded the previous build during rollout. Drew verified installation and unfinished-workout persistence on his iPhone. Direct relaunch into the logger and program display on that device remain to be confirmed.

## Set-edit performance

Run `bun tests/benchmarks/persistence-edits.ts` to exercise the runtime controller with 3 exercises and 15 completed sets per historical workout. The probe edits one active set five times and reopens storage with a new adapter to verify the history count and final set.

| Synthetic workouts | Baseline median edit | Candidate median edit |
| ---: | ---: | ---: |
| 50 | 130 ms | 38 ms |
| 250 | 652 ms | 194 ms |
| 1,000 | 3,352 ms | 1,029 ms |

These initial measurements used Bun 1.3.14 on Windows and an in-memory adapter. The controller still reads both slots and checks the current revision. It reuses a frozen backup only when the slot bytes match exactly. Altered or missing slots still take the original integrity and recovery paths. The change keeps the same storage format and requires no migration. Browser and device latency are separate measurements. Large histories still need further work.

[Dependency hardening PR #280](https://github.com/DrewDiStefano11/app/pull/280) shipped in `61cab7c` on [Vercel](https://vercel.com/drew-d611/gym-app/C2rHStEXeMykjeqYrwi88SqTGpN2). The npm production audit returned zero findings. Development audits still report lower-severity items. Six hosted mobile cases passed for onboarding, workout history and the weekly program. The persistence candidate passed 16 local mobile cases covering the workout, offline use, backups and settings. Remaining product work includes user-created multi-day schedules, rest timers, all-history performance, the staged premium UI integration in #262, recovery and nutrition refinements, and Jarvis safety work. Keep integrations and destructive data tests isolated from existing iPhone storage and from the deployed Jarvis project.
