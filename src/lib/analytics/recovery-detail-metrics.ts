import type { AppState, RecoveryCheckIn, RecoverySignal } from "../types";
import {
  calculateTrendQuality,
  createAnalyticsMetric,
  type AnalyticsMetric,
  type AnalyticsMetricSource,
  type AnalyticsStatus,
  type DomainAvailability,
  type MetricReason,
  type MetricReasonCode,
  type TrendDirection,
} from "./domain-metrics";
import {
  calendarDayDifference,
  calendarDaysWindow,
  dateRangeContains,
  dayKey,
  type DateRange,
} from "./date-time";
import { clampPercent, clampScore, safeAverage, safePercentChange, safeRatio } from "./safe-math";

export const RECOVERY_FIELD_MINIMUM = 1;
export const RECOVERY_FIELD_MAXIMUM = 10;
export const RECOVERY_HIGH_SORENESS_THRESHOLD = 7;
export const RECOVERY_LOW_READINESS_THRESHOLD = 50;
export const RECOVERY_TREND_MINIMUM_SAMPLES = 2;
export const RECOVERY_TREND_STABLE_THRESHOLD = 0.25;
export const RECOVERY_CONSISTENCY_MINIMUM_LOGGED_DAYS = 3;

export type RecoveryDetailField = "soreness" | "energy" | "motivation" | "stress" | "readiness";

export const RECOVERY_DETAIL_METRIC_IDS = Object.freeze({
  source: "recovery.detail.source",
  trend: (field: RecoveryDetailField) => `recovery.detail.${field}.trend`,
  highSorenessCount: "recovery.detail.high_soreness.count",
  daysSinceHighSoreness: "recovery.detail.high_soreness.days_since",
  lowReadinessCount: "recovery.detail.low_readiness.count",
  daysSinceLowReadiness: "recovery.detail.low_readiness.days_since",
  consistency: "recovery.detail.checkin_consistency",
} as const);

export interface RecoveryDetailOptions {
  now?: number;
  days?: number;
}

export interface RecoveryTrendPoint {
  checkInId: string;
  timestamp: number;
  value: number;
}

export interface RecoveryTrendValue {
  field: RecoveryDetailField;
  latestValue: number | null;
  previousValue: number | null;
  magnitude: number | null;
  percentChange: number | null;
  direction: TrendDirection;
  hasEnoughData: boolean;
  points: RecoveryTrendPoint[];
}

export interface RecoveryConditionAnalytics {
  count: AnalyticsMetric<number>;
  daysSinceLatest: AnalyticsMetric<number>;
  threshold: number;
  comparison: "at_or_above" | "at_or_below";
}

export interface RecoveryConsistencyValue {
  totalValidCheckIns: number;
  distinctLoggedDays: number;
  requestedDays: number;
  unloggedDays: number;
  checkInsPerLoggedDay: number | null;
  checkInsPerRequestedDay: number;
  coveragePercent: number;
  consistencyScore: number;
  formula: "distinct_logged_day_coverage_v1";
  loggedDayKeys: string[];
}

export interface BodyAreaFrequencyItem {
  bodyArea: string;
  observationCount: number;
  sourceSignalIds: string[];
}

export interface RecoverySignalAnalytics {
  painFlagCount: AnalyticsMetric<number>;
  sorenessFlagCount: AnalyticsMetric<number>;
  fatigueFlagCount: AnalyticsMetric<number>;
  bodyAreaSoreness: {
    status: AnalyticsStatus;
    frequencies: BodyAreaFrequencyItem[];
    sourceSignalIds: string[];
    reasons: MetricReason[];
  };
}

export interface WearableMetricAvailability {
  id:
    | "hrv"
    | "resting_heart_rate"
    | "sleep_stages"
    | "respiratory_rate"
    | "skin_temperature"
    | "wearable_readiness"
    | "wearable_strain"
    | "wearable_recovery_score";
  status: "unavailable";
  value: null;
  confidence: "none";
  reasons: MetricReason[];
}

export interface RecoveryCompleteness {
  hasCheckIns: boolean;
  hasMultipleLoggedDays: boolean;
  hasSoreness: boolean;
  hasFatigueField: false;
  hasEnergy: boolean;
  hasMotivation: boolean;
  hasStress: boolean;
  hasDerivedReadiness: boolean;
  hasPainFlags: boolean;
  hasBodyAreaSoreness: boolean;
  hasValidTimestamps: boolean;
  hasCompleteFieldCoverage: boolean;
  hasWearableData: false;
  hasExcludedOrInvalidRecords: boolean;
}

