# FitCore integrated application progress

Updated: 2026-11-23. Worktree: fitcore-core-integration. Branch: codex/fitcore-core-integration.

## Four primary goals

1. Jarvis answers from authorized, verified fitness history.
2. Text and push-to-talk logging share reviewed, transactional records.
3. Editable food photo estimates update existing nutrition records.
4. A coherent dashboard combines WHOOP, workouts, nutrition and progress.

## Current stage and plan

- [x] Read the three supplied requirements files and inspect existing candidates.
- [x] Start from current main 5179692; preserve working WHOOP (#299–301).
- [x] Reconcile existing Jarvis text PR #286 without removing current nutrition targets or saved foods.
- [x] Reconcile recorded sleep PR #298 against native WHOOP precedence.
- [x] Validate shared persistence, correction/undo, missing macros, consent and provider failure with synthetic unit and mobile production-artifact tests.
- [x] Prepare the focused review candidate and record validation evidence; PR publication follows this commit.
- [ ] Continue voice/photo integration only after this core candidate is reliable.

## Decisions and boundaries

Reuse current storage and backups. No production schema reset. No merge, deployment, billing activation, production secrets changes, or real health-data provider requests are authorized.
Old dirty worktrees remain untouched; integration uses the published candidate commits rather than uncommitted older experiments.
The former cancelled release gate now has a 25-minute timeout and WHOOP/nutrition coverage on main; retain all existing cases and add Jarvis cases. Investigate actual failures before altering timing or coverage.

## Validation and limitations

Integrated locally, not merged or deployed. Full unit suite: 874 passed / 0 failed; TypeScript passed. Initial Vercel production build passed. Final targeted mobile artifact batch: 28 passed, 0 failed; final provider/WHOOP security batch: 16 passed, 0 failed. Scoped ESLint semantic rules passed; the ordinary formatter rule reports existing file style/CRLF issues, so a full clean lint result is not claimed. PR #286 and #298 are open drafts with conflicts against main. Physical iPhone and live provider acceptance remain unverified for this candidate.

## Dependencies and next stages

Production credentials are unnecessary for synthetic validation. Provider model availability/free limits and terms must be rechecked before enabling new modalities. Physical-device acceptance: active workout survives background/force close/update; microphone denial/interruption preserves draft; camera cancellation saves nothing; offline records persist; repeated confirmation saves once.

## Integration findings and decisions

- PR #286 and #298 are not superseded by main. Both are incorporated in this review branch with their histories retained; do not merge the older drafts separately after accepting this candidate.
- Preserve #301 native WHOOP selectors and measured-vs-derived scoring. Optional sleep quality uses the existing 0/unrated representation; it never invents a rating. Preserve an explicitly recorded zero-hour night, as required by main's regression test.
- Calorie-only meal presets now retain their unreported-macro marker during reuse and backup. Regression observed failing before the fix.
- WHOOP-shared messages use only the current question, expose only read tools, never run local logging interpretation, and do not enter later ordinary conversation context. Synthetic browser regressions observed failing before fixes.
- One focused read-only reviewer found the local-command WHOOP consent bypass; fixed with regression coverage. No other integration findings from that review.
- Vercel Git deployment is explicitly disabled for this branch. No merge to main or deployment has occurred.
- Browser plugin skill is unavailable; use the repository's Playwright suites as explicitly required. Localhost tests require execution outside the network sandbox. All fixtures and provider replies are synthetic; no real health records, provider credentials, or billable calls.
- Prior #286 hosted release gate at https://github.com/DrewDiStefano11/app/actions/runs/43965492067 passed 102 checks. Main #301 records 134 passing mobile cases in 7.4 minutes. Retain the current 25-minute gate and every existing test selection; append combined Jarvis and sleep cases rather than removing coverage. Current candidate hosted result remains pending.

## Backup and rollback boundary

Current validators continue to accept historical workouts, meals, goals, templates and presets; full unit coverage includes backup export/recovery and rejected writes. No reset or new storage system is introduced.
A synthetic compatibility probe compared main's validator with this candidate: the new snapshot is valid here but rejected by main because of new Jarvis settings/model IDs and calorie-only meals. Therefore a code rollback to pre-Jarvis main is **not data-compatible after this candidate has saved data**. Export before any approved release; retain a compatible deployment with the new validators and restore the backup there, or fix forward. Do not import new backups into the old build, silently synthesize missing macros, or overwrite browser storage to force compatibility. A release requires review of this boundary; no release is performed in this task.

## Final validation corrections

The initial 50-case mobile batch had 46 passes and four failures from old sleep display assertions (whole hours versus main's hours/minutes labels). Preserve the native display and update those assertions.
The cross-feature workout test exposed an unsupported "last time" bench-history phrase; a failing unit/browser regression now covers the minimal local parser fix.
The final consent tests also exposed incomplete test isolation: mocking WHOOP status alone allowed the foreground coordinator to call unmocked records/sync endpoints and clear access nondeterministically. Both suites now stub all three endpoints and block service workers where network routing is asserted. This changes the synthetic harness, not production authorization behavior.

## Shared nutrition correction

A cross-feature regression reproduced Home=500 kcal versus Deep Dive/Jarvis=1400 kcal for one logged 500-kcal meal and one future-dated 900-kcal meal. `todayMealEntries` now supplies the same local-day, not-in-the-future records to Home, Deep Dive and Jarvis, with existing `calculateMealTotals` reused. Daily-review meal counts use the same records. No storage-format changes. The old nutrition test fixture used dinner at 19:00 with a noon clock; it now evaluates at 20:00 so its logged-day-total purpose remains valid.
The deterministic library-portion helper was renamed from `useLibraryPortions` to `resolveLibraryPortions` so React's hook linter correctly treats it as an ordinary function.
The focused reviewer found no actionable errors in these selector changes and confirmed there are no additional storage/migration changes.

## Provider terms verified 2026-11-23

- Groq lists qwen/qwen3.8-27b and GPT OSS 20B/120B. Its published free-plan table lists 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000 tokens/day for these text models. Exact organization limits can differ: https://console.groq.com/docs/models and https://console.groq.com/docs/rate-limits . This does not certify the user's account as free or enable billing.
- Groq documents inference retention exceptions for abuse/reliability and optional zero-data-retention controls: https://console.groq.com/docs/your-data . No account settings were changed.
- Gemini 3.5 Flash-Lite is listed, but Google's unpaid-service terms prohibit personal/sensitive information: https://aistudio.google.com/docs/terms . Therefore FitCore health text and automatic Gemini fallback are disabled server-side and in the UI, including stale saved settings. Generic provider adapters and synthetic connection tests remain; no paid service is enabled. Photo remains disabled pending a suitable approved vision provider.
- A synthetic server-browser regression was observed failing before adding the Gemini policy guard. Final policy verification passed in both mobile browsers against the rebuilt artifact.

## Candidate physical-iPhone acceptance (pending approved test deployment)

Use synthetic records on a separate approved test origin; preserve the installed production app and export its backup first.

1. During an active bench workout, open Jarvis, log a set, correct it and confirm once. Check the same row and running rest timer.
2. Background, force-close and relaunch the installed PWA; verify the corrected set, finish once, reopen and verify one history record and its PR.
3. Log and correct a synthetic meal; compare Nutrition, Home, Deep Dive and Jarvis. Verify an unknown macro stays unknown.
4. Repeat a local text log offline; interrupt a cloud request and retry. No unconfirmed action may appear as saved.
5. After an approved app update, verify the unfinished workout and backup export/recovery. Voice microphone and photo-camera cases remain blocked on implementation, not certified by this checklist.

Active review candidate: codex/fitcore-core-integration, based on main 5179692. Original drafts: https://github.com/DrewDiStefano11/app/pull/286 and https://github.com/DrewDiStefano11/app/pull/298 . Candidate PR lookup: https://github.com/DrewDiStefano11/app/pulls?q=is%3Apr+head%3Acodex%2Ffitcore-core-integration .


## Milestone validation result
- Final TypeScript: passed. Final full unit suite: 874 passed, 0 failed, 69 files.
- Final Vercel artifact build: passed. Scoped semantic lint: zero errors; two existing settings-effect dependency warnings remain. Full formatting lint is not certified.
- Latest integration batch: 28/28 passed across iPhone WebKit and mobile Chromium, covering text/provider/meal/unknown-macro flow, complete workout history, macro trends, and WHOOP consent.
- After the Gemini policy guard, the rebuilt artifact passed 16/16 targeted provider/WHOOP security cases in both engines.
- Earlier corrected sleep, personal-score, workout interruption, offline reopen, failed-write/retry and backup cases passed in the 39 passing cases of the preceding 42-case batch. Its three consent-harness failures were corrected and passed in the later batches. The earlier 50-case batch's four stale sleep assertions were corrected and passed in that 42-case batch.
- All browser tests are synthetic. No physical iPhone, live provider, merge-to-main, production deployment, billing activation, or production secrets changes are certified or performed.
- Next unblocked development: add push-to-talk transcription through this same review/save lifecycle; then approved vision-provider meal review. Obtain physical-device and provider acceptance before a release decision.
