# PR #327 review — published head 037831d

Reviewed in Codex's existing checkout on isolated `codex/food-library-review`.
Antigravity's branch and active worktrees were not changed. Its 15 unit cases,
TypeScript and production build pass, but the following gaps are reproducible.

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
WebKit and mobile Chromium (four expected regression-test failures). Isolated
reproduction tests are in `tests/e2e/food-library-review-failures.spec.ts`; they
must remain failing until the implementation is fixed. These tests are not on
Antigravity's branch and no implementation changes were made during review.

Historical meals are copied rather than retroactively rewritten by preset CRUD.
Do not recommend merging #327 until the confirmed calculation and persistence
findings are resolved. Confirm active file ownership before making fixes.
