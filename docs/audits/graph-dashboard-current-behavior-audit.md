# Graph & Dashboard Current Behavior Audit

## 1. Purpose
To audit the home dashboard and graph-related popups (Heatmap, Volume, Macros), focusing on data display, persistence of settings, and visual components.

## 2. Scope
This audit covers the main dashboard tiles, the `VolumeDetailSheet`, the `HeatmapDetailSheet`, the underlying `BodyHeatmap` SVG component, and how view states (like volume mode) persist.

## 3. Source files inspected
- `src/components/app/views/home.tsx`
- `src/components/app/popups/volume-popup.tsx`
- `src/components/app/popups/heatmap-popup.tsx`
- `src/components/app/body-heatmap.tsx`

## 4. Current confirmed behavior
- Dashboard features `Tile` components for Muscle Load (Heatmap), Macros, and Volume.
- Clicking a tile opens a detail sheet (e.g., `VolumeDetailSheet`, `HeatmapDetailSheet`).
- Heatmap modes (Load, Strength, Imbalance, Recovery) persist via `usePersistentState` (`heatmap.mode`).
- Volume modes (Range: 7d, 30d, 90d, etc. and GroupBy: total, muscle, exercise, day) persist via `usePersistentState`.
- The Body Heatmap correctly represents both front and back sides of the body using hardcoded SVG paths mapped to muscle regions.
- Logged workout volume correctly updates the dashboard and volume graphs dynamically.
- Empty states are handled (e.g., "No data in this range. Log a workout or enable Demo Data." in volume popup).

## 5. Current missing or unclear behavior
- While the dashboard states (e.g., volume mode) persist, it is unclear if `compare` toggle state in the volume popup persists outside the current session.
- Heatmap "Imbalance" mode does not yet visibly calculate left/right differences; muscles are generally symmetrical single SVG regions.

## 6. Data created or updated by this flow
- `localStorage`: Keys like `heatmap.mode`, `fitcore.ui.volumeRange`, `fitcore.ui.volumeMode`, and `fitcore.ui.volumeCompare` are written to store user preferences.
- No `FitCoreLogType` data is created by merely viewing the dashboard.

## 7. Downstream displays/graphs/summaries affected
- Dashboard tiles automatically reflect the persisted modes (e.g., the tile title changes to "Volume · 7d" or "Muscle Load").

## 8. AI/Jarvis interaction points
- Jarvis does not currently directly change UI view preferences (like heatmap modes).

## 9. Privacy/safety concerns
- No privacy concerns, as these UI preferences are stored locally in the browser and do not contain personal health data.

## 10. Demo/test account concerns
- Demo data populates these graphs excellently, demonstrating what a populated dashboard looks like.
- Demo data is dynamically overlaid via `migrateFitCoreDataIfNeeded(buildDemoState(state))` in the store, avoiding permanent pollution.

## 11. Known risks
- `usePersistentState` relies on synchronous `localStorage`. Frequent rapid toggling could technically cause stutter if storage access is slow, but practically negligible.

## 12. Recommended future implementation work
- Split SVG regions in `BodyHeatmap` to left/right to truly support the "Imbalance" view.

## 13. Acceptance criteria for future fixes
- The "Imbalance" heatmap mode visually distinguishes between a left arm and a right arm.

## 14. Do-not-touch boundaries for future PRs
- Do not alter the SVG path coordinates in `src/components/app/body-heatmap.tsx` unless specifically fixing clipping/rendering issues.

## 15. Final audit table

| Area | Current behavior | Source checked | Gap/risk | Future action |
|---|---|---|---|---|
| Dashboard Tiles | Tiles for Muscle, Macros, Volume. Click to expand. | `src/components/app/views/home.tsx` | None | None |
| Volume Graph | Supports ranges and group-bys. Settings persist. | `src/components/app/popups/volume-popup.tsx` | None | None |
| Heatmap | Front/back SVG rendering. Modes persist. | `src/components/app/body-heatmap.tsx` | Imbalance mode lacks left/right data | Split SVG muscles into L/R |
| Empty States | Defined for all graph popups | `src/components/app/popups/volume-popup.tsx` | None | None |
