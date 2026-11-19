# WHOOP first-account readiness — November 19, 2026

## Verdict and approval boundary

**BLOCKED BY SPECIFIC EXTERNAL CONFIGURATION.** Production is deployed with WHOOP unavailable. Local verification does not establish a working live account. Do not connect a real account until the production database, runtime privileges, secrets, callback logging, and recovery-copy inventory have been verified and activation has been specifically approved.

No live infrastructure, production variables, WHOOP app configuration, real OAuth authorization, personal measurements, or production deployment were changed during this audit. The review branch disables its automatic Vercel deployment. Publishing a PR does not authorize merging or deploying it.

## Observed current state

| Item                              | Evidence                                                                                                | Meaning                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Latest GitHub main at audit start | `bcd3989559bf8bd996f0f6e0c4514918b40c3bf4`, fetched from GitHub                                         | PR #292 is merged; no newer main commit at that check                                                                                      |
| Production                        | Vercel deployment `AMbSt1iP979voqKd6HtMkPjYfp6i`, Ready, Production Current, source main at `bcd3989`   | Merged WHOOP code is deployed                                                                                                              |
| Production HTTP                   | `/`, `/privacy`, `/integrations/whoop`, `/sw.js` return 200                                             | Public entry points are available                                                                                                          |
| Disabled API                      | GET status returns unavailable; GET records returns null; GET reconcile returns 204; all carry no-store | Passive requests remain quiet; no evidence of an active account                                                                            |
| Vercel project settings           | gym-app > Environment Variables > Project > All Environments: No Environment Variables Added            | Required WHOOP project configuration is absent; deployment success alone is insufficient                                                   |
| Existing WHOOP app                | gym app; Sandbox; 0 of 10 members; correct callback and privacy URLs; no webhooks                       | Reuse this app; no need for another app or a paid tier for the first account                                                               |
| WHOOP permissions                 | Recovery, Cycle, Sleep, Workout, Profile, Body Measurement                                              | Four required read permissions exist; remove the two unused permissions during approved configuration. OAuth additionally requests offline |
| WHOOP limits shown                | 100 requests/minute, 10,000/day                                                                         | Respect provider responses and cooldowns; no background rollout now                                                                        |
| Neon                              | Console opens at sign-in                                                                                | No project, role, encryption, retention, or connection string could be verified                                                            |
| Other branches                    | #286 Jarvis foundation and #298 recorded sleep both OPEN                                                | Neither was merged or incorporated; revalidate overlap when either lands                                                                   |

PR #292's historical test claims are supporting context only. Its automated Codex review failed to run because the account's review usage limit was reached. That is not a completed code/security review.

## Implementation and security assessment

- Owner unlock uses an independent 256-bit key, SHA-256 digest, timing-safe comparison, opaque 30-day session, and Secure/HttpOnly/SameSite=Lax host cookies. The digest also keys session hashes, so rotating it invalidates old sessions. Lock deletes the current session and pending OAuth attempts through the foreign key.
- OAuth starts with same-origin POST. Eight-character state is bound to a separate random browser nonce and the initiating owner/session. Attempts are consumed atomically. Cross-browser callbacks redirect to a clean restart page; they never import credentials based only on a callback success query parameter.
- Code exchange is server-side. AES-256-GCM uses fresh IVs and binds encrypted token pairs to their owner and connection. Refresh uses an exclusive claim and atomic token-pair replacement. Uncertain refresh outcomes require reconnection instead of reusing a potentially spent refresh token.
- Sync imports bounded, paginated 30-day recovery, sleep, cycle, and workout collections. IDs and update times deduplicate corrections; complete reads replace the rolling snapshot, so authoritative absence removes missing records. Partial failures do not report a successful sync. Missing, pending and calibrating values stay missing. Available step counts are optional; heart rate, HRV, strain and sleep are source-labelled. WHOOP Recovery remains separate from FitCore Readiness and manual workout evidence.
- Upstream cache directives, Age and Date determine freshness. Initial release leaves measurements out of Postgres; the requesting browser holds an ephemeral display for at most two minutes and clears it on hide/lock. Health records stay outside tracking state, exported backups, and service-worker Cache Storage. Credentials and connection metadata remain durable. The transient display is an intentional documented response-display path, not approval for persistent caching.
- Disconnect fences sync/refresh, clears imported measurements, attempts upstream revocation (including safe refresh when needed), deletes credentials, and reports revocation failure with a WHOOP-side removal instruction. Lock is session logout, not provider revocation. Core reset/site-data deletion does not itself revoke a server connection: disconnect separately.
- Server errors and callback parameters are suppressed by application handlers. **Confirmed with a fabricated production callback: Vercel Request Logs > Details > Search Params retains both code and state.** The disabled request returned 503/no-store/empty body and its invocation showed no outgoing requests. The runtime-log view had no application messages. Project Integrations showed none installed; both project and team Drains showed the first-drain upgrade prompt, and team membership showed one Owner. This narrows exposure but does not prove ingress URL redaction or settle provider-internal retention. Vercel documents one hour of Hobby runtime-log visibility; do not treat that UI window as a guarantee that all provider copies are erased. Owner acceptance of this access/retention arrangement remains an activation gate.
- The runtime role is a trusted single-owner backend role. Owner isolation is enforced by parameterized store predicates and authenticated request handlers; there is no database RLS tenant boundary against stolen runtime credentials. Do not expose this role to browser clients or expand to multiple owners without a separate authorization review.
- WHOOP-to-Jarvis sharing is separately gated server-side and requires explicit per-message consent. Default chat does not read WHOOP records; sharing disables cross-provider fallback and write tools. Keep live sharing disabled. WHOOP's current terms restrict AI use and cached/permanent copies; opt-in UI is not proof that the intended provider use is permitted. Obtain the required clarification/authorization before any later sharing rollout.

