# PR #327 review — published head 037831d

Initially reviewed in Codex's checkout on isolated `codex/food-library-review`.
The findings below reproduce on published head `037831d`. Drew subsequently
confirmed Antigravity had finished and authorized Codex to repair the existing PR.
No other agent's worktree was changed. Repairs are on `codex/food-library-repair`.

1. **P1 — quantity units and fractions produce incorrect nutrition.**
   `src/lib/jarvis/food-reference.ts:213–228` turns the leading number into a
   serving multiplier, discards grams/cups/scoops, and parses fractions with
   `Number("1/2")`. With a synthetic 200-kcal food per 100 g, requesting 200 grams
   yields 40,000 kcal instead of 400; half a serving yields 200 instead of 100.
   Reuse the existing portion/unit parsing and require compatible units; never
   silently turn invalid quantities into one serving. Existing successful tests
   cover whole servings but miss these inputs.
2. **P1 — failed custom-food writes close the form and discard the draft.**
   `add-custom-food-form.tsx` ignores the boolean returned by `set()` and calls
   `onSaved()` even when verified persistence rejects the write. Under a synthetic
   quota failure, no food is stored and the Add Custom Food sheet disappears.
   Keep all draft fields and report failure until persistence succeeds.
3. **P2 — failed quick-log writes announce a saved meal.**
   `food-library-view.tsx` quick-log handlers ignore the same result and show
   “logged!” even though the persistent meal collection remains empty. Only
   announce success after an applied commit; provide a recoverable failure state.

Both failed-write behaviors reproduce against the production artifact in iPhone
WebKit and mobile Chromium before the fix (four regression-test failures).
`tests/e2e/food-library-review-failures.spec.ts` now retains the original assertions
and additionally verifies recovery/retry saves exactly once without retyping.

Historical meals are copied rather than retroactively rewritten by preset CRUD.

## Repair and validation

All three findings are repaired. Saved quantities reuse the existing fraction and
unit parser, compare requested units with the saved base portion and reject unsafe
conversions instead of substituting a serving. Library actions check the existing
verified-store commit result. Custom creation uses the latest transaction state,
retains drafts after rejection and checks duplicates inside that transaction.
Favorites are validated as optional booleans, survive verified backups and preset
replacement, and never retroactively edit historical meals.

Reconciled with production WHOOP main `9a4c9c8`. All 1,045 integrated unit tests,
TypeScript, scoped lint and production build pass. All 12 food-library mobile
artifact cases pass across WebKit/Chromium, including original happy paths and
failed-write retry safety. Targeted verified-backup/fraction tests also pass.
The release gate now selects the food-library cases. Existing PR #327 is updated;
hosted checks and separate merge approval remain required. No dependency added.

Hosted integration found a catalog-only provenance regression. The saved-food extension now defers catalog-only meals to the established parser, preserving its medium confidence and source label. All 19 food units and the unchanged catalog save/undo browser test pass in both mobile engines against the rebuilt production artifact. Mixed saved/catalog meals retain explicit mixed provenance.
