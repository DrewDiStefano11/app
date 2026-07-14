# Analytics and Data Quality Map

## 1. Executive summary

The analytics architecture is split into a legacy synchronous layer (`src/lib/analytics.ts`) actively consumed by current UI and a new Analytics Phase 2 engine (`src/lib/analytics/*.ts`) composed of contracts not currently consumed by the remaining un-redesigned views (Fuel, Recovery, Progress).

**Current visualization architecture**: Charts are built wrapping the Recharts library via `src/components/ui/chart.tsx`. There is no active cross-domain universal comparison visualization system present in `main`.

**Current data-quality model**: Analytics Phase 2 contracts define detailed quality states (`unavailable`, `insufficient_data`, `ready`), but current domain views do not consume these, opting instead for local empty-state evaluations and casting missing data to zero.

**Dependencies on Analytics Phase 2 contracts**: Future redesign tasks must discard the local reducers in `src/components/app/views/` and integrate the metrics exported by `src/lib/analytics/` contracts.

## 2. Method and evidence boundaries

- **Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
- **Methodology**: Static inspection of TypeScript source code, components, and E2E tests using CLI tools. No runtime browser verification was performed.
- **Traceability**: All capabilities are grounded in specific file and symbol references.
- **Status Definitions**:
  - **Confirmed supported**: Logic is explicitly present and actively rendered.
  - **Confirmed partial**: Feature exists but lacks full historical coverage or robust edge case handling.
  - **Confirmed fallback**: Hardcoded defaults are returned when data is missing.
  - **Confirmed synthetic**: Data is artificially generated (e.g., test fixtures, normalized scaling).
  - **Requires browser verification**: Visual layout responsive behavior.
  - **Unclear**: Intent cannot be confirmed via static analysis without product definitions.

## 3. Analytics architecture map

The architecture splits sharply into consumed and unconsumed (contract) logic:

**Legacy/Shared Analytics Helpers (Actively Consumed)**

- `src/lib/analytics.ts`: Contains domain aggregations (`momentumScore`, `performanceScore`, `muscleMap`, `weeklyVolumeSeries`, `todayMealTotals`).

**Analytics Phase 2 Contracts (Currently Unconsumed by these Domains)**

- `FITCORE_MEANINGFUL_CHANGE_POLICY` (`src/lib/analytics/meaningful-change.ts`)
- `FITCORE_ROLLING_TREND_POLICY` (`src/lib/analytics/rolling-trends.ts`)
- `FITCORE_PERSONAL_BASELINE_POLICY` (`src/lib/analytics/personal-baselines.ts`)
- `src/lib/analytics/fitcore-analytics-interactions.ts`
- `src/lib/analytics/fitcore-analytics-visualizations.ts`
- `src/lib/analytics/metric-trust.ts`
- `src/lib/analytics/metric-quality.ts`

## 4. Analytics Phase 2 contract inventory

- **Meaningful Change** (`FITCORE_MEANINGFUL_CHANGE_POLICY` in `src/lib/analytics/meaningful-change.ts`): Evaluates status `unavailable`, `insufficient_data`, `ready`.
- **Rolling Trends** (`FITCORE_ROLLING_TREND_POLICY` in `src/lib/analytics/rolling-trends.ts`): Evaluates trend direction `stable`, `increasing`, `decreasing`.
- **Personal Baselines** (`FITCORE_PERSONAL_BASELINE_POLICY` in `src/lib/analytics/personal-baselines.ts`): Aggregates sum, mean, last, min, max.
- **Readiness Insight** (`FITCORE_READINESS_INSIGHT` in `src/lib/analytics/fitcore-insight-readiness.ts`): Contract for readiness evaluation.

## 5. Metric registry

- **Momentum Score**: Derived (0-100). Found in `momentumScore` (`src/lib/analytics.ts`). Missing data: falls back to 0. Actively consumed.
- **Daily Volume**: Derived (lbs/kg). `weeklyVolumeSeries` (`src/lib/analytics.ts`). Empty days filled with 0. Actively consumed.
- **Bodyweight Delta**: Measured (lbs). `bodyweightDelta` (`src/lib/analytics.ts`). Change over a specified window. Returns `null` if empty. Actively consumed.
- **Muscle Recovery Heatmap**: Derived (0-1). `muscleMap(state, "recovery")` (`src/lib/analytics.ts`). Actively consumed.

