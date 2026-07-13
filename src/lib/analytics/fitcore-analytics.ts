import type { AppState } from "../types";
import {
  getGoalDetailAnalytics,
  type GoalDetailAnalytics,
  type GoalDetailOptions,
} from "./goal-detail-metrics";
import {
  getNutritionDetailAnalytics,
  type NutritionDetailAnalytics,
  type NutritionDetailOptions,
} from "./nutrition-detail-metrics";
import {
  getRecoveryDetailAnalytics,
  type RecoveryDetailAnalytics,
  type RecoveryDetailOptions,
} from "./recovery-detail-metrics";
import {
  getExerciseAndMuscleAnalytics,
  type ExerciseAndMuscleAnalytics,
  type TrainingDetailOptions,
} from "./training-detail-metrics";
import type {
  AnalyticsConfidence,
  AnalyticsMetricSource,
  AnalyticsStatus,
  MetricExclusion,
} from "./domain-metrics";
import {
  buildFitCoreInsightReadiness,
  type FitCoreCorrelationResult,
  type FitCoreInsightReadinessResult,
} from "./fitcore-insight-readiness";
import type { DateRange } from "./date-time";
import {
  ANALYTICS_SCHEMA_VERSION,
  getAnalyticsVersionMetadata,
  type AnalyticsVersionMetadata,
} from "./analytics-version";
import { getUnknownMetricProvenance, type MetricProvenance } from "./data-provenance";
import { METRIC_DEPENDENCY_GRAPH, METRIC_DEPENDENCY_GRAPH_ID } from "./metric-dependency-graph";
import {
  buildFitCoreAnalyticsTrust,
  type FitCoreAnalyticsTrustReport,
} from "./fitcore-analytics-trust";
import {
  getFitCoreAnalyticsTrends,
  type FitCoreAnalyticsTrendReport,
} from "./fitcore-analytics-trends";
import {
  getFitCoreAnalyticsSignals,
  type FitCoreAnalyticsSignalReport,
} from "./fitcore-analytics-signals";
import {
  getFitCoreAnalyticsInsights,
  type FitCoreAnalyticsInsightReport,
} from "./fitcore-analytics-insights";
import {
  getFitCoreAnalyticsExplanations,
  type FitCoreAnalyticsExplanationReport,
} from "./fitcore-analytics-explanations";
import {
  buildFitCoreInsightVisualizations,
  type FitCoreInsightVisualizationReport,
} from "./fitcore-analytics-visualizations";

export const FITCORE_ANALYTICS_SCHEMA_VERSION = ANALYTICS_SCHEMA_VERSION;
export const FITCORE_AGGREGATE_CONFIDENCE_VERSION = "lowest_available_domain_confidence_v1";

export type FitCoreAnalyticsDomain = "training" | "nutrition" | "recovery" | "goals";
export type FitCoreDomainAvailabilityStatus =
  | "available"
  | "partially_available"
  | "needs_more_data"
  | "unavailable"
  | "unsupported";

export interface FitCoreAnalyticsOptions {
  now?: number;
  training?: Omit<TrainingDetailOptions, "now">;
  nutrition?: Omit<NutritionDetailOptions, "now">;
  recovery?: Omit<RecoveryDetailOptions, "now">;
  goals?: Omit<GoalDetailOptions, "now">;
}

export interface FitCoreDomainStatus {
  domain: FitCoreAnalyticsDomain;
  status: FitCoreDomainAvailabilityStatus;
  sourceStatus: AnalyticsStatus;
  sampleSize: number;
  reason: string | null;
}

export interface FitCoreAnalyticsAvailability {
  status: Exclude<FitCoreDomainAvailabilityStatus, "unsupported">;
  domains: FitCoreDomainStatus[];
  availableDomainCount: number;
  partialDomainCount: number;
  needsMoreDataDomainCount: number;
  unavailableDomainCount: number;
}

export interface FitCoreDomainCompleteness {
  domain: FitCoreAnalyticsDomain;
  status: FitCoreDomainAvailabilityStatus;
  falseFieldCount: number;
  totalBooleanFieldCount: number;
  hasExclusions: boolean;
  hasUnsupportedFields: boolean;
  hasStaleData: boolean;
}

export interface FitCoreAnalyticsCompleteness {
  domains: FitCoreDomainCompleteness[];
  usableDomainCount: number;
  partialDomainCount: number;
  unavailableDomainCount: number;
  hasExclusions: boolean;
  hasUnsupportedFields: boolean;
  hasStaleData: boolean;
}

export interface FitCoreDomainConfidence {
  domain: FitCoreAnalyticsDomain;
  confidence: AnalyticsConfidence;
  includedMetricCount: number;
  excludedAsUnavailable: boolean;
}

