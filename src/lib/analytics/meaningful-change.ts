import type {
  RollingTrendDirection,
  RollingTrendWindow,
  RollingTrendWindowResult,
} from "./rolling-trends";

export const FITCORE_MEANINGFUL_CHANGE_POLICY = "fitcore_meaningful_change_v1";
export const MEANINGFUL_CHANGE_WINDOW_PRIORITY = Object.freeze([
  "days_7",
  "days_28",
  "days_90",
] as const);

export type MeaningfulChangeStatus = "unavailable" | "insufficient_data" | "ready";
export type MeaningfulChangeClassification =
  | "unavailable"
  | "no_meaningful_change"
  | "meaningful_increase"
  | "meaningful_decrease"
  | "mixed_direction";
export type MeaningfulChangeReasonCode =
  | "change_ready"
  | "no_ready_windows"
  | "insufficient_window_data"
  | "all_ready_windows_stable"
  | "single_directional_window"
  | "multiple_windows_agree"
  | "opposing_windows"
  | "short_term_change_only"
  | "longer_term_support"
  | "primary_window_days_7"
  | "primary_window_days_28"
  | "primary_window_days_90"
  | "trust_unavailable"
  | "trust_below_interpretation_threshold"
  | "freshness_unknown"
  | "freshness_stale"
  | "freshness_invalid"
  | "unsupported_metric"
  | "metric_unresolved";

export interface MeaningfulChangeReason {
  code: MeaningfulChangeReasonCode;
  message: string;
}

export interface MeaningfulChangeResult {
  policy: typeof FITCORE_MEANINGFUL_CHANGE_POLICY;
  status: MeaningfulChangeStatus;
  classification: MeaningfulChangeClassification;
  primaryWindow: RollingTrendWindow | null;
  supportingWindows: RollingTrendWindow[];
  conflictingWindows: RollingTrendWindow[];
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  relativeChange: number | null;
  slopePerDay: number | null;
  reasons: MeaningfulChangeReason[];
}

const reasonMessages: Record<MeaningfulChangeReasonCode, string> = {
  change_ready: "At least one Task 13 rolling window supports a neutral change classification.",
  no_ready_windows: "No Task 13 rolling window is ready.",
  insufficient_window_data: "Task 13 reports insufficient rolling-window evidence.",
  all_ready_windows_stable: "All ready rolling windows are stable.",
  single_directional_window: "Exactly one ready rolling window has directional movement.",
  multiple_windows_agree: "Multiple ready rolling windows agree on direction.",
  opposing_windows: "Ready rolling windows contain both increasing and decreasing movement.",
  short_term_change_only: "Directional movement appears only in the shortest ready window.",
  longer_term_support: "A longer ready window supports the directional movement.",
  primary_window_days_7: "The 7-day window is the primary window.",
  primary_window_days_28: "The 28-day window is the primary window.",
  primary_window_days_90: "The 90-day window is the primary window.",
  trust_unavailable: "Task 12 trust is unavailable.",
  trust_below_interpretation_threshold: "Task 12 trust is below the interpretation threshold.",
  freshness_unknown: "Task 12 freshness is unknown.",
  freshness_stale: "Task 12 freshness is stale.",
  freshness_invalid: "Task 12 freshness is invalid.",
  unsupported_metric: "The metric has no supported historical-series adapter.",
  metric_unresolved: "The metric could not be resolved to Task 13 evidence.",
};

