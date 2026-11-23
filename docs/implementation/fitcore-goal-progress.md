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
- [ ] Reconcile existing Jarvis text PR #286 without removing current nutrition targets or saved foods.
- [ ] Reconcile recorded sleep PR #298 against native WHOOP precedence.
- [ ] Validate shared persistence, correction/undo, missing macros, consent and provider failure with synthetic unit and mobile production-artifact tests.
- [ ] Publish a focused review candidate and record validation evidence.
- [ ] Continue voice/photo integration only after this core candidate is reliable.

## Decisions and boundaries
Reuse current storage and backups. No production schema reset. No merge, deployment, billing activation, production secrets changes, or real health-data provider requests are authorized.
Old dirty worktrees remain untouched; integration uses the published candidate commits rather than uncommitted older experiments.
The former cancelled release gate now has a 25-minute timeout and WHOOP/nutrition coverage on main; retain all existing cases and add Jarvis cases. Investigate actual failures before altering timing or coverage.

## Validation and limitations
Integration is in progress; no success claimed yet. PR #286 and #298 are open drafts with conflicts against main. Physical iPhone and live provider acceptance remain unverified for this candidate.

## Dependencies and next stages
Production credentials are unnecessary for synthetic validation. Provider model availability/free limits and terms must be rechecked before enabling new modalities. Physical-device acceptance: active workout survives background/force close/update; microphone denial/interruption preserves draft; camera cancellation saves nothing; offline records persist; repeated confirmation saves once.
