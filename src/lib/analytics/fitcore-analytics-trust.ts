import type {
  AnalyticsConfidence,
  AnalyticsMetric,
  AnalyticsMetricSource,
  AnalyticsStatus,
} from "./domain-metrics";
import type { MetricProvenance } from "./data-provenance";
import type { FitCoreAnalyticsBaseResult } from "./fitcore-analytics";
import type {
  FitCoreCorrelationResult,
  FitCoreInsightReadinessResult,
} from "./fitcore-insight-readiness";
import {
  METRIC_DEPENDENCY_GRAPH,
  getMetricDependencyTopologicalOrder,
  validateMetricDependencyGraph,
  type MetricDependencyNode,
} from "./metric-dependency-graph";
import { evaluateMetricFreshness, type MetricFreshnessInput } from "./metric-freshness";
import { evaluateMetricQuality, type MetricQualityInput } from "./metric-quality";
import {
  FITCORE_METRIC_TRUST_POLICY_VERSION,
  evaluateMetricTrust,
  type MetricTrustAssessment,
  type MetricTrustLevel,
} from "./metric-trust";

export interface FitCoreAnalyticsTrustInput extends FitCoreAnalyticsBaseResult {
  correlations: FitCoreCorrelationResult[];
  insightReadiness: FitCoreInsightReadinessResult;
}

export interface FitCoreAnalyticsTrustOptions {
  provenanceByNodeId?: Readonly<Record<string, MetricProvenance>>;
  defaultProvenance?: MetricProvenance | null;
  graph?: readonly MetricDependencyNode[];
}

export interface FitCoreAnalyticsTrustSummary {
  totalNodeCount: number;
  assessedNodeCount: number;
  unresolvedNodeCount: number;
  unavailableNodeCount: number;
  lowTrustNodeCount: number;
  mediumTrustNodeCount: number;
  highTrustNodeCount: number;
  freshNodeCount: number;
  agingNodeCount: number;
  staleNodeCount: number;
  unknownFreshnessNodeCount: number;
  overallLevel: MetricTrustLevel;
  overallScore: number | null;
  limitingNodeIds: string[];
}

export interface FitCoreAnalyticsTrustReport {
  policyVersion: typeof FITCORE_METRIC_TRUST_POLICY_VERSION;
  evaluatedAt: string;
  graphValid: boolean;
  nodes: MetricTrustAssessment[];
  summary: FitCoreAnalyticsTrustSummary;
}

interface RuntimeEvidence {
  status: AnalyticsStatus;
  hasValue: boolean;
  confidence: {
    level: AnalyticsConfidence;
    score: number | null;
    reasons?: AnalyticsMetric<unknown>["confidenceDetails"]["reasons"];
    evidence?: AnalyticsMetric<unknown>["confidenceDetails"]["evidence"] | null;
  };
  quality: MetricQualityInput;
  freshness: Omit<MetricFreshnessInput, "now" | "dependencyFreshness">;
}

function confidenceScore(level: AnalyticsConfidence): number {
  return { none: 0, low: 30, medium: 65, high: 90 }[level];
}

function reasonsContain(metric: AnalyticsMetric<unknown>, fragment: string): boolean {
  return metric.reasons.some((reason) => reason.code === fragment);
}