export interface RecoveryDetailAnalytics {
  trends: {
    soreness: AnalyticsMetric<RecoveryTrendValue>;
    energy: AnalyticsMetric<RecoveryTrendValue>;
    motivation: AnalyticsMetric<RecoveryTrendValue>;
    stress: AnalyticsMetric<RecoveryTrendValue>;
    readiness: AnalyticsMetric<RecoveryTrendValue>;
    fatigue: {
      status: "unavailable";
      value: null;
      reasons: MetricReason[];
    };
  };
  warningConditions: {
    highSoreness: RecoveryConditionAnalytics;
    lowReadiness: RecoveryConditionAnalytics;
  };
  signals: RecoverySignalAnalytics;
  consistency: AnalyticsMetric<RecoveryConsistencyValue>;
  wearableOnly: WearableMetricAvailability[];
  completeness: RecoveryCompleteness;
  availability: DomainAvailability;
  sourceMetadata: AnalyticsMetricSource;
  requestedDateRange: DateRange;
  effectiveDateRange: DateRange | null;
}

interface ValidatedCheckIn {
  checkIn: RecoveryCheckIn;
  valid: Record<"energy" | "soreness" | "stress" | "motivation", boolean>;
}

interface CheckInCollection {
  checkIns: ValidatedCheckIn[];
  duplicateCount: number;
  invalidIdentityCount: number;
  invalidTimestampCount: number;
  futureCount: number;
  outsideRangeCount: number;
}

function finiteTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && dayKey(value) !== "";
}

function validRecoveryValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RECOVERY_FIELD_MINIMUM &&
    value <= RECOVERY_FIELD_MAXIMUM
  );
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

function checkInFingerprint(checkIn: RecoveryCheckIn): string {
  return JSON.stringify({
    id: checkIn.id,
    createdAt: Number.isFinite(checkIn.createdAt) ? checkIn.createdAt : null,
    energy: Number.isFinite(checkIn.energy) ? checkIn.energy : null,
    soreness: Number.isFinite(checkIn.soreness) ? checkIn.soreness : null,
    stress: Number.isFinite(checkIn.stress) ? checkIn.stress : null,
    motivation: Number.isFinite(checkIn.motivation) ? checkIn.motivation : null,
  });
}

function collectCheckIns(state: AppState, range: DateRange, now: number): CheckInCollection {
  const candidates = state.recoveryCheckIns
    .map((checkIn) => ({
      checkIn,
      identityValid: typeof checkIn.id === "string" && checkIn.id.trim() !== "",
      timestampValid: finiteTimestamp(checkIn.createdAt),
      inRange: finiteTimestamp(checkIn.createdAt) && dateRangeContains(range, checkIn.createdAt),
      future: finiteTimestamp(checkIn.createdAt) && checkIn.createdAt > now,
      fingerprint: checkInFingerprint(checkIn),
    }))
    .sort(
      (a, b) =>
        Number(b.identityValid) - Number(a.identityValid) ||
        Number(b.inRange && !b.future) - Number(a.inRange && !a.future) ||
        Number(b.timestampValid) - Number(a.timestampValid) ||
        (a.timestampValid && b.timestampValid ? a.checkIn.createdAt - b.checkIn.createdAt : 0) ||
        String(a.checkIn.id).localeCompare(String(b.checkIn.id)) ||
        a.fingerprint.localeCompare(b.fingerprint),
    );
  const chosen = new Map<string, (typeof candidates)[number]>();
  let duplicateCount = 0;
  let invalidIdentityCount = 0;
  for (const candidate of candidates) {
    if (!candidate.identityValid) {
      invalidIdentityCount += 1;
      continue;
    }
    if (chosen.has(candidate.checkIn.id)) duplicateCount += 1;
    else chosen.set(candidate.checkIn.id, candidate);
  }
  let invalidTimestampCount = 0;
  let futureCount = 0;
  let outsideRangeCount = 0;
  const checkIns: ValidatedCheckIn[] = [];
  for (const candidate of chosen.values()) {
    if (!candidate.timestampValid) {
      invalidTimestampCount += 1;
      continue;
    }
    if (candidate.future) {
      futureCount += 1;
      continue;
    }
    if (!candidate.inRange) {
      outsideRangeCount += 1;
      continue;
    }
    checkIns.push({
      checkIn: candidate.checkIn,
      valid: {
        energy: validRecoveryValue(candidate.checkIn.energy),
        soreness: validRecoveryValue(candidate.checkIn.soreness),
        stress: validRecoveryValue(candidate.checkIn.stress),
        motivation: validRecoveryValue(candidate.checkIn.motivation),
      },
    });
  }
  checkIns.sort(
    (a, b) => a.checkIn.createdAt - b.checkIn.createdAt || a.checkIn.id.localeCompare(b.checkIn.id),
  );
  return {
    checkIns,
    duplicateCount,
    invalidIdentityCount,
    invalidTimestampCount,
    futureCount,
    outsideRangeCount,
  };
}