## 6. Fuel/Nutrition analytics inventory

- **Today's Totals**: `todayMealTotals` (`src/lib/analytics.ts`). Calculates calories and macros for current day. Missing records produce 0. Consumed by `NutritionView` (`src/components/app/views/nutrition.tsx`).
- **Nutrition Consistency**: Component of `momentumScore` evaluating logged days and protein targets out of 7 days (`src/lib/analytics.ts`).

## 7. Recovery analytics inventory

- **Muscle Recovery**: `muscleMap` in `src/lib/analytics.ts` (mode: "recovery"). Normalizes recent load over 3 days against max load to return 1 - (load/max \* 0.85). Consumed by `RecoveryView` (`src/components/app/views/recovery.tsx`).
- **Check-in Rhythm**: Component of `momentumScore` evaluating touchpoints (`src/lib/analytics.ts`).
- **Sleep Quality Signal**: Derived from `sleepEntries` (hours / goal \* quality / 5) in `momentumScore` (`src/lib/analytics.ts`).

## 8. Stats/Progress analytics inventory

- **Momentum Score**: `momentumScore` (`src/lib/analytics.ts`). Range 0-100. Consumed by `ProgressView` (`src/components/app/views/progress.tsx`).
- **Bodyweight Change**: `bodyweightDelta` (`src/lib/analytics.ts`). Calculates difference from earliest record in range. Returns `null` if history is missing. Consumed by `ProgressView`.
- **Training Streak**: `trainingStreak` (`src/lib/analytics.ts`). Count of consecutive days logged. Consumed by `ProgressView`.

## 9. Cross-domain metric inventory

- **Best Muscle to Train Today**: `bestMuscleToTrainToday` (`src/lib/analytics.ts`). Correlates `muscleMap` "recovery" vs "load".
- **Momentum Factors**: Training + Fuel + Check-ins + Recovery + Progress combined into `momentumScore` (`src/lib/analytics.ts`).
- **Comparisons**: There are no active cross-domain visual comparisons (e.g., dual-axis charts) rendered in `ProgressView`, `FuelView`, or `RecoveryView`.

## 10. Visualization component inventory

- **Chart Component**: `src/components/ui/chart.tsx` wraps Recharts.
- **Body Heatmap**: `src/components/app/body-heatmap.tsx`. Renders SVG paths mapped to `muscleMap`. Fallback behavior: 0 values render as lowest heat.
- **Progress**: `src/components/ui/progress.tsx`. Radix-UI based unipolar progress bar.

## 11. Chart-by-chart inventory

- **Volume Series Chart**: Renders `weeklyVolumeSeries` data. Found in `src/components/app/views/progress.tsx`. Zero-fill behavior: `fillMissingDays` (`src/lib/analytics.ts`) injects 0 for missing days.
- **Macro Distribution**: Found in `src/components/app/views/nutrition.tsx`. Consumes `todayMealTotals`.

## 12. Range and date-control inventory

- Date ranges are hardcoded into specific analytics functions (e.g., 7 days in `weeklyVolumeSeries`, 3 days in `muscleMap` recovery). There are no universal range selector components actively driving these charts in the views.

## 13. Comparison-system audit

- **Active Implementation**: None. While Phase 2 interaction contracts (`src/lib/analytics/fitcore-analytics-interactions.ts`) define comparison features, there is no code in `src/components/app/views/` orchestrating dual-metric selection, dual axes, or normalized views.

## 14. Axis and unit-handling audit

- **Single-axis**: Used exclusively in `chart.tsx`. Axis limits are automatically handled by Recharts.
- **Dual-axis**: Not implemented in `main` shared components.

## 15. Exact-value and tooltip audit

- **Hover/Tooltip**: `chart.tsx` implements standard tooltips. Exact values are rendered as string literals concatenated in factors (e.g. `detail` field in `momentumScore`).
- **Missing values**: Because `fillMissingDays` outputs literal 0, tooltips display 0 rather than a 'missing' state.

## 16. Underlying-data access audit

- `momentumScore` (`src/lib/analytics.ts`) aggregates factors but provides no persistent IDs mapping back to original records (e.g., specific sleep entries or meals). There is no active drill-down UI to access underlying evidence from the scores.