## Changes in this PR

1. Added `db/whoop/operations/runtime-role.sql`, a one-time setup script after migrations 001–005. It explicitly grants all four required tables (including webhook metadata read by foreground sync), removes PUBLIC database/schema permissions, and grants no DDL, ownership, role creation, replication, bypass-RLS, or inherited memberships.
2. Added a disposable PGlite regression that runs all five migrations, executes that script, switches roles, and exercises session/OAuth/manual sync/disconnection/deletion. It rejects another owner's session, expired sessions, schema creation, table creation, temporary tables, ALTER/DROP, and unrelated data access.
3. Linked the executable setup from the existing architecture guide and qualified privacy retention: six-hour instant-restore history does not bound manual snapshots, branches or exports.
4. Disabled automatic deployment of this review branch. No activation flags or schedules were added. The failed-authorization message now advises checking/removing any WHOOP-side grant before retrying.

## Validation record

The commands below run only synthetic fixtures. Local PGlite validates PostgreSQL SQL and role behavior; it does not verify a Neon-hosted login, network path, TLS, account plan, or backups.

| Check                                                    | Result                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Clean `npm ci --cache ../npm-cache --no-audit --no-fund` | Pass, 463 packages; network-enabled retry after sandbox npm failure                                |
| `node node_modules/typescript/bin/tsc --noEmit`          | Pass                                                                                               |
| Vercel artifact build, `VERCEL=1 npm run build`          | Pass on audited baseline; final patch validation recorded below                                    |
| Baseline `bun test tests/unit`                           | 778 passed, 0 failed                                                                               |
| Restricted runtime migration/store regression            | RED: setup script absent; GREEN: 2 PostgreSQL tests passed with script                             |
| Production dependency audit                              | 0 advisories in `npm audit --omit=dev`                                                             |
| All dependency audit                                     | 8 moderate development-tool findings; 0 high/critical, unchanged lockfile                          |
| Browser suite and final combined checks                  | 122 passed, zero failures in 6.8 minutes; iPhone WebKit and mobile Chromium, final Vercel artifact |

Final combined patch: 779 unit tests passed (61 files, zero failures); TypeScript, Vercel production artifact build, changed-file ESLint and Prettier checks passed. The artifact contains no cron schedule and the emitted client assets contain none of the server credential environment-variable names. A synthetic screenshot smoke check passed in iPhone-profile WebKit and 390×844 Chromium: failed-authorization guidance, privacy navigation, retention disclosure, and no page errors. This is simulated browser evidence, not physical-iPhone verification.

