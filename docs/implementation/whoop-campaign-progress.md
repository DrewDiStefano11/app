# WHOOP completion campaign

Updated November 24, 2026. Production changes and PR merges require Drew's approval.

## PR #320 reconciliation

- Branch: `codex/fitcore-whoop-archive-restoration`; base main `47a214e8dacaaa7be4748fd91b82d9921238d609`.
- Root cause: #319 squash-merged foundation commit `1e083ef`; the stacked branch independently added three files also added on main. Git reported add/add conflicts in archive-store, archive tests and archive documentation.
- Merged current main, retaining the restoration extensions. Final comparison excludes the existing migration 006, archive grants and archive vault. Goals #317 and correlations #318 remain intact.
- Local validation: 1,013 unit tests pass (including actual PostgreSQL/PGlite SQL under the restricted role); TypeScript, changed-file ESLint and Vercel production build pass. All 18 targeted production-artifact checks pass across iPhone WebKit and mobile Chromium, covering encrypted SQL cold restoration, Goals and Stats. GitHub reports the branch mergeable. Hosted checks are pending for the new head. No inline review threads were reported.
- Not merged, not production activated, not physically verified on iPhone.

## Production inspection (read-only)

Observed in authenticated Vercel and Neon dashboards November 24:

| Prerequisite | Actual state | Required next step |
| --- | --- | --- |
| Deployment | Vercel `gym-app`, production `47a214e`, deployment `Ajsksk1D8y1c6y2kUgeUiENxJiD5`, Ready | Merge approved restoration code before activation |
| Archive schema | Only connections, oauth_attempts, sessions, webhook_events exist; migration 006 absent | Apply `db/whoop/006-owner-archive.sql` as migration owner after approval |
| Runtime role | `fitcore_whoop_runtime` exists; superuser, create DB, create role, bypass RLS all false | Apply `db/whoop/operations/archive-runtime-role.sql` after migration 006 |
| Existing connection | One connection reports connected (no credentials or measurements inspected) | Verify authorized sync after activation |
| Encryption | Production secret `WHOOP_TOKEN_ENCRYPTION_KEY` exists; value never revealed | Keep existing key; archive uses a separate derived key |
| Archive flags | `WHOOP_OWNER_ARCHIVE_ENABLED` and `WHOOP_ARCHIVE_DELETION_POLICY` absent from project variables | Set `true` and `no-recovery-copies-v1` only after deletion-policy verification |
| Recovery copies | Six-hour restore history; no snapshots or schedule; one branch; one primary compute and no read replicas | Resolve managed recovery-copy retention before setting readiness flag |
| Consent | Archive tables absent, so no archive grants exist | Owner uses explicit Settings authorization after activation |
| Other production secrets | Database URL, owner digest, client ID/secret and origin present; values not revealed | No replacement needed based on this inspection |

Neon SQL was executed in an explicit read-only transaction. No production rows,
roles, flags, retention settings or deployment traffic were modified.

Dashboard locations:

- [Vercel variables](https://vercel.com/drew-d611/gym-app/settings/environment-variables).
- [Neon SQL editor](https://console.neon.tech/app/projects/royal-term-06690298/branches/br-square-night-bdsvca4t/sql-editor?database=neondb).
- [Neon restore history configuration](https://console.neon.tech/app/projects/royal-term-06690298/settings#storage).
- [Neon backups](https://console.neon.tech/app/projects/royal-term-06690298/branches/br-square-night-bdsvca4t/restore).

## Remaining work

1. Finish #320 mobile acceptance, publish reconciliation and confirm mergeability.
2. Prepare a production preflight query and exact approval sequence; do not equate deployed code with activated storage.
3. Expand cold-start lifecycle acceptance where gaps remain; physical installed-PWA verification depends on approved activation.
4. Implement resumable historical import, then native historical analytics.
5. Reconcile audit reports against current code; continue confirmed Jarvis/mobile/reminder defects and integrated validation.

WHOOP API terms and API reference were rechecked November 24. Owner-specific
personal storage does not grant AI sharing. Official API documentation does not
specify a maximum historical lookback; backfill must traverse available authorized
pages without imposing an arbitrary short window. Live account scope verification
is separate from the scopes requested by this application.