## 17. Data-quality contract inventory

- **Phase 2 Contracts**: Define `unavailable`, `insufficient_data`, `ready` (`src/lib/analytics/rolling-trends.ts`).
- **Legacy Runtime Behavior**: `momentumScore` uses a custom `hasData` boolean. UI views use standard empty state conditional rendering (`if (!data) return <EmptyState />`).

## 18. Missing-versus-zero audit

- **Volume Series**: `fillMissingDays` (`src/lib/analytics.ts`) explicitly converts missing history (no logged workout) to measured 0 volume.
- **Nutrition**: Missing meals are implicit 0s in `todayMealTotals`.
- **Risk**: Obscures genuine zero measurements versus missing history.

## 19. Synthetic and fallback-value audit

- `momentumScore` fallback is a hardcoded 0 score and empty factors array if no history is present (`src/lib/analytics.ts`).
- `muscleMap` recovery normalizes relative to a max volume, rendering scores synthetic rather than absolute measurements.

## 20. Partial-history audit

- `bodyweightDelta` (`src/lib/analytics.ts`) requires at least one point to act as baseline. Single-point history compares against itself, yielding 0 change.

## 21. Stale-data audit

- There is no explicit "stale" status. If time windows elapse without new records, values naturally aggregate to zero or drop out of `now`-relative windows in `src/lib/analytics.ts`.

## 22. Confidence and trust audit

- **Phase 2 Contracts**: `src/lib/analytics/metric-trust.ts` outlines robust trust signals.
- **Runtime Code**: `momentumScore` provides only a weak `detail` text string (e.g., "5 meal-log days") rather than structured confidence metadata.

## 23. Correlation and causality boundaries

- No explicit statistical correlations (e.g. Pearson) are calculated in `main`.
- `bestMuscleToTrainToday` creates a functional link between recovery and load but explicitly does not claim causation.

## 24. Accessibility and responsive static evidence

- Static inspection of `src/components/ui/chart.tsx` reveals standard Recharts implementation. Without explicit ARIA labeling or tabular fallbacks, SVG-based charts possess inherent accessibility weaknesses. Requires browser verification for mobile responsive widths.

## 25. Unit-test map

- Due to the Phase 2 contracts residing in `src/lib/analytics/`, matching unit tests cover contract schemas but do not prove UI consumption.

## 26. E2E/integration map

- Tests in `tests/e2e/` (e.g. `nutrition-logging-validation-smoke.spec.ts`) verify data propagation through UI elements but do not extensively assert chart visualization exact values.

## 27. Data-honesty risk register

- **Critical**: `fillMissingDays` (`src/lib/analytics.ts`) converting missing entries to 0. Misleads users on activity consistency.
- **High**: `bodyweightDelta` returning 0 delta for single points.

## 28. Visualization risk register

- **High**: No explicit accessible table alternatives for charts.

## 29. Preservation checklist

- [ ] Canonical metric logic (`momentumScore`) behavior must not be degraded during migration.
- [ ] Exact values must remain accessible via UI (e.g. tooltips).
- [ ] Avoid presenting partial data as 0.

## 30. Future Phase 2 consumption checklist

- Redesigned views must adopt `src/lib/analytics/meaningful-change.ts` and `src/lib/analytics/rolling-trends.ts` over the functional exports in `src/lib/analytics.ts`.
- UI must consume `unavailable` and `insufficient_data` states to display explicit empty/partial states instead of hardcoded 0.

## 31. Safe implementation boundaries

- `src/components/app/views/nutrition.tsx`: Safe to swap analytics dependencies.
- `src/components/app/views/recovery.tsx`: Safe to swap analytics dependencies.
- `src/components/app/views/progress.tsx`: Safe to swap analytics dependencies.
- `src/lib/analytics/*.ts`: Do not mutate Phase 2 contracts, consume them as read-only dependencies.

## 32. Open questions

- How will 'missing' versus 'measured 0' be visually demarcated in the redesigned charts? (Requires product design clarity).

## 33. File index

- `src/lib/analytics.ts`
- `src/lib/analytics/meaningful-change.ts`
- `src/lib/analytics/rolling-trends.ts`
- `src/lib/analytics/personal-baselines.ts`
- `src/components/ui/chart.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
