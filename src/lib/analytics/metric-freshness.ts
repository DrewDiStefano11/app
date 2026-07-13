import type { AnalyticsSourceCollection } from "./domain-metrics";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type MetricFreshnessState = "unknown" | "fresh" | "aging" | "stale" | "invalid";
export type MetricFreshnessReasonCode =
  | "recent_source"
  | "aging_source"
  | "stale_source"
  | "approved_stale_reason"
  | "missing_source_timestamp"
  | "future_source_timestamp"
  | "dependency_freshness_inherited"
  | "unknown_policy";

export interface MetricFreshnessReason {
  code: MetricFreshnessReasonCode;
  message: string;
}

export interface MetricFreshnessPolicy {
  collection: AnalyticsSourceCollection | "unknown";
  freshThroughMs: number | null;
  agingThroughMs: number | null;
}

export interface MetricFreshnessAssessment {
  state: MetricFreshnessState;
  score: number | null;
  evaluatedAt: number;
  sourceTimestamp: number | null;
  ageMs: number | null;
  policy: MetricFreshnessPolicy;
  reasons: MetricFreshnessReason[];
}

export interface MetricFreshnessInput {
  collection: AnalyticsSourceCollection | "unknown";
  now: number;
  lastLoggedAt?: number | null;
  latestIncludedAt?: number | null;
  staleReasonCodes?: readonly string[];
  dependencyFreshness?: readonly MetricFreshnessAssessment[];
}

export const METRIC_FRESHNESS_POLICIES: Readonly<
  Record<AnalyticsSourceCollection | "unknown", MetricFreshnessPolicy>
> = Object.freeze({
  recovery_check_ins: {
    collection: "recovery_check_ins",
    freshThroughMs: 36 * HOUR_MS,
    agingThroughMs: 72 * HOUR_MS,
  },
  meal_entries: {
    collection: "meal_entries",
    freshThroughMs: 36 * HOUR_MS,
    agingThroughMs: 72 * HOUR_MS,
  },
  workouts: { collection: "workouts", freshThroughMs: 7 * DAY_MS, agingThroughMs: 14 * DAY_MS },
  bodyweight_entries: {
    collection: "bodyweight_entries",
    freshThroughMs: 7 * DAY_MS,
    agingThroughMs: 21 * DAY_MS,
  },
  goals: { collection: "goals", freshThroughMs: 7 * DAY_MS, agingThroughMs: 30 * DAY_MS },
  profile: { collection: "profile", freshThroughMs: 30 * DAY_MS, agingThroughMs: 90 * DAY_MS },
  derived_metrics: { collection: "derived_metrics", freshThroughMs: null, agingThroughMs: null },
  unknown: { collection: "unknown", freshThroughMs: null, agingThroughMs: null },
});

const staleCodes = new Set([
  "stale_data",
  "stale_bodyweight",
  "stale_goal_measurement",
  "stale_recovery_data",
  "stale_exercise_history",
]);

const messages: Record<MetricFreshnessReasonCode, string> = {
  recent_source: "The latest source observation is within the fresh policy window.",
  aging_source: "The latest source observation is within the aging policy window.",
  stale_source: "The latest source observation is older than the aging policy window.",
  approved_stale_reason: "Existing analytics evidence explicitly marks the source as stale.",
  missing_source_timestamp: "No valid source observation timestamp is available.",
  future_source_timestamp: "The source observation timestamp is after the evaluation time.",
  dependency_freshness_inherited:
    "Freshness is inherited conservatively from required dependencies.",
  unknown_policy: "No freshness cadence is defined for this source collection.",
};

function reason(code: MetricFreshnessReasonCode): MetricFreshnessReason {
  return { code, message: messages[code] };
}

function finiteTimestamp(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function inherited(input: MetricFreshnessInput): MetricFreshnessAssessment | null {
  const dependencies = input.dependencyFreshness ?? [];
  if (input.collection !== "derived_metrics" || dependencies.length === 0) return null;
  const rank: Record<MetricFreshnessState, number> = {
    invalid: 0,
    unknown: 1,
    stale: 2,
    aging: 3,
    fresh: 4,
  };
  const limiting = [...dependencies].sort(
    (a, b) => rank[a.state] - rank[b.state] || (a.sourceTimestamp ?? 0) - (b.sourceTimestamp ?? 0),
  )[0];
  return {
    state: limiting.state,
    score: limiting.score,
    evaluatedAt: input.now,
    sourceTimestamp: limiting.sourceTimestamp,
    ageMs: limiting.ageMs,
    policy: METRIC_FRESHNESS_POLICIES.derived_metrics,
    reasons: [reason("dependency_freshness_inherited"), ...limiting.reasons].sort((a, b) =>
      a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
    ),
  };
}

export function evaluateMetricFreshness(input: MetricFreshnessInput): MetricFreshnessAssessment {
  const policy = METRIC_FRESHNESS_POLICIES[input.collection] ?? METRIC_FRESHNESS_POLICIES.unknown;
  const sourceTimestamp = finiteTimestamp(input.lastLoggedAt)
    ? input.lastLoggedAt
    : finiteTimestamp(input.latestIncludedAt)
      ? input.latestIncludedAt
      : null;
  const base = { evaluatedAt: input.now, sourceTimestamp, policy };
  if (!Number.isFinite(input.now) || (sourceTimestamp !== null && sourceTimestamp > input.now)) {
    return {
      ...base,
      state: "invalid",
      score: 0,
      ageMs: null,
      reasons: [reason("future_source_timestamp")],
    };
  }
  if ((input.staleReasonCodes ?? []).some((code) => staleCodes.has(code))) {
    return {
      ...base,
      state: "stale",
      score: 0.25,
      ageMs: sourceTimestamp === null ? null : input.now - sourceTimestamp,
      reasons: [reason("approved_stale_reason")],
    };
  }
  const dependencyResult = inherited(input);
  if (dependencyResult) return dependencyResult;
  if (sourceTimestamp === null) {
    const codes: MetricFreshnessReasonCode[] =
      policy.freshThroughMs === null
        ? ["missing_source_timestamp", "unknown_policy"]
        : ["missing_source_timestamp"];
    return { ...base, state: "unknown", score: null, ageMs: null, reasons: codes.map(reason) };
  }
  if (policy.freshThroughMs === null || policy.agingThroughMs === null) {
    return {
      ...base,
      state: "unknown",
      score: null,
      ageMs: input.now - sourceTimestamp,
      reasons: [reason("unknown_policy")],
    };
  }
  const ageMs = input.now - sourceTimestamp;
  if (ageMs <= policy.freshThroughMs)
    return { ...base, state: "fresh", score: 1, ageMs, reasons: [reason("recent_source")] };
  if (ageMs <= policy.agingThroughMs)
    return { ...base, state: "aging", score: 0.65, ageMs, reasons: [reason("aging_source")] };
  return { ...base, state: "stale", score: 0.25, ageMs, reasons: [reason("stale_source")] };
}
