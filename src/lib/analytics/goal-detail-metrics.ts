import type { AppState, BodyweightEntry, Goal } from "../types";
import {
  createAnalyticsMetric,
  type AnalyticsConfidence,
  type AnalyticsMetric,
  type AnalyticsMetricSource,
  type AnalyticsStatus,
  type DomainAvailability,
  type MetricReason,
  type MetricReasonCode,
} from "./domain-metrics";
import {
  addCalendarDays,
  allTimeWindow,
  calendarDayDifference,
  dayKey,
  type DateRange,
} from "./date-time";
import { clampPercent, safePercentChange, safeRatio } from "./safe-math";

export const GOAL_HISTORY_MINIMUM_OBSERVATIONS = 2;
export const GOAL_HIGH_CONFIDENCE_MINIMUM_OBSERVATIONS = 5;
export const GOAL_HIGH_CONFIDENCE_MINIMUM_SPAN_DAYS = 28;
export const GOAL_STALE_MEASUREMENT_DAYS = 30;
export const GOAL_PACE_TOLERANCE_PERCENT = 10;

export const GOAL_DETAIL_METRIC_IDS = Object.freeze({
  source: "progress.goals.detail.source",
  progress: (goalId: string) => `progress.goal.${goalId}.progress`,
  currentPace: (goalId: string) => `progress.goal.${goalId}.current_weekly_pace`,
  neededPace: (goalId: string) => `progress.goal.${goalId}.needed_weekly_pace`,
  projection: (goalId: string) => `progress.goal.${goalId}.projected_completion`,
} as const);

export interface GoalDetailOptions {
  now?: number;
}

export type GoalDirection = "increase" | "decrease" | "none" | "unknown";
export type GoalAnalyticalStatus = "ahead" | "on_track" | "behind" | "completed" | "unavailable";

export interface GoalMeasurementPoint {
  id: string;
  timestamp: number;
  value: number;
  unit: "lb";
}

export interface GoalProgressValue {
  baseline: number;
  current: number;
  target: number;
  direction: GoalDirection;
  rawProgressPercent: number;
  displayProgressPercent: number;
  reachedTarget: boolean;
  unit: "lb";
}

export interface GoalPaceValue {
  totalObservedChange: number;
  elapsedDays: number;
  elapsedWeeks: number;
  weeklyPace: number;
  movement: "toward_target" | "away_from_target" | "stationary";
  unit: "lb/week";
  observations: GoalMeasurementPoint[];
}

export interface GoalNeededPaceValue {
  weeklyPace: number;
  remainingChange: number;
  remainingDays: number;
  unit: "lb/week";
}

export interface GoalProjectionValue {
  state: "projected" | "already_reached";
  projectedCompletionAt: number;
  remainingChange: number;
  weeklyPace: number;
  algorithm: "linear_weekly_pace_projection_v1";
}

export interface GoalDeadlineRisk {
  status: GoalAnalyticalStatus;
  confidence: AnalyticsConfidence;
  deadline: number | null;
  currentWeeklyPace: number | null;
  neededWeeklyPace: number | null;
  tolerancePercent: number;
  reasons: MetricReason[];
}

export interface GoalCompleteness {
  hasGoalRecord: boolean;
  hasBaseline: boolean;
  hasCurrentValue: boolean;
  hasTarget: boolean;
  hasUnit: boolean;
  hasDirection: boolean;
  hasStartDate: boolean;
  hasDeadline: false;
  hasMeasurementHistory: boolean;
  hasSufficientPaceEvidence: boolean;
  projectionReady: boolean;
  deadlineRiskReady: false;
  hasCertainSourceLinkage: boolean;
  hasInvalidOrExcludedRecords: boolean;
}

export interface GoalAnalyticsItem {
  id: string;
  type: Goal["type"];
  label: string;
  progress: AnalyticsMetric<GoalProgressValue>;
  currentWeeklyPace: AnalyticsMetric<GoalPaceValue>;
  neededWeeklyPace: AnalyticsMetric<GoalNeededPaceValue>;
  projection: AnalyticsMetric<GoalProjectionValue>;
  analyticalStatus: GoalAnalyticalStatus;
  deadlineRisk: GoalDeadlineRisk;
  completeness: GoalCompleteness;
  sourceMeasurementIds: string[];
  reasons: MetricReason[];
}