function metricEvidence(metric: AnalyticsMetric<unknown>): RuntimeEvidence {
  const evidence = metric.confidenceDetails.evidence;
  return {
    status: metric.status,
    hasValue: metric.value !== null,
    confidence: {
      level: metric.confidence,
      score: metric.confidenceDetails.score,
      reasons: metric.confidenceDetails.reasons,
      evidence,
    },
    quality: {
      status: metric.status,
      hasValue: metric.value !== null,
      validRecordCount: evidence.validRecordCount,
      minimumSampleSize: evidence.minimumSampleSize,
      includedRecordCount: metric.source.includedRecordCount,
      excludedRecordCount: evidence.excludedRecordCount,
      coverageDayCount: evidence.coverageDayCount,
      expectedDayCount: evidence.expectedDayCount,
      missingDataRatio: evidence.missingDataRatio,
      partialPeriod: evidence.partialPeriod,
      comparisonPeriodValid: evidence.comparisonPeriodValid,
      targetRequired: metric.source.targetRequired,
      targetValid: evidence.targetValid,
      unsupported: metric.reasons.some((reason) => reason.code.startsWith("unsupported_")),
      invalid: reasonsContain(metric, "invalid_value"),
      metricKind: metric.kind,
      trendQuality: metric.trendQuality,
    },
    freshness: {
      collection: metric.source.collection,
      lastLoggedAt: metric.source.lastLoggedAt,
      latestIncludedAt: metric.source.latestIncludedAt,
      staleReasonCodes: metric.reasons.map((reason) => reason.code),
    },
  };
}

function sourceEvidence(
  status: AnalyticsStatus,
  source: AnalyticsMetricSource,
  confidence: AnalyticsConfidence,
): RuntimeEvidence {
  const hasValue = source.includedRecordCount > 0;
  return {
    status,
    hasValue,
    confidence: { level: confidence, score: confidenceScore(confidence) },
    quality: {
      status,
      hasValue,
      validRecordCount: source.includedRecordCount,
      minimumSampleSize: 1,
      includedRecordCount: source.includedRecordCount,
      excludedRecordCount: source.excludedRecordCount,
      coverageDayCount: source.coverageDayCount,
      expectedDayCount: source.expectedDayCount,
      targetRequired: source.targetRequired,
      targetValid: source.targetAvailable,
      invalid: source.exclusions.some((item) => item.code === "invalid_value" && item.count > 0),
    },
    freshness: {
      collection: source.collection,
      lastLoggedAt: source.lastLoggedAt,
      latestIncludedAt: source.latestIncludedAt,
      staleReasonCodes: [],
    },
  };
}

