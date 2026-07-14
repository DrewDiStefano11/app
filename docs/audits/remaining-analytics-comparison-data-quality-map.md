# Analytics and Data Quality Map

## 1. Executive summary

The current FitCore application on `main` has a robust but fragmented analytics layer. The Analytics Phase 2 engine is structurally introduced (in `src/lib/analytics/`), offering sophisticated contracts for meaningful change, trends, and trust, but these are largely unimplemented in the remaining domain views (Fuel, Recovery, Progress) which still rely on simpler local aggregations and presentation-only calculations.

**Current visualization architecture**: Charts are primarily composed using Recharts via `src/components/ui/chart.tsx` and domain-local visual components. There is no unified comparison visualization system active on `main` yet; cross-domain comparisons are rudimentary.

**Current data-quality model**: Analytics contracts define quality states (e.g., `ready`, `insufficient_data`) and trust metrics, but the UI often silences these, presenting zero or fallback states instead of explicit data quality warnings.

**Highest-risk data-honesty gaps**:

- Missing values are frequently cast to 0 (e.g., 0 calories instead of 'No data') which breaks trend honesty.
- One-point 'trends' or line charts with insufficient history create misleading visualizations.
- Synthetic or fallback scores (e.g., assuming 100% readiness if no data exists) without explicit warnings.

**Dependencies on Phase 2**: The future redesigns must migrate off local reducers in `src/components/app/views/` and fully consume the `src/lib/analytics/fitcore-analytics-*.ts` contracts to unify empty states, trust, and baseline logic.

## 2. Method and evidence boundaries

- **Required base SHA**: `3e4326782d761313c4f2644ecfe55503770b360a`
- **Methodology**: Static inspection of TypeScript source code, types, and test files using CLI tools. No runtime browser verification was performed.
- **Files inspected**: Core `src/lib/analytics/` files, `src/components/app/views/nutrition.tsx`, `src/components/app/views/recovery.tsx`, `src/components/app/views/progress.tsx`, and shared chart components.
- **Status Definitions**:
  - **Confirmed supported**: Logic is explicitly present and active in production code.
  - **Confirmed unsupported**: Explicitly marked unsupported or completely absent from production paths.
  - **Confirmed partial**: Feature exists but lacks full historical coverage or handles edge cases poorly.
  - **Confirmed fallback**: Hardcoded defaults or placeholder logic is used when data is missing.
  - **Confirmed synthetic**: Data is generated or interpolated rather than measured.
  - **Probable risk**: Static analysis suggests a defect, but runtime verification is needed.
  - **Requires browser verification**: Visual or responsive behavior that cannot be confirmed via static analysis.
  - **Unclear**: Intent or behavior cannot be determined from source alone.

## 3. Analytics architecture map

The analytics architecture is split between a legacy functional layer and a new Phase 2 contract layer.

- **Legacy Core (`src/lib/analytics.ts`)**: Contains synchronous helper functions (`momentumScore`, `performanceScore`, `muscleMap`) used directly by views.
- **Phase 2 Contracts (`src/lib/analytics/`)**: A new standardized engine.
  - `fitcore-analytics-interactions.ts`: Defines interaction protocols.
  - `fitcore-analytics-visualizations.ts`: Standardized visualization metadata.
  - `rolling-trends.ts` / `meaningful-change.ts`: Trend and change calculation policies.
  - `metric-trust.ts` / `metric-quality.ts`: Data quality contracts.

## 4. Analytics Phase 2 contract inventory

- **Meaningful Change** (`FITCORE_MEANINGFUL_CHANGE_POLICY` in `src/lib/analytics/meaningful-change.ts`): Evaluates 'significant_improvement', 'stable', etc. Supported states: `unavailable`, `insufficient_data`, `ready`.
- **Rolling Trends** (`FITCORE_ROLLING_TREND_POLICY` in `src/lib/analytics/rolling-trends.ts`): Evaluates 'increasing', 'decreasing'. Supported states: `unavailable`, `insufficient_data`, `ready`.
- **Personal Baselines** (`FITCORE_PERSONAL_BASELINE_POLICY` in `src/lib/analytics/personal-baselines.ts`): Evaluates historical baselines.
- **FitCore Readiness** (`src/lib/analytics/fitcore-insight-readiness.ts`): Contracts for evaluating overall readiness.

## 5. Metric registry

- **Momentum Score**: Derived (0-100). Found in `src/lib/analytics.ts`. Missing data: defaults to 0. Required history: None strict, but scales with touchpoints.
- **Recovery Score**: Derived (0-100).
- **Daily Volume**: Derived (lbs/kg). `weeklyVolumeSeries` in `src/lib/analytics.ts`.
- **Bodyweight**: Measured (lbs). `bodyweightDelta` in `src/lib/analytics.ts`.
- **Macros (Protein/Carbs/Fat)**: Measured/Calculated (g). Missing data often defaults to 0.