export interface GoalDetailAnalytics {
  goals: GoalAnalyticsItem[];
  availability: DomainAvailability;
  sourceMetadata: AnalyticsMetricSource;
  supportedHistoryTypes: readonly ["bodyweight"];
  unsupportedHistoryTypes: Goal["type"][];
}

interface GoalCollection {
  goals: Goal[];
  duplicateCount: number;
  invalidCount: number;
}

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && dayKey(value) !== "";
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Number.isFinite(value) ? Math.round(value * factor) / factor : 0;
}

function sortedReasons(reasons: readonly MetricReason[]): MetricReason[] {
  const map = new Map<MetricReasonCode, MetricReason>();
  for (const reason of reasons) {
    const previous = map.get(reason.code);
    map.set(reason.code, {
      code: reason.code,
      message: previous?.message ?? reason.message,
      ...((previous?.count ?? 0) + (reason.count ?? 0) > 0
        ? { count: (previous?.count ?? 0) + (reason.count ?? 0) }
        : {}),
    });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function goalFingerprint(goal: Goal): string {
  return JSON.stringify({
    id: goal.id,
    type: goal.type,
    target: Number.isFinite(goal.target) ? goal.target : null,
    current: Number.isFinite(goal.current) ? goal.current : null,
    section: goal.section ?? null,
    pinned: goal.pinned ?? null,
  });
}

function collectGoals(state: AppState): GoalCollection {
  const candidates = state.goals
    .map((goal) => ({
      goal,
      valid: typeof goal.id === "string" && goal.id.trim() !== "" && typeof goal.type === "string",
      fingerprint: goalFingerprint(goal),
    }))
    .sort(
      (a, b) =>
        Number(b.valid) - Number(a.valid) ||
        String(a.goal.id).localeCompare(String(b.goal.id)) ||
        a.fingerprint.localeCompare(b.fingerprint),
    );
  const byId = new Map<string, Goal>();
  let duplicateCount = 0;
  let invalidCount = 0;
  for (const candidate of candidates) {
    if (!candidate.valid) {
      invalidCount += 1;
      continue;
    }
    if (byId.has(candidate.goal.id)) duplicateCount += 1;
    else byId.set(candidate.goal.id, candidate.goal);
  }
  return {
    goals: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    duplicateCount,
    invalidCount,
  };
}

function bodyweightHistory(
  state: AppState,
  now: number,
): {
  points: GoalMeasurementPoint[];
  excludedCount: number;
} {
  const candidates = state.bodyweightEntries
    .filter(
      (entry) =>
        typeof entry.id === "string" &&
        entry.id.trim() !== "" &&
        finiteTimestamp(entry.createdAt) &&
        entry.createdAt <= now &&
        finiteNumber(entry.weightLb) &&
        entry.weightLb > 0,
    )
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id) ||
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  const byId = new Map<string, BodyweightEntry>();
  for (const entry of candidates) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  const byTimestamp = new Map<number, BodyweightEntry>();
  for (const entry of byId.values())
    if (!byTimestamp.has(entry.createdAt)) byTimestamp.set(entry.createdAt, entry);
  const points = [...byTimestamp.values()]
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt,
      value: entry.weightLb,
      unit: "lb" as const,
    }));
  return {
    points,
    excludedCount: Math.max(0, state.bodyweightEntries.length - points.length),
  };
}

function goalHistory(
  state: AppState,
  goal: Goal,
  now: number,
): { points: GoalMeasurementPoint[]; unit: "lb" | null; excludedCount: number; certain: boolean } {
  if (goal.type !== "bodyweight") {
    return { points: [], unit: null, excludedCount: 0, certain: false };
  }
  const history = bodyweightHistory(state, now);
  return {
    ...history,
    unit: "lb",
    // The metric type is linkable, but the goal has no start date or explicit
    // measurement IDs, so the earliest observation is not a guaranteed goal baseline.
    certain: false,
  };
}

function goalDirection(baseline: number, target: number): GoalDirection {
  if (target > baseline) return "increase";
  if (target < baseline) return "decrease";
  return "none";
}

function reachedTarget(current: number, target: number, direction: GoalDirection): boolean {
  if (direction === "increase") return current >= target;
  if (direction === "decrease") return current <= target;
  return current === target;
}

