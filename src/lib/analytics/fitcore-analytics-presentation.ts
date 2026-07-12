import type { AppState } from "../types";
import type {
  AnalyticsConfidence,
  AnalyticsMetric,
  AnalyticsMetricSource,
  AnalyticsStatus,
} from "./domain-metrics";
import {
  getFitCoreAnalytics,
  type FitCoreAnalyticsOptions,
  type FitCoreAnalyticsResult,
  type FitCoreDomainAvailabilityStatus,
} from "./fitcore-analytics";
import { GOAL_DETAIL_METRIC_IDS } from "./goal-detail-metrics";
import {
  NUTRITION_DETAIL_METRIC_IDS,
  type MacroConsistencyValue,
} from "./nutrition-detail-metrics";
import {
  RECOVERY_DETAIL_METRIC_IDS,
  type RecoveryConsistencyValue,
  type RecoveryTrendValue,
} from "./recovery-detail-metrics";
import { TRAINING_DETAIL_METRIC_IDS } from "./training-detail-metrics";

export const FITCORE_ANALYTICS_PRESENTATION_VERSION = "1.0.0";
export const FITCORE_PRESENTATION_STATE_PRECEDENCE = Object.freeze([
  "unsupported",
  "unavailable",
  "stale",
  "needs_more_data",
  "partial",
  "ready",
] as const);

export type AnalyticsPresentationDomain = "training" | "nutrition" | "recovery" | "goals";
export type AnalyticsPresentationSurface =
  | "home.daily"
  | "home.deepDive"
  | "training.daily"
  | "training.deepDive"
  | "nutrition.daily"
  | "nutrition.deepDive"
  | "recovery.daily"
  | "recovery.deepDive"
  | "stats.daily"
  | "stats.deepDive";
export type AnalyticsPresentationState =
  | "ready"
  | "partial"
  | "needs_more_data"
  | "stale"
  | "unsupported"
  | "unavailable";
export type AnalyticsPresentationReasonCode =
  | string
  | "surface_has_no_ready_metrics"
  | "surface_has_partial_metrics"
  | "surface_contains_stale_metrics"
  | "surface_contains_unsupported_metrics"
  | "catalog_collision"
  | "catalog_source_metric_missing";
export type AnalyticsPresentationMetricId = string;
export type AnalyticsPresentationMetricValue =
  | number
  | string
  | boolean
  | MacroConsistencyValue
  | RecoveryTrendValue
  | RecoveryConsistencyValue
  | null;

type CatalogSourceKey =
  | "training.source"
  | "nutrition.mealCounts.today"
  | "nutrition.mealCounts.rangeTotal"
  | "nutrition.mealCounts.distinctLoggedDays"
  | "nutrition.mealCounts.mealsPerLoggedDay"
  | "nutrition.mealCounts.mealsPerRequestedDay"
  | "nutrition.consistency.calories"
  | "nutrition.consistency.protein"
  | "nutrition.consistency.carbs"
  | "nutrition.consistency.fat"
  | "nutrition.proteinPerBodyweight.metric"
  | "recovery.trends.soreness"
  | "recovery.trends.energy"
  | "recovery.trends.motivation"
  | "recovery.trends.stress"
  | "recovery.trends.readiness"
  | "recovery.warningConditions.highSoreness.count"
  | "recovery.warningConditions.highSoreness.daysSinceLatest"
  | "recovery.warningConditions.lowReadiness.count"
  | "recovery.warningConditions.lowReadiness.daysSinceLatest"
  | "recovery.consistency"
  | "recovery.signals.painFlagCount"
  | "recovery.signals.sorenessFlagCount"
  | "recovery.signals.fatigueFlagCount"
  | "goals.source";

export interface AnalyticsPresentationMetricDefinition {
  readonly presentationId: AnalyticsPresentationMetricId;
  readonly domain: AnalyticsPresentationDomain;
  readonly sourceMetricId: string;
  readonly sourceKey: CatalogSourceKey;
  readonly label: string;
  readonly allowedSurfaces: readonly AnalyticsPresentationSurface[];
  readonly preferredRole: "headline" | "summary" | "trend" | "detail" | "context" | "limitation";
}