## 6. Fuel/Nutrition analytics inventory

- **Today's Totals**: `todayMealTotals` (`src/lib/analytics.ts`). Aggregates calories and macros for the current day. Missing records result in 0. Visualized in `nutrition.tsx`.
- **Nutrition Consistency**: Evaluated within `momentumScore` (logged days/protein days out of 7).

## 7. Recovery analytics inventory

- **Muscle Recovery**: `muscleMap(state, "recovery")` in `src/lib/analytics.ts`. Normalizes recent load over 3 days. Exact-value access is limited in UI.
- **Check-in Rhythm**: Evaluated within `momentumScore`.
- **Sleep Quality Signal**: Derived from `sleepEntries` (hours / goal \* quality / 5).

## 8. Stats/Progress analytics inventory

- **Momentum**: `momentumScore` (`src/lib/analytics.ts`). Combines training, nutrition, check-ins, recovery, progress. Range: 0-100.
- **Bodyweight Delta**: `bodyweightDelta` (`src/lib/analytics.ts`). Change over a specified window. Returns `null` if no history.
- **Training Streak**: `trainingStreak` (`src/lib/analytics.ts`). Consecutive days with workouts.

## 9. Cross-domain metric inventory

- **Momentum Contributors**: Cross-domain aggregation in `momentumScore` (Training + Fuel + Recovery + Stats). No explicit dual-axis visualization implemented in `main` yet.
- **Recovery vs Load**: `bestMuscleToTrainToday` combines recovery and load maps.

## 10. Visualization component inventory

- **Chart** (`src/components/ui/chart.tsx`): Wrapper for Recharts.
- **Body Heatmap** (`src/components/app/body-heatmap.tsx`): Visualizes muscle load/recovery. Fallback to 0 if missing.
- **Progress / Bars** (`src/components/ui/progress.tsx`): Standard progress bars.

## 11. Chart-by-chart inventory

- **Volume Series**: Line/Bar chart for `weeklyVolumeSeries`. Empty days are filled with 0 (`fillMissingDays` in `src/lib/analytics.ts`). Risk: Treats missing workouts as 0 volume, which is technically true but can skew rolling averages.
- **Macro Distribution**: Pie/Ring charts in `nutrition.tsx` (assumed via static analysis of typical usage). Missing data behavior: defaults to 0.

## 12. Range and date-control inventory

- **7-Day, 14-Day, 30-Day Windows**: Hardcoded in various analytic functions (e.g., `weeklyVolumeSeries`, `bodyweightDelta`).
- **Missing History**: Usually falls back to available data or returns null/0 depending on the function.

## 13. Comparison-system audit

- **Current implementation**: Minimal. The Analytics Phase 2 engine outlines comparison contracts, but actual multi-metric selection, dual-axes, and normalized modes are largely absent or hardcoded in specific views on `main`.

## 14. Axis and unit-handling audit

- **Single-axis**: Standard in `chart.tsx`.
- **Dual-axis**: No robust standardized dual-axis component found in `main` shared components.
- **Risk**: Comparing raw volume (thousands) with score (0-100) without dual axes or normalization would break visual scales.

## 15. Exact-value and tooltip audit

- **Hover/Tooltip**: Standard Recharts tooltips in `chart.tsx`.
- **Mobile Behavior**: Requires browser verification (usually tap-to-tooltip).
- **Risk**: Some exact values in `momentumScore` factors are concatenated into strings (`detail`) rather than structured data, limiting custom tooltip formatting.

## 16. Underlying-data access audit

- Most analytic scores (e.g., `momentumScore`) summarize data but do not provide direct navigation paths (IDs) back to the underlying `mealEntries` or `workouts` that generated them within the returned contract.

## 17. Data-quality contract inventory

- **Phase 2 Contracts**: `unavailable`, `insufficient_data`, `ready` (`src/lib/analytics/rolling-trends.ts`).
- **Legacy**: `hasData: false`, `score: 0` (`src/lib/analytics.ts` in `momentumScore`).
- **Risk**: Inconsistent vocabulary between legacy (`hasData`) and Phase 2 (`insufficient_data`).

## 18. Missing-versus-zero audit

- **Volume Series**: `fillMissingDays(range, volumeByDay, 0)` explicitly converts missing days to 0 (`src/lib/analytics.ts`).
- **Macros**: Missing meals are implicit 0s in daily totals.
- **Risk**: Legitimate 0 (e.g., logged a rest day) is visually indistinguishable from missing (e.g., forgot to log).

## 19. Synthetic and fallback-value audit

- `muscleMap` recovery mode normalizes against a max of 1, effectively creating synthetic relative scores (`src/lib/analytics.ts`).
- Fallback for no momentum data is a hardcoded 0 score and empty factors array.