function confidenceHint(
  points: readonly GoalMeasurementPoint[],
  now: number,
  excludedCount: number,
): AnalyticsConfidence {
  if (!points.length) return "none";
  const span =
    points.length >= 2 ? calendarDayDifference(points.at(-1)!.timestamp, points[0].timestamp) : 0;
  const stale = calendarDayDifference(now, points.at(-1)!.timestamp) > GOAL_STALE_MEASUREMENT_DAYS;
  if (points.length < 3 || stale || excludedCount > 0) return "low";
  if (
    points.length >= GOAL_HIGH_CONFIDENCE_MINIMUM_OBSERVATIONS &&
    span >= GOAL_HIGH_CONFIDENCE_MINIMUM_SPAN_DAYS
  ) {
    return "high";
  }
  return "medium";
}

function progressMetric(
  goal: Goal,
  history: ReturnType<typeof goalHistory>,
  now: number,
): AnalyticsMetric<GoalProgressValue> {
  const baseline = history.points[0]?.value ?? null;
  const current = finiteNumber(goal.current) ? goal.current : null;
  const target = finiteNumber(goal.target) ? goal.target : null;
  const reasons: MetricReason[] = [];
  if (baseline === null)
    reasons.push({
      code: "missing_baseline",
      message: "No real linked baseline measurement exists.",
    });
  if (current === null)
    reasons.push({
      code: "missing_current_value",
      message: "Goal current value is missing or invalid.",
    });
  if (target === null)
    reasons.push({ code: "missing_target", message: "Goal target is missing or invalid." });
  if (!history.unit)
    reasons.push({
      code: "incompatible_units",
      message: "The goal type has no unambiguous persisted measurement unit linkage.",
    });
  if (!history.certain)
    reasons.push({
      code: "uncertain_goal_linkage",
      message:
        history.unit === "lb"
          ? "Bodyweight history is type-compatible, but the goal has no start date or linked measurement IDs; the earliest observation is only an observed baseline."
          : "No canonical dated history linkage exists for this goal type.",
    });
  let value: GoalProgressValue | null = null;
  if (baseline !== null && current !== null && target !== null && history.unit) {
    const direction = goalDirection(baseline, target);
    if (direction === "none") {
      value = {
        baseline,
        current,
        target,
        direction,
        rawProgressPercent: current === target ? 100 : 0,
        displayProgressPercent: current === target ? 100 : 0,
        reachedTarget: current === target,
        unit: history.unit,
      };
    } else {
      const raw = safeRatio(current - baseline, target - baseline) * 100;
      value = {
        baseline,
        current,
        target,
        direction,
        rawProgressPercent: rounded(raw),
        displayProgressPercent: rounded(clampPercent(raw)),
        reachedTarget: reachedTarget(current, target, direction),
        unit: history.unit,
      };
    }
  }
  const timestamps = history.points.map((point) => point.timestamp);
  const stale = timestamps.length
    ? calendarDayDifference(now, timestamps.at(-1)!) > GOAL_STALE_MEASUREMENT_DAYS
    : false;
  if (stale)
    reasons.push({
      code: "stale_goal_measurement",
      message: "The latest linked goal measurement is stale.",
    });
  return createAnalyticsMetric<GoalProgressValue>({
    id: GOAL_DETAIL_METRIC_IDS.progress(goal.id),
    label: `Goal progress: ${goal.label}`,
    domain: "progress",
    kind: "comparison",
    unit: "percent",
    value,
    status: value ? "ready" : "unavailable",
    dateRange: timestamps.length ? { start: timestamps[0], end: timestamps.at(-1)! + 1 } : null,
    sampleSize: history.points.length,
    minimumSampleSize: 1,
    confidence: confidenceHint(
      history.points,
      now,
      history.excludedCount + (history.certain ? 0 : 1),
    ),
    reasons,
    entryIds: uniqueSorted([goal.id, ...history.points.map((point) => point.id)]),
    entryTimestamps: timestamps,
    collection: "derived_metrics",
    excludedRecordCount: history.excludedCount,
    expectedDayCount: null,
    stale,
    calculationId: "progress.goal.direction_aware_observed_baseline.v1",
  });
}