export interface FitCoreAnalyticsConfidence {
  level: AnalyticsConfidence;
  algorithm: typeof FITCORE_AGGREGATE_CONFIDENCE_VERSION;
  domains: FitCoreDomainConfidence[];
  limitingDomains: FitCoreAnalyticsDomain[];
  excludedDomains: FitCoreAnalyticsDomain[];
  sufficientMultiDomainEvidence: boolean;
}

export type FitCoreAnalyticsReasonCode =
  | "no_domains_available"
  | "partial_domain_coverage"
  | "insufficient_multi_domain_data"
  | "domain_has_exclusions"
  | "unsupported_domain_fields"
  | "domain_has_stale_data"
  | "mixed_confidence";

export interface FitCoreAnalyticsReason {
  code: FitCoreAnalyticsReasonCode;
  domains: FitCoreAnalyticsDomain[];
}

export interface FitCoreDomainSources {
  domain: FitCoreAnalyticsDomain;
  metadata: AnalyticsMetricSource;
}

export interface FitCoreAnalyticsSources {
  domains: FitCoreDomainSources[];
  entryIds: string[];
  includedRecordCount: number;
}

export interface FitCoreAnalyticsExclusions {
  domains: Array<{
    domain: FitCoreAnalyticsDomain;
    excludedRecordCount: number;
    exclusions: MetricExclusion[];
  }>;
  excludedRecordCount: number;
}

export interface FitCoreAnalyticsBaseResult {
  schemaVersion: typeof FITCORE_ANALYTICS_SCHEMA_VERSION;
  analyticsVersion: AnalyticsVersionMetadata;
  dependencyGraph: {
    graphId: typeof METRIC_DEPENDENCY_GRAPH_ID;
    nodeCount: number;
  };
  provenance: MetricProvenance;
  generatedAt: string;
  range: DateRange | null;
  domains: {
    training: ExerciseAndMuscleAnalytics;
    nutrition: NutritionDetailAnalytics;
    recovery: RecoveryDetailAnalytics;
    goals: GoalDetailAnalytics;
  };
  availability: FitCoreAnalyticsAvailability;
  completeness: FitCoreAnalyticsCompleteness;
  confidence: FitCoreAnalyticsConfidence;
  sources: FitCoreAnalyticsSources;
  exclusions: FitCoreAnalyticsExclusions;
  reasons: FitCoreAnalyticsReason[];
}

export interface FitCoreAnalyticsResult extends FitCoreAnalyticsBaseResult {
  correlations: FitCoreCorrelationResult[];
  insightReadiness: FitCoreInsightReadinessResult;
  trust: FitCoreAnalyticsTrustReport;
  trends: FitCoreAnalyticsTrendReport;
  signals: FitCoreAnalyticsSignalReport;
  insights: FitCoreAnalyticsInsightReport;
  explanations: FitCoreAnalyticsExplanationReport;
  visualizations: FitCoreInsightVisualizationReport;
}

const DOMAIN_ORDER: readonly FitCoreAnalyticsDomain[] = [
  "training",
  "nutrition",
  "recovery",
  "goals",
];
const CONFIDENCE_RANK: Record<AnalyticsConfidence, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function finiteTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && !Number.isNaN(new Date(value).getTime())
  );
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

function walk(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit));
    return;
  }
  const record = value as Record<string, unknown>;
  visit(record);
  Object.values(record).forEach((item) => walk(item, visit));
}

function booleanCounts(value: unknown): { falseCount: number; total: number } {
  let falseCount = 0;
  let total = 0;
  walk(value, (record) => {
    for (const item of Object.values(record)) {
      if (typeof item === "boolean") {
        total += 1;
        if (!item) falseCount += 1;
      }
    }
  });
  return { falseCount, total };
}

function flags(value: unknown, source: AnalyticsMetricSource) {
  let unsupported = false;
  let stale = false;
  walk(value, (record) => {
    const reasons = Array.isArray(record.reasons) ? record.reasons : [];
    for (const reason of reasons) {
      const code = (reason as { code?: unknown }).code;
      if (
        code === "unsupported_nutrient_field" ||
        code === "field_not_persisted" ||
        code === "needs_wearable_sync"
      )
        unsupported = true;
      if (
        code === "stale_data" ||
        code === "stale_bodyweight" ||
        code === "stale_goal_measurement" ||
        code === "stale_recovery_data" ||
        code === "stale_exercise_history"
      )
        stale = true;
    }
  });
  return { hasExclusions: source.excludedRecordCount > 0, unsupported, stale };
}

