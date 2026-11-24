# Campaign audit status — November 24, 2026

Main inspected at `47a214e8dacaaa7be4748fd91b82d9921238d609`. Production changes,
merges and destructive real-account checks require Drew's approval.

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
| C01 | WHOOP disappears after cold start | Restoration published in #320; mergeable, hosted rerun pending | Local encrypted SQL artifact restoration in WebKit/Chromium, full process termination and DB reopen; six authorization restart cases pass | Approved production activation and installed-iPhone verification | P0 |
| C02 | Provider deletion not handled in archive-only activation | Confirmed prerequisite defect; fixed in #321 | Signed deletion through actual built API under restricted role, without cron; tombstones prevent reimport | Deploy approved code/grants and register WHOOP webhook | P0 |
| C03 | No historical import | Full-history persistent import in #322 | Seven real-SQL cases; both mobile artifact pause/terminate/DB-reopen/resume tests pass | Approve migration 007 and flag after archive activation; real granted scopes verified at runtime | P1 |
| C04 | Fabricated Goals progress | Main contains #317 | Recorded-goal metric artifact checks passed across both mobile engines during #320 reconciliation | Physical usability check when deployed source changes | P1 |
| C05 | Fabricated Stats associations / missing WHOOP history | Main contains actual Pearson #318; charts/comparison extensions in #323 | All 1,027 integrated unit tests; existing correlation artifact cases and new old-history/six-metric tables pass in both engines | Merge approved dependency stack; real history depends on activation | P1 |
| C06 | Regression harness expected a refresh before it was due | Fixed by #312 | Current report explains actual 600-second lease and renewal deadline; assertions wait for HTTP failures and replacement | Combined artifact gate rerun | P1 |
| C07 | Hosted WebKit process-restart test times out | Fixed in #320 commit a2b40e6 | Downloaded trace showed all assertions passed, Browser.close pending; route draining/context closure passes all six local cases | Hosted required checks on corrected head | P1 |
| C08 | Jarvis duplicate/unintended writes and failed-save recovery | Existing action transactions, review gating and stale-review fences preserved | Integrated unit suite passes, including typed actions and photo transactions; no new failure reproduced in code review | Combined artifact gate; real-provider/device checks remain distinct | P1 |
| C09 | Photo review/correction loses drafts or duplicates meals | Existing photo transaction deduplication and revision targets preserved | Unit tests pass; reviewed hook retains normalized draft on save failure and modal/background interruption, discarding raw images | Combined artifact photo checks and physical camera picker | P1 |
| C10 | iPhone voice permissions, interruptions and duplicate submission | Existing bounded MediaRecorder/transcription generation fence preserved | Unit voice capture/transcription cases pass; transcripts remain editable before sending | Combined artifact cases; real microphone/permission verification on iPhone | P1 |
| C11 | Active workout, backup and offline reliability | Existing state restoration and verified transaction paths preserved | Integrated persistence tests pass; prior hosted Playwright jobs passed in all three projects | Current release artifact gate and physical keyboard/background check | P1 |
| C12 | Saved reminder choices imply delivery without a mechanism | #315 truthfully labels future delivery; in-app delivery now implemented on independent main-based branch | Explicit opt-in, saved times, data-aware due checks and atomic daily dismissals have passing unit/backup checks | Artifact validation and focused PR; Web Push remains separately scoped | P2 |
| C13 | Settings/camera/composer reachability, keyboard and scroll behavior | Existing #313/#315 and composer/scroll changes preserved | Current code inspected; existing browser cases are in the combined release gate | Physical touch/keyboard/camera checks and current gate results | P2 |
| C14 | Weigh-in quick sheet lacks dialog semantics and focus containment | Confirmed during new reminder artifact test; enabled existing sheet focus management | All eight final reminder/weigh-in artifact cases pass across both mobile engines, including failed-save retry | Physical assistive-technology/keyboard check | P2 |

No finding is marked production-complete solely because code exists or a related
PR merged. No new Jarvis production defect was established by the scoped review;
working implementations were not rewritten speculatively.

## Published work and dependencies

Merge order, subject to approval: **#320 → #321 → #322 → #323**. Main has not
been merged or production-modified by this campaign. Analytics initially had a
duplicate PR #324; it was closed and the already-existing #323 was retitled and
retargeted to the import dependency. No code was discarded.

- #320 head: `a2b40e660ae9a5856f05d3e573769d932a7b38f9`.
- #321 head after teardown propagation: `fda78cc`.
- #322 head after propagation: `00014e9789f822d49d985bd05f7c585da5e45b20`.
- #323 head after propagation: `dd81e57d0e6a220dd5b0d05f63a444bf6eb9438b`.
- Combined hosted artifact gate: run `45406521513`; PR #320 also runs its required
  automatic checks. Old manual stack runs were cancelled after identifying the
  shared teardown defect, rather than repeating an unchanged failing harness.

The production activation procedure and exact Neon/Vercel dashboard locations are
in #321's `docs/implementation/whoop-production-activation.md`. Read-only inspection
found migrations 001–005 only, unset archive flags, existing encryption/runtime
configuration and one connected account, with six-hour recovery history. Owner
consent, hosted archive enablement and physical iPhone completion remain pending.