export interface FitCoreAnalyticsPresentationOptions extends FitCoreAnalyticsOptions {
  catalog?: readonly AnalyticsPresentationMetricDefinition[];
}

export interface AnalyticsPresentationReason {
  code: AnalyticsPresentationReasonCode;
  domains: AnalyticsPresentationDomain[];
}

export interface AnalyticsPresentationMetric {
  id: AnalyticsPresentationMetricId;
  sourceMetricId: string;
  domain: AnalyticsPresentationDomain;
  label: string;
  value: AnalyticsPresentationMetricValue;
  unit: string | null;
  state: AnalyticsPresentationState;
  confidence: AnalyticsConfidence;
  completeness: unknown;
  reasonCodes: string[];
  sourceIds: string[];
  sourceCount: number;
  exclusionCount: number;
  exclusionCodes: string[];
  stale: boolean;
  unsupported: boolean;
  algorithmVersion: string | null;
}

export interface AnalyticsPresentationSection {
  id: string;
  domain: AnalyticsPresentationDomain | "aggregate";
  state: AnalyticsPresentationState;
  headlineMetricIds: AnalyticsPresentationMetricId[];
  supportingMetricIds: AnalyticsPresentationMetricId[];
  reasonCodes: string[];
}

export interface AnalyticsPresentationSurfaceResult {
  id: AnalyticsPresentationSurface;
  state: AnalyticsPresentationState;
  sections: AnalyticsPresentationSection[];
  metricIds: AnalyticsPresentationMetricId[];
  reasonCodes: string[];
  sourceCount: number;
  exclusionCount: number;
}

export interface AnalyticsPresentationDomainSummary {
  domain: AnalyticsPresentationDomain;
  state: AnalyticsPresentationState;
  availability: FitCoreDomainAvailabilityStatus;
  confidence: AnalyticsConfidence;
  completeness: unknown;
  readyMetricCount: number;
  partialMetricCount: number;
  needsMoreDataMetricCount: number;
  unavailableMetricCount: number;
  unsupportedMetricCount: number;
  staleMetricCount: number;
  sourceCount: number;
  exclusionCount: number;
  reasonCodes: string[];
}

export interface AnalyticsPresentationAggregateSummary {
  state: AnalyticsPresentationState;
  usableDomainCount: number;
  partialDomainCount: number;
  unavailableDomainCount: number;
  minimumConfidence: AnalyticsConfidence;
  sufficientMultiDomainEvidence: boolean;
  reasonCodes: string[];
  sourceCount: number;
  exclusionCount: number;
  staleDomainCount: number;
  unsupportedDomainCount: number;
}

export interface FitCoreAnalyticsPresentationResult {
  presentationVersion: typeof FITCORE_ANALYTICS_PRESENTATION_VERSION;
  analyticsSchemaVersion: string;
  generatedAt: string;
  range: FitCoreAnalyticsResult["range"];
  catalog: AnalyticsPresentationMetricDefinition[];
  metrics: Record<AnalyticsPresentationMetricId, AnalyticsPresentationMetric>;
  metricOrder: AnalyticsPresentationMetricId[];
  surfaces: Record<AnalyticsPresentationSurface, AnalyticsPresentationSurfaceResult>;
  surfaceOrder: AnalyticsPresentationSurface[];
  domains: Record<AnalyticsPresentationDomain, AnalyticsPresentationDomainSummary>;
  aggregate: AnalyticsPresentationAggregateSummary;
  reasons: AnalyticsPresentationReason[];
}

const HOME = ["home.daily", "home.deepDive"] as const;
const TRAINING = [
  "training.daily",
  "training.deepDive",
  "home.deepDive",
  "stats.deepDive",
] as const;
const NUTRITION = [
  "nutrition.daily",
  "nutrition.deepDive",
  "home.deepDive",
  "stats.deepDive",
] as const;
const RECOVERY = [
  "recovery.daily",
  "recovery.deepDive",
  "home.deepDive",
  "stats.deepDive",
] as const;
const STATS = ["stats.daily", "stats.deepDive"] as const;