function confidenceFor(
  domain: FitCoreAnalyticsDomain,
  value: unknown,
  unavailable: boolean,
): FitCoreDomainConfidence {
  const levels: AnalyticsConfidence[] = [];
  walk(value, (record) => {
    if (
      record.status === "ready" &&
      typeof record.id === "string" &&
      typeof record.confidence === "string"
    ) {
      levels.push(record.confidence as AnalyticsConfidence);
    }
  });
  const confidence = levels.length
    ? levels.reduce(
        (lowest, level) => (CONFIDENCE_RANK[level] < CONFIDENCE_RANK[lowest] ? level : lowest),
        "high",
      )
    : "none";
  return {
    domain,
    confidence,
    includedMetricCount: levels.length,
    excludedAsUnavailable: unavailable,
  };
}

function availabilityStatus(
  sourceStatus: AnalyticsStatus,
  details: ReturnType<typeof flags>,
  falseFields: number,
): FitCoreDomainAvailabilityStatus {
  if (sourceStatus === "unavailable") return "unavailable";
  if (sourceStatus === "needs_more_data") return "needs_more_data";
  return details.hasExclusions || details.unsupported || details.stale || falseFields > 0
    ? "partially_available"
    : "available";
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function finiteOption(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getFitCoreAnalytics(
  state: AppState,
  options: FitCoreAnalyticsOptions = {},
): FitCoreAnalyticsResult {
  const now = finiteTimestamp(options.now) ? options.now : Date.now();
  const trainingOptions = {
    historyDays: finiteOption(options.training?.historyDays),
    comparisonDays: finiteOption(options.training?.comparisonDays),
    staleAfterDays: finiteOption(options.training?.staleAfterDays),
  };
  const nutritionOptions = {
    days: finiteOption(options.nutrition?.days),
    timeZone: options.nutrition?.timeZone,
  };
  const recoveryOptions = { days: finiteOption(options.recovery?.days) };
  const domains = {
    training: getExerciseAndMuscleAnalytics(state, { ...trainingOptions, now }),
    nutrition: getNutritionDetailAnalytics(state, { ...nutritionOptions, now }),
    recovery: getRecoveryDetailAnalytics(state, { ...recoveryOptions, now }),
    goals: getGoalDetailAnalytics(state, { ...options.goals, now }),
  };
  const sources = DOMAIN_ORDER.map((domain) => ({
    domain,
    metadata: domains[domain].sourceMetadata,
  }));
  const completenessDomains = sources.map(({ domain, metadata }) => {
    const counts = booleanCounts(domains[domain]);
    const details = flags(domains[domain], metadata);
    return {
      domain,
      status: availabilityStatus(domains[domain].availability.status, details, counts.falseCount),
      falseFieldCount: counts.falseCount,
      totalBooleanFieldCount: counts.total,
      hasExclusions: details.hasExclusions,
      hasUnsupportedFields: details.unsupported,
      hasStaleData: details.stale,
    };
  });
  const domainStatuses = completenessDomains.map((item) => ({
    domain: item.domain,
    status: item.status,
    sourceStatus: domains[item.domain].availability.status,
    sampleSize: domains[item.domain].availability.sampleSize,
    reason: domains[item.domain].availability.reason,
  }));
  const usable = domainStatuses.filter(
    (item) => item.status === "available" || item.status === "partially_available",
  );
  const partial = domainStatuses.filter((item) => item.status === "partially_available");
  const needs = domainStatuses.filter((item) => item.status === "needs_more_data");
  const unavailable = domainStatuses.filter(
    (item) => item.status === "unavailable" || item.status === "unsupported",
  );
  const availability: FitCoreAnalyticsAvailability = {
    status:
      usable.length === 0
        ? needs.length
          ? "needs_more_data"
          : "unavailable"
        : usable.length === 4 && !partial.length
          ? "available"
          : "partially_available",
    domains: domainStatuses,
    availableDomainCount: usable.length,
    partialDomainCount: partial.length,
    needsMoreDataDomainCount: needs.length,
    unavailableDomainCount: unavailable.length,
  };
  const domainConfidence = DOMAIN_ORDER.map((domain) =>
    confidenceFor(domain, domains[domain], !usable.some((item) => item.domain === domain)),
  );
  const includedConfidence = domainConfidence.filter((item) => !item.excludedAsUnavailable);
  const confidenceLevel = includedConfidence.length
    ? includedConfidence.reduce(
        (lowest, item) =>
          CONFIDENCE_RANK[item.confidence] < CONFIDENCE_RANK[lowest] ? item.confidence : lowest,
        "high" as AnalyticsConfidence,
      )
    : "none";
  const limitingDomains = includedConfidence
    .filter((item) => item.confidence === confidenceLevel)
    .map((item) => item.domain);
  const ranges = sources
    .map((item) => item.metadata.requestedDateRange)
    .filter((range): range is DateRange => range !== null);
  const reasons: FitCoreAnalyticsReason[] = [];
  if (!usable.length) reasons.push({ code: "no_domains_available", domains: [...DOMAIN_ORDER] });
  if (usable.length < 4 || partial.length)
    reasons.push({
      code: "partial_domain_coverage",
      domains: domainStatuses
        .filter((item) => item.status !== "available")
        .map((item) => item.domain),
    });
  if (usable.length < 2)
    reasons.push({ code: "insufficient_multi_domain_data", domains: [...DOMAIN_ORDER] });
  const excludedDomains = completenessDomains
    .filter((item) => item.hasExclusions)
    .map((item) => item.domain);
  const unsupportedDomains = completenessDomains
    .filter((item) => item.hasUnsupportedFields)
    .map((item) => item.domain);
  const staleDomains = completenessDomains
    .filter((item) => item.hasStaleData)
    .map((item) => item.domain);
  if (excludedDomains.length)
    reasons.push({ code: "domain_has_exclusions", domains: excludedDomains });
  if (unsupportedDomains.length)
    reasons.push({ code: "unsupported_domain_fields", domains: unsupportedDomains });
  if (staleDomains.length) reasons.push({ code: "domain_has_stale_data", domains: staleDomains });
  if (new Set(includedConfidence.map((item) => item.confidence)).size > 1)
    reasons.push({
      code: "mixed_confidence",
      domains: includedConfidence.map((item) => item.domain),
    });
  const exclusions = sources.map(({ domain, metadata }) => ({
    domain,
    excludedRecordCount: metadata.excludedRecordCount,
    exclusions: clone(metadata.exclusions),
  }));
  const base: FitCoreAnalyticsBaseResult = clone({
    schemaVersion: FITCORE_ANALYTICS_SCHEMA_VERSION,
    analyticsVersion: getAnalyticsVersionMetadata(),
    dependencyGraph: {
      graphId: METRIC_DEPENDENCY_GRAPH_ID,
      nodeCount: METRIC_DEPENDENCY_GRAPH.length,
    },
    provenance: getUnknownMetricProvenance(["missing_source", "source_type_not_recorded"]),
    generatedAt: new Date(now).toISOString(),
    range: ranges.length
      ? {
          start: Math.min(...ranges.map((range) => range.start)),
          end: Math.max(...ranges.map((range) => range.end)),
        }
      : null,
    domains,
    availability,
    completeness: {
      domains: completenessDomains,
      usableDomainCount: usable.length,
      partialDomainCount: partial.length,
      unavailableDomainCount: needs.length + unavailable.length,
      hasExclusions: excludedDomains.length > 0,
      hasUnsupportedFields: unsupportedDomains.length > 0,
      hasStaleData: staleDomains.length > 0,
    },
    confidence: {
      level: confidenceLevel,
      algorithm: FITCORE_AGGREGATE_CONFIDENCE_VERSION,
      domains: domainConfidence,
      limitingDomains,
      excludedDomains: domainConfidence
        .filter((item) => item.excludedAsUnavailable)
        .map((item) => item.domain),
      sufficientMultiDomainEvidence: usable.length >= 2 && confidenceLevel !== "none",
    },
    sources: {
      domains: sources,
      entryIds: uniqueSorted(sources.flatMap((item) => item.metadata.entryIds)),
      includedRecordCount: sources.reduce(
        (sum, item) => sum + item.metadata.includedRecordCount,
        0,
      ),
    },
    exclusions: {
      domains: exclusions,
      excludedRecordCount: exclusions.reduce((sum, item) => sum + item.excludedRecordCount, 0),
    },
    reasons,
  });
  const readiness = buildFitCoreInsightReadiness(state, base, now);
  const analytics = clone({ ...base, ...readiness });
  const trust = buildFitCoreAnalyticsTrust(analytics, now, {
    defaultProvenance: base.provenance,
  });
  const trustedAnalytics = clone({ ...analytics, trust });
  const trends = getFitCoreAnalyticsTrends(
    state,
    trustedAnalytics as unknown as Omit<FitCoreAnalyticsResult, "trends">,
    now,
  );
  const trendedAnalytics = clone({ ...trustedAnalytics, trends });
  const signals = getFitCoreAnalyticsSignals(trendedAnalytics);
  const signaledAnalytics = clone({ ...trendedAnalytics, signals });
  const insights = getFitCoreAnalyticsInsights(signaledAnalytics);
  const insightAnalytics = clone({ ...signaledAnalytics, insights });
  const explanations = getFitCoreAnalyticsExplanations(insightAnalytics);
  const explainedAnalytics = clone({ ...insightAnalytics, explanations });
  const visualizations = buildFitCoreInsightVisualizations({ insights, explanations });
  return { ...clone(explainedAnalytics), visualizations };
}