export function recoveryDetailReadinessScore(checkIn: RecoveryCheckIn): number | null {
  if (
    !validRecoveryValue(checkIn.energy) ||
    !validRecoveryValue(checkIn.motivation) ||
    !validRecoveryValue(checkIn.soreness) ||
    !validRecoveryValue(checkIn.stress)
  ) {
    return null;
  }
  return clampScore(
    safeRatio(
      checkIn.energy + checkIn.motivation + (11 - checkIn.soreness) + (11 - checkIn.stress),
      40,
    ) * 100,
  );
}

function fieldPoints(
  collection: CheckInCollection,
  field: RecoveryDetailField,
): RecoveryTrendPoint[] {
  if (field === "readiness") {
    return collection.checkIns
      .map((item) => ({ item, value: recoveryDetailReadinessScore(item.checkIn) }))
      .filter((entry): entry is { item: ValidatedCheckIn; value: number } => entry.value !== null)
      .map(({ item, value }) => ({
        checkInId: item.checkIn.id,
        timestamp: item.checkIn.createdAt,
        value,
      }));
  }
  return collection.checkIns
    .filter((item) => item.valid[field])
    .map((item) => ({
      checkInId: item.checkIn.id,
      timestamp: item.checkIn.createdAt,
      value: item.checkIn[field],
    }));
}

function invalidFieldCount(collection: CheckInCollection, field: RecoveryDetailField): number {
  if (field === "readiness") {
    return collection.checkIns.filter((item) => recoveryDetailReadinessScore(item.checkIn) === null)
      .length;
  }
  return collection.checkIns.filter((item) => !item.valid[field]).length;
}

function recoveryTrend(
  collection: CheckInCollection,
  field: RecoveryDetailField,
  range: DateRange,
): AnalyticsMetric<RecoveryTrendValue> {
  const points = fieldPoints(collection, field);
  const latest = points.at(-1)?.value ?? null;
  const previous = points.at(-2)?.value ?? null;
  const magnitude = latest === null || previous === null ? null : rounded(latest - previous);
  const percentChange =
    latest === null || previous === null ? null : rounded(safePercentChange(latest, previous) ?? 0);
  const threshold = field === "readiness" ? 2 : RECOVERY_TREND_STABLE_THRESHOLD;
  const trendQuality = calculateTrendQuality({
    values: points.map((point) => ({ timestamp: point.timestamp, value: point.value })),
    minimumSampleSize: RECOVERY_TREND_MINIMUM_SAMPLES,
    expectedDayCount: Math.max(0, calendarDayDifference(range.end, range.start)),
    stableThreshold: threshold,
    higherIsBetter: null,
  });
  const invalidCount = invalidFieldCount(collection, field);
  const reasons: MetricReason[] = [];
  if (points.length < RECOVERY_TREND_MINIMUM_SAMPLES) {
    reasons.push({
      code: "insufficient_recovery_samples",
      message: `Recovery trend requires ${RECOVERY_TREND_MINIMUM_SAMPLES} valid observations for ${field}.`,
    });
  }
  if (invalidCount > 0) {
    reasons.push({
      code: "invalid_recovery_field",
      message: `Invalid ${field} observations were excluded without discarding other valid fields.`,
      count: invalidCount,
    });
  }
  const unit = field === "readiness" ? "score_0_100" : "score_1_10";
  return createAnalyticsMetric({
    id: RECOVERY_DETAIL_METRIC_IDS.trend(field),
    label: `${field} trend`,
    domain: "recovery",
    kind: "time_series",
    unit,
    value: {
      field,
      latestValue: latest,
      previousValue: previous,
      magnitude,
      percentChange,
      direction: trendQuality.direction,
      hasEnoughData: trendQuality.hasEnoughData,
      points,
    },
    status:
      points.length >= RECOVERY_TREND_MINIMUM_SAMPLES
        ? "ready"
        : points.length
          ? "needs_more_data"
          : "unavailable",
    dateRange: range,
    sampleSize: points.length,
    minimumSampleSize: RECOVERY_TREND_MINIMUM_SAMPLES,
    reasons: [...reasons, ...trendQuality.reasons],
    entryIds: uniqueSorted(points.map((point) => point.checkInId)),
    entryTimestamps: points.map((point) => point.timestamp),
    collection: "recovery_check_ins",
    excludedRecordCount: invalidCount,
    expectedDayCount: Math.max(0, calendarDayDifference(range.end, range.start)),
    trendQuality,
    calculationId:
      field === "readiness"
        ? "recovery.detail.readiness_1_10_normalized.v1"
        : `recovery.detail.${field}.observed_trend.v1`,
    notes:
      field === "readiness"
        ? [
            "Derived readiness = (energy + motivation + (11 - soreness) + (11 - stress)) / 40 * 100.",
            "All four source fields must be valid on the 1-10 persisted scale.",
          ]
        : ["Values use the persisted 1-10 check-in scale."],
  });
}