function definition(
  sourceKey: CatalogSourceKey,
  domain: AnalyticsPresentationDomain,
  sourceMetricId: string,
  label: string,
  allowedSurfaces: readonly AnalyticsPresentationSurface[],
  preferredRole: AnalyticsPresentationMetricDefinition["preferredRole"],
): AnalyticsPresentationMetricDefinition {
  return Object.freeze({
    presentationId: sourceMetricId,
    domain,
    sourceMetricId,
    sourceKey,
    label,
    allowedSurfaces: Object.freeze([...allowedSurfaces]),
    preferredRole,
  });
}

export const FITCORE_ANALYTICS_PRESENTATION_CATALOG = Object.freeze([
  definition(
    "training.source",
    "training",
    TRAINING_DETAIL_METRIC_IDS.source,
    "Training source records",
    [...HOME, ...TRAINING],
    "summary",
  ),
  definition(
    "nutrition.mealCounts.today",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.mealCountToday,
    "Meals today",
    ["home.daily", "nutrition.daily", "nutrition.deepDive"],
    "headline",
  ),
  definition(
    "nutrition.mealCounts.rangeTotal",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.mealCountRange,
    "Meals in range",
    NUTRITION,
    "summary",
  ),
  definition(
    "nutrition.mealCounts.distinctLoggedDays",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.distinctLoggedDays,
    "Nutrition logged days",
    [...NUTRITION, ...STATS],
    "summary",
  ),
  definition(
    "nutrition.mealCounts.mealsPerLoggedDay",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.mealsPerLoggedDay,
    "Meals per logged day",
    ["nutrition.deepDive"],
    "detail",
  ),
  definition(
    "nutrition.mealCounts.mealsPerRequestedDay",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.mealsPerRequestedDay,
    "Meals per requested day",
    ["nutrition.deepDive"],
    "detail",
  ),
  ...(["calories", "protein", "carbs", "fat"] as const).map((macro) =>
    definition(
      `nutrition.consistency.${macro}`,
      "nutrition",
      NUTRITION_DETAIL_METRIC_IDS.consistency(macro),
      `${macro} consistency`,
      macro === "protein" || macro === "calories"
        ? ["nutrition.daily", "nutrition.deepDive", "stats.deepDive"]
        : ["nutrition.deepDive"],
      "trend",
    ),
  ),
  definition(
    "nutrition.proteinPerBodyweight.metric",
    "nutrition",
    NUTRITION_DETAIL_METRIC_IDS.proteinPerBodyweight,
    "Protein per bodyweight",
    ["nutrition.daily", "nutrition.deepDive"],
    "summary",
  ),
  ...(["soreness", "energy", "motivation", "stress", "readiness"] as const).map((field) =>
    definition(
      `recovery.trends.${field}`,
      "recovery",
      RECOVERY_DETAIL_METRIC_IDS.trend(field),
      `${field} trend`,
      field === "readiness" || field === "soreness"
        ? ["home.daily", "recovery.daily", "recovery.deepDive", "stats.deepDive"]
        : ["recovery.deepDive"],
      "trend",
    ),
  ),
  definition(
    "recovery.warningConditions.highSoreness.count",
    "recovery",
    RECOVERY_DETAIL_METRIC_IDS.highSorenessCount,
    "High soreness count",
    ["recovery.daily", "recovery.deepDive"],
    "summary",
  ),
  definition(
    "recovery.warningConditions.highSoreness.daysSinceLatest",
    "recovery",
    RECOVERY_DETAIL_METRIC_IDS.daysSinceHighSoreness,
    "Days since high soreness",
    ["recovery.deepDive"],
    "detail",
  ),
  definition(
    "recovery.warningConditions.lowReadiness.count",
    "recovery",
    RECOVERY_DETAIL_METRIC_IDS.lowReadinessCount,
    "Low readiness count",
    ["recovery.daily", "recovery.deepDive"],
    "summary",
  ),
  definition(
    "recovery.warningConditions.lowReadiness.daysSinceLatest",
    "recovery",
    RECOVERY_DETAIL_METRIC_IDS.daysSinceLowReadiness,
    "Days since low readiness",
    ["recovery.deepDive"],
    "detail",
  ),
  definition(
    "recovery.consistency",
    "recovery",
    RECOVERY_DETAIL_METRIC_IDS.consistency,
    "Recovery consistency",
    ["recovery.deepDive", "stats.daily", "stats.deepDive"],
    "trend",
  ),
  ...(["pain", "soreness", "fatigue"] as const).map((kind) =>
    definition(
      `recovery.signals.${kind}FlagCount`,
      "recovery",
      `recovery.detail.signal.${kind}.count`,
      `${kind} signal count`,
      ["recovery.deepDive"],
      "detail",
    ),
  ),
  definition(
    "goals.source",
    "goals",
    GOAL_DETAIL_METRIC_IDS.source,
    "Goal source records",
    [...HOME, ...STATS],
    "summary",
  ),
] as const);

