# FitCore integrated application progress

Updated: 2026-11-25. Active campaign checkout: `fitcore-merge-staging` (isolated from all preserved worktrees). Baseline: `90d90756366e8f4aef33597220d295aa89ee228f`. PRs #325, #327 and #328 are merged; no open PRs at campaign start. Current requirements are the two pasted continuous feature campaign files supplied November 25. Older dated checkpoints below remain historical evidence.

## Continuous feature campaign checkpoint � November 25

- Phase 0 complete: fetched current main, checked open PRs and merged prerequisites, read the existing photo plan and latest campaign handoff. Clean isolated branch `codex/fitcore-multi-photo`; no existing work replaced. Locked npm install, baseline single-photo server cases (4), TypeScript and Vercel production build pass. No new general audit.
- Phase 1 implemented: shared Nutrition Photo Log/Jarvis picker supports sequential camera capture, multi-select library, mixed sources, numbered previews, individual removal/replacement, optional context and one Analyze Photos action. Invalid batches apply atomically. Attachments survive recoverable errors and native-picker/background interruptions in memory; explicit discard/unmount/page destruction releases them. No raw photo persistence.
- One native multi-image request reconciles repeated views, distinct foods/plates, reference objects, packaging and labels. Structured per-photo evidence must cover every attachment or the response is rejected with retry available. Consolidated draft keeps original observations, uncertainty/clarification, exact editor, conversational corrections and verified exactly-once save/undo. Single-image API input remains compatible.
- Verified limits: [Groq vision](https://console.groq.com/docs/vision) and [Qwen model](https://console.groq.com/docs/model/qwen/qwen3.8-27b) document THREE native images, each 2048 image tokens. Initial max is therefore 3, subject to the user's verified-provider-limit exception to five. No second provider, automatic multi-stage calls or paid service. [Groq free tier](https://console.groq.com/docs/rate-limits) lists 30 RPM/1K RPD/8K TPM/200K TPD; actual account limits can differ. Completion caps 3000/2048/1024 for 1/2/3 photos reduce reservation pressure; long responses fail explicitly if truncated. Quota errors retain attachments and honor Retry-After. No live provider quota consumed; photographic accuracy and actual account limits are not certified by mocks.
- Payload: 1600px longest edge, JPEG qualities .85/.75/.65 targeting 1 MiB per image; hard 2 MiB per image and 3 MiB combined. 3 MiB base64 is about 4.19 MB plus bounded JSON, under [Vercel's default 4.5 MB body limit](https://vercel.com/docs/functions/limitations). Unreadable label text must remain uncertain. Original metadata stripped locally. No production flags/infrastructure/WHOOP policies changed.
- Validation: full 1,052 unit tests passed before the final per-photo evidence guard; final 7 server tests pass including missing/duplicate evidence rejection. TypeScript and scoped semantic ESLint pass. Vercel production build passes. New development mobile cases passed 6/6 across iPhone WebKit/Chromium; final production photo/camera/multi-photo suite is running. Physical iPhone testing is explicitly deferred, not a blocker.
- Publication: phase-1 PR pending final production test results. Do not merge without user approval.
- Next: publish the phase-1 PR, then implement phase 2 on an independent branch from current main. Confirmed gap: food-reference.ts strips historical phrases without querying dated records. Add deterministic verified meal-history reuse/ambiguity handling before saved-library fallback; reuse review/transaction infrastructure. Existing saved foods, usual meal slots, multi-item catalog parsing, portion corrections, bench history and active workout logging must be retained.
- Remaining: phase 2 historical intelligence; phase 3 configurable recorded progression/plateaus; phase 4 missing analytics; phase 5 targeted dashboard integration; phase 6 opt-in push supported portions (no production activation); phases 7/8 confirmed mobile/performance gaps. Inspect only each affected implementation before extending it. Do not repeat WHOOP work, physical acceptance, broad audits or successful unchanged test suites.
- Continue commands: `bun test tests/unit`, `npx tsc --noEmit`, scoped `npx eslint <changed paths> --rule 'prettier/prettier: off'`, `$env:VERCEL='1'; npm run build`; `$env:FITCORE_TEST_IPHONE_WEBKIT='1'; $env:FITCORE_TEST_PRODUCTION_BUILD='1'; npx playwright test meal-photo-multiple meal-photo-camera-access jarvis-food-photo --project=iphone-webkit --project=mobile-390x844 --reporter=line`. Network/localhost requires an escalated command in this Windows sandbox. Logs `.multi-photo-*.log` are ignored and local. Existing release gate includes the new mobile suite.

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
- [x] Prepare the focused review candidate and record validation evidence; published as draft PR #302.
- [x] Validate the core candidate and implement reviewed voice logging (draft PR #303); photo integration remains in progress.

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


## Voice stage started 2026-11-23
Previous turn: verified development progress (PR #302, 874 passing units, integrated mobile evidence). Current branch `codex/fitcore-jarvis-voice` starts at #302 head 13c3e40 in the existing isolated worktree. PR #302 is mergeable, not merged; dependency review passed and CI/release/mobile jobs 45189201361 / 45189201656 / 45189201738 were in progress at the initial check. Do not repeatedly poll them; recheck at the next milestone.
Plan: docs/implementation/fitcore-voice-plan.md . No new dependencies or fitness snapshot/backup schema changes are planned; voice usage stores bounded non-content timestamps in browser metadata. Physical iPhone and live-provider acceptance remain pending.


## Core candidate hosted acceptance
PR #302's production-artifact release gate succeeded: 174 passed in 18.2 minutes, job 137742742801, run https://github.com/DrewDiStefano11/app/actions/runs/45189201656 . Unit and Vercel artifact steps also passed. Regular Playwright jobs passed at desktop, 360x800 and 390x844; dependency review and the CI build passed. CI lint/format steps use continue-on-error, so job success is not proof those strict checks are clean. No merge or deployment occurred.

## Voice implementation status
Implemented local-first typed/transcribed routing, selectable atomic mixed-event reviews, follow-up clarification, spoken-number preprocessing, voice weight/reps correction with stale-target and unit guards, opt-in microphone recording, bounded caller-key Groq transcription, usage metadata/cost reference, cancellation/background/close/clear cleanup and source attribution in the existing audit patch. No audio is persisted; no new database or schema is introduced. Published as https://github.com/DrewDiStefano11/app/pull/303 after 929 units, TypeScript/build and synthetic mobile verification. Physical iPhone and actual Groq audio accuracy remain unverified.


Voice validation details: six initial synthetic mobile capture cases passed before mixed input was added. Three later browser regressions reproduced missing close/reopen busy reset, live capture after Clear conversation, and lost voice source through typed clarification. Fixes reset capture on conversation clear, clear parent busy state on unmount, and carry origin only through genuine clarification context. The paid-rate estimate is explicitly a reference at the published Groq rate, not a charge or a claim that the account is free. Provider backoff persists across panel remounts in memory; browser counters cap voice requests at 4/minute and 40/day. No audio/transcript is stored in usage metadata.

Voice milestone: final full unit suite 929 passed / 0 failed, TypeScript and Vercel build passed. Combined synthetic mobile acceptance 52 passed, then affected layout/source/WHOOP batch 26 passed in Chromium and iPhone WebKit. The final six-case focus/privacy batch exposed Chrome losing keyboard focus when Record is replaced with Stop; Escape now closes the panel even after focus falls to the document. Final rerun recorded separately below. Strict lint of new modules passed; two existing settings-effect warnings remain. No actual microphone/provider/iPhone verification or deployment occurred.

Final voice focus/privacy rerun: 6/6 passed (23.9 seconds), both mobile engines. Final TypeScript passed after the focus fix.

## Revised priorities from user 2026-11-23
Voice preserved as draft PR #303 (05f91c8). New requirements retained verbatim in fitcore-quality-campaign-requirements.md. Next: WHOOP continuity within authorized expiry, Jarvis expanding multiline composer and rendered Markdown, active-workout keyboard/scroll fixes; then visible-function inventory, saved-library/photo integration, evidence-backed screen improvements, cross-feature/device acceptance and bounded stress campaign. Preserve all provider/privacy/release restrictions.
Photo work checkpoint on codex/fitcore-food-photo: strict structured draft/patch math, local acceptance corrections, bounded isolated Groq vision/text-only endpoints, and existing meal transaction/undo tests implemented. Ten targeted units passed, TypeScript passed. UI hook/review are present but not wired into Jarvis; two acceptance tests intentionally fail for the missing entry point. Do not treat this checkpoint as a working photo feature or merge/release candidate. Resume only after fundamental interaction repairs; integrate saved-food suggestions with explicit product-match confirmation. No live photo requests or deployment performed.

## Daily usability implementation and verification

Plan: fitcore-daily-usability-plan.md; physical device checks: fitcore-daily-iphone-checklist.md. Advances Jarvis interaction, reliable unified logging, and dashboard continuity; photos are preserved separately rather than treated as complete.

- WHOOP retains valid RAM evidence through transient status failures and malformed replacements without extending its original lease. Revocation, version changes, background and expiry clearing remain. Explicitly cache-permitted live reads get at most five minutes, bounded by session and provider freshness, leaving renewal headroom; no-cache/no-store behavior and durable-cache configuration stay unchanged. Recovery shows subtle refreshing/last-update text.
- Jarvis now expands to multiple lines, preserves unsent drafts/focus, uses Return for a newline and Send or Ctrl/Cmd+Return to submit, and renders safe basic Markdown. Empty markers and incomplete formatting have regression coverage; no HTML execution or links are enabled.
- Active workouts no longer inherit the entry animation transform that placed fixed Finish controls below long pages. Input fonts are16px. Keyboard-aware sheets resize to VisualViewport; suggestion chips hide when compact. Finish notes scroll only the sheet's own region and only enough to expose focus on a viewport change, not on keystrokes.
- Full units: 936 passed / 0 failed; TypeScript, Vercel build and scoped semantic lint passed. Five workflow YAMLs parse and retain prior release selections while adding this stage and its stacked base. Git deployment disabled for the new branch.
- Synthetic mobile regressions reproduced the fixed-footer geometry defect, transient WHOOP blanking, short visual-keyboard overflow, offscreen Finish notes, unmatched Markdown text loss and an empty-list render-loop review finding. The later timer assertion was a fixture error: entering complete weight/reps intentionally starts the existing set-rest interval; notes must preserve that resulting timer.
- Read-only review found no further actionable WHOOP or UI defects after those fixes. Production-artifact mobile integration passed84/84 cases in8.5 minutes; after the last navigation-composer change, the rebuilt artifact passed18/18 affected composer/cursor/logging cases in1.8 minutes. Both batches used iPhone WebKit and mobile Chromium. Physical iPhone, actual provider calls, merge, deployment and release acceptance remain pending.
- PR #303 status checked once at this milestone: dependency review, CI build and normal Playwright passed; production release gate run45199531906 still running. Do not repeatedly poll; recheck at the next integration decision.
- Next: systematic visible-feature inventory using screenshots and existing records; complete approved missing actions, then saved-food matching and the preserved conversational photo workflow, screen improvements, cross-feature/device acceptance and bounded stress testing. No user action is needed for continued authorized development.

Additional daily checks: full Jarvis long-draft cursor/scroll preservation passed in both engines without needing a product-code fix. The separate bottom navigation composer reproduced the same one-line problem; it now expands, uses Return for newlines, retains unsent text on close and positions above VisualViewport. Its rebuilt-artifact checks passed in the final18-case batch. The final short-screen screenshot was inspected: Record, multiline text and Send are separated and visible. Older screen-inventory-audit.md / ux-gap-backlog.md and audits/settings-functionality-map.md / fuel-nutrition-feature-preservation-map.md are useful maps but contain superseded claims (missing rest timers, saved meals, template editors and WHOOP metrics); revalidate current controls before treating them as missing requirements. Photo checkpoint follow-ups include wiring into Jarvis, confirmed saved-food matching, and capturing the saved target transactionally so later corrections cannot silently rebase over external meal edits.

Daily usability review candidate: `codex/fitcore-daily-usability`, stacked on PR #303. PR lookup: https://github.com/DrewDiStefano11/app/pulls?q=is%3Apr+head%3Acodex%2Ffitcore-daily-usability . All prior release selectors were retained, with daily-input-usability and jarvis-composer-cursor appended. No new dependencies or persisted fitness schema changes. No known release-blocking defect in the verified scope; the full application is not release-certified because the requested feature inventory, photo/library integration, screen improvements, extended stress tests and physical-device acceptance remain.


### Urgent WHOOP lifecycle implementation (2026-11-23)

- User physical iPhone evidence overrides prior #304 acceptance: both app switching and full close/reopen lose measurements. New focused branch `codex/fitcore-whoop-lifecycle` is based directly on merged main `ebc5f41`, preserving activity/save-safety/photo work separately.
- Hidden transitions retain authorized RAM and original expiry while fencing pending work; offline pauses network only. Resume immediately exposes valid RAM and automatically revalidates. Cold startup concurrently retrieves authenticated server records before status/fresh sync complete. Records now carry connection/event revision from the same SQL read; revision mismatch and late authorization responses are fenced. Existing cache permission/retention configuration is unchanged; no browser storage added.
- Reviewer caught definitive reconnect_required/disconnecting states and a cold revision race; both fixed with regressions. Transport failure cannot undo a definitive concurrent records denial. Protected snapshot restore can proceed even with an earlier sync POST pending. Existing original expiry remains authoritative, including beyond5 minutes.
- Current validation:950 unit tests passed; TypeScript/scoped production lint and Vercel build passed. Development mobile WHOOP dashboard26/26 passed. Final production mobile WHOOP lifecycle/callback/Jarvis-isolation batch is running. See `fitcore-whoop-lifecycle-fix.md` for exact acceptance and server-snapshot availability limits. Physical installed-iPhone repeat remains pending.
- Preserved photo integration at local `codex/fitcore-food-photo` commit919446a;954 unit tests and a build passed before final review/rapid-save refinements. Its final production acceptance (including new voice case) still needs completion. #305 and #306 are drafts; #303 and #304 already merged. After publishing WHOOP fix, return to photo/library final integration. No general audit.

Final WHOOP evidence: implementation commit `c0e9d12`; 950 units/0 failures, TypeScript, scoped production lint and final Vercel build passed. Final production mobile WHOOP lifecycle/callback/Jarvis-isolation batch passed36/36 in2.9 minutes. No production source changed after this artifact build. Physical installed-iPhone acceptance remains pending; no manual deployment or cache-permission changes performed. Publish focused PR from codex/fitcore-whoop-lifecycle into main, then resume photo/library on preserved919446a.
## Latest user direction: implementation, no duplicate general audit

Freebuff has independently reported21 defects in five reports: FITCORE_AUDIT.md, FITCORE_BUG_REPORT.md, FITCORE_UI_RECOMMENDATIONS.md, FITCORE_TEST_PLAN.md, FITCORE_PRIORITY_ROADMAP.md. Use those as the comprehensive baseline once available. One filename search found none in this repository or shared `other` workspace; continue implementation without repeating the search or a general audit. Read findings individually when supplied and compare against current branches.

General audit stopped at the user's instruction. The partial local IAB captures are preserved in ignored `playwright-report/audit-2026-11-23/`, not a new inventory/report deliverable. Targeted handoff: fitcore-targeted-defects.md. Daily usability is published as https://github.com/DrewDiStefano11/app/pull/304 . Preserve #303 and #302; none are merged or deployed.

Targeted fixes now implemented: planned/blank exercise and set rows no longer become logged activity; completed strength, bodyweight, time, distance and warmup evidence remains. Raw saved workouts and planned rows are unchanged. Missing numeric values stay missing. Future/unconfirmed events are excluded; confirmed Jarvis audit events remain visible and authoritative entities still suppress duplicate audit cards. Section changes reset document scroll to their heading without touching same-section typing. Finish's muscle count excludes untouched planned exercises.

Observed regressions before fixes: four activity rows for one real saved set; Nutrition heading at y=-123 after section navigation. Review caught an overstrict audit-provenance filter; a failing regression now ensures confirmed Jarvis saves remain visible while suggestions do not. Full940 units, TypeScript, scoped semantic lint and Vercel build passed. Production mobile batch39/40 passed; a collapsing-navigation harness race was corrected, then navigation passed2/2 in both engines. All40 selected scenarios have passing evidence. Screenshot of the corrected activity feed was inspected; no physical-device certification is claimed.

Hosted gate evidence: #303 release run45199531906 was cancelled at15:21:15UTC after starting14:56:03UTC, with181/188 cases reached and no reported test assertion failure. This is consistent with its25-minute job ceiling. Budget is now35 minutes, every prior selector retained and section-scroll-activity appended. Unit/build/install steps had passed. #304's dependency review, CI build and ordinary Playwright passed; its release run45207062962 was still running at the single milestone check. Do not repeatedly poll it.

Next action after this focused validated PR: resume the preserved conversational food-photo implementation and saved-food matching/reuse. Do not perform another comprehensive audit. Missing core functionality should be driven by Freebuff's findings and direct implementation verification. The photo checkpoint needs integration of this branch and daily/voice prerequisites before it is a usable application feature.

Freebuff reports are now available: branch `freebuff/bd2ddd2dfd6e1e767988885d`, commit `56a2a2a`. After publishing this targeted fix, fetch/read its highest-priority data-loss findings first, especially photo limits and failed meal persistence. Compare with the latest code before changing it, then continue the photo/library workflow. Targeted PR lookup: https://github.com/DrewDiStefano11/app/pulls?q=is%3Apr+head%3Acodex%2Ffitcore-record-consistency . No merge or deployment performed.


### Save safety and authorized integration checkpoint (2026-11-23)

- Published targeted activity/navigation fixes in draft PR #305, commit `726b400`.
- Fetched Freebuff exact baseline `56a2a2a1a859708e5e0d46a9e8b18daef2d43dca`; use its five root reports instead of another audit. Verified BUG-01 and BUG-04 against this branch: rejected Home meal saves and progress-photo saves discarded drafts; photos stored raw data URLs.
- Save-safety branch retains drafts/previews on rejected transactions. Progress images decode locally, resize/re-encode JPEG (metadata stripped), cap at 40,000 characters, and pass conservative two-snapshot/storage-headroom preflight. No existing images are rewritten/deleted and no schema changes. Twenty capped photos plus workout and meal pass a simulated 5 MB atomic-storage test.
- Analytics completeness handling for BUG-03 is already present in current code. Home blank-macro conversion from BUG-02 remained and now uses unreported status; partial/invalid macros must be corrected. Fuel custom-entry parity still needs checking during meal-library integration.
- 942 unit tests pass; TypeScript passes. Initial targeted browser tests pass 4/4 in mobile Chromium and iPhone WebKit. Production verification pending. Scoped lint found only three pre-existing explicit-any violations in progress.tsx; do not claim full lint clean.
- User explicitly authorized merging #303 then #304 at this checkpoint, correcting bases and validating combined integration first. Prerequisite #302 was already squash-merged by the time main was fetched: `44ff20b`, tree identical to original #302 head `13c3e40`. Preserve completed work and avoid repeating #302. #303/#304 current heads unchanged; their build/desktop/mobile/dependency checks passed; release jobs cancelled at ~25m. New gate ceiling35m exists in #305.
- After integration, resume local photo checkpoint `de9cfef` and saved-food matching/reuse, including stale-save target fix documented above. Goal remains active.


### Completed main integration (2026-11-23)

- Combined production checkpoint passed 34/34 mobile Chromium/iPhone WebKit scenarios (3.1 minutes), with 942 unit tests, TypeScript, and final Vercel build passed.
- #303 retargeted to main and merged as `4bd5cd8ad721e8d7b54bf6b804546347bdea193c`. Reconciled squash ancestry without changing the reviewed voice tree.
- #304 retargeted to main and merged as `ebc5f41a923d023881bb9e9ab11760154af1e72f`. Final merged tree verified equal to reviewed daily tree plus the validated 35-minute release-job ceiling, all test selectors retained. Original code diff against d87b7a9 is only the workflow budget/comments.
- Follow-up drafts #305 (activity/scroll) and #306 (save safety, head ecb3710) remain separately preserved. User merge authorization specifically covered #303/#304. No manual deployment or provider changes performed.
- Resume photo/library implementation now. Official Groq vision docs rechecked 2026-11-23: https://console.groq.com/docs/vision lists qwen/qwen3.8-27b with JSON mode, matching checkpoint model.


### Photo integration preserved before urgent physical-iPhone WHOOP fix

Photo branch now includes latest main/#305/#306 prerequisites; Jarvis and Fuel photo entry/reopen wiring, transaction-captured canonical saved target, explicit local saved-label matches, exact saved-meal text reuse (including unknown macros), voice/text composer integration, privacy copy. Unit baseline 954/954 and Vercel build passed before final review/UX refinements. Reviewer findings addressed: lock exact editor while remote correction is busy + draft-identity fence; saved-meal updates omit notes patch to preserve all existing notes. Rapid Save doubleclick had hit Undo after auto-scroll: Save now stays disabled in place and photo replies preserve scroll. Full final production browser verification is still pending. Initial browser 6/8 passed; failed rapid-doubletap cases prompted the fix, do not claim feature accepted. New voice/photo integration test has been added but not run yet. No photo PR/push yet.

User reports physical iPhone WHOOP data loss on both hidden/foreground and full close/reopen, despite #304. This is next priority: trace sync-coordinator setForeground/resetEvidence, RAM restoration, startup authorized server snapshot; retain still-authorized evidence through hidden/offline/transient errors with original expiry and clear immediately on revoke/disconnect/expiry. Use focused lifecycle regressions; no new audit. Return to photo final validation after fixing WHOOP.

### Urgent WHOOP lifecycle implementation (2026-11-23)

- User physical iPhone evidence overrides prior #304 acceptance: both app switching and full close/reopen lose measurements. New focused branch `codex/fitcore-whoop-lifecycle` is based directly on merged main `ebc5f41`, preserving activity/save-safety/photo work separately.
- Hidden transitions retain authorized RAM and original expiry while fencing pending work; offline pauses network only. Resume immediately exposes valid RAM and automatically revalidates. Cold startup concurrently retrieves authenticated server records before status/fresh sync complete. Records now carry connection/event revision from the same SQL read; revision mismatch and late authorization responses are fenced. Existing cache permission/retention configuration is unchanged; no browser storage added.
- Reviewer caught definitive reconnect_required/disconnecting states and a cold revision race; both fixed with regressions. Transport failure cannot undo a definitive concurrent records denial. Protected snapshot restore can proceed even with an earlier sync POST pending. Existing original expiry remains authoritative, including beyond5 minutes.
- Current validation:950 unit tests passed; TypeScript/scoped production lint and Vercel build passed. Development mobile WHOOP dashboard26/26 passed. Final production mobile WHOOP lifecycle/callback/Jarvis-isolation batch is running. See `fitcore-whoop-lifecycle-fix.md` for exact acceptance and server-snapshot availability limits. Physical installed-iPhone repeat remains pending.
- Preserved photo integration at local `codex/fitcore-food-photo` commit919446a;954 unit tests and a build passed before final review/rapid-save refinements. Its final production acceptance (including new voice case) still needs completion. #305 and #306 are drafts; #303 and #304 already merged. After publishing WHOOP fix, return to photo/library final integration. No general audit.

Final WHOOP evidence: implementation commit `c0e9d12`; 950 units/0 failures, TypeScript, scoped production lint and final Vercel build passed. Final production mobile WHOOP lifecycle/callback/Jarvis-isolation batch passed36/36 in2.9 minutes. No production source changed after this artifact build. Physical installed-iPhone acceptance remains pending; no manual deployment or cache-permission changes performed. Publish focused PR from codex/fitcore-whoop-lifecycle into main, then resume photo/library on preserved919446a.

WHOOP lifecycle fix published in draft PR #307: https://github.com/DrewDiStefano11/app/pull/307 (head0eab045). Integrated its tested code into the photo branch before resuming photo final acceptance.


### Preserved photo checkpoint for user-requested #306/#307 integration

- Resumed photo/voice/library development after publishing WHOOP #307. Integrated its source into photo branch (f58c24b). Photo-specific mobile development batch10/10 passed, including spoken correction/confirmation and single-image upload.
- Closed remaining Freebuff BUG-02 Fuel custom-food gap: blank macros persist as unreported for both meal and reusable food; partial macros are rejected. New browser test reproduced the enabled-save defect before the fix, then passed in both engines in the production batch.
- Full units968 passed, TypeScript/scoped semantic lint and Vercel build passed. Production integration batch48/50 passed (6.5 minutes): two new existing-manual-meal correction cases falsely rejected an unchanged raw target because default provenance was normalized on only one side. Added failing unit, normalized both comparisons, then affected transaction/server/library units9/9 passed. This final guard fix still needs production rerun; do not claim50/50. Rapid Save fix and text/voice acceptance passed in both engines.
- Model uses documented Groq instruct mode reasoning_effort=none; provider docs rechecked https://console.groq.com/docs/model/qwen/qwen3.8-27b .
- User now reports #305 merged into main, #306 all CI green but old base, #307 conflicts following #305 merge. Current food work is being committed intact before reconciling #306 then #307 against latest main, validating focused diffs and merging in that order under explicit authorization. Resume photo acceptance/publish after that integration. No repeated general audits.


### Main integration completed; photo acceptance resumed

#306 merged as84502df062f02f24f7975f2c36824aed281e43ac, then #307 asdfe29abde7407f6dc42f4caacd2b9030bb2f0fbc, under explicit user authorization. #306 complete tree unchanged from its previous green head; focused post-reconciliation2 storage units and4 mobile retry cases passed. #307 WHOOP source unchanged, both metadata conflicts resolved preserving both sides;59 focused units and12 mobile lifecycle cases passed, CI build/dependency/CodeQL green. Broad automated reruns remained running at merge and were transparently recorded in PR bodies; previous production source validation36/36 passed. Main tree verified identical to reconciled86d2786. Photo work1ce294a preserved and main now incorporated; final correction acceptance/build/PR next. No manual deployment/provider/cache-permission change.


### Food photo and saved-food integration ready for review

Current branch codex/fitcore-food-photo incorporates merged main dfe29ab, with no application source/test changes introduced by that final main merge. Full969 units passed; TypeScript, scoped semantic lint and production artifact build passed. Final affected production batch14/14 passed after the manual-meal stale-normalization fix; earlier broader batch48/50 passed and all50 selected scenarios now have passing evidence. Fuel custom macro completeness, text/voice acceptance, single image upload, saved-label selection, saved meal reuse, failed-save retry, same-ID edit/undo and Home/Fuel/Deep Dive calorie parity are covered. Targeted iPhone viewport screenshot inspected and preserved in docs/qa/fitcore-food-photo-review-iphone.png (synthetic provider).

Publish/review branch codex/fitcore-food-photo against main; PR lookup https://github.com/DrewDiStefano11/app/pulls?q=is%3Apr+head%3Acodex%2Ffitcore-food-photo . Check existing PR before creating another. Hosted CI results remain to inspect once terminal; do not repeatedly rerun broad suites. Physical installed-iPhone/camera/audio and actual provider estimate accuracy remain pending, alongside the remaining audit-driven core campaign work. Use Freebuff56a2a2a baseline; no new general audit. Goal remains active. #303/#304/#305/#306/#307 are now merged; photo feature itself has not been merged or manually deployed.

Photo follow-up: same existing acceptance test now verifies all three visible macros as well as calories across Jarvis/Home/Fuel Daily/Fuel Deep Dive, plus revised persisted macros before Undo. Rebuilt unchanged production source and passed2/2 mobile cases (34.1s); edited test passes default ESLint. No new feature/source changes. Publish this test/doc follow-up before final PR acceptance; prior head2f23b6f hosted gate is not evidence for the next head. #309 now separately publishes the validated manual weigh-in fix at98d6294; physical WHOOP first-screen cold restoration was confirmed by the user and documented there.

### Food-photo release gate stabilization

Earlier photo head2f23b6f hosted run45226393362 exceeded its35-minute job budget (authoritative annotation), reaching final workout cases; it also had one Settings WebKit scenario exhaust its overall30s deadline at different late reset steps across retries. Local same scenario passed2/2; no stuck-dialog product defect reproduced. Photo branch now splits the complete unchanged release selection into mandatory iphone-webkit/mobile-390x844 matrix jobs, preserving the production-workout aggregate name and failing it for any non-success dependency result. Settings scenario overall60s/action10s; CI-mode focused production checks2/2 pass, workflow preservation and actual gate-command truth cases pass, independent review clear. No application source changes. Old c7 serialrun45230348400 remains running and must be reported honestly at termination; final new-head matrix CI remains necessary. Preserve #309857b04b, #3101ad1315 and combined93baccf; integrate this workflow into the candidate without repeating unchanged application suites.


### Weigh-in safety and physical WHOOP clarification

Preserved food-photo PR #308 remains at2f23b6f; build, ordinary browser, dependency and CodeQL checks passed, production release gate still running at the latest check. User now explicitly confirms WHOOP values present immediately on the first usable screen after fully terminating/reopening the installed iPhone PWA; no remaining cold-start defect reproduced and no additional lifecycle code changed. Source tracing and compliant restoration limits are recorded in fitcore-whoop-lifecycle-fix.md without claiming actual production cache configuration was inspected.

Freebuff BUG-05 manual weigh-in fix is isolated on codex/fitcore-weigh-in-safety: shared40–700lb parsing, failed-save draft preservation and synchronized entry/profile/bodyweight-goal update across Home/Stats Daily/Deep Dive. Prior16 mobile development cases passed; final6 production cases,2 focused units, TypeScript and production build passed, independent focused review clear. Existing3 progress.tsx explicit-any lint findings remain. Publish tested PR against main, preserve photo branch, and continue release checks; no general audit or provider/cache setting changes.


### Chronological workout history (Freebuff BUG-13)

Confirmed against main dfe29ab with a failing browser test: unsorted imported sessions showed an older Last workout. Isolated codex/fitcore-workout-history-order now selects latest startedAt and sorts a copy for displayed history; persisted order remains unchanged. Coverage includes7d/all filters and reload plus existing history correction/deletion/rejected-write cases.2 focused units, TypeScript/scoped semantic lint, Vercel build,6 development and6 final production mobile cases passed. Independent read-only review clear. No broader audit, schema/dependency change or manual deployment. Publish this focused PR, then return to the photo/library integration checks on c7e1813 (#308), with weigh-in #309 preserved independently.

### Consolidated release candidate

Primary PR #308 now contains the preserved combined candidate, retaining the exact #309857b04b and #3101ad1315 ancestry and source. This avoids separate base-reconciliation/deployment waves for already-completed work; original branches and review history remain. All971 combined units passed (24.62s), alongside combined build/TypeScript and all26 selected scenario evidence. Workflow matrix preserves allselectors includingweigh-in-save-safety; new consolidated head CI must pass before main integration. Earlier c7 source full hosted gate passed32m33s, f5 mobile production job passed and WebKit still runs; #310 allhostedchecks green and #309 serialgatepending. No newfeature, main merge, directmainpush, branch deletion, or manual deployment performed. Continue checking the exact consolidated #308 head; avoid broad audit or changing completed application source while checks run.
