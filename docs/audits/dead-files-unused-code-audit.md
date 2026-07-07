# Dead Files and Unused Code Audit Report

## Executive Summary

This report outlines suspected dead files, unused code, stale CSS, unused assets, and service worker cache concerns identified during a static analysis of the FitCore codebase. The primary tool used was `knip` to find unreferenced source files and unused exports. We also analyzed CSS, public assets, and the service worker. No files have been deleted.

## Definitely Unused Items

### Unused Source Files

These files are not imported anywhere in the application. Most appear to be unused UI components from shadcn/ui or similar libraries that were added but never used.

- `src/components/app/dashboard-layout.ts`
- `src/components/ui/accordion.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/tooltip.tsx`
- `src/hooks/use-mobile.tsx`
- `src/lib/api/example.functions.ts`
- `src/lib/config.server.ts`

### Unused Dependencies

The following dependencies appear in `package.json` but are not referenced in the code:

- @hookform/resolvers
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- @tanstack/router-plugin
- class-variance-authority
- cmdk
- date-fns
- embla-carousel-react
- input-otp
- react-day-picker
- react-hook-form
- react-resizable-panels
- sonner
- vaul
- zod

## Probably Unused Items

### Unused Exported API Surface

These exports are not used anywhere outside of their defining files. Note that many of these functions may still be used internally within their respective modules; this section primarily highlights unnecessary `export` declarations.

- `SourceBadge` (src/components/app/jarvis/jarvis-panel.tsx)
- `SectionCard`, `ProgressBar`, `ChartCard`, `TrendChip`, `ScoreCard`, `SkeletonCard`, `ErrorState` (src/components/app/ui.tsx)
- `estimateFoodFromText` (src/lib/ai.functions.ts)
- `setsSeries` (src/lib/analytics-extra.ts)
- `withinDays`, `performanceScore` (src/lib/analytics.ts)
- `getDataTrustSummary`, `buildDailyDecisionContext`, `getDailyDecisionConfidence`, `getWhatChangedSignals` (src/lib/daily-decision.ts)
- `foodById` (src/lib/data.ts)
- `FITCORE_STORAGE_KEY`, `FITCORE_DATA_VERSION`, `createManualProvenance`, `isLowConfidence`, `shouldRequireConfirmation`, `validateFitCorePayload`, `createLog`, `saveLog`, `updateLog`, `deleteLog`, `getLogsByType`, `getLogsByDateRange`, `getWorkoutHistory`, `getExerciseHistory`, `getExercisePreviousPerformance`, `getLatestMetrics`, `getDailyMacroSummary`, `getNutritionSummary`, `getRecoverySummary`, `getProgressSeries`, `extractRecoverySignalsFromNotes` (src/lib/fitcore-data.ts)
- `lbToKg`, `kgToLb`, `miToKm`, `weightUnit`, `formatWeight`, `distanceUnit` (src/lib/types.ts)

## Items Needing Manual Confirmation

### Unused Types

Numerous TypeScript interfaces and types in `src/lib/types.ts`, `src/lib/daily-decision.ts`, and `src/lib/fitcore-data.ts` are exported but not imported elsewhere. These might be useful for future development but are currently unreferenced.

### Debug/TODO Findings

- `src/routes/sitemap.xml.ts`: Contains `// TODO: replace with your project URL once a project name or custom domain is set.`
- `src/routes/__root.tsx`: Contains `console.log` statements for Service Worker registration success and failure. (Harmless, but could be removed for cleaner production logs).

## Stale CSS Findings

- The `src/styles.css` file contains many styles that appear specific to complex UI interactions (`.momentum-sheet-hero`, `.body-heatmap-region`, `.command-bar__composer`, etc.). Given the high number of unused components in `src/components/ui`, many of these custom styles may no longer match current markup. A deeper visual regression test is needed before removing CSS.

## Stale Asset Findings

- All assets in `public/` are related to PWA icons (`icon-192.png`, `icon-512.png`, etc.).
- There is no indication of unused static image files in `public/`.

## Service Worker/Cache Concerns

- `public/sw.js` correctly caches `STATIC_ASSETS`.
- **Note:** The cache name is `fitcore-v1`. If assets are ever removed, the SW cache strategy might keep stale assets around unless the cache name is bumped.
- SW handles `/assets/` and standard image extensions dynamically.

## Recommended Cleanup Order

1. **Remove Unused Components:** Safely delete unreferenced `src/components/ui/` files and `src/components/app/dashboard-layout.ts`.
2. **Clean package.json:** Uninstall unused UI and utility dependencies.
3. **Clean Unused Exports:** Remove unnecessary `export` keywords from functions in `src/lib/*` to limit the API surface. Only delete the functions entirely after verifying they are not used internally within their own files.
4. **CSS Review:** Cross-reference `src/styles.css` with active React components and remove dead classes.

## Items Safe to Delete Now

- The unused `src/components/ui/` files listed in the "Definitely Unused Items" section.
- `src/lib/api/example.functions.ts`

## Items Not Safe to Delete Yet

- `src/lib/types.ts` definitions (may be needed for data modeling even if not currently imported).
- CSS classes in `src/styles.css` (need manual confirmation).

## Validation Performed

- Static analysis using `knip`.
- Text search for `TODO`, `FIXME`, and `console.log`.
- Manual review of `public/sw.js`.
- Checked `package.json` dependencies against codebase usage.