export const FITCORE_ANALYTICS_PRESENTATION_SURFACES = Object.freeze([
  "home.daily",
  "home.deepDive",
  "training.daily",
  "training.deepDive",
  "nutrition.daily",
  "nutrition.deepDive",
  "recovery.daily",
  "recovery.deepDive",
  "stats.daily",
  "stats.deepDive",
] as const satisfies readonly AnalyticsPresentationSurface[]);

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as T;
  }
  return value;
}

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sourceProxy(
  id: string,
  label: string,
  availability: { status: AnalyticsStatus; sampleSize: number; reason: string | null },
  source: AnalyticsMetricSource,
): AnalyticsMetric<number> {
  const confidence = availability.status === "ready" ? "low" : "none";
  return {
    id,
    label,
    domain: source.domain,
    kind: "aggregate",
    unit: "count",
    value: source.includedRecordCount,
    status: availability.status,
    confidence,
    confidenceDetails: {
      level: confidence,
      score: confidence === "low" ? 25 : 0,
      reasons: [],
      evidence: {
        validRecordCount: source.includedRecordCount,
        minimumSampleSize: 1,
        coverageDayCount: source.coverageDayCount,
        expectedDayCount: source.expectedDayCount,
        missingDataRatio: null,
        comparisonPeriodValid: null,
        targetValid: source.targetAvailable,
        partialPeriod: false,
        stale: false,
        singleSample: source.includedRecordCount === 1,
        excludedRecordCount: source.excludedRecordCount,
      },
    },
    dateRange: source.requestedDateRange,
    sampleSize: source.includedRecordCount,
    minimumSampleSize: 1,
    reason: availability.reason,
    reasons: [],
    trendQuality: null,
    source,
  };
}

