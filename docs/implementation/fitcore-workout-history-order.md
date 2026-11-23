# Workout history follows session dates

Freebuff commit56a2a2a BUG-13 is confirmed against merged main dfe29ab. Daily Train used the final stored array element as its last workout; history reversed the stored array. Both could misrepresent imported or inserted history. No general audit was repeated.

A new browser regression seeds sessions in [newest, oldest, middle] order. It failed before implementation because the newest session was absent from the Last workout card. Daily Train now selects the maximum startedAt; history sorts a copy by descending startedAt before applying its existing range filter. No stored records are rewritten, and no schema or dependency changes are needed.

The regression checks the daily latest card, complete history order, seven-day filtering, restoring all history, original persisted array order, and reload. Existing history editing/deletion cases remain in the same selected suite. TypeScript and scoped semantic lint passed; independent focused read-only review found no important actionable issues. Production artifact/browser validation is pending.

Food-photo work is preserved in PR #308, including c7e1813 full macro parity assertions that passed in both production mobile engines. Weigh-in safety remains PR #309. User physically confirmed WHOOP values present immediately on the first usable screen after complete installed-PWA restart; do not repeat lifecycle fixes or change cache policy. This branch disables automatic Git preview deployment and reuses the existing workout-history-management release selector.

Final evidence: 2/2 focused workout correction/eligibility units passed; TypeScript and scoped semantic lint passed. Development mobile history batch6/6 passed (58.4s). Final Vercel artifact built successfully and production history batch6/6 passed (1.0m) in iPhone WebKit/mobile Chromium, including the new imported-order case and existing edit/delete/rejected-write coverage. No app source changed afterward. Deployment JSON and diff whitespace check pass. Independent focused read-only review found no important actionable issue. Hosted CI is pending publication; no manual deployment or feature merge.