function explicitEvidence(analytics: FitCoreAnalyticsTrustInput): Map<string, RuntimeEvidence> {
  const result = new Map<string, RuntimeEvidence>();
  const addMetric = (metric: AnalyticsMetric<unknown>): void => {
    result.set(metric.id, metricEvidence(metric));
  };
  const nutrition = analytics.domains.nutrition;
  [
    nutrition.mealCounts.today,
    nutrition.mealCounts.rangeTotal,
    nutrition.mealCounts.distinctLoggedDays,
    nutrition.mealCounts.mealsPerLoggedDay,
    nutrition.mealCounts.mealsPerRequestedDay,
    nutrition.consistency.calories,
    nutrition.consistency.protein,
    nutrition.consistency.carbs,
    nutrition.consistency.fat,
    nutrition.proteinPerBodyweight.metric,
  ].forEach(addMetric);
  const recovery = analytics.domains.recovery;
  [
    recovery.trends.soreness,
    recovery.trends.energy,
    recovery.trends.motivation,
    recovery.trends.stress,
    recovery.trends.readiness,
    recovery.warningConditions.highSoreness.count,
    recovery.warningConditions.highSoreness.daysSinceLatest,
    recovery.warningConditions.lowReadiness.count,
    recovery.warningConditions.lowReadiness.daysSinceLatest,
    recovery.consistency,
    recovery.signals.painFlagCount,
    recovery.signals.sorenessFlagCount,
    recovery.signals.fatigueFlagCount,
  ].forEach(addMetric);

  const confidenceByDomain = new Map(
    analytics.confidence.domains.map((item) => [item.domain, item.confidence]),
  );
  const sources = {
    training: sourceEvidence(
      analytics.domains.training.availability.status,
      analytics.domains.training.sourceMetadata,
      confidenceByDomain.get("training") ?? "none",
    ),
    nutrition: sourceEvidence(
      analytics.domains.nutrition.availability.status,
      analytics.domains.nutrition.sourceMetadata,
      confidenceByDomain.get("nutrition") ?? "none",
    ),
    recovery: sourceEvidence(
      analytics.domains.recovery.availability.status,
      analytics.domains.recovery.sourceMetadata,
      confidenceByDomain.get("recovery") ?? "none",
    ),
    goals: sourceEvidence(
      analytics.domains.goals.availability.status,
      analytics.domains.goals.sourceMetadata,
      confidenceByDomain.get("goals") ?? "none",
    ),
  };
  result.set("training.detail.source", sources.training);
  result.set("nutrition.detail.source", sources.nutrition);
  result.set("recovery.detail.source", sources.recovery);
  result.set("progress.goals.detail.source", sources.goals);
  result.set("source.state.workouts", sources.training);
  result.set("source.state.mealEntries", sources.nutrition);
  result.set("source.state.recoveryCheckIns", sources.recovery);
  result.set("source.state.goals", sources.goals);

  for (const correlation of analytics.correlations) {
    const status: AnalyticsStatus =
      correlation.status === "ready"
        ? "ready"
        : correlation.status === "needs_more_data"
          ? "needs_more_data"
          : "unavailable";
    const level: AnalyticsConfidence =
      correlation.status === "ready"
        ? "medium"
        : correlation.status === "needs_more_data"
          ? "low"
          : "none";
    result.set(correlation.id, {
      status,
      hasValue: correlation.coefficient !== null,
      confidence: { level, score: confidenceScore(level) },
      quality: {
        status,
        hasValue: correlation.coefficient !== null,
        validRecordCount: correlation.sampleSize,
        minimumSampleSize: correlation.minimumSampleSize,
        includedRecordCount: correlation.sampleSize,
        metricKind: "comparison",
        comparisonPeriodValid: correlation.status === "ready",
      },
      freshness: { collection: "derived_metrics", staleReasonCodes: [] },
    });
  }
  for (const insight of analytics.insightReadiness.items) {
    const status: AnalyticsStatus =
      insight.status === "ready"
        ? "ready"
        : insight.status === "needs_more_data"
          ? "needs_more_data"
          : "unavailable";
    result.set(insight.id, {
      status,
      hasValue: insight.status === "ready",
      confidence: { level: insight.confidence, score: confidenceScore(insight.confidence) },
      quality: {
        status,
        hasValue: insight.status === "ready",
        validRecordCount: insight.source.sampleSize,
        minimumSampleSize: Math.max(1, insight.source.requiredMinimumSampleSize),
        includedRecordCount: insight.source.sampleSize,
      },
      freshness: {
        collection: "derived_metrics",
        lastLoggedAt: insight.source.lastRelevantLoggedAt,
        staleReasonCodes: [],
      },
    });
  }
  return result;
}

function syntheticEvidence(
  node: MetricDependencyNode,
  dependencies: readonly MetricTrustAssessment[],
  aggregateConfidence: AnalyticsConfidence,
): RuntimeEvidence | null {
  const assessable = dependencies.filter((item) => item.status === "assessed");
  if (assessable.length === 0) return null;
  const level = node.category === "aggregate" ? aggregateConfidence : "high";
  return {
    status: "ready",
    hasValue: true,
    confidence: { level, score: confidenceScore(level) },
    quality: {
      status: "ready",
      hasValue: true,
      validRecordCount: assessable.length,
      minimumSampleSize: 1,
      includedRecordCount: assessable.length,
    },
    freshness: { collection: "derived_metrics", staleReasonCodes: [] },
  };
}

function unavailableAssessment(id: string, now: number): MetricTrustAssessment {
  return evaluateMetricTrust({
    metricId: id,
    metricStatus: "unavailable",
    hasValue: false,
    confidence: { level: "none", score: null },
    quality: evaluateMetricQuality({ status: "unavailable", hasValue: false }),
    freshness: evaluateMetricFreshness({ collection: "unknown", now }),
    provenance: null,
    unresolved: true,
  });
}

