# WHOOP archive activation procedure

Prepared November 24, 2026. This procedure changes production only after Drew
approves the concrete steps. No production modification has been performed.

## Observed prerequisites

The [campaign progress](whoop-campaign-progress.md) records authenticated read-only
inspection. Production `gym-app` is Ready at main `47a214e`; the dedicated Neon
database has migrations 001–005, one connected account, a restricted runtime role,
no archive tables, no archive flags, one branch, one primary compute, no replicas,
no snapshots and a six-hour restore history window.

## Approval package

1. Merge [PR #320](https://github.com/DrewDiStefano11/app/pull/320) after its required
   checks pass. Confirm Vercel production points to the resulting main commit.
2. In [Neon Settings](https://console.neon.tech/app/projects/royal-term-06690298/settings#storage),
   set the project history window to **0 hours** (`history_retention_seconds=0`).
   This removes point-in-time recovery and Time Travel for this dedicated WHOOP
   database. It does not affect FitCore's local workout backups. Do not create an
   archive database dump or snapshot before this operation. Verify the dashboard
   no longer offers earlier restoration; verify there are no snapshots, scheduled
   copies, extra branches, replicas or external exports. Managed physical deletion
   may be asynchronous; a disabled restore window is not proof of immediate disk
   sanitization. If existing copies remain restorable, leave archival flags off.
3. In the [Neon SQL editor](https://console.neon.tech/app/projects/royal-term-06690298/branches/br-square-night-bdsvca4t/sql-editor?database=neondb),
   as migration owner, run the repository's `006-owner-archive.sql`, then
   `operations/archive-runtime-role.sql`. These scripts create no owner consent.
   Run `operations/archive-preflight.sql`: all four archive tables, the invalidation
   column and three lifecycle guards must be present; runtime must have SELECT on
   all four, INSERT/UPDATE on consents/records/imports, SELECT only on deletions,
   and no DELETE on archive tables. The runtime also needs INSERT on webhook_events
   to receive signed deletion events. Role superuser/create DB/create role/bypass RLS
   flags must remain false. Do not re-run migration 006 after successful application.
4. In [Vercel Production variables](https://vercel.com/drew-d611/gym-app/settings/environment-variables),
   add `WHOOP_OWNER_ARCHIVE_ENABLED=true` and
   `WHOOP_ARCHIVE_DELETION_POLICY=no-recovery-copies-v1` only after steps 2–3 pass.
   Preserve the existing encryption secret and database URL. Do not enable temporary
   snapshot caching, AI sharing or background cron as part of this activation.
   Redeploy the approved main revision to make the variables effective. Include
   the production-preflight follow-up: it enables signed webhook receipt for the
   archive independently of scheduled jobs. In WHOOP Developer Dashboard → your
   FitCore app → Webhooks, register model version v2 at
   `https://gym-app-jade-eight.vercel.app/api/whoop/webhook`. Verify registration
   before granting storage consent. The handler uses the existing client secret
   to validate signatures and deletes matching rows synchronously; background
   provider fetches remain disabled. Registration is still unverified.
5. In the installed FitCore PWA, unlock Settings → Integrations & Devices → WHOOP.
   Confirm connected status and the private-history notice, then choose
   **Authorize private WHOOP history**. Verify its authorization timestamp and
   successful sync. This owner action grants personal storage purposes only.

## Physical iPhone acceptance after activation

1. Record the WHOOP last-success timestamp and compare current displayed fields
   with the WHOOP app. Missing or calibrating data must remain unavailable.
2. Force-close FitCore, reopen from its existing Home Screen icon, and verify
   saved measurements appear while refresh runs. Repeat three times. Background
   and resume once. Do not uninstall or clear browser storage.
3. Temporarily lose connectivity after a successful restoration, resume and verify
   measurements remain subject to their actual dates. Restore connectivity and
   verify automatic refresh; temporary failure must preserve last-success time.
4. Check Recover and Home on the next local date: yesterday's measurements must
   not be represented as today's. Verify manual records remain intact.

Destructive disconnect, consent withdrawal and upstream-revocation device checks
require specific approval because they delete archive history. Their SQL and
synthetic browser checks run in isolated fixtures. Do not use the real archive as
a test fixture. Physical acceptance stays pending until Drew reports success.

## Failure handling

If migration/grants/preflight fail, keep both production archive flags unset and
diagnose the reported failure. Do not broaden database privileges. If activation
regresses, disable the archive feature flag through an approved production change
and redeploy; flag disablement stops archive access but does not erase records or
withdraw consent. Use the reviewed termination procedure only under specific
deletion approval, and resolve managed copies as well. Preserve the original key
for any retained authorized ciphertext.

## Sources checked November 24

- [WHOOP API terms](https://developer.whoop.com/api-terms-of-use/): owner authorization,
  security, independent AI restrictions and access-termination deletion duties.
- [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window):
  zero disables instant restore and Time Travel; reducing retention is a recovery
  tradeoff and is distinct from project-deletion recovery.
