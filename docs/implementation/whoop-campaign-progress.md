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

## Activation preflight follow-up

Branch `codex/whoop-production-preflight`, based on #320. Prepared a read-only SQL
preflight and an explicit activation/physical-device procedure. Found and fixed
a prerequisite defect: the webhook route was gated on background cron, while
archival flags did not enable signed provider deletion receipt. Archive activation
now enables webhook receipt independently of scheduled sync. The archive grant
script adds only INSERT on existing webhook metadata; preflight verifies it.
Production webhook registration in the WHOOP dashboard remains unverified and is
required before real storage consent. No production changes were made.

Published as [PR #321](https://github.com/DrewDiStefano11/app/pull/321), commit
`34ce3793c6ebff5c97938b95b3f32efdf5286616`. Fifteen targeted SQL/API tests, TypeScript,
scoped lint, production build and both artifact browser checks passed, including
signed deletion without cron. Its base is #320; automatic workflow branch filters
exclude that base, so the existing release gate was explicitly dispatched.

## Historical import

Branch `codex/whoop-historical-import`, based on #321. Implements the complete
Settings import/pause/resume workflow, bounded server pages, atomic encrypted
record/checkpoint commits, rate limits, scope verification and full-history
pagination. Migration 007 and `WHOOP_HISTORY_IMPORT_ENABLED=true` are additional
approved production prerequisites. Feature defaults off; existing archive paths
continue to work without migration 007.

The full unit suite passed 1,020 tests before two additional cases; all seven
targeted import tests pass, including real checkpoint rollback and PostgreSQL
submillisecond timestamp handling. Initial production-artifact acceptance passed
all four cases across WebKit/Chromium, including browser termination, disk database
reopening and import resume. Final validation also covers the updated privacy
notice: all six final cases pass, with TypeScript, scoped lint and production build.
See [import details](whoop-historical-import.md). Production and physical
iPhone verification remain outstanding.

Historical import is published as [PR #322](https://github.com/DrewDiStefano11/app/pull/322),
commit `86613a03c5d2738f7bfa014ed8eee9a055c55693`. The hosted release gate was
explicitly dispatched because its stacked base is outside automatic branch filters.

## Historical analytics

Branch `codex/whoop-history-analytics`, based on #322, integrates six historical
health measurements and expanded time ranges into existing Stats. Existing Pearson
comparisons now support recovery, RHR, strain, sleep performance and next-day
recovery. Thirteen targeted analysis/correlation tests and TypeScript pass. Scoped
lint passes outside the pre-existing Progress formatting findings, with no new
findings on changed lines. All 1,027 integrated unit tests pass. Existing Stats and
archive artifact cases pass; both new historical chart cases pass after correcting
the All-button selector, with actual old dates and all six metrics checked. See
[analytics details](whoop-history-analytics.md).

## Hosted validation finding

PR #320 remains mergeable but its WebKit release gate failed. Downloaded trace
proves all revocation/privacy assertions completed; its final Browser.close call
remained pending while intercepted requests were still attached. Chromium release,
all three full Playwright projects, build, CodeQL and dependency review passed.
The teardown is being repaired on #320 before requesting merge approval. Superseded
manual #321/#322 release runs were cancelled to avoid repeating the same teardown
failure. Production and owner data are unaffected.

## Urgent production persistence priority — November 24, 09:16 EST

Drew's physical iPhone cold-start test still fails. Lower-priority campaign work
is paused until production persistence is physically verified.

GitHub inspection confirms #320 merged to main (`feffe86`); #321 merged to
`codex/fitcore-whoop-archive-restoration` (`c866896`), #322 to
`codex/whoop-production-preflight` (`cf03453`), and #323 to
`codex/whoop-historical-import` (`94efd85`). Their merged labels did not mean
all implementation reached main. The earlier merge-readiness notes above are
historical and superseded by this finding.

`codex/whoop-production-integration` starts at current main and cherry-picks only
remaining preflight/deletion, import and analytics changes (`10d20c3`, `8e8c141`,
`072e477`). Before operational documentation updates, its entire tree is identical
to merged head `94efd85`. No duplicate foundation/migration 006 implementation,
reminder changes or unpublished lifecycle-test work is included.

Authenticated production inspection: Vercel deployment
`JC9hXxfgeZM8gmAYR82CYxp2Hpga` is Ready and Current at main `feffe86` (#320).
The later WHOOP changes are previews only. Archive/history/deletion-policy flags
are absent. Neon still has only connections/oauth_attempts/sessions/webhook_events;
archive migrations 006/007 are unapplied, and runtime lacks webhook INSERT.
Recovery is six hours; no snapshots or schedules, one branch. WHOOP developer app
has no webhook configured. Its v2 canonical callback URL is prepared but unsaved.
No production mutations, consent writes or measurement reads were performed.

Integration validation: TypeScript and Vercel production build pass; 26 focused
real-SQL/archive/import/analytics unit tests pass. Built-artifact WebKit/Chromium
persistence acceptance passed all four cases (1.2 minutes) at this integration milestone. These are
simulated tests, not evidence that real production storage is enabled.

The updated activation procedure specifies migrations 006/007, restricted grants,
zero recovery retention (explicit loss of point-in-time recovery), signed v2
webhook registration, three production flags and redeployment of approved main.
Added aggregate-only persistence SQL for before/after evidence without reading
ciphertext, credentials, IDs or measurement values. Required approvals: PR merge
and concrete production activation package. Owner consent, encrypted row creation,
production restoration ordering and physical iPhone acceptance remain pending.

Published focused main-target integration PR: https://github.com/DrewDiStefano11/app/pull/326.
Merge and concrete production activation approval requested together. Actual owner
storage and physical iPhone acceptance remain blocked on that approval and subsequent
activation/consent; lower-priority development remains paused.