function conditionAnalytics(
  collection: CheckInCollection,
  field: "soreness" | "readiness",
  threshold: number,
  range: DateRange,
  now: number,
): RecoveryConditionAnalytics {
  const points = fieldPoints(collection, field);
  const qualifying = points.filter((point) =>
    field === "soreness" ? point.value >= threshold : point.value <= threshold,
  );
  const latest = qualifying.at(-1) ?? null;
  const noObservationCode =
    field === "soreness" ? "no_high_soreness_observation" : "no_low_readiness_observation";
  const conditionLabel = field === "soreness" ? "high soreness" : "low readiness";
  const countId =
    field === "soreness"
      ? RECOVERY_DETAIL_METRIC_IDS.highSorenessCount
      : RECOVERY_DETAIL_METRIC_IDS.lowReadinessCount;
  const daysId =
    field === "soreness"
      ? RECOVERY_DETAIL_METRIC_IDS.daysSinceHighSoreness
      : RECOVERY_DETAIL_METRIC_IDS.daysSinceLowReadiness;
  const reasons: MetricReason[] = latest
    ? []
    : [{ code: noObservationCode, message: `No qualifying ${conditionLabel} observation exists.` }];
  const ids = uniqueSorted(qualifying.map((point) => point.checkInId));
  const timestamps = qualifying.map((point) => point.timestamp);
  return {
    count: createAnalyticsMetric({
      id: countId,
      label: `${conditionLabel} check-in count`,
      domain: "recovery",
      kind: "aggregate",
      unit: "count",
      value: qualifying.length,
      status: points.length ? "ready" : "unavailable",
      dateRange: range,
      sampleSize: points.length,
      minimumSampleSize: 1,
      reasons: points.length ? [] : reasons,
      entryIds: ids,
      entryTimestamps: timestamps,
      collection: "recovery_check_ins",
      expectedDayCount: null,
      calculationId: `${countId}.v1`,
      notes: [
        `Threshold is descriptive only: ${field} ${field === "soreness" ? ">=" : "<="} ${threshold}.`,
      ],
    }),
    daysSinceLatest: createAnalyticsMetric({
      id: daysId,
      label: `Days since latest ${conditionLabel} observation`,
      domain: "recovery",
      kind: "point_in_time",
      unit: "days",
      value: latest ? Math.max(0, calendarDayDifference(now, latest.timestamp)) : null,
      status: latest ? "ready" : "unavailable",
      dateRange: range,
      sampleSize: qualifying.length,
      minimumSampleSize: 1,
      reasons,
      entryIds: latest ? [latest.checkInId] : [],
      entryTimestamps: latest ? [latest.timestamp] : [],
      collection: "recovery_check_ins",
      expectedDayCount: null,
      calculationId: `${daysId}.local_calendar_days.v1`,
    }),
    threshold,
    comparison: field === "soreness" ? "at_or_above" : "at_or_below",
  };
}

