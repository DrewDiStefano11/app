# FitCore UI Design System

## Direction

FitCore is a premium, dark-first health and longevity dashboard: comprehensive underneath, simple at first glance. The interface should feel calm, precise, mobile-native, and worth paying for. It may be data-rich, but it must never become noisy, neon-heavy, or ornamental.

The visual hierarchy is:

1. One clear daily signal or action.
2. Compact summaries for the five pillars.
3. Small, interpretable chart previews.
4. Detailed analytics inside sheets and full sections.

## Principles

- Use semantic tokens instead of one-off values.
- Prefer a few strong cards over a wall of equal-weight containers.
- Keep glass effects subtle; readable opaque surfaces win.
- Use color to identify meaning, not decorate every element.
- Show summary data on Home and move dense explanation into sheets.
- Preserve 44px tap targets, visible focus, safe areas, and reduced motion.
- Never change analytics or logging behavior to make a visual fit.

## Tokens

The canonical tokens live in `src/styles.css`.

- Color: app/elevated/card/modal backgrounds; primary, secondary, and muted text; subtle/strong borders; primary/secondary accents; success, warning, danger; training, nutrition, recovery, body, and longevity.
- Spacing: `--space-xs` through `--space-2xl`.
- Radius: small, medium, large, card, modal, and pill.
- Shadows: card, elevated, modal, and floating.
- Typography: display, section, card title, stat, label, body, helper, and caption.

Section accents remain semantic: violet for Training, warm red for Nutrition, blue for Recovery, and green for Progress/Body. Accent fills should be used sparingly against neutral surfaces.

## Cards

All cards belong to one family:

- neutral elevated surface
- thin border and restrained shadow
- 16–20px internal padding
- title, metric, helper, and action hierarchy
- optional visual area and footer action
- subtle press feedback; no dramatic hover animation

Use `Card`, `SectionCard`, `StatCard`, `ScoreCard`, `ChartCard`, and `Tile`. New card types should compose these primitives rather than recreate backgrounds and borders.

Score cards lead with the number, then status, trend, explanation, and one visual. Warning and error cards use semantic color only around the relevant message.

## Charts and Graphics

Every detailed chart should use `ChartCard` or the `chart-shell` contract:

- meaningful title and one-sentence subtitle
- current value or trend near the title
- plot with breathing room
- restrained axes and grid lines
- simple legend
- compact segmented toggle when multiple modes exist
- opaque, high-contrast tooltip
- polished empty state when data is insufficient

Home previews should omit secondary axes and dense legends. Full sections and sheets may add detail. Do not change graph calculations, ranges, aggregation, or mode behavior for presentation.

Progress rings, sparklines, heatmaps, mini bars, status indicators, and timeline dots should share semantic tokens and never rely on color alone.

## Sheets and Popups

Use `BottomSheet` and `ConfirmDialog`.

- Surfaces are opaque enough for effortless reading.
- Backdrops separate the task from the page.
- Headers include a drag affordance, title, and clear close target.
- Tall sheets scroll internally and respect the bottom safe area.
- Destructive actions remain visually distinct.
- Dense analytics belong in a tall sheet rather than expanding Home.

## Buttons, Navigation, and Forms

Primary actions use the current section accent. Secondary actions use neutral elevated surfaces. Ghost actions should remain legible without becoming equal in weight to primary actions.

Bottom navigation uses a single floating surface, five equal tap targets, and a quiet active background. Labels remain short and readable on 360px screens.

Fields use consistent height, radius, border, label spacing, placeholder color, and focus rings. Quick-log flows should group related fields and keep the save action visually dominant.

## Empty, Loading, and Error States

- Empty: small icon area, short title, helpful sentence, optional next action.
- Loading: skeleton geometry matching the final card; honor reduced motion.
- Error: concise explanation and recovery action without exposing raw implementation details.
- Missing chart data must never collapse layout or show a blank graph.

## Adding Screens

1. Set the semantic `data-section` accent.
2. Use shared headers, tabs, cards, fields, and sheets.
3. Put the primary signal first.
4. Keep Home previews compact; move detailed analytics into a sheet.
5. Include empty, loading, error, and narrow-screen states.
6. Validate at 360px and 390px before desktop.
7. Do not add one-off gradients, shadows, typography scales, or storage behavior.

This system should prevent FitCore from becoming clunky again: shared primitives own appearance, view components own composition, and analytics/store modules continue to own data and behavior.

