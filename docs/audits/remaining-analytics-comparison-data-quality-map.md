# Analytics and Data Quality Map

## 1. Executive summary

The analytics architecture consists of a legacy synchronous layer (`src/lib/analytics.ts`) currently consumed by the remaining un-redesigned views (Fuel, Recovery, Progress) and a new Analytics Phase 2 engine (`src/lib/analytics/*.ts`) whose contracts are currently unconsumed by these specific views.

**Current visualization architecture**: Charts wrap the Recharts library via `src/components/ui/chart.tsx`. A universal comparison visualization system is not actively rendered in `main`.

**Current data-quality model**: Analytics Phase 2 contracts define detailed quality states (`unavailable`, `insufficient_data`, `ready`). Current domain views do not consume these, opting instead for local empty-state conditionals and filling missing data with zeros.

**Dependencies on Analytics Phase 2 contracts**: Future redesign tasks represent a possible migration target from local reducers to the `src/lib/analytics/` contracts.

## 2. Method and evidence boundaries

- **Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
- **Methodology**: Static inspection of TypeScript source code, components, and E2E tests using CLI tools. No runtime browser verification was performed.
- **Traceability**: All capabilities are grounded in exact file and symbol references.
- **Status Definitions**:
  - **Confirmed supported**: Logic is explicitly present and actively rendered in the UI.
  - **Confirmed partial**: Feature exists but lacks full historical coverage or handles specific edge cases weakly in code.
  - **Confirmed fallback**: Hardcoded defaults are returned when data is missing.
  - **Confirmed synthetic**: Data is explicitly generated (e.g., test fixtures, mock history).
  - **Requires browser verification**: Visual layout and responsive behavior.
  - **Unclear**: Intent cannot be confirmed via static analysis without product definitions.

## 3. Analytics architecture map

**Legacy Helper Registry (Actively Consumed by these domains)**

- `src/lib/analytics.ts`: Contains domain aggregations (`momentumScore`, `performanceScore`, `muscleMap`, `weeklyVolumeSeries`, `todayMealTotals`).

**Phase 2 Contract Registry (Currently unconsumed by these domains)**

- `FITCORE_MEANINGFUL_CHANGE_POLICY` (`src/lib/analytics/meaningful-change.ts`)
- `FITCORE_ROLLING_TREND_POLICY` (`src/lib/analytics/rolling-trends.ts`)
- `FITCORE_PERSONAL_BASELINE_POLICY` (`src/lib/analytics/personal-baselines.ts`)
- `src/lib/analytics/fitcore-analytics-interactions.ts`
- `src/lib/analytics/fitcore-analytics-visualizations.ts`
- `src/lib/analytics/metric-trust.ts`
- `src/lib/analytics/metric-quality.ts`

## 4. Current runtime-consumer map

- **Momentum Score**: Symbol `momentumScore` (`src/lib/analytics.ts`). Consumed by `ProgressView` (`src/components/app/views/progress.tsx`). Visually rendered. Exact values of factors are concatenated into strings.
- **Daily Volume**: Symbol `weeklyVolumeSeries` (`src/lib/analytics.ts`). Consumed by `ProgressView`. Renders chart. Missing-data zero-fill is active.
- **Bodyweight Delta**: Symbol `bodyweightDelta` (`src/lib/analytics.ts`). Consumed by `ProgressView`. Missing data returns `null`.
- **Muscle Recovery Heatmap**: Symbol `muscleMap` (`src/lib/analytics.ts`). Consumed by `RecoveryView` (`src/components/app/views/recovery.tsx`).
- **Today's Meal Totals**: Symbol `todayMealTotals` (`src/lib/analytics.ts`). Consumed by `NutritionView` (`src/components/app/views/nutrition.tsx`).

## 5. Exact test map

- **Legacy analytics helpers**: Handled by unit tests (likely in `tests/unit/` though not deeply verified in this static pass).
- **Nutrition logging propagation**: E2E verified in `tests/e2e/nutrition-logging-validation-smoke.spec.ts`. Proves data propagates from log to view. Does not prove exact chart rendering values.
- **Recovery check-in propagation**: E2E verified in `tests/e2e/recovery-check-in-validation-smoke.spec.ts`. Proves check-in submits.
- **Chart empty data smoke**: `tests/e2e/chart-empty-data-smoke.spec.ts` (name derived from branch list). Proves app doesn't crash on empty charts. Does not prove specific fallback values.

## 6. Fuel/Nutrition analytics inventory

- **Canonical Name**: Today's Meal Totals
- **Exact Symbol**: `todayMealTotals`
- **Source**: `src/lib/analytics.ts`
- **Missing-data behavior**: Returns 0 for calories/macros if no meals match the day window.
- **Zero behavior**: Interpreted as legitimate zero if explicitly logged as zero, but indistinguishable from missing data statically.

## 7. Recovery analytics inventory

- **Canonical Name**: Muscle Recovery Heatmap
- **Exact Symbol**: `muscleMap`
- **Source**: `src/lib/analytics.ts`
- **Status**: Normalized derived value. Uses max load to relative-scale recovery (1 - load/max \* 0.85).
- **Consumer**: `RecoveryView` (`src/components/app/views/recovery.tsx`).