function selectMetric(
  analytics: FitCoreAnalyticsResult,
  key: CatalogSourceKey,
): AnalyticsMetric<unknown> | null {
  const { training, nutrition, recovery, goals } = analytics.domains;
  switch (key) {
    case "training.source":
      return sourceProxy(
        TRAINING_DETAIL_METRIC_IDS.source,
        "Training source records",
        training.availability,
        training.sourceMetadata,
      );
    case "nutrition.mealCounts.today":
      return nutrition.mealCounts.today;
    case "nutrition.mealCounts.rangeTotal":
      return nutrition.mealCounts.rangeTotal;
    case "nutrition.mealCounts.distinctLoggedDays":
      return nutrition.mealCounts.distinctLoggedDays;
    case "nutrition.mealCounts.mealsPerLoggedDay":
      return nutrition.mealCounts.mealsPerLoggedDay;
    case "nutrition.mealCounts.mealsPerRequestedDay":
      return nutrition.mealCounts.mealsPerRequestedDay;
    case "nutrition.consistency.calories":
      return nutrition.consistency.calories;
    case "nutrition.consistency.protein":
      return nutrition.consistency.protein;
    case "nutrition.consistency.carbs":
      return nutrition.consistency.carbs;
    case "nutrition.consistency.fat":
      return nutrition.consistency.fat;
    case "nutrition.proteinPerBodyweight.metric":
      return nutrition.proteinPerBodyweight.metric;
    case "recovery.trends.soreness":
      return recovery.trends.soreness;
    case "recovery.trends.energy":
      return recovery.trends.energy;
    case "recovery.trends.motivation":
      return recovery.trends.motivation;
    case "recovery.trends.stress":
      return recovery.trends.stress;
    case "recovery.trends.readiness":
      return recovery.trends.readiness;
    case "recovery.warningConditions.highSoreness.count":
      return recovery.warningConditions.highSoreness.count;
    case "recovery.warningConditions.highSoreness.daysSinceLatest":
      return recovery.warningConditions.highSoreness.daysSinceLatest;
    case "recovery.warningConditions.lowReadiness.count":
      return recovery.warningConditions.lowReadiness.count;
    case "recovery.warningConditions.lowReadiness.daysSinceLatest":
      return recovery.warningConditions.lowReadiness.daysSinceLatest;
    case "recovery.consistency":
      return recovery.consistency;
    case "recovery.signals.painFlagCount":
      return recovery.signals.painFlagCount;
    case "recovery.signals.sorenessFlagCount":
      return recovery.signals.sorenessFlagCount;
    case "recovery.signals.fatigueFlagCount":
      return recovery.signals.fatigueFlagCount;
    case "goals.source":
      return sourceProxy(
        GOAL_DETAIL_METRIC_IDS.source,
        "Goal source records",
        goals.availability,
        goals.sourceMetadata,
      );
  }
}

function reasonCodes(metric: AnalyticsMetric<unknown>): string[] {
  return sorted(metric.reasons.map((reason) => reason.code));
}

function metricState(metric: AnalyticsMetric<unknown>): AnalyticsPresentationState {
  const codes = reasonCodes(metric);
  const unsupported = codes.some(
    (code) =>
      code === "unsupported_nutrient_field" ||
      code === "field_not_persisted" ||
      code === "needs_wearable_sync",
  );
  if (unsupported) return "unsupported";
  if (metric.status === "unavailable") return "unavailable";
  if (metric.confidenceDetails.evidence.stale || codes.some((code) => code.startsWith("stale_")))
    return "stale";
  if (metric.status === "needs_more_data") return "needs_more_data";
  if (
    metric.source.excludedRecordCount > 0 ||
    codes.some(
      (code) => code.includes("partial") || code.includes("sparse") || code.includes("invalid"),
    )
  )
    return "partial";
  return "ready";
}

function missingMetric(
  definition: AnalyticsPresentationMetricDefinition,
): AnalyticsPresentationMetric {
  return {
    id: definition.presentationId,
    sourceMetricId: definition.sourceMetricId,
    domain: definition.domain,
    label: definition.label,
    value: null,
    unit: null,
    state: "unavailable",
    confidence: "none",
    completeness: null,
    reasonCodes: ["catalog_source_metric_missing"],
    sourceIds: [],
    sourceCount: 0,
    exclusionCount: 0,
    exclusionCodes: [],
    stale: false,
    unsupported: false,
    algorithmVersion: null,
  };
}

function presentationMetric(
  definition: AnalyticsPresentationMetricDefinition,
  source: AnalyticsMetric<unknown> | null,
): AnalyticsPresentationMetric {
  if (!source || source.id !== definition.sourceMetricId) return missingMetric(definition);
  const state = metricState(source);
  const value = source.value;
  const safeValue = typeof value === "number" && !Number.isFinite(value) ? null : value;
  return {
    id: definition.presentationId,
    sourceMetricId: source.id,
    domain: definition.domain,
    label: source.label,
    value: clone(safeValue) as AnalyticsPresentationMetricValue,
    unit: source.unit,
    state,
    confidence: source.confidence,
    completeness: clone(source.confidenceDetails.evidence),
    reasonCodes: reasonCodes(source),
    sourceIds: sorted(source.source.entryIds),
    sourceCount: source.source.includedRecordCount,
    exclusionCount: source.source.excludedRecordCount,
    exclusionCodes: sorted(
      source.source.exclusions.filter((item) => item.count > 0).map((item) => item.code),
    ),
    stale: state === "stale",
    unsupported: state === "unsupported",
    algorithmVersion: `${source.source.calculationId}@${source.source.calculationVersion}`,
  };
}

