# Selector parser security reconciliation

November 23, 2026 — existing Dependabot PR #288 reconciled with main f784d55.

The original PR updated npm's parser6.1.4 to6.1.6 but also upgraded TypeScript ESLint and left Bun's parser6.1.2 unchanged. Its frozen Bun dependency install failed. Main still needed the security fix.

The reconciled change preserves main's package.json and other dependency resolutions. Both locks now resolve postcss-selector-parser6.1.6, using the published integrity from Dependabot. The unused external cssesc entry is removed; no other locked package requires it. Parent semver ranges accept6.1.6. Original commits and branch history remain intact through a normal merge of current main, without force-pushing.

Official release: https://github.com/postcss/postcss-selector-parser/releases/tag/6.1.6. It fixes additional selector CPU exhaustion cases and internalizes cssesc with linear processing.

Validation: clean npm ci and Vercel production build passed; bun install --frozen-lockfile and a production build from that dependency set also passed. npm audit reports no selector-parser finding; seven moderate development dependency findings remain outside this focused update. Production-only audit reports zero findings. Independent focused review found no issue with scope, integrity or compatibility. Final-head hosted checks remain required before merge.