All checks on deployed main `bcd3989` completed successfully: CI build, both CodeQL analyses, all three hosted Chromium profiles, and the hosted production-workout release job. [Main release gate](https://github.com/DrewDiStefano11/app/actions/runs/44532308293). This PR still needs its own hosted checks before merge.

The independent review tightened unused runtime write privileges and identified the failed-callback grant recovery guidance now included in the UI/runbook. The unchanged OAuth implementation still requires manual WHOOP-side recovery if authorization succeeded but persistence could not be confirmed. No automatic revocation was added after an ambiguous database write.

Overlap with ongoing work: #286 modifies `ai.functions.ts`, Jarvis panel, Home, store/types, analytics and the release workflow, so its eventual integration must preserve the server-side WHOOP flag, per-message consent and cross-provider fallback restriction. #298 modifies Recovery, personal-score/observed-fitness calculations and the release workflow, so its eventual integration must retain measured WHOOP observations separately from manual sleep/Readiness. This patch avoids those source files; neither unfinished branch was incorporated.

Development findings concern minimatch via typescript-eslint and postcss-selector-parser. They are build/lint input denial-of-service advisories, not reported production dependency vulnerabilities. Avoid a broad unrelated toolchain upgrade in this integration patch; resolve in dependency maintenance. Do not use this report as a general dependency security guarantee.

## Ordered production activation checklist

Every step that creates infrastructure, changes external configuration/secrets, deploys, or authorizes a real account needs the user's specific approval. Read-only review and preparation can proceed independently.

1. **Approve and sign into Neon.** In [Neon Console](https://console.neon.tech), select/create a dedicated Free project and dedicated WHOOP database, with scale-to-zero. Verify the plan is Free and no paid add-on is selected. Do not attach a browser Data API, branch this database into previews, or load real measurements yet. Match the project region to the existing Vercel region where feasible.
2. **Inspect encryption and copies.** Confirm TLS and Neon encryption at rest. In project restore/backup settings verify the actual restore window (Free currently up to six hours). Inventory branches, manual snapshots, integrations, exports and SQL/request logs. Keep personal-data snapshots/exports absent for this release; if any exist, document actual retention/deletion before activation. Restrict database and log access to the owner. Restoring a backup can restore revoked credentials: after any restore keep integration disabled, delete restored connections/attempts/sessions, and reauthorize afresh.
3. **Apply migrations as migration owner.** Use Neon SQL Editor on the correct production database, one file at a time: `001-credentials.sql`, `002-sync.sql`, `003-webhooks.sql`, `004-cache.sql`, `005-jarvis-read.sql`. These are one-time migrations, not idempotent scripts. On failure stop and inspect committed state; do not rerun blindly. Apply `db/whoop/operations/runtime-role.sql` once. This script revokes PUBLIC database/schema permissions and is deliberately limited to the dedicated database.
4. **Privately assign runtime password.** Use a trusted local PostgreSQL client and `\password fitcore_whoop_runtime` (interactive prompt; no password in commands, SQL history, or report). Store the password in the owner's password manager. Never grant `neon_superuser` membership or use the migration-owner connection for Vercel. Keep migration credentials separately private. Neon-created console roles can have broader membership: use the role created by the SQL script.
5. **Verify the actual runtime login.** Connect with the runtime role over TLS (`sslmode=require`, Neon-supported options). Confirm `current_user` is `fitcore_whoop_runtime`; inspect `pg_roles` for false superuser/createdb/createrole/replication/bypassrls and no privileged memberships; inspect schema/table owners to ensure the runtime owns none. In a disposable synthetic database first, prove SELECT/INSERT/UPDATE/DELETE on the four tables and denied CREATE SCHEMA, CREATE TABLE, ALTER/DROP and unrelated access. Repeat read-only privilege checks on production. The login should have CONNECT, schema USAGE and the documented table-specific DML only in the dedicated database. Inspect PUBLIC CONNECT/TEMP and schema/table grants on every other database in the Neon branch too: PostgreSQL roles are branch-wide, and this script changes only the selected database. No sequence grants are required (UUIDs are generated in the app).
6. **Approve WHOOP developer configuration.** Open [WHOOP Developer Dashboard](https://developer-dashboard.whoop.com) > existing gym app > edit. Keep callback exactly `https://gym-app-jade-eight.vercel.app/api/whoop/callback`, privacy exactly `https://gym-app-jade-eight.vercel.app/privacy`, and Recovery/Cycle/Sleep/Workout. Remove Profile/Body Measurement. `offline` is requested by code for rotating refresh tokens; it is not a separate permission shown in this dashboard. Keep Webhooks empty. Do not reveal/copy the secret into chat or create a second app.
7. **Generate independent keys locally.** Use the private local PowerShell instructions below and a password manager. Save the owner access key and encryption key separately. The raw owner key never belongs in Vercel; install only its digest. Do not reuse the WHOOP secret as either key.
8. **Approve Vercel configuration.** [gym-app > Settings > Environment Variables](https://vercel.com/drew-d611/gym-app/settings/environment-variables) > Production only. Add the seven values listed below; use Secret/Sensitive for credentials. Keep the integration flag unset/false while pending deployment approval. Do not expose variables with `VITE_` or `NEXT_PUBLIC_` prefixes or apply production credentials to Preview/Development.
9. **Accept or remediate verified callback logging.** The synthetic check already confirmed code/state retention in Vercel Request Logs. Recheck gym-app > Logs, team/project Drains/Integrations, export destinations and access controls after configuration changes. No drains/integrations were configured at audit time. Disable unnecessary drains or configure supported redaction under explicit approval; do not claim the app can redact platform ingress URLs. Confirm acceptable retention/access with the owner before any real code arrives. Review the updated privacy policy and support link. Never paste callback URLs with real codes into tickets or chat.
10. **Approve merge/deployment separately.** Review this PR and its checks; merge only if explicitly approved. Deploy the approved code/configuration, with `WHOOP_INTEGRATION_ENABLED=true` and the other three flags unset/false. Do not run a deployment simply to refresh variables without approval. Vercel variables require a new deployment to take effect. Verify the deployed SHA, current production alias and disabled cron configuration.
11. **Perform post-deploy checks before real OAuth.** Public pages return 200; no-session WHOOP status returns 401; records have no-store and require a valid session; unlock works with the independently saved key. Invalid OAuth requests fail closed. Integration/configuration/database failures must leave workouts usable. Confirm no synthetic records remain in the production database. An authenticated disconnected status is not a verified connection.
12. **Approve real-account authorization and measurements.** Only then follow the iPhone checklist below. Verify actual results rather than treating secrets/deployment or a success URL as success.

### Production variables

| Name                           | Value/validation                                                                            | Scope             |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ----------------- |
| `WHOOP_INTEGRATION_ENABLED`    | Literal `true` only for approved activation; otherwise unset/false                          | Production config |
| `WHOOP_ORIGIN`                 | `https://gym-app-jade-eight.vercel.app`, HTTPS origin with no trailing slash/path           | Production config |
| `WHOOP_CLIENT_ID`              | From the existing WHOOP app; no identifier embedded in source                               | Production Secret |
| `WHOOP_CLIENT_SECRET`          | From that same app                                                                          | Production Secret |
| `WHOOP_DATABASE_URL`           | TLS connection string for the restricted login, correct dedicated DB; never migration owner | Production Secret |
| `WHOOP_OWNER_KEY_SHA256`       | Lowercase 64-character SHA-256 hex digest of exact unpadded owner-key text                  | Production Secret |
| `WHOOP_TOKEN_ENCRYPTION_KEY`   | Independent 32 random bytes, canonical unpadded base64url (43 characters)                   | Production Secret |
| `WHOOP_BACKGROUND_ENABLED`     | Unset/false                                                                                 | Initial rollout   |
| `WHOOP_SNAPSHOT_CACHE_ENABLED` | Unset/false                                                                                 | Initial rollout   |
| `WHOOP_JARVIS_SHARING_ENABLED` | Unset/false                                                                                 | Initial rollout   |
| `CRON_SECRET`                  | Not needed for initial release; no cron schedule                                            | Initial rollout   |

### Private local key generation (user runs locally, never in CI)

Use a private PowerShell session with clipboard history/cloud clipboard disabled. These commands do not print key values or write files. Paste each clipboard value directly into a password manager or the named Secret field, never this chat. Save the raw owner key **before** replacing the clipboard with its digest.

```powershell
function New-FitCorePrivateKey {
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
$fitcoreOwnerKey = New-FitCorePrivateKey
Set-Clipboard -Value $fitcoreOwnerKey
# Paste into password manager: FitCore owner access key. Keep for iPhone unlock.
# After saving it, run the next lines:
$fitcoreDigestBytes = [System.Security.Cryptography.SHA256]::HashData(
  [System.Text.Encoding]::UTF8.GetBytes($fitcoreOwnerKey))
Set-Clipboard -Value ([Convert]::ToHexString($fitcoreDigestBytes).ToLowerInvariant())
# Paste into Production Secret WHOOP_OWNER_KEY_SHA256.
$fitcoreEncryptionKey = New-FitCorePrivateKey
Set-Clipboard -Value $fitcoreEncryptionKey
# Save in password manager, then paste into WHOOP_TOKEN_ENCRYPTION_KEY.
# After both entries are saved:
Set-Clipboard -Value ''
Remove-Variable fitcoreOwnerKey,fitcoreDigestBytes,fitcoreEncryptionKey
```

Use PowerShell 7/.NET with these cryptography APIs. Removing variables is not a secure memory wipe; close the session afterward. Keep the encryption key recoverable in the password manager; replacing it makes existing ciphertext unreadable and requires reconnection. Rotating the owner-key digest invalidates existing sessions but does not revoke WHOOP credentials.

## iPhone checklist after activation and explicit real-account approval

1. Open the installed FitCore icon > Settings > Integrations & Devices > WHOOP. Preserve the existing installation and workout data. Unlock with the FitCore owner access key, not the WHOOP password/client secret.
2. Tap Connect WHOOP; authorize only the expected read permissions. After return, wait for the server-verified Connected to WHOOP status. A `?whoop=connected` URL alone is not proof.
3. If Safari receives a restart page, open `https://gym-app-jade-eight.vercel.app/integrations/whoop` in Safari, unlock there and start Connect WHOOP again from that same Safari context. Never copy callback parameters between browsers. Return with the FitCore Home Screen icon; unlock its own session if needed, then verify status. Safari and the installed PWA can have separate cookies.

   If WHOOP approved access but FitCore reports a failed connection, first recheck server status. A successful token exchange followed by session expiry, lock, or an uncertain database save can leave a WHOOP-side authorization. If FitCore remains disconnected, check WHOOP's connected apps and remove FitCore there before retrying. Do not assume a failed callback revoked that grant. If FitCore reports connected, use its Disconnect action to remove the stored connection before any new authorization. Automatic revocation after an ambiguous save could invalidate a successfully committed connection, so recovery is explicit.

4. Tap Sync Now in the installed app, wait for completion, then inspect Home and Recovery/analytics. Compare timestamps, timezone, recovery, HRV, resting heart rate, sleep, strain, activities, cycle and any available steps with the WHOOP app. Pending/calibrating/missing values are valid states; do not fill them manually to make a match. FitCore Readiness remains separate. Re-sync after returning if ephemeral measurements have cleared.
5. Verify offline workout logging and active-workout reopening without clearing storage. WHOOP sync needs connectivity; loss of connectivity must not affect saved sets, six-day bench history, nutrition or backups.
6. With approval for this destructive connection test, tap Disconnect WHOOP. Check disconnected status and removal of WHOOP observations, preserve FitCore history, and verify upstream access removal. If revocation reports failure, remove FitCore in the WHOOP app's connection settings. Reconnect through the same secure flow when approved.

Mobile WebKit/Chromium automation simulates the browser flow. A physical-iPhone/standalone-PWA test remains outstanding until the owner performs it with real authorization approved.

## Rollback and deletion

For an approved service rollback, disable the integration flag and keep background/sharing/cache flags disabled, then deploy only with approval. This stops API access, but is not equivalent to provider revocation or credential deletion. Prefer disconnect while the integration is available; if it cannot run, revoke in WHOOP and have the migration owner remove connection/attempt/session rows under explicit approval. Do not reset FitCore tracking or restore an old browser backup to fix an OAuth problem.

Expired sessions/attempts are denied by expiry checks; their metadata can remain until owner cleanup; the existing background job also does not purge sessions or attempts. Document a manual maintenance/deletion process before long-term use. No real database was created or cleaned by this audit.

For a discovered security incident, WHOOP's current terms require prompt notice to `security-notifications@whoop.com` within 48 hours of discovery; suspected unauthorized credential access also requires prompt notice. The owner must manage that response and affected-user notification as applicable. No incident was identified or external message sent during this audit.

## Official sources checked November 19, 2026

- [WHOOP OAuth](https://developer.whoop.com/docs/developing/oauth/): callback registration, eight-character state, offline scope and rotating refresh tokens.
- [WHOOP app setup](https://developer.whoop.com/docs/developing/getting-started/): existing app editing and minimal scopes.
- [WHOOP API reference](https://developer.whoop.com/api/): v2 collection and revoke endpoints.
- [WHOOP API Terms](https://developer.whoop.com/api-terms-of-use/), effective October 6, 2026: privacy/security requirements and limits on copies, sharing and AI use. This audit identifies activation conditions; it does not certify legal compliance.
- [Neon plans](https://neon.com/docs/introduction/plans), updated November 12, 2026: Free limits, six-hour history and separate manual snapshot support.
- [Vercel runtime logs](https://vercel.com/docs/logs/runtime), [log drain schema](https://vercel.com/docs/drains/reference/logs), [environment variables](https://vercel.com/docs/environment-variables): confirm the actual project's settings before activation.