function combinedState(states: readonly AnalyticsPresentationState[]): AnalyticsPresentationState {
  if (!states.length) return "unavailable";
  return FITCORE_PRESENTATION_STATE_PRECEDENCE.find((state) => states.includes(state)) ?? "ready";
}

function surfaceReasonCodes(metrics: readonly AnalyticsPresentationMetric[]): string[] {
  const codes = metrics.flatMap((metric) => metric.reasonCodes);
  if (!metrics.some((metric) => metric.state === "ready"))
    codes.push("surface_has_no_ready_metrics");
  if (metrics.some((metric) => metric.state === "partial" || metric.state === "needs_more_data"))
    codes.push("surface_has_partial_metrics");
  if (metrics.some((metric) => metric.state === "stale"))
    codes.push("surface_contains_stale_metrics");
  if (metrics.some((metric) => metric.state === "unsupported"))
    codes.push("surface_contains_unsupported_metrics");
  return sorted(codes);
}

function validateCatalog(catalog: readonly AnalyticsPresentationMetricDefinition[]): void {
  const ids = new Set<string>();
  for (const entry of catalog) {
    if (ids.has(entry.presentationId)) throw new Error(`catalog_collision:${entry.presentationId}`);
    ids.add(entry.presentationId);
  }
}

function domainSummary(
  analytics: FitCoreAnalyticsResult,
  domain: AnalyticsPresentationDomain,
  metrics: readonly AnalyticsPresentationMetric[],
): AnalyticsPresentationDomainSummary {
  const availability = analytics.availability.domains.find((item) => item.domain === domain)!;
  const confidence = analytics.confidence.domains.find((item) => item.domain === domain)!;
  const completeness = analytics.completeness.domains.find((item) => item.domain === domain)!;
  return {
    domain,
    state: combinedState(metrics.map((metric) => metric.state)),
    availability: availability.status,
    confidence: confidence.confidence,
    completeness: clone(completeness),
    readyMetricCount: metrics.filter((metric) => metric.state === "ready").length,
    partialMetricCount: metrics.filter((metric) => metric.state === "partial").length,
    needsMoreDataMetricCount: metrics.filter((metric) => metric.state === "needs_more_data").length,
    unavailableMetricCount: metrics.filter((metric) => metric.state === "unavailable").length,
    unsupportedMetricCount: metrics.filter((metric) => metric.state === "unsupported").length,
    staleMetricCount: metrics.filter((metric) => metric.state === "stale").length,
    sourceCount: metrics.reduce((sum, metric) => sum + metric.sourceCount, 0),
    exclusionCount: metrics.reduce((sum, metric) => sum + metric.exclusionCount, 0),
    reasonCodes: sorted(metrics.flatMap((metric) => metric.reasonCodes)),
  };
}

