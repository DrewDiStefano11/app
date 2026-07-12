export const ANALYTICS_SAMPLE_MINIMUMS = Object.freeze({
  trend: 2,
  highConfidenceTrend: 3,
  thirtyDayTrend: 2,
  highConfidenceThirtyDayTrend: 4,
  correlation: 5,
} as const);

function finiteValues(values: Iterable<unknown>): number[] {
  const valid: number[] = [];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) valid.push(value);
  }
  return valid;
}

/** Returns a finite number, falling back to zero if both inputs are invalid. */
export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number.isFinite(fallback) ? fallback : 0;
}

export function clamp(value: unknown, minimum: number, maximum: number): number {
  const safeMinimum = safeNumber(minimum);
  const safeMaximum = Math.max(safeMinimum, safeNumber(maximum, safeMinimum));
  return Math.max(safeMinimum, Math.min(safeMaximum, safeNumber(value, safeMinimum)));
}

export function clampPercent(value: unknown): number {
  return clamp(value, 0, 100);
}

/** Scores preserve the existing FitCore behavior of rounding to an integer. */
export function clampScore(value: unknown): number {
  return Math.round(clampPercent(value));
}

export function safeSum(values: Iterable<unknown>): number {
  return finiteValues(values).reduce((sum, value) => sum + value, 0);
}

export function safeAverage(values: Iterable<unknown>): number {
  const valid = finiteValues(values);
  return valid.length ? safeSum(valid) / valid.length : 0;
}

export function safeMin(values: Iterable<unknown>, fallback = 0): number {
  const valid = finiteValues(values);
  return valid.length ? Math.min(...valid) : safeNumber(fallback);
}

export function safeMax(values: Iterable<unknown>, fallback = 0): number {
  const valid = finiteValues(values);
  return valid.length ? Math.max(...valid) : safeNumber(fallback);
}

export function safeRatio(numerator: unknown, denominator: unknown, fallback = 0): number {
  const safeDenominator = safeNumber(denominator);
  if (safeDenominator === 0) return safeNumber(fallback);
  return safeNumber(safeNumber(numerator) / safeDenominator, fallback);
}

/**
 * Returns null when the baseline is zero or invalid because percent change is
 * undefined in that case. Callers can represent null as needs_more_data.
 */
export function safePercentChange(current: unknown, baseline: unknown): number | null {
  if (typeof baseline !== "number" || !Number.isFinite(baseline) || baseline === 0) return null;
  if (typeof current !== "number" || !Number.isFinite(current)) return null;
  return safeNumber(((current - baseline) / Math.abs(baseline)) * 100);
}