function consistencyMetric(
  collection: CheckInCollection,
  range: DateRange,
): AnalyticsMetric<RecoveryConsistencyValue> {
  const dayKeys = uniqueSorted(collection.checkIns.map((item) => dayKey(item.checkIn.createdAt)));
  const requestedDays = Math.max(0, calendarDayDifference(range.end, range.start));
  const unloggedDays = Math.max(0, requestedDays - dayKeys.length);
  const coverage = requestedDays
    ? rounded(clampPercent(safeRatio(dayKeys.length, requestedDays) * 100))
    : 0;
  const enough = dayKeys.length >= RECOVERY_CONSISTENCY_MINIMUM_LOGGED_DAYS;
  const excluded =
    collection.duplicateCount +
    collection.invalidIdentityCount +
    collection.invalidTimestampCount +
    collection.futureCount +
    collection.outsideRangeCount;
  const reasons: MetricReason[] = [];
  if (!enough) {
    reasons.push({
      code: "insufficient_recovery_samples",
      message: `Recovery consistency requires ${RECOVERY_CONSISTENCY_MINIMUM_LOGGED_DAYS} distinct logged days.`,
    });
  }
  if (unloggedDays > 0) {
    reasons.push({
      code: "partial_coverage",
      message: "Unlogged days remain missing and are not converted to recovery values.",
      count: unloggedDays,
    });
  }
  return createAnalyticsMetric({
    id: RECOVERY_DETAIL_METRIC_IDS.consistency,
    label: "Recovery check-in consistency",
    domain: "recovery",
    kind: "aggregate",
    unit: "percent",
    value: {
      totalValidCheckIns: collection.checkIns.length,
      distinctLoggedDays: dayKeys.length,
      requestedDays,
      unloggedDays,
      checkInsPerLoggedDay: dayKeys.length
        ? rounded(safeRatio(collection.checkIns.length, dayKeys.length))
        : null,
      checkInsPerRequestedDay: requestedDays
        ? rounded(safeRatio(collection.checkIns.length, requestedDays))
        : 0,
      coveragePercent: coverage,
      consistencyScore: coverage,
      formula: "distinct_logged_day_coverage_v1",
      loggedDayKeys: dayKeys,
    },
    status: enough ? "ready" : collection.checkIns.length ? "needs_more_data" : "unavailable",
    dateRange: range,
    sampleSize: dayKeys.length,
    minimumSampleSize: RECOVERY_CONSISTENCY_MINIMUM_LOGGED_DAYS,
    reasons,
    entryIds: uniqueSorted(collection.checkIns.map((item) => item.checkIn.id)),
    entryTimestamps: collection.checkIns.map((item) => item.checkIn.createdAt),
    collection: "recovery_check_ins",
    excludedRecordCount: excluded,
    expectedDayCount: requestedDays,
    calculationId: "recovery.distinct_logged_day_coverage.v1",
    notes: ["Multiple check-ins on one local calendar day count as one consistent logged day."],
  });
}

function validSignals(state: AppState, range: DateRange, now: number): RecoverySignal[] {
  const sorted = state.recoverySignals
    .filter(
      (signal) =>
        typeof signal.id === "string" &&
        signal.id.trim() !== "" &&
        finiteTimestamp(signal.createdAt) &&
        signal.createdAt <= now &&
        dateRangeContains(range, signal.createdAt) &&
        validRecoveryValue(signal.severity),
    )
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id) ||
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  const byId = new Map<string, RecoverySignal>();
  for (const signal of sorted) if (!byId.has(signal.id)) byId.set(signal.id, signal);
  return [...byId.values()];
}

function signalCountMetric(
  signals: readonly RecoverySignal[],
  kind: "pain" | "soreness" | "fatigue",
  range: DateRange,
): AnalyticsMetric<number> {
  const matching = signals.filter((signal) => signal.kind === kind);
  return createAnalyticsMetric({
    id: `recovery.detail.signal.${kind}.count`,
    label: `Structured ${kind} signal count`,
    domain: "recovery",
    kind: "aggregate",
    unit: "count",
    value: matching.length,
    status: signals.length ? "ready" : "unavailable",
    dateRange: range,
    sampleSize: matching.length,
    minimumSampleSize: 1,
    reasons: signals.length
      ? []
      : [
          {
            code: "field_not_persisted",
            message: `No valid structured ${kind} signals are present.`,
          },
        ],
    entryIds: uniqueSorted(matching.map((signal) => signal.id)),
    entryTimestamps: matching.map((signal) => signal.createdAt),
    collection: "derived_metrics",
    expectedDayCount: null,
    calculationId: `recovery.structured_signal.${kind}.count.v1`,
  });
}