function paceMetric(
  goal: Goal,
  history: ReturnType<typeof goalHistory>,
  now: number,
): AnalyticsMetric<GoalPaceValue> {
  const points = history.points;
  const first = points[0] ?? null;
  const latest = points.at(-1) ?? null;
  const target = finiteNumber(goal.target) ? goal.target : null;
  const reasons: MetricReason[] = [];
  let value: GoalPaceValue | null = null;
  if (!history.unit)
    reasons.push({
      code: "incompatible_units",
      message: "No compatible linked history unit exists.",
    });
  if (target === null)
    reasons.push({ code: "missing_target", message: "Goal target is missing or invalid." });
  if (points.length < GOAL_HISTORY_MINIMUM_OBSERVATIONS) {
    reasons.push({
      code: "insufficient_goal_history",
      message: `Weekly pace requires ${GOAL_HISTORY_MINIMUM_OBSERVATIONS} dated observations.`,
    });
  } else if (first && latest && history.unit && target !== null) {
    const elapsedDays = calendarDayDifference(latest.timestamp, first.timestamp);
    if (elapsedDays <= 0) {
      reasons.push({
        code: "zero_elapsed_time",
        message: "Goal observations have no positive elapsed time.",
      });
    } else {
      const elapsedWeeks = safeRatio(elapsedDays, 7);
      const weeklyPace = safeRatio(latest.value - first.value, elapsedWeeks);
      const direction = goalDirection(first.value, target);
      const toward =
        direction === "increase"
          ? weeklyPace > 0
          : direction === "decrease"
            ? weeklyPace < 0
            : weeklyPace === 0;
      const movement =
        weeklyPace === 0 ? "stationary" : toward ? "toward_target" : "away_from_target";
      if (movement === "away_from_target") {
        reasons.push({
          code: "pace_away_from_target",
          message: "Observed weekly pace is moving away from the target.",
        });
      }
      if (weeklyPace === 0)
        reasons.push({ code: "zero_velocity", message: "Observed weekly pace is zero." });
      value = {
        totalObservedChange: rounded(latest.value - first.value),
        elapsedDays,
        elapsedWeeks: rounded(elapsedWeeks),
        weeklyPace: rounded(weeklyPace),
        movement,
        unit: "lb/week",
        observations: points,
      };
    }
  }
  const stale = latest
    ? calendarDayDifference(now, latest.timestamp) > GOAL_STALE_MEASUREMENT_DAYS
    : false;
  if (stale)
    reasons.push({
      code: "stale_goal_measurement",
      message: "The latest pace observation is stale.",
    });
  return createAnalyticsMetric({
    id: GOAL_DETAIL_METRIC_IDS.currentPace(goal.id),
    label: `Current weekly pace: ${goal.label}`,
    domain: "progress",
    kind: "time_series",
    unit: "lb/week",
    value,
    status: value ? "ready" : points.length ? "needs_more_data" : "unavailable",
    dateRange: first && latest ? { start: first.timestamp, end: latest.timestamp + 1 } : null,
    sampleSize: points.length,
    minimumSampleSize: GOAL_HISTORY_MINIMUM_OBSERVATIONS,
    confidence: confidenceHint(points, now, history.excludedCount + (history.certain ? 0 : 1)),
    reasons,
    entryIds: uniqueSorted([goal.id, ...points.map((point) => point.id)]),
    entryTimestamps: points.map((point) => point.timestamp),
    collection: "bodyweight_entries",
    excludedRecordCount: history.excludedCount,
    expectedDayCount: null,
    stale,
    calculationId: "progress.goal.observed_change_per_seven_days.v1",
  });
}

function neededPaceMetric(
  goal: Goal,
  progress: AnalyticsMetric<GoalProgressValue>,
): AnalyticsMetric<GoalNeededPaceValue> {
  const completed = progress.value?.reachedTarget ?? false;
  return createAnalyticsMetric<GoalNeededPaceValue>({
    id: GOAL_DETAIL_METRIC_IDS.neededPace(goal.id),
    label: `Needed weekly pace: ${goal.label}`,
    domain: "progress",
    kind: "comparison",
    unit: "lb/week",
    value: completed
      ? { weeklyPace: 0, remainingChange: 0, remainingDays: 0, unit: "lb/week" }
      : null,
    status: completed ? "ready" : "unavailable",
    sampleSize: completed ? progress.sampleSize : 0,
    minimumSampleSize: 1,
    reasons: completed
      ? []
      : [{ code: "missing_deadline", message: "Goal records do not persist a deadline." }],
    entryIds: [goal.id],
    collection: "goals",
    expectedDayCount: null,
    calculationId: "progress.goal.needed_weekly_pace.requires_deadline.v1",
  });
}