export function getMeaningfulChangeReasons(
  codes: Iterable<MeaningfulChangeReasonCode>,
): MeaningfulChangeReason[] {
  return [...new Set(codes)]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({ code, message: reasonMessages[code] }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableFinite(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isDirection(value: unknown): value is Exclude<RollingTrendDirection, "unavailable"> {
  return value === "stable" || value === "increasing" || value === "decreasing";
}

function isWindow(value: unknown): value is RollingTrendWindow {
  return MEANINGFUL_CHANGE_WINDOW_PRIORITY.some((window) => window === value);
}

function eligibleWindow(value: unknown): value is RollingTrendWindowResult {
  if (!isRecord(value) || value.status !== "ready" || !isWindow(value.window)) return false;
  if (!isDirection(value.direction)) return false;
  return (
    typeof value.currentValue === "number" &&
    Number.isFinite(value.currentValue) &&
    typeof value.previousValue === "number" &&
    Number.isFinite(value.previousValue) &&
    typeof value.absoluteChange === "number" &&
    Number.isFinite(value.absoluteChange) &&
    typeof value.threshold === "number" &&
    Number.isFinite(value.threshold) &&
    nullableFinite(value.relativeChange) &&
    nullableFinite(value.slopePerDay)
  );
}

function unavailableResult(
  status: Exclude<MeaningfulChangeStatus, "ready">,
): MeaningfulChangeResult {
  const codes: MeaningfulChangeReasonCode[] = ["no_ready_windows"];
  if (status === "insufficient_data") codes.push("insufficient_window_data");
  return {
    policy: FITCORE_MEANINGFUL_CHANGE_POLICY,
    status,
    classification: "unavailable",
    primaryWindow: null,
    supportingWindows: [],
    conflictingWindows: [],
    currentValue: null,
    previousValue: null,
    absoluteChange: null,
    relativeChange: null,
    slopePerDay: null,
    reasons: getMeaningfulChangeReasons(codes),
  };
}

function valuesFrom(primary: RollingTrendWindowResult | null) {
  return {
    currentValue: primary?.currentValue ?? null,
    previousValue: primary?.previousValue ?? null,
    absoluteChange: primary?.absoluteChange ?? null,
    relativeChange: primary?.relativeChange ?? null,
    slopePerDay: primary?.slopePerDay ?? null,
  };
}

/** Interprets Task 13 window results without recalculating medians, thresholds, or directions. */
export function evaluateMeaningfulChange(windows: readonly unknown[]): MeaningfulChangeResult {
  const priority = new Map(
    MEANINGFUL_CHANGE_WINDOW_PRIORITY.map((window, index) => [window, index]),
  );
  const eligible = windows
    .filter(eligibleWindow)
    .sort((a, b) => priority.get(a.window)! - priority.get(b.window)!);
  const unique = [...new Map(eligible.map((window) => [window.window, window] as const)).values()];
  if (!unique.length) {
    const insufficient = windows.some(
      (window) => isRecord(window) && window.status === "insufficient_data",
    );
    return unavailableResult(insufficient ? "insufficient_data" : "unavailable");
  }

  const increasing = unique.filter((window) => window.direction === "increasing");
  const decreasing = unique.filter((window) => window.direction === "decreasing");
  const stable = unique.filter((window) => window.direction === "stable");
  if (increasing.length && decreasing.length) {
    return {
      policy: FITCORE_MEANINGFUL_CHANGE_POLICY,
      status: "ready",
      classification: "mixed_direction",
      primaryWindow: null,
      supportingWindows: [],
      conflictingWindows: [...increasing, ...decreasing]
        .sort((a, b) => priority.get(a.window)! - priority.get(b.window)!)
        .map((window) => window.window),
      ...valuesFrom(null),
      reasons: getMeaningfulChangeReasons(["change_ready", "opposing_windows"]),
    };
  }

  if (!increasing.length && !decreasing.length) {
    const primary = stable[0];
    return {
      policy: FITCORE_MEANINGFUL_CHANGE_POLICY,
      status: "ready",
      classification: "no_meaningful_change",
      primaryWindow: primary.window,
      supportingWindows: stable.slice(1).map((window) => window.window),
      conflictingWindows: [],
      ...valuesFrom(primary),
      reasons: getMeaningfulChangeReasons([
        "all_ready_windows_stable",
        "change_ready",
        `primary_window_${primary.window}` as MeaningfulChangeReasonCode,
      ]),
    };
  }

  const directional = increasing.length ? increasing : decreasing;
  const primary = directional[0];
  const supporting = (directional.length > 1 ? directional.slice(1) : stable).map(
    (window) => window.window,
  );
  const codes: MeaningfulChangeReasonCode[] = [
    "change_ready",
    `primary_window_${primary.window}` as MeaningfulChangeReasonCode,
    directional.length > 1 ? "multiple_windows_agree" : "single_directional_window",
  ];
  if (directional.some((window) => window.window !== "days_7")) codes.push("longer_term_support");
  if (
    primary.window === "days_7" &&
    directional.length === 1 &&
    unique.every((window) => window.window === "days_7" || window.direction === "stable")
  )
    codes.push("short_term_change_only");
  return {
    policy: FITCORE_MEANINGFUL_CHANGE_POLICY,
    status: "ready",
    classification: increasing.length ? "meaningful_increase" : "meaningful_decrease",
    primaryWindow: primary.window,
    supportingWindows: supporting,
    conflictingWindows: [],
    ...valuesFrom(primary),
    reasons: getMeaningfulChangeReasons(codes),
  };
}