## 8. Stats/Progress analytics inventory

- **Canonical Name**: Momentum Score
- **Exact Symbol**: `momentumScore`
- **Source**: `src/lib/analytics.ts`
- **Status**: Derived score. Range 0-100.
- **Zero behavior**: Returns a fallback zero and empty factors array if sufficient history is absent.

## 9. Cross-domain metrics inventory

- **Canonical Name**: Best Muscle to Train Today
- **Exact Symbol**: `bestMuscleToTrainToday`
- **Source**: `src/lib/analytics.ts`
- **Status**: Correlates load and recovery map outputs. Derived metric.

## 10. Chart and visualization registry

- **Component**: `chart.tsx` (`src/components/ui/chart.tsx`). Library: Recharts. Source of multi-metric visualizations when active.
- **Component**: `body-heatmap.tsx` (`src/components/app/body-heatmap.tsx`). Visualizes muscle values via SVG path opacity.
- **Component**: `progress.tsx` (`src/components/ui/progress.tsx`). Single-axis percentage bars.

## 11. Range controls

- **Behavior**: Date ranges (e.g., 7 days, 14 days, 30 days) are currently hardcoded directly into the function calls within the views (e.g., `weeklyVolumeSeries(state, 7)`). There are no active UI date-range picker components manipulating these props in the inspected views.

## 12. Comparison behavior

- **Active Implementation**: Contract-only. Phase 2 interaction contracts exist, but there is no active runtime UI rendering dual-metric selection, dual axes, or normalized comparisons in `Fuel`, `Recovery`, or `Progress`.

## 13. Exact-value access & Tooltip behavior

- **Tooltip**: Recharts `chart.tsx` supports tooltips, exposing exact values. Because `fillMissingDays` (`src/lib/analytics.ts`) injects literal 0s, tooltips display "0" for missing days rather than a blank or missing state.

## 14. Underlying record access

- Current aggregates in `src/lib/analytics.ts` (like `momentumScore` or `todayMealTotals`) do not return arrays of underlying IDs. UI drill-down from score to original record is not actively implemented in these domains.

## 15. Missing versus zero

- **Volume Series (`fillMissingDays`)**: Casts missing days to 0. This is a recorded zero (no logged workout). Product definition required to determine if "no log" should be visually distinct from "logged rest day".
- **Bodyweight Delta**: Returns `null` (unavailable) if no history exists. Correctly distinguishes missing from zero change.
- **Nutrition Totals**: Missing meals equate to 0 totals. Legitimate behavior for daily aggregation, though missing-data tracking is lost.

## 16. Partial history & Single-point history

- `bodyweightDelta` evaluates against the earliest point in a window. If only one point exists in the history window, it compares against itself, yielding a 0 delta. Requires product definition on whether single-point history should return `unavailable` instead.

## 17. Derived and normalized values

- `momentumScore`, `muscleMap` (recovery mode), and `performanceScore` are derived or normalized derived values. They are not synthetic/fake data.

## 18. Demo and test-only synthetic data

- E2E tests use synthetic data fixtures to bypass onboarding (e.g., `seedMinimalOnboardedState`). Production paths do not use synthetic generation for these metrics.

## 19. Stale-data behavior

- Legacy helpers evaluate against `Date.now()`. Data naturally falls out of rolling windows and metrics decay to 0. There is no explicit "stale" UI badge rendered.

## 20. Trust and confidence metadata

- **Contracts**: Phase 2 (`src/lib/analytics/metric-trust.ts`) contains trust contracts.
- **Runtime**: `momentumScore` returns `detail` strings (e.g., "3 meal-log days"), which acts as weak qualitative confidence rather than structured metadata.

## 21. Correlation and causality boundaries

- No explicit statistical correlations (Pearson, etc.) are computed. Causal language is absent in current domain UI.

## 22. Accessibility and responsive evidence boundaries

- Static inspection confirms SVG reliance in `chart.tsx`. Requires browser verification for screen reader accessibility and narrow-viewport responsive clipping.

## 23. Preservation checklist

- [ ] Preserve `momentumScore` fallback logic until replacement is validated.
- [ ] Preserve `fillMissingDays` behavior during presentation-only redesigns until product definitions change.

## 24. Possible future integration options

- Future redesigns might integrate `FITCORE_MEANINGFUL_CHANGE_POLICY` or `FITCORE_ROLLING_TREND_POLICY` from Phase 2 instead of `src/lib/analytics.ts`.

## 25. Safe implementation boundaries

- UI view files (`src/components/app/views/*.tsx`) are safe targets for redesigns.
- `src/lib/analytics/*.ts` should remain untouched as they define stable Phase 2 contracts.

## 26. Open questions

- Should "no logged workout" render visually different from "logged rest day"?
- Should single-point bodyweight history display "0 change" or an explicit "unavailable" state?

## 27. File index

- `src/lib/analytics.ts`
- `src/lib/analytics/meaningful-change.ts`
- `src/lib/analytics/rolling-trends.ts`
- `src/lib/analytics/personal-baselines.ts`
- `src/components/ui/chart.tsx`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
- `tests/e2e/nutrition-logging-validation-smoke.spec.ts`