function signalAnalytics(
  signals: readonly RecoverySignal[],
  range: DateRange,
): RecoverySignalAnalytics {
  const sorenessWithArea = signals.filter(
    (signal) =>
      signal.kind === "soreness" && typeof signal.bodyArea === "string" && signal.bodyArea.trim(),
  );
  const areas = new Map<string, RecoverySignal[]>();
  for (const signal of sorenessWithArea) {
    const area = signal.bodyArea!.trim();
    const existing = areas.get(area) ?? [];
    existing.push(signal);
    areas.set(area, existing);
  }
  const frequencies = [...areas.entries()]
    .map(([bodyArea, entries]) => ({
      bodyArea,
      observationCount: entries.length,
      sourceSignalIds: uniqueSorted(entries.map((entry) => entry.id)),
    }))
    .sort(
      (a, b) => b.observationCount - a.observationCount || a.bodyArea.localeCompare(b.bodyArea),
    );
  return {
    painFlagCount: signalCountMetric(signals, "pain", range),
    sorenessFlagCount: signalCountMetric(signals, "soreness", range),
    fatigueFlagCount: signalCountMetric(signals, "fatigue", range),
    bodyAreaSoreness: {
      status: frequencies.length ? "ready" : "unavailable",
      frequencies,
      sourceSignalIds: uniqueSorted(sorenessWithArea.map((signal) => signal.id)),
      reasons: frequencies.length
        ? []
        : [
            {
              code: "field_not_persisted",
              message: "No valid structured soreness signal includes a bodyArea value.",
            },
          ],
    },
  };
}

function wearableAvailability(): WearableMetricAvailability[] {
  const ids: WearableMetricAvailability["id"][] = [
    "hrv",
    "resting_heart_rate",
    "sleep_stages",
    "respiratory_rate",
    "skin_temperature",
    "wearable_readiness",
    "wearable_strain",
    "wearable_recovery_score",
  ];
  return ids.map((id) => ({
    id,
    status: "unavailable",
    value: null,
    confidence: "none",
    reasons: [
      {
        code: "needs_wearable_sync",
        message: `${id} is not persisted in current application state and requires real wearable data.`,
      },
    ],
  }));
}

