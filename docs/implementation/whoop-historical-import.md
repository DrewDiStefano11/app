# Historical WHOOP import

Implemented on `codex/whoop-historical-import`, based on #321 and #320. Production
activation and actual account permissions remain separate from synthetic tests.

The owner starts an import in the existing private-history Settings section. Each
POST imports one provider page of up to 25 records, atomically committing encrypted
measurements and the next-page checkpoint under the existing connection lease,
event revision and active owner consent. Leaving Settings or terminating the app
preserves committed progress. Resume reads the checkpoint from PostgreSQL. A failed
write cannot advance the checkpoint or synchronization timestamp.

The API omits `start`, fixes `end` at import initialization and follows every
available page until exhaustion. There is no arbitrary lookback cap. Progress shows
pages, processed records and collection completion; the provider does not supply a
total count for an honest percentage. Normal dashboard synchronization remains
independent; import shares the private-read cooldown with Jarvis and the connection
lease with all WHOOP requests. Requests are spaced by at least two seconds, respect
provider rate-limit cooldowns, and pause after recoverable failures. Completed
collections are not re-requested. Corrected records update stable IDs without
duplicates; persistent deletion markers still apply. Imported dates stay unchanged.

OAuth responses now retain granted scopes inside the encrypted token envelope.
Import verifies each collection's actual granted scope before reading it. Older
envelopes attempt one refresh to learn scope metadata; absent/ungranted permissions
pause import without deleting history or claiming they were verified. A later
refresh that omits scope retains previously verified permissions. Scope consent
never grants AI sharing. An operator/owner may need a reviewed reauthorization
step if the provider cannot report the existing grant.

## Supported measurements

| Collection | Required granted scope | Archived measurements |
| --- | --- | --- |
| Recovery | read:recovery | Recovery %, HRV in milliseconds, resting heart rate; pending/calibrating state |
| Sleep | read:sleep | Sleep performance, actual sleep stage durations, awake/no-data time, respiratory rate, nap flag and original offsets/timestamps |
| Cycle | read:cycles | Strain, recorded average/max heart rate, step_count when supplied |
| Workout | read:workout | Provider activity, strain, heart-rate values and zone durations, original timestamps |

Sleep consistency is not listed in the public v2 schema checked November 24; no
consistency value or replacement is invented. Empty or unscored provider fields
remain unavailable. This import does not add profile or body-measurement scopes.

## Production prerequisites

Apply migration `007-history-import.sql` as migration owner after 006, under
explicit production approval, then set `WHOOP_HISTORY_IMPORT_ENABLED=true` in
Vercel Production and deploy the reviewed code. The archive must already satisfy
the [activation procedure](whoop-production-activation.md), including webhook
receipt and owner consent. The feature flag defaults off and avoids querying
new checkpoint columns until the migration is applied. Existing ordinary sync and
archive restoration do not require migration 007. No production change was made.

## Validation

Real PostgreSQL/PGlite tests under the restricted role cover multi-page resume,
stable windows, corrected deduplication, timestamps, rate limits, pagination loops,
wrong-account data, in-flight withdrawal, durable deletion markers, atomic rollback
on checkpoint write failure, missing scopes and retained scope after rotation.
The full unit suite passed 1,020 tests before two additional targeted cases; all
seven import cases pass. All six final production-artifact WebKit/Chromium checks
pass, including privacy, cold restoration/deletion and import restart/resume.
TypeScript, scoped ESLint and the final Vercel production build pass.

## Official sources checked November 24, 2026

- [WHOOP API reference](https://developer.whoop.com/api/): v2 collection scopes,
  optional unbounded start, descending pagination, native measurement fields.
- [WHOOP rate limits](https://developer.whoop.com/docs/developing/rate-limiting/):
  default 100 requests/minute, 10,000/day, provider reset headers and 429 handling.
- [WHOOP API terms](https://developer.whoop.com/api-terms-of-use/): owner storage
  authorization remains purpose-specific and does not remove security or deletion duties.