export function buildFitCoreAnalyticsPresentation(
  analytics: FitCoreAnalyticsResult,
  options: Pick<FitCoreAnalyticsPresentationOptions, "catalog"> = {},
): FitCoreAnalyticsPresentationResult {
  const catalog = options.catalog ?? FITCORE_ANALYTICS_PRESENTATION_CATALOG;
  validateCatalog(catalog);
  const metricOrder = catalog.map((entry) => entry.presentationId);
  const metrics = Object.fromEntries(
    catalog.map((entry) => [
      entry.presentationId,
      presentationMetric(entry, selectMetric(analytics, entry.sourceKey)),
    ]),
  );
  const surfaces = Object.fromEntries(
    FITCORE_ANALYTICS_PRESENTATION_SURFACES.map((id) => {
      const entries = catalog.filter((entry) => entry.allowedSurfaces.includes(id));
      const selected = entries.map((entry) => metrics[entry.presentationId]);
      const headlineMetricIds = entries
        .filter((entry) => entry.preferredRole === "headline")
        .map((entry) => entry.presentationId);
      const supportingMetricIds = entries
        .filter((entry) => entry.preferredRole !== "headline")
        .map((entry) => entry.presentationId);
      const section: AnalyticsPresentationSection = {
        id: `${id}.analytics`,
        domain: id.startsWith("training")
          ? "training"
          : id.startsWith("nutrition")
            ? "nutrition"
            : id.startsWith("recovery")
              ? "recovery"
              : "aggregate",
        state: combinedState(selected.map((metric) => metric.state)),
        headlineMetricIds,
        supportingMetricIds,
        reasonCodes: surfaceReasonCodes(selected),
      };
      return [
        id,
        {
          id,
          state: section.state,
          sections: [section],
          metricIds: entries.map((entry) => entry.presentationId),
          reasonCodes: section.reasonCodes,
          sourceCount: selected.reduce((sum, metric) => sum + metric.sourceCount, 0),
          exclusionCount: selected.reduce((sum, metric) => sum + metric.exclusionCount, 0),
        } satisfies AnalyticsPresentationSurfaceResult,
      ];
    }),
  ) as Record<AnalyticsPresentationSurface, AnalyticsPresentationSurfaceResult>;
  const domainNames: AnalyticsPresentationDomain[] = ["training", "nutrition", "recovery", "goals"];
  const domains = Object.fromEntries(
    domainNames.map((domain) => [
      domain,
      domainSummary(
        analytics,
        domain,
        catalog
          .filter((entry) => entry.domain === domain)
          .map((entry) => metrics[entry.presentationId]),
      ),
    ]),
  ) as Record<AnalyticsPresentationDomain, AnalyticsPresentationDomainSummary>;
  const aggregateReasons = analytics.reasons.map((reason) => ({
    code: reason.code,
    domains: [...reason.domains],
  }));
  return clone({
    presentationVersion: FITCORE_ANALYTICS_PRESENTATION_VERSION,
    analyticsSchemaVersion: analytics.schemaVersion,
    generatedAt: analytics.generatedAt,
    range: analytics.range,
    catalog: catalog.map((entry) => ({ ...entry, allowedSurfaces: [...entry.allowedSurfaces] })),
    metrics,
    metricOrder,
    surfaces,
    surfaceOrder: [...FITCORE_ANALYTICS_PRESENTATION_SURFACES],
    domains,
    aggregate: {
      state: combinedState(domainNames.map((domain) => domains[domain].state)),
      usableDomainCount: analytics.completeness.usableDomainCount,
      partialDomainCount: analytics.completeness.partialDomainCount,
      unavailableDomainCount: analytics.completeness.unavailableDomainCount,
      minimumConfidence: analytics.confidence.level,
      sufficientMultiDomainEvidence: analytics.confidence.sufficientMultiDomainEvidence,
      reasonCodes: sorted(analytics.reasons.map((reason) => reason.code)),
      sourceCount: analytics.sources.includedRecordCount,
      exclusionCount: analytics.exclusions.excludedRecordCount,
      staleDomainCount: analytics.completeness.domains.filter((domain) => domain.hasStaleData)
        .length,
      unsupportedDomainCount: analytics.completeness.domains.filter(
        (domain) => domain.hasUnsupportedFields,
      ).length,
    },
    reasons: aggregateReasons,
  });
}

export function getFitCoreAnalyticsPresentation(
  state: AppState,
  options: FitCoreAnalyticsPresentationOptions = {},
): FitCoreAnalyticsPresentationResult {
  const { catalog, ...analyticsOptions } = options;
  return buildFitCoreAnalyticsPresentation(getFitCoreAnalytics(state, analyticsOptions), {
    catalog,
  });
}