function projectionMetric(
  goal: Goal,
  progress: AnalyticsMetric<GoalProgressValue>,
  pace: AnalyticsMetric<GoalPaceValue>,
  now: number,
): AnalyticsMetric<GoalProjectionValue> {
  const reasons: MetricReason[] = [];
  let value: GoalProjectionValue | null = null;
  const progressValue = progress.value;
  const paceValue = pace.value;
  if (progressValue?.reachedTarget) {
    value = {
      state: "already_reached",
      projectedCompletionAt: pace.source.latestIncludedAt ?? now,
      remainingChange: 0,
      weeklyPace: paceValue?.weeklyPace ?? 0,
      algorithm: "linear_weekly_pace_projection_v1",
    };
  } else if (!paceValue) {
    reasons.push({
      code: "projection_unavailable",
      message: "Projection requires valid dated weekly pace evidence.",
    });
  } else if (paceValue.weeklyPace === 0) {
    reasons.push({
      code: "zero_velocity",
      message: "Zero weekly pace cannot produce a projection.",
    });
  } else if (paceValue.movement !== "toward_target") {
    reasons.push({
      code: "pace_away_from_target",
      message: "Pace moving away from target cannot produce a completion projection.",
    });
  } else if (progressValue) {
    const remaining = progressValue.target - progressValue.current;
    const weeks = safeRatio(remaining, paceValue.weeklyPace);
    if (weeks > 0 && Number.isFinite(weeks)) {
      value = {
        state: "projected",
        projectedCompletionAt: addCalendarDays(now, Math.ceil(weeks * 7)),
        remainingChange: rounded(remaining),
        weeklyPace: paceValue.weeklyPace,
        algorithm: "linear_weekly_pace_projection_v1",
      };
    } else {
      reasons.push({
        code: "projection_unavailable",
        message: "Remaining change and pace do not yield a positive finite projection interval.",
      });
    }
  }
  return createAnalyticsMetric({
    id: GOAL_DETAIL_METRIC_IDS.projection(goal.id),
    label: `Projected completion: ${goal.label}`,
    domain: "progress",
    kind: "point_in_time",
    unit: "date",
    value,
    status: value ? "ready" : "unavailable",
    dateRange: pace.dateRange,
    sampleSize: pace.sampleSize,
    minimumSampleSize: GOAL_HISTORY_MINIMUM_OBSERVATIONS,
    confidence: pace.confidence,
    reasons,
    entryIds: uniqueSorted([goal.id, ...pace.source.entryIds]),
    entryTimestamps: [pace.source.earliestIncludedAt, pace.source.latestIncludedAt].filter(
      (timestamp): timestamp is number => timestamp !== null,
    ),
    collection: "derived_metrics",
    expectedDayCount: null,
    calculationId: "progress.goal.linear_weekly_pace_projection.v1",
    notes: ["Projection is a deterministic extrapolation, not a guarantee."],
  });
}