function trustLevel(score: number | null): MetricTrustLevel {
  if (score === null) return "unavailable";
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function buildFitCoreAnalyticsTrust(
  analytics: FitCoreAnalyticsTrustInput,
  evaluatedAt: number,
  options: FitCoreAnalyticsTrustOptions = {},
): FitCoreAnalyticsTrustReport {
  const graph = options.graph ?? METRIC_DEPENDENCY_GRAPH;
  const validation = validateMetricDependencyGraph(graph);
  const runtime = explicitEvidence(analytics);
  const graphById = new Map(graph.map((node) => [node.id, node]));
  const results = new Map<string, MetricTrustAssessment>();
  const order = getMetricDependencyTopologicalOrder(graph);
  for (const id of order) {
    const node = graphById.get(id);
    if (!node) continue;
    const dependencies = node.dependencies
      .map((dependencyId) => results.get(dependencyId))
      .filter((item): item is MetricTrustAssessment => item !== undefined);
    const evidence =
      runtime.get(id) ?? syntheticEvidence(node, dependencies, analytics.confidence.level);
    if (!evidence) {
      results.set(id, unavailableAssessment(id, evaluatedAt));
      continue;
    }
    const freshness = evaluateMetricFreshness({
      ...evidence.freshness,
      now: evaluatedAt,
      dependencyFreshness: dependencies.map((item) => item.freshness),
    });
    const provenance =
      options.provenanceByNodeId?.[id] ?? options.defaultProvenance ?? analytics.provenance;
    results.set(
      id,
      evaluateMetricTrust({
        metricId: id,
        metricStatus: evidence.status,
        hasValue: evidence.hasValue,
        confidence: evidence.confidence,
        quality: evaluateMetricQuality(evidence.quality),
        freshness,
        provenance,
        dependencies: node.dependencies.map((dependencyId) => {
          const dependency = results.get(dependencyId);
          return {
            id: dependencyId,
            status: dependency?.status ?? "unresolved",
            score: dependency?.score ?? null,
          };
        }),
      }),
    );
  }
  const nodes = graph.map(
    (node) => results.get(node.id) ?? unavailableAssessment(node.id, evaluatedAt),
  );
  const overallCandidates = graph
    .filter((node) => node.category !== "source" && node.category !== "detail")
    .map((node) => results.get(node.id))
    .filter(
      (item): item is MetricTrustAssessment => item?.status === "assessed" && item.score !== null,
    );
  const overallScore = overallCandidates.length
    ? Math.min(...overallCandidates.map((item) => item.score as number))
    : null;
  const limitingNodeIds =
    overallScore === null
      ? []
      : overallCandidates
          .filter((item) => item.score === overallScore)
          .map((item) => item.metricId)
          .sort();
  return {
    policyVersion: FITCORE_METRIC_TRUST_POLICY_VERSION,
    evaluatedAt: new Date(evaluatedAt).toISOString(),
    graphValid: validation.valid,
    nodes,
    summary: {
      totalNodeCount: nodes.length,
      assessedNodeCount: nodes.filter((item) => item.status === "assessed").length,
      unresolvedNodeCount: nodes.filter((item) => item.status === "unresolved").length,
      unavailableNodeCount: nodes.filter((item) => item.status === "unavailable").length,
      lowTrustNodeCount: nodes.filter((item) => item.level === "low").length,
      mediumTrustNodeCount: nodes.filter((item) => item.level === "medium").length,
      highTrustNodeCount: nodes.filter((item) => item.level === "high").length,
      freshNodeCount: nodes.filter((item) => item.freshness.state === "fresh").length,
      agingNodeCount: nodes.filter((item) => item.freshness.state === "aging").length,
      staleNodeCount: nodes.filter((item) => item.freshness.state === "stale").length,
      unknownFreshnessNodeCount: nodes.filter((item) => item.freshness.state === "unknown").length,
      overallLevel: trustLevel(overallScore),
      overallScore,
      limitingNodeIds,
    },
  };
}