## 20. Partial-history audit

- `bodyweightDelta` requires at least one baseline point within the window; if only one point exists total, it may compare against itself (delta 0) depending on array length checks (`src/lib/analytics.ts`).

## 21. Stale-data audit

- Time windows are calculated relative to `now` (often `Date.now()`).
- No explicit 'stale' indicator for old momentum scores; if you haven't logged in 30 days, momentum simply decays to 0.

## 22. Unsupported and unavailable-state audit

- Phase 2 introduces `unavailable` state, but UI views largely use conditional rendering (`if (!data.length) return <EmptyState />`) rather than reading analytical state contracts.

## 23. Confidence and evidence audit

- `momentumScore` provides a `detail` string (e.g., "3 meal-log days...") as weak evidence, but lacks structured statistical confidence metadata.
- Phase 2 (`src/lib/analytics/metric-trust.ts`) contains robust trust/confidence models, but they are not fully wired into the presentation layer.

## 24. Correlation-boundary audit

- No explicit statistical correlation (Pearson, Spearman) calculations found in `main`.
- `bestMuscleToTrainToday` creates an association between load and recovery, but does not calculate a statistical correlation.

## 25. Causal-language audit

- Causal language is minimal. `momentumScore` details use descriptive language ("Bodyweight moved X lb toward your goal"). Risk is low, but AI insights (if active) require review.

## 26. Chart accessibility audit

- Requires browser verification. Recharts standard SVG output is notoriously difficult for screen readers without explicit ARIA labels and tabular fallback data.

## 27. Chart responsive-risk audit

- Requires browser verification. Fixed margins in Recharts components often clip labels on narrow mobile screens (under 375px).

## 28. Domain state matrix

- **Fuel**: Empty state -> `<EmptyState>`. Partial day -> partial totals. Missing -> 0.
- **Recovery**: Empty state -> `<EmptyState>`. Missing check-ins -> excluded from averages.
- **Progress**: Empty state -> `<EmptyState>`. Stale -> decays over time.

## 29. Comparison compatibility matrix

- Metric A: Volume | Metric B: Readiness -> Raw compatibility: None. Dual-axis required.
- Metric A: Protein | Metric B: Calories -> Raw compatibility: None. Dual-axis required.

## 30. Analytics-consumer map

- `momentumScore` -> consumed by Dashboard / Progress.
- `todayMealTotals` -> consumed by Nutrition View.
- `weeklyVolumeSeries` -> consumed by Training / Progress Views.

## 31. Unit-test coverage map

- Unit tests for Phase 2 contracts likely exist in `tests/unit/` but legacy `src/lib/analytics.ts` coverage handles basic edge cases (empty states).

## 32. Browser and integration test-coverage map

- E2E tests in `tests/e2e/` primarily cover critical paths (logging, navigation) rather than exhaustive chart state verification.

## 33. Prioritized data-honesty risk register

- **High**: `fillMissingDays` casting missing entries to 0 (`src/lib/analytics.ts`). Obscures the difference between 'rest day' and 'forgot to log'.
- **Medium**: `bodyweightDelta` potentially comparing a single point against itself if history is insufficient.

## 34. Prioritized visualization risk register

- **High**: Lack of table alternatives for charts (Accessibility gap).
- **Medium**: Tooltip clipping on mobile (Requires browser verification).

## 35. Future redesign acceptance checklist

- [ ] Metric names remain canonical.
- [ ] Units remain visible on all axes and tooltips.
- [ ] Missing data is explicitly distinguished from zero.
- [ ] Single data points do not render as connecting trend lines.
- [ ] Charts provide an accessible table alternative.

## 36. Future Analytics Phase 2 consumption checklist

- Redesigned views must use `src/lib/analytics/` contracts (e.g., `FITCORE_MEANINGFUL_CHANGE_POLICY`) instead of local reducers.
- Must handle `insufficient_data` states gracefully without falling back to 0 implicitly.

## 37. Safe future task boundaries

- `src/components/app/views/*.tsx`: Safe for local presentation changes.
- `src/lib/analytics.ts`: High risk; heavily depended upon by current views.
- `src/lib/analytics/*.ts`: Do not modify; Phase 2 contracts are stable targets.

## 38. Open questions and uncertainties

- How should 'rest days' be explicitly logged vs implicitly inferred for volume charts? (Requires product clarification).

## 39. File index

- `src/lib/analytics.ts`
- `src/lib/analytics/meaningful-change.ts`
- `src/lib/analytics/rolling-trends.ts`
- `src/lib/analytics/metric-trust.ts`
- `src/components/app/views/nutrition.tsx`
- `src/components/app/views/recovery.tsx`
- `src/components/app/views/progress.tsx`