export function getRecoveryDetailAnalytics(
  state: AppState,
  options: RecoveryDetailOptions = {},
): RecoveryDetailAnalytics {
  const now = finiteTimestamp(options.now) ? options.now : Date.now();
  const days = Math.max(1, Math.trunc(options.days ?? 7));
  const range = calendarDaysWindow(days, now);
  const collection = collectCheckIns(state, range, now);
  const signals = validSignals(state, range, now);
  const consistency = consistencyMetric(collection, range);
  const soreness = recoveryTrend(collection, "soreness", range);
  const energy = recoveryTrend(collection, "energy", range);
  const motivation = recoveryTrend(collection, "motivation", range);
  const stress = recoveryTrend(collection, "stress", range);
  const readiness = recoveryTrend(collection, "readiness", range);
  const signalSummary = signalAnalytics(signals, range);
  const invalidFieldTotal = collection.checkIns.reduce(
    (count, item) => count + Object.values(item.valid).filter((valid) => !valid).length,
    0,
  );
  const excluded =
    collection.duplicateCount +
    collection.invalidIdentityCount +
    collection.invalidTimestampCount +
    collection.futureCount +
    collection.outsideRangeCount;
  const reasons: MetricReason[] = [];
  if (!state.recoveryCheckIns.length) {
    reasons.push({ code: "no_recovery_checkins", message: "No recovery check-ins exist." });
  } else if (!collection.checkIns.length) {
    reasons.push({
      code: "no_recovery_checkins",
      message: "No valid in-range recovery check-ins exist.",
    });
  }
  if (collection.invalidTimestampCount > 0) {
    reasons.push({
      code: "invalid_recovery_timestamp",
      message: "Recovery check-ins with invalid timestamps were excluded.",
      count: collection.invalidTimestampCount,
    });
  }
  if (collection.futureCount > 0) {
    reasons.push({
      code: "future_recovery_timestamp",
      message: "Future-dated recovery check-ins were excluded.",
      count: collection.futureCount,
    });
  }
  if (collection.duplicateCount > 0) {
    reasons.push({
      code: "duplicate_recovery_id",
      message: "Duplicate recovery IDs were deterministically suppressed.",
      count: collection.duplicateCount,
    });
  }
  if (invalidFieldTotal > 0) {
    reasons.push({
      code: "invalid_recovery_field",
      message: "Invalid recovery fields were excluded independently.",
      count: invalidFieldTotal,
    });
  }
  const sourceMetric = createAnalyticsMetric({
    id: RECOVERY_DETAIL_METRIC_IDS.source,
    label: "Recovery detail source",
    domain: "recovery",
    kind: "aggregate",
    unit: "count",
    value: collection.checkIns.length,
    status: collection.checkIns.length ? "ready" : "unavailable",
    dateRange: range,
    sampleSize: collection.checkIns.length,
    minimumSampleSize: 1,
    reasons,
    entryIds: uniqueSorted(collection.checkIns.map((item) => item.checkIn.id)),
    entryTimestamps: collection.checkIns.map((item) => item.checkIn.createdAt),
    includedRecordCount: collection.checkIns.length,
    collection: "recovery_check_ins",
    excludedRecordCount: excluded + invalidFieldTotal,
    exclusions: [
      { code: "invalid_timestamp", count: collection.invalidTimestampCount },
      { code: "future_timestamp", count: collection.futureCount },
      {
        code: "invalid_value",
        count: collection.invalidIdentityCount + collection.duplicateCount + invalidFieldTotal,
      },
      { code: "outside_range", count: collection.outsideRangeCount },
    ],
    expectedDayCount: days,
    calculationId: "recovery.detail.valid_checkins_and_fields.v1",
  });
  const timestamps = collection.checkIns.map((item) => item.checkIn.createdAt);
  const completeFields = collection.checkIns.every((item) =>
    Object.values(item.valid).every(Boolean),
  );
  return {
    trends: {
      soreness,
      energy,
      motivation,
      stress,
      readiness,
      fatigue: {
        status: "unavailable",
        value: null,
        reasons: [
          {
            code: "field_not_persisted",
            message:
              "RecoveryCheckIn stores energy but no separate fatigue field; energy is not inverted into fatigue.",
          },
        ],
      },
    },
    warningConditions: {
      highSoreness: conditionAnalytics(
        collection,
        "soreness",
        RECOVERY_HIGH_SORENESS_THRESHOLD,
        range,
        now,
      ),
      lowReadiness: conditionAnalytics(
        collection,
        "readiness",
        RECOVERY_LOW_READINESS_THRESHOLD,
        range,
        now,
      ),
    },
    signals: signalSummary,
    consistency,
    wearableOnly: wearableAvailability(),
    completeness: {
      hasCheckIns: collection.checkIns.length > 0,
      hasMultipleLoggedDays: (consistency.value?.distinctLoggedDays ?? 0) >= 2,
      hasSoreness: fieldPoints(collection, "soreness").length > 0,
      hasFatigueField: false,
      hasEnergy: fieldPoints(collection, "energy").length > 0,
      hasMotivation: fieldPoints(collection, "motivation").length > 0,
      hasStress: fieldPoints(collection, "stress").length > 0,
      hasDerivedReadiness: fieldPoints(collection, "readiness").length > 0,
      hasPainFlags: (signalSummary.painFlagCount.value ?? 0) > 0,
      hasBodyAreaSoreness: signalSummary.bodyAreaSoreness.frequencies.length > 0,
      hasValidTimestamps: collection.checkIns.length > 0,
      hasCompleteFieldCoverage: collection.checkIns.length > 0 && completeFields,
      hasWearableData: false,
      hasExcludedOrInvalidRecords: excluded + invalidFieldTotal > 0,
    },
    availability: {
      status: collection.checkIns.length ? "ready" : "unavailable",
      sampleSize: collection.checkIns.length,
      reason: sortedReasons(reasons)[0]?.message ?? null,
      lastLoggedAt: timestamps.at(-1) ?? null,
    },
    sourceMetadata: sourceMetric.source,
    requestedDateRange: range,
    effectiveDateRange: timestamps.length
      ? { start: Math.min(...timestamps), end: Math.max(...timestamps) + 1 }
      : null,
  };
}
