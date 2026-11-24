# WHOOP historical analytics

Branch `codex/whoop-history-analytics`, based on historical import #322.

The existing Stats Analytics view now offers 7, 14, 30, 90 and 180 days, one year,
and all available recorded history. Its health chart selector displays actual HRV,
resting heart rate, WHOOP recovery, main-sleep duration, sleep performance and
physiological-cycle strain. Each metric has units, observed-day counts, dates,
an observed-day average, first-to-last change and an inspectable measurement table.
Missing dates break lines; there is no smoothing, zero filling or interpolation.
Sleep duration requires recorded stages; naps and pending/calibrating values are
excluded. Charts and correlations use current-device local dates, and recovery
uses the linked main sleep's wake time where available. Original instants remain
available in each table's time element. No values are written to AppState/backups.

The existing Pearson comparison now includes resting heart rate, WHOOP recovery,
sleep performance, strain and actual next-day recovery. The next-day option shifts
the recovery date back one local calendar day to pair it with the preceding day's
input. It does not fill absent recovery dates or treat 24 hours as a calendar day
across DST. Existing paired-day counts, minimum sample sizes, source definitions,
detail tables and noncausal wording remain in place. Existing manual sleep source
selection and nutrition/workout provenance checks remain unchanged.

Five new pure-analysis tests and all eight existing recorded-correlation tests
pass. They cover original units, recorded zero, linked wake dates, corrections,
pending data, missing-date line breaks, old history, future-record exclusion, DST,
naps, incomplete sleep stages and actual next-day Pearson pairs. TypeScript passes.
Changed standalone files pass ESLint. The existing Progress view has 35 baseline
formatting errors after normalizing Windows line endings; it has 32 after this
change, with no errors introduced on changed lines. The unrelated sections were
not reformatted. The integrated unit suite passes all 1,027 tests. Existing Stats
and archive artifact cases pass across both mobile engines. Both historical chart
cases pass after correcting the test selector to the rendered All button; they
verify old/imported dates, all six metrics and the actual recorded-value table.

The feature uses authorized snapshots already restored by the WHOOP integration;
it adds no production flags, database schema, AI sharing or provider requests.
Historical visibility depends on approved archive/import activation and the
owner's available records. Physical iPhone behavior still requires owner testing.
