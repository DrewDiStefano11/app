## Design system

Adopt the selected "Elite Athletic Analytics" direction across the app. All changes flow from one shared system so every screen feels like the same product.

- Typography: load Bebas Neue (display, uppercase) + Barlow (UI + tabular numerics) via `<link>` in `src/routes/__root.tsx`. Add `--font-display` and `--font-sans` tokens in `src/styles.css`.
- Color: keep pure-black canvas. Add semantic section accents as CSS tokens that swap per active section so the same components re-skin automatically:
  - `--section`: training=violet `#A855F7`, nutrition=red `#EF4444`, recovery=blue `#3B82F6`, progress=green `#22C55E`, home=violet.
  - Plus `--surface` (white/5), `--surface-2` (white/8), `--hairline` (white/10), and per-accent glow shadows.
- Surfaces: glassy dark tiles — `bg-white/5`, `border border-white/10`, `rounded-3xl`, soft inner gradient, accent-tinted glow shadow on hero tiles.
- Numerics: Barlow tabular-nums everywhere a value can change; Bebas Neue for big scores and section headlines.
- Motion (Framer Motion, already permitted): staggered tile fade+rise on mount, ring/arc fills, animated number count-up, press-scale on tappable cards, shimmer dot on AI insight, smooth bottom-sheet for the AI coach. Respect `prefers-reduced-motion`.

## New shared components (`src/components/app/`)

- `tile.tsx` — `<Tile>` glass card primitive (variants: default, hero, accent). Wraps motion entrance + press feedback.
- `ring.tsx` — `<Ring value max accent label />` SVG progress ring with animated dash offset, used for Readiness, Recovery, Macros %.
- `count-up.tsx` — animated number counter for scores/volumes.
- `score-card.tsx` — `<ScoreCard title value max accent trend />` used for FitCore / Readiness / Recovery / Performance Scores.
- `ai-insight-strip.tsx` — slim glass pill with pulsing dot + section-tinted highlight. Reads from AI fallback or live `aiChat`.
- `body-heatmap.tsx` — SVG front/back silhouette with 16 muscle regions. Props: `mode: 'load' | 'strength' | 'imbalance' | 'recovery'`, `onSelect(region)`. Color intensity comes from a `scoreByMuscle(mode, state)` helper. Tap opens `MuscleDetailSheet`.
- `muscle-detail-sheet.tsx` — bottom sheet with recovery %, weekly sets, volume, last trained, vs-last-week delta, recommended exercises.
- `volume-chart.tsx` — interactive bar/area chart with filters 7D / 30D / 90D / 1Y / All and grouping toggle (Total / By muscle / By exercise). Tooltips + entrance animation. Built with `recharts` (already in shadcn chart) — no new deps.
- `chart-card.tsx` — wrapper providing title, range filter chips, comparison toggle.
- `empty-state.tsx` — premium empty card with icon, copy, and "Turn on demo data" CTA.

## Data layer (`src/lib/`)

- `analytics.ts` — pure functions over existing localStorage state:
  - `fitcoreScore(state)` blends training consistency, nutrition adherence, recovery score, progress delta into 0–100 with weights {0.35,0.25,0.25,0.15}.
  - `readinessScore(state)`, `recoveryScore(state)`, `performanceScore(state)`.
  - `muscleLoadMap(state, mode)` → `{ chest: 0..1, ... }`.
  - `weeklyVolumeSeries(state, range, groupBy)`.
- `demo-data.ts` — deterministic seeded demo workouts/meals/sleep/weights for the last 90 days. Pure read-only; never written to user storage.
- `store.tsx` — add `demoMode: boolean` flag (persisted). Add a `useAppData()` selector that returns real data merged with demo data when `demoMode` is on; real data only otherwise. All views consume this selector so toggling is global and instant.
- Preserve every existing localStorage key. No migrations break.

## Screens

Home (`src/routes/index.tsx` → new `views/home.tsx`):
- Header: "COMMAND CENTER" eyebrow + "WELCOME, {NAME}" in Bebas, status dot avatar.
- Bento grid matching the chosen prototype:
  1. Row: FitCore Score tile (gradient, progress bar) + Readiness Ring tile.
  2. Body Heat Map preview tile — silhouette + "LOWER BODY OVERREACHED" headline + focus suggestion. Taps into Recovery → Heat Map.
  3. Row: Macros (P/C/F bars) + Weekly Volume sparkline (+%).
  4. AI Insight Strip.
  5. Primary CTA: START WORKOUT (purple gradient) → Training/Start.
  6. Floating quick actions row (Log Food, +) above bottom nav.
- Empty states swap in per tile when no data and demo mode is off.

Training (purple):
- Subtabs preserved. Home subtab gains: Performance Score card, Training Streak card, Weekly Volume chart with filters, Volume-by-muscle bar, Body Heat Map (mode=load).
- Active workout screen redesigned for focus: top strip (timer, total volume, muscles hit), current exercise card (previous set, best set, target), completed exercises collapse to summary chips. Rest timer becomes a Ring overlay.

Nutrition (red):
- Macros subtab: big Macro Ring (kcal) + P/C/F sub-rings, Calories Remaining card, Weekly calorie trend chart, Macro Consistency score, Nutrition Insight strip ("Protein behind pace — 48g to go").
- Log subtab keeps fast-logging UX, restyled to new tiles.

Recovery (blue):
- Readiness + Recovery Score cards.
- Full Body Heat Map (front/back toggle, mode toggle: Recovery / Fatigue / Load / Imbalance). Tap → muscle detail sheet.
- "Best training option today" recommendation card.
- Weekly recovery trend chart, sleep/HRV/steps placeholder cards labeled "Connect Apple Health".

Progress (green):
- Monthly report card hero.
- Bodyweight trend, Strength progress chart per lift (selectable), Total Volume chart with comparison toggle (this week vs last, this month vs last).
- Body Heat Map mode=strength + mode=imbalance.
- PR cards + Badges grid (30-day streak, 225 bench, 10k-lb workout, 100 workouts, protein streak, new PR, consistency). Badge unlock logic in `analytics.ts`.

Settings / Hub:
- New "Demo data" toggle with explainer.
- Existing export/import preserved.

AI coach:
- `FloatingAi` updated to a smooth bottom sheet (uses existing sheet primitive) with quick-suggestion chips per current section. Any data-changing suggestion routes through a `ConfirmDialog` before applying.

## Technical notes

- No new heavy deps. Use existing recharts/lucide/framer-motion if present; otherwise `bun add framer-motion` (single small dep). Plan assumes Framer Motion is acceptable; if already installed via shadcn, reuse it.
- Section accent is applied by setting `data-section="training"` on the page root and mapping `[data-section=...] { --section: ... }` in `styles.css`.
- All charts render with demo data when empty, behind a thin "Demo" badge so it's never confused with real data.
- Confirmations preserved on destructive actions.

## Out of scope (scaffolded only)

- Apple Health integration (placeholder cards + copy).
- Voice logging (button stub).
- Real soreness input (UI ready, no logger yet).

## Validation

- `bun x tsc --noEmit` and lint.
- Visual check on 390x844 mobile viewport: home, each section, active workout, AI sheet, demo toggle on/off.
- Verify localStorage keys untouched after toggling demo data.

## Deliverable summary at the end

I'll report: files changed, what's wired to real data, what uses demo data, what's scaffolded for future, and known limitations.