function goalItem(
  state: AppState,
  goal: Goal,
  now: number,
  duplicateOrInvalid: boolean,
): GoalAnalyticsItem {
  const history = goalHistory(state, goal, now);
  const progress = progressMetric(goal, history, now);
  const pace = paceMetric(goal, history, now);
  const needed = neededPaceMetric(goal, progress);
  const projection = projectionMetric(goal, progress, pace, now);
  const completed = progress.value?.reachedTarget ?? false;
  const reasons = sortedReasons([
    ...progress.reasons,
    ...pace.reasons,
    {
      code: "missing_deadline",
      message: "Goal records do not persist a deadline; deadline risk is unavailable.",
    },
  ]);
  return {
    id: goal.id,
    type: goal.type,
    label: goal.label,
    progress,
    currentWeeklyPace: pace,
    neededWeeklyPace: needed,
    projection,
    analyticalStatus: completed ? "completed" : "unavailable",
    deadlineRisk: {
      status: completed ? "completed" : "unavailable",
      confidence: completed ? progress.confidence : "none",
      deadline: null,
      currentWeeklyPace: pace.value?.weeklyPace ?? null,
      neededWeeklyPace: null,
      tolerancePercent: GOAL_PACE_TOLERANCE_PERCENT,
      reasons: completed
        ? []
        : [
            {
              code: "missing_deadline",
              message: "Ahead/on-track/behind status requires a persisted deadline.",
            },
          ],
    },
    completeness: {
      hasGoalRecord: true,
      hasBaseline: history.points.length > 0,
      hasCurrentValue: finiteNumber(goal.current),
      hasTarget: finiteNumber(goal.target),
      hasUnit: history.unit !== null,
      hasDirection: progress.value?.direction !== undefined,
      hasStartDate: history.points.length > 0,
      hasDeadline: false,
      hasMeasurementHistory: history.points.length > 0,
      hasSufficientPaceEvidence: pace.value !== null,
      projectionReady: projection.value !== null,
      deadlineRiskReady: false,
      hasCertainSourceLinkage: history.certain,
      hasInvalidOrExcludedRecords: duplicateOrInvalid || history.excludedCount > 0,
    },
    sourceMeasurementIds: uniqueSorted(history.points.map((point) => point.id)),
    reasons,
  };
}

export function getGoalDetailAnalytics(
  state: AppState,
  options: GoalDetailOptions = {},
): GoalDetailAnalytics {
  const now = finiteTimestamp(options.now) ? options.now : Date.now();
  const collection = collectGoals(state);
  const hadExclusions = collection.duplicateCount + collection.invalidCount > 0;
  const goals = collection.goals.map((goal) => goalItem(state, goal, now, hadExclusions));
  const reasons: MetricReason[] = [];
  if (!collection.goals.length)
    reasons.push({ code: "no_goals", message: "No valid goal records exist." });
  if (collection.invalidCount > 0) {
    reasons.push({
      code: "invalid_goal",
      message: "Goals without stable identity or type were excluded.",
      count: collection.invalidCount,
    });
  }
  if (collection.duplicateCount > 0) {
    reasons.push({
      code: "duplicate_goal_id",
      message: "Duplicate goal IDs were deterministically suppressed.",
      count: collection.duplicateCount,
    });
  }
  const sourceMetric = createAnalyticsMetric({
    id: GOAL_DETAIL_METRIC_IDS.source,
    label: "Goal detail source",
    domain: "progress",
    kind: "aggregate",
    unit: "count",
    value: goals.length,
    status: goals.length ? "ready" : "unavailable",
    dateRange: allTimeWindow(now),
    sampleSize: goals.length,
    minimumSampleSize: 1,
    reasons,
    entryIds: uniqueSorted(goals.map((goal) => goal.id)),
    includedRecordCount: goals.length,
    collection: "goals",
    excludedRecordCount: collection.duplicateCount + collection.invalidCount,
    exclusions: [
      { code: "invalid_value", count: collection.duplicateCount + collection.invalidCount },
    ],
    expectedDayCount: null,
    calculationId: "progress.goals.valid_records.v1",
    notes: [
      "Goal schema has current and target but no baseline, unit, direction, start date, deadline, completion flag, or measurement history.",
      "Only bodyweight goals have a canonical linked dated history through bodyweightEntries.weightLb.",
    ],
  });
  const supported = new Set<Goal["type"]>(["bodyweight"]);
  const allTypes: Goal["type"][] = [
    "lift",
    "weekly_workouts",
    "bodyweight",
    "cardio",
    "habit",
    "volume",
    "sleep",
    "readiness",
    "macro",
    "consistency",
    "photo",
  ];
  return {
    goals,
    availability: {
      status: goals.length ? "ready" : "unavailable",
      sampleSize: goals.length,
      reason: sortedReasons(reasons)[0]?.message ?? null,
      lastLoggedAt: null,
    },
    sourceMetadata: sourceMetric.source,
    supportedHistoryTypes: ["bodyweight"],
    unsupportedHistoryTypes: allTypes.filter((type) => !supported.has(type)),
  };
}
