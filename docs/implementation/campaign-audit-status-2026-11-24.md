# Campaign audit status — November 24, 2026

Main is now `9a4c9c8e8da87ae6f14809016342e50986e1e5e2` (#326). The explicitly
approved WHOOP activation package is applied. Other merges, unrelated production
changes and destructive real-account checks still require Drew's approval.

## Source reconciliation

`FITCORE_AUDIT.md`, `FITCORE_UI_RECOMMENDATIONS.md`, `FITCORE_TEST_PLAN.md` and
`FITCORE_PRIORITY_ROADMAP.md` were not found in this checkout, other workspace
copies or fetched Git history. `FITCORE_BUG_REPORT.md` exists, but is the PR #312
regression-harness reconciliation rather than the original full Freebuff report.
The existing `FITCORE_TEST_RESULTS.md`, test inventory, stress plan and iPhone
checklist were also inspected. Original Freebuff finding IDs cannot be faithfully
reconstructed without those sources. The IDs below are campaign tracking IDs,
not invented original audit identifiers.

| ID | Reported problem | Current status / fix | Verification evidence | Remaining work | Priority |
| --- | --- | --- | --- | --- | --- |
| C01 | WHOOP disappears after cold start | Production enabled through #326; physically verified | Actual consent and encrypted rows across all four kinds, correct account ownership, automatic sync and zero duplicates; Drew confirmed three physical iPhone cold starts restored values before refresh finished | Preserve this verified behavior; no further temporary-cache work | P0 |
| C02 | Provider deletion not handled in archive-only activation | #321 implementation reached production through #326; grants and V2 registration applied | Signed deletion under restricted role without cron passes artifact tests; real endpoint rejects unsigned/forged requests | Observe next genuine provider-signed event; no destructive production test was performed | P0 |
| C03 | No historical import | #322 reached production through #326; migration 007 and flag applied | Actual initial recovery pages committed to encrypted SQL; durable checkpoint survives physical app restart | Complete remaining authorized pages and inspect actual historical UI | P1 |
| C04 | Fabricated Goals progress | Main contains #317 | Recorded-goal metric artifact checks passed across both mobile engines during #320 reconciliation | Physical usability check when deployed source changes | P1 |
| C05 | Fabricated Stats associations / missing WHOOP history | Pearson #318 and chart/comparison extensions #323 are on main through #326 | All 1,027 integrated unit tests; old-history/six-metric artifact tables and hosted release gate pass | Verify owner historical chart/range display and complete backfill | P1 |
| C06 | Regression harness expected a refresh before it was due | Fixed by #312 | Current report explains actual 600-second lease and renewal deadline; assertions wait for HTTP failures and replacement | Combined artifact gate rerun | P1 |
| C07 | Hosted WebKit process-restart test times out | Fixed in #320 commit a2b40e6 | Route draining/context closure passes local cases and the complete hosted #326 release gate | None for this confirmed harness defect | P1 |
| C08 | Jarvis duplicate/unintended writes and failed-save recovery | Existing action transactions, review gating and stale-review fences preserved | Integrated unit suite passes, including typed actions and photo transactions; no new failure reproduced in code review | Combined artifact gate; real-provider/device checks remain distinct | P1 |
| C09 | Photo review/correction loses drafts or duplicates meals | Existing photo transaction deduplication and revision targets preserved | Unit tests pass; reviewed hook retains normalized draft on save failure and modal/background interruption, discarding raw images | Combined artifact photo checks and physical camera picker | P1 |
| C10 | iPhone voice permissions, interruptions and duplicate submission | Existing bounded MediaRecorder/transcription generation fence preserved | Unit voice capture/transcription cases pass; transcripts remain editable before sending | Combined artifact cases; real microphone/permission verification on iPhone | P1 |
| C11 | Active workout, backup and offline reliability | Existing state restoration and verified transaction paths preserved | Integrated persistence tests pass; prior hosted Playwright jobs passed in all three projects | Current release artifact gate and physical keyboard/background check | P1 |
| C12 | Saved reminder choices imply delivery without a mechanism | #325 implements in-app delivery and is reconciled with production WHOOP main | Four targeted unit/backup cases and six integrated mobile artifact cases pass, including failed dismissal, saved times and next-day delivery | Updated hosted checks and merge approval; Web Push is not enabled | P2 |
| C13 | Settings/camera/composer reachability, keyboard and scroll behavior | Existing #313/#315 and composer/scroll changes preserved | Current code inspected; existing browser cases are in the combined release gate | Physical touch/keyboard/camera checks and current gate results | P2 |
| C14 | Weigh-in quick sheet lacks dialog semantics and focus containment | Confirmed during new reminder artifact test; enabled existing sheet focus management | All eight final reminder/weigh-in artifact cases pass across both mobile engines, including failed-save retry | Physical assistive-technology/keyboard check | P2 |

No finding is marked production-complete solely because code exists or a related
PR merged. No new Jarvis production defect was established by the scoped review;
working implementations were not rewritten speculatively.

## Published work and dependencies

Only #320 originally reached main; #321–323 merged into intermediate branches.
Approved integration #326 brought the complete implementation to main without
duplicating the foundation/restoration. All hosted #326 checks passed before merge.
Duplicate #324 remains closed. #325 and Antigravity's #327 still need separate
merge approvals; neither was included in WHOOP activation.

- #320 head: `a2b40e660ae9a5856f05d3e573769d932a7b38f9`.
- #321 head after teardown propagation: `fda78cc`.
- #322 head after propagation: `00014e9789f822d49d985bd05f7c585da5e45b20`.
- #323 head after propagation: `dd81e57d0e6a220dd5b0d05f63a444bf6eb9438b`.
- Combined hosted artifact gate: run `45406521513`; PR #320 also runs its required
  automatic checks. Old manual stack runs were cancelled after identifying the
  shared teardown defect, rather than repeating an unchanged failing harness.

The [activation procedure](whoop-production-activation.md) records the approved
package. Migrations 006/007, restricted grants, zero-hour recovery retention,
V2 webhook registration and three Production flags are applied. Vercel deployment
`DLRQ9oowCmUnD3rDSzXiCeJmR4JU` is Ready/Current at approved main. Actual owner
consent, encrypted persistence and three physical iPhone cold starts are verified.
Historical import completion and genuine provider-signed event observation remain
separate from that completed primary acceptance.
